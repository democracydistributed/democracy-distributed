# Democracy Distributed

**See how organizations actually make decisions and spend money.**

Every tracked organization gets a public page with its finances drawn as an interactive Sankey diagram. Where the records connect, you can follow a dollar back to the project it funded, the vote that approved it, and the suggestion that started it.

<!-- TODO: screenshot or GIF of the Toronto Sankey -->

- Live: [democracydistributed.com](https://democracydistributed.com/) 
- Docs: [democracy-distributed.gitbook.io](https://democracy-distributed.gitbook.io/democracy-distributed-docs)

## How it works

```
Browser → Next.js app (this repo) → Corteza → PostgreSQL
```

[Corteza](https://cortezaproject.org/) is an open-source low-code platform that sits between the app and the database. It holds the data, the API, login, and permissions, and it's where data is imported in bulk and edited.

- **Reads** come from Corteza's Integration Gateway. The gateway can't be called directly from the browser, so browser-side reads go through our proxy at `/api/gateway`, and server-rendered pages call it directly.
- **Writes** (like suggestions) go to Corteza's REST API using the signed-in member's token, or a service account for anonymous visitors. See `src/lib/corteza-write.ts`.
- **Caching is off by default.** See `CACHING.md`.
- **The chart** is drawn with D3 in `SankeyChart.tsx`. Its graph-building logic is in `src/lib/sankey.ts`.

## Getting started

You'll need Node.js 18.18 or newer.

```bash
git clone https://github.com/democracydistributed/democracy-distributed.git
cd democracy-distributed
npm install
npm run dev
```

Open <http://localhost:3000/org/406019364987666433> to see Toronto with live data. You don't need any credentials. If the live gateway is unreachable, <http://localhost:3000/?org=toronto> loads a bundled offline copy.

Anyone can create an account on the [live site](https://democracydistributed.com/) to sign in and post suggestions there. Running sign-in and suggestions on your own machine is different: it needs Corteza OAuth client credentials, which only the core team has for now. If you have them, copy `.env.example` to `.env.local` and fill it in.

Other commands: `npm run build`, `npm start` (serve the build), `npm run lint`.

## Project layout

```
src/app/         Pages and API routes (org, item, project, transaction, browse, ...)
src/components/  UI, including the Sankey chart and the trace drawer
src/lib/         Data fetching (api.ts, server-api.ts), Corteza writes, Sankey logic
src/auth.ts      Login with Corteza (Auth.js)
```

## Contributing

Bug reports, questions, ideas, and pull requests are all welcome here on GitHub. Feel free to open an issue.

For code changes:

1. Fork, branch, and make your change.
2. Run `npm run lint` and `npm run build`.
3. Open a pull request describing what changed and why.

You can also help with the data itself, like spotting missing records, on the [platform](https://democracydistributed.com/contribute) (still growing), or see more ways to [get involved](https://democracy-distributed.gitbook.io/democracy-distributed-docs/contribute/get-involved).

## License

The code is released under the [MIT License](LICENSE).
