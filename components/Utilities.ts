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

export function range(length: number): number[] {
  return Array.from({ length }, (_, i) => i);
}

function _choose(n: bigint, k: bigint): bigint {
  if (k > n) {
    return BigInt(0);
  } else if (BigInt(0) === k) {
    return BigInt(1);
  } else if (k * BigInt(2) > n) {
    return _choose(n, n - k);
  } else {
    return (n * _choose(n - BigInt(1), k - BigInt(1))) / k;
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
  const number = web3.utils.toBN(value);
  const decimals = web3.utils.toBN('1000000000000000000');
  const integer = number.div(decimals);
  const fractional = number.mod(decimals);
  return integer.toString(10) + '.' + fractional.toString(10, 18);
}
