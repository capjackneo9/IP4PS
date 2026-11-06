import { FileUp, Fingerprint, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { CostCalculator } from "@/components/landing/CostCalculator";
import { PillarExplorer } from "@/components/landing/PillarExplorer";
import { StartButton } from "@/components/landing/StartButton";
import { PillarsVisual } from "@/components/Pillars";
import { CONTENT_TYPES } from "@/lib/content-types";

const STEPS = [
  {
    icon: FileUp,
    title: "Upload",
    body: "Drop in your track, film, artwork or files. Each one is fingerprinted (SHA-256) on your device — nothing is sent anywhere to do it.",
    pillars: "P3 Elements prepared",
  },
  {
    icon: Fingerprint,
    title: "Register",
    body: "One wallet transaction stores the fingerprints, timestamps them and mints your ownership token, all signed by you.",
    pillars: "P1 · P2 · P3 · P4 activated",
  },
  {
    icon: ShieldCheck,
    title: "Verify",
    body: "Share a public link or certificate. Anyone can drop a copy of the file and see who registered it first, and when.",
    pillars: "All 4 Pillars verifiable",
  },
];

const FAQ = [
  {
    q: "Is this the same as registering copyright?",
    a: "No. In most countries you own copyright the moment you create a work. IP4PS gives you strong, independent evidence of what you had and when you had it, and who signed for it. Formal registration with your national copyright office adds legal remedies; IP4PS complements it. This is not legal advice.",
  },
  {
    q: "Do my files become public?",
    a: "Only if you choose IPFS storage. With “fingerprint only”, the files stay on your device and only their SHA-256 fingerprints go on-chain. A fingerprint cannot be turned back into the file.",
  },
  {
    q: "What does it cost?",
    a: "Only the network gas fee, paid from your wallet. On Polygon that is usually well under a cent; use the calculator above for live prices.",
  },
  {
    q: "What if someone registers my work before me?",
    a: "Each fingerprint can be registered only once, and the chain records exactly when. If you hold earlier evidence (drafts, project files, an earlier registration), that timeline is what matters in a dispute.",
  },
  {
    q: "Can I sell or license my work?",
    a: "Yes. The ownership token can be transferred, and you can offer licenses (streaming, commercial, sync, cover) that the licensee accepts and pays for on-chain.",
  },
  {
    q: "Do I need to know how to code?",
    a: "No. You need a wallet such as MetaMask or Coinbase Wallet and a little of the network's token for gas. The app does the rest.",
  },
];

export default function Landing() {
  return (
    <div className="overflow-x-hidden">
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 pt-14 pb-20 lg:grid-cols-2 lg:pt-24">
        <div>
          <p className="chip mb-5 border-primary/40 text-primary">The 4 Pillars System · Mathematically provable ownership</p>
          <h1 className="text-4xl leading-tight font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Protect Your IP with <span className="text-gradient">Unbreakable</span> Blockchain Security
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted">
            Enterprise-level proof of ownership for independent artists. Fingerprint your music, films, art and podcasts,
            timestamp them on-chain and hold the token that proves it — no lawyers, no coding.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <StartButton />
            <Link href="/verify" className="btn-ghost px-5">
              Verify a work
            </Link>
          </div>
          <p className="mt-4 text-sm font-semibold tracking-wide text-accent">Protect. Prove. Prosper.</p>
        </div>
        <PillarsVisual />
      </section>

      <section className="border-y border-line bg-bg-2/50 py-20" aria-labelledby="how">
        <div className="mx-auto max-w-7xl px-4">
          <h2 id="how" className="text-center text-3xl font-bold">How it works</h2>
          <p className="mt-2 text-center text-muted">Three steps. No coding required.</p>
          <ol className="mt-10 grid gap-5 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="card relative">
                <span className="absolute top-4 right-5 text-5xl font-black text-fg/5" aria-hidden="true">
                  {i + 1}
                </span>
                <s.icon className="h-8 w-8 text-primary" aria-hidden="true" />
                <h3 className="mt-3 text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted">{s.body}</p>
                <p className="mt-4 text-xs font-semibold text-accent">{s.pillars}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20" aria-labelledby="types">
        <h2 id="types" className="text-center text-3xl font-bold">Everything you create</h2>
        <p className="mt-2 text-center text-muted">Purpose-built flows for each kind of work.</p>
        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3">
          {CONTENT_TYPES.map((t) => (
            <Link key={t.id} href={`/protect?type=${t.id}`} className="card group transition hover:-translate-y-1 hover:border-primary/50">
              <span className="text-4xl" aria-hidden="true">{t.emoji}</span>
              <h3 className="mt-3 text-lg font-semibold">{t.label}</h3>
              <p className="text-sm text-muted">{t.examples}</p>
              <p className="mt-2 hidden text-sm text-fg/80 sm:block">{t.tagline}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-bg-2/50 py-20" aria-labelledby="pillars">
        <div className="mx-auto max-w-7xl px-4">
          <h2 id="pillars" className="text-center text-3xl font-bold">The 4 Pillars</h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-muted">
            Four independent proofs that reinforce each other. Remove any one and the others still stand.
          </p>
          <div className="mt-10">
            <PillarExplorer />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-20 lg:grid-cols-2" aria-labelledby="faq">
        <CostCalculator />
        <div>
          <h2 id="faq" className="text-3xl font-bold">FAQ</h2>
          <div className="mt-6 space-y-3">
            {FAQ.map((f) => (
              <details key={f.q} className="card group p-4">
                <summary className="cursor-pointer list-none font-semibold marker:hidden">
                  <span className="flex items-center justify-between gap-3">
                    {f.q}
                    <span className="text-primary transition group-open:rotate-45" aria-hidden="true">+</span>
                  </span>
                </summary>
                <p className="mt-3 text-sm text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-24 text-center">
        <div className="card bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/10 py-12">
          <h2 className="text-3xl font-bold">Your IP, secured forever</h2>
          <p className="mt-2 text-muted">The future of intellectual property, built for the artists who create it.</p>
          <div className="mt-6 flex justify-center">
            <StartButton />
          </div>
        </div>
      </section>
    </div>
  );
}
