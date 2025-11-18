import React from 'react'
import { graphql, Link } from 'gatsby'
import type { PageProps } from 'gatsby'
import { Layout } from '../components/Layout'

interface BlogPost {
  id: string
  slug: string
  title: string
  date: string
}

interface BlogListingData {
  allMarkdownPage: {
    nodes: BlogPost[]
  }
}

interface PostsByYear {
  [year: string]: BlogPost[]
}

const BlogListingPage: React.FC<PageProps<BlogListingData>> = ({ data }) => {
  const posts = data.allMarkdownPage.nodes

  const postsByYear: PostsByYear = posts.reduce((acc, post) => {
    const year = new Date(post.date).getFullYear().toString()
    if (!acc[year]) {
      acc[year] = []
    }
    acc[year].push(post)
    return acc
  }, {} as PostsByYear)

  const years = Object.keys(postsByYear).sort((a, b) => parseInt(b) - parseInt(a))

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-heading font-bold text-gray-900 mb-4">
            Blog Posts
          </h1>
          <p className="text-gray-600">
            All blog posts organized by year
          </p>
        </header>

        {years.map((year) => (
          <div key={year} className="mb-12">
            <h2 className="text-3xl font-heading font-bold text-gray-900 mb-6 pb-2 border-b-2 border-primary">
              {year}
            </h2>
            <ul className="space-y-3">
              {postsByYear[year]?.map((post) => (
                <li key={post.id}>
                  <Link
                    to={post.slug}
                    className="block hover:bg-gray-50 p-3 rounded transition-colors"
                  >
                    <span className="text-gray-600 font-medium min-w-[120px] inline-block">
                      {formatDate(post.date)}:
                    </span>
                    <span className="text-primary hover:text-secondary ml-2">
                      {post.title}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {years.length === 0 && (
          <div className="text-center text-gray-600 py-12">
            <p>No blog posts found.</p>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default BlogListingPage

export const query = graphql`
  query BlogListingQuery {
    allMarkdownPage(
      filter: { sourceType: { eq: "blog" } }
      sort: { date: DESC }
    ) {
      nodes {
        id
        slug
        title
        date
      }
    }
  }
`
