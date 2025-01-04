import { useEffect, useState } from 'react';

import Web3 from 'web3';

import { useLottery } from './LotteryContext';

export const Jackpot = () => {
  const { lottery } = useLottery();
  const [jackpot, setJackpot] = useState<number | null>(null);
  useEffect(() => {
    (async () => {
      if (lottery) {
        const subscription = await lottery.subscribeToJackpot((jackpot: string) => {
          setJackpot(parseFloat(Web3.utils.fromWei(jackpot, 'ether')));
        });
        return () => {
          subscription.cancel();
        };
      }
    })();
  }, [lottery]);
  return (
    <div className="jackpot">
      <div className="jackpot__main-shadow">
        <div className="jackpot__title">
          <div className="one-row-title">
            <div className="one-row-title__top-frame">
              <div className="one-row-title__top-frame-clip"></div>
            </div>
            <div className="one-row-title__frame">
              <div className="one-row-title__frame-in">
                <div className="one-row-title__main-text">Current Jackpot</div>
              </div>
            </div>
          </div>
        </div>
        <div className="jackpot__main">
          <div className="jackpot__top-win">
            $ {jackpot !== null && `${Math.floor(jackpot * 100) / 100}`}
          </div>
          {/* TODO: jackpot conversion */}
          {/* TODO: <NextDraw lottery={lottery} /> */}
        </div>
      </div>
    </div>
  );
};
