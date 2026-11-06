"use client";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { networkById } from "@/lib/chains";
import { CONTENT_TYPES, type ContentTypeId } from "@/lib/content-types";
import { lookupHashes, verifyPath } from "@/lib/contract/registry";
import { getStorageStatus } from "@/lib/ipfs-client";
import type { IP4PSMetadata } from "@/lib/metadata";
import { useApp } from "@/lib/store";
import { emptyDraft, orderedFiles, validateDraft, type Draft, type Issue } from "@/lib/wizard";
import { cx } from "../ui";
import { DetailsStep } from "./DetailsStep";
import { ProcessingStep } from "./ProcessingStep";
import { RegisterStep, type Registration } from "./RegisterStep";
import { registerArgs, ReviewStep } from "./ReviewStep";
import { SuccessStep } from "./SuccessStep";
import { TypeStep } from "./TypeStep";
import { useHashing } from "./useHashing";

type Step = "type" | "details" | "processing" | "review" | "register" | "success";
const LABELS: [Step, string][] = [
  ["type", "Type"],
  ["details", "Details"],
  ["processing", "Process"],
  ["review", "Review"],
  ["register", "Register"],
  ["success", "Done"],
];

export function Wizard() {
  const params = useSearchParams();
  const { address, chainId } = useAccount();
  const prefs = useApp((s) => s.prefs);
  const storage = useQuery({ queryKey: ["storage-status"], queryFn: getStorageStatus, staleTime: 300_000 });
  const storageAvailable = !!storage.data?.configured;

  const [step, setStep] = useState<Step>("type");
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(prefs.defaultStorage, prefs.defaultRoyaltyPercent));
  const [issues, setIssues] = useState<Issue[]>([]);
  const [checking, setChecking] = useState(false);
  const [meta, setMeta] = useState<{ uri: string; metadata: IP4PSMetadata }>();
  const [reg, setReg] = useState<Registration>();
  useHashing(draft, setDraft);

  // Deep links from the landing page and dashboard, e.g. /protect?type=music&subtype=album
  useEffect(() => {
    const t = params.get("type") as ContentTypeId | null;
    const def = CONTENT_TYPES.find((c) => c.id === t);
    if (def) {
      const sub = def.subtypes.find((s) => s.id === params.get("subtype"))?.id ?? def.subtypes[0].id;
      setDraft((d) => ({ ...d, type: def.id, subtype: sub }));
      setStep("details");
    }
  }, [params]);

  useEffect(() => {
    if (storage.data && !storage.data.configured) setDraft((d) => (d.storage === "ipfs" ? { ...d, storage: "fingerprint" } : d));
  }, [storage.data]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  // Leaving mid-way would lose the files; warn before unload until registration is done.
  useEffect(() => {
    if (step === "type" || step === "success") return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [step]);

  const network = networkById(chainId);

  const continueFromDetails = async () => {
    const found = validateDraft(draft);
    setIssues(found);
    if (found.length) return;
    if (network?.contract) {
      setChecking(true);
      try {
        const hits = (await lookupHashes(network, orderedFiles(draft).map((f) => f.hash!))).filter((h) => h.tokenId > 0n);
        if (hits.length) {
          const names = new Map(draft.files.map((f) => [f.hash, f.name]));
          setIssues(
            hits.map((h) => ({
              field: `dup:${h.hash}`,
              message: `${names.get(h.hash)} is already registered on ${network.label} as token #${h.tokenId} (${verifyPath(network.chain.id, h.tokenId)}).`,
            })),
          );
          return;
        }
      } catch {
        // The registry will reject duplicates on-chain anyway; a failed pre-check should not block the user.
      } finally {
        setChecking(false);
      }
    }
    setMeta(undefined);
    setStep("processing");
  };

  const reset = () => {
    setDraft(emptyDraft(prefs.defaultStorage, prefs.defaultRoyaltyPercent));
    setMeta(undefined);
    setReg(undefined);
    setIssues([]);
    setStep("type");
  };

  const idx = LABELS.findIndex(([s]) => s === step);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <ol className="mb-8 flex items-center gap-1 overflow-x-auto pb-1" aria-label="Progress">
        {LABELS.map(([s, label], i) => (
          <li key={s} className="flex flex-1 items-center gap-1" aria-current={s === step ? "step" : undefined}>
            <span
              className={cx(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                i < idx ? "bg-success text-white" : i === idx ? "bg-brand text-white" : "bg-surface-2 text-muted",
              )}
            >
              {i < idx ? "✓" : i + 1}
            </span>
            <span className={cx("hidden text-xs sm:inline", i === idx ? "font-semibold" : "text-muted")}>{label}</span>
            {i < LABELS.length - 1 && <span className={cx("mx-1 h-px flex-1", i < idx ? "bg-success" : "bg-line")} />}
          </li>
        ))}
      </ol>

      {step === "type" && (
        <TypeStep
          type={draft.type}
          subtype={draft.subtype}
          onPick={(type, subtype) =>
            setDraft((d) => (d.type === type ? { ...d, subtype } : { ...emptyDraft(d.storage, d.royaltyPercent), type, subtype }))
          }
          onContinue={() => setStep("details")}
        />
      )}
      {step === "details" && draft.type && (
        <DetailsStep
          draft={draft}
          setDraft={setDraft}
          issues={issues}
          checking={checking}
          storageAvailable={storageAvailable}
          onBack={() => setStep("type")}
          onContinue={continueFromDetails}
        />
      )}
      {step === "processing" && address && (
        <ProcessingStep
          draft={draft}
          setDraft={setDraft}
          wallet={address}
          chainId={chainId ?? 0}
          onBack={() => setStep("details")}
          onDone={(uri, metadata) => {
            setMeta({ uri, metadata });
            setStep("review");
          }}
        />
      )}
      {step === "review" && meta && address && (
        <ReviewStep
          draft={draft}
          metadata={meta.metadata}
          metadataURI={meta.uri}
          wallet={address}
          chainId={chainId}
          onBack={() => setStep("details")}
          onRegister={() => setStep("register")}
        />
      )}
      {step === "register" && meta && address && network?.contract && (
        <RegisterStep
          args={registerArgs(draft, meta.uri)}
          network={network}
          wallet={address}
          onBack={() => setStep("review")}
          onSuccess={(r) => {
            setReg(r);
            setStep("success");
          }}
        />
      )}
      {step === "success" && reg && meta && address && <SuccessStep reg={reg} metadata={meta.metadata} wallet={address} onAnother={reset} />}
    </div>
  );
}
