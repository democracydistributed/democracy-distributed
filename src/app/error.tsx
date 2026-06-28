'use client';

import { useEffect } from 'react';
import { TORONTO_ORG_ID } from '@/lib/api';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[DD]', error);
  }, [error]);

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
        System error
      </span>

      <h1 style={{
        fontFamily: "'Playfair Display', serif", fontSize: 'clamp(28px,5vw,48px)',
        fontWeight: 900, color: 'var(--th, #fff)', lineHeight: 1.15, marginBottom: 16,
        maxWidth: 600,
      }}>
        Something didn&apos;t load.
      </h1>

      <p style={{ fontSize: 15, color: 'var(--tm, #8896b3)', maxWidth: 420, lineHeight: 1.7, marginBottom: 32 }}>
        There was a problem loading this page. The data service may be temporarily unavailable.
      </p>

      {error.message && (
        <pre style={{
          fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--red, #e05252)',
          background: 'rgba(224,82,82,0.08)', border: '1px solid rgba(224,82,82,0.18)',
          borderRadius: 6, padding: '10px 16px', marginBottom: 32,
          maxWidth: 480, whiteSpace: 'pre-wrap', textAlign: 'left',
        }}>
          {error.message}
        </pre>
      )}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={reset}
          style={{
            fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: '0.08em',
            textTransform: 'uppercase', background: 'var(--amber, #e8a020)', color: '#0c1428',
            padding: '10px 22px', borderRadius: 3, border: 'none', cursor: 'pointer',
            fontWeight: 500, transition: 'opacity .2s',
          }}
        >
          Try again
        </button>
        <a
          href={`/org/${TORONTO_ORG_ID}?org=toronto`}
          style={{
            fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: 'var(--amber, #e8a020)',
            border: '1px solid rgba(232,160,32,.35)', padding: '10px 22px',
            borderRadius: 3, textDecoration: 'none', transition: 'background .2s',
          }}
        >
          Load demo data
        </a>
      </div>

      {error.digest && (
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'var(--tm, #8896b3)', marginTop: 24, opacity: 0.5 }}>
          ref: {error.digest}
        </p>
      )}
    </div>
  );
}
