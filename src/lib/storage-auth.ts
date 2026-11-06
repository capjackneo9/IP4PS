/** Shared by the browser (to build the message it signs) and the server (to check it). */
export const AUTH_HEADER = "x-ip4ps-auth";
export const AUTH_TTL_MS = 60 * 60 * 1000;

export function storageAuthMessage(address: string, issuedAt: string) {
  return [
    "IP4PS storage authorization",
    `Wallet: ${address}`,
    `Issued: ${issuedAt}`,
    "",
    "Signing lets IP4PS upload the files you choose to IPFS for one hour.",
    "It is not a transaction and cannot move funds.",
  ].join("\n");
}
