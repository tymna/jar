import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  coinbaseWallet,
  injectedWallet,
  metaMaskWallet,
  okxWallet,
  phantomWallet,
  rabbyWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";
import { arbitrum, base, mainnet, optimism, sepolia } from "wagmi/chains";

// Extension wallets only — projectId is required by the type but unused
// without WalletConnect-based wallets in the list.
const connectors = connectorsForWallets(
  [
    {
      groupName: "Wallets",
      wallets: [
        metaMaskWallet,
        rabbyWallet,
        okxWallet,
        phantomWallet,
        coinbaseWallet,
        injectedWallet,
      ],
    },
  ],
  { appName: "Jar", projectId: "_" },
);

// Factory is deployed only on sepolia so far — the other chains are
// connectable, but jar creation guards on FACTORY_ADDRESS until deployed.
//
// http(undefined) falls back to the chain's public RPC — fine for sepolia-only
// dev, but L2/mainnet public endpoints rate-limit hard. Set the matching
// NEXT_PUBLIC_*_RPC_URL to point at a dedicated provider once multi-chain is live.
export const config = createConfig({
  connectors,
  chains: [mainnet, base, optimism, arbitrum, sepolia],
  transports: {
    [mainnet.id]: http(process.env.NEXT_PUBLIC_MAINNET_RPC_URL),
    [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC_URL),
    [optimism.id]: http(process.env.NEXT_PUBLIC_OPTIMISM_RPC_URL),
    [arbitrum.id]: http(process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL),
    [sepolia.id]: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL),
  },
  ssr: true,
});
