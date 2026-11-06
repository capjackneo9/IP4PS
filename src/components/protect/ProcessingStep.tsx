"use client";
import { CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { Address } from "viem";
import { useSignMessage } from "wagmi";
import { shortHex } from "@/lib/format";
import { pinMetadata, storageAuth, uploadFile } from "@/lib/ipfs-client";
import { toDataUri, type IP4PSMetadata } from "@/lib/metadata";
import { socialsOf, useApp } from "@/lib/store";
import { buildMetadata, orderedFiles, type Draft } from "@/lib/wizard";
import { Notice, Progress } from "../ui";

export function ProcessingStep({
  draft,
  setDraft,
  wallet,
  chainId,
  onDone,
  onBack,
}: {
  draft: Draft;
  setDraft: Dispatch<SetStateAction<Draft>>;
  wallet: Address;
  chainId: number;
  onDone: (metadataURI: string, metadata: IP4PSMetadata) => void;
  onBack: () => void;
}) {
  const { signMessageAsync } = useSignMessage();
  const profile = useApp((s) => s.profile);
  const [phase, setPhase] = useState<"auth" | "upload" | "metadata" | "done">(draft.storage === "ipfs" ? "auth" : "metadata");
  const [error, setError] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  const started = useRef(-1);
  // A separate mounted flag: with React strict mode the main effect's own cleanup would cancel its only run.
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const files = orderedFiles(draft);

  useEffect(() => {
    if (started.current === attempt) return;
    started.current = attempt;
    (async () => {
      setError(undefined);
      try {
        let current = draft;
        let auth: string | undefined;
        if (draft.storage === "ipfs") {
          setPhase("auth");
          auth = await storageAuth(wallet, signMessageAsync);
          setPhase("upload");
          for (const f of orderedFiles(current)) {
            if (!alive.current) return;
            if (f.cid || !f.file) continue;
            const cid = await uploadFile(f.file, auth, (p) =>
              setDraft((d) => ({ ...d, files: d.files.map((x) => (x.id === f.id ? { ...x, uploadProgress: p } : x)) })),
            );
            current = { ...current, files: current.files.map((x) => (x.id === f.id ? { ...x, cid, uploadProgress: 1 } : x)) };
            setDraft((d) => ({ ...d, files: d.files.map((x) => (x.id === f.id ? { ...x, cid, uploadProgress: 1 } : x)) }));
          }
        }
        setPhase("metadata");
        const metadata = buildMetadata(current, {
          wallet,
          socials: socialsOf(profile),
          profileName: profile.artistName || profile.displayName,
          verifyBase: window.location.origin,
          chainId,
        });
        const uri = auth ? `ipfs://${await pinMetadata(metadata, `${metadata.name} — IP4PS metadata`, auth)}` : toDataUri(metadata);
        if (!alive.current) return;
        setPhase("done");
        onDone(uri, metadata);
      } catch (e) {
        if (alive.current) setError(e instanceof Error ? e.message : "Processing failed");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const uploadable = files.filter((f) => !f.manual && f.file);
  const uploaded = uploadable.filter((f) => f.cid).length;
  const overall = uploadable.length ? uploadable.reduce((a, f) => a + (f.cid ? 1 : (f.uploadProgress ?? 0)), 0) / uploadable.length : 1;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Processing your files</h2>
        <p className="mt-1 text-sm text-muted">Keep this tab open until processing finishes.</p>
      </div>

      {draft.storage === "ipfs" && (
        <section className="card">
          <h3 className="font-semibold">📁 Uploading to IPFS</h3>
          {phase === "auth" && !error && <p className="mt-2 text-sm text-muted">Approve the signature request in your wallet. It is not a transaction and costs nothing.</p>}
          <div className="mt-3 flex items-center gap-3">
            <Progress value={overall} />
            <span className="w-24 text-right text-sm text-muted">
              {uploaded}/{uploadable.length} files
            </span>
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            {uploadable.map((f) => (
              <li key={f.id} className="flex items-center gap-2">
                {f.cid ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Loader2 className="h-4 w-4 animate-spin text-muted" />}
                <span className="truncate">{f.name}</span>
                <span className="ml-auto font-mono text-xs text-muted">{f.cid ? shortHex(f.cid, 8, 6) : `${Math.round((f.uploadProgress ?? 0) * 100)}%`}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <h3 className="font-semibold">🔐 Cryptographic fingerprints</h3>
        <ul className="mt-3 space-y-2 text-sm">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
              <span className="truncate">{f.name}</span>
              <code className="ml-auto font-mono text-xs text-muted" title={f.hash}>
                {shortHex(f.hash, 10, 6)}
              </code>
            </li>
          ))}
        </ul>
      </section>

      <section className="card flex items-center gap-3 text-sm">
        {phase === "done" ? <CheckCircle2 className="h-5 w-5 text-success" /> : <Loader2 className="h-5 w-5 animate-spin text-primary" />}
        {phase === "metadata" || phase === "done"
          ? draft.storage === "ipfs"
            ? "Pinning the token metadata to IPFS…"
            : "Building the token metadata (stored with the token, no upload needed)…"
          : "Metadata is built after the uploads finish."}
      </section>

      {draft.storage === "ipfs" && <p className="text-xs text-muted">ⓘ Files on IPFS are public and permanent. Anyone with a CID can download them.</p>}

      {error && (
        <Notice tone="danger" title="Processing stopped">
          <p>{error}</p>
          <div className="mt-3 flex gap-2">
            <button type="button" className="btn-primary" onClick={() => setAttempt((a) => a + 1)}>
              <RotateCcw className="h-4 w-4" /> Try again
            </button>
            <button type="button" className="btn-ghost" onClick={onBack}>
              Back to edit
            </button>
          </div>
        </Notice>
      )}
    </div>
  );
}
