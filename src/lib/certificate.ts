import { formatUtc } from "./format";

export interface CertificateData {
  title: string;
  typeLabel: string;
  creatorName: string;
  creator: string;
  owner: string;
  tokenId: string;
  network: string;
  chainId: number;
  contract: string;
  txHash?: string;
  blockNumber: string;
  registeredAt: Date;
  files: { name: string; sha256: string; cid?: string }[];
  verifyUrl: string;
  pillars: { synergy: boolean; time: boolean; elements: boolean; celestialBodies: boolean };
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const safeName = (s: string) => s.replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").slice(0, 60) || "work";

export function downloadCertificateJson(c: CertificateData) {
  const body = {
    certificate: "IP4PS Certificate of IP Protection",
    ...c,
    registeredAt: c.registeredAt.toISOString(),
    howToVerify:
      "Call verifyFourPillars(tokenId) and getIP(tokenId) on the contract, or open verifyUrl. To check a file, compute its SHA-256 and call tokenOfHash(hash).",
  };
  download(new Blob([JSON.stringify(body, null, 2)], { type: "application/json" }), `IP4PS-${safeName(c.title)}-${c.tokenId}.json`);
}

export async function downloadCertificatePdf(c: CertificateData) {
  const [{ jsPDF }, QR] = await Promise.all([import("jspdf"), import("qrcode")]);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;

  // Header band
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, 48, "F");
  doc.setFillColor(99, 102, 241);
  doc.rect(0, 48, W * 0.5, 2, "F");
  doc.setFillColor(139, 92, 246);
  doc.rect(W * 0.5, 48, W * 0.3, 2, "F");
  doc.setFillColor(245, 158, 11);
  doc.rect(W * 0.8, 48, W * 0.2, 2, "F");
  // Pillars mark
  doc.setFillColor(245, 158, 11);
  doc.triangle(16, 16, 28, 11, 40, 16, "F");
  [17, 23, 29, 35].forEach((x) => doc.rect(x, 18, 3, 13, "F"));
  doc.rect(15, 32, 26, 3, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Certificate of IP Protection", 48, 24);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("IP4PS - Intellectual Property 4 Pillars System", 48, 32);
  doc.text("Protect. Prove. Prosper.", 48, 38);

  doc.setTextColor(30, 41, 59);
  let y = 64;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  const titleLines = doc.splitTextToSize(c.title, 130);
  doc.text(titleLines, 18, y);
  y += titleLines.length * 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139);
  doc.text(`${c.typeLabel} by ${c.creatorName || c.creator}`, 18, y);
  y += 10;

  const qr = await QR.toDataURL(c.verifyUrl, { margin: 1, width: 300 });
  doc.addImage(qr, "PNG", W - 58, 56, 40, 40);
  doc.setFontSize(7);
  doc.text("Scan to verify", W - 38, 99, { align: "center" });

  const row = (label: string, value: string, mono = false) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(label.toUpperCase(), 18, y);
    doc.setFont(mono ? "courier" : "helvetica", "normal");
    doc.setFontSize(mono ? 8.5 : 10.5);
    doc.setTextColor(30, 41, 59);
    const lines = doc.splitTextToSize(value, 130);
    doc.text(lines, 62, y);
    y += Math.max(6.5, lines.length * 4.6 + 2);
  };

  row("Token ID", `#${c.tokenId}`);
  row("Registered", formatUtc(c.registeredAt));
  row("Network", `${c.network} (chain ${c.chainId})`);
  row("Block", c.blockNumber);
  row("Contract", c.contract, true);
  if (c.txHash) row("Transaction", c.txHash, true);
  row("Creator wallet", c.creator, true);
  if (c.owner.toLowerCase() !== c.creator.toLowerCase()) row("Current owner", c.owner, true);

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("4 Pillars status", 18, y);
  y += 7;
  const p: [string, boolean][] = [
    ["P1  Synergy - smart contract record", c.pillars.synergy],
    ["P2  Time - blockchain timestamp", c.pillars.time],
    ["P3  Elements - NFT minted", c.pillars.elements],
    ["P4  Celestial Bodies - creator identity", c.pillars.celestialBodies],
  ];
  doc.setFontSize(10);
  for (const [label, ok] of p) {
    doc.setFillColor(ok ? 16 : 244, ok ? 185 : 63, ok ? 129 : 94);
    doc.circle(20, y - 1.3, 1.6, "F");
    doc.setFont("helvetica", "normal");
    doc.text(`${label}: ${ok ? "VERIFIED" : "NOT VERIFIED"}`, 25, y);
    y += 6;
  }

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`File fingerprints (SHA-256) - ${c.files.length}`, 18, y);
  y += 6;
  for (const f of c.files) {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(doc.splitTextToSize(f.name, 170)[0], 18, y);
    doc.setFont("courier", "normal");
    doc.setFontSize(7.5);
    doc.text(f.sha256, 18, y + 4);
    y += 10;
  }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("This certificate summarises a public blockchain record. The record itself, not this document, is the proof.", 18, 284);
    doc.text(`Verify: ${c.verifyUrl}`, 18, 288);
  }
  doc.save(`IP4PS-Certificate-${safeName(c.title)}-${c.tokenId}.pdf`);
}

export function shareLinks(title: string, url: string) {
  const text = `I've protected my work "${title}" with the IP4PS 4 Pillars blockchain system. Verify ownership:`;
  return {
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  };
}
