"use client";
import { darkTheme, lightTheme, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { Toaster } from "react-hot-toast";
import { WagmiProvider } from "wagmi";
import { networkByKey } from "@/lib/chains";
import { useApp } from "@/lib/store";
import { wagmiConfig } from "@/lib/wagmi";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } } }),
  );
  const theme = useApp((s) => s.prefs.theme);
  const defaultNetwork = useApp((s) => s.prefs.defaultNetwork);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("ip4ps:theme", theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const rkTheme = (theme === "light" ? lightTheme : darkTheme)({
    accentColor: "#6366F1",
    accentColorForeground: "white",
    borderRadius: "medium",
  });

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={rkTheme} initialChain={networkByKey(defaultNetwork)?.chain} modalSize="compact">
          {children}
          <Toaster
            position="bottom-center"
            toastOptions={{
              style: { background: "var(--surface-solid)", color: "var(--fg)", border: "1px solid var(--line)", borderRadius: "12px" },
            }}
          />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
