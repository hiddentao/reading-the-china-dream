import React, { useMemo, Fragment } from 'react'
import { Link } from 'gatsby'
import { unified } from 'unified'
import parse from 'remark-parse'
import remark2rehype from 'remark-rehype'
import rehype2react from 'rehype-react'
import * as prod from 'react/jsx-runtime'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface MarkdownProps {
  markdown: string
  className?: string
}

const RenderParagraph = ({ children }: any) => {
  return <p className="mb-4 leading-relaxed">{children}</p>
}

const RenderImage = ({ src, alt }: any) => {
  return <img src={src} alt={alt} className="my-4 rounded-lg max-w-full h-auto" />
}

const RenderAnchor = ({ href, children }: any) => {
  const isInternal = href && href.startsWith('/')

  if (isInternal) {
    return <Link to={href} className="text-primary hover:text-secondary transition-colors">{children}</Link>
  }

  return <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-secondary transition-colors">{children}</a>
}

const RenderCode = ({ children, className }: any) => {
  const match = /language-(\w+)/.exec(className || '')
  const language = match ? match[1] : 'text'

  if (className && match) {
    return (
      <SyntaxHighlighter
        language={language}
        style={tomorrow}
        className="rounded-lg my-4"
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    )
  }

  return <code className="bg-gray-100 px-1 py-0.5 rounded text-sm">{children}</code>
}

export const Markdown: React.FC<MarkdownProps> = ({ markdown, className = '' }) => {
  const output = useMemo(() => {
    try {
      return unified()
        .use(parse)
        .use(remark2rehype)
        .use(rehype2react, {
          Fragment,
          jsx: prod.jsx,
          jsxs: prod.jsxs,
          components: {
            p: RenderParagraph,
            img: RenderImage,
            a: RenderAnchor,
            code: RenderCode
          }
        })
        .processSync(markdown).result
    } catch (error) {
      console.error('Markdown processing error:', error)
      return <div>Error rendering markdown</div>
    }
  }, [markdown])

  return <div className={`markdown-content ${className}`}>{output}</div>
}
