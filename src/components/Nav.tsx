import Link from 'next/link';
import ThemeToggle from './ThemeToggle';
import { Logo } from './Logo';

export default function Nav() {
  return (
    <nav>
      <Link href="/" className="nav-logo" aria-label="Democracy Distributed: Home">
        <Logo size={36} />
      </Link>
      <div className="nav-r">
        <div className="nav-links">
          <Link href="/about">About</Link>
          <Link href="/contribute">Contribute</Link>
        </div>
        <Link href="/browse" className="nav-cta">
          Explore →
        </Link>
        <ThemeToggle />
      </div>
    </nav>
  );
}
