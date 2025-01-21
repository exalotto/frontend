'use client';

import React, { PropsWithChildren, useContext, useEffect, useState } from 'react';

import type Web3 from 'web3';

import { useWeb3React } from '@web3-react/core';

import { Lottery, SpendingApprovalMode } from './Lottery';

export interface Web3Context {
  active: boolean;
  library?: Web3;
  account?: string | null;
}

export interface LotteryContext {
  context: Web3Context | null;
  lottery: Lottery | null;
}

const NULL_CONTEXT: LotteryContext = {
  context: null,
  lottery: null,
};

export const LotteryContext = React.createContext<LotteryContext>(NULL_CONTEXT);

export const useLottery = () => useContext(LotteryContext);

function sanitizeSpendingApprovalMode(): SpendingApprovalMode {
  switch (process.env.NEXT_PUBLIC_SPENDING_APPROVAL_MODE) {
    case 'eip2612':
      return 'eip2612';
    case 'dai':
      return 'dai';
    default:
      return 'manual';
  }
}

export const LotteryContextProvider = ({ children }: PropsWithChildren) => {
  const web3Context = useWeb3React<Web3>();
  const [lotteryContext, setLotteryContext] = useState<LotteryContext>(NULL_CONTEXT);
  useEffect(() => {
    if (web3Context.active && web3Context.library) {
      setLotteryContext({
        context: web3Context,
        lottery: new Lottery({
          web3: web3Context.library,
          lotteryAddress: process.env.NEXT_PUBLIC_LOTTERY_ADDRESS!,
          defaultSigner: web3Context.account || void 0,
          defaultSpendingApprovalMode: sanitizeSpendingApprovalMode(),
        }),
      });
    } else {
      setLotteryContext(NULL_CONTEXT);
    }
  }, [web3Context, web3Context?.active, web3Context?.library, web3Context?.account]);
  return <LotteryContext.Provider value={lotteryContext}>{children}</LotteryContext.Provider>;
};
