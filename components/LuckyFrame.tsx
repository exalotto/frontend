import { useEffect, useState } from 'react';

import Web3 from 'web3';

import { useLottery } from './LotteryContext';
import { useModals } from './Modals';
import { range, COMBINATIONS } from './Utilities';

const Picker = ({ numbers, onClick }: { numbers: number[]; onClick: (number: number) => void }) => (
  <div className="lucky-picker d-none d-lg-block">
    <div className="picker-table">
      {range(9).map(i =>
        range(10).map(j => {
          const number = i * 10 + j + 1;
          const active = numbers.includes(number);
          return (
            <span
              key={number}
              className={`picker-table__item ${active && 'picker-table__item--active'}`}
            >
              <span className="picker-table__item-in" onClick={() => onClick(number)}>
                <span className="picker-table__text">{number}</span>
              </span>
            </span>
          );
        }),
      )}
    </div>
  </div>
);

const MaybeNumberEditor = ({
  numbers,
  onAddNumber,
}: {
  numbers: number[];
  onAddNumber: (number: number) => void;
}) => {
  const [newNumber, setNewNumber] = useState<string | null>(null);
  const maybeAddNumber = (text: string) => {
    if (!/^[0-9]+$/.test(text)) {
      return;
    }
    const number = parseInt(text, 10);
    if (number < 1 || number > 90) {
      return;
    }
    onAddNumber(number);
  };
  if (numbers.length >= COMBINATIONS.length + 5) {
    return null;
  }
  if (newNumber !== null) {
    return (
      <form
        className="list-activated__item"
        onSubmit={e => {
          e.preventDefault();
          maybeAddNumber(newNumber);
          setNewNumber(null);
        }}
      >
        <input
          type="text"
          autoFocus
          pattern="[0-9]+"
          inputMode="numeric"
          className="list-activated__item-editor"
          value={newNumber}
          onChange={e => {
            if (/^[0-9]*$/.test(e.target.value)) {
              setNewNumber(e.target.value);
            } else {
              e.preventDefault();
            }
          }}
          onBlur={() => {
            maybeAddNumber(newNumber);
            setNewNumber(null);
          }}
        />
      </form>
    );
  } else {
    return (
      <div className="list-activated__item">
        <button
          className="btn btn-plus btn-small-arrows"
          onClick={() => {
            setNewNumber('');
          }}
        >
          <span className=" btn-small-arrows__arrow-start"></span>
          <span className=" btn-small-arrows__arrow-end"></span>
          <span className="btn-small-arrows__frame">
            <span className="btn-small-arrows__text">
              <span className="btn-small-arrows__text-in">+</span>
            </span>
          </span>
        </button>
      </div>
    );
  }
};

const NumberList = ({
  numbers,
  splice,
  onAddNumber,
}: {
  numbers: number[];
  splice: (index: number) => void;
  onAddNumber: (number: number) => void;
}) => (
  <div className="list-activated d-flex justify-content-start flex-wrap">
    {numbers.map((number, index) => (
      <div key={index} className="list-activated__item" onClick={() => splice(index)}>
        <div className="list-activated__item-in">
          <span className="list-activated__text">{number}</span>
        </div>
      </div>
    ))}
    <MaybeNumberEditor numbers={numbers} onAddNumber={onAddNumber} />
  </div>
);

const NumberStats = ({ numbers }: { numbers: number[] }) => {
  const { lottery } = useLottery();
  const [price, setPrice] = useState<number | null>(null);
  useEffect(() => {
    (async () => {
      setPrice(null);
      if (lottery && numbers.length >= 6) {
        const priceValue = parseFloat(
          Web3.utils.fromWei(await lottery.getTicketPrice(numbers), 'ether'),
        );
        setPrice(Math.round(priceValue * 100) / 100);
      }
    })();
  }, [lottery, numbers]);
  return (
    <div className="lucky-statistic d-flex justify-content-around align-items-center">
      <div className="lucky-statistic__total">
        <div className="lucky-statistic__title">Total Numbers</div>
        <div className="lucky-statistic__subtitle">{numbers.length}</div>
      </div>
      <div className="lucky-statistic__played">
        <div className="lucky-statistic__title">Played Combinations</div>
        <div className="lucky-statistic__subtitle">
          {numbers.length < 6 ? 0 : COMBINATIONS[numbers.length - 6]}
        </div>
      </div>
      <div className="lucky-statistic__cost">
        <div className="lucky-statistic__title">
          Price ({process.env.NEXT_PUBLIC_CURRENCY_NAME})
        </div>
        <div className="lucky-statistic__subtitle">{price}</div>
      </div>
    </div>
  );
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const PlayButton = ({ numbers, onPlayed }: { numbers: number[]; onPlayed: () => void }) => {
  const { context, lottery } = useLottery();
  const { showModal } = useModals();

  const [nextDraw, setNextDraw] = useState<Date | null>(null);
  const [waitingNumbers, setWaitingNumbers] = useState<number[] | null>(null);

  const buyTicket = async (numbers: number[]) => {
    let receipt;
    try {
      receipt = await lottery!.createTicket(numbers, context!.account);
    } catch (error) {
      console.error(error);
      showModal('message', 'Error', '' + error);
      return;
    }
    onPlayed();
    showModal('receipt', numbers, receipt);
  };

  useEffect(() => {
    const updateTime = async () => {
      if (lottery) {
        setNextDraw(await lottery.getTimeOfNextDraw());
      }
    };
    const interval = window.setInterval(updateTime, 60000);
    updateTime();
    return () => {
      window.clearInterval(interval);
    };
  }, [lottery]);

  useEffect(() => {
    if (
      waitingNumbers &&
      context &&
      lottery &&
      context.account &&
      context.account === lottery!.defaultSigner
    ) {
      const numbers = waitingNumbers;
      setWaitingNumbers(null);
      buyTicket(numbers);
    }
  }, [waitingNumbers, context?.account, lottery?.defaultSigner]);

  return (
    <div className="lucky-list__buttons">
      <button
        className="btn-s btn-play"
        onClick={async () => {
          if (numbers.length < 6) {
            showModal('message', 'Play', 'Please select at least 6 numbers.');
            return;
          }
          if (context?.account) {
            buyTicket(numbers);
          } else {
            setWaitingNumbers(numbers);
            showModal('wallet');
          }
        }}
      >
        <span className="btn-s__frame btn-play__frame">
          <span className="btn-s__text">Play</span>
          <span className="btn-play-in btn-s">
            <span className="btn-play-in__frame btn-s__frame">
              <span className="btn-play-in__text">
                {nextDraw ? (
                  <>
                    {MONTHS[nextDraw.getMonth()]} <b>{nextDraw.getDate()}</b>,{' '}
                    <b>{nextDraw.getFullYear()}</b> Draw
                  </>
                ) : (
                  ''
                )}
              </span>
            </span>
          </span>
        </span>
      </button>
    </div>
  );
};

const LuckyList = ({
  numbers,
  splice,
  onAddNumber,
  onPlayed,
}: {
  numbers: number[];
  splice: (index: number) => void;
  onAddNumber: (number: number) => void;
  onPlayed: () => void;
}) => (
  <div className="lucky-list">
    <NumberList numbers={numbers} splice={splice} onAddNumber={onAddNumber} />
    <NumberStats numbers={numbers} />
    <PlayButton numbers={numbers} onPlayed={onPlayed} />
  </div>
);

export const LuckyFrame = () => {
  const [numbers, setNumbers] = useState<number[]>([]);
  return (
    <div className="lucky-frame__wrap">
      <div className="lucky-titles d-flex justify-content-between">
        <div className="lucky-titles__left">
          <div className="two-rows-title d-none d-lg-inline-block">
            <div className="two-rows-title__top-frame">
              <div className="two-rows-title__top-frame-clip"></div>
            </div>
            <div className="two-rows-title__frame">
              <div className="two-rows-title__frame-in">
                <div className="two-rows-title__main-text">Pick Your Lucky Numbers</div>
                <div className="two-rows-title__sub-text">
                  Min 6 - Max {COMBINATIONS.length + 5}
                </div>
              </div>
            </div>
          </div>
          <div className="one-row-title d-lg-none">
            <div className="one-row-title__top-frame">
              <div className="one-row-title__top-frame-clip"></div>
            </div>
            <div className="one-row-title__frame">
              <div className="one-row-title__frame-in">
                <div className="one-row-title__main-text">Pick Your Lucky Numbers</div>
              </div>
            </div>
          </div>
        </div>
        <div className="lucky-titles__right d-none d-lg-block">
          <div className="one-row-title">
            <div className="one-row-title__top-frame">
              <div className="one-row-title__top-frame-clip"></div>
            </div>
            <div className="one-row-title__frame">
              <div className="one-row-title__frame-in">
                <div className="one-row-title__main-text">Your Lucky List</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="lucky-frame__shadow">
        <div className="lucky-frame d-flex justify-content-between align-items-start">
          <Picker
            numbers={numbers}
            onClick={number => {
              const i = numbers.indexOf(number);
              if (i < 0) {
                if (numbers.length < COMBINATIONS.length + 5) {
                  numbers.push(number);
                }
              } else {
                numbers.splice(i, 1);
              }
              setNumbers(numbers.slice());
            }}
          />
          <LuckyList
            numbers={numbers}
            splice={(index: number) => {
              const newNumbers = numbers.slice();
              newNumbers.splice(index, 1);
              setNumbers(newNumbers);
            }}
            onAddNumber={(number: number) => {
              const index = numbers.indexOf(number);
              if (index < 0) {
                setNumbers(numbers.concat(number));
              } else {
                const newNumbers = numbers.slice();
                newNumbers.splice(index, 1);
                newNumbers.push(number);
                setNumbers(newNumbers);
              }
            }}
            onPlayed={() => {
              setNumbers([]);
            }}
          />
        </div>
      </div>
      <div className="lucky-frame__shadow-double"></div>
    </div>
  );
};
