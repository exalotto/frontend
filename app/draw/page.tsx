'use client';

import { useEffect, useState } from 'react';

import type { ControllerContract, Lottery } from '@/components/Lottery';
import { useLottery } from '@/components/LotteryContext';
import { MONTHS, useAsyncEffect } from '@/components/Utilities';
import { Article } from '@/components/Article';
import Link from 'next/link';

const ONE_SECOND_MS = 1000;
const ONE_MINUTE_MS = 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

type ResolveCanDraw = (value: boolean) => void;
type RejectCanDraw = (error: unknown) => void;

class AsyncChecker {
  private _lottery: Lottery;
  private _checking: boolean = false;
  private _callbacks: [ResolveCanDraw, RejectCanDraw][] = [];

  public constructor(lottery: Lottery) {
    this._lottery = lottery;
  }

  private async _checkInternal(): Promise<boolean> {
    this._checking = true;
    try {
      return await this._lottery.canDraw();
    } finally {
      this._checking = false;
    }
  }

  public async check(): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      this._callbacks.push([resolve, reject]);
      if (!this._checking) {
        this._checkInternal()
          .then(result => {
            this._callbacks.forEach(([resolve]) => resolve(result));
            this._callbacks = [];
          })
          .catch(error => {
            this._callbacks.forEach(([, reject]) => reject(error));
            this._callbacks = [];
          });
      }
    });
  }

  public cancel(): void {
    this._callbacks = [];
  }
}

function padLeft(value: number): string {
  if (value >= 0 && value < 10) {
    return '0' + value;
  } else {
    return '' + value;
  }
}

const Countdown = ({ nextStart }: { nextStart: Date }) => {
  const [remaining, setRemaining] = useState(nextStart.getTime() - Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => {
      setRemaining(nextStart.getTime() - Date.now());
    }, 1000);
    return () => {
      window.clearInterval(interval);
    };
  }, [nextStart]);
  if (!nextStart) {
    return null;
  }
  const getDays = () => Math.floor(remaining / ONE_DAY_MS);
  const getHours = () => Math.floor((remaining % ONE_DAY_MS) / ONE_HOUR_MS);
  const getMinutes = () => Math.floor((remaining % ONE_HOUR_MS) / ONE_MINUTE_MS);
  const getSeconds = () => Math.floor((remaining % ONE_MINUTE_MS) / ONE_SECOND_MS);
  return (
    <>
      <p>
        The next drawing window starts on{' '}
        <b>
          {MONTHS[nextStart.getMonth()]} {nextStart.getDate()}, {nextStart.getFullYear()}
        </b>{' '}
        at{' '}
        <b>
          {padLeft(nextStart.getUTCHours())}:{padLeft(nextStart.getUTCMinutes())}
        </b>{' '}
        UTC
      </p>
      <p>
        Countdown: {getDays()} days, {getHours()} hours, {getMinutes()} minutes, {getSeconds()}{' '}
        seconds
      </p>
    </>
  );
};

const Waiter = ({ lottery }: { lottery: Lottery }) => {
  const [controller, setController] = useState<ControllerContract | null>(null);
  useAsyncEffect(async () => {
    setController(await lottery.getController());
  }, [lottery]);
  return (
    <>
      <p>Waiting for smartcontract...</p>
      {controller ? (
        <p>
          <Link
            href={`https://${process.env.NEXT_PUBLIC_BLOCK_EXPLORER}/address/${controller.options
              .address!}#readContract#F5`}
            rel="noreferrer"
            target="_blank"
          >
            Check manually
          </Link>
        </p>
      ) : null}
    </>
  );
};

const MaybeCountdown = ({ lottery }: { lottery: Lottery }) => {
  const [nextStart, setNextStart] = useState<Date | null>(null);
  useAsyncEffect(async () => {
    setNextStart(await lottery.getTimeOfNextDraw());
  }, [lottery]);
  if (!nextStart) {
    return null;
  } else if (Date.now() < nextStart.getTime()) {
    return <Countdown nextStart={nextStart} />;
  } else {
    return <Waiter lottery={lottery} />;
  }
};

const DrawPanel = ({ lottery }: { lottery: Lottery }) => {
  return <>{/* TODO */}</>;
};

const DrawManager = () => {
  const { lottery } = useLottery();
  const [canDraw, setCanDraw] = useState(false);
  useEffect(() => {
    if (!lottery) {
      return () => {};
    }
    const checker = new AsyncChecker(lottery);
    checker.check().then(canDraw => setCanDraw(canDraw));
    const interval = window.setInterval(async () => {
      setCanDraw(await checker.check());
    }, ONE_MINUTE_MS);
    return () => {
      window.clearInterval(interval);
      checker.cancel();
    };
  }, [lottery]);
  if (!lottery) {
    return null;
  } else if (canDraw) {
    return <DrawPanel lottery={lottery} />;
  } else {
    return <MaybeCountdown lottery={lottery} />;
  }
};

export default function Page() {
  return (
    <Article meta={{}}>
      <h1>Weekly Drawing</h1>
      <DrawManager />
    </Article>
  );
}
