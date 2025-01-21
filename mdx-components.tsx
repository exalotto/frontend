import type { PropsWithChildren } from 'react';
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
            {children}&#10548;
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
    td: ({ children }: PropsWithChildren) => {
      if (typeof children === 'string' && /^\s*\^\^\s*$/.test(children)) {
        return null;
      } else {
        return <td>{children}</td>;
      }
    },
  };
}
