import Link from 'next/link';

export default function Footer() {
  return (
    <footer>
      <div className="f-logo">Democracy Distributed</div>
      <div className="f-links">
        <Link href="/contribute">Contribute</Link>
        <Link href="/about">About</Link>
        <a href="https://www.linkedin.com/company/democracydistributed/" target="_blank" rel="noopener noreferrer">
          LinkedIn
        </a>
      </div>
      <div className="f-copy">© 2024 Democracy Distributed</div>
    </footer>
  );
}
