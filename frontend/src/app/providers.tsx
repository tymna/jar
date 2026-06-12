"use client";

import "@rainbow-me/rainbowkit/styles.css";

import { PonderProvider } from "@ponder/react";
import { lightTheme, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { WagmiProvider } from "wagmi";

import { ToastProvider } from "@/components/Toast";
import { ponderClient } from "@/lib/ponder";
import { config } from "@/wagmi";

// RainbowKit's modals (connect + account) ship with their own sans-serif;
// align every RainbowKit surface with the app's mono voice and cherry accent.
const rainbowTheme = lightTheme({ accentColor: "#de006f" });
rainbowTheme.fonts.body = "var(--font-space-mono), ui-monospace, monospace";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <PonderProvider client={ponderClient}>
          <RainbowKitProvider theme={rainbowTheme}>
            <ToastProvider>{children}</ToastProvider>
          </RainbowKitProvider>
        </PonderProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
