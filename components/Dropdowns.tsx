'use client';

import type { PropsWithChildren } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Dropdown as BSDropdown } from 'react-bootstrap';

export const Dropdown = ({
  variant,
  text,
  onSelect,
  children,
}: PropsWithChildren & {
  variant: string;
  text: string;
  onSelect: () => void;
}) => (
  <div className={`main-dropdown ${variant && `main-dropdown--${variant}`}`}>
    <BSDropdown className="main-dropdown__wrap" onSelect={onSelect}>
      <BSDropdown.Toggle as="button" className="btn" type="button">
        <span className="text-el">{text}</span>
        <span className="dropdown-toggle__arrow-start"></span>
        <span className="dropdown-toggle__arrow-end"></span>
        <span className="dropdown-toggle__clip"></span>
      </BSDropdown.Toggle>
      <BSDropdown.Menu as="ul">{children}</BSDropdown.Menu>
    </BSDropdown>
  </div>
);

const DropdownItem = ({
  text,
  active,
  ...rest
}: PropsWithChildren & {
  text: string;
  active: boolean;
}) => (
  <li>
    <BSDropdown.Item className={active ? 'dropdown-item--active' : ''} {...rest}>
      {text}
    </BSDropdown.Item>
  </li>
);

Dropdown.Item = DropdownItem;

export const MenuDropdown = ({ text, children }: PropsWithChildren & { text: string }) => (
  <div className="menu-dropdown">
    <BSDropdown className="menu-dropdown__wrap">
      <BSDropdown.Toggle as="button" className="btn" type="button">
        <span className="text-el">{text}</span>
        <span className="dropdown-toggle__clip"></span>
      </BSDropdown.Toggle>
      <BSDropdown.Menu as="ul">{children}</BSDropdown.Menu>
    </BSDropdown>
  </div>
);

const MenuItem = ({ text, target }: PropsWithChildren & { text: string; target: string }) => {
  const pathname = usePathname();
  const active = pathname === target;
  return (
    <li>
      <BSDropdown.Item as={Link} href={target} className={active ? 'dropdown-item--active' : ''}>
        <span className="text-el">{text}</span>
      </BSDropdown.Item>
    </li>
  );
};

MenuDropdown.Item = MenuItem;
