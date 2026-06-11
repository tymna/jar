"use client";

import "@rainbow-me/rainbowkit/styles.css";

import { PonderProvider } from "@ponder/react";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { WagmiProvider } from "wagmi";

import { ponderClient } from "@/lib/ponder";
import { config } from "@/wagmi";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <PonderProvider client={ponderClient}>
          <RainbowKitProvider>{children}</RainbowKitProvider>
        </PonderProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
