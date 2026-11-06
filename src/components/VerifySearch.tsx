"use client";
import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { Hex } from "viem";
import { deployedNetworks, type NetworkInfo } from "@/lib/chains";
import { lookupHash, verifyPath } from "@/lib/contract/registry";
import { normalizeHash, sha256File } from "@/lib/hash";
import { EmptyState, FileDrop, Mono, Notice, PageHeader, Progress } from "./ui";

type Result = { hash: Hex; name?: string; hits: { network: NetworkInfo; tokenId: bigint }[]; errors: string[] };

async function searchAll(hash: Hex): Promise<Omit<Result, "hash" | "name">> {
  const hits: Result["hits"] = [];
  const errors: string[] = [];
  await Promise.all(
    deployedNetworks().map(async (n) => {
      try {
        const id = await lookupHash(n, hash);
        if (id > 0n) hits.push({ network: n, tokenId: id });
      } catch {
        errors.push(n.label);
      }
    }),
  );
  return { hits, errors };
}

export function VerifySearch() {
  const params = useSearchParams();
  const router = useRouter();
  const networks = deployedNetworks();
  const [hashing, setHashing] = useState<{ name: string; p: number }>();
  const [result, setResult] = useState<Result>();
  const [hashInput, setHashInput] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [chain, setChain] = useState(networks[0]?.chain.id ?? 0);

  const run = useCallback(async (hash: Hex, name?: string) => {
    setResult(undefined);
    setResult({ hash, name, ...(await searchAll(hash)) });
  }, []);

  useEffect(() => {
    const h = normalizeHash(params.get("hash") ?? "");
    if (h) {
      setHashInput(h);
      run(h);
    }
  }, [params, run]);

  if (networks.length === 0)
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState icon="⛓️" title="No registry configured">This deployment has no IP4PS contract address set.</EmptyState>
      </div>
    );

  const parsedHash = normalizeHash(hashInput);

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-8">
      <PageHeader title="Verify a work" subtitle="Check who registered a file and when. No wallet needed." />

      <section className="card">
        <h2 className="font-semibold">Drop the file you want to check</h2>
        <p className="mb-3 text-sm text-muted">It is fingerprinted on your device and never uploaded.</p>
        <FileDrop
          id="verify-file"
          label="File to verify"
          onFiles={async ([f]) => {
            setResult(undefined);
            setHashing({ name: f.name, p: 0 });
            const hash = await sha256File(f, (p) => setHashing({ name: f.name, p }));
            setHashing(undefined);
            setHashInput(hash);
            await run(hash, f.name);
          }}
        />
        {hashing && (
          <div className="mt-3 text-sm">
            Fingerprinting {hashing.name}… <Progress value={hashing.p} className="mt-1" />
          </div>
        )}
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <form
          className="card space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (parsedHash) run(parsedHash);
          }}
        >
          <h2 className="font-semibold">…or paste a SHA-256</h2>
          <input className="input font-mono" aria-label="SHA-256 hash" placeholder="0x… or output of sha256sum" value={hashInput} onChange={(e) => setHashInput(e.target.value)} />
          <button type="submit" className="btn-primary w-full" disabled={!parsedHash}>
            <Search className="h-4 w-4" /> Search all networks
          </button>
        </form>
        <form
          className="card space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (/^\d+$/.test(tokenInput.replace("#", ""))) router.push(verifyPath(chain, tokenInput.replace("#", "")));
          }}
        >
          <h2 className="font-semibold">…or look up a token</h2>
          <div className="flex gap-2">
            <select className="input" aria-label="Network" value={chain} onChange={(e) => setChain(Number(e.target.value))}>
              {networks.map((n) => <option key={n.key} value={n.chain.id}>{n.label}</option>)}
            </select>
            <input className="input w-32" aria-label="Token ID" placeholder="Token #" value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} />
          </div>
          <button type="submit" className="btn-ghost w-full" disabled={!/^#?\d+$/.test(tokenInput)}>Open verification</button>
        </form>
      </div>

      {result && (
        <section aria-live="polite">
          {result.hits.length ? (
            <Notice tone="success" title="✅ Registered">
              <p>
                {result.name ? <strong>{result.name}</strong> : "This fingerprint"} (<Mono value={result.hash} copy={false} />) is protected:
              </p>
              <ul className="mt-2 space-y-1">
                {result.hits.map((h) => (
                  <li key={h.network.key}>
                    <Link className="font-semibold text-primary hover:underline" href={verifyPath(h.network.chain.id, h.tokenId)}>
                      Token #{h.tokenId.toString()} on {h.network.label} →
                    </Link>
                  </li>
                ))}
              </ul>
            </Notice>
          ) : (
            <Notice tone="warn" title="Not registered">
              No IP4PS record holds this exact fingerprint{result.errors.length ? ` on the networks that answered` : ""}. Any edit or re-encode of a file changes its fingerprint.
            </Notice>
          )}
          {result.errors.length > 0 && <p className="mt-2 text-xs text-muted">Could not reach: {result.errors.join(", ")}.</p>}
        </section>
      )}
    </div>
  );
}
