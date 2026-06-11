# Jar

A jar, not a wallet — a short-term budgeting envelope for crypto. You move tokens
into a named jar (e.g. *Trip to Japan*, *Taxes*), watch progress toward a goal, and
pull the money out when the thing happens. Digital envelope-stuffing for stablecoins.

Not investing, not yield. Just envelopes.

## How it works

- **`JarFactory`** — deployed once. Every jar is created through it via `createJar(name, token, goal)`, which deploys a new `Jar`, makes the caller its owner, and emits `JarCreated(jar, owner)` for indexing.
- **`Jar`** — one contract per jar:
  - `deposit(amount)` — anyone can fund it (or send the token directly to the jar).
  - `withdrawAll()` — owner only; sweeps the full balance and returns the amount.
  - `changeGoal(amount)` — owner only; the goal is a visual target and locks nothing.

The goal and status are informational — they never block deposits or withdrawals.

## Repo layout

pnpm workspace monorepo — one lockfile at the root, three packages:

| Package | What | Tooling |
|---------|------|---------|
| [`contracts/`](./contracts) | `Jar` + `JarFactory` Solidity contracts | Foundry (not part of the pnpm workspace) |
| [`frontend/`](./frontend) (`@jar/frontend`) | Next.js app — wallet connect, jar list, on-chain actions | pnpm |
| [`indexer/`](./indexer) (`@jar/indexer`) | Ponder indexer — watches `JarCreated` + jar events, serves live SQL queries | pnpm |

## Develop

```bash
pnpm install          # once, at the root — installs frontend + indexer
pnpm dev:indexer      # ponder dev (needs contracts deployed; see indexer/ponder.config.ts)
pnpm dev:frontend     # next dev
pnpm typecheck        # tsc across all packages

cd contracts          # Foundry lives on its own
forge build
forge test
```

## Deploy contracts

```bash
cd contracts

# 1. Deploy the factory once
forge script script/DeployJarFactory.s.sol --rpc-url $RPC_URL --account deployer --broadcast

# 2. Set JAR_FACTORY_ADDRESS in .env, then create a jar through it
forge script script/DeployJar.s.sol --rpc-url $RPC_URL --account deployer --broadcast
```

See `contracts/.env.example` for the required variables.
