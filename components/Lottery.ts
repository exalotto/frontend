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

const ONE_DAY_IN_SECONDS = 60 * 60 * 24;

// Specifies how spending approvals are made. Three modes are available:
//
// * `manual` means the lottery client will request two separate transactions, one to approve the
//   spending and one for the contract interaction;
// * `erc2612` means the lottery client will first ask for an ERC-2612 signature (with no gas cost)
//   and then perform the actual contract interaction;
// * `dai` means the lottery client will use the non-compliant signature system similar to ERC-2612
//   implemented in the Dai stablecoin (Dai signatures are slightly different from ERC-2612).
//
// Note that all ticket creation methods check for the available spending allowance first, and don't
// ask for further approval if the allowance already covers the price.
export type SpendingApprovalMode = 'manual' | 'eip2612' | 'dai';

export interface Options {
  web3?: Web3;
  provider?: string;
  lotteryAddress: string;
  defaultSigner?: string;
  defaultSpendingApprovalMode?: SpendingApprovalMode;
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

export interface DrawSettings {
  vrfSubscriptionId: string;
  vrfKeyHash: string;
  nativePayment?: boolean;
  signer?: string;
}

export interface Draw {
  date: Date;
  round: number;
  drawBlock: number;
  fulfillmentBlock: number;
  prizes: bigint[];
  stash: bigint;
  numbers: number[];
  totalCombinations: number;
  winners: number[];
}

export interface DrawExtended extends Draw {
  drawTxHash?: string;
  fulfillmentTxHash?: string;
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
  prize: bigint;
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
  private readonly _spendingApprovalMode: SpendingApprovalMode;
  private readonly _lotteryContract: LotteryContract;
  private readonly _currencyTokenContract: AsyncValue<CurrencyTokenContract>;
  private readonly _controllerContract: AsyncValue<ControllerContract>;
  private readonly _governanceTokenContract: AsyncValue<GovernanceTokenContract>;

  public constructor(options: Options) {
    if (!options.lotteryAddress) {
      throw Error('the `address` option is required');
    }
    if (!options.web3 && !options.provider) {
      throw Error('either a Web3 instance or a `provider` must be specified in the options');
    }
    this._lotteryAddress = options.lotteryAddress;
    if (options.web3) {
      this._web3 = options.web3;
    } else {
      this._web3 = new Web3(options.provider);
    }
    this._defaultSigner = options.defaultSigner || null;
    this._spendingApprovalMode = options.defaultSpendingApprovalMode || 'manual';
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

  public get contract(): LotteryContract {
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

  public async isOpen(): Promise<boolean> {
    return await this._lotteryContract.methods.isOpen().call();
  }

  public async getJackpot(): Promise<bigint> {
    return this._web3.utils.toBigInt(await this._lotteryContract.methods.getJackpot().call());
  }

  public async subscribeToJackpot(callback: (jackpot: bigint) => unknown) {
    const fetch = async () => callback(await this.getJackpot());
    const subscription = await this._web3.eth.subscribe('newBlockHeaders');
    subscription.on('data', () => {
      fetch();
    });
    fetch();
    return new LotterySubscription(subscription);
  }

  // TODO: referral code management.

  public async getBaseTicketPrice(): Promise<bigint> {
    return this._web3.utils.toBigInt(
      await this._lotteryContract.methods.getBaseTicketPrice().call(),
    );
  }

  public async getTicketPrice(numbers: number[]): Promise<bigint> {
    return this._web3.utils.toBigInt(
      await this._lotteryContract.methods.getTicketPrice(numbers).call(),
    );
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
    const price = this._web3.utils.toBigInt(
      await this._lotteryContract.methods.getTicketPrice(numbers).call(),
    );
    const currencyToken = await this.getCurrencyToken();
    const allowance = this._web3.utils.toBigInt(
      await currencyToken.methods.allowance(from, this._lotteryAddress).call(),
    );
    if (allowance < price) {
      await currencyToken.methods.approve(this._lotteryAddress, price).send({ from });
    }
    return this._createTicketInternal(numbers, from);
  }

  private async _signPermit(signer: string, value: bigint) {
    const currencyToken = await this.getCurrencyToken();
    const permit = new this._web3.eth.Contract(ERC20PermitABI, currencyToken.options.address!);
    const domain = {
      name: '' + (await currencyToken.methods.name().call()),
      version: '1',
      chainId: this._web3.utils.toBigInt(await this._web3.eth.getChainId()).toString(10),
      verifyingContract: currencyToken.options.address!,
    };
    const { timestamp } = await this._web3.eth.getBlock();
    const deadline = Number(timestamp) + ONE_DAY_IN_SECONDS;
    const message = {
      owner: signer,
      spender: this._lotteryAddress,
      value: value.toString(10),
      nonce: this._web3.utils.toBigInt(await permit.methods.nonces(signer).call()).toString(10),
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
    const signature = await this._web3.eth.signTypedData(signer, typedData);
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
    const price = this._web3.utils.toBigInt(
      await this._lotteryContract.methods.getTicketPrice(numbers).call(),
    );
    const currencyToken = await this.getCurrencyToken();
    const allowance = this._web3.utils.toBigInt(
      await currencyToken.methods.allowance(from, this._lotteryAddress).call(),
    );
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
      name: '' + (await currencyToken.methods.name().call()),
      version: '1',
      verifyingContract: currencyToken.options.address!,
      salt: this._web3.utils.padLeft(
        this._web3.utils.toBigInt(await this._web3.eth.getChainId()),
        64,
      ),
    };
    const nonce = this._web3.utils.toBigInt(await permit.methods.getNonce(signer).call());
    const { timestamp } = await this._web3.eth.getBlock();
    const deadline = Number(timestamp) + ONE_DAY_IN_SECONDS;
    const message = {
      holder: signer,
      spender: this._lotteryAddress,
      nonce: nonce.toString(10),
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
          { name: 'verifyingContract', type: 'address' },
          { name: 'salt', type: 'bytes32' },
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
    const signature = await this._web3.eth.signTypedData(signer, typedData);
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
    const price = this._web3.utils.toBigInt(
      await this._lotteryContract.methods.getTicketPrice(numbers).call(),
    );
    const currencyToken = await this.getCurrencyToken();
    const allowance = this._web3.utils.toBigInt(
      await currencyToken.methods.allowance(from, this._lotteryAddress).call(),
    );
    if (allowance >= price) {
      return await this._createTicketInternal(numbers, account);
    }
    const { nonce, deadline, r, s, v } = await this._signDaiPermit(from);
    if (numbers.length > 6) {
      return await this._lotteryContract.methods
        .createTicketWithDaiPermit(Lottery.NULL_REFERRAL_CODE, numbers, nonce, deadline, v, r, s)
        .send({ from });
    } else {
      return await this._lotteryContract.methods
        .createTicket6WithDaiPermit(Lottery.NULL_REFERRAL_CODE, numbers, nonce, deadline, v, r, s)
        .send({ from });
    }
  }

  // Creates a ticket using the default spending approval mode specified in the construction
  // options, or `manual` if none was specified.
  public createTicketAuto(numbers: number[], account?: string): Promise<Receipt> {
    switch (this._spendingApprovalMode) {
      case 'manual':
        return this.createTicket(numbers, account);
      case 'eip2612':
        return this.createTicketWithPermit(numbers, account);
      case 'dai':
        return this.createTicketWithDaiPermit(numbers, account);
    }
  }

  public async getCurrentRound(): Promise<number> {
    const round = this._web3.utils.toBigInt(
      await this._lotteryContract.methods.getCurrentRound().call(),
    );
    return Number(round);
  }

  public async getTicketIds(account: string): Promise<number[]> {
    const ids: never[] = await this._lotteryContract.methods.getTicketIds(account).call();
    return ids.map(id => Number(this._web3.utils.toBigInt(id)));
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
    const parsedRound = this._web3.utils.toNumber(round) as number;
    const [draw, timestamp, logs, logs6] = await Promise.all([
      (async () => {
        const currentRound = await this.getCurrentRound();
        return parsedRound < currentRound ? await this.getDrawData(parsedRound) : null;
      })(),
      (async () => {
        const { timestamp } = await this._web3.eth.getBlock(blockNumber);
        return this._web3.utils.toNumber(timestamp) as number;
      })(),
      this._lotteryContract.getPastEvents('Ticket' as never, {
        filter: { round, id },
        fromBlock: blockNumber,
        toBlock: blockNumber,
      }) as Promise<EventLog[]>,
      this._lotteryContract.getPastEvents('Ticket6' as never, {
        filter: { round, id },
        fromBlock: blockNumber,
        toBlock: blockNumber,
      }) as Promise<EventLog[]>,
    ]);
    const result: Ticket = {
      id: id,
      blockNumber: this._web3.utils.toNumber(blockNumber) as number,
      date: new Date(timestamp * 1000),
      round: parsedRound,
      draw: draw,
      player: player,
      numbers: numbers.map(number => this._web3.utils.toNumber(number) as number),
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
    return {
      ...ticket,
      prize: this._web3.utils.toBigInt(prize),
      withdrawBlockNumber: this._web3.utils.toNumber(withdrawBlockNumber) as number,
    };
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
    const nextDrawTime = this._web3.utils.toNumber(
      await this._lotteryContract.methods.getNextDrawTime().call(),
    ) as number;
    return new Date(nextDrawTime * 1000);
  }

  public async canDraw(): Promise<boolean> {
    const controller = await this._controllerContract.get();
    return controller.methods.canDraw().call();
  }

  public async draw(settings: DrawSettings): Promise<void> {
    const from = settings.signer || this._defaultSigner || void 0;
    const controller = await this._controllerContract.get();
    await controller.methods
      .draw(settings.vrfSubscriptionId, settings.vrfKeyHash, !!settings.nativePayment)
      .send({ from });
  }

  public async isWaitingForClosure(): Promise<boolean> {
    const controller = await this._controllerContract.get();
    return await controller.methods.waitingForClosure().call();
  }

  public async closeRound(signer?: string): Promise<void> {
    const from = signer || this._defaultSigner || void 0;
    const controller = await this._controllerContract.get();
    await controller.methods.closeRound().send({ from });
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
      date: new Date((this._web3.utils.toNumber(timestamp) as number) * 1000),
      round: round,
      drawBlock: this._web3.utils.toNumber(drawBlockNumber) as number,
      fulfillmentBlock: this._web3.utils.toNumber(closureBlockNumber) as number,
      prizes: prizes.map(prize => this._web3.utils.toBigInt(prize)),
      stash: this._web3.utils.toBigInt(stash),
      numbers: numbers.map(number => this._web3.utils.toNumber(number) as number),
      totalCombinations: this._web3.utils.toNumber(totalCombinations) as number,
      winners: winners.map(winners => this._web3.utils.toNumber(winners) as number),
    };
  }

  public async getExtendedDrawData(draw: Draw): Promise<DrawExtended> {
    const result: DrawExtended = { ...draw };
    const [drawResults, fulfillmentResults] = await Promise.all([
      this._lotteryContract.getPastEvents('VRFRequest' as never, {
        filter: { round: draw.round },
        fromBlock: draw.drawBlock,
        toBlock: draw.drawBlock,
      }) as Promise<EventLog[]>,
      this._lotteryContract.getPastEvents('Draw' as never, {
        filter: { round: draw.round },
        fromBlock: draw.fulfillmentBlock,
        toBlock: draw.fulfillmentBlock,
      }) as Promise<EventLog[]>,
    ]);
    if (drawResults.length > 0) {
      result.drawTxHash = drawResults[0].transactionHash;
    }
    if (fulfillmentResults.length > 0) {
      result.fulfillmentTxHash = fulfillmentResults[0].transactionHash;
    }
    return result;
  }

  public async getPartialDrawData(): Promise<Draw> {
    const {
      prizes,
      stash,
      totalCombinations,
      drawBlockNumber,
    }: {
      prizes: string[];
      stash: string;
      totalCombinations: string;
      drawBlockNumber: string;
      vrfRequestId: string;
    } = await this._lotteryContract.methods.getCurrentRoundData().call();
    const { timestamp } = await this._web3.eth.getBlock(drawBlockNumber);
    return {
      date: new Date((this._web3.utils.toNumber(timestamp) as number) * 1000),
      round: await this.getCurrentRound(),
      drawBlock: this._web3.utils.toNumber(drawBlockNumber) as number,
      fulfillmentBlock: 0,
      prizes: prizes.map(prize => this._web3.utils.toBigInt(prize)),
      stash: this._web3.utils.toBigInt(stash),
      numbers: [],
      totalCombinations: this._web3.utils.toNumber(totalCombinations) as number,
      winners: [],
    };
  }

  public async getExtendedPartialDrawData(draw: Draw): Promise<DrawExtended> {
    const result: DrawExtended = { ...draw };
    const results = (await this._lotteryContract.getPastEvents('VRFRequest' as never, {
      filter: { round: draw.round },
      fromBlock: draw.drawBlock,
      toBlock: draw.drawBlock,
    })) as EventLog[];
    if (results.length > 0) {
      result.drawTxHash = results[0].transactionHash;
    }
    return result;
  }

  public async withdrawPrize(ticketId: number, account?: string): Promise<void> {
    await this._lotteryContract.methods.withdrawPrize(ticketId).send({
      from: account || this._defaultSigner || void 0,
    });
  }
}
