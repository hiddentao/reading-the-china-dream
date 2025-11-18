import * as cheerio from 'cheerio';
import { NodeHtmlMarkdown } from 'node-html-markdown';
import slugify from 'slugify';
import { existsSync } from 'fs';
import { writeFile } from 'fs/promises';
import path from 'path';
import { parse, format, isValid } from 'date-fns';

const BASE_URL = 'https://www.readingthechinadream.com';
const DELAY_MS = 1500;
const USER_AGENT = 'Mozilla/5.0 (compatible; BunScraper/1.0)';

const args = process.argv.slice(2);
const FORCE_REFETCH = args.includes('--force') || args.includes('-f');
const RETRY_FAILED = args.includes('--retry-failed') || args.includes('-rf');

interface PageMetadata {
  title: string;
  date: string;
  sourceUrl: string;
  categories: string[];
  author: string;
  excerpt: string;
}

interface NavigationLink {
  title: string;
  url: string;
  children?: NavigationLink[];
}

interface ScrapedPage {
  metadata: PageMetadata;
  content: string;
  isBlogPost: boolean;
}

const FAILED_FETCHES_LOG = 'data/failed-fetches.log';

async function loadFailedFetches(): Promise<string[]> {
  try {
    if (!existsSync(FAILED_FETCHES_LOG)) {
      return [];
    }
    const content = await Bun.file(FAILED_FETCHES_LOG).text();
    return content.split('\n').filter(line => line.trim().length > 0);
  } catch (error) {
    console.warn('Failed to load failed fetches log:', error);
    return [];
  }
}

async function saveFailedFetches(urls: string[]): Promise<void> {
  if (urls.length === 0) {
    return;
  }
  await writeFile(FAILED_FETCHES_LOG, urls.join('\n'), 'utf-8');
  console.log(`\n📝 Saved ${urls.length} failed fetches to ${FAILED_FETCHES_LOG}`);
}

async function deleteFailedFetchesLog(): Promise<void> {
  try {
    if (existsSync(FAILED_FETCHES_LOG)) {
      await Bun.file(FAILED_FETCHES_LOG).delete();
      console.log(`\n✓ Deleted ${FAILED_FETCHES_LOG} (no failures)`);
    }
  } catch (error) {
    console.warn('Failed to delete failed fetches log:', error);
  }
}

async function fetchHTML(url: string, retryCount = 0): Promise<string | null> {
  console.log(`Fetching: ${url}${retryCount > 0 ? ' (retry)' : ''}`);

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT }
    });

    if (response.status === 404) {
      console.log(`  ⚠️  404 Not Found: ${url}`);
      return null;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${url}`);
    }

    return await response.text();
  } catch (error) {
    // Retry once after 10 seconds if first attempt fails
    if (retryCount === 0) {
      console.log(`  ⚠️  Fetch failed, retrying in 10 seconds...`);
      await delay(10000);
      return fetchHTML(url, 1);
    }

    // If retry also failed, throw error to be caught by caller
    throw error;
  }
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isBlogPostURL(url: string): boolean {
  const normalizedUrl = normalizeUrl(url);
  const isHomepage = normalizedUrl === BASE_URL || normalizedUrl === `${BASE_URL}/`;

  if (isHomepage) {
    return false;
  }

  return url.includes('/blog/') && !url.includes('/blog/archives/') && !url.includes('/blog/previous/');
}

function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url, BASE_URL);

    // Only process readingthechinadream.com URLs
    if (!urlObj.hostname.includes('readingthechinadream.com')) {
      return url;
    }

    // Get pathname without query params or anchors
    let path = urlObj.pathname;

    // Remove .html extension
    path = path.replace(/\.html$/, '');

    // Add trailing slash if path exists and doesn't already end with one
    if (path && path !== '/' && !path.endsWith('/')) {
      path += '/';
    }

    // Return normalized URL with domain
    return `${BASE_URL}${path}`;
  } catch (error) {
    console.warn(`Failed to normalize URL: ${url}`);
    return url;
  }
}

function shouldExcludeUrl(url: string): boolean {
  const normalizedUrl = normalizeUrl(url);
  const isHomepage = normalizedUrl === BASE_URL || normalizedUrl === `${BASE_URL}/`;

  if (isHomepage) {
    return true;
  }

  const excludePatterns = [
    '/blog/archives/',
    '/blog/previous/',
    '/blog/tags/',
    '/blog/tag/',
    '/blog/category/',
    '/all-categories',
    '/blog/all-categories',
    '/search',
    '/rss.xml',
    '/feed',
    '/atom.xml'
  ];

  if (excludePatterns.some(pattern => url.includes(pattern))) {
    return true;
  }

  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
      return true;
    }
  } catch {
    // Invalid URL, let other logic handle it
  }

  return false;
}

function detectBlogPost(html: string): boolean {
  const $ = cheerio.load(html);

  // Check for blog-specific elements
  const hasBlogDate = $('.blog-date').length > 0;
  const hasBlogAuthor = $('.blog-author').length > 0;
  const hasBlogCategory = $('.blog-category').length > 0;
  const hasBlogContent = $('#wsite-content .blog-post').length > 0 ||
                         $('#wsite-content .blog-body').length > 0;

  // A page is a blog post if it has at least 2 of these characteristics
  const blogCharacteristics = [hasBlogDate, hasBlogAuthor, hasBlogCategory, hasBlogContent].filter(Boolean).length;

  return blogCharacteristics >= 2;
}

function extractInternalLinks(html: string): string[] {
  const $ = cheerio.load(html);
  const links = new Set<string>();

  $('a[href]').each((_, elem) => {
    const href = $(elem).attr('href');
    if (!href) return;

    try {
      const absoluteUrl = href.startsWith('http')
        ? href
        : href.startsWith('//')
        ? `https:${href}`
        : `${BASE_URL}${href.startsWith('/') ? href : '/' + href}`;

      // Only process internal links
      if (!absoluteUrl.includes('readingthechinadream.com')) {
        return;
      }

      // Skip excluded patterns
      if (shouldExcludeUrl(absoluteUrl)) {
        return;
      }

      // Normalize and add
      const normalized = normalizeUrl(absoluteUrl);
      links.add(normalized);
    } catch (error) {
      // Skip malformed URLs
    }
  });

  return Array.from(links);
}

async function discoverNavigation(): Promise<NavigationLink[]> {
  console.log('\n=== Phase 1: Discovering Navigation ===\n');

  const html = await fetchHTML(BASE_URL);
  if (!html) {
    throw new Error('Failed to fetch homepage');
  }
  const $ = cheerio.load(html);

  const navigation: NavigationLink[] = [];

  $('.wsite-menu-default > .wsite-menu-item-wrap').each((_, elem) => {
    const $item = $(elem);
    const $link = $item.find('> a.wsite-menu-item');

    const title = $link.text().trim();
    const href = $link.attr('href') || '';
    const url = href.startsWith('http') ? href : `${BASE_URL}${href}`;

    const navItem: NavigationLink = { title, url };

    const children: NavigationLink[] = [];
    $item.find('.wsite-menu-wrap .wsite-menu-subitem-wrap').each((_, subElem) => {
      const $subItem = $(subElem);
      const $subLink = $subItem.find('a.wsite-menu-subitem');
      const subTitle = $subLink.find('.wsite-menu-title').text().trim();
      const subHref = $subLink.attr('href') || '';
      const subUrl = subHref.startsWith('http') ? subHref : `${BASE_URL}${subHref}`;

      if (subTitle && subUrl) {
        children.push({ title: subTitle, url: subUrl });
      }
    });

    if (children.length > 0) {
      navItem.children = children;
    }

    navigation.push(navItem);
  });

  console.log(`Found ${navigation.length} main navigation items`);

  return navigation;
}

async function scrapePage(url: string): Promise<{ page: ScrapedPage | null, links: string[] }> {
  const html = await fetchHTML(url);
  if (!html) {
    return { page: null, links: [] };
  }

  // Extract internal links from the entire HTML before processing
  const discoveredLinks = extractInternalLinks(html);

  const $ = cheerio.load(html);

  let title = $('h2.wsite-content-title a').first().text().trim() ||
              $('title').text().trim() ||
              'Untitled';

  // Remove site name suffix from title
  title = title.replace(/\s*[-|]\s*reading the china dream\s*$/i, '').trim();

  // Parse date from D/M/YYYY format (handles 1-2 digit days and months) to ISO YYYY-MM-DD
  const dateText = $('.blog-date').first().text().trim();
  let date: string;
  if (dateText) {
    try {
      const parsedDate = parse(dateText, 'd/M/yyyy', new Date());
      if (isValid(parsedDate)) {
        date = format(parsedDate, 'yyyy-MM-dd');
      } else {
        date = format(new Date(), 'yyyy-MM-dd');
      }
    } catch {
      date = format(new Date(), 'yyyy-MM-dd');
    }
  } else {
    date = format(new Date(), 'yyyy-MM-dd');
  }

  const author = $('.blog-author').first().text().trim();

  const categories: string[] = [];
  $('.blog-category a').each((_, elem) => {
    const category = $(elem).text().trim();
    if (category) categories.push(category);
  });

  const $content = $('#wsite-content').clone();
  $content.find('.blog-sidebar').remove();
  $content.find('.wsite-menu').remove();
  $content.find('script').remove();
  $content.find('style').remove();
  $content.find('nav').remove();
  $content.find('.blog-header').remove();
  $content.find('.blog-comments-bottom').remove();
  $content.find('h2.wsite-content-title').remove();
  $content.find('a[href*="twitter.com/share"]').remove();
  $content.find('a[href*="twitter.com/intent/tweet"]').remove();
  $content.find('a[href*="x.com/intent/tweet"]').remove();
  $content.find('a[href*="x.com/share"]').remove();
  $content.find('.wcustomhtml').remove();
  $content.find('.blog-notice-comments-closed').remove();

  const contentHTML = $content.html() || '';

  const nhm = new NodeHtmlMarkdown({
    maxConsecutiveNewlines: 2,
    useInlineLinks: true
  });
  let markdownContent = nhm.translate(contentHTML);

  markdownContent = markdownContent.replace(/Comments are closed\.\s*$/, '');

  const excerpt = markdownContent
    .replace(/[#*\[\]]/g, '')
    .trim()
    .substring(0, 150)
    .trim() + '...';

  // Detect if this is a blog post based on URL or content
  const normalizedPageUrl = normalizeUrl(url);
  const isHomepage = normalizedPageUrl === BASE_URL || normalizedPageUrl === `${BASE_URL}/`;

  const isBlogPostByURL = isBlogPostURL(url);
  const isBlogPostByContent = detectBlogPost(html);
  const isBlogPost = !isHomepage && (isBlogPostByURL || isBlogPostByContent);

  // Normalize blog post URL if detected by content but URL doesn't have /blog/
  let normalizedSourceUrl = url;
  if (isBlogPostByContent && !isBlogPostByURL) {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);

    // Add /blog/ prefix if not present
    if (pathParts.length > 0 && pathParts[0] && !pathParts[0].startsWith('blog')) {
      normalizedSourceUrl = `${BASE_URL}/blog/${pathParts.join('/')}`;
      console.log(`  📝 Detected blog post without /blog/ prefix, normalized: ${url} → ${normalizedSourceUrl}`);
    }
  }

  const metadata: PageMetadata = {
    title,
    date,
    sourceUrl: normalizedSourceUrl,
    categories,
    author,
    excerpt
  };

  return {
    page: {
      metadata,
      content: markdownContent,
      isBlogPost
    },
    links: discoveredLinks
  };
}

async function downloadImage(imageUrl: string, outputDir: string): Promise<string> {
  const url = imageUrl.startsWith('http') ? imageUrl : `${BASE_URL}${imageUrl}`;
  const filename = path.basename(new URL(url).pathname);
  const filepath = path.join(outputDir, filename);

  if (existsSync(filepath)) {
    return filename;
  }

  try {
    const response = await fetch(url);
    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      await writeFile(filepath, Buffer.from(arrayBuffer));
      console.log(`  Downloaded image: ${filename}`);
      return filename;
    }
  } catch (error) {
    console.warn(`  Failed to download image: ${url}`);
  }

  return imageUrl;
}

async function processImages(markdown: string): Promise<string> {
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const images = [...markdown.matchAll(imageRegex)];

  let processedMarkdown = markdown;

  for (const match of images) {
    const [fullMatch, alt, imageUrl] = match;
    if (!imageUrl) continue;
    const localFilename = await downloadImage(imageUrl, 'data/images');
    const newImageRef = `![${alt}](/images/${localFilename})`;
    processedMarkdown = processedMarkdown.replace(fullMatch, newImageRef);
  }

  return processedMarkdown;
}

async function convertLinksToRelative(markdown: string): Promise<string> {
  const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;

  return markdown.replace(linkRegex, (match, text, url) => {
    // Skip external links (not readingthechinadream.com)
    if (url.startsWith('http') && !url.includes('readingthechinadream.com')) {
      return match;
    }

    // Strip domain if present (handles absolute readingthechinadream.com URLs)
    let relativeUrl = url
      .replace(/https?:\/\/(www\.)?readingthechinadream\.com/, '')
      .replace(/^\/\/www\.readingthechinadream\.com/, '');

    // Parse URL into path, query string, and anchor
    const urlMatch = relativeUrl.match(/^([^?#]*)(\?[^#]*)?(#.*)?$/);
    if (!urlMatch) return match;

    const [, path, query = '', anchor = ''] = urlMatch;

    // Remove .html extension from path
    let cleanPath = path.replace(/\.html$/, '');

    // Add trailing slash if path exists and doesn't already end with one
    if (cleanPath && !cleanPath.endsWith('/')) {
      cleanPath += '/';
    }

    // Reconstruct URL with cleaned path, preserving query and anchor
    const newUrl = (cleanPath || '/') + query + anchor;
    return `[${text}](${newUrl})`;
  });
}

function generateFrontmatter(metadata: PageMetadata): string {
  const lines = [
    '---',
    `title: "${metadata.title.replace(/"/g, '\\"')}"`,
    `date: "${metadata.date}"`,
    `sourceUrl: "${metadata.sourceUrl}"`,
  ];

  if (metadata.categories.length > 0) {
    lines.push(`categories: [${metadata.categories.map(c => `"${c}"`).join(', ')}]`);
  }

  if (metadata.author) {
    lines.push(`author: "${metadata.author}"`);
  }

  lines.push('---\n');

  return lines.join('\n');
}

async function savePage(page: ScrapedPage, forceRefetch: boolean = false): Promise<boolean> {
  const urlPath = new URL(page.metadata.sourceUrl).pathname;
  const slug = (urlPath.split('/').filter(Boolean).pop() || slugify(page.metadata.title, { lower: true, strict: true })).replace(/\.html$/, '');
  const outputDir = page.isBlogPost ? 'data/blog' : 'data/pages';
  const filepath = path.join(outputDir, `${slug}.md`);

  if (existsSync(filepath) && !forceRefetch) {
    console.log(`  Skipping (exists): ${slug}.md`);
    return false;
  }

  const content = await processImages(page.content);
  const relativeContent = await convertLinksToRelative(content);
  const frontmatter = generateFrontmatter(page.metadata);
  const fullContent = frontmatter + '\n' + relativeContent;

  await writeFile(filepath, fullContent, 'utf-8');
  console.log(`  Saved: ${filepath}`);
  return true;
}

async function discoverBlogPosts(): Promise<string[]> {
  console.log('\n=== Phase 2: Discovering Blog Posts ===\n');

  const blogUrls: string[] = [];
  const visitedPages = new Set<string>();
  let currentPage = `${BASE_URL}/`;
  let pageNum = 1;
  let totalFiltered = 0;

  while (currentPage && !visitedPages.has(currentPage)) {
    console.log(`Scanning blog page ${pageNum}: ${currentPage}`);
    visitedPages.add(currentPage);

    const html = await fetchHTML(currentPage);
    if (!html) {
      console.log(`  Skipping page due to fetch error`);
      break;
    }
    const $ = cheerio.load(html);

    const pageUrls: string[] = [];
    $('a.blog-title-link').each((_, elem) => {
      const href = $(elem).attr('href');
      const text = $(elem).text().trim();

      if (href && text) {
        const url = href.startsWith('http') ? href : href.startsWith('//') ? `https:${href}` : `${BASE_URL}${href}`;

        // Filter out non-blog posts (e.g., "Subscribe for fortnightly updates")
        if (text.toLowerCase().includes('subscribe')) {
          totalFiltered++;
          return;
        }

        // Validate it's a proper blog post URL
        if (isBlogPostURL(url)) {
          pageUrls.push(url);
        } else {
          totalFiltered++;
        }
      }
    });

    console.log(`  Found ${pageUrls.length} posts on this page`);
    blogUrls.push(...pageUrls);

    const nextLink = $('a.blog-link[href*="/blog/previous/"]').first().attr('href');
    if (nextLink) {
      const nextUrl = nextLink.startsWith('http') ? nextLink : `${BASE_URL}${nextLink}`;
      if (!visitedPages.has(nextUrl)) {
        currentPage = nextUrl;
        pageNum++;
        await delay(DELAY_MS);
      } else {
        console.log(`  Stopping: Already visited ${nextUrl}`);
        currentPage = '';
      }
    } else {
      currentPage = '';
    }
  }

  const uniqueBlogUrls = [...new Set(blogUrls)];
  console.log(`Found ${uniqueBlogUrls.length} unique blog posts across ${pageNum} pages`);
  if (totalFiltered > 0) {
    console.log(`Filtered out ${totalFiltered} non-blog links\n`);
  } else {
    console.log('');
  }
  return uniqueBlogUrls;
}

function collectAllURLs(navigation: NavigationLink[]): string[] {
  const urls: string[] = [];

  for (const item of navigation) {
    urls.push(item.url);
    if (item.children) {
      urls.push(...item.children.map(child => child.url));
    }
  }

  return [...new Set(urls)];
}

function removeNotFoundFromNavigation(navigation: NavigationLink[], notFoundUrls: string[]): NavigationLink[] {
  const notFoundSet = new Set(notFoundUrls);

  return navigation
    .filter(item => !notFoundSet.has(item.url))
    .map(item => {
      if (item.children) {
        const filteredChildren = item.children.filter(child => !notFoundSet.has(child.url));
        return {
          ...item,
          children: filteredChildren.length > 0 ? filteredChildren : undefined
        };
      }
      return item;
    });
}

async function main() {
  console.log('🚀 Starting scraper for readingthechinadream.com\n');

  if (FORCE_REFETCH) {
    console.log('🔄 Force mode enabled: Will re-scrape all pages\n');
  }

  if (RETRY_FAILED) {
    console.log('♻️  Retry failed mode: Processing only previously failed fetches\n');
  }

  try {
    let navigation: NavigationLink[] = [];
    let urlQueue: Set<string>;
    const processedUrls = new Set<string>();

    if (RETRY_FAILED) {
      // Load URLs from failed fetches log
      const failedUrls = await loadFailedFetches();
      if (failedUrls.length === 0) {
        console.log('No failed fetches to retry. Exiting.');
        return;
      }
      urlQueue = new Set(failedUrls.map(url => normalizeUrl(url)));
      console.log(`Loaded ${urlQueue.size} failed fetches to retry\n`);
    } else {
      // Normal discovery mode
      navigation = await discoverNavigation();

      await writeFile(
        'data/navigation.json',
        JSON.stringify(navigation, null, 2),
        'utf-8'
      );
      console.log('✅ Saved navigation.json\n');

      const blogPostUrls = await discoverBlogPosts();

      console.log('\n=== Phase 3: Scraping Pages ===\n');

      const navigationUrls = collectAllURLs(navigation);
      const footerAboutUrls = [
        `${BASE_URL}/david-ownby-tips.html`,
        `${BASE_URL}/top-15-translation.html`,
        `${BASE_URL}/personal-favorites.html`
      ];

      // Normalize all initial URLs, filter out excluded ones, and create queue
      const initialUrls = [...navigationUrls, ...blogPostUrls, ...footerAboutUrls];
      const filteredUrls = initialUrls
        .map(url => normalizeUrl(url))
        .filter(url => !shouldExcludeUrl(url));
      urlQueue = new Set(filteredUrls);

      console.log(`Found ${urlQueue.size} initial URLs to scrape (${navigationUrls.length} navigation + ${blogPostUrls.length} blog posts + ${footerAboutUrls.length} footer)\n`);
    }

    let scrapedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    let notFoundCount = 0;
    let discoveredCount = 0;
    const notFoundUrls: string[] = [];
    const failedFetches: string[] = [];

    // Queue-based processing
    while (urlQueue.size > 0) {
      const url = urlQueue.values().next().value as string;
      if (!url) continue;

      urlQueue.delete(url);

      // Skip if already processed
      if (processedUrls.has(url)) {
        continue;
      }

      processedUrls.add(url);
      const currentIndex = processedUrls.size;

      console.log(`\n[${currentIndex}/${processedUrls.size + urlQueue.size}] ${url}`);
      console.log(`  Queue: ${urlQueue.size} remaining | Processed: ${processedUrls.size}`);

      try {
        const result = await scrapePage(url);
        if (result.page === null) {
          notFoundCount++;
          notFoundUrls.push(url);
        } else {
          const saved = await savePage(result.page, FORCE_REFETCH);
          if (saved) {
            scrapedCount++;
          } else {
            skippedCount++;
          }

          // If URL was normalized (blog post detected without /blog/ prefix),
          // mark both variants as processed to prevent duplicate downloads
          const normalizedUrl = normalizeUrl(result.page.metadata.sourceUrl);
          if (normalizedUrl !== url) {
            processedUrls.add(normalizedUrl);
            urlQueue.delete(normalizedUrl);
            console.log(`  ✓ Marked both URL variants as processed: ${url} and ${normalizedUrl}`);
          }

          // Add discovered links to queue
          const newLinks = result.links.filter(link => !processedUrls.has(link) && !urlQueue.has(link));
          if (newLinks.length > 0) {
            console.log(`  Found ${newLinks.length} new links from content`);
            newLinks.forEach(link => urlQueue.add(link));
            discoveredCount += newLinks.length;
          }
        }
      } catch (error) {
        console.error(`  ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        errorCount++;
        // Track fetch errors for retry (not 404s, those are handled separately)
        if (!notFoundUrls.includes(url)) {
          failedFetches.push(url);
        }
      }

      if (urlQueue.size > 0) {
        await delay(DELAY_MS);
      }
    }

    if (notFoundUrls.length > 0) {
      console.log('\n=== Removing 404 Pages from Navigation ===');
      const cleanNavigation = removeNotFoundFromNavigation(navigation, notFoundUrls);
      await writeFile(
        'data/navigation.json',
        JSON.stringify(cleanNavigation, null, 2),
        'utf-8'
      );
      console.log(`Removed ${notFoundUrls.length} 404 pages from navigation`);
    }

    console.log('\n\n=== Summary ===');
    console.log(`✅ Scraped: ${scrapedCount}`);
    console.log(`⏭️  Skipped: ${skippedCount}`);
    console.log(`🔗 Discovered from content: ${discoveredCount}`);
    console.log(`🔍 Not Found (404): ${notFoundCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📁 Total URLs processed: ${processedUrls.size}`);

    // Manage failed fetches log file
    if (failedFetches.length > 0) {
      await saveFailedFetches(failedFetches);
      console.log(`\n⚠️  Run with --retry-failed to retry these fetches`);
    } else {
      await deleteFailedFetchesLog();
    }

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
