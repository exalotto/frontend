'use client';

import { useState } from 'react';

import { useWeb3React } from '@web3-react/core';

import Card from '@/components/Cards';
import { Lottery, Ticket } from '@/components/Lottery';
import { useLottery } from '@/components/LotteryContext';
import { SectionTitle } from '@/components/SectionTitle';
import { useAsyncEffect } from '@/components/Utilities';

const Winnings = ({ ticket, prize }: { ticket: Ticket; prize: bigint }) => {
  if (!prize) {
    return <Card.NoWin />;
  }
  const matches = ticket
    .draw!.numbers.map(number => ticket.numbers.includes(number))
    .reduce((count, match) => count + (match ? 1 : 0), 0);
  return <Card.Prize matches={matches} prize={prize.toString()} />;
};

const TicketCard = ({ lottery, ticket }: { lottery: Lottery; ticket: Ticket }) => {
  const { account } = useWeb3React();
  const [prize, setPrize] = useState<bigint | null>(null);
  const [withdrawn, setWithdrawn] = useState(false);
  useAsyncEffect(async () => {
    if (ticket.draw) {
      const data = await lottery.getExtendedTicket(ticket);
      setPrize(lottery.web3.utils.toBigInt(data.prize));
      setWithdrawn(data.withdrawBlockNumber !== 0);
    }
  }, [lottery, ticket.draw, ticket.id]);
  return (
    <Card
      date={ticket.date}
      onAction={prize ? () => lottery.withdrawPrize(ticket.id, account!) : null}
      actionTitle={withdrawn ? 'Withdrawn' : 'Withdraw'}
      actionEnabled={!withdrawn}
    >
      {ticket.txHash ? (
        <Card.Section title="Transaction">
          <a
            href={`https://${process.env.NEXT_PUBLIC_BLOCK_EXPLORER}/tx/${ticket.txHash}`}
            target="_blank"
            rel="noreferrer"
          >
            {ticket.txHash.substring(0, 22)}&hellip;
          </a>
        </Card.Section>
      ) : null}
      <Card.Numbers
        title="Your Numbers"
        numbers={ticket.numbers}
        highlightedNumbers={ticket.draw?.numbers}
      />
      {ticket.draw ? (
        <Card.Numbers
          title="Drawn Numbers"
          numbers={ticket.draw.numbers}
          highlightedNumbers={ticket.numbers}
        />
      ) : null}
      {ticket.draw && prize ? <Winnings ticket={ticket} prize={prize} /> : null}
    </Card>
  );
};

const TicketList = ({ lottery, account }: { lottery: Lottery; account: string }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  useAsyncEffect(async () => {
    const ids = (await lottery.getTicketIds(account)).sort((id1, id2) => id2 - id1);
    setTickets(await Promise.all(ids.map(id => lottery.getTicket(id))));
  }, [account, lottery]);
  return (
    <section className="draws d-flex justify-content-start align-items-center flex-column flex-lg-row align-items-lg-start">
      {tickets.map((ticket, index) => (
        <TicketCard key={index} lottery={lottery} ticket={ticket} />
      ))}
    </section>
  );
};

export const MyTickets = () => {
  const { context, lottery } = useLottery();
  return (
    <section className="past-draws">
      <div className="container">
        <SectionTitle title="My Tickets" />
        {context?.account ? (
          <TicketList lottery={lottery!} account={context.account} />
        ) : (
          <article>
            <p className="past-draws__descr">Please connect your wallet.</p>
          </article>
        )}
      </div>
    </section>
  );
};
