'use client';

import { Header } from '@/components/Headers';
import { MainBody } from '@/components/MainBody';
import { PastDraws } from '@/components/PastDraws';

export default function Home() {
  return (
    <MainBody>
      <Header />
      <PastDraws />
    </MainBody>
  );
}
