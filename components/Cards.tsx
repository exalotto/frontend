import { PropsWithChildren } from 'react';

import Web3 from 'web3';

function formatNumber(value: number): string {
  return ('0' + value).slice(-2);
}

function formatMoney(value: bigint): number {
  return Math.floor(parseFloat(Web3.utils.fromWei(value, 'ether')) * 100) / 100;
}

const Card = ({
  date,
  children,
  onAction = null,
  actionTitle = 'More Details',
  actionEnabled = true,
}: PropsWithChildren & {
  date: Date;
  onAction: (() => void) | null;
  actionTitle: string;
  actionEnabled: boolean;
}) => (
  <div className="draws__item">
    <div className="draws__frame">
      <div className="draws__date">
        {formatNumber(date.getDate())}.{formatNumber(date.getMonth() + 1)}.
        {formatNumber(date.getFullYear())}
      </div>
      <div className="draws__main-shadow">
        <div className="draws__main">{children}</div>
        {onAction ? (
          <div className="draws__buttons">
            <button disabled={!actionEnabled} className="btn btn-details" onClick={onAction}>
              <span className="btn-details__text">{actionTitle}</span>
              <span className="btn-details__shadow"></span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  </div>
);

const Jackpot = ({ jackpot }: { jackpot: bigint }) => (
  <div className="draws__jackpot">
    <div className="draws__jackpot-frame">
      <div className="draws__jackpot-title">Jackpot</div>
      <div className="draws__jackpot-container">
        <div className="draws__jackpot-number">
          {formatMoney(jackpot)} {process.env.NEXT_PUBLIC_CURRENCY_NAME}
        </div>
      </div>
    </div>
  </div>
);

Card.Jackpot = Jackpot;

const Section = ({ title, children }: PropsWithChildren & { title: string }) => (
  <div className="card-section__out">
    <div className="card-section">
      <div className="card-section__title">{title}</div>
      <div className="card-section__body">{children}</div>
    </div>
  </div>
);

Card.Section = Section;

const Numbers = ({
  title,
  numbers,
  highlightedNumbers = [],
}: {
  title: string;
  numbers: number[];
  highlightedNumbers?: number[];
}) => (
  <div className="card-section__out">
    <div className="card-section">
      <div className="card-section__title">{title}</div>
      <div className="card-section__body">
        {numbers.map((number, index) => {
          const selected = highlightedNumbers?.includes(number);
          return (
            <div
              key={index}
              className={'card-section__item' + (selected ? ' card-section__item--selected' : '')}
            >
              <div className="card-section__text">{number}</div>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

Card.Numbers = Numbers;

const NoWin = () => (
  <div className="prize prize--empty">
    <span className="prize__text">No Win!</span>
  </div>
);

Card.NoWin = NoWin;

const Prize = ({ matches, prize }: { matches: number; prize: bigint | null }) => (
  <div className="prize">
    <div className="prize__title">You Won!</div>
    {prize !== null ? (
      <div className="prize__count">
        <div className="prize__count-text">
          Prize: {formatMoney(prize)}
          <span className="prize__line prize__line--left"></span>
          <span className="prize__line prize__line--right"></span>
        </div>
      </div>
    ) : null}
    <div className="prize__match">Matches: {matches}</div>
  </div>
);

Card.Prize = Prize;

export default Card;
