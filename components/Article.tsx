import type { PropsWithChildren } from 'react';

import { Container } from 'react-bootstrap';

import { MainBody } from './MainBody';
import { ArticleHeader } from './Headers';

import 'katex/dist/katex.min.css';
import '@/styles/prism.css';

export const Article = ({
  meta: { date } = {},
  children,
}: PropsWithChildren & { meta: { date?: string } }) => (
  <MainBody>
    <ArticleHeader />
    <section className="article">
      <Container>
        <div className="article__wrap d-flex justify-content-start align-items-start flex-column flex-lg-row">
          <aside className="article__sidebar">
            <div className="article__date">{date}</div>
          </aside>
          <article className="article__body text">{children}</article>
        </div>
      </Container>
    </section>
  </MainBody>
);

export const Whitepaper = ({
  meta: { date } = {},
  children,
}: PropsWithChildren & { meta: { date?: string } }) => (
  <MainBody>
    <ArticleHeader />
    <section className="whitepaper">
      <Container>
        <div className="whitepaper__wrap d-flex justify-content-start align-items-start flex-column flex-lg-row">
          <aside className="whitepaper__sidebar">
            <div className="whitepaper__date">{date}</div>
          </aside>
          <article className="whitepaper__body whitepaper-text">{children}</article>
        </div>
      </Container>
    </section>
  </MainBody>
);
