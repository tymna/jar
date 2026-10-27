import { onchainTable, primaryKey } from "ponder";

// ---- jars: current state, one row per jar (the "fold" of its events) ----
// Read path for the frontend: "list this user's jars across all chains".
export const jar = onchainTable(
  "jar",
  (t) => ({
    chainId: t.integer().notNull(),
    address: t.hex().notNull(),
    owner: t.hex().notNull(), // kept current via OwnershipTransferred
    name: t.text().notNull(),
    token: t.hex().notNull(),
    goal: t.bigint().notNull(),
    // running total: += Token.Transfer(to=jar).value, reset to 0 on WithdrawAll.
    balance: t.bigint().notNull().default(0n),
    status: t.text().notNull().default("ACTIVE"), // "ACTIVE" | "CLOSED"
    createdBlock: t.bigint().notNull(),
    createdAt: t.bigint().notNull(), // block timestamp
  }),
  // Same address can exist on multiple chains → key by (chainId, address).
  (table) => ({
    pk: primaryKey({ columns: [table.chainId, table.address] }),
  }),
);

// ---- allowed tokens: the factory's on-chain allowlist, one row per token --
// Read path: "which tokens can a jar be created with on this chain" — feeds
// the frontend token picker straight from chain state, never out of sync.
export const allowedToken = onchainTable(
  "allowed_token",
  (t) => ({
    chainId: t.integer().notNull(),
    address: t.hex().notNull(),
    // kept current via AllowedTokenAdded / AllowedTokenRemoved
    allowed: t.boolean().notNull(),
    updatedAt: t.bigint().notNull(), // block timestamp of the last change
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.chainId, table.address] }),
  }),
);

// ---- transactions: append-only history, many rows per jar ("all txes") ----
// Read path: "show the timeline for one jar".
export const transaction = onchainTable(
  "transaction",
  (t) => ({
    chainId: t.integer().notNull(),
    jar: t.hex().notNull(), // → jars (chainId, address)
    kind: t.text().notNull(), // "DEPOSIT" | "WITHDRAW"
    actor: t.hex().notNull(), // Deposit.from / WithdrawAll.to
    amount: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.bigint().notNull(),
    txHash: t.hex().notNull(),
    logIndex: t.integer().notNull(),
  }),
  // block numbers / tx hashes are only unique within a chain → include chainId.
  (table) => ({
    pk: primaryKey({ columns: [table.chainId, table.txHash, table.logIndex] }),
  }),
);
