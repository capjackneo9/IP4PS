"use client";
import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { sha256File } from "@/lib/hash";
import type { Draft, DraftFile } from "@/lib/wizard";

/** Fingerprints newly added files one at a time, on this device, reporting progress into the draft. */
export function useHashing(draft: Draft, setDraft: Dispatch<SetStateAction<Draft>>) {
  const busy = useRef<string | null>(null);

  useEffect(() => {
    if (busy.current) return;
    const next = draft.files.find((f) => f.file && !f.hash && !f.error);
    if (!next) return;
    busy.current = next.id;
    const patch = (p: Partial<DraftFile>) =>
      setDraft((d) => ({ ...d, files: d.files.map((f) => (f.id === next.id ? { ...f, ...p } : f)) }));
    let last = 0;
    sha256File(next.file!, (fraction) => {
      const now = Date.now();
      if (now - last > 120 || fraction === 1) {
        last = now;
        patch({ hashProgress: fraction });
      }
    })
      .then((hash) => patch({ hash, hashProgress: 1 }))
      .catch((e) => patch({ error: e instanceof Error ? e.message : "Could not read file" }))
      .finally(() => {
        busy.current = null;
        // Trigger the effect again for the next file in the queue.
        setDraft((d) => ({ ...d }));
      });
  }, [draft.files, setDraft]);
}
