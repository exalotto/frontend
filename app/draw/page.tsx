'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';
import { Form } from 'react-bootstrap';

import { Article } from '@/components/Article';
import { BigButton } from '@/components/BigButton';
import type { ControllerContract, Lottery } from '@/components/Lottery';
import { useLottery } from '@/components/LotteryContext';
import { useModals } from '@/components/Modals';
import { MONTHS, useAsyncEffect } from '@/components/Utilities';

const ONE_SECOND_MS = 1000;
const ONE_MINUTE_MS = 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

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
          {padLeft(nextStart.getHours())}:{padLeft(nextStart.getMinutes())}
        </b>
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
    // The drawing window has started but `canDraw` hasn't returned True yet.
    return <Waiter lottery={lottery} />;
  }
};

const VerticalBar = () => (
  <div
    style={{
      margin: 'auto',
      width: 0,
      height: 50,
      border: '1px solid #9bd7ff',
    }}
  ></div>
);

const TriggerStage = () => {
  const { context, lottery } = useLottery();
  const [useDefaultSettings, setUseDefaultSettings] = useState(true);
  const [subscriptionId, setSubscriptionId] = useState<string>('');
  const [keyHash, setKeyHash] = useState<string>('');
  const [nativePayment, setNativePayment] = useState(false);
  const [pendingAction, setPendingAction] = useState(false);
  const { showModal } = useModals();
  useAsyncEffect(async () => {
    if (context?.account && lottery && pendingAction) {
      setPendingAction(false);
      try {
        await lottery!.draw({
          vrfSubscriptionId: subscriptionId || process.env.NEXT_PUBLIC_DEFAULT_VRF_SUBSCRIPTION!,
          vrfKeyHash: keyHash || process.env.NEXT_PUBLIC_VRF_KEY_HASH!,
          nativePayment,
          signer: context.account,
        });
      } catch (error) {
        console.error(error);
        showModal('message', 'Error', '' + error);
      }
    }
  }, [context?.account, lottery, pendingAction, subscriptionId, keyHash, nativePayment, showModal]);
  if (!lottery) {
    return null;
  }
  return (
    <>
      <h2 className="text-center text-primary fw-bold">1. Trigger</h2>
      <Form
        onSubmit={async e => {
          e.preventDefault();
          try {
            if (context?.account) {
              await lottery!.draw({
                vrfSubscriptionId:
                  subscriptionId || process.env.NEXT_PUBLIC_DEFAULT_VRF_SUBSCRIPTION!,
                vrfKeyHash: keyHash || process.env.NEXT_PUBLIC_VRF_KEY_HASH!,
                nativePayment,
                signer: context.account,
              });
            } else {
              setPendingAction(true);
              await showModal('wallet');
            }
          } catch (error) {
            console.error(error);
            await showModal('message', 'Error', '' + error);
          }
        }}
      >
        <Form.Check
          id="use-default-settings"
          name="settings"
          type="radio"
          label="Default settings"
          checked={useDefaultSettings}
          onChange={e => setUseDefaultSettings(e.target.checked)}
        />
        <Form.Check
          id="use-custom-settings"
          name="settings"
          type="radio"
          label="Custom settings (advanced)"
          checked={!useDefaultSettings}
          onChange={e => setUseDefaultSettings(!e.target.checked)}
        />
        {useDefaultSettings ? null : (
          <>
            <Form.Group className="mt-3 ms-4">
              <Form.Label htmlFor="subscription-id">VRF subscription ID</Form.Label>
              <Form.Control
                id="subscription-id"
                type="input"
                value={subscriptionId}
                onChange={e => setSubscriptionId(e.target.value)}
                placeholder={`Default: ${process.env.NEXT_PUBLIC_DEFAULT_VRF_SUBSCRIPTION}`}
              />
            </Form.Group>
            <Form.Group className="mt-3 ms-4">
              <Form.Label htmlFor="key-hash">VRF key hash</Form.Label>
              <Form.Control
                id="key-hash"
                type="input"
                value={keyHash}
                onChange={e => setKeyHash(e.target.value)}
                placeholder={`Default: ${process.env.NEXT_PUBLIC_VRF_KEY_HASH} for 500 Gwei`}
              />
            </Form.Group>
            <Form.Check
              className="mt-3 ms-4"
              id="native-payment"
              type="switch"
              label="Native payment"
              checked={nativePayment}
              onChange={e => setNativePayment(e.target.checked)}
            />
          </>
        )}
        <div className="my-3 text-center">
          <BigButton type="submit">Draw!</BigButton>
        </div>
      </Form>
      <VerticalBar />
      <h2 className="text-center text-secondary fw-bold">2. Wait for VRF</h2>
      <VerticalBar />
      <h2 className="text-center text-secondary fw-bold">3. Close Round</h2>
    </>
  );
};

const WaitVRFStage = ({ lottery }: { lottery: Lottery }) => {
  const [requestTxId, setRequestTxId] = useState('');
  useAsyncEffect(async () => {
    const data = await lottery.getDrawData();
    const { drawTxHash } = await lottery.getExtendedDrawData(data);
    if (drawTxHash) {
      setRequestTxId(drawTxHash);
    }
  }, [lottery]);
  return (
    <>
      <h2 className="text-center text-secondary fw-bold">1. Trigger</h2>
      <VerticalBar />
      <h2 className="text-center text-primary fw-bold">2. Wait for VRF</h2>
      {requestTxId ? (
        <>
          <p>
            VRF request at{' '}
            <Link
              href={`https://${process.env.NEXT_PUBLIC_BLOCK_EXPLORER!}/tx/${requestTxId}`}
              rel="noreferrer"
              target="_blank"
            >
              {requestTxId}
            </Link>
          </p>
          <p>Waiting for fulfillment&hellip;</p>
        </>
      ) : null}
      <VerticalBar />
      <h2 className="text-center text-secondary fw-bold">3. Close Round</h2>
    </>
  );
};

const CloseRoundStage = () => {
  const { context, lottery } = useLottery();
  const [pendingAction, setPendingAction] = useState(false);
  const { showModal } = useModals();
  useAsyncEffect(async () => {
    if (pendingAction && lottery && context?.account) {
      setPendingAction(false);
      try {
        await lottery.closeRound(context.account);
      } catch (error) {
        console.error(error);
        showModal('message', 'Error', '' + error);
      }
    }
  }, [context?.account, lottery, pendingAction, showModal]);
  if (!lottery) {
    return null;
  }
  return (
    <>
      <h2 className="text-center text-secondary fw-bold">1. Trigger</h2>
      <VerticalBar />
      <h2 className="text-center text-secondary fw-bold">2. Wait for VRF</h2>
      <VerticalBar />
      <h2 className="text-center text-primary fw-bold">3. Close Round</h2>
      <div className="my-3 text-center">
        <BigButton
          onClick={async () => {
            try {
              if (lottery && context?.account) {
                await lottery.closeRound(context.account);
              } else {
                setPendingAction(true);
                await showModal('wallet');
              }
            } catch (error) {
              console.error(error);
              await showModal('message', 'Error', '' + error);
            }
          }}
        >
          Close Round
        </BigButton>
      </div>
    </>
  );
};

type DrawStage = 'round' | 'trigger' | 'wait' | 'close';

const DrawManager = ({ lottery }: { lottery: Lottery }) => {
  const [stage, setStage] = useState<DrawStage | null>(null);
  useAsyncEffect(async () => {
    const update = async () => {
      if (!(await lottery.isOpen())) {
        setStage('wait');
      } else if (await lottery.canDraw()) {
        setStage('trigger');
      } else if (await lottery.isWaitingForClosure()) {
        setStage('close');
      } else {
        setStage('round');
      }
    };
    let destructor = () => {};
    try {
      const subscription = await lottery.web3.eth.subscribe('newBlockHeaders');
      subscription.on('data', update);
      destructor = () => {
        subscription.removeAllListeners();
        subscription.unsubscribe();
      };
    } catch {}
    await update();
    return destructor;
  }, [lottery]);
  switch (stage) {
    case 'round':
      return <MaybeCountdown lottery={lottery} />;
    case 'trigger':
      return <TriggerStage />;
    case 'wait':
      return <WaitVRFStage lottery={lottery} />;
    case 'close':
      return <CloseRoundStage />;
    default:
      return null;
  }
};

const MaybeDrawManager = () => {
  const { lottery } = useLottery();
  if (!lottery) {
    return <p>Loading&hellip;</p>;
  } else {
    return <DrawManager lottery={lottery} />;
  }
};

export default function Page() {
  return (
    <Article meta={{}}>
      <h1>Weekly Drawing</h1>
      <MaybeDrawManager />
    </Article>
  );
}
