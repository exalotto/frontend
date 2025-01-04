import Web3 from 'web3';
import type { Contract, EventLog } from 'web3';

import { abi as CurrencyTokenABI } from './IERC20.json';
import { abi as LotteryABI } from './Lottery.json';

export interface Options {
  web3?: Web3;
  provider?: string;
  address: string;
  defaultSigner?: string;
}

class AsyncValue<Value> {
  private _value: Value | null = null;
  private _error: Error | null = null;
  private _callbacks: [(value: Value) => void, (error: Error) => void][] = [];

  public constructor(factory: () => Promise<Value>) {
    factory()
      .then(value => {
        this._value = value;
        this._error = null;
        this._callbacks.forEach(([resolve]) => resolve(value));
        this._callbacks = [];
      })
      .catch(error => {
        this._value = null;
        this._error = error as Error;
        this._callbacks.forEach(([, reject]) => reject(error as Error));
        this._callbacks = [];
      });
  }

  public get(): Promise<Value> {
    if (this._value !== null) {
      return Promise.resolve(this._value);
    } else if (this._error !== null) {
      return Promise.reject(this._error);
    } else {
      return new Promise<Value>((resolve, reject) => {
        this._callbacks.push([resolve, reject]);
      });
    }
  }
}

export interface BaseSubscription {
  unsubscribe(): Promise<void>;
}

export class LotterySubscription<SubscriptionType extends BaseSubscription> {
  public constructor(private readonly _subscription: SubscriptionType) {}

  public cancel(): void {
    this._subscription.unsubscribe();
  }
}

export interface Receipt {
  transactionHash: string;
  transactionIndex: number;
  blockHash: string;
  blockNumber: number;
}

export interface Draw {
  date: Date;
  round: number;
  drawBlock: number;
  closureBlock: number;
  prizes: string[];
  stash: string;
  numbers: number[];
  totalCombinations: number;
  winners: number[];
}

export interface DrawExtended extends Draw {
  drawTxHash?: string;
  closureTxHash?: string;
}

export interface Ticket {
  id: number;
  blockNumber: number;
  txHash?: string;
  date: Date;
  round: number;
  draw: Draw | null;
  player: string;
  numbers: number[];
}

export interface TicketExtended extends Ticket {
  prize: string;
  withdrawBlockNumber: number;
}

export class Lottery {
  // The generic ERC-20 ABI, which we use for the currency token (e.g. Dai, not EXL).
  public static readonly ERC20_ABI = CurrencyTokenABI;

  // The ABI of the lottery smartcontract, allowing the user to buy tickets, trigger draws, and
  // withdraw prizes.
  public static readonly ABI = LotteryABI;

  public static readonly NULL_REFERRAL_CODE =
    '0x0000000000000000000000000000000000000000000000000000000000000000';

  private readonly _lotteryAddress: string;
  private readonly _web3: Web3;
  private readonly _defaultSigner: string | null;
  private readonly _lotteryContract: Contract<typeof LotteryABI>;
  private readonly _currencyTokenContract: AsyncValue<Contract<typeof CurrencyTokenABI>>;

  public constructor(options: Options) {
    if (!options.address) {
      throw Error('the `address` option is required');
    }
    if (!options.web3 && !options.provider) {
      throw Error('either a Web3 instance or a `provider` must be specified in the options');
    }
    this._lotteryAddress = options.address;
    if (options.web3) {
      this._web3 = options.web3;
    } else {
      this._web3 = new Web3(options.provider);
    }
    this._defaultSigner = options.defaultSigner || null;
    this._lotteryContract = new this._web3.eth.Contract(LotteryABI, this._lotteryAddress);
    this._currencyTokenContract = new AsyncValue<Contract<typeof CurrencyTokenABI>>(async () => {
      const address: string = await this._lotteryContract.methods.currencyToken().call();
      return new this._web3.eth.Contract(CurrencyTokenABI, address);
    });
  }

  public get lotteryAddress(): string {
    return this._lotteryAddress;
  }

  public get web3(): Web3 {
    return this._web3;
  }

  public get defaultSigner(): string | null {
    return this._defaultSigner;
  }

  public get lottery(): Contract<typeof LotteryABI> {
    return this._lotteryContract;
  }

  public async getCurrencyToken(): Promise<Contract<typeof CurrencyTokenABI>> {
    return await this._currencyTokenContract.get();
  }

  public async getCurrencyTokenAddress(): Promise<string> {
    const currencyToken = await this.getCurrencyToken();
    return currencyToken.options.address!;
  }

  public setProvider(p: string): void {
    this._web3.setProvider(p);
  }

  public async isPaused(): Promise<boolean> {
    return await this._lotteryContract.methods.paused().call();
  }

  public async getJackpot(): Promise<string> {
    return await this._lotteryContract.methods.getJackpot().call();
  }

  public async subscribeToJackpot(callback: (jackpot: string) => unknown) {
    const fetch = async () => callback(await this.getJackpot());
    const subscription = await this._web3.eth.subscribe('newBlockHeaders');
    fetch();
    return new LotterySubscription(subscription);
  }

  // TODO: referral code management.

  public async getBaseTicketPrice(): Promise<string> {
    return await this._lotteryContract.methods.getBaseTicketPrice().call();
  }

  public async getTicketPrice(numbers: number[]): Promise<string> {
    return await this._lotteryContract.methods.getTicketPrice(numbers).call();
  }

  public async createTicket(numbers: number[], account?: string): Promise<Receipt> {
    const from = account || this._defaultSigner || void 0;
    const price = await this._lotteryContract.methods.getTicketPrice(numbers).call();
    const currencyToken = await this.getCurrencyToken();
    await currencyToken.methods.approve(this._lotteryAddress, price).send({ from });
    if (numbers.length > 6) {
      return await this._lotteryContract.methods
        .createTicket(Lottery.NULL_REFERRAL_CODE, numbers)
        .send({ from });
    } else {
      return await this._lotteryContract.methods
        .createTicket6(Lottery.NULL_REFERRAL_CODE, numbers)
        .send({ from });
    }
  }

  public async getCurrentRound(): Promise<number> {
    const round = await this._lotteryContract.methods.getCurrentRound().call();
    return parseInt(round as unknown as string, 10);
  }

  public async getTicketIds(account: string): Promise<number[]> {
    const ids: string[] = await this._lotteryContract.methods.getTicketIds(account).call();
    return ids.map(id => parseInt(id, 10));
  }

  public async getTicket(id: number): Promise<Ticket> {
    const {
      player,
      round,
      blockNumber,
      numbers,
    }: {
      player: string;
      round: string;
      blockNumber: string;
      numbers: string[];
    } = await this._lotteryContract.methods.getTicket(id).call();
    const parsedRound = parseInt(round, 10);
    const [draw, timestamp, logs, logs6] = await Promise.all([
      (async () => {
        const currentRound = await this.getCurrentRound();
        return parsedRound < currentRound ? await this.getDrawData(parsedRound) : null;
      })(),
      (async () => {
        const { timestamp } = await this._web3.eth.getBlock(blockNumber);
        return timestamp;
      })(),
      this._lotteryContract.getPastEvents('Ticket', {
        filter: { round, id },
        fromBlock: blockNumber,
        toBlock: blockNumber,
      }) as Promise<EventLog[]>,
      this._lotteryContract.getPastEvents('Ticket6', {
        filter: { round, id },
        fromBlock: blockNumber,
        toBlock: blockNumber,
      }) as Promise<EventLog[]>,
    ]);
    const result: Ticket = {
      id: id,
      blockNumber: parseInt(blockNumber, 10),
      date: new Date(parseInt('' + timestamp, 10) * 1000),
      round: parsedRound,
      draw: draw,
      player: player,
      numbers: numbers.map(number => parseInt(number, 10)),
    };
    if (logs.length > 0) {
      result.txHash = logs[0].transactionHash;
    } else if (logs6.length > 0) {
      result.txHash = logs6[0].transactionHash;
    }
    return result;
  }

  public async getExtendedTicket(ticket: Ticket): Promise<TicketExtended> {
    const { prize, withdrawBlockNumber }: { prize: string; withdrawBlockNumber: string } =
      await this._lotteryContract.methods.getTicketPrize(ticket.id).call();
    return { ...ticket, prize, withdrawBlockNumber: parseInt(withdrawBlockNumber, 10) };
  }

  private static _sanitizeRoundNumber(currentRound: number, round?: number): number {
    if (!round && round !== 0) {
      round = currentRound;
    }
    if (round < 0) {
      round = currentRound + round;
    }
    if (round < 0) {
      throw new Error('invalid round number');
    }
    return round!;
  }

  private async sanitizeRoundNumber(round?: number): Promise<number> {
    const currentRound = await this.getCurrentRound();
    return Lottery._sanitizeRoundNumber(currentRound, round);
  }

  public async getTimeOfNextDraw(): Promise<Date> {
    const nextDrawTime = await this._lotteryContract.methods.getNextDrawTime().call();
    return new Date(parseInt(nextDrawTime as unknown as string, 10) * 1000);
  }

  public async getDrawData(round?: number): Promise<Draw> {
    round = await this.sanitizeRoundNumber(round);
    const {
      prizes,
      stash,
      totalCombinations,
      drawBlockNumber,
      numbers,
      closureBlockNumber,
      winners,
    }: {
      prizes: string[];
      stash: string;
      totalCombinations: string;
      drawBlockNumber: string;
      vrfRequestId: string;
      numbers: string[];
      closureBlockNumber: string;
      winners: string[];
    } = await this._lotteryContract.methods.getRoundData(round).call();
    const { timestamp } = await this._web3.eth.getBlock(drawBlockNumber);
    return {
      date: new Date(parseInt('' + timestamp, 10) * 1000),
      round: round,
      drawBlock: parseInt(drawBlockNumber, 10),
      closureBlock: parseInt(closureBlockNumber, 10),
      prizes: prizes,
      stash: stash,
      numbers: numbers.map(number => parseInt(number, 10)),
      totalCombinations: parseInt(totalCombinations, 10),
      winners: winners.map(winners => parseInt(winners, 10)),
    };
  }

  public async getExtendedDrawData(draw: Draw): Promise<DrawExtended> {
    const result: DrawExtended = { ...draw };
    const [drawResults, closureResults] = await Promise.all([
      this._lotteryContract.getPastEvents('VRFRequest', {
        filter: { round: draw.round },
        fromBlock: draw.drawBlock,
        toBlock: draw.drawBlock,
      }) as Promise<EventLog[]>,
      this._lotteryContract.getPastEvents('Draw', {
        filter: { round: draw.round },
        fromBlock: draw.closureBlock,
        toBlock: draw.closureBlock,
      }) as Promise<EventLog[]>,
    ]);
    if (drawResults.length > 0) {
      result.drawTxHash = drawResults[0].transactionHash;
    }
    if (closureResults.length > 0) {
      result.closureTxHash = closureResults[0].transactionHash;
    }
    return result;
  }

  public async withdrawPrize(ticketId: number, account?: string): Promise<void> {
    await this._lotteryContract.methods.withdrawPrize(ticketId).send({
      from: account || this._defaultSigner || void 0,
    });
  }
}
