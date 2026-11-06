"use client";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { WalletButton } from "../WalletButton";

export function StartButton() {
  const { isConnected } = useAccount();
  if (isConnected)
    return (
      <Link href="/protect" className="btn-gold px-6 text-base">
        Start Protecting Your Work <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    );
  return <WalletButton big label="Start Protecting Your Work" />;
}
