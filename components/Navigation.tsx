'use client';

import type { PropsWithChildren } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useWeb3React } from '@web3-react/core';

import { MenuDropdown } from './Dropdowns';

const navigationMenuItems = [
  {
    caption: 'Home',
    target: '/',
    visible: 'always',
  },
  {
    caption: 'How to Play',
    target: '/howtoplay',
    visible: 'always',
  },
  {
    caption: 'My Tickets',
    target: '/tickets',
    visible: 'account',
  },
  {
    caption: 'Odds',
    target: '/odds',
    visible: 'always',
  },
  {
    caption: 'Whitepaper',
    target: '/whitepaper',
    visible: 'always',
  },
  {
    caption: 'ICO',
    target: '/ico',
    visible: 'never',
  },
  {
    caption: 'Partners',
    target: '/partners',
    visible: 'always',
  },
  {
    caption: 'Privacy Policy',
    target: '/pp',
    visible: 'never',
  },
];

const NavigationMenuItem = ({
  caption,
  target,
}: PropsWithChildren & {
  caption: string;
  target: string;
}) => {
  const pathname = usePathname();
  const active = pathname === target || pathname === target + '/';
  return (
    <li className={`top-menu__item ${active ? 'top-menu__item--active' : ''}`}>
      <Link href={target} className="top-menu__link">
        <span className="top-menu__text-el">{caption}</span>
        <span className="top-menu__line"></span>
      </Link>
    </li>
  );
};

export const NavigationMenu = () => {
  const { account } = useWeb3React();
  return (
    <div className="d-none d-lg-block">
      <ul className="top-menu">
        {navigationMenuItems
          .filter(({ visible }) => visible === 'always' || (visible === 'account' && account))
          .map(({ caption, target }, index) => (
            <NavigationMenuItem key={index} caption={caption} target={target} />
          ))}
      </ul>
    </div>
  );
};

const findCurrentCaption = (pathname: string) => {
  for (const item of navigationMenuItems) {
    if (pathname === item.target) {
      return item.caption;
    }
  }
  return '';
};

export const DropdownNavigationMenu = () => {
  const pathname = usePathname();
  const { account } = useWeb3React();
  return (
    <MenuDropdown text={findCurrentCaption(pathname)}>
      {navigationMenuItems
        .filter(({ visible }) => visible === 'always' || (account && visible === 'account'))
        .map(({ caption, target }, index) => (
          <MenuDropdown.Item key={index} text={caption} target={target} />
        ))}
    </MenuDropdown>
  );
};
