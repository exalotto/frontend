import { Header } from '@/components/Headers';
import { MainBody } from '@/components/MainBody';
import { OddsCalculator } from './OddsCalculator';

export default function Page() {
  return (
    <MainBody>
      <Header />
      <OddsCalculator />
    </MainBody>
  );
}
