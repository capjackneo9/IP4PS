"use client";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";
import type { Abi } from "viem";
import { useAccount, useSwitchChain, useWriteContract } from "wagmi";
import { simulateContract, waitForTransactionReceipt } from "wagmi/actions";
import { explainError } from "./errors";
import { wagmiConfig } from "./wagmi";

/** Simulate → sign → confirm, with toasts, switching network first when needed. Refreshes all reads afterwards. */
export function useTx() {
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();
  const { chainId, address } = useAccount();
  const qc = useQueryClient();
  const [pending, setPending] = useState<string>();

  async function run(
    label: string,
    call: { address: `0x${string}`; abi: Abi; functionName: string; args?: readonly unknown[]; value?: bigint; chainId: number },
  ) {
    const id = toast.loading(`${label}: preparing…`);
    setPending(label);
    try {
      if (chainId !== call.chainId) await switchChainAsync({ chainId: call.chainId as never });
      const { request } = await simulateContract(wagmiConfig, { ...call, account: address, chainId: call.chainId as never } as never);
      toast.loading(`${label}: confirm in your wallet`, { id });
      const hash = await writeContractAsync(request as never);
      toast.loading(`${label}: waiting for confirmation…`, { id });
      const receipt = await waitForTransactionReceipt(wagmiConfig, { hash, chainId: call.chainId as never });
      if (receipt.status !== "success") throw new Error("Transaction reverted");
      toast.success(`${label}: done`, { id });
      await qc.invalidateQueries();
      return hash;
    } catch (e) {
      toast.error(`${label}: ${explainError(e)}`, { id });
      return undefined;
    } finally {
      setPending(undefined);
    }
  }
  return { run, pending };
}
