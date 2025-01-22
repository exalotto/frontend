'use client';

import { useEffect, useState } from 'react';
import { Col, Form, Row } from 'react-bootstrap';

import type { Contract, Web3 } from 'web3';

import { useWeb3React } from '@web3-react/core';

import { BigButton } from '@/components/BigButton';
import { useModals } from '@/components/Modals';
import { divideBigInts, formatBigNumber, useAsyncEffect } from '@/components/Utilities';

import DaiPermit from '@/components/DaiPermit.json';
import ERC20 from '@/components/ERC20.json';
import TokenSale from '@/components/TokenSale.json';

// 1 EXL in wei, i.e. 1e18.
const DECIMALS = 1000000000000000000n;

// Total EXL supply in EXL-wei (1e27).
const TOTAL_SUPPLY = 1000000000000000000000000000n;

const ONE_DAY_IN_SECONDS = 60 * 60 * 24;

async function signDaiPermit(web3: Web3, ico: Contract<typeof TokenSale.abi>, signer: string) {
  const currencyTokenAddress = (await ico.methods.currencyToken().call()) as string;
  const currencyToken = new web3.eth.Contract(ERC20.abi, currencyTokenAddress);
  const permit = new web3.eth.Contract(DaiPermit.abi, currencyTokenAddress);
  const domain = {
    name: '' + (await currencyToken.methods.name().call()),
    version: '1',
    verifyingContract: currencyToken.options.address!,
    salt: web3.utils.padLeft(web3.utils.toBigInt(await web3.eth.getChainId()), 64),
  };
  const nonce = web3.utils.toBigInt(await permit.methods.getNonce(signer).call());
  const { timestamp } = await web3.eth.getBlock();
  const expiry = Number(timestamp) + ONE_DAY_IN_SECONDS;
  const message = {
    holder: signer,
    spender: ico.options.address!,
    nonce: nonce.toString(10),
    expiry,
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
  const signature = await web3.eth.signTypedData(signer, typedData);
  const r = signature.slice(0, 66);
  const s = '0x' + signature.slice(66, 130);
  const v = parseInt(signature.slice(130, 132), 16);
  return { nonce, expiry, r, s, v };
}

const FormContent = ({ ico }: { ico: Contract<typeof TokenSale.abi> }) => {
  const { library, account } = useWeb3React<Web3>();
  const web3 = library!;
  const fromWei = (value: bigint) => web3.utils.fromWei(value, 'ether');
  const toWei = (value: string | number) => web3.utils.toBigInt(web3.utils.toWei(value, 'ether'));
  const [price, setPrice] = useState<bigint | null>(null);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [saleOpen, setSaleOpen] = useState(false);
  const [daiText, setDaiText] = useState('');
  const [, setDaiAmount] = useState(0n);
  const [exlText, setExlText] = useState('0');
  const [exlAmount, setExlAmount] = useState(0n);
  const [shareText, setShareText] = useState('0');
  const [, setShare] = useState(0);
  const { showModal } = useModals();
  const updateDai = (daiText: string) => {
    setDaiText(daiText);
    const daiAmount = toWei(daiText);
    setDaiAmount(daiAmount);
    if (price) {
      const exlAmount = (daiAmount * DECIMALS) / price;
      setExlText(fromWei(exlAmount));
      setExlAmount(exlAmount);
      const share = divideBigInts(exlAmount, TOTAL_SUPPLY);
      setShareText('' + share * 100);
      setShare(share);
    } else {
      setExlText('');
      setExlAmount(0n);
      setShareText('');
      setShare(0);
    }
  };
  const updateExl = (exlText: string) => {
    setExlText(exlText);
    const exlAmount = toWei(exlText);
    setExlAmount(exlAmount);
    if (price) {
      const daiAmount = (exlAmount * price) / DECIMALS;
      setDaiText(fromWei(daiAmount));
      setDaiAmount(daiAmount);
    } else {
      setDaiText('');
      setDaiAmount(0n);
    }
    const share = divideBigInts(exlAmount, TOTAL_SUPPLY);
    setShareText('' + share * 100);
    setShare(share);
  };
  const updateShare = (shareText: string) => {
    setShareText(shareText);
    const share = parseFloat(shareText) / 100;
    setShare(share);
    const exlAmount = toWei(share) * web3.utils.toBigInt(fromWei(TOTAL_SUPPLY));
    setExlText(fromWei(exlAmount));
    setExlAmount(exlAmount);
    if (price) {
      const daiAmount = (exlAmount * price) / DECIMALS;
      setDaiText(fromWei(daiAmount));
      setDaiAmount(daiAmount);
    } else {
      setDaiText('');
      setDaiAmount(0n);
    }
  };
  useAsyncEffect(async () => {
    const price = web3.utils.toBigInt(await ico.methods.price().call());
    setPrice(price);
    setSaleOpen(await ico.methods.isOpen().call());
  }, [web3, ico]);
  useAsyncEffect(async () => {
    if (account) {
      setBalance(web3.utils.toBigInt(await ico.methods.balanceOf(account).call()));
    } else {
      setBalance(null);
    }
  }, [web3, account, ico]);
  useEffect(() => {
    updateShare('1');
    // eslint-disable-next-line
  }, [web3, price]);
  return (
    <Form
      className="mb-1"
      onSubmit={async e => {
        e.preventDefault();
        if (!(e.target as HTMLFormElement).checkValidity()) {
          return;
        }
        if (account) {
          const { nonce, expiry, r, s, v } = await signDaiPermit(web3, ico, account);
          await ico.methods
            .purchaseWithDai(exlAmount, nonce, expiry, v, r, s)
            .send({ from: account });
        } else {
          showModal('wallet');
        }
      }}
    >
      <Form.Group as={Row} className="mx-sm-3 mb-3">
        <Form.Label column sm={3}>
          Current EXL price:
        </Form.Label>
        <Col>
          <Form.Control
            type="static"
            disabled
            value={price ? `${formatBigNumber(web3, price)} Dai` : ''}
          />
        </Col>
      </Form.Group>
      {balance !== null ? (
        <Form.Group as={Row} className="mx-sm-3 mb-3">
          <Form.Label column sm={3}>
            Your EXL balance:
          </Form.Label>
          <Col>
            <Form.Control
              type="static"
              disabled
              value={balance !== null ? `${formatBigNumber(web3, balance)} EXL` : ''}
            />
          </Col>
        </Form.Group>
      ) : null}
      <Row className="mb-4">
        <Form.Group as={Col} className="mx-sm-3">
          <Form.Label>Dai</Form.Label>
          <Form.Control
            type="text"
            disabled={price === null}
            required
            pattern="[0-9]*(\.[0-9]*)?"
            value={daiText}
            onChange={({ target }) => updateDai(target.value)}
          />
        </Form.Group>
        <Form.Group as={Col} className="mx-sm-3">
          <Form.Label>EXL</Form.Label>
          <Form.Control
            type="text"
            disabled={price === null}
            pattern="[0-9]*(\.[0-9]*)?"
            value={exlText}
            onChange={({ target }) => updateExl(target.value)}
          />
        </Form.Group>
        <Form.Group as={Col} className="mx-sm-3">
          <Form.Label>Share (%)</Form.Label>
          <Form.Control
            type="text"
            disabled={price === null}
            pattern="[0-9]*(\.[0-9]*)?"
            value={shareText}
            onChange={({ target }) => updateShare(target.value)}
          />
        </Form.Group>
      </Row>
      <Row>
        <Form.Group as={Col} className="mx-sm-3">
          <BigButton type="submit" disabled={!saleOpen} className="mb-4">
            Buy EXL
          </BigButton>
        </Form.Group>
        <Form.Group as={Col} className="mx-sm-3">
          <BigButton
            type="button"
            disabled={saleOpen || !balance}
            className="mb-4"
            onClick={async () => {
              if (account) {
                await ico.methods.withdrawAll().send({ from: account });
              } else {
                showModal('wallet');
              }
            }}
          >
            Redeem EXL
          </BigButton>
        </Form.Group>
      </Row>
    </Form>
  );
};

export const ICOForm = () => {
  const context = useWeb3React();
  const [ico, setICO] = useState(null);
  useEffect(() => {
    if (context.active && context.library) {
      setICO(new context.library.eth.Contract(TokenSale.abi, process.env.NEXT_PUBLIC_ICO_ADDRESS));
    } else {
      setICO(null);
    }
  }, [context, context.active, context.library]);
  if (ico) {
    return <FormContent ico={ico} />;
  } else {
    return null;
  }
};
