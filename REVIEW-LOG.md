# Review Log

## Pending Review

_(none)_

## Reviewed

- [x] 2026-06-11 — `frontend/` (entire untracked dir: `src/app/*`, `src/components/*`, `src/constants.ts`, `src/wagmi.ts`, `src/lib/ponder.ts`, configs) — initial Next.js 16 / wagmi v3 frontend: wallet connect, jar list (ponder live query), create/deposit/withdraw/change-goal flows — reviewed 2026-06-11, 7 issues found. **Fixed 2026-06-11: 6 of 7 (all Med + all Low); 1 Info partially fixed, ABI/address dedup deferred.** Typecheck (`tsc --noEmit`) clean after fixes.

  Resolved:
  - [x] **Med** — `CreateJarModal.tsx` — goal now guarded `parsedGoal > 0n` before submit and the create button is disabled on a `0` goal.
  - [x] **Med** — `JarModal.tsx` — when `jar.status === "CLOSED"` the action forms (deposit/withdraw/changeGoal/switch) no longer render; only the "this jar is closed" message shows.
  - [x] **Med** — `JarCard.tsx` / `JarModal.tsx` — both `useReadContracts` switched to `allowFailure: true` with per-call `.result` fallbacks; a failing token/RPC no longer wedges the UI on "…".
  - [x] **Low** — `JarModal.tsx` — `reset()` is called at the start of every action (deposit/changeGoal/withdrawAll), clearing stale `done ✓`/error between sequential actions.
  - [x] **Low** — `JarModal.tsx` — `withdrawAll` now goes through a `window.confirm` before the irreversible close.
  - [x] **Low** — `wagmi.ts` — transports read `NEXT_PUBLIC_*_RPC_URL` per chain (falls back to public RPC if unset).
  - [x] **Info (partial)** — `lib/ponder.ts` — defaults to `http://localhost:42069` and trims trailing slashes; an unset `NEXT_PUBLIC_PONDER_URL` no longer builds an `undefined/sql` URL.

  Still open:
  - [ ] **Info** — `constants.ts` vs `indexer/ponder.config.ts` — `FACTORY_ADDRESS` and ABIs are still hand-duplicated across packages (sync risk). Deferred: a proper fix is a shared source/package, larger than a review pass.

  Follow-up feature (same session, not from the review): added a **show/hide closed jars** toggle in `app/page.tsx` (hidden by default, toggle appears only when `closedCount > 0`) and dimmed closed cards (`opacity-50`) in `JarCard.tsx`.
