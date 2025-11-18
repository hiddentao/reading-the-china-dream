import React from 'react'
import { graphql, Link } from 'gatsby'
import type { PageProps } from 'gatsby'
import { Layout } from '../components/Layout'
import { Sidebar } from '../components/Sidebar'
import { Markdown } from '../components/Markdown'

interface BlogPostData {
  markdownPage: {
    id: string
    slug: string
    title: string
    date: string
    author: string
    categories: string[]
    markdown: string
    readingTime: string
    sourceUrl: string
  }
  previous: {
    slug: string
    title: string
  } | null
  next: {
    slug: string
    title: string
  } | null
}

const BlogPostTemplate: React.FC<PageProps<BlogPostData>> = ({ data }) => {
  const { markdownPage, previous, next } = data
  const formattedDate = new Date(markdownPage.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <article>
            <header className="mb-8">
              <h1 className="text-4xl font-heading font-bold text-gray-900 mb-4">
                {markdownPage.title}
              </h1>
              <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                <div className="flex items-center">
                  <span className="font-semibold">Published:</span>
                  <span className="ml-2">{formattedDate}</span>
                </div>
                {markdownPage.author && (
                  <div className="flex items-center">
                    <span className="font-semibold">Author:</span>
                    <span className="ml-2">{markdownPage.author}</span>
                  </div>
                )}
                <div className="flex items-center">
                  <span className="font-semibold">Reading time:</span>
                  <span className="ml-2">{markdownPage.readingTime}</span>
                </div>
              </div>
              {markdownPage.categories && markdownPage.categories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {markdownPage.categories.map((category, index) => (
                    <span
                      key={index}
                      className="inline-block bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                    >
                      {category}
                    </span>
                  ))}
                </div>
              )}
            </header>

            <Markdown markdown={markdownPage.markdown} />
          </article>

          <nav className="mt-12 pt-8 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {previous && (
                <Link
                  to={previous.slug}
                  className="block p-4 border border-gray-200 rounded-lg hover:border-primary transition-colors"
                >
                  <div className="text-sm text-gray-600 mb-1">Previous Post</div>
                  <div className="font-medium text-gray-900">{previous.title}</div>
                </Link>
              )}
              {next && (
                <Link
                  to={next.slug}
                  className="block p-4 border border-gray-200 rounded-lg hover:border-primary transition-colors md:text-right"
                >
                  <div className="text-sm text-gray-600 mb-1">Next Post</div>
                  <div className="font-medium text-gray-900">{next.title}</div>
                </Link>
              )}
            </div>
          </nav>
        </div>

        <div className="lg:col-span-1">
          <Sidebar />
        </div>
      </div>
    </Layout>
  )
}

export default BlogPostTemplate

export const query = graphql`
  query BlogPostQuery($id: String!, $previousId: String, $nextId: String) {
    markdownPage(id: { eq: $id }) {
      id
      slug
      title
      date
      author
      categories
      markdown
      readingTime
      sourceUrl
    }
    previous: markdownPage(id: { eq: $previousId }) {
      slug
      title
    }
    next: markdownPage(id: { eq: $nextId }) {
      slug
      title
    }
  }
`
