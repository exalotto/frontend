'use client';

import { useState } from 'react';

import { Container } from 'react-bootstrap';

import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

import { Dropdown } from './Dropdowns';
import { SectionTitle } from './SectionTitle';
import Table from './Tables';

import { range, choose, divideBigInts } from './Utilities';

export const OddsCalculator = () => {
  const [playedNumbers, setPlayedNumbers] = useState<number>(6);
  const calculateInverse = (k: number, i: number) => {
    const inverse = divideBigInts(choose(90, k), choose(6, i) * choose(84, k - i));
    return Math.round(inverse * 100) / 100;
  };
  const calculateTotalInverse = (k: number) => {
    const inverse =
      1 / [6, 5, 4, 3, 2].map(i => 1 / calculateInverse(k, i)).reduce((a, b) => a + b, 0);
    return Math.round(inverse * 100) / 100;
  };
  return (
    <section className="odds">
      <Container>
        <SectionTitle title="Odds Calculator" />
        <div className="probability">
          <div className="probability__header">
            <div className="probability__top">
              <div className="probability__top-shape">
                <div className="probability__top-title">Probability of winning by playing</div>
                <Dropdown
                  variant="secondary"
                  text={'' + playedNumbers}
                  onSelect={key => setPlayedNumbers(parseInt(key || '', 10))}
                >
                  {range(15).map((_combinations, index: number) => (
                    <Dropdown.Item
                      key={index}
                      text={'' + (index + 6)}
                      active={index + 6 === playedNumbers}
                      eventKey={index + 6}
                    />
                  ))}
                </Dropdown>
                <div className="probability__top-title">numbers</div>
              </div>
            </div>
          </div>
          <div className="probability__table">
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.Cell>Matches</Table.Cell>
                  <Table.Cell>Probability</Table.Cell>
                  <Table.Cell>Calculation</Table.Cell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {[6, 5, 4, 3, 2].map(i => (
                  <Table.Row key={i}>
                    <Table.Cell>{i}</Table.Cell>
                    <Table.Cell className="main-table__text--blue">
                      1 : {calculateInverse(playedNumbers, i)}
                    </Table.Cell>
                    <Table.Cell>
                      <InlineMath
                        math={`
                        \\frac{
                          {6 \\choose ${i}}
                          \\cdot
                          {{90 - 6} \\choose {${playedNumbers} - ${i}}}
                        }{90 \\choose ${playedNumbers}} = \\frac{
                          ${choose(playedNumbers, i)}
                          \\cdot
                          ${choose(84, playedNumbers - i)}
                        }{${choose(90, playedNumbers)}}
                      `}
                      />
                    </Table.Cell>
                  </Table.Row>
                ))}
                <Table.Row>
                  <Table.Cell>2+</Table.Cell>
                  <Table.Cell className="main-table__text--blue">
                    1 : {calculateTotalInverse(playedNumbers)}
                  </Table.Cell>
                  <Table.Cell>
                    <InlineMath
                      math={`
                      \\sum_{i = 2}^{6}{
                        \\frac{
                          {6 \\choose i}
                          \\cdot
                          {{90 - 6} \\choose {${playedNumbers} - i}}
                        }{90 \\choose ${playedNumbers}}
                      }
                    `}
                    />
                  </Table.Cell>
                </Table.Row>
              </Table.Body>
            </Table>
          </div>
          <div className="probability__descr">
            In general, calculating the probability of matching <em>i</em> of the 6 drawn numbers by
            playing a <em>k</em>-number ticket is done using the following formula:
          </div>
          <div className="probability__expression">
            <BlockMath
              math={`
              \\frac{
                {6 \\choose i} \\cdot {{90 - 6} \\choose {k - i}}
              }{
                {90 \\choose k}
              }
            `}
            />
          </div>
          <div className="probability__descr">
            That is the probability of matching <em>exactly i</em> of the drawn numbers. For the
            probability of winning at least 1 prize (that is, matching <em>at least 2</em> of the
            drawn numbers, as per last row of the table) we need to add up all the above
            probabilities.
          </div>
        </div>
      </Container>
    </section>
  );
};
