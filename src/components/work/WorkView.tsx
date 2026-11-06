"use client";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, ExternalLink, Eye, Loader2, Send } from "lucide-react";
import Link from "next/link";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { isAddress, type Address, type Hex } from "viem";
import { useAccount } from "wagmi";
import { explorerAddress, explorerToken, explorerTx, type NetworkInfo } from "@/lib/chains";
import type { CertificateData } from "@/lib/certificate";
import { contentType } from "@/lib/content-types";
import { abi, fetchPillars, fetchRegistrationTx, fetchTokenLicenses, fetchWork, verifyPath, type Work } from "@/lib/contract/registry";
import { formatBytes, formatDuration, formatUtc, shortHex, timeAgo } from "@/lib/format";
import { sha256File } from "@/lib/hash";
import { gatewayUrl } from "@/lib/metadata";
import { useTx } from "@/lib/useTx";
import { PillarGrid } from "../Pillars";
import { ShareActions } from "../ShareActions";
import { EmptyState, FileDrop, Modal, Mono, Notice, Progress, Skeleton } from "../ui";
import { WorkThumb } from "../WorkCard";
import { Licensing } from "./Licensing";

function Media({ work }: { work: Work }) {
  const primary = work.metadata?.ip4ps.files.find((f) => f.cid && (f.mime.startsWith("audio/") || f.mime.startsWith("video/")));
  if (!primary?.cid) return null;
  const src = gatewayUrl(primary.cid);
  return primary.mime.startsWith("audio/") ? (
    <audio controls preload="none" src={src} className="mt-3 w-full" aria-label={`Play ${primary.name}`} />
  ) : (
    <video controls preload="none" src={src} className="mt-3 w-full rounded-xl" aria-label={`Play ${primary.name}`} />
  );
}

function FileCheck({ work }: { work: Work }) {
  const [state, setState] = useState<{ name: string; progress: number; hash?: Hex }>();
  const match = state?.hash ? work.fileHashes.some((h) => h.toLowerCase() === state.hash!.toLowerCase()) : undefined;
  return (
    <div>
      <FileDrop
        id="check-file"
        compact
        label="Check a file against this record"
        hint="Your file is fingerprinted on this device and never uploaded"
        onFiles={async ([f]) => {
          setState({ name: f.name, progress: 0 });
          const hash = await sha256File(f, (p) => setState({ name: f.name, progress: p }));
          setState({ name: f.name, progress: 1, hash });
        }}
      />
      {state && (
        <div className="mt-2 text-sm" aria-live="polite">
          {!state.hash ? (
            <Progress value={state.progress} />
          ) : match ? (
            <Notice tone="success">✅ <strong>{state.name}</strong> matches a fingerprint in this record exactly.</Notice>
          ) : (
            <Notice tone="danger">❌ <strong>{state.name}</strong> does not match any file in this record (SHA-256 {shortHex(state.hash, 10, 6)}). Even a re-encoded or edited copy produces a different fingerprint.</Notice>
          )}
        </div>
      )}
    </div>
  );
}

function Transfer({ work, open, onClose }: { work: Work; open: boolean; onClose: () => void }) {
  const [to, setTo] = useState("");
  const { run, pending } = useTx();
  return (
    <Modal open={open} onClose={onClose} title="Transfer ownership">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const ok = await run("Transfer", {
            address: work.contract,
            abi,
            functionName: "safeTransferFrom",
            args: [work.owner, to as Address, work.tokenId],
            chainId: work.network.chain.id,
          });
          if (ok) onClose();
        }}
      >
        <Notice tone="warn">The new owner controls the token and future licensing. The original creator and timestamp stay on record forever.</Notice>
        <label className="block">
          <span className="label">Recipient wallet</span>
          <input className="input font-mono" value={to} onChange={(e) => setTo(e.target.value.trim())} placeholder="0x…" required />
        </label>
        <button type="submit" className="btn-primary w-full" disabled={!isAddress(to) || to.toLowerCase() === work.owner.toLowerCase() || !!pending}>
          <Send className="h-4 w-4" /> Transfer token
        </button>
      </form>
    </Modal>
  );
}

export function WorkView({ network, tokenId, mode }: { network?: NetworkInfo; tokenId?: bigint; mode: "owner" | "public" }) {
  const { address } = useAccount();
  const [transfer, setTransfer] = useState(false);
  const [qr, setQr] = useState<string>();
  const enabled = !!network?.contract && tokenId !== undefined;
  const work = useQuery({ queryKey: ["work", network?.chain.id, tokenId?.toString()], enabled, queryFn: () => fetchWork(network!, tokenId!) });
  const pillars = useQuery({ queryKey: ["pillars", network?.chain.id, tokenId?.toString()], enabled, queryFn: () => fetchPillars(network!, tokenId!) });
  const tx = useQuery({
    queryKey: ["regtx", work.data?.key],
    enabled: !!work.data,
    queryFn: () => fetchRegistrationTx(network!, tokenId!, work.data!.blockNumber),
  });
  const licenses = useQuery({ queryKey: ["licenses", work.data?.key], enabled: !!work.data, queryFn: () => fetchTokenLicenses(network!, tokenId!) });

  const url = typeof window !== "undefined" && network && tokenId !== undefined ? `${window.location.origin}${verifyPath(network.chain.id, tokenId)}` : "";
  useEffect(() => {
    if (url && mode === "public") QRCode.toDataURL(url, { margin: 1, width: 240 }).then(setQr).catch(() => undefined);
  }, [url, mode]);

  if (!network) return <div className="mx-auto max-w-3xl px-4 py-16"><EmptyState icon="⛓️" title="Unknown network">This link points to a network IP4PS does not support.</EmptyState></div>;
  if (!network.contract) return <div className="mx-auto max-w-3xl px-4 py-16"><EmptyState icon="⛓️" title={`Not deployed on ${network.label}`}>No IP4PS registry is configured for this network.</EmptyState></div>;
  if (work.isLoading)
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-8">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-56" />
        <Skeleton className="h-40" />
      </div>
    );
  if (work.error || !work.data)
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState icon="❌" title="Verification failed" action={<Link href="/verify" className="btn-ghost">Verify something else</Link>}>
          Token #{tokenId?.toString()} is not registered on {network.label}.
        </EmptyState>
      </div>
    );

  const w = work.data;
  const m = w.metadata;
  const def = contentType(w.type);
  const p = pillars.data;
  const allOk = p && p.synergy && p.time && p.elements && p.celestialBodies;
  const isOwner = address?.toLowerCase() === w.owner.toLowerCase();
  const isCreator = address?.toLowerCase() === w.creator.toLowerCase();
  const txHash = tx.data;
  const metaFiles = m?.ip4ps.files ?? [];
  const details = m?.ip4ps.details ?? {};

  const cert: CertificateData = {
    title: w.title,
    typeLabel: `${def.label} — ${def.subtypes.find((s) => s.id === w.subtype)?.label ?? w.subtype}`,
    creatorName: m?.ip4ps.creator.name ?? "",
    creator: w.creator,
    owner: w.owner,
    tokenId: w.tokenId.toString(),
    network: network.label,
    chainId: network.chain.id,
    contract: w.contract,
    txHash,
    blockNumber: w.blockNumber.toString(),
    registeredAt: w.registeredAt,
    files: w.fileHashes.map((h, i) => ({ name: metaFiles.find((f) => f.sha256.toLowerCase() === h.toLowerCase())?.name ?? `File ${i + 1}`, sha256: h })),
    verifyUrl: url,
    pillars: p ?? { synergy: false, time: false, elements: false, celestialBodies: false },
  };

  const timeline: { at: Date; text: string }[] = [
    { at: w.registeredAt, text: `Registered on ${network.label} — block ${w.blockNumber.toLocaleString()}` },
    ...(licenses.data ?? []).flatMap((l) => (l.startsAt ? [{ at: l.startsAt, text: `${l.licenseType} license #${l.id} activated for ${shortHex(l.licensee)}` }] : [])),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());
  if (w.owner.toLowerCase() !== w.creator.toLowerCase()) timeline.unshift({ at: new Date(), text: `Now owned by ${shortHex(w.owner)} (transferred from the creator)` });

  const facts: [string, string | undefined][] = [
    ["Type", `${def.emoji} ${def.label} · ${def.subtypes.find((s) => s.id === w.subtype)?.label ?? w.subtype}`],
    ["Creator", m?.ip4ps.creator.name],
    ["Genre", details.genre],
    ["Duration", formatDuration(Number(details.duration))],
    ["Release date", details.releaseDate ?? details.creationDate],
    ["Token ID", `#${w.tokenId}`],
    ["Royalty", w.royaltyBps ? `${w.royaltyBps / 100}%` : "None"],
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-8">
      {mode === "owner" ? (
        <Link href="/library" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg"><ArrowLeft className="h-4 w-4" /> Back to library</Link>
      ) : (
        <div className="text-center">
          <p className="text-sm font-semibold tracking-wide text-muted uppercase">IP verification</p>
          <div className={`mx-auto mt-3 inline-flex items-center gap-2 rounded-full px-5 py-2 text-lg font-bold ${allOk ? "bg-success/15 text-success" : p ? "bg-danger/15 text-danger" : "bg-surface-2"}`} data-testid="verification-badge">
            {p ? (allOk ? "✅ All 4 Pillars verified" : "❌ Verification failed") : <><Loader2 className="h-5 w-5 animate-spin" /> Verifying…</>}
          </div>
        </div>
      )}

      <section className="card grid gap-5 md:grid-cols-[14rem_1fr]">
        <div>
          <WorkThumb work={w} className="aspect-square w-full" />
          <Media work={w} />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold sm:text-3xl">{w.title}</h1>
          {m?.description && <p className="mt-2 text-sm text-muted">{m.description}</p>}
          <dl className="mt-4 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
            {facts.filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 border-b border-line py-1">
                <dt className="text-muted">{k}</dt>
                <dd className="text-right">{v}</dd>
              </div>
            ))}
          </dl>
          {m?.ip4ps.items?.length ? (
            <div className="mt-4">
              <p className="label">{def.collection?.(w.subtype)?.itemLabel ?? "Item"}s</p>
              <ol className="space-y-1 text-sm">
                {m.ip4ps.items.map((it, i) => <li key={i}>{i + 1}. {it.title} {it.duration && <span className="text-muted">({formatDuration(Number(it.duration))})</span>}</li>)}
              </ol>
            </div>
          ) : null}
          {m?.ip4ps.credits?.length ? (
            <p className="mt-3 text-sm"><span className="text-muted">Credits: </span>{m.ip4ps.credits.map((c) => `${c.name} (${c.role})`).join(", ")}</p>
          ) : null}
          {w.metadataError && <p className="mt-3 text-xs text-accent">Metadata could not be loaded ({w.metadataError}). The on-chain record below is unaffected.</p>}
        </div>
      </section>

      <section className="card">
        <h2 className="mb-3 font-semibold">🏛️ 4 Pillars status</h2>
        <PillarGrid
          status={p ? { synergy: p.synergy, time: p.time, elements: p.elements, celestialBodies: p.celestialBodies } : {}}
          details={{
            synergy: <>Registry contract <Mono value={w.contract} /></>,
            time: <>Registered {formatUtc(w.registeredAt)} ({timeAgo(w.registeredAt)}) · block {w.blockNumber.toLocaleString()}</>,
            elements: <>Token #{w.tokenId.toString()} on {network.label} · owner <Mono value={w.owner} />{isOwner && " (you)"}</>,
            celestialBodies: (
              <>
                Creator <Mono value={w.creator} />{isCreator && " (you)"}
                {m?.ip4ps.creator.socials && (
                  <span className="mt-1 block text-xs text-muted">
                    Declared: {Object.entries(m.ip4ps.creator.socials).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                  </span>
                )}
              </>
            ),
          }}
        />
      </section>

      <section className="card">
        <h2 className="font-semibold">📊 File information ({w.fileHashes.length})</h2>
        <ul className="mt-3 divide-y divide-line">
          {w.fileHashes.map((h, i) => {
            const f = metaFiles.find((x) => x.sha256.toLowerCase() === h.toLowerCase());
            return (
              <li key={h} className="py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{i === 0 && <span className="chip mr-2 py-0.5 text-[10px]">Primary</span>}{f?.name ?? `File ${i + 1}`} {f && <span className="text-xs text-muted">({formatBytes(f.size)})</span>}</p>
                  {f?.cid && (
                    <span className="flex gap-1">
                      <a className="btn-ghost min-h-8 px-2 text-xs" href={gatewayUrl(f.cid)} target="_blank" rel="noreferrer"><Eye className="h-3.5 w-3.5" /> View</a>
                      <a className="btn-ghost min-h-8 px-2 text-xs" href={`${gatewayUrl(f.cid)}?download=true&filename=${encodeURIComponent(f.name)}`} target="_blank" rel="noreferrer"><Download className="h-3.5 w-3.5" /> Download</a>
                    </span>
                  )}
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted">SHA-256 <Mono value={h} head={12} tail={8} /> <span className="text-success">✓ on-chain</span></p>
                {f?.cid && <p className="text-xs text-muted">IPFS <Mono value={`ipfs://${f.cid}`} head={14} tail={6} /></p>}
              </li>
            );
          })}
        </ul>
        <div className="mt-4">
          <p className="label">Check a file</p>
          <FileCheck work={w} />
        </div>
      </section>

      <section className="card">
        <h2 className="font-semibold">🔗 Blockchain verification</h2>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row">
          <div className="flex-1 space-y-2 text-sm">
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-muted">Transaction</span>
              {txHash ? <Mono value={txHash} /> : tx.isLoading ? "…" : "not found"}
              {txHash && explorerTx(network, txHash) && <a href={explorerTx(network, txHash)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">Explorer <ExternalLink className="h-3 w-3" /></a>}
            </p>
            {explorerToken(network, w.contract, w.tokenId) && (
              <p><a href={explorerToken(network, w.contract, w.tokenId)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">Token on explorer <ExternalLink className="h-3 w-3" /></a></p>
            )}
            {explorerAddress(network, w.contract) && (
              <p><a href={explorerAddress(network, w.contract)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">Contract on explorer <ExternalLink className="h-3 w-3" /></a></p>
            )}
            <div className="pt-2"><ShareActions cert={cert} /></div>
          </div>
          {qr && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="QR code linking to this verification page" className="h-36 w-36 self-center rounded-xl bg-white p-2" />
          )}
        </div>
      </section>

      <Licensing work={w} />

      <section className="card">
        <h2 className="font-semibold">📈 Activity timeline</h2>
        <ol className="mt-3 space-y-3 border-l border-line pl-4 text-sm">
          {timeline.map((t, i) => (
            <li key={i} className="relative">
              <span className="absolute top-1.5 -left-[21px] h-2.5 w-2.5 rounded-full bg-brand" aria-hidden="true" />
              <p>{t.text}</p>
              <p className="text-xs text-muted">{formatUtc(t.at)} · {timeAgo(t.at)}</p>
            </li>
          ))}
        </ol>
      </section>

      {mode === "owner" && isOwner && (
        <div className="flex flex-wrap justify-end gap-2">
          <Link href={verifyPath(network.chain.id, w.tokenId)} className="btn-ghost">Public page</Link>
          <button type="button" className="btn-ghost" onClick={() => setTransfer(true)}><Send className="h-4 w-4" /> Transfer</button>
        </div>
      )}
      {mode === "owner" && isOwner && <Transfer work={w} open={transfer} onClose={() => setTransfer(false)} />}
      {mode === "public" && (
        <p className="text-center text-xs text-muted">
          This page reads directly from the {network.label} blockchain. IP4PS cannot change or delete the record.
          Details and files are declared by the registrant; the chain proves who registered them and when.
        </p>
      )}
    </div>
  );
}
