# IP4PS — Intellectual Property 4 Pillars System

**Protect. Prove. Prosper.** Blockchain-backed IP protection for independent artists.

IP4PS lets musicians, filmmakers, digital artists, podcasters and creators register their work on-chain without a lawyer or any code. Every file is fingerprinted (SHA-256) **on the artist's device**. A single wallet transaction then records all four pillars:

| Pillar | Technology | What it proves |
|---|---|---|
| **P1 Synergy** | Smart contract (`IP4PSRegistry`) | Ties the record together and runs self-executing licenses |
| **P2 Time** | Block timestamp + block number | When the work existed. It cannot be backdated |
| **P3 Elements** | ERC-721 token + ERC-2981 royalty | Transferable ownership of the work |
| **P4 Celestial Bodies** | The creator's wallet signature | Who registered it |

A file fingerprint can be registered **only once**, so the earliest registration wins. Anyone can drop a copy of a file on `/verify` and see who registered it and when.

## Features
- **Six content flows:** Music (single and album), Film (short and feature, with credits), Artwork, Podcast (episode and series), Content (YouTube, articles, courses…) and Custom (advanced: manual hash entry, custom metadata, multi-creator shares).
- **Two storage modes:** *fingerprint only*, where files never leave the device, or *fingerprint + IPFS*, where files go via Pinata to public, permanent storage. Uploads go straight from the browser to Pinata through one-time signed URLs, and the Pinata key stays on the server.
- **Wizard:** live hashing progress, a duplicate check against the chain, gas and USD estimate (Chainlink price feeds on mainnets), real-time transaction tracking, then a success screen with confetti.
- **My IP library:** grid and list views, filters, search, sort, across every network that has the contract deployed.
- **Work page and public verification page:** pillar status read live from the contract, file list with IPFS view and download, a "check a file" drop zone, QR code, PDF certificate, JSON backup, and sharing.
- **Licensing:** free licenses are active at once. Paid licenses activate when the licensee pays on-chain, and the licensor withdraws the fees (pull payments). Offers can be revoked.
- **Other pages:** dashboard (stats, activity, licensing inbox, achievements), analytics (growth, type and network distribution, gas actually spent, licensing), and settings (profile, P4 identity level, network, IPFS, security, data export).
- **Design:** dark and light themes, glass UI, responsive with a mobile bottom nav, keyboard and screen-reader friendly. The app has no accounts, no database and no tracking.

## Stack
Next.js 15 (App Router, TypeScript) · React 19 · Tailwind CSS 4 · wagmi 2 + viem + RainbowKit · TanStack Query · Zustand · Motion · Solidity 0.8.28 + OpenZeppelin 5 · Hardhat (local chain) · Pinata (IPFS) · jsPDF · Vitest · Playwright.

## Quick start (local, no real money)
```bash
npm install
cp .env.example .env.local
```
In one terminal, start a local chain:
```bash
npm run chain
```
In another, deploy and run:
```bash
npm run contracts:compile && NETWORK=local npm run contracts:deploy
```
Put the printed address in `.env.local` as `NEXT_PUBLIC_CONTRACT_ADDRESS_LOCAL` and set `NEXT_PUBLIC_ENABLE_LOCAL_CHAIN=true`, then:
```bash
npm run dev
```
Open http://localhost:3100. In MetaMask, add the network `http://127.0.0.1:8545` (chain ID 31337) and import a Hardhat test account. Never send real funds to those accounts.

## Going live
1. **Deploy the contract**, ideally to Polygon Amoy (testnet) first, then Polygon:
   ```bash
   NETWORK=amoy DEPLOYER_PRIVATE_KEY=0x… npm run contracts:deploy
   ```
   The deployer needs a little POL for gas. The address is saved in `contracts/deployments/<chainId>.json`.
2. **Configure** `NEXT_PUBLIC_CONTRACT_ADDRESS_*`, `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`, `PINATA_JWT`, `NEXT_PUBLIC_SITE_URL` and ideally private RPC URLs (see `.env.example`).
3. **Host** on Vercel or any Node host (`npm run build && npm start`).
4. Optionally verify the contract source on PolygonScan/Etherscan (Solidity 0.8.28, optimizer 200 runs, viaIR, EVM `cancun`).

## Scripts
| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js on port 3100 |
| `npm run lint` · `npm run typecheck` | ESLint · TypeScript |
| `npm test` | Unit tests: hashing, form validation, file ordering, metadata |
| `npm run contracts:compile` | Compiles with bundled solc-js and regenerates `src/lib/contract/abi.ts` |
| `npm run contracts:test` | Contract tests on Hardhat's in-process chain |
| `npm run chain` | Local Hardhat node on :8545 |
| `npm run contracts:deploy` | Deploys to `NETWORK` (local, sepolia, amoy, polygon, ethereum) |
| `npm run stub:ipfs` | **Test-only** local stand-in for Pinata and an IPFS gateway on :8098 |
| `npm run test:e2e` | Browser test of the full flow (see below) |

### End-to-end test
Run a local chain and the IPFS stub, deploy, then start the app with these settings: `NEXT_PUBLIC_ENABLE_LOCAL_CHAIN=true`, the local contract address, `NEXT_PUBLIC_E2E_MOCK_WALLET=true`, `NEXT_PUBLIC_IPFS_GATEWAY=http://127.0.0.1:8098/ipfs/`, `PINATA_JWT=test`, and `PINATA_UPLOAD_BASE`/`PINATA_API_BASE=http://127.0.0.1:8098`. Then run `npm run test:e2e`. The test registers a single with IPFS storage, then checks the library, the detail page, public verification, file lookup, altered-file and duplicate rejection, every page, and mobile layout.

## Project layout
```
contracts/IP4PSRegistry.sol    the registry (ERC-721 Enumerable + ERC-2981 + licensing)
contracts/scripts/             compile + deploy
contracts/test/                contract tests
src/app/                       pages and the /api/ipfs routes
src/components/protect/        the protection wizard
src/components/work/           work detail, public verification, licensing
src/lib/                       chains, content types, hashing, metadata, contract reads, IPFS client, certificate
tests/                         unit tests and the e2e flow + Pinata stub
```

## Important limits
- IP4PS produces strong technical evidence. It is **not** a government copyright registration or legal advice.
- Email, social-account and KYC verification for P4 would need a third-party attestation service. They are shown in Settings as not part of this release.
- Page views are deliberately not tracked, so analytics show on-chain facts only.
- Wallet sign-in for uploads verifies EOA signatures. Smart-contract wallets (e.g. Safe) can register on-chain but cannot use IPFS uploads yet.
