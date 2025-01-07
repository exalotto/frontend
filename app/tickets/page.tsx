import { Header } from '@/components/Headers';
import { MainBody } from '@/components/MainBody';
import { MyTickets } from './MyTickets';

export default function Page() {
  return (
    <MainBody>
      <Header />
      <MyTickets />
    </MainBody>
  );
}
