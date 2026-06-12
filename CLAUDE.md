# Jar — project rules

pnpm workspace monorepo. See `README.md` for layout; `DESIGN.md` for product decisions; `REVIEW-LOG.md` for the code-review trail.

## Structure rules

- **One lockfile.** `pnpm-lock.yaml` lives at the root only. Always run `pnpm install` from the root; never create per-package lockfiles or `pnpm-workspace.yaml` files.
- **pnpm settings live in root `pnpm-workspace.yaml`** (`allowBuilds`, release-age excludes). pnpm v11 syntax — `allowBuilds` map, not `onlyBuiltDependencies`.
- **`contracts/` is Foundry-only** — not a pnpm package. Its build artifacts and broadcast logs are ignored by `contracts/.gitignore`.
- **Gitignore layering:** root `.gitignore` holds cross-cutting ignores (node_modules, env, OS, `.claude/settings.local.json`); each package ignores only its own tool's artifacts. Don't add tool-specific patterns to the root file.

## Naming rules

- Workspace packages are scoped: `@jar/frontend`, `@jar/indexer`. Refer to them with `pnpm --filter @jar/<name>`.
- Contracts: `PascalCase.sol` matching the contract name; scripts `*.s.sol`; tests under `test/{unit,fuzz,integration}`.
- Frontend components: `PascalCase.tsx` in `src/components/`; shared helpers in `src/lib/`; chain/contract constants in `src/constants.ts`.
- Indexer ABIs: `abis/<Name>Abi.ts`.

## Known debt

- `frontend/src/constants.ts` and `indexer/ponder.config.ts` hand-duplicate `FACTORY_ADDRESS` and ABIs. When touching either, update both. Proper fix (deferred): a shared workspace package generated from `contracts/out/`.

## Workflow

- Frontend code: heed `frontend/CLAUDE.md` — the installed Next.js differs from training data; docs are in `node_modules/next/dist/docs/`.
- After contract changes that alter events/ABI, the indexer ABIs and frontend constants must be regenerated/redeployed together.
