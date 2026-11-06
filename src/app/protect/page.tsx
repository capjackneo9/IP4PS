import type { Metadata } from "next";
import { Suspense } from "react";
import { ConnectGate } from "@/components/ConnectGate";
import { Wizard } from "@/components/protect/Wizard";

export const metadata: Metadata = { title: "New Protection" };

export default function ProtectPage() {
  return (
    <ConnectGate title="Connect your wallet to protect a work">
      <Suspense>
        <Wizard />
      </Suspense>
    </ConnectGate>
  );
}
