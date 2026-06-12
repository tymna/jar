import { parseAbiItem } from "abitype";
import { createConfig, factory } from "ponder";

import { JarFactoryAbi } from "./abis/JarFactoryAbi";
import { JarAbi } from "./abis/JarAbi";

// ---- DEPLOYMENT CONFIG ---------------------------------------------------
// JarFactory deployment per chain: { address, startBlock }.
// startBlock = the block the factory was deployed at. NEVER use 0 on a public
// testnet/mainnet — Ponder would backfill from genesis (millions of blocks)
// and stall. Use the deploy block from broadcast/.../run-latest.json.
const FACTORY = {
  // Deployed on Sepolia at block 11_027_872 (allowlist version, owner = dev wallet).
  sepolia: { address: "0xC9c6EB3463dC21591bc1eA6196827B7359d93e0D", startBlock: 11_027_872 },
  // Deploy + fill these, then uncomment their blocks below + add the RPC to .env.local:
  // baseSepolia:     { address: "0x...", startBlock: 0 },
  // optimismSepolia: { address: "0x...", startBlock: 0 },
  // arbitrumSepolia: { address: "0x...", startBlock: 0 },
} as const;

// The factory event that announces every new Jar. Its `jar` argument is the
// address of the child contract Ponder should start tracking.
const jarCreatedEvent = parseAbiItem(
  "event JarCreated(address indexed jar, address indexed owner, string name, address token, uint256 goalAmount)",
);

export default createConfig({
  chains: {
    sepolia: { id: 11155111, rpc: process.env.PONDER_RPC_URL_11155111 },
    // baseSepolia:     { id: 84532,    rpc: process.env.PONDER_RPC_URL_84532 },
    // optimismSepolia: { id: 11155420, rpc: process.env.PONDER_RPC_URL_11155420 },
    // arbitrumSepolia: { id: 421614,   rpc: process.env.PONDER_RPC_URL_421614 },
  },
  contracts: {
    // The factory itself — source of `JarCreated` (we insert a `jar` row per event).
    JarFactory: {
      abi: JarFactoryAbi,
      chain: {
        sepolia: FACTORY.sepolia,
        // baseSepolia:     FACTORY.baseSepolia,
        // optimismSepolia: FACTORY.optimismSepolia,
        // arbitrumSepolia: FACTORY.arbitrumSepolia,
      },
    },
    // Every Jar the factory deploys — source of Deposit / Withdraw /
    // GoalAmountChanged / OwnershipTransferred. Addresses are discovered
    // dynamically from JarCreated via the factory() helper.
    Jar: {
      abi: JarAbi,
      chain: {
        sepolia: {
          address: factory({ address: FACTORY.sepolia.address, event: jarCreatedEvent, parameter: "jar" }),
          startBlock: FACTORY.sepolia.startBlock,
        },
        // baseSepolia: {
        //   address: factory({ address: FACTORY.baseSepolia.address, event: jarCreatedEvent, parameter: "jar" }),
        //   startBlock: FACTORY.baseSepolia.startBlock,
        // },
        // optimismSepolia: {
        //   address: factory({ address: FACTORY.optimismSepolia.address, event: jarCreatedEvent, parameter: "jar" }),
        //   startBlock: FACTORY.optimismSepolia.startBlock,
        // },
        // arbitrumSepolia: {
        //   address: factory({ address: FACTORY.arbitrumSepolia.address, event: jarCreatedEvent, parameter: "jar" }),
        //   startBlock: FACTORY.arbitrumSepolia.startBlock,
        // },
      },
    },
  },
  // Periodic balance true-up: deposits are tracked exactly via Jar:Deposit,
  // but direct ERC20 sends (gifts) bypass deposit() — so periodically we
  // read balanceOf(jar) on-chain and overwrite the stored balance. Indexing
  // the token's Transfer events instead would mean syncing EVERY transfer of
  // the token (unusable with e.g. mainnet USDC); this scales with jar count.
  blocks: {
    BalanceCheck: {
      chain: {
        // Gifts are rare, so ~5 min lag is fine and keeps RPC load low.
        // interval is in BLOCKS: sepolia/mainnet ~12s → 25 ≈ 5 min. When
        // enabling faster chains, tune per chain (Base/OP ~2s → 150).
        //
        // "latest" = the tip at startup: a true-up only matters at the tip,
        // so historical runs are skipped entirely — replaying them is just
        // wasted balanceOf multicalls that each overwrite the last (exact
        // balances come from Deposit/Withdraw events regardless).
        sepolia: { interval: 25, startBlock: "latest" },
      },
    },
  },
});
