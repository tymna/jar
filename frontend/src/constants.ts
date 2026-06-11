import { sepolia } from "wagmi/chains";

// JarFactory deployments — keep in sync with indexer/ponder.config.ts.
export const FACTORY_ADDRESS: Record<number, `0x${string}`> = {
  [sepolia.id]: "0xC9c6EB3463dC21591bc1eA6196827B7359d93e0D",
};

export const jarFactoryAbi = [
  {
    type: "function",
    name: "createJar",
    stateMutability: "nonpayable",
    inputs: [
      { name: "name", type: "string" },
      { name: "tokenToSave", type: "address" },
      { name: "goalAmount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "address" }],
  },
  { type: "error", name: "TokenIsNotAllowed", inputs: [] },
] as const;

export const jarAbi = [
  {
    type: "function",
    name: "deposit",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "withdrawAll",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [{ name: "amountToWithdraw", type: "uint256" }],
  },
  {
    type: "function",
    name: "changeGoal",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  { type: "error", name: "AmountMustBeGreaterThanZero", inputs: [] },
] as const;
