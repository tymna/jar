import { and, eq } from "ponder";
import { ponder } from "ponder:registry";
import { allowedToken, jar, transaction } from "ponder:schema";

import { Erc20Abi } from "../abis/Erc20Abi";

// ---- JarFactory:AllowedTokenAdded / Removed -> mirror the allowlist ----
ponder.on("JarFactory:AllowedTokenAdded", async ({ event, context }) => {
  await context.db
    .insert(allowedToken)
    .values({
      chainId: context.chain.id,
      address: event.args.token,
      allowed: true,
      updatedAt: event.block.timestamp,
    })
    .onConflictDoUpdate({ allowed: true, updatedAt: event.block.timestamp });
});

ponder.on("JarFactory:AllowedTokenRemoved", async ({ event, context }) => {
  await context.db
    .insert(allowedToken)
    .values({
      chainId: context.chain.id,
      address: event.args.token,
      allowed: false,
      updatedAt: event.block.timestamp,
    })
    .onConflictDoUpdate({ allowed: false, updatedAt: event.block.timestamp });
});

// ---- JarFactory:JarCreated -> insert the jar (current-state row) ----
// The enriched event carries everything, so this is a pure copy — no contract reads.
ponder.on("JarFactory:JarCreated", async ({ event, context }) => {
  await context.db
    .insert(jar)
    .values({
      chainId: context.chain.id,
      address: event.args.jar,
      owner: event.args.owner,
      name: event.args.name,
      token: event.args.token,
      goal: event.args.goalAmount,
      balance: 0n,
      status: "ACTIVE",
      createdBlock: event.block.number,
      createdAt: event.block.timestamp,
    })
    // idempotent on reorg replay
    .onConflictDoNothing();
});

// ---- Jar:Deposit -> append a tx row, bump the balance ----
// Exact and attributed (from, amount, txHash). Direct ERC20 sends that bypass
// deposit() don't appear here — BalanceCheck:block picks those up below.
ponder.on("Jar:Deposit", async ({ event, context }) => {
  const chainId = context.chain.id;
  const jarAddress = event.log.address;

  await context.db.insert(transaction).values({
    chainId,
    jar: jarAddress,
    kind: "DEPOSIT",
    actor: event.args.from,
    amount: event.args.amount,
    blockNumber: event.block.number,
    timestamp: event.block.timestamp,
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
  });

  await context.db
    .update(jar, { chainId, address: jarAddress })
    .set((row) => ({ balance: row.balance + event.args.amount }));
});

// ---- BalanceCheck:block -> true-up balances against the chain ----
// Runs every `interval` blocks (see ponder.config.ts). Overwrites each ACTIVE
// jar's balance with on-chain balanceOf, catching direct ERC20 sends (gifts)
// that bypass deposit(). Gifts show up in the balance but get no transaction
// row — that's the accepted tradeoff for not syncing every token transfer.
ponder.on("BalanceCheck:block", async ({ event, context }) => {
  const chainId = context.chain.id;

  const activeJars = await context.db.sql
    .select()
    .from(jar)
    .where(and(eq(jar.chainId, chainId), eq(jar.status, "ACTIVE")));
  if (activeJars.length === 0) return;

  const balances = await context.client.multicall({
    contracts: activeJars.map((j) => ({
      abi: Erc20Abi,
      address: j.token,
      functionName: "balanceOf" as const,
      args: [j.address] as const,
    })),
    allowFailure: true,
  });

  for (const [i, j] of activeJars.entries()) {
    const result = balances[i];
    if (result?.status !== "success") continue; // skip failed reads, next tick retries
    const onChain = result.result as bigint;
    if (onChain !== j.balance) {
      await context.db
        .update(jar, { chainId, address: j.address })
        .set({ balance: onChain });
    }
  }
});

// ---- Jar:Withdraw -> append a tx row, empty + close the jar ----
// withdrawAll() sweeps the FULL on-chain balance (incl. any direct transfers)
// and closes the jar, so post-withdraw the jar holds 0 — set balance to 0n
// rather than subtracting (which could underflow vs our deposit-only total).
ponder.on("Jar:Withdraw", async ({ event, context }) => {
  const chainId = context.chain.id;
  const jarAddress = event.log.address;

  await context.db.insert(transaction).values({
    chainId,
    jar: jarAddress,
    kind: "WITHDRAW",
    actor: event.args.to,
    amount: event.args.amount,
    blockNumber: event.block.number,
    timestamp: event.block.timestamp,
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
  });

  await context.db
    .update(jar, { chainId, address: jarAddress })
    .set({ balance: 0n, status: "CLOSED" });
});

// ---- Jar:GoalAmountChanged -> keep the goal current ----
ponder.on("Jar:GoalAmountChanged", async ({ event, context }) => {
  await context.db
    .update(jar, { chainId: context.chain.id, address: event.log.address })
    .set({ goal: event.args.newGoal });
});

// ---- Jar:OwnershipTransferred -> keep the owner current ----
// The constructor (0 -> factory) and createJar's transferOwnership (factory ->
// user) both fire BEFORE JarCreated, when no jar row exists yet. JarCreated
// records the authoritative initial owner, so here we only apply *later*
// transfers — guard with find() so the construction-time events are skipped.
ponder.on("Jar:OwnershipTransferred", async ({ event, context }) => {
  const chainId = context.chain.id;
  const address = event.log.address;

  const existing = await context.db.find(jar, { chainId, address });
  if (!existing) return;

  await context.db
    .update(jar, { chainId, address })
    .set({ owner: event.args.newOwner });
});
