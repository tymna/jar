import { arbitrum, base, mainnet, optimism, sepolia } from "wagmi/chains";

import { config } from "@/wagmi";

// Hand-simplified monochrome chain marks — full-color brand logos would
// shout over the neutrals-first palette (DESIGN.md). The chip is a small
// coin: white circle, black outline, black glyph. Cards show the chip;
// the jar modal shows the full chain name.
const glyphs: Record<number, React.ReactNode> = {
  // ethereum — the double diamond
  [mainnet.id]: (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
      <path d="M12 2 5.1 12.3l6.9 4.1 6.9-4.1L12 2Z" />
      <path d="m5.1 13.7 6.9 8.3 6.9-8.3-6.9 4.1-6.9-4.1Z" />
    </svg>
  ),
  // sepolia — the same diamond, hollow: test-eth
  [sepolia.id]: (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3.2 6.2 11.9l5.8 3.4 5.8-3.4L12 3.2Z" />
      <path d="m6.6 14.8 5.4 6.4 5.4-6.4-5.4 3.2-5.4-3.2Z" />
    </svg>
  ),
  // base — circle with the left slot
  [base.id]: (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
      <path d="M12 3a9 9 0 1 1-8.94 10.1H10v-2.2H3.06A9 9 0 0 1 12 3Z" />
    </svg>
  ),
  // optimism — the brand is literally the letters
  [optimism.id]: <span className="text-[10px] font-bold">op</span>,
  // arbitrum — twin rising wedges
  [arbitrum.id]: (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
      <path d="M4.5 19.5 10.7 4l1.9 4.6-4.4 10.9H4.5Z" />
      <path d="m13.7 11.2 1.9-4.7 6 13h-3.9l-4-8.3Z" />
    </svg>
  ),
};

export default function ChainIcon({ chainId }: { chainId: number }) {
  const name = config.chains.find((c) => c.id === chainId)?.name;
  return (
    <span
      title={name ?? `chain ${chainId}`}
      className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-black bg-white"
    >
      {glyphs[chainId] ?? <span className="text-[10px] font-bold">?</span>}
    </span>
  );
}
