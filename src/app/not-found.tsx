import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', padding: '40px 24px', textAlign: 'center',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <span style={{
        fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '0.25em',
        textTransform: 'uppercase', color: 'var(--amber, #e8a020)', marginBottom: 20,
      }}>
        404 · Not found
      </span>

      <h1 style={{
        fontFamily: "'Playfair Display', serif", fontSize: 'clamp(28px,5vw,48px)',
        fontWeight: 900, color: 'var(--th, #fff)', lineHeight: 1.15, marginBottom: 16,
        maxWidth: 560,
      }}>
        This record doesn&apos;t exist — <em style={{ fontStyle: 'italic', color: 'var(--amber, #e8a020)' }}>yet.</em>
      </h1>

      <p style={{ fontSize: 15, color: 'var(--tm, #8896b3)', maxWidth: 400, lineHeight: 1.7, marginBottom: 36 }}>
        The page you&apos;re looking for hasn&apos;t been linked or may have moved. You could be the one to add it.
      </p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link
          href="/"
          style={{
            fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: '0.08em',
            textTransform: 'uppercase', background: 'var(--amber, #e8a020)', color: '#0c1428',
            padding: '10px 22px', borderRadius: 3, textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          Explore the data →
        </Link>
        <Link
          href="/contribute"
          style={{
            fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: 'var(--amber, #e8a020)',
            border: '1px solid rgba(232,160,32,.35)', padding: '10px 22px',
            borderRadius: 3, textDecoration: 'none',
          }}
        >
          Contribute a record
        </Link>
      </div>
    </div>
  );
}
