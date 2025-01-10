import Web3 from 'web3';
import type { Contract, EventLog } from 'web3';

import { abi as ControllerABI } from './Controller.json';
import { abi as CurrencyTokenABI } from './ERC20.json';
import { abi as DaiPermitABI } from './DaiPermit.json';
import { abi as ERC20PermitABI } from './IERC20Permit.json';
import { abi as LotteryABI } from './Lottery.json';
import { abi as GovernanceTokenABI } from './Token.json';

export type LotteryContract = Contract<typeof LotteryABI>;
export type CurrencyTokenContract = Contract<typeof CurrencyTokenABI>;
export type ControllerContract = Contract<typeof ControllerABI>;
export type GovernanceTokenContract = Contract<typeof GovernanceTokenABI>;

export interface Options {
  web3?: Web3;
  provider?: string;
  address: string;
  defaultSigner?: string;
}

// Fetches a value lazily and asynchronously. The actual fetching is performed by a user-provided
// function (the `factory` argument in the constructor). Upon success the value is cached and reused
// in all subsequent lookups, while if the user-provided function fails it's retried at every fetch.
// As a result, the user-provided function must be repeatable because it may be called many times if
// it keeps erroring out. Invocations will stop at the first success.
class AsyncValue<Value> {
  private readonly _factory: () => Promise<Value>;
  private _running: boolean = false;
  private _value: Value | null = null;
  private _callbacks: [(value: Value) => void, (error: Error) => void][] = [];

  public constructor(factory: () => Promise<Value>) {
    this._factory = factory;
  }

  private async _runFactory(): Promise<void> {
    if (this._running) {
      return;
    }
    this._running = true;
    let callbacks: (() => void)[];
    try {
      const value = await this._factory();
      this._value = value;
      callbacks = this._callbacks.map(
        ([resolve]) =>
          () =>
            resolve(value),
      );
      this._callbacks = [];
    } catch (error) {
      this._value = null;
      callbacks = this._callbacks.map(
        ([, reject]) =>
          () =>
            reject(error as Error),
      );
      this._callbacks = [];
    } finally {
      this._running = false;
    }
    callbacks.forEach(callback => callback());
  }

  // Retrieves the value, calling the user-provided factory function if necessary.
  public get(): Promise<Value> {
    if (this._value !== null) {
      return Promise.resolve(this._value);
    } else {
      return new Promise<Value>((resolve, reject) => {
        this._callbacks.push([resolve, reject]);
        this._runFactory();
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
  transactionIndex: bigint;
  blockHash: string;
  blockNumber: bigint;
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

  // The ERC-2612 extension ABI (for signed approvals of ERC-20 spending).
  public static readonly ERC2612_ABI = ERC20PermitABI;

  // The custom extension ABI used for approval signatures in Dai. It's similar to ERC-2612 but
  // non-compliant, and needs ad-hoc handling.
  public static readonly DAI_PERMIT_ABI = DaiPermitABI;

  // The ABI of the lottery smartcontract, allowing the user to buy tickets, trigger drawings,
  // withdraw prizes, etc.
  public static readonly ABI = LotteryABI;

  // The ABI of the `TimelockController` used in the lottery governance. This is also the treasury
  // where all revenue is stashed and made available to partners and referrers for withdrawal.
  public static readonly CONTROLLER_ABI = ControllerABI;

  // The ABI of the EXL token, which is a superset of ERC-20.
  public static readonly GOVERNANCE_TOKEN_ABI = GovernanceTokenABI;

  public static readonly NULL_REFERRAL_CODE =
    '0x0000000000000000000000000000000000000000000000000000000000000000';

  private readonly _lotteryAddress: string;
  private readonly _web3: Web3;
  private readonly _defaultSigner: string | null;
  private readonly _lotteryContract: LotteryContract;
  private readonly _currencyTokenContract: AsyncValue<CurrencyTokenContract>;
  private readonly _controllerContract: AsyncValue<ControllerContract>;
  private readonly _governanceTokenContract: AsyncValue<GovernanceTokenContract>;

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
    this._currencyTokenContract = new AsyncValue<CurrencyTokenContract>(async () => {
      const address: string = await this._lotteryContract.methods.currencyToken().call();
      return new this._web3.eth.Contract(CurrencyTokenABI, address);
    });
    this._controllerContract = new AsyncValue<ControllerContract>(async () => {
      const address: string = await this._lotteryContract.methods.owner().call();
      return new this._web3.eth.Contract(ControllerABI, address);
    });
    this._governanceTokenContract = new AsyncValue<GovernanceTokenContract>(async () => {
      const controller = await this._controllerContract.get();
      const address: string = await controller.methods.token().call();
      return new this._web3.eth.Contract(GovernanceTokenABI, address);
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

  public get lottery(): LotteryContract {
    return this._lotteryContract;
  }

  public async getCurrencyToken(): Promise<CurrencyTokenContract> {
    return await this._currencyTokenContract.get();
  }

  public async getCurrencyTokenAddress(): Promise<string> {
    const contract = await this.getCurrencyToken();
    return contract.options.address!;
  }

  public async getController(): Promise<ControllerContract> {
    return await this._controllerContract.get();
  }

  public async getControllerAddress(): Promise<string> {
    const contract = await this.getController();
    return contract.options.address!;
  }

  public async getGovernanceToken(): Promise<GovernanceTokenContract> {
    return await this._governanceTokenContract.get();
  }

  public async getGovernanceTokenAddress(): Promise<string> {
    const contract = await this.getGovernanceToken();
    return contract.options.address!;
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
    subscription.on('data', () => {
      fetch();
    });
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

  public async _createTicketInternal(
    numbers: number[],
    from: string | undefined,
  ): Promise<Receipt> {
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

  public async createTicket(numbers: number[], account?: string): Promise<Receipt> {
    const from = account || this._defaultSigner || void 0;
    const price = (await this._lotteryContract.methods.getTicketPrice(numbers).call()) as bigint;
    const currencyToken = await this.getCurrencyToken();
    await currencyToken.methods.approve(this._lotteryAddress, price).send({ from });
    return this._createTicketInternal(numbers, from);
  }

  private async _signPermit(signer: string, value: bigint) {
    const currencyToken = await this.getCurrencyToken();
    const permit = new this._web3.eth.Contract(ERC20PermitABI, currencyToken.options.address!);
    const domain = {
      name: await currencyToken.methods.name().call(),
      version: '1',
      chainId: parseInt(process.env.NEXT_PUBLIC_NETWORK_ID!, 10),
      verifyingContract: currencyToken.options.address!,
    };
    const { timestamp } = await this._web3.eth.getBlock();
    const deadline = Number(timestamp) + 3600;
    const message = {
      owner: signer,
      spender: this._lotteryAddress,
      value: value.toString(10),
      nonce: ((await permit.methods.nonces(signer).call()) as bigint).toString(),
      deadline,
    };
    const typedData = {
      domain,
      message,
      primaryType: 'Permit',
      types: {
        EIP712Domain: [
          { name: 'name', type: 'string' },
          { name: 'version', type: 'string' },
          { name: 'chainId', type: 'uint256' },
          { name: 'verifyingContract', type: 'address' },
        ],
        Permit: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
      },
    };
    const signature = (await this._web3.currentProvider!.request({
      method: 'eth_signTypedData_v4',
      params: [signer, JSON.stringify(typedData)],
    })) as unknown as string;
    const r = signature.slice(0, 66);
    const s = '0x' + signature.slice(66, 130);
    const v = parseInt(signature.slice(130, 132), 16);
    return { deadline, r, s, v };
  }

  public async createTicketWithPermit(numbers: number[], account?: string): Promise<Receipt> {
    const from = account || this._defaultSigner;
    if (!from) {
      throw Error(
        'A signer is required to sign the permit; you must specify one either in the `account` argument or in the `defaultSigner` option at construction.',
      );
    }
    const price = (await this._lotteryContract.methods.getTicketPrice(numbers).call()) as bigint;
    const currencyToken = await this.getCurrencyToken();
    const allowance = (await currencyToken.methods
      .allowance(from, this._lotteryAddress)
      .call()) as bigint;
    if (allowance >= price) {
      return await this._createTicketInternal(numbers, account);
    }
    const { deadline, r, s, v } = await this._signPermit(from, price);
    if (numbers.length > 6) {
      return await this._lotteryContract.methods
        .createTicketWithPermit(Lottery.NULL_REFERRAL_CODE, numbers, price, deadline, v, r, s)
        .send({ from });
    } else {
      return await this._lotteryContract.methods
        .createTicket6WithPermit(Lottery.NULL_REFERRAL_CODE, numbers, price, deadline, v, r, s)
        .send({ from });
    }
  }

  private async _signDaiPermit(signer: string) {
    const currencyToken = await this.getCurrencyToken();
    const permit = new this._web3.eth.Contract(DaiPermitABI, currencyToken.options.address!);
    const domain = {
      name: await currencyToken.methods.name().call(),
      version: '1',
      chainId: parseInt(process.env.NEXT_PUBLIC_NETWORK_ID!, 10),
      verifyingContract: currencyToken.options.address!,
    };
    const nonce = (await permit.methods.getNonce(signer).call()) as bigint;
    const { timestamp } = await this._web3.eth.getBlock();
    const deadline = Number(timestamp) + 3600;
    const message = {
      holder: signer,
      spender: this._lotteryAddress,
      nonce: nonce.toString(),
      expiry: deadline,
      allowed: true,
    };
    const typedData = {
      domain,
      message,
      primaryType: 'Permit',
      types: {
        EIP712Domain: [
          { name: 'name', type: 'string' },
          { name: 'version', type: 'string' },
          { name: 'chainId', type: 'uint256' },
          { name: 'verifyingContract', type: 'address' },
        ],
        Permit: [
          { name: 'holder', type: 'address' },
          { name: 'spender', type: 'address' },
          { name: 'nonce', type: 'uint256' },
          { name: 'expiry', type: 'uint256' },
          { name: 'allowed', type: 'bool' },
        ],
      },
    };
    const signature = (await this._web3.currentProvider!.request({
      method: 'eth_signTypedData_v4',
      params: [signer, JSON.stringify(typedData)],
    })) as unknown as string;
    const r = signature.slice(0, 66);
    const s = '0x' + signature.slice(66, 130);
    const v = parseInt(signature.slice(130, 132), 16);
    return { nonce, deadline, r, s, v };
  }

  public async createTicketWithDaiPermit(numbers: number[], account?: string): Promise<Receipt> {
    const from = account || this._defaultSigner;
    if (!from) {
      throw Error(
        'A signer is required to sign the permit; you must specify one either in the `account` argument or in the `defaultSigner` option at construction.',
      );
    }
    const price = (await this._lotteryContract.methods.getTicketPrice(numbers).call()) as bigint;
    const currencyToken = await this.getCurrencyToken();
    const allowance = (await currencyToken.methods
      .allowance(from, this._lotteryAddress)
      .call()) as bigint;
    if (allowance >= price) {
      return await this._createTicketInternal(numbers, account);
    }
    const { nonce, deadline, r, s, v } = await this._signDaiPermit(from);
    if (numbers.length > 6) {
      return await this._lotteryContract.methods
        .createTicketWithDaiPermit(
          Lottery.NULL_REFERRAL_CODE,
          numbers,
          nonce,
          deadline,
          /*allowed=*/ true,
          v,
          r,
          s,
        )
        .send({ from });
    } else {
      return await this._lotteryContract.methods
        .createTicket6WithDaiPermit(
          Lottery.NULL_REFERRAL_CODE,
          numbers,
          nonce,
          deadline,
          /*allowed=*/ true,
          v,
          r,
          s,
        )
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
