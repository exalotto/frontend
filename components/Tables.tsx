import type { PropsWithChildren } from 'react';

const Table = ({ children }: PropsWithChildren) => <div className="main-table">{children}</div>;

const Header = ({ children }: PropsWithChildren) => (
  <div className="main-table__head">{children}</div>
);

Table.Header = Header;

const Body = ({ children }: PropsWithChildren) => (
  <div className="main-table__body">{children}</div>
);

Table.Body = Body;

const Row = ({ children }: PropsWithChildren) => <div className="main-table__row">{children}</div>;

Table.Row = Row;

const Cell = ({ className, children }: PropsWithChildren & { className?: string }) => (
  <div className="main-table__column">
    <span className={`main-table__text ${className}`}>{children}</span>
  </div>
);

Table.Cell = Cell;

export default Table;
