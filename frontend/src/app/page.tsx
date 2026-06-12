"use client";

import { desc, eq } from "@ponder/client";
import { useAccountModal, useConnectModal } from "@rainbow-me/rainbowkit";
import { usePonderQuery } from "@ponder/react";
import { useEffect, useState } from "react";
import { zeroAddress } from "viem";
import { useAccount } from "wagmi";

import CreateJarModal from "@/components/CreateJarModal";
import JarCard from "@/components/JarCard";
import JarModal from "@/components/JarModal";
import { schema } from "@/lib/ponder";

function shortAddress(address: string) {
  return `${address.slice(0, 5)}....${address.slice(-3)}`;
}

// Jars are paged in to keep the grid manageable; "show more" reveals a batch.
const PAGE_SIZE = 4;

export default function Home() {
  const { isConnected, address } = useAccount();
  const { openAccountModal } = useAccountModal();
  const { openConnectModal } = useConnectModal();

  // Wallet state is client-only; render the disconnected layout on the
  // server pass to avoid a hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [createOpen, setCreateOpen] = useState(false);
  const [showClosed, setShowClosed] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

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
    // Live SSE updates are the primary mechanism, but the stream dies
    // silently if the indexer restarts — poll as a fallback so an open
    // tab always converges.
    refetchInterval: 10_000,
  });

  const selectedJar =
    jars?.find((j) => `${j.chainId}-${j.address}` === selectedKey) ?? null;

  // The grid shows one status at a time: active by default, ONLY closed ones
  // while browsing the archive — never mixed. The toggle only appears once
  // there's something to reveal.
  const closedCount = jars?.filter((j) => j.status === "CLOSED").length ?? 0;
  const activeCount = jars?.filter((j) => j.status === "ACTIVE").length ?? 0;
  const visibleJars = jars?.filter(
    (j) => j.status === (showClosed ? "CLOSED" : "ACTIVE"),
  );
  // Only the first `visibleCount` are rendered; the rest wait behind "show more".
  const shownJars = visibleJars?.slice(0, visibleCount);
  const hasMore =
    visibleJars !== undefined && visibleJars.length > visibleCount;

  if (!mounted || !isConnected) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <button
          type="button"
          // undefined while RainbowKit isn't ready or its modal is open
          disabled={!openConnectModal}
          onClick={openConnectModal}
          className="block-btn bg-cherry px-8 py-3 text-white"
        >
          connect wallet
        </button>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col">
      {/* Wallet is pinned to the top center of the viewport, out of the
          content flow, so the header reads as just count + action. */}
      <button
        type="button"
        onClick={openAccountModal}
        className="fixed top-3 left-1/2 -translate-x-1/2 text-center text-sm text-neutral-500"
      >
        connected wallet:
        <br />
        <span className="text-cherry">{address && shortAddress(address)}</span>
      </button>
      {/* pt clears the fixed wallet button's height — content starts below
          the white strip the wallet occupies, never beside it. */}
      <header className="px-8 pt-24 text-center">
        {/* Primary action. Hidden while browsing the closed archive. */}
        {jars && jars.length > 0 && !showClosed && (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="mt-1 text-xl text-cherry underline hover:opacity-70"
          >
            + new jar
          </button>
        )}
      </header>
      {jars && jars.length > 0 ? (
        <>
          <section className="flex flex-wrap content-start justify-start gap-4 px-8 pt-8">
            {shownJars?.map((jar) => (
              <JarCard
                key={`${jar.chainId}-${jar.address}`}
                jar={jar}
                onClick={() => setSelectedKey(`${jar.chainId}-${jar.address}`)}
              />
            ))}
          </section>
          {/* Secondary controls sit below the grid so the top stays clean. */}
          <div className="flex flex-col items-center gap-3 px-8 pb-8 pt-12">
            {hasMore && (
              <button
                type="button"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="text-sm font-normal text-neutral-500 underline hover:text-black"
              >
                show more ({visibleJars.length - visibleCount})
              </button>
            )}
            {visibleCount > PAGE_SIZE && (
              <button
                type="button"
                onClick={() => setVisibleCount(PAGE_SIZE)}
                className="text-sm font-normal text-neutral-500 underline hover:text-black"
              >
                show less
              </button>
            )}
          </div>
          {/* Closed-jar toggle is pinned to the bottom (mt-auto) so it sits in
              the same place regardless of how many jars are on screen. */}
          {closedCount > 0 && (
            <footer className="mt-auto flex justify-center p-8">
              <button
                type="button"
                onClick={() => {
                  setShowClosed((s) => !s);
                  // Paging restarts per view — a "show more" expansion in one
                  // view shouldn't leak into the other.
                  setVisibleCount(PAGE_SIZE);
                }}
                className="text-xs text-neutral-500 underline hover:text-black"
              >
                {showClosed
                  ? "hide closed jars"
                  : `show closed jars (${closedCount})`}
              </button>
            </footer>
          )}
        </>
      ) : (
        // pb-24 mirrors the header's pt-24 so the message centers in the
        // viewport, not in the leftover space below the header.
        <section className="flex flex-1 items-center justify-center pb-24">
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
