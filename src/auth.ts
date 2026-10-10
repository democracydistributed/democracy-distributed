import NextAuth from 'next-auth';

// Corteza's OAuth2 endpoints live under /auth, a separate mount from the /api
// gateway the rest of the app uses (confirmed via /config.js — see
// Claude Skills/CORTEZA_AUTH_SKILL_v1.md for how these were found).
const CORTEZA_AUTH_BASE = 'https://app.democracydistributed.com/auth';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    {
      id: 'corteza',
      name: 'Democracy Distributed',
      type: 'oauth',
      authorization: {
        url: `${CORTEZA_AUTH_BASE}/oauth2/authorize`,
        params: { scope: 'profile api' },
      },
      token: `${CORTEZA_AUTH_BASE}/oauth2/token`,
      // Corteza embeds the user's profile (name, email, handle, roles, ...)
      // directly in the token response rather than requiring a separate
      // userinfo call, so we just hand the token response back as-is.
      userinfo: {
        url: `${CORTEZA_AUTH_BASE}/oauth2/userinfo`,
        async request({ tokens }: { tokens: Record<string, unknown> }) {
          return tokens;
        },
      },
      clientId: process.env.CORTEZA_CLIENT_ID,
      clientSecret: process.env.CORTEZA_CLIENT_SECRET,
      checks: ['state'],
      profile(profile) {
        return {
          id: profile.sub as string,
          name: profile.name as string | undefined,
          email: profile.email as string | undefined,
        };
      },
    },
  ],
  callbacks: {
    // Only stores the tokens at first login. Renewing an expired Corteza token is
    // intentionally NOT done here — this callback also runs while pages render,
    // where the renewed cookie can't be saved. Renewal lives in
    // getWriteIdentity() in src/lib/corteza-write.ts.
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }
      return token;
    },
    // The Corteza access token deliberately stays in the encrypted JWT cookie
    // only — never copied onto the session, which any script on the page can
    // read. Server code that needs it reads it via getToken() (see
    // src/lib/corteza-write.ts).
    async session({ session }) {
      return session;
    },
  },
});
