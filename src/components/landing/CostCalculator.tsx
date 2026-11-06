"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { formatEther } from "viem";
import { NETWORKS } from "@/lib/chains";
import { clientFor, nativeUsdPrice } from "@/lib/contract/registry";
import { estimateRegisterGas } from "@/lib/gas";
import { cx } from "../ui";

export function formatCost(native: number | undefined, usd: number | undefined, symbol: string) {
  if (native === undefined) return "unavailable";
  if (usd) {
    const v = native * usd;
    return `$${v.toFixed(v < 0.1 ? 4 : 2)}`;
  }
  return `${native.toPrecision(3)} ${symbol}`;
}

/** Live cost estimate from each network's current gas price and Chainlink price feed. */
export function CostCalculator() {
  const [files, setFiles] = useState(3);
  const choices = NETWORKS.filter((n) => n.key !== "local");
  const [key, setKey] = useState(choices[0]?.key ?? "polygon");
  const net = choices.find((n) => n.key === key) ?? choices[0];

  const { data, isLoading, isError } = useQuery({
    queryKey: ["cost", net?.chain.id],
    enabled: !!net,
    refetchInterval: 60_000,
    queryFn: async () => {
      const [gasPrice, usd] = await Promise.all([clientFor(net!).getGasPrice(), nativeUsdPrice(net!)]);
      return { gasPrice, usd };
    },
  });

  const gas = estimateRegisterGas(files);
  const native = data ? Number(formatEther(data.gasPrice * BigInt(gas))) : undefined;
  const symbol = net?.chain.nativeCurrency.symbol ?? "";

  return (
    <div className="card">
      <h3 className="text-lg font-semibold">Real-time cost calculator</h3>
      <p className="mt-1 text-sm text-muted">One transaction covers all four pillars. Live gas prices; IPFS storage is included.</p>
      <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Network">
        {choices.map((n) => (
          <button
            key={n.key}
            type="button"
            role="radio"
            aria-checked={n.key === key}
            onClick={() => setKey(n.key)}
            className={cx("chip min-h-9 px-3", n.key === key && "border-primary bg-primary/15")}
          >
            {n.label}
          </button>
        ))}
      </div>
      <label className="mt-5 block">
        <span className="label">Files in this work: {files}</span>
        <input
          type="range"
          min={1}
          max={30}
          value={files}
          onChange={(e) => setFiles(Number(e.target.value))}
          className="w-full accent-[var(--primary)]"
        />
      </label>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-surface-2 p-3">
          <p className="text-muted">Estimated gas</p>
          <p className="font-mono text-lg">{gas.toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-surface-2 p-3">
          <p className="text-muted">Estimated cost</p>
          <p className="font-mono text-lg" aria-live="polite">
            {isLoading ? "…" : isError ? "unavailable" : formatCost(native, data?.usd, symbol)}
          </p>
          {native !== undefined && data?.usd && (
            <p className="font-mono text-xs text-muted">
              {native.toPrecision(3)} {symbol}
            </p>
          )}
          {net?.testnet && <p className="text-xs text-muted">Testnet — free test tokens</p>}
        </div>
      </div>
    </div>
  );
}
