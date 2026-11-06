"use client";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { deployedNetworks } from "./chains";
import { fetchLicenseeLicenses, fetchOwnedWorks, fetchPendingWithdrawal, type LicenseInfo, type Work } from "./contract/registry";

/** Every work the connected wallet holds, across every network with a deployed registry. */
export function useMyWorks() {
  const { address } = useAccount();
  const networks = deployedNetworks();
  const results = useQueries({
    queries: networks.map((n) => ({
      queryKey: ["works", n.chain.id, address],
      enabled: !!address,
      queryFn: () => fetchOwnedWorks(n, address!),
    })),
  });
  const works: Work[] = results
    .flatMap((r) => r.data ?? [])
    .sort((a, b) => b.registeredAt.getTime() - a.registeredAt.getTime());
  const errors = results
    .map((r, i) => (r.error ? `${networks[i].label}: ${r.error instanceof Error ? r.error.message : "unavailable"}` : undefined))
    .filter(Boolean) as string[];
  return {
    works,
    isLoading: results.some((r) => r.isLoading),
    errors,
    networks,
    refetch: () => results.forEach((r) => r.refetch()),
  };
}

/** License offers made to the connected wallet, and fees waiting to be withdrawn. */
export function useMyLicensing() {
  const { address } = useAccount();
  const networks = deployedNetworks();
  return useQuery({
    queryKey: ["my-licensing", address, networks.map((n) => n.chain.id).join()],
    enabled: !!address && networks.length > 0,
    queryFn: async () => {
      const per = await Promise.all(
        networks.map(async (n) => {
          const [licenses, pending] = await Promise.all([
            fetchLicenseeLicenses(n, address!).catch(() => [] as LicenseInfo[]),
            fetchPendingWithdrawal(n, address!).catch(() => 0n),
          ]);
          return { network: n, licenses, pending };
        }),
      );
      return per;
    },
  });
}
