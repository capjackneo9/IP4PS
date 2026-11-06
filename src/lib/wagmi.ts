"use client";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  coinbaseWallet,
  injectedWallet,
  ledgerWallet,
  metaMaskWallet,
  rainbowWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import type { Chain } from "viem";
import { createConfig, http, type CreateConnectorFn } from "wagmi";
import { mock } from "wagmi/connectors";
import { NETWORKS } from "./chains";

export const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";
/** Test-only wallet for automated browser tests against the local chain. Never enable in production. */
export const E2E_MOCK_WALLET = process.env.NEXT_PUBLIC_E2E_MOCK_WALLET === "true";

const appInfo = { appName: "IP4PS", projectId: WALLETCONNECT_PROJECT_ID || "walletconnect-not-configured" };

// MetaMask mobile, Rainbow, Ledger Live and WalletConnect all relay through WalletConnect,
// so they are offered only when a WalletConnect project ID is configured.
const walletConnectors = connectorsForWallets(
  WALLETCONNECT_PROJECT_ID
    ? [
        { groupName: "Popular", wallets: [metaMaskWallet, coinbaseWallet, rainbowWallet, walletConnectWallet] },
        { groupName: "Hardware & more", wallets: [ledgerWallet, injectedWallet] },
      ]
    : [{ groupName: "Available", wallets: [injectedWallet, coinbaseWallet] }],
  appInfo,
);

const chains = NETWORKS.map((n) => n.chain) as [Chain, ...Chain[]];

const connectors: CreateConnectorFn[] = [...walletConnectors];
if (E2E_MOCK_WALLET) {
  // Hardhat's first development account; the local node signs for it.
  connectors.push(mock({ accounts: ["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"], features: { reconnect: true } }));
}

export const wagmiConfig = createConfig({
  chains,
  connectors,
  transports: Object.fromEntries(NETWORKS.map((n) => [n.chain.id, http(n.rpcUrl, { batch: true })])),
  ssr: true,
});
