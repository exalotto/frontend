import type { MDXComponents } from 'mdx/types';
import Link from 'next/link';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,

    a: ({ children, href, ...props }) => {
      if (/^[^/]+:/.test(href)) {
        // external link
        return (
          <a href={href} {...props} target="_blank" rel="noreferrer">
            {children}
          </a>
        );
      } else {
        return (
          <Link href={href} {...props}>
            {children}
          </Link>
        );
      }
    },

    table: ({ children, className = '', ...props }) => (
      <table className={className + ' data-table'} {...props}>
        {children}
      </table>
    ),
  };
}
