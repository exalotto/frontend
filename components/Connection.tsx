'use client';

import { useEffect } from 'react';

import Web3 from 'web3';

import { useWeb3React, Web3ReactProvider } from '@web3-react/core';
import { NetworkConnector } from '@web3-react/network-connector';

const ConnectWeb3 = ({ children }: React.PropsWithChildren) => {
  const context = useWeb3React();
  const chainId = parseInt(process.env.NEXT_PUBLIC_NETWORK_ID!, 10);
  useEffect(() => {
    (async () => {
      if (!context.connector) {
        await context.activate(
          new NetworkConnector({
            urls: {
              [chainId]: process.env.NEXT_PUBLIC_RPC_URL!,
            },
            defaultChainId: chainId,
          }),
        );
      }
    })();
  }, [context, chainId]);
  return children;
};

export const ConnectionProvider = ({ children }: React.PropsWithChildren) => (
  <Web3ReactProvider getLibrary={provider => new Web3(provider)}>
    <ConnectWeb3>{children}</ConnectWeb3>
  </Web3ReactProvider>
);
