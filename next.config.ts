import type { NextConfig } from 'next';
import createMDX from '@next/mdx';

import rehypeAutolink from 'rehype-autolink-headings';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkPrism from 'remark-prism';

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  output: 'export',
  reactStrictMode: true,
  trailingSlash: true,
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
};

const withMDX = createMDX({
  options: {
    remarkPlugins: [remarkGfm, remarkMath, remarkPrism as never],
    rehypePlugins: [rehypeSlug, rehypeAutolink, rehypeKatex],
  },
});

export default withMDX(nextConfig);
