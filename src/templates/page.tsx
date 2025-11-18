import React from 'react'
import { graphql } from 'gatsby'
import type { PageProps } from 'gatsby'
import { Layout } from '../components/Layout'
import { Markdown } from '../components/Markdown'

interface PageData {
  markdownPage: {
    id: string
    slug: string
    title: string
    markdown: string
    sourceUrl: string
  }
}

const PageTemplate: React.FC<PageProps<PageData>> = ({ data }) => {
  const { markdownPage } = data

  return (
    <Layout>
      <article className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-heading font-bold text-gray-900 mb-4">
            {markdownPage.title}
          </h1>
        </header>

        <Markdown markdown={markdownPage.markdown} />
      </article>
    </Layout>
  )
}

export default PageTemplate

export const query = graphql`
  query PageQuery($id: String!) {
    markdownPage(id: { eq: $id }) {
      id
      slug
      title
      markdown
      sourceUrl
    }
  }
`
