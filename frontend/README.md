# Jar — Frontend

The web app for Jar. Connects a wallet, lists the jars you own across chains,
and lets you create jars and run their on-chain actions. Reads come from the
ponder indexer (live `/sql` queries); writes go straight to the contracts via
wagmi.

> Heads up: this is a **modified Next.js** — see [`AGENTS.md`](./AGENTS.md).
> Read the local docs in `node_modules/next/dist/docs/` before writing code.

## Stack

| Package | Role |
|---------|------|
| `next` (App Router) | Framework — routing, SSR, production builds |
| `react`, `react-dom` | UI runtime |
| `wagmi` | Wallet state, contract reads/writes, chain switching |
| `viem` | Low-level EVM client (wagmi's engine) |
| `@rainbow-me/rainbowkit` | Wallet-connect UI |
| `@tanstack/react-query` | Async state (required peer of wagmi) |
| `@ponder/client` + `@ponder/react` | Typed live queries against the indexer's `/sql` endpoint — types come from `ponder.schema.ts`, no hand-written API types |
| `tailwindcss` (v4) | Styling |

**No WalletConnect** — extension wallets only. The wallet list is built with
`connectorsForWallets` + `injectedWallet` (no QR/mobile flow, no projectId
signup — a dummy string satisfies the type). EIP-6963 autodiscovery is on, so
other installed wallets appear under "Installed".

## Run

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

`.env.local`:

```
NEXT_PUBLIC_PONDER_URL=http://localhost:42069   # indexer API
```

The indexer (in `../indexer`) must be running for jar lists and the token
picker to populate.

> Tailwind v4 reads its `@theme` block (in `globals.css`) only at server
> startup — **restart `pnpm dev` after editing `@theme`** (colors, fonts).
> Regular class changes still hot-reload.

## What's built

### Pages & flow
- **Disconnected** → centered chunky "connect wallet" button (custom, opens
  RainbowKit's connect modal via `useConnectModal`).
- **Connected, no jars** → "no jars for now / wanna create one?" empty state.
- **Connected, has jars** → grid of jar cards + a dashed "+ new jar" tile.
- The whole app renders in a centered, app-width column (`max-w-lg`) even on
  desktop — see [`../DESIGN.md`](../DESIGN.md).

### Components
- `app/page.tsx` — home. Live ponder query for jars owned by the connected
  address (across all chains, newest first; address lowercased to match how
  ponder stores hex). Branches: loading / empty / grid.
- `components/JarCard.tsx` — square card: name, chain + token symbol,
  `balance/goal SYMBOL`. Symbol/decimals aren't indexed, so they're read from
  the token contract on the jar's chain. Click opens the jar modal.
- `components/JarModal.tsx` — per-jar actions matching the contract surface:
  - **deposit** — amount input; button reads the live ERC-20 allowance and
    flips between "approve" and "deposit" (two-step, no hidden chaining).
  - **withdraw all** — closes the jar (contract sets status CLOSED).
  - **change goal** — visual target only, locks nothing.
  - Wrong chain → all actions replaced by a "switch to {chain}" button.
  - Tracks the selected jar by key and reads its row from the live query, so
    balances update live after a confirmed tx.
- `components/CreateJarModal.tsx` — plain `<dialog>`: name, token (dropdown
  from the indexer's `allowed_token` table, filtered by chain + allowed),
  goal (human units → `parseUnits` with on-chain decimals). Submits
  `createJar` and waits for the receipt. Unsupported chain → fallback message.

### Wiring
- `wagmi.ts` — chains: mainnet, base, optimism, arbitrum, sepolia
  (`ssr: true`). Factory deployed on sepolia only so far.
- `constants.ts` — `FACTORY_ADDRESS` per chain + `jarFactoryAbi` / `jarAbi`.
  Keep in sync with `indexer/ponder.config.ts`.
- `lib/ponder.ts` — ponder client + schema import from `../../indexer`.
  `turbopack.root` is set to the repo root so this cross-package import
  resolves.
- `app/providers.tsx` — Wagmi → QueryClient → Ponder → RainbowKit.

### Design system
See [`../DESIGN.md`](../DESIGN.md) for the philosophy. In code so far:
- **Accent** `--color-cherry: #de006f`, registered in `globals.css` `@theme`
  (use `bg-cherry` / `text-cherry` / `border-cherry`).
- **Font** Space Mono everywhere (via `next/font/google`, set as the app
  default in `globals.css`). Chunky display font (Modak) planned for headings.
- **Buttons** chunky/physical: black outline + hard bottom-only grey shadow
  (`shadow-[0_4px_0_0_#333]`); hover lifts + darkens, press drops into the
  shadow. Snappy `duration-150`, no blur, no scale.

## Known gotchas
- Cross-package schema import type-clashes if drizzle-orm versions drift
  (frontend vs indexer `.pnpm` stores) — pinned via a `drizzle-orm` devDep +
  tsconfig paths alias; keep in sync with `@ponder/client`'s version.
- `"Cannot redefine property: ethereum"` in the console is a Phantom/MetaMask
  extension conflict in the browser, not app code.
- A token whose `symbol()`/`decimals()` reverts leaves a card/modal stuck on
  "…" (allowFailure is off).

## TODO
- Landing page: usual split — marketing at `/`, app on `/app`. The connect
  button moves to the app route; landing built at the styling stage.
- Theme system: light + dark (accent stays cherry).
- Not yet tested against a live indexer end-to-end.
