'use client';

import { useEffect, useState } from 'react';

import type { ControllerContract, GovernanceTokenContract } from '@/components/Lottery';
import { useLottery, type Web3Context } from '@/components/LotteryContext';
import { formatBigNumber, useAsyncEffect } from '@/components/Utilities';

const DynamicStatus = ({
  context: { account, library: web3 },
  token,
  controller,
}: {
  context: Web3Context;
  token: GovernanceTokenContract;
  controller: ControllerContract;
}) => {
  const [show, setShow] = useState(false);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [unclaimed, setUnclaimed] = useState<bigint | null>(null);
  useEffect(() => {
    (async () => {
      setBalance(null);
      setUnclaimed(null);
      const balance = web3!.utils.toBigInt(await token.methods.balanceOf(account).call());
      if (balance != BigInt(0)) {
        setShow(false);
        return;
      }
      setBalance(balance);
      setShow(true);
      setUnclaimed(
        web3!.utils.toBigInt(await controller.methods.getUnclaimedRevenue(account).call()),
      );
    })();
  }, [account, controller, token, web3]);
  if (!show) {
    return null;
  }
  return (
    <>
      <h2>Account Status</h2>
      <p>Greetings, esteemed partner!</p>
      <p>
        You are connected as:{' '}
        <a
          href={`https://${process.env.NEXT_PUBLIC_BLOCK_EXPLORER}/address/${account}`}
          target="_blank"
          rel="noreferrer"
        >
          {account}
        </a>
      </p>
      {balance ? (
        <p>
          Your <code>EXL</code> balance is: {formatBigNumber(web3!, balance)}
        </p>
      ) : null}
      {unclaimed && unclaimed != BigInt(0) ? (
        <p>
          You have unclaimed fees: $ {formatBigNumber(web3!, unclaimed)} &#8211;{' '}
          <button
            onClick={async () => {
              await controller.methods.withdraw(account).send({ from: account! });
            }}
          >
            withdraw
          </button>
        </p>
      ) : null}
    </>
  );
};

export const PartnerStatus = () => {
  const { context, lottery } = useLottery();
  const [token, setToken] = useState<GovernanceTokenContract | null>(null);
  const [controller, setController] = useState<ControllerContract | null>(null);
  useAsyncEffect(async () => {
    const [token, controller] = await Promise.all([
      lottery!.getGovernanceToken(),
      lottery!.getController(),
    ]);
    setToken(token);
    setController(controller);
  }, [lottery]);
  if (context?.account && token && controller) {
    return <DynamicStatus context={context} token={token} controller={controller} />;
  } else {
    return null;
  }
};
