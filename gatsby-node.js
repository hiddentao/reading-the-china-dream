const path = require('path')
const fs = require('fs')
const matter = require('gray-matter')
const readingTime = require('reading-time')

exports.createSchemaCustomization = ({ actions }) => {
  const { createTypes } = actions

  createTypes(`
    type MarkdownPage implements Node {
      id: ID!
      slug: String!
      title: String!
      date: String!
      sourceUrl: String!
      categories: [String!]!
      author: String!
      markdown: String!
      readingTime: String!
      sourceType: String!
    }
  `)
}

exports.sourceNodes = async ({ actions, createNodeId, createContentDigest }) => {
  const { createNode } = actions

  const navigation = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'data', 'navigation.json'), 'utf-8')
  )

  createNode({
    id: createNodeId('site-navigation'),
    navigation,
    internal: {
      type: 'SiteNavigation',
      contentDigest: createContentDigest(navigation)
    }
  })

  const processMarkdownFiles = (dir, sourceType) => {
    const files = fs.readdirSync(dir)

    files.forEach(filename => {
      if (!filename.endsWith('.md')) return

      const filepath = path.join(dir, filename)
      const content = fs.readFileSync(filepath, 'utf-8')
      const { data: frontmatter, content: markdown } = matter(content)

      const slug = '/' + filename.replace(/\.md$/, '') + '/'

      const nodeData = {
        slug,
        title: frontmatter.title || filename.replace(/\.md$/, ''),
        date: frontmatter.date || new Date().toISOString(),
        sourceUrl: frontmatter.sourceUrl || '',
        categories: frontmatter.categories || [],
        author: frontmatter.author || '',
        markdown,
        readingTime: readingTime(markdown).text,
        sourceType
      }

      createNode({
        ...nodeData,
        id: createNodeId(`markdown-${sourceType}-${filename}`),
        parent: null,
        children: [],
        internal: {
          type: 'MarkdownPage',
          contentDigest: createContentDigest(nodeData)
        }
      })
    })
  }

  processMarkdownFiles(path.join(__dirname, 'data', 'blog'), 'blog')
  processMarkdownFiles(path.join(__dirname, 'data', 'pages'), 'page')
}

exports.createPages = async ({ actions, graphql }) => {
  const { createPage } = actions

  const result = await graphql(`
    {
      allMarkdownPage(sort: { date: DESC }) {
        nodes {
          id
          slug
          sourceType
          title
          date
        }
      }
    }
  `)

  if (result.errors) {
    throw result.errors
  }

  const pages = result.data.allMarkdownPage.nodes

  const blogPosts = pages.filter(p => p.sourceType === 'blog')
  const staticPages = pages.filter(p => p.sourceType === 'page')

  blogPosts.forEach((post, index) => {
    const previous = index === 0 ? null : blogPosts[index - 1]
    const next = index === blogPosts.length - 1 ? null : blogPosts[index + 1]

    createPage({
      path: post.slug,
      component: path.resolve('./src/templates/blog-post.tsx'),
      context: {
        id: post.id,
        previousId: previous ? previous.id : null,
        nextId: next ? next.id : null
      }
    })
  })

  staticPages.forEach(page => {
    createPage({
      path: page.slug,
      component: path.resolve('./src/templates/page.tsx'),
      context: {
        id: page.id
      }
    })
  })
}
