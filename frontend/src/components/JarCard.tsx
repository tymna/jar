"use client";

import { useMemo } from "react";
import { erc20Abi, formatUnits } from "viem";
import { useReadContracts } from "wagmi";

import ChainIcon from "@/components/ChainIcon";
import { schema } from "@/lib/ponder";

type Jar = typeof schema.jar.$inferSelect;

// The notch is the "full" line — like a fill mark on a real jar. The pink
// rises to it at 100% (not to the brim), leaving headroom above for the name.
// Both the notch position and the fill height derive from this so they stay
// locked together: move the line, the fill follows.
const FULL_LEVEL = 60; // % of card height, measured from the bottom

// The jam surface is a slightly bumpy line, unique per jar: seeded from the
// jar's address so the bumps are stable across reloads (true randomness would
// re-roll every render AND mismatch on hydration). `flatten` goes 0→1 as the
// jar fills; at 100% the amplitude is zero and the surface is dead straight.
// Returns an open path along the wave (the stroked line) — callers close it
// down to the strip's bottom for the fill.
function surfaceWave(seed: string, flatten: number): string {
  // FNV-1a hash of the seed → 32-bit state for a tiny deterministic PRNG.
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const rand = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const amp = 3 * (1 - flatten); // viewBox units; 0 at a full jar
  const SEGMENTS = 6;
  const pts = Array.from({ length: SEGMENTS + 1 }, (_, i) => ({
    x: (100 / SEGMENTS) * i,
    y: 5 + (rand() * 2 - 1) * amp,
  }));
  // Quadratic curves through segment midpoints — smooth rolling bumps, no
  // sharp corners.
  let d = `M 0 ${pts[0].y.toFixed(2)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    const my = (pts[i].y + pts[i + 1].y) / 2;
    d += ` Q ${pts[i].x.toFixed(2)} ${pts[i].y.toFixed(2)} ${mx.toFixed(2)} ${my.toFixed(2)}`;
  }
  return d + ` L 100 ${pts[SEGMENTS].y.toFixed(2)}`;
}

export default function JarCard({
  jar,
  onClick,
}: {
  jar: Jar;
  onClick: () => void;
}) {
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

  const closed = jar.status === "CLOSED";
  // Fill toward the goal, clamped — overfilled jars read as full, not broken.
  const pct =
    jar.goal > 0n ? Math.min(100, Number((jar.balance * 100n) / jar.goal)) : 0;

  const wave = useMemo(
    () => surfaceWave(`${jar.chainId}-${jar.address}`, pct / 100),
    [jar.chainId, jar.address, pct],
  );

  return (
    <button
      type="button"
      onClick={onClick}
      // Calmer than block-btn: a subtle hover lift, no press-slam or shadow
      // growth — a whole card jolting on click read as jitter, not snap.
      // No overflow-hidden — the goal notch overhangs the border; the fill
      // rounds its own bottom corners to stay inside the jar silhouette.
      className={`relative flex aspect-square w-60 flex-col rounded-t-xl rounded-b-3xl border-[3px] border-black bg-white p-4 text-left shadow-[0_4px_0_0_#404040] transition-transform duration-100 hover:-translate-y-0.5 focus-visible:-translate-y-0.5 focus-visible:outline-none ${closed ? "opacity-50 grayscale" : ""
        }`}
    >
      {/* The card IS the jar — progress fills its background like jam, with
          a solid surface line. Exact numbers live at the bottom, so an
          empty jar still reads (DESIGN.md). */}
      {pct > 0 && (
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 transition-[height] duration-300"
          // Floored at 24px: below the 22px corner radius the fill degrades
          // into a flat stripe over the card's bottom border. Any non-zero
          // balance reads as a small sliver of jam instead.
          style={{ height: `max(24px, ${(pct / 100) * FULL_LEVEL}%)` }}
        >
          {/* The bumpy surface: a 12px SVG strip — translucent fill under the
              wave plus a solid stroked line along it. preserveAspectRatio
              stretches it to the card width; the stroke stays a constant
              ~3px thanks to non-scaling-stroke. */}
          <svg
            className="absolute inset-x-0 top-0 h-3 w-full"
            viewBox="0 0 100 12"
            preserveAspectRatio="none"
          >
            <path d={`${wave} L 100 12 L 0 12 Z`} fill="#de006f66" />
            <path
              d={wave}
              fill="none"
              stroke="#de006f"
              strokeWidth="3"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          {/* Body of the jam — starts exactly where the strip ends. Both are
              translucent, so any overlap would double the alpha and draw a
              darker stripe across the fill. */}
          <div className="absolute inset-x-0 top-3 bottom-0 rounded-b-[22px] bg-[#de006f66]" />
        </div>
      )}
      {/* Icon floats top-right so the name flows full-width UNDER it on the
          second line — fits ~22 chars instead of being boxed beside the icon.
          overflow-hidden makes this a BFC: it contains the float AND clips the
          name to two lines (max-h ≈ 2 lines of this font size). */}
      <div className="relative max-h-[2.5em] overflow-hidden font-display text-3xl leading-tight [overflow-wrap:anywhere]">
        <span className="float-right ml-2">
          <ChainIcon chainId={jar.chainId} />
        </span>
        {jar.name}
      </div>
      {/* One chunky black notch overhanging the left edge — a mark drawn on
          a real jar. Pure character; the fill line carries the data. */}
      {/* Sits mostly OUTSIDE the jar wall: 12px wide, 8px out / 4px across
          the 3px glass — a tick drawn on the outside of the jar, not a tab
          poking in. */}
      <div
        aria-hidden
        className="absolute -left-2 h-1 w-3 translate-y-1/2 rounded-sm bg-black"
        style={{ bottom: `${FULL_LEVEL}%` }}
      />
      {/* mb clears the fill's 24px minimum sliver — without it the cherry
          surface line strikes through the numbers on a near-empty jar. */}
      <p className="relative mt-auto mb-0.5 truncate text-sm font-bold">
        {decimals === undefined
          ? "…"
          : `${formatUnits(jar.balance, decimals)} / ${formatUnits(jar.goal, decimals)} ${symbol ?? ""}`}
      </p>
    </button>
  );
}
