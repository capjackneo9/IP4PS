"use client";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { formatEther, isAddress, parseEther, type Address } from "viem";
import { useAccount } from "wagmi";
import { abi, fetchTokenLicenses, type LicenseInfo, type Work } from "@/lib/contract/registry";
import { useTx } from "@/lib/useTx";
import { cx, Modal, Mono, Skeleton } from "../ui";

export const LICENSE_TYPES = ["STREAMING", "COMMERCIAL", "SYNC", "COVER", "BROADCAST", "PERSONAL", "OTHER"];

function statusChip(l: LicenseInfo) {
  if (l.active) return <span className="chip border-success/40 text-success">Active</span>;
  if (l.status === "Offered") return <span className="chip border-accent/40 text-accent">Awaiting payment</span>;
  if (l.status === "Revoked") return <span className="chip text-muted">Withdrawn</span>;
  return <span className="chip text-muted">Expired</span>;
}

function CreateLicense({ work, open, onClose }: { work: Work; open: boolean; onClose: () => void }) {
  const { run, pending } = useTx();
  const [licensee, setLicensee] = useState("");
  const [type, setType] = useState("STREAMING");
  const [days, setDays] = useState("365");
  const [fee, setFee] = useState("0");
  const [terms, setTerms] = useState("");
  const symbol = work.network.chain.nativeCurrency.symbol;
  let feeWei: bigint | undefined;
  try {
    feeWei = parseEther(fee || "0");
  } catch {
    feeWei = undefined;
  }
  const valid = isAddress(licensee) && feeWei !== undefined && Number(days) >= 0 && Number.isInteger(Number(days));

  return (
    <Modal open={open} onClose={onClose} title="Create license">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!valid) return;
          const ok = await run("Create license", {
            address: work.contract,
            abi,
            functionName: "grantLicense",
            args: [work.tokenId, licensee as Address, BigInt(days), feeWei!, type, terms.trim()],
            chainId: work.network.chain.id,
          });
          if (ok) onClose();
        }}
      >
        <label className="block">
          <span className="label">Licensee wallet address</span>
          <input className="input font-mono" value={licensee} onChange={(e) => setLicensee(e.target.value.trim())} placeholder="0x…" required />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="label">License type</span>
            <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
              {LICENSE_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="label">Duration (days, 0 = perpetual)</span>
            <input className="input" type="number" min={0} step={1} value={days} onChange={(e) => setDays(e.target.value)} />
          </label>
        </div>
        <label className="block">
          <span className="label">Fee ({symbol})</span>
          <input className="input" type="number" min={0} step="any" value={fee} onChange={(e) => setFee(e.target.value)} />
          <span className="mt-1 block text-xs text-muted">Free licenses start immediately. Paid ones start when the licensee accepts and pays; you withdraw the fee from your dashboard.</span>
        </label>
        <label className="block">
          <span className="label">Terms document URL (optional)</span>
          <input className="input" value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="ipfs://… or https://…" />
        </label>
        <button type="submit" className="btn-primary w-full" disabled={!valid || !!pending}>
          {pending ? "Working…" : "Grant license"}
        </button>
      </form>
    </Modal>
  );
}

export function Licensing({ work }: { work: Work }) {
  const { address } = useAccount();
  const [open, setOpen] = useState(false);
  const { run, pending } = useTx();
  const q = useQuery({ queryKey: ["licenses", work.key], queryFn: () => fetchTokenLicenses(work.network, work.tokenId) });
  const isOwner = address?.toLowerCase() === work.owner.toLowerCase();
  const me = address?.toLowerCase();
  const active = q.data?.filter((l) => l.active).length ?? 0;
  const symbol = work.network.chain.nativeCurrency.symbol;

  return (
    <section className="card">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">📜 Licensing</h2>
        {isOwner && (
          <button type="button" className="btn-ghost min-h-9 px-3 text-xs" onClick={() => setOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Create license
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-muted">Active licenses: {q.isLoading ? "…" : active}</p>
      {q.isLoading ? (
        <Skeleton className="mt-3 h-16" />
      ) : (
        <ul className="mt-3 space-y-2">
          {q.data?.map((l) => (
            <li key={l.id.toString()} className="rounded-xl border border-line bg-surface-2 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">#{l.id.toString()} · {l.licenseType}</p>
                {statusChip(l)}
              </div>
              <div className="mt-1 grid gap-1 text-xs text-muted sm:grid-cols-2">
                <span>Licensee: <Mono value={l.licensee} copy={false} /></span>
                <span>Fee: {l.fee ? `${formatEther(l.fee)} ${symbol}` : "Free"}</span>
                <span>{l.perpetual ? "Perpetual" : `${l.durationDays} days`}{l.expiresAt ? ` · until ${l.expiresAt.toLocaleDateString()}` : ""}</span>
                {l.termsURI && <span className="truncate">Terms: {l.termsURI}</span>}
              </div>
              <div className="mt-2 flex gap-2">
                {l.status === "Offered" && me === l.licensee.toLowerCase() && (
                  <button
                    type="button"
                    className={cx("btn-primary min-h-9 px-3 text-xs")}
                    disabled={!!pending}
                    onClick={() => run("Accept license", { address: work.contract, abi, functionName: "acceptLicense", args: [l.id], value: l.fee, chainId: work.network.chain.id })}
                  >
                    Accept &amp; pay {formatEther(l.fee)} {symbol}
                  </button>
                )}
                {l.status === "Offered" && me === l.licensor.toLowerCase() && (
                  <button
                    type="button"
                    className="btn-ghost min-h-9 px-3 text-xs"
                    disabled={!!pending}
                    onClick={() => run("Withdraw offer", { address: work.contract, abi, functionName: "revokeOffer", args: [l.id], chainId: work.network.chain.id })}
                  >
                    Withdraw offer
                  </button>
                )}
              </div>
            </li>
          ))}
          {q.data?.length === 0 && <li className="text-sm text-muted">No licenses yet.</li>}
        </ul>
      )}
      {isOwner && <CreateLicense work={work} open={open} onClose={() => setOpen(false)} />}
    </section>
  );
}
