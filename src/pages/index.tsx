import React from 'react'
import { graphql, Link } from 'gatsby'
import type { PageProps } from 'gatsby'
import { Layout } from '../components/Layout'
import { BlogPostCard } from '../components/BlogPostCard'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import stripMarkdown from 'strip-markdown'
import remarkStringify from 'remark-stringify'
import { parseISO, compareDesc } from 'date-fns'

interface BlogPost {
  id: string
  slug: string
  title: string
  date: string
  markdown: string
  categories: string[]
}

interface IndexPageData {
  recentPosts: {
    nodes: BlogPost[]
  }
}

const IndexPage: React.FC<PageProps<IndexPageData>> = ({ data }) => {
  // Sort posts in reverse chronological order (newest first)
  const posts = [...data.recentPosts.nodes].sort((a, b) => {
    try {
      const dateA = parseISO(a.date)
      const dateB = parseISO(b.date)
      return compareDesc(dateA, dateB)
    } catch {
      return 0
    }
  })

  const generateExcerpt = (markdown: string): string => {
    const processor = unified()
      .use(remarkParse)
      .use(stripMarkdown)
      .use(remarkStringify)

    const result = processor.processSync(markdown)
    const plainText = String(result).replace(/\s+/g, ' ').trim()

    return plainText.length > 200
      ? plainText.substring(0, 200) + '...'
      : plainText
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <main className="lg:col-span-2">
            <h1 className="text-4xl font-heading font-bold text-gray-900 mb-8">
              Recent Posts
            </h1>

            {posts.map((post) => {
              const excerpt = generateExcerpt(post.markdown)

              return (
                <BlogPostCard
                  key={post.id}
                  title={post.title}
                  date={post.date}
                  slug={post.slug}
                  excerpt={excerpt}
                  categories={post.categories}
                />
              )
            })}

            <div className="mt-8 text-center">
              <Link
                to="/blog"
                className="inline-block text-primary hover:text-primary-dark font-medium underline underline-offset-4"
              >
                See all posts →
              </Link>
            </div>
          </main>

          <aside className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h2 className="text-2xl font-heading font-bold text-gray-900 mb-4">
                  About
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  Reading The China Dream provides translations and analysis of contemporary Chinese intellectual texts,
                  exploring political thought, cultural debates, and social commentary from China.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  )
}

export default IndexPage

export const query = graphql`
  query {
    recentPosts: allMarkdownPage(
      filter: { sourceType: { eq: "blog" } }
      sort: { date: DESC }
      limit: 5
    ) {
      nodes {
        id
        slug
        title
        date
        markdown
        categories
      }
    }
  }
`
