import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "IP4PS — Protect. Prove. Prosper.", template: "%s · IP4PS" },
  description:
    "Blockchain-powered IP protection for independent artists. Fingerprint your music, film, art and podcasts, timestamp them on-chain and mint proof of ownership with the 4 Pillars System.",
  keywords: ["intellectual property", "copyright", "blockchain", "NFT", "proof of creation", "artists", "musicians", "IPFS"],
  openGraph: {
    title: "IP4PS — Blockchain-Powered IP Protection for Independent Artists",
    description: "Mathematically provable ownership with the 4 Pillars: Smart Contracts, Timestamps, NFTs and Verified Identity.",
    type: "website",
    siteName: "IP4PS",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0F172A" },
    { media: "(prefers-color-scheme: light)", color: "#F8FAFC" },
  ],
};

// Applies the saved theme before first paint so the page never flashes the wrong colours.
const themeScript = `try{var t=localStorage.getItem("ip4ps:theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className={`${inter.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh font-sans antialiased">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
