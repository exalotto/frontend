import { useEffect } from 'react';
import Web3 from 'web3';

export const COMBINATIONS = [
  1, // 6 numbers
  7, // 7 numbers
  28, // 8 numbers
  84, // 9 numbers
  210, // 10 numbers
  462, // 11 numbers
  924, // 12 numbers
  1716, // 13 numbers
  3003, // 14 numbers
  5005, // 15 numbers
  8008, // 16 numbers
  12376, // 17 numbers
  18564, // 18 numbers
  27132, // 19 numbers
  38760, // 20 numbers
];

// Abbreviated month names, used to format draw dates.
export const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function range(length: number): number[] {
  return Array.from({ length }, (_, i) => i);
}

function _choose(n: bigint, k: bigint): bigint {
  if (k > n) {
    return 0n;
  } else if (0n === k) {
    return 1n;
  } else if (k * 2n > n) {
    return _choose(n, n - k);
  } else {
    return (n * _choose(n - 1n, k - 1n)) / k;
  }
}

export function choose(n: number, k: number): bigint {
  return _choose(BigInt(n), BigInt(k));
}

export function divideBigInts(a: bigint, b: bigint): number {
  const q = a / b;
  const r = a % b;
  return Number(q) + Number(r) / Number(b);
}

export function formatBigNumber(web3: Web3, value: unknown): string {
  const number = web3.utils.toBigInt(value);
  const decimals = 1000000000000000000n;
  const integer = number / decimals;
  const fractional = number % decimals;
  return integer.toString(10) + '.' + web3.utils.padLeft(fractional.toString(10), 18);
}

export type EffectDestructor = () => void;

export function useAsyncEffect(
  callback: () => Promise<EffectDestructor | void>,
  dependencies?: unknown[],
): void {
  useEffect(() => {
    let destructor: EffectDestructor | null = null;
    let destroy = false;
    callback()
      .then(result => {
        if (result) {
          if (destroy) {
            result();
          } else {
            destructor = result;
          }
        } else {
          destructor = null;
          destroy = false;
        }
      })
      .catch(error => {
        destructor = null;
        destroy = false;
        console.error(error);
      });
    return () => {
      if (destructor) {
        destructor();
      } else {
        destroy = true;
      }
    };
  }, dependencies); // eslint-disable-line react-hooks/exhaustive-deps
}
