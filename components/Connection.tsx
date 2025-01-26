'use client';

import { useEffect, useState, type PropsWithChildren } from 'react';

import type { StaticImageData } from 'next/image';
import Image from 'next/image';
import Link from 'next/link';

import Web3 from 'web3';

import type { AbstractConnector } from '@web3-react/abstract-connector';
import { useWeb3React, Web3ReactProvider } from '@web3-react/core';
import { NetworkConnector } from '@web3-react/network-connector';
import { InjectedConnector } from '@web3-react/injected-connector';
import { WalletConnectConnector } from '@web3-react/walletconnect-connector';

import {
  type MessageModalParams,
  Modal,
  type ModalStateInstance,
  RawModal,
  useModals,
} from './Modals';

import metaMaskLogo from '@/images/metamask.png';
import walletConnectLogo from '@/images/walletconnect.png';
import { useAsyncEffect } from './Utilities';

class Web3Error extends Error {
  public constructor(public readonly inner: Error) {
    super(inner.message);
  }
}

const ConnectWeb3 = ({ children }: PropsWithChildren) => {
  const context = useWeb3React();
  const chainId = parseInt(process.env.NEXT_PUBLIC_NETWORK_ID!, 10);
  useAsyncEffect(async () => {
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
  }, [context, chainId]);
  return children;
};

export const ConnectionProvider = ({ children }: PropsWithChildren) => (
  <Web3ReactProvider getLibrary={provider => new Web3(provider)}>
    <ConnectWeb3>{children}</ConnectWeb3>
  </Web3ReactProvider>
);

export const WrongNetworkMessage = (props: object) => {
  const expected = parseInt(process.env.NEXT_PUBLIC_NETWORK_ID!, 10);
  const { active, chainId } = useWeb3React();
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(active && chainId !== expected);
  }, [active, chainId, expected]);
  return (
    <RawModal show={show} title="Error" dialogClassName="modal-dialog-sm modal-wallet" {...props}>
      You are connected to the wrong network (ID: {chainId}). ExaLotto runs on Polygon PoS (ID:{' '}
      {expected}), please switch.
    </RawModal>
  );
};

const WalletButton = ({
  name,
  logo,
  createConnector,
  onConnect,
  onError,
}: PropsWithChildren & {
  name: string;
  logo: string | StaticImageData;
  createConnector: () => AbstractConnector;
  onConnect: () => void;
  onError: (error: Error) => void;
}) => {
  const { activate } = useWeb3React();
  return (
    <button
      className="btn btn-with-icon"
      onClick={async () => {
        try {
          await activate(createConnector(), onError, true);
        } catch (error) {
          console.error(error);
          onError(new Web3Error(error as Error));
          return;
        }
        onConnect();
      }}
    >
      <span className="btn-with-icon__frame">
        <span className="btn-with-icon__frame-in">
          <span className="btn-with-icon__text">{name}</span>
          <span className="btn-with-icon__icon">
            <Image src={logo} alt={name} />
          </span>
        </span>
      </span>
      <span className="btn-with-icon__arrow-start"></span>
      <span className="btn-with-icon__arrow-end"></span>
    </button>
  );
};

export type WalletModalParams = [];

export const WalletModal = () => {
  const chainId = parseInt(process.env.NEXT_PUBLIC_NETWORK_ID!, 10);
  return (
    <Modal
      name="wallet"
      className="modal-dialog-sm modal-wallet"
      title="Connect to a Wallet"
      resolveOnHide
    >
      {({ resolve, reject, hideModal }: ModalStateInstance<WalletModalParams>) => (
        <>
          <WalletButton
            name="MetaMask"
            logo={metaMaskLogo}
            createConnector={() =>
              new InjectedConnector({
                supportedChainIds: [chainId],
              })
            }
            onConnect={() => {
              hideModal();
              resolve();
            }}
            onError={error => {
              hideModal();
              reject(error);
            }}
          />
          <WalletButton
            name="WalletConnect"
            logo={walletConnectLogo}
            createConnector={() =>
              new WalletConnectConnector({
                rpc: {
                  [chainId]: process.env.NEXT_PUBLIC_RPC_URL!,
                },
              })
            }
            onConnect={() => {
              hideModal();
              resolve();
            }}
            onError={error => {
              hideModal();
              reject(error);
            }}
          />
          <div className="modal-wallet__help">
            <Link href="https://ethereum.org/wallets" target="_blank" rel="noreferrer">
              Learn more about wallets
            </Link>
          </div>
        </>
      )}
    </Modal>
  );
};

const web3ConnectionErrorMessage = `Connection with your wallet failed. Are you connected to Polygon PoS? (The chain ID must be ${process.env.NEXT_PUBLIC_NETWORK_ID}.)`;

export const ConnectButton = () => {
  const { account } = useWeb3React();
  const { showModal } = useModals();
  if (account) {
    return null;
  }
  return (
    <div className="btn-wallet">
      <button
        className="btn btn-wallet__main-btn"
        onClick={async () => {
          try {
            await showModal('wallet');
          } catch (error) {
            if (error instanceof Web3Error) {
              showModal<MessageModalParams>('message', 'Error', web3ConnectionErrorMessage);
            } else {
              showModal<MessageModalParams>('message', 'Error', '' + error);
            }
          }
        }}
      >
        <span className="btn-s__text btn-wallet__text">Connect Wallet</span>
      </button>
      <div className="btn-wallet__doubling">
        <span className="btn-s__frame"></span>
      </div>
    </div>
  );
};
