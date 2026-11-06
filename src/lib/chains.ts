import type { Address, Chain } from "viem";
import { hardhat, mainnet, polygon, polygonAmoy, sepolia } from "viem/chains";

export interface NetworkInfo {
  chain: Chain;
  key: "polygon" | "ethereum" | "sepolia" | "amoy" | "local";
  label: string;
  testnet: boolean;
  /** Registry contract on this network; undefined until deployed and configured. */
  contract?: Address;
  rpcUrl?: string;
  explorer?: string;
  /** Chainlink native/USD price feed, mainnets only. */
  usdFeed?: Address;
  note: string;
}

// Next.js only inlines NEXT_PUBLIC_* variables written out literally, so each one is spelled out here.
const env = {
  polygon: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_POLYGON,
  ethereum: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_ETHEREUM,
  sepolia: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_SEPOLIA,
  amoy: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_AMOY,
  local: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_LOCAL,
};
const rpc = {
  polygon: process.env.NEXT_PUBLIC_RPC_POLYGON,
  ethereum: process.env.NEXT_PUBLIC_RPC_ETHEREUM,
  sepolia: process.env.NEXT_PUBLIC_RPC_SEPOLIA,
  amoy: process.env.NEXT_PUBLIC_RPC_AMOY,
  local: process.env.NEXT_PUBLIC_RPC_LOCAL ?? "http://127.0.0.1:8545",
};

export const ENABLE_TESTNETS = process.env.NEXT_PUBLIC_ENABLE_TESTNETS !== "false";
export const ENABLE_LOCAL = process.env.NEXT_PUBLIC_ENABLE_LOCAL_CHAIN === "true";

const isAddress = (v?: string): v is Address => !!v && /^0x[0-9a-fA-F]{40}$/.test(v);

const all: NetworkInfo[] = [
  {
    chain: polygon,
    key: "polygon",
    label: "Polygon",
    testnet: false,
    contract: isAddress(env.polygon) ? env.polygon : undefined,
    rpcUrl: rpc.polygon,
    explorer: "https://polygonscan.com",
    usdFeed: "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0",
    note: "Recommended — permanent records for cents.",
  },
  {
    chain: mainnet,
    key: "ethereum",
    label: "Ethereum",
    testnet: false,
    contract: isAddress(env.ethereum) ? env.ethereum : undefined,
    rpcUrl: rpc.ethereum,
    explorer: "https://etherscan.io",
    usdFeed: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
    note: "Highest security, highest fees.",
  },
  {
    chain: sepolia,
    key: "sepolia",
    label: "Sepolia",
    testnet: true,
    contract: isAddress(env.sepolia) ? env.sepolia : undefined,
    rpcUrl: rpc.sepolia,
    explorer: "https://sepolia.etherscan.io",
    note: "Ethereum testnet — for trying things out. Records here carry no legal weight.",
  },
  {
    chain: polygonAmoy,
    key: "amoy",
    label: "Polygon Amoy",
    testnet: true,
    contract: isAddress(env.amoy) ? env.amoy : undefined,
    rpcUrl: rpc.amoy,
    explorer: "https://amoy.polygonscan.com",
    note: "Polygon testnet (Mumbai's replacement) — for trying things out.",
  },
  {
    chain: hardhat,
    key: "local",
    label: "Local dev chain",
    testnet: true,
    contract: isAddress(env.local) ? env.local : undefined,
    rpcUrl: rpc.local,
    note: "Your own Hardhat node (npm run chain).",
  },
];

export const NETWORKS: NetworkInfo[] = all.filter(
  (n) => (n.key === "local" ? ENABLE_LOCAL : !n.testnet || ENABLE_TESTNETS),
);

export const networkById = (chainId?: number) => NETWORKS.find((n) => n.chain.id === chainId);
export const networkByKey = (key?: string) => NETWORKS.find((n) => n.key === key);
export const deployedNetworks = () => NETWORKS.filter((n) => n.contract);

export function explorerTx(n: NetworkInfo | undefined, hash: string) {
  return n?.explorer ? `${n.explorer}/tx/${hash}` : undefined;
}
export function explorerAddress(n: NetworkInfo | undefined, address: string) {
  return n?.explorer ? `${n.explorer}/address/${address}` : undefined;
}
export function explorerToken(n: NetworkInfo | undefined, contract: string, tokenId: bigint | number | string) {
  return n?.explorer ? `${n.explorer}/nft/${contract}/${tokenId}` : undefined;
}
