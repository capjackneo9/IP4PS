import type { Metadata } from "next";
import Link from "next/link";
import { PILLARS } from "@/lib/pillars";

export const metadata: Metadata = { title: "Docs", description: "How to use IP4PS, developer reference, and terms, privacy and disclaimer." };

const H2 = ({ id, children }: { id: string; children: React.ReactNode }) => (
  <h2 id={id} className="scroll-mt-24 pt-6 text-2xl font-bold">{children}</h2>
);

export default function Docs() {
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[13rem_1fr]">
      <nav className="text-sm lg:sticky lg:top-24 lg:self-start" aria-label="Docs">
        <ul className="flex flex-wrap gap-2 lg:flex-col">
          {[["guide", "User guide"], ["pillars", "The 4 Pillars"], ["faq", "FAQ"], ["developers", "Developers"], ["legal", "Terms & privacy"]].map(([id, label]) => (
            <li key={id}><a href={`#${id}`} className="chip lg:border-0 lg:bg-transparent lg:px-0 hover:text-primary">{label}</a></li>
          ))}
        </ul>
      </nav>
      <article className="space-y-4 leading-relaxed [&_li]:ml-5 [&_li]:list-disc [&_p]:text-fg/85">
        <h1 className="text-3xl font-extrabold">IP4PS documentation</h1>

        <H2 id="guide">User guide</H2>
        <h3 className="text-lg font-semibold">1. Connect a wallet</h3>
        <p>Install MetaMask, Coinbase Wallet or another wallet, then press <em>Connect Wallet</em>. Add a little of the network&apos;s token for gas: POL on Polygon, ETH on Ethereum. Testnets (Sepolia, Polygon Amoy) use free test tokens from a faucet.</p>
        <h3 className="text-lg font-semibold">2. Protect a work</h3>
        <ul>
          <li>Open <Link href="/protect" className="text-primary">New Protection</Link> and choose Music, Film, Artwork, Podcast, Content or Custom.</li>
          <li>Fill in the details and add your files. Each file is fingerprinted with SHA-256 on your device as soon as you add it.</li>
          <li>Choose storage: <strong>Fingerprint only</strong> keeps files private (only fingerprints go on-chain). <strong>Fingerprint + IPFS</strong> also publishes the files permanently.</li>
          <li>Review, tick the three confirmations and press <em>Register on blockchain</em>. Confirm in your wallet. One transaction activates all four pillars.</li>
        </ul>
        <h3 className="text-lg font-semibold">3. Prove it</h3>
        <ul>
          <li>Download the PDF certificate and JSON backup, and <strong>keep your original files</strong>. A fingerprint proves a file existed; you still need the file to show which one.</li>
          <li>Share the public verification link. Anyone can drop a copy of a file on <Link href="/verify" className="text-primary">Verify</Link> to see who registered it first, and when.</li>
          <li>Grant licenses from a work&apos;s page. Paid licenses activate when the licensee pays on-chain; withdraw fees from your dashboard.</li>
        </ul>

        <H2 id="pillars">The 4 Pillars</H2>
        {PILLARS.map((p) => (
          <p key={p.id}><strong>{p.emoji} P{p.n} {p.name} ({p.tech}).</strong> {p.summary}</p>
        ))}

        <H2 id="faq">FAQ</H2>
        <p><strong>Can a record be deleted or changed?</strong> No. Not by you, not by IP4PS. Ownership can be transferred; the creator, timestamp and fingerprints cannot change.</p>
        <p><strong>I edited my track. Do I register again?</strong> Yes. Any change produces a new fingerprint, so register each version you want to prove.</p>
        <p><strong>What if I lose my wallet?</strong> The records stay on-chain and verifiable, but you cannot license or transfer them without the key. Back up your recovery phrase offline.</p>
        <p><strong>Why do I sign a message before uploading?</strong> With IPFS storage, a free signature (not a transaction) proves to the server that the upload request comes from your wallet, so nobody else can use the deployment&apos;s storage.</p>

        <H2 id="developers">Developers</H2>
        <p>The registry is a single Solidity contract, <code className="font-mono">IP4PSRegistry</code> (ERC-721 Enumerable + ERC-2981, OpenZeppelin 5), deployed once per network.</p>
        <ul className="font-mono text-sm">
          <li>register(kind, subtype, title, metadataURI, bytes32[] fileHashes, royaltyBps) → tokenId</li>
          <li>getIP(tokenId) → (record, fileHashes, owner)</li>
          <li>verifyFourPillars(tokenId) → (synergy, time, elements, celestialBodies)</li>
          <li>tokenOfHash(bytes32) → tokenId (0 = not registered)</li>
          <li>tokensOfOwner(address) → tokenId[]</li>
          <li>grantLicense(tokenId, licensee, durationDays, fee, licenseType, termsURI) → licenseId</li>
          <li>acceptLicense(licenseId) payable · revokeOffer(licenseId) · withdraw()</li>
          <li>getLicense · isLicenseActive · licensesOfToken · licensesOfLicensee</li>
        </ul>
        <p>Kinds: 0 Music, 1 Film, 2 Artwork, 3 Podcast, 4 Content, 5 Custom. A file hash can be registered only once across the whole contract. Metadata follows the ERC-721 JSON schema with an <code className="font-mono">ip4ps</code> extension listing each file&apos;s name, size, type, SHA-256 and optional IPFS CID.</p>
        <p>To verify independently: compute <code className="font-mono">sha256</code> of the file, call <code className="font-mono">tokenOfHash(0x…)</code> on the contract with any RPC, then <code className="font-mono">getIP(tokenId)</code> for the creator and timestamp. Deployment and configuration are described in the repository README.</p>

        <H2 id="legal">Terms, privacy &amp; disclaimer</H2>
        <p><strong>Disclaimer.</strong> IP4PS creates technical evidence: a public, timestamped record that a wallet registered specific file fingerprints. It is not a government copyright or trademark registration, does not grant legal rights, and is not legal advice. How courts weigh blockchain evidence varies by country; consult a lawyer for disputes, and consider formal registration where it adds remedies.</p>
        <p><strong>Your responsibilities.</strong> Register only work you created or have the right to register. Records are public and permanent, so do not put personal or confidential information in titles, descriptions or metadata. You pay network fees; IP4PS charges nothing on top and cannot refund gas.</p>
        <p><strong>Privacy.</strong> IP4PS has no accounts and no database. Your profile and preferences are stored only in your browser. Files are fingerprinted on your device; they leave it only if you choose IPFS storage, in which case they become public. The server sees upload requests (wallet address, file name, size) only to authorise them. No analytics or page-view tracking is collected.</p>
        <p><strong>No warranty.</strong> The software is provided as is. Blockchains, wallets, RPC providers and IPFS gateways are run by third parties and may be unavailable.</p>
      </article>
    </div>
  );
}
