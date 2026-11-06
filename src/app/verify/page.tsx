import type { Metadata } from "next";
import { Suspense } from "react";
import { VerifySearch } from "@/components/VerifySearch";

export const metadata: Metadata = {
  title: "Verify a work",
  description: "Check whether a file is protected on the blockchain with IP4PS, and who registered it first.",
};

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifySearch />
    </Suspense>
  );
}
