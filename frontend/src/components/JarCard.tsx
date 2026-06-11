"use client";

import { erc20Abi, formatUnits } from "viem";
import { useReadContracts } from "wagmi";

import { schema } from "@/lib/ponder";
import { config } from "@/wagmi";

type Jar = typeof schema.jar.$inferSelect;

export default function JarCard({
  jar,
  onClick,
}: {
  jar: Jar;
  onClick: () => void;
}) {
  const chain = config.chains.find((c) => c.id === jar.chainId);

  // Symbol and decimals live on the token contract, not in the index.
  // allowFailure keeps one odd/reverting token (or an RPC hiccup) from
  // wedging the whole card on "…" — each call falls back independently.
  const { data: token } = useReadContracts({
    contracts: [
      {
        address: jar.token,
        abi: erc20Abi,
        functionName: "symbol",
        chainId: jar.chainId,
      },
      {
        address: jar.token,
        abi: erc20Abi,
        functionName: "decimals",
        chainId: jar.chainId,
      },
    ],
    allowFailure: true,
  });
  const symbol = token?.[0]?.result;
  const decimals = token?.[1]?.result;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex aspect-square w-40 flex-col items-center justify-between border p-3 text-center ${
        jar.status === "CLOSED" ? "opacity-50" : ""
      }`}
    >
      <p>{jar.name}</p>
      <p>
        {chain ? chain.name : `chain ${jar.chainId}`}
        <br />
        {symbol ?? "…"}
      </p>
      <p>
        {decimals === undefined
          ? "…"
          : `${formatUnits(jar.balance, decimals)}/${formatUnits(jar.goal, decimals)} ${symbol ?? ""}`}
      </p>
    </button>
  );
}
