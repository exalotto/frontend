import type { PropsWithChildren } from 'react';

import { WalletModal } from './Connection';
import { MessageModal, ModalContainer } from './Modals';
import { DrawModal } from './PastDraws';
import { PrivacyPolicyOverlay } from './PrivacyPolicyOverlay';

export const MainBody = ({ children }: PropsWithChildren) => (
  <div className="main-body">
    <ModalContainer>
      {children}
      <WalletModal />
      <DrawModal />
      <MessageModal />
      <PrivacyPolicyOverlay />
    </ModalContainer>
  </div>
);
