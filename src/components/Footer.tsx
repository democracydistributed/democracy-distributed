import Link from 'next/link';

export default function Footer() {
  return (
    <footer>
      <div className="f-logo">Democracy Distributed</div>
      <div className="f-links">
        <Link href="/contribute">Contribute</Link>
        <Link href="/about">About</Link>
        <a href="https://democracy-distributed.gitbook.io/democracy-distributed-docs/" target="_blank" rel="noopener noreferrer">
          Documentation
        </a>
        <a href="https://www.linkedin.com/company/democracydistributed/" target="_blank" rel="noopener noreferrer">
          LinkedIn
        </a>
        <Link href="/account">Log in</Link>
      </div>
      <div className="f-copy">© {new Date().getFullYear()} Democracy Distributed</div>
    </footer>
  );
}
