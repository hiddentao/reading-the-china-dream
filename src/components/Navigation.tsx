import React, { useState } from 'react'
import { Link, useStaticQuery, graphql } from 'gatsby'

interface NavLink {
  title: string
  url: string
  children?: NavLink[]
}

export const Navigation: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<number | null>(null)

  const data = useStaticQuery(graphql`
    query {
      siteNavigation {
        navigation {
          title
          url
          children {
            title
            url
          }
        }
      }
    }
  `)

  const convertUrl = (url: string, title: string): string => {
    if (title === 'Blog' && url === 'https://www.readingthechinadream.com/') {
      return '/blog/'
    }

    let relativeUrl = url
      .replace(/https?:\/\/(www\.)?readingthechinadream\.com/, '')
      .replace(/\.html$/, '')

    if (relativeUrl && !relativeUrl.endsWith('/')) {
      relativeUrl += '/'
    }

    return relativeUrl || '/'
  }

  const processNavigation = (nav: NavLink[]): NavLink[] => {
    const seen = new Set<string>()
    return nav
      .filter(item => {
        const key = `${item.title}-${item.url}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .map(item => ({
        ...item,
        url: convertUrl(item.url, item.title),
        children: item.children?.map(child => ({
          ...child,
          url: convertUrl(child.url, child.title)
        }))
      }))
  }

  const navigation: NavLink[] = processNavigation(data.siteNavigation.navigation)

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-heading font-bold text-gray-900">
              Reading The China Dream
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-8">
            {navigation.map((item, index) => (
              <div
                key={index}
                className="relative"
                onMouseEnter={() => item.children && item.children.length > 0 && setOpenDropdown(index)}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                {item.children && item.children.length > 0 ? (
                  <>
                    <button className="text-gray-700 hover:text-primary px-3 py-2 font-medium transition-colors">
                      {item.title}
                    </button>
                    {openDropdown === index && (
                      <div className="absolute right-0 top-full w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                        <div className="py-1 pt-2">
                          {item.children.map((child, childIndex) => (
                            <Link
                              key={childIndex}
                              to={child.url}
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-primary"
                            >
                              {child.title}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    to={item.url}
                    className="text-gray-700 hover:text-primary px-3 py-2 font-medium transition-colors"
                  >
                    {item.title}
                  </Link>
                )}
              </div>
            ))}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-primary focus:outline-none"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navigation.map((item, index) => (
              <div key={index}>
                <Link
                  to={item.url}
                  className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50"
                >
                  {item.title}
                </Link>
                {item.children && item.children.length > 0 && (
                  <div className="pl-4">
                    {item.children.map((child, childIndex) => (
                      <Link
                        key={childIndex}
                        to={child.url}
                        className="block px-3 py-2 text-sm text-gray-600 hover:text-primary hover:bg-gray-50"
                      >
                        {child.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </nav>
  )
}
