"use client";

import { desc, eq } from "@ponder/client";
import {
  useAccountModal,
  useChainModal,
  useConnectModal,
} from "@rainbow-me/rainbowkit";
import { usePonderQuery } from "@ponder/react";
import { useEffect, useState } from "react";
import { zeroAddress } from "viem";
import { useAccount } from "wagmi";

import CreateJarModal from "@/components/CreateJarModal";
import JarCard from "@/components/JarCard";
import JarModal from "@/components/JarModal";
import { schema } from "@/lib/ponder";
import { config } from "@/wagmi";

function shortAddress(address: string) {
  return `${address.slice(0, 5)}....${address.slice(-3)}`;
}

export default function Home() {
  const { isConnected, address, chainId } = useAccount();
  const { openAccountModal } = useAccountModal();
  const { openChainModal } = useChainModal();
  const { openConnectModal } = useConnectModal();

  const chain = config.chains.find((c) => c.id === chainId);

  // Wallet state is client-only; render the disconnected layout on the
  // server pass to avoid a hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [createOpen, setCreateOpen] = useState(false);
  const [showClosed, setShowClosed] = useState(false);

  // Track the selected jar by key and derive the row from the live query, so
  // the open modal sees balance/goal updates instead of a stale snapshot.
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Jars are owned across all chains; ponder stores hex lowercased.
  // The query is built eagerly (for its key) even when disabled, so the
  // owner filter needs a concrete address — zeroAddress while disconnected.
  const { data: jars } = usePonderQuery({
    queryFn: (db) =>
      db
        .select()
        .from(schema.jar)
        .where(
          eq(
            schema.jar.owner,
            (address?.toLowerCase() ?? zeroAddress) as `0x${string}`,
          ),
        )
        .orderBy(desc(schema.jar.createdAt)),
    enabled: address !== undefined,
  });

  const selectedJar =
    jars?.find((j) => `${j.chainId}-${j.address}` === selectedKey) ?? null;

  // Closed jars are hidden behind a toggle so the grid stays focused on
  // active ones; the toggle only appears once there's something to reveal.
  const closedCount = jars?.filter((j) => j.status === "CLOSED").length ?? 0;
  const visibleJars = showClosed
    ? jars
    : jars?.filter((j) => j.status === "ACTIVE");

  if (!mounted || !isConnected) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <button
          type="button"
          // undefined while RainbowKit isn't ready or its modal is open
          disabled={!openConnectModal}
          onClick={openConnectModal}
          className="rounded-xl border-2 border-black bg-cherry px-8 py-3 font-bold text-white shadow-[0_4px_0_0_#333] transition-all duration-150 ease-out hover:-translate-y-0.5 hover:brightness-90 hover:shadow-[0_6px_0_0_#333] focus:outline-none focus-visible:-translate-y-0.5 focus-visible:shadow-[0_6px_0_0_#333] active:translate-y-1 active:shadow-[0_0_0_0_#333] disabled:opacity-50"
        >
          connect wallet
        </button>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col">
      <header className="p-4 text-center">
        connected wallet:
        <br />
        <button type="button" onClick={openAccountModal}>
          {address && shortAddress(address)}
        </button>
        <br />
        chain:{" "}
        <button type="button" onClick={openChainModal}>
          {chain ? chain.name : "unsupported, switch"}
        </button>
      </header>
      {jars && jars.length > 0 ? (
        <>
          {closedCount > 0 && (
            <div className="px-8 pt-4 text-center">
              <button
                type="button"
                onClick={() => setShowClosed((s) => !s)}
                className="underline"
              >
                {showClosed ? "hide closed jars" : `show closed jars (${closedCount})`}
              </button>
            </div>
          )}
          <section className="flex flex-1 flex-wrap content-start justify-center gap-4 p-8">
            {visibleJars?.map((jar) => (
              <JarCard
                key={`${jar.chainId}-${jar.address}`}
                jar={jar}
                onClick={() => setSelectedKey(`${jar.chainId}-${jar.address}`)}
              />
            ))}
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="flex aspect-square w-40 items-center justify-center border border-dashed"
            >
              + new jar
            </button>
          </section>
        </>
      ) : (
        <section className="flex flex-1 items-center justify-center">
          <p className="text-center">
            {jars === undefined ? (
              "loading jars…"
            ) : (
              <>
                no jars for now
                <br />
                wanna{" "}
                <button type="button" onClick={() => setCreateOpen(true)}>
                  create
                </button>{" "}
                one?
              </>
            )}
          </p>
        </section>
      )}
      <CreateJarModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <JarModal jar={selectedJar} onClose={() => setSelectedKey(null)} />
    </main>
  );
}
