import Link from 'next/link';
import ThemeToggle from './ThemeToggle';

export default function Nav() {
  return (
    <nav>
      <Link href="/" className="nav-logo">
        <span className="nav-logo-top">Democracy Distributed</span>
        <span className="nav-logo-sub">est. 2024</span>
      </Link>
      <div className="nav-r">
        <div className="nav-links">
          <a href="#">About</a>
          <a href="#">Contribute</a>
        </div>
        <Link href="/browse" className="nav-cta">
          Explore →
        </Link>
        <ThemeToggle />
      </div>
    </nav>
  );
}
