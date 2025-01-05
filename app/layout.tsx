import type { Metadata } from 'next';

import { ConnectionProvider } from '@/components/Connection';
import { LotteryContextProvider } from '@/components/LotteryContext';

import '@/styles/prism.css';
import '@/styles/main.scss';

export const metadata: Metadata = {
  title: 'ExaLotto',
  description: 'A decentralized, permissionless, provably fair lottery game.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ConnectionProvider>
          <LotteryContextProvider>{children}</LotteryContextProvider>
        </ConnectionProvider>
      </body>
    </html>
  );
}
