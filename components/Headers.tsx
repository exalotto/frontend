import Image from 'next/image';
import Link from 'next/link';

import { Container } from 'react-bootstrap';

import logoImage from '@/images/logo.png';

import { ConnectButton } from './Connection';
import { Jackpot } from './Jackpot';
import { LuckyFrame } from './LuckyFrame';
import { DropdownNavigationMenu, NavigationMenu } from './Navigation';

const Logo = () => (
  <Link href="/" className="logo d-flex align-items-center">
    <Image src={logoImage} className="logo__img" alt="" />
    <span className="logo__text">
      <span className="logo__text-colored">Exa</span>Lotto
    </span>
  </Link>
);

const MainSection = () => (
  <div className="main-section d-flex justify-content-between flex-column flex-md-row">
    <Jackpot />
    <LuckyFrame />
  </div>
);

export const Header = () => (
  <div className="header-out">
    <Container>
      <div className="header d-flex justify-content-between align-items-start">
        <Logo />
        <NavigationMenu />
        <DropdownNavigationMenu />
        <ConnectButton />
      </div>
      <MainSection />
    </Container>
  </div>
);

export const ArticleHeader = () => (
  <div className="header-out header-out--article">
    <Container>
      <div className="header d-flex justify-content-between align-items-start">
        <Logo />
        <NavigationMenu />
        <DropdownNavigationMenu />
        <ConnectButton />
      </div>
    </Container>
  </div>
);
