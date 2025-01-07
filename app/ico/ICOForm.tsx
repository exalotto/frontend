'use client';

import { useEffect, useState } from 'react';
import { Col, Form, Row } from 'react-bootstrap';

import type { Contract, Web3 } from 'web3';

import { useWeb3React } from '@web3-react/core';

import { ModalContext } from '@/components/Modals';
import { divideBigInts, formatBigNumber, useAsyncEffect } from '@/components/Utilities';

import ICO from '@/components/ICO.json';

// 1 ETH in wei, i.e. 1e18.
const DECIMALS = BigInt('1000000000000000000');

// Total EXL supply in EXL-wei (1e27).
const TOTAL_SUPPLY = BigInt('1000000000000000000000000000');

const FormContent = ({ ico }: { ico: Contract<typeof ICO.abi> }) => {
  const { library, account } = useWeb3React<Web3>();
  const web3 = library!;
  const hundred = BigInt(100);
  const decimals = DECIMALS;
  const totalSupply = TOTAL_SUPPLY;
  const [price, setPrice] = useState<bigint | null>(null);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [saleOpen, setSaleOpen] = useState(false);
  const [ethText, setEthText] = useState('0');
  const [ethAmount, setEthAmount] = useState(BigInt(0));
  const [exlText, setElotText] = useState('0');
  const [exlAmount, setElotAmount] = useState(BigInt(0)); // eslint-disable-line no-unused-vars
  const [shareText, setShareText] = useState('0');
  const [share, setShare] = useState(0); // eslint-disable-line no-unused-vars
  const updateEth = (ethText: string) => {
    setEthText(ethText);
    const ethAmount = web3.utils.toBigInt(web3.utils.toWei(ethText, 'ether'));
    setEthAmount(ethAmount);
    const exlAmount = (ethAmount * decimals) / price!;
    setElotText(web3.utils.fromWei(exlAmount, 'ether'));
    setElotAmount(exlAmount);
    const share = (exlAmount * hundred * decimals) / totalSupply;
    setShareText('' + share);
    setShare(Number(share));
  };
  const updateElot = (exlText: string) => {
    setElotText(exlText);
    const exlAmount = web3.utils.toBigInt(web3.utils.toWei(exlText, 'ether'));
    const ethAmount = (exlAmount * price!) / decimals;
    setEthText(web3.utils.fromWei(ethAmount, 'ether'));
    setEthAmount(ethAmount);
    setElotAmount(exlAmount);
    const share = divideBigInts(exlAmount * hundred * decimals, totalSupply);
    setShareText('' + share);
    setShare(share);
  };
  const updateShare = (shareText: string) => {
    setShareText(shareText);
    let share = web3.utils.toBigInt(web3.utils.toWei(shareText, 'ether')) / hundred;
    if (share > decimals) {
      share = decimals;
    }
    const exlAmount = (totalSupply * share) / decimals;
    const ethAmount = (exlAmount * price!) / decimals;
    setEthText(web3.utils.fromWei(ethAmount, 'ether'));
    setEthAmount(ethAmount);
    setElotText(web3.utils.fromWei(exlAmount, 'ether'));
    setElotAmount(exlAmount);
    setShare(Number(share * hundred));
  };
  useAsyncEffect(async () => {
    const price = web3.utils.toBigInt(await ico.methods.price().call());
    setPrice(price);
    setSaleOpen(await ico.methods.isOpen().call());
  }, [web3, ico]);
  useAsyncEffect(async () => {
    if (account) {
      setBalance(web3.utils.toBigInt(await ico.methods.balance(account).call()));
    } else {
      setBalance(null);
    }
  }, [web3, account, ico]);
  useEffect(() => {
    if (price !== null) {
      updateShare('1');
    }
    // eslint-disable-next-line
  }, [price]);
  return (
    <ModalContext.Consumer>
      {({ showModal }) => (
        <Form
          className="mb-1"
          onSubmit={async e => {
            e.preventDefault();
            if (!e.target.checkValidity()) {
              return;
            }
            if (account) {
              await ico.methods.buy().send({
                from: account,
                value: '' + ethAmount,
              });
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
                value={price ? `${formatBigNumber(web3, price)} ETH` : ''}
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
              <Form.Label>ETH</Form.Label>
              <Form.Control
                type="text"
                disabled={price === null}
                required
                pattern="[0-9]*(\.[0-9]*)?"
                value={ethText}
                onChange={({ target }) => updateEth(target.value)}
              />
            </Form.Group>
            <Form.Group as={Col} className="mx-sm-3">
              <Form.Label>EXL</Form.Label>
              <Form.Control
                type="text"
                disabled={price === null}
                pattern="[0-9]*(\.[0-9]*)?"
                value={exlText}
                onChange={({ target }) => updateElot(target.value)}
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
              <button type="submit" disabled={!saleOpen} className="btn btn-details mb-4">
                <span className="btn-details__text">Buy EXL</span>
                <span className="btn-details__shadow"></span>
              </button>
            </Form.Group>
            <Form.Group as={Col} className="mx-sm-3">
              <button
                type="button"
                disabled={saleOpen || !balance}
                className="btn btn-details mb-4"
                onClick={async () => {
                  if (account) {
                    await ico.methods.claim().send({ from: account });
                  } else {
                    showModal('wallet');
                  }
                }}
              >
                <span className="btn-details__text">Redeem EXL</span>
                <span className="btn-details__shadow"></span>
              </button>
            </Form.Group>
          </Row>
        </Form>
      )}
    </ModalContext.Consumer>
  );
};

export const ICOForm = () => {
  const context = useWeb3React();
  const [ico, setICO] = useState(null);
  useEffect(() => {
    if (context.active && context.library) {
      setICO(new context.library.eth.Contract(ICO.abi, process.env.NEXT_PUBLIC_ICO_ADDRESS));
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
