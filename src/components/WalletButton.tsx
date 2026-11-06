"use client";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { AlertTriangle, ChevronDown, Wallet } from "lucide-react";
import { useConnect } from "wagmi";
import { networkById } from "@/lib/chains";
import { E2E_MOCK_WALLET } from "@/lib/wagmi";
import { cx } from "./ui";

export function WalletButton({ big = false, label = "Connect Wallet" }: { big?: boolean; label?: string }) {
  const { connect, connectors } = useConnect();
  const mock = E2E_MOCK_WALLET ? connectors.find((c) => c.type === "mock") : undefined;

  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const connected = mounted && account && chain;
        if (!mounted) return <div className={cx("skeleton", big ? "h-12 w-56" : "h-11 w-36")} />;
        if (!connected)
          return (
            <div className="flex gap-2">
              <button type="button" onClick={openConnectModal} className={cx(big ? "btn-gold px-6 text-base" : "btn-primary")}>
                <Wallet className="h-4 w-4" aria-hidden="true" />
                {label}
              </button>
              {mock && (
                <button type="button" className="btn-ghost" onClick={() => connect({ connector: mock })} data-testid="connect-test-wallet">
                  Test wallet
                </button>
              )}
            </div>
          );
        const net = networkById(chain.id);
        const notDeployed = net && !net.contract;
        return (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openChainModal}
              className={cx("btn-ghost px-3", (chain.unsupported || notDeployed) && "border-accent/60 text-accent")}
              title={chain.unsupported ? "Unsupported network" : notDeployed ? `IP4PS is not deployed on ${net.label} yet` : chain.name}
            >
              {chain.unsupported || notDeployed ? (
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-success shadow-[0_0_8px] shadow-success" aria-hidden="true" />
              )}
              <span className="hidden sm:inline">{chain.unsupported ? "Wrong network" : (net?.label ?? chain.name)}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
            </button>
            <button type="button" onClick={openAccountModal} className="btn-ghost px-3 font-mono" data-testid="account-button">
              {account.displayName}
            </button>
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
