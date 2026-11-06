"use client";
import { motion } from "motion/react";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import type { Address } from "viem";
import { explorerTx } from "@/lib/chains";
import type { CertificateData } from "@/lib/certificate";
import { contentType } from "@/lib/content-types";
import { verifyPath } from "@/lib/contract/registry";
import { formatUtc } from "@/lib/format";
import type { IP4PSMetadata } from "@/lib/metadata";
import { PILLARS } from "@/lib/pillars";
import { Confetti } from "../Confetti";
import { ShareActions } from "../ShareActions";
import { Mono } from "../ui";
import type { Registration } from "./RegisterStep";

export function SuccessStep({ reg, metadata, wallet, onAnother }: { reg: Registration; metadata: IP4PSMetadata; wallet: Address; onAnother: () => void }) {
  const def = contentType(metadata.ip4ps.type);
  const url = typeof window !== "undefined" ? `${window.location.origin}${verifyPath(reg.network.chain.id, reg.tokenId)}` : "";
  const cert: CertificateData = {
    title: metadata.name,
    typeLabel: `${def.label} — ${def.subtypes.find((s) => s.id === metadata.ip4ps.subtype)?.label ?? metadata.ip4ps.subtype}`,
    creatorName: metadata.ip4ps.creator.name,
    creator: wallet,
    owner: wallet,
    tokenId: reg.tokenId.toString(),
    network: reg.network.label,
    chainId: reg.network.chain.id,
    contract: reg.network.contract!,
    txHash: reg.txHash,
    blockNumber: reg.blockNumber.toString(),
    registeredAt: reg.registeredAt,
    files: metadata.ip4ps.files.map((f) => ({ name: f.name, sha256: f.sha256, cid: f.cid })),
    verifyUrl: url,
    pillars: { synergy: true, time: true, elements: true, celestialBodies: true },
  };
  const txUrl = explorerTx(reg.network, reg.txHash);

  return (
    <div className="space-y-5">
      <Confetti />
      <div className="text-center">
        <h2 className="text-2xl font-bold sm:text-3xl">🎉 IP protection registered!</h2>
        <p className="mt-1 text-muted">✨ Your work is now protected by the blockchain.</p>
      </div>

      <section className="card bg-gradient-to-br from-primary/15 via-secondary/10 to-accent/10">
        <p className="text-center text-lg font-bold">🏛️ 4 Pillars activated</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PILLARS.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 16, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.18 }}
              className="rounded-xl border border-success/40 bg-success/10 p-3 text-center"
            >
              <p className="text-2xl" aria-hidden="true">{p.emoji}</p>
              <p className="text-sm font-semibold">✅ {p.name}</p>
              <p className="text-xs text-muted">{["Contract record", "Timestamp recorded", "NFT minted", "Identity verified"][i]}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="card">
        <h3 className="font-semibold">📄 Protection details</h3>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-3"><dt className="text-muted">Title</dt><dd className="text-right font-medium">{metadata.name}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-muted">Token ID</dt><dd className="font-mono" data-testid="token-id">#{reg.tokenId.toString()}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-muted">Registered</dt><dd className="font-mono">{formatUtc(reg.registeredAt)}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-muted">Block</dt><dd className="font-mono">{reg.blockNumber.toLocaleString()}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-muted">Gas used</dt><dd className="font-mono">{reg.gasUsed.toLocaleString()}</dd></div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <dt className="text-muted">Transaction</dt>
            <dd className="flex items-center gap-2">
              <Mono value={reg.txHash} />
              {txUrl && <a href={txUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">Explorer <ExternalLink className="h-3 w-3" /></a>}
            </dd>
          </div>
        </dl>
      </section>

      <section className="card">
        <h3 className="font-semibold">🔗 Verification</h3>
        <p className="mt-1 mb-3 text-sm text-muted">Anyone can verify your ownership — no wallet needed.</p>
        <ShareActions cert={cert} />
      </section>

      <section className="card text-sm">
        <h3 className="font-semibold">📱 Next steps</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
          <li>View your protected work in My IP</li>
          <li>Set up licensing terms from the work&apos;s page</li>
          <li>Keep the PDF certificate and JSON backup somewhere safe — and keep your original files: they are what the fingerprints prove</li>
        </ul>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <Link href="/dashboard" className="btn-ghost">Go to dashboard</Link>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href={`/library/${reg.network.chain.id}/${reg.tokenId}`} className="btn-ghost">View in My IP</Link>
          <button type="button" className="btn-primary" onClick={onAnother}>Protect another item</button>
        </div>
      </div>
    </div>
  );
}
