"use client";
import { BarChart3, Home, Library, PlusCircle, Settings, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAccount, useBlockNumber } from "wagmi";
import { deployedNetworks, NETWORKS } from "@/lib/chains";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { cx } from "./ui";
import { WalletButton } from "./WalletButton";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/protect", label: "New Protection", short: "Protect", icon: PlusCircle },
  { href: "/library", label: "My IP", icon: Library },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { isConnected } = useAccount();
  const isActive = (href: string) => path === href || path.startsWith(href + "/");
  const showAppNav = isConnected || NAV.some((n) => isActive(n.href));

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-white">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-line bg-bg/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
          <Link href={isConnected ? "/dashboard" : "/"} aria-label="IP4PS home" className="shrink-0">
            <Logo />
          </Link>
          {showAppNav && (
            <nav className="hidden flex-1 items-center gap-1 lg:flex" aria-label="Main">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={isActive(n.href) ? "page" : undefined}
                  className={cx(
                    "inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium transition",
                    isActive(n.href) ? "bg-primary/15 text-fg" : "text-muted hover:bg-surface-2 hover:text-fg",
                  )}
                >
                  <n.icon className="h-4 w-4" aria-hidden="true" />
                  {n.label}
                </Link>
              ))}
            </nav>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Link href="/verify" className={cx("btn-ghost hidden px-3 md:inline-flex", isActive("/verify") && "border-primary/50")}>
              <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Verify
            </Link>
            <ThemeToggle />
            <WalletButton />
          </div>
        </div>
      </header>

      <main id="main" className={cx("flex-1", showAppNav && "pb-20 lg:pb-0")}>
        {children}
      </main>

      <Footer />

      {showAppNav && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/90 backdrop-blur-xl lg:hidden" aria-label="Main mobile">
          <div className="mx-auto grid max-w-lg grid-cols-5">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={isActive(n.href) ? "page" : undefined}
                className={cx(
                  "flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium",
                  isActive(n.href) ? "text-primary" : "text-muted",
                )}
              >
                <n.icon className="h-5 w-5" aria-hidden="true" />
                {n.short ?? n.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}

function NetworkStatus() {
  const live = deployedNetworks();
  const first = live[0];
  const { data: block, isError } = useBlockNumber({ chainId: first?.chain.id as never, watch: true, query: { enabled: !!first, refetchInterval: 30_000 } });
  if (!first)
    return (
      <span className="inline-flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" /> Registry contract not configured
      </span>
    );
  return (
    <span className="inline-flex items-center gap-2">
      <span className={cx("h-2 w-2 rounded-full", isError ? "bg-danger" : block ? "bg-success" : "bg-muted")} aria-hidden="true" />
      {live.map((n) => n.label).join(" · ")}
      {block && <span className="font-mono">#{block.toLocaleString()}</span>}
    </span>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 text-sm text-muted sm:grid-cols-3">
        <div className="space-y-2">
          <Logo />
          <p>Protect. Prove. Prosper.</p>
          <p className="text-xs">Blockchain-powered IP protection for independent artists.</p>
        </div>
        <nav className="flex flex-col gap-2" aria-label="Footer">
          <Link href="/docs" className="hover:text-fg">User guide &amp; FAQ</Link>
          <Link href="/docs#developers" className="hover:text-fg">Developer docs</Link>
          <Link href="/docs#legal" className="hover:text-fg">Terms, privacy &amp; disclaimer</Link>
          <Link href="/verify" className="hover:text-fg">Verify a work</Link>
        </nav>
        <div className="space-y-2 text-xs">
          <NetworkStatus />
          <p className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-success" aria-hidden="true" />
            Files are fingerprinted on your device. Keys never leave your wallet.
          </p>
          <p>Networks: {NETWORKS.map((n) => n.label).join(", ")}</p>
        </div>
      </div>
    </footer>
  );
}
