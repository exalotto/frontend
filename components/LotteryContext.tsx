import React, { PropsWithChildren, useContext, useEffect, useState } from 'react';

import type Web3 from 'web3';

import { useWeb3React } from '@web3-react/core';

import { Lottery } from './Lottery';

export interface Web3Context {
  active: boolean;
  library?: Web3;
  account?: string | null;
}

export const LotteryContext = React.createContext({
  context: null as Web3Context | null,
  lottery: null as Lottery | null,
});

export const useLottery = () => useContext(LotteryContext);

export const LotteryContextProvider = ({ children }: PropsWithChildren) => {
  const context = useWeb3React<Web3>();
  const [lottery, setLottery] = useState<Lottery | null>(null);
  useEffect(() => {
    if (context.active && context.library) {
      setLottery(
        new Lottery({
          web3: context.library,
          address: process.env.NEXT_PUBLIC_LOTTERY_ADDRESS!,
          defaultSigner: context.account || void 0,
        }),
      );
    } else {
      setLottery(null);
    }
  }, [context, context.active, context.library, context.account]);
  return <LotteryContext.Provider value={{ context, lottery }}>{children}</LotteryContext.Provider>;
};
