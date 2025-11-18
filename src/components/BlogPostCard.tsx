import React from 'react'
import { Link } from 'gatsby'

interface BlogPostCardProps {
  title: string
  date: string
  slug: string
  excerpt: string
  categories?: string[]
}

export const BlogPostCard: React.FC<BlogPostCardProps> = ({
  title,
  date,
  slug,
  excerpt,
  categories = []
}) => {
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <article className="mb-8 pb-8 border-b border-gray-200 last:border-0">
      <Link to={slug} className="no-underline">
        <h2 className="text-3xl font-heading font-bold text-gray-900 hover:text-primary transition-colors mb-2">
          {title}
        </h2>
      </Link>

      <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
        <time dateTime={date}>{formattedDate}</time>
        {categories.length > 0 && (
          <>
            <span>•</span>
            <div className="flex gap-2">
              {categories.map((category) => (
                <span key={category} className="text-secondary">
                  {category}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      <p className="text-gray-700 leading-relaxed mb-4">
        {excerpt}
      </p>

      <Link
        to={slug}
        className="inline-block text-primary hover:text-secondary font-medium transition-colors"
      >
        Read more →
      </Link>
    </article>
  )
}
