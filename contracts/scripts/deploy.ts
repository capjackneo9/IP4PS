/**
 * Deploys IP4PSRegistry and records the address in contracts/deployments/<chainId>.json.
 *
 *   NETWORK=local   npm run contracts:deploy          # Hardhat dev chain from `npm run chain` (uses its first test account)
 *   NETWORK=amoy    DEPLOYER_PRIVATE_KEY=0x… npm run contracts:deploy
 *   NETWORK=polygon DEPLOYER_PRIVATE_KEY=0x… RPC_URL=https://… npm run contracts:deploy
 *
 * NETWORK: local | sepolia | amoy | polygon | ethereum. RPC_URL overrides the chain's default public RPC.
 * After deploying, put the address in the matching NEXT_PUBLIC_CONTRACT_ADDRESS_* variable.
 */
import fs from "node:fs";
import path from "node:path";
import { createPublicClient, createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat, mainnet, polygon, polygonAmoy, sepolia } from "viem/chains";

const chains = { local: hardhat, sepolia, amoy: polygonAmoy, polygon, ethereum: mainnet } as const;
// Hardhat's well-known first development account. Never holds real funds; local chain only.
const HARDHAT_DEV_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

async function main() {
  const name = (process.env.NETWORK ?? "local") as keyof typeof chains;
  const chain = chains[name];
  if (!chain) throw new Error(`Unknown NETWORK "${name}". Use one of: ${Object.keys(chains).join(", ")}`);

  const key = (process.env.DEPLOYER_PRIVATE_KEY ?? (name === "local" ? HARDHAT_DEV_KEY : undefined)) as Hex | undefined;
  if (!key) throw new Error("Set DEPLOYER_PRIVATE_KEY for non-local networks.");

  const root = path.resolve(__dirname, "..", "..");
  const artifactPath = path.join(root, "contracts", "artifacts", "IP4PSRegistry.json");
  if (!fs.existsSync(artifactPath)) throw new Error("Run `npm run contracts:compile` first.");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const transport = http(process.env.RPC_URL ?? chain.rpcUrls.default.http[0]);
  const account = privateKeyToAccount(key);
  const pub = createPublicClient({ chain, transport });
  const wallet = createWalletClient({ chain, transport, account });

  const balance = await pub.getBalance({ address: account.address });
  console.log(`Deploying to ${chain.name} (${chain.id}) from ${account.address}, balance ${balance} wei`);
  if (balance === 0n) throw new Error("Deployer has no funds for gas.");

  const hash = await wallet.deployContract({ abi: artifact.abi, bytecode: artifact.bytecode });
  console.log(`Transaction ${hash}, waiting for confirmation…`);
  const receipt = await pub.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success" || !receipt.contractAddress) throw new Error("Deployment failed.");

  const out = {
    chainId: chain.id,
    network: chain.name,
    address: receipt.contractAddress,
    transactionHash: hash,
    blockNumber: Number(receipt.blockNumber),
    deployer: account.address,
    compiler: artifact.compiler,
    deployedAt: new Date().toISOString(),
  };
  const dir = path.join(root, "contracts", "deployments");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${chain.id}.json`), JSON.stringify(out, null, 2));
  console.log(`IP4PSRegistry deployed at ${receipt.contractAddress} (block ${receipt.blockNumber})`);
  const envName = { local: "LOCAL", sepolia: "SEPOLIA", amoy: "AMOY", polygon: "POLYGON", ethereum: "ETHEREUM" }[name];
  console.log(`Set NEXT_PUBLIC_CONTRACT_ADDRESS_${envName}=${receipt.contractAddress}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
