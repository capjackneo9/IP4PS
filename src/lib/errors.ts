import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError } from "viem";

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
