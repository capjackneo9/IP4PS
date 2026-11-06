"use client";
import type { ReactNode } from "react";
import { useAccount } from "wagmi";
import { PillarsMark } from "./Logo";
import { Skeleton } from "./ui";
import { WalletButton } from "./WalletButton";

/** Renders children only once a wallet is connected. */
export function ConnectGate({ children, title = "Connect your wallet" }: { children: ReactNode; title?: string }) {
  const { isConnected, isConnecting, isReconnecting } = useAccount();
  if (isConnected) return <>{children}</>;
  if (isConnecting || isReconnecting)
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-16">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-40" />
      </div>
    );
  return (
    <div className="mx-auto max-w-lg px-4 py-20">
      <div className="card flex flex-col items-center gap-4 py-10 text-center">
        <PillarsMark className="h-14 w-14" />
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-muted">
          Your wallet is your identity in IP4PS (Pillar 4). It signs your registrations and holds your ownership tokens. IP4PS never
          sees your keys.
        </p>
        <WalletButton big />
        <p className="text-xs text-muted">No wallet yet? Install MetaMask or Coinbase Wallet, then come back.</p>
      </div>
    </div>
  );
}
