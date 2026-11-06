"use client";
import { Download, FileJson, Link2, Share2 } from "lucide-react";
import toast from "react-hot-toast";
import { downloadCertificateJson, downloadCertificatePdf, shareLinks, type CertificateData } from "@/lib/certificate";

export function ShareActions({ cert }: { cert: CertificateData }) {
  const links = shareLinks(cert.title, cert.verifyUrl);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(cert.verifyUrl);
      toast.success("Verification link copied");
    } catch {
      toast.error("Clipboard unavailable");
    }
  };
  const native = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: cert.title, text: `Verify "${cert.title}" on IP4PS`, url: cert.verifyUrl });
      } catch {
        /* dismissed */
      }
    } else window.open(links.twitter, "_blank", "noopener");
  };
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className="btn-ghost" onClick={copy}>
        <Link2 className="h-4 w-4" /> Copy verification link
      </button>
      <button
        type="button"
        className="btn-ghost"
        onClick={() => toast.promise(downloadCertificatePdf(cert), { loading: "Building certificate…", success: "Certificate downloaded", error: "Could not build PDF" })}
      >
        <Download className="h-4 w-4" /> Certificate (PDF)
      </button>
      <button type="button" className="btn-ghost" onClick={() => downloadCertificateJson(cert)}>
        <FileJson className="h-4 w-4" /> Backup (JSON)
      </button>
      <button type="button" className="btn-ghost" onClick={native}>
        <Share2 className="h-4 w-4" /> Share
      </button>
      <a className="btn-ghost" href={links.twitter} target="_blank" rel="noreferrer">
        Post on X
      </a>
      <a className="btn-ghost" href={links.linkedin} target="_blank" rel="noreferrer">
        LinkedIn
      </a>
    </div>
  );
}
