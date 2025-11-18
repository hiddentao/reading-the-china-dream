import React from 'react'
import { Link } from 'gatsby'

export const Sidebar: React.FC = () => {
  return (
    <aside className="bg-gray-50 p-6 rounded-lg">
      <h3 className="text-xl font-heading font-bold mb-4">About This Site</h3>
      <div className="prose prose-sm">
        <p className="mb-4 text-gray-700">
          This website is devoted to the subject of intellectual life in contemporary China,
          and more particularly to the writings of establishment intellectuals. What you will
          find here are essentially translations of Chinese texts that my collaborators and I
          consider important.
        </p>

        <ul className="space-y-2">
          <li>
            <Link to="/david-ownby-tips/" className="text-primary hover:text-secondary">
              Tips for using the site
            </Link>
          </li>
          <li>
            <Link to="/top-15-translation/" className="text-primary hover:text-secondary">
              15 most popular translations
            </Link>
          </li>
          <li>
            <Link to="/personal-favorites/" className="text-primary hover:text-secondary">
              Personal favorites
            </Link>
          </li>
          <li>
            <a
              href="https://checkout.square.site/merchant/MLGETK1CC1WBQ/checkout/IOT3SF57JGIJVSITWWZYGZIV"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-secondary"
            >
              Make a donation
            </a>
          </li>
        </ul>
      </div>
    </aside>
  )
}
