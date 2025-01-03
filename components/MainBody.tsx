import type { PropsWithChildren } from 'react';

import { WalletModal } from './Connection';
import { ModalContainer } from './Modals';

export const MainBody = ({ children }: PropsWithChildren) => (
  <div className="main-body">
    <ModalContainer>
      {children}
      <WalletModal />
    </ModalContainer>
  </div>
);
