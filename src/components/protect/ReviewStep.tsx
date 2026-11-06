"use client";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Fingerprint, Loader2 } from "lucide-react";
import { useState } from "react";
import { formatEther, type Address, type Hex } from "viem";
import { useSwitchChain } from "wagmi";
import { deployedNetworks, networkById } from "@/lib/chains";
import { contentType, kindIndex } from "@/lib/content-types";
import { abi, clientFor, nativeUsdPrice } from "@/lib/contract/registry";
import { formatDuration, shortHex } from "@/lib/format";
import { estimateRegisterGas } from "@/lib/gas";
import type { IP4PSMetadata } from "@/lib/metadata";
import { useApp } from "@/lib/store";
import { creatorName, orderedFiles, type Draft } from "@/lib/wizard";
import { formatCost } from "../landing/CostCalculator";
import { PillarGrid } from "../Pillars";
import { Mono, Notice } from "../ui";

export interface RegisterArgs {
  kind: number;
  subtype: string;
  title: string;
  metadataURI: string;
  fileHashes: Hex[];
  royaltyBps: bigint;
}

export const registerArgs = (draft: Draft, metadataURI: string): RegisterArgs => ({
  kind: kindIndex(draft.type!),
  subtype: draft.subtype,
  title: (draft.fields.title ?? "").trim(),
  metadataURI,
  fileHashes: orderedFiles(draft).map((f) => f.hash!),
  royaltyBps: BigInt(Math.round(draft.royaltyPercent * 100)),
});

export function ReviewStep({
  draft,
  metadata,
  metadataURI,
  wallet,
  chainId,
  onBack,
  onRegister,
}: {
  draft: Draft;
  metadata: IP4PSMetadata;
  metadataURI: string;
  wallet: Address;
  chainId?: number;
  onBack: () => void;
  onRegister: () => void;
}) {
  const [checks, setChecks] = useState([false, false, false]);
  const showGas = useApp((s) => s.prefs.showGas);
  const { switchChain, isPending: switching } = useSwitchChain();
  const def = contentType(draft.type!);
  const net = networkById(chainId);
  const ready = !!net?.contract;
  const files = orderedFiles(draft);
  const args = registerArgs(draft, metadataURI);

  const estimate = useQuery({
    queryKey: ["estimate", chainId, metadataURI, wallet],
    enabled: ready && showGas,
    queryFn: async () => {
      const client = clientFor(net!);
      const [gas, gasPrice, usd] = await Promise.all([
        client
          .estimateContractGas({
            address: net!.contract!,
            abi,
            functionName: "register",
            args: [args.kind, args.subtype, args.title, args.metadataURI, args.fileHashes, args.royaltyBps],
            account: wallet,
          })
          .catch(() => BigInt(estimateRegisterGas(files.length))),
        client.getGasPrice(),
        nativeUsdPrice(net!),
      ]);
      return { gas, native: Number(formatEther(gas * gasPrice)), usd };
    },
  });

  const subtypeLabel = def.subtypes.find((s) => s.id === draft.subtype)?.label;
  const summary: [string, string | undefined][] = [
    ["Type", `${def.label} — ${subtypeLabel}`],
    ["Title", args.title],
    ["Creator", creatorName(draft)],
    ["Duration", formatDuration(Number(draft.fields.duration))],
    ["Genre", draft.fields.genre],
    [def.collection?.(draft.subtype)?.itemLabel + "s", draft.items.length ? String(draft.items.length) : undefined],
    ["Royalty", `${draft.royaltyPercent}%`],
    ["Storage", draft.storage === "ipfs" ? "Fingerprints + IPFS (public)" : "Fingerprints only (files stay on your device)"],
  ];

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">Review your IP protection</h2>

      <section className="card">
        <h3 className="font-semibold">📋 Summary</h3>
        <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          {summary.filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 border-b border-line py-1.5">
              <dt className="text-muted">{k}</dt>
              <dd className="text-right font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="card">
        <h3 className="mb-3 font-semibold">🏛️ 4 Pillars verification</h3>
        <PillarGrid
          status={{ synergy: ready, time: ready, elements: ready, celestialBodies: true }}
          details={{
            synergy: ready ? <>Registry contract ready: <Mono value={net!.contract!} /></> : "Waiting for a supported network",
            time: "The block timestamp will be recorded when your transaction confirms",
            elements: `An NFT will be minted to your wallet${draft.royaltyPercent ? ` with a ${draft.royaltyPercent}% royalty` : ""}`,
            celestialBodies: <>Signed by your wallet <Mono value={wallet} /></>,
          }}
        />
      </section>

      <section className="card">
        <h3 className="font-semibold">📊 Files &amp; fingerprints ({files.length})</h3>
        <ul className="mt-3 divide-y divide-line text-sm">
          {files.map((f, i) => (
            <li key={f.id} className="py-2">
              <p className="font-medium">
                {i === 0 && <span className="chip mr-2 py-0.5 text-[10px]">Primary</span>}
                {f.name}
              </p>
              <p className="font-mono text-xs text-muted" title={f.hash}>Hash {shortHex(f.hash, 12, 10)}</p>
              {f.cid && <p className="font-mono text-xs text-muted">IPFS ipfs://{shortHex(f.cid, 10, 8)}</p>}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted">
          Metadata: {metadataURI.startsWith("ipfs://") ? <code className="font-mono">{shortHex(metadataURI, 16, 8)}</code> : "stored with the token"} · {metadata.attributes.length} attributes
        </p>
      </section>

      <section className="card">
        <h3 className="font-semibold">⛓️ Network &amp; cost</h3>
        {!ready ? (
          <div className="mt-3 space-y-3">
            <Notice tone="warn">
              {net ? `IP4PS is not deployed on ${net.label} yet.` : "Your wallet is on a network IP4PS does not support."} Switch to:
            </Notice>
            <div className="flex flex-wrap gap-2">
              {deployedNetworks().map((n) => (
                <button key={n.key} type="button" className="btn-ghost" disabled={switching} onClick={() => switchChain({ chainId: n.chain.id as never })}>
                  {n.label}
                </button>
              ))}
              {deployedNetworks().length === 0 && <p className="text-sm text-muted">No network has a registry configured. See the developer docs to deploy one.</p>}
            </div>
          </div>
        ) : (
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Network</dt><dd>{net!.label}{net!.testnet && " (testnet)"}</dd></div>
            {showGas && (
              <>
                <div className="flex justify-between"><dt className="text-muted">Gas</dt><dd className="font-mono">{estimate.data ? estimate.data.gas.toLocaleString() : "…"}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">IPFS storage</dt><dd>Included</dd></div>
                <div className="flex justify-between border-t border-line pt-2 font-semibold">
                  <dt>Estimated total</dt>
                  <dd className="font-mono">
                    {estimate.isLoading ? "…" : estimate.data ? `~${formatCost(estimate.data.native, estimate.data.usd, net!.chain.nativeCurrency.symbol)}` : "unavailable"}
                  </dd>
                </div>
              </>
            )}
          </dl>
        )}
      </section>

      <Notice tone="warn" title="⚠️ Important">
        Once registered on the blockchain this record is <strong>permanent</strong> and <strong>cannot be deleted</strong>. Please check everything above.
      </Notice>

      <fieldset className="space-y-2">
        <legend className="sr-only">Confirmations</legend>
        {["I confirm this information is accurate", "I am the rightful creator or owner of this work", "I understand this record is permanent"].map((label, i) => (
          <label key={label} className="flex min-h-10 cursor-pointer items-center gap-3 text-sm">
            <input type="checkbox" className="h-5 w-5 accent-[var(--primary)]" checked={checks[i]} onChange={(e) => setChecks((c) => c.map((x, j) => (j === i ? e.target.checked : x)))} />
            {label}
          </label>
        ))}
      </fieldset>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <button type="button" className="btn-ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> Edit
        </button>
        <button type="button" className="btn-gold" disabled={!ready || checks.some((c) => !c)} onClick={onRegister}>
          {switching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />} Register on blockchain
        </button>
      </div>
    </div>
  );
}
