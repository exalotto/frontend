import Web3 from 'web3';
import type { AbiItem, Contract } from 'web3';

import { abi as LotteryABI } from './Lottery.json';

export interface Options {
  web3?: Web3;
  provider?: string;
  address: string;
  defaultSigner?: string;
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

export class Lottery {
  public static readonly ABI: AbiItem[] = LotteryABI as AbiItem[];

  public static readonly NULL_REFERRAL_CODE =
    '0x0000000000000000000000000000000000000000000000000000000000000000';

  private readonly _address: string;
  private readonly _web3: Web3;
  private readonly _contract: Contract<typeof LotteryABI>;
  private readonly _defaultSigner: string | null;

  public constructor(options: Options) {
    if (!options.address) {
      throw Error('the `address` option is required');
    }
    if (!options.web3 && !options.provider) {
      throw Error('either a Web3 instance or a `provider` must be specified in the options');
    }
    this._address = options.address;
    if (options.web3) {
      this._web3 = options.web3;
    } else {
      this._web3 = new Web3(options.provider);
    }
    this._contract = new this._web3.eth.Contract(Lottery.ABI, this._address);
    this._defaultSigner = options.defaultSigner || null;
  }

  public get address(): string {
    return this._address;
  }

  public get web3(): Web3 {
    return this._web3;
  }

  public get defaultSigner(): string | null {
    return this._defaultSigner;
  }

  public setProvider(p: string): void {
    this._web3.setProvider(p);
  }

  public async isPaused(): Promise<boolean> {
    return await this._contract.methods.paused().call();
  }

  public async getJackpot(): Promise<string> {
    return await this._contract.methods.getJackpot().call();
  }

  public async subscribeToJackpot(callback: (jackpot: string) => unknown) {
    const fetch = async () => callback(await this.getJackpot());
    const subscription = await this._web3.eth.subscribe('newBlockHeaders');
    fetch();
    return new LotterySubscription(subscription);
  }

  // TODO: referral code management.

  public async getBaseTicketPrice(): Promise<string> {
    return await this._contract.methods.getBaseTicketPrice().call();
  }

  public async getTicketPrice(numbers: number[]): Promise<string> {
    return await this._contract.methods.getTicketPrice(numbers).call();
  }

  // TODO
}
