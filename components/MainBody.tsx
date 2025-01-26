import type { PropsWithChildren } from 'react';

import { WalletModal, WrongNetworkMessage } from './Connection';
import { ReceiptModal } from './LuckyFrame';
import { MessageModal, ModalContainer } from './Modals';
import { DrawModal } from './PastDraws';
import { PrivacyPolicyOverlay } from './PrivacyPolicyOverlay';

export const MainBody = ({ children }: PropsWithChildren) => (
  <div className="main-body">
    <ModalContainer>
      {children}
      <WalletModal />
      <DrawModal />
      <ReceiptModal />
      <MessageModal />
      <PrivacyPolicyOverlay />
      <WrongNetworkMessage />
    </ModalContainer>
  </div>
);
