"use client";
import { CheckCircle2, ExternalLink, Loader2, RotateCcw, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BaseError, ContractFunctionRevertedError, parseEventLogs, UserRejectedRequestError, type Address, type Hex } from "viem";
import { useWriteContract } from "wagmi";
import { simulateContract, waitForTransactionReceipt } from "wagmi/actions";
import { explorerTx, type NetworkInfo } from "@/lib/chains";
import { abi, clientFor } from "@/lib/contract/registry";
import { wagmiConfig } from "@/lib/wagmi";
import { cx, Mono, Notice, Progress } from "../ui";
import type { RegisterArgs } from "./ReviewStep";

export interface Registration {
  tokenId: bigint;
  txHash: Hex;
  blockNumber: bigint;
  gasUsed: bigint;
  registeredAt: Date;
  network: NetworkInfo;
}

const STEPS = ["Preparing transaction", "Awaiting wallet confirmation", "Broadcasting to network", "Waiting for confirmation"];

export function explainError(e: unknown): string {
  if (e instanceof BaseError) {
    if (e.walk((x) => x instanceof UserRejectedRequestError)) return "You rejected the request in your wallet.";
    const revert = e.walk((x) => x instanceof ContractFunctionRevertedError) as ContractFunctionRevertedError | null;
    const name = revert?.data?.errorName;
    if (name === "AlreadyRegistered") return "One of these files is already registered on-chain, so it cannot be registered again.";
    if (name) return `The registry refused the transaction: ${name}.`;
    if (/insufficient funds/i.test(e.message)) return "Your wallet does not have enough funds to pay the gas fee.";
    return e.shortMessage;
  }
  return e instanceof Error ? e.message : "Something went wrong.";
}

export function RegisterStep({
  args,
  network,
  wallet,
  onSuccess,
  onBack,
}: {
  args: RegisterArgs;
  network: NetworkInfo;
  wallet: Address;
  onSuccess: (r: Registration) => void;
  onBack: () => void;
}) {
  const { writeContractAsync } = useWriteContract();
  const [step, setStep] = useState(0);
  const [hash, setHash] = useState<Hex>();
  const [error, setError] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  const started = useRef(-1);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    if (started.current === attempt) return;
    started.current = attempt;
    (async () => {
      setError(undefined);
      setHash(undefined);
      try {
        setStep(0);
        const call = {
          address: network.contract!,
          abi,
          functionName: "register" as const,
          args: [args.kind, args.subtype, args.title, args.metadataURI, args.fileHashes, args.royaltyBps] as const,
          account: wallet,
          chainId: network.chain.id as never,
        };
        const { request } = await simulateContract(wagmiConfig, call);
        setStep(1);
        const tx = await writeContractAsync(request);
        if (!alive.current) return;
        setHash(tx);
        setStep(3);
        const receipt = await waitForTransactionReceipt(wagmiConfig, { hash: tx, chainId: network.chain.id as never });
        if (receipt.status !== "success") throw new Error("The transaction was reverted on-chain.");
        const [event] = parseEventLogs({ abi, logs: receipt.logs, eventName: "IPRegistered" });
        if (!event) throw new Error("Confirmed, but the registration event was not found in the receipt.");
        const block = await clientFor(network).getBlock({ blockNumber: receipt.blockNumber });
        if (!alive.current) return;
        setStep(4);
        onSuccess({
          tokenId: event.args.tokenId,
          txHash: tx,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed,
          registeredAt: new Date(Number(block.timestamp) * 1000),
          network,
        });
      } catch (e) {
        if (alive.current) setError(explainError(e));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  // Step 3 (broadcast) is instant once the wallet returns a hash, so it is shown as complete with the hash.
  const progress = (i: number) => (step > i || (i === 2 && hash) ? 1 : step === i ? 0.6 : 0);
  const txUrl = hash ? explorerTx(network, hash) : undefined;

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">Registering on the blockchain</h2>
      <section className="card space-y-4" aria-live="polite">
        {STEPS.map((label, i) => {
          const p = progress(i);
          const failed = error && step === i;
          return (
            <div key={label}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className={cx("font-medium", p === 0 && !failed && "text-muted")}>
                  Step {i + 1}: {label}
                </span>
                {failed ? <XCircle className="h-4 w-4 text-danger" /> : p === 1 ? <CheckCircle2 className="h-4 w-4 text-success" /> : p > 0 ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : null}
              </div>
              <Progress value={p} className={cx(p > 0 && p < 1 && "animate-pulse")} />
            </div>
          );
        })}
      </section>

      {hash && (
        <section className="card text-sm">
          <p className="label">Transaction hash</p>
          <div className="flex flex-wrap items-center gap-2">
            <Mono value={hash} head={12} tail={8} />
            {txUrl && (
              <a href={txUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                View <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          <p className="mt-2 text-muted">Network: {network.label}</p>
          {step === 3 && <p className="mt-3 text-xs text-muted">💡 Confirmation usually takes seconds on Polygon. If you close this window, the registration still completes and will appear in My IP.</p>}
        </section>
      )}

      {step === 1 && !error && <Notice>Confirm the transaction in your wallet. It mints your token and records all four pillars in one step.</Notice>}

      {error && (
        <Notice tone="danger" title="Registration did not complete">
          <p>{error}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn-primary" onClick={() => setAttempt((a) => a + 1)}>
              <RotateCcw className="h-4 w-4" /> Try again
            </button>
            <button type="button" className="btn-ghost" onClick={onBack}>
              Back to review
            </button>
          </div>
        </Notice>
      )}
    </div>
  );
}
