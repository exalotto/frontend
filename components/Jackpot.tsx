'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';

import Web3 from 'web3';

import { Lottery } from './Lottery';
import { useLottery } from './LotteryContext';
import { useAsyncEffect } from './Utilities';

// This used to be a widget to perform an automatic conversion of the jackpot value to other
// currencies, but now that we switched to Dai we don't use it any more.
const JackpotConversion = () => (
  <div className="jackpot__currency">
    <div className="jackpot__currency-shadow">
      <div className="jackpot__currency-shadow-clip"></div>
    </div>
    <div className="jackpot__currency-wrap">
      <div className="jackpot__currency-select">&nbsp;</div>
      <div className="jackpot__currency-selected">&nbsp;</div>
    </div>
    <div className="jackpot__currency-descr">
      We use the Dai stablecoin. <Link href="/howtoplay">Learn more</Link>
    </div>
  </div>
);

const ONE_WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;
const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;
const ONE_HOUR_IN_MS = 60 * 60 * 1000;
const ONE_MINUTE_IN_MS = 60 * 1000;

const NextDraw = ({ lottery }: { lottery: Lottery | null }) => {
  const [nextDrawTime, setNextDrawTime] = useState<number | null>(null);
  const [timeToDraw, setTimeToDraw] = useState<number | null>(null);
  useAsyncEffect(async () => {
    if (lottery) {
      const nextDrawTime = await lottery.getTimeOfNextDraw();
      setNextDrawTime(nextDrawTime.getTime());
    }
  }, [lottery]);
  useEffect(() => {
    const updateTime = () => {
      const now = Date.now();
      if (!nextDrawTime || now > nextDrawTime) {
        setTimeToDraw(null);
      } else {
        setTimeToDraw(nextDrawTime - now);
      }
    };
    const interval = window.setInterval(updateTime, ONE_MINUTE_IN_MS);
    updateTime();
    return () => {
      window.clearInterval(interval);
    };
  }, [nextDrawTime]);
  const getDays = () => {
    if (timeToDraw) {
      return Math.floor((timeToDraw % ONE_WEEK_IN_MS) / ONE_DAY_IN_MS);
    } else {
      return '';
    }
  };
  const getHours = () => {
    if (timeToDraw) {
      return Math.floor((timeToDraw % ONE_DAY_IN_MS) / ONE_HOUR_IN_MS);
    } else {
      return '';
    }
  };
  const getMinutes = () => {
    if (timeToDraw) {
      return Math.floor((timeToDraw % ONE_HOUR_IN_MS) / ONE_MINUTE_IN_MS);
    } else {
      return '';
    }
  };
  return (
    <div className="next-draw">
      <div className="next-draw__title">Next Draw</div>
      <div className="next-draw__timeline">
        <div className="row">
          <div className="col-4 next-draw__item">
            <div className="next-draw__item-in">
              <div className="next-draw__item-title">{getDays()}</div>
              <div className="next-draw__item-sub">Days</div>
            </div>
          </div>
          <div className="col-4 next-draw__item">
            <div className="next-draw__item-in">
              <div className="next-draw__item-title">{getHours()}</div>
              <div className="next-draw__item-sub">Hours</div>
            </div>
          </div>
          <div className="col-4 next-draw__item">
            <div className="next-draw__item-in">
              <div className="next-draw__item-title">{getMinutes()}</div>
              <div className="next-draw__item-sub">Minutes</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Jackpot = () => {
  const { lottery } = useLottery();
  const [jackpot, setJackpot] = useState<number | null>(null);
  const setJackpotFromString = (jackpot: string) => {
    setJackpot(parseFloat(Web3.utils.fromWei(jackpot, 'ether')));
  };
  useAsyncEffect(async () => {
    if (!lottery) {
      return () => {};
    }
    setJackpotFromString(await lottery.getJackpot());
    try {
      const subscription = await lottery.subscribeToJackpot(setJackpotFromString);
      return () => {
        subscription.cancel();
      };
    } catch {
      return () => {};
    }
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
            {jackpot !== null ? <>$&nbsp;{Math.floor(jackpot * 100) / 100}</> : null}
          </div>
          <JackpotConversion />
          <NextDraw lottery={lottery} />
        </div>
      </div>
    </div>
  );
};
