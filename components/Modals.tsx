'use client';

import type { PropsWithChildren, ReactNode } from 'react';
import React, { useContext, useEffect, useState } from 'react';

import { Modal as BSModal, type ModalProps } from 'react-bootstrap';

export interface ModalState {
  name?: string;
  params: unknown[];
  resolve(): void;
  reject(error: Error): void;
  visible: boolean;
  showModal<Params extends unknown[]>(name: string, ...params: Params): Promise<void>;
  hideModal(): void;
}

export interface ModalStateInstance<Params extends unknown[]> extends ModalState {
  params: Params;
}

type ModalStateMutator = (callback: (state: ModalState) => ModalState) => void;

function makeModalState(state: ModalState, setState: ModalStateMutator): ModalState {
  return {
    ...state,
    showModal: <Params extends unknown[]>(name: string, ...params: Params) =>
      new Promise<void>((resolve, reject) =>
        setState(state => ({ ...state, name, params, resolve, reject, visible: true })),
      ),
    hideModal: () => setState(state => ({ ...state, visible: false })),
  };
}

const initialModalState: ModalState = {
  params: [],
  resolve() {},
  reject() {},
  visible: false,
  async showModal() {},
  hideModal() {},
};

export const ModalContext = React.createContext<ModalState>(initialModalState);

export const useModals = () => useContext(ModalContext);

export const ModalContainer = ({ children }: PropsWithChildren) => {
  const [modalState, setModalState] = useState<ModalState>(initialModalState);
  useEffect(() => setModalState(state => makeModalState(state, setModalState)), []);
  return <ModalContext.Provider value={modalState}>{children}</ModalContext.Provider>;
};

export type TitleMutator = (newTitle: string) => void;

export type ModalConsumer<Params extends unknown[]> = (
  modalState: ModalStateInstance<Params>,
) => ReactNode;

export function RawModal({
  title,
  onClose,
  children,
  ...props
}: ModalProps & {
  title: string;
  onClose?: () => void;
}): ReactNode {
  return (
    <BSModal centered onHide={onClose} {...props}>
      {onClose ? <button type="button" className="btn btn-close-custom" onClick={onClose} /> : null}
      <div className="modal-shadow">
        <div className="modal-shadow__title">
          <div className="one-row-title">
            <div className="one-row-title__top-frame">
              <div className="one-row-title__top-frame-clip"></div>
            </div>
            <div className="one-row-title__frame">
              <div className="one-row-title__frame-in">
                <div className="one-row-title__main-text">{title}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="modal-clip">
          <div className="modal-content-wrapper">
            <div className="modal-inside">{children}</div>
            <div className="modal-clip__lines">
              <span className="modal-clip__line1"></span>
              <span className="modal-clip__line2"></span>
              <span className="modal-clip__line3"></span>
              <span className="modal-clip__line4"></span>
              <span className="modal-clip__line5"></span>
              <span className="modal-clip__line6"></span>
            </div>
          </div>
        </div>
        <div className="modal-behind"></div>
      </div>
    </BSModal>
  );
}

export function Modal<Params extends unknown[]>({
  name,
  title,
  children,
  className,
  resolveOnHide,
  deferTitle,
}: {
  name: string;
  title?: string;
  children: ModalConsumer<Params>;
  className?: string;
  resolveOnHide?: boolean;
  deferTitle?: boolean;
}): ReactNode {
  const [mutableTitle, setMutableTitle] = useState(title || '');
  const setTitle = (value: string) => {
    setTimeout(() => {
      setMutableTitle(value);
    }, 0);
  };
  return (
    <ModalContext.Consumer>
      {({
        name: currentName,
        params,
        resolve,
        reject,
        visible,
        showModal,
        hideModal,
      }: ModalState) => (
        <RawModal
          title={mutableTitle}
          onClose={() => {
            hideModal();
            if (resolveOnHide) {
              resolve();
            } else {
              reject(Error('user cancelled'));
            }
          }}
          show={visible && currentName === name}
          dialogClassName={className || ''}
        >
          {currentName !== name
            ? null
            : children({
                name,
                params: (deferTitle ? params.concat(setTitle) : params) as Params,
                resolve,
                reject,
                visible,
                showModal,
                hideModal,
              })}
        </RawModal>
      )}
    </ModalContext.Consumer>
  );
}

export type MessageModalParams = [string, string];
export type InternalMessageModalParams = [string, string, TitleMutator];

export const MessageModal = () => (
  <Modal name="message" className="modal-dialog-sm modal-wallet" resolveOnHide deferTitle>
    {({ params: [title, message, setTitle] }: ModalStateInstance<InternalMessageModalParams>) => {
      setTitle(title);
      return <p>{message.toString()}</p>;
    }}
  </Modal>
);
