'use client';

import { useEffect, useState } from 'react';
import { Col, Form, Row } from 'react-bootstrap';

import type { Contract, Web3 } from 'web3';

import { useWeb3React } from '@web3-react/core';

import { ModalContext } from '@/components/Modals';
import { divideBigInts, formatBigNumber, useAsyncEffect } from '@/components/Utilities';

import ICO from '@/components/ICO.json';

// 1 EXL in wei, i.e. 1e18.
const DECIMALS = 1000000000000000000n;

// Total EXL supply in EXL-wei (1e27).
const TOTAL_SUPPLY = 1000000000000000000000000000n;

const FormContent = ({ ico }: { ico: Contract<typeof ICO.abi> }) => {
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
              await ico.methods.buyTokens(exlAmount).send({ from: account });
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
                    await ico.methods.withdrawAll().send({ from: account });
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
