"use client";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { useAccount, useDisconnect, useEnsName } from "wagmi";
import { ConnectGate } from "@/components/ConnectGate";
import { cx, Mono, Notice, PageHeader, Toggle } from "@/components/ui";
import { NETWORKS } from "@/lib/chains";
import { useMyWorks } from "@/lib/hooks";
import { getStorageStatus } from "@/lib/ipfs-client";
import { formatBytes } from "@/lib/format";
import { useApp, type Profile } from "@/lib/store";

const TABS = ["Profile", "Identity", "Network", "IPFS", "Security"] as const;

function ProfileTab() {
  const profile = useApp((s) => s.profile);
  const setProfile = useApp((s) => s.setProfile);
  const [draft, setDraft] = useState<Profile>(profile);
  const fields: [keyof Profile, string, string][] = [
    ["displayName", "Display name", "text"],
    ["artistName", "Artist name", "text"],
    ["email", "Email", "email"],
    ["website", "Website", "url"],
    ["twitter", "X / Twitter", "text"],
    ["instagram", "Instagram", "text"],
  ];
  return (
    <form
      className="card space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setProfile(draft);
        toast.success("Profile saved on this device");
      }}
    >
      <h2 className="font-semibold">👤 Profile</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map(([k, label, type]) => (
          <label key={k} className="block">
            <span className="label">{label}</span>
            <input className="input" type={type} value={draft[k]} placeholder={k === "twitter" || k === "instagram" ? "@handle" : undefined} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} />
          </label>
        ))}
      </div>
      <p className="text-xs text-muted">
        Saved in this browser only. Your artist name and social handles are written into the metadata of works you register from now on, as declared identity (P4).
        Your email is never published.
      </p>
      <button type="submit" className="btn-primary">Save changes</button>
    </form>
  );
}

function IdentityTab() {
  const { address } = useAccount();
  const { data: ens } = useEnsName({ address, chainId: 1 });
  const profile = useApp((s) => s.profile);
  const { works } = useMyWorks();
  const socials = !!(profile.twitter || profile.instagram || profile.website);
  const level = 1 + (ens ? 1 : 0) + (socials ? 1 : 0) + (works.length ? 1 : 0);
  const checks = [
    ["Wallet connected — signs every registration", true],
    ["ENS name resolves to this wallet", !!ens],
    ["Social profiles declared in your profile", socials],
    ["At least one work registered", works.length > 0],
  ] as const;
  return (
    <div className="card space-y-4">
      <h2 className="font-semibold">🌟 Identity verification (P4)</h2>
      <p className="flex flex-wrap items-center gap-2 text-sm">
        Wallet <Mono value={address!} /> <span className="text-success">✅ Connected</span> {ens && <span className="chip">{ens}</span>}
      </p>
      <p className="text-sm">
        Verification level: <span className="text-accent">{"⭐".repeat(level)}</span>
        <span className="text-muted">{"☆".repeat(4 - level)}</span> {["", "Basic", "Linked", "Declared", "Established"][level]}
      </p>
      <ul className="space-y-2 text-sm">
        {checks.map(([label, ok]) => (
          <li key={label} className="flex items-center gap-2">
            <CheckCircle2 className={cx("h-4 w-4", ok ? "text-success" : "text-muted/40")} /> {label}
          </li>
        ))}
      </ul>
      <Notice title="Enhanced verification">
        Email, social-account and KYC verification need an attestation service run by a third party. They are not part of this release,
        and IP4PS does not claim them. Today, P4 rests on your wallet&apos;s signature: only the holder of this key could have registered your works.
      </Notice>
    </div>
  );
}

function NetworkTab() {
  const prefs = useApp((s) => s.prefs);
  const setPrefs = useApp((s) => s.setPrefs);
  return (
    <div className="card space-y-4">
      <h2 className="font-semibold">⛓️ Network preferences</h2>
      <fieldset className="space-y-2">
        <legend className="label">Default network</legend>
        {NETWORKS.map((n) => (
          <label key={n.key} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-line px-3 text-sm hover:border-line-strong">
            <input type="radio" name="net" className="accent-[var(--primary)]" checked={prefs.defaultNetwork === n.key} onChange={() => setPrefs({ defaultNetwork: n.key })} />
            <span className="flex-1">
              {n.label} <span className="text-xs text-muted">— {n.note}</span>
            </span>
            {n.contract ? <span className="chip text-success">Live</span> : <span className="chip text-muted">Not deployed</span>}
          </label>
        ))}
      </fieldset>
      <Toggle checked={prefs.showGas} onChange={(v) => setPrefs({ showGas: v })} label="Show gas estimates" description="Estimate the cost before you register." />
      <p className="text-xs text-muted">Your wallet decides which network a transaction goes to; IP4PS asks you to switch when needed.</p>
    </div>
  );
}

function IpfsTab() {
  const prefs = useApp((s) => s.prefs);
  const setPrefs = useApp((s) => s.setPrefs);
  const status = useQuery({ queryKey: ["storage-status"], queryFn: getStorageStatus });
  return (
    <div className="card space-y-4">
      <h2 className="font-semibold">📁 IPFS storage</h2>
      <p className="text-sm">
        Provider: <strong>{status.data?.provider ?? "Pinata"}</strong>{" "}
        {status.data?.configured ? <span className="text-success">✅ Connected</span> : <span className="text-accent">Not configured on this deployment</span>}
      </p>
      {status.data?.configured && <p className="text-sm text-muted">Max file size: {formatBytes(status.data.maxFileBytes)}</p>}
      <p className="text-xs text-muted">
        The storage key is held on the server (PINATA_JWT) and never sent to your browser. Each upload goes straight from your device to Pinata through a one-time signed URL.
      </p>
      <fieldset className="space-y-2">
        <legend className="label">Default storage for new works</legend>
        {(
          [
            ["ipfs", "Fingerprint + IPFS (public, permanent)"],
            ["fingerprint", "Fingerprint only (files stay on your device)"],
          ] as const
        ).map(([id, label]) => (
          <label key={id} className="flex min-h-10 items-center gap-3 text-sm">
            <input type="radio" name="storage" className="accent-[var(--primary)]" checked={prefs.defaultStorage === id} onChange={() => setPrefs({ defaultStorage: id })} />
            {label}
          </label>
        ))}
      </fieldset>
      <label className="block">
        <span className="label">Default royalty: {prefs.defaultRoyaltyPercent}%</span>
        <input type="range" min={0} max={25} step={0.5} value={prefs.defaultRoyaltyPercent} onChange={(e) => setPrefs({ defaultRoyaltyPercent: Number(e.target.value) })} className="w-full accent-[var(--primary)]" />
      </label>
    </div>
  );
}

function SecurityTab() {
  const { works } = useMyWorks();
  const { disconnect } = useDisconnect();
  const reset = useApp((s) => s.reset);
  const prefs = useApp((s) => s.prefs);
  const setPrefs = useApp((s) => s.setPrefs);
  const exportAll = () => {
    const data = works.map((w) => ({
      title: w.title,
      type: w.type,
      subtype: w.subtype,
      network: w.network.label,
      chainId: w.network.chain.id,
      contract: w.contract,
      tokenId: w.tokenId.toString(),
      creator: w.creator,
      owner: w.owner,
      registeredAt: w.registeredAt.toISOString(),
      blockNumber: w.blockNumber.toString(),
      fileHashes: w.fileHashes,
      metadataURI: w.metadataURI,
      metadata: w.metadata,
    }));
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), works: data }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `IP4PS-records-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  return (
    <div className="card space-y-4">
      <h2 className="font-semibold">🔐 Security</h2>
      <Toggle checked={prefs.confirmBeforeSend} onChange={(v) => setPrefs({ confirmBeforeSend: v })} label="Transaction confirmations" description="Every transaction is always confirmed in your wallet; IP4PS cannot sign for you." />
      <Notice>
        There is no IP4PS password or account to steal. Your wallet holds the only key. Use a hardware wallet (Ledger, Trezor) for valuable catalogues, and never share your recovery phrase.
      </Notice>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-ghost" onClick={exportAll} disabled={!works.length}>Download all records (JSON)</button>
        <button
          type="button"
          className="btn-ghost text-danger"
          onClick={() => {
            if (!confirm("Clear your profile and preferences from this browser? Your on-chain records are not affected.")) return;
            reset();
            disconnect();
            toast.success("Local data cleared");
          }}
        >
          Clear local data &amp; disconnect
        </button>
      </div>
      <p className="text-xs text-muted">On-chain records are permanent by design and cannot be deleted by anyone, including IP4PS. You can transfer a token to another wallet from its page.</p>
    </div>
  );
}

function Settings() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Profile");
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader title="Settings" />
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1" role="tablist">
        {TABS.map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cx("chip min-h-9 shrink-0 px-3", tab === t && "border-primary bg-primary/15")}>
            {t}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {tab === "Profile" && <ProfileTab />}
        {tab === "Identity" && <IdentityTab />}
        {tab === "Network" && <NetworkTab />}
        {tab === "IPFS" && <IpfsTab />}
        {tab === "Security" && <SecurityTab />}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ConnectGate>
      <Settings />
    </ConnectGate>
  );
}
