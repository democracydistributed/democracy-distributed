'use client';

import { useEffect, useState } from 'react';

/** Who's logged in, for forms that need to know: the member's display name, `null` if
 *  logged out, `undefined` while still checking. Reads /api/auth/session, which is safe
 *  to call from the browser — it never contains the Corteza token (see src/auth.ts). */
export function useMemberName(): string | null | undefined {
  const [name, setName] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    fetch('/api/auth/session', { cache: 'no-store' })
      .then((r) => r.json())
      .then((s) => {
        if (alive) setName(s?.user ? s.user.name || s.user.email || 'your account' : null);
      })
      .catch(() => {
        if (alive) setName(null);
      });
    return () => {
      alive = false;
    };
  }, []);

  return name;
}
