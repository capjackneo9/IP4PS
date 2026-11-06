/** Gas used by IP4PSRegistry.register, measured on a local chain: ~400k base plus ~46k per fingerprinted file. */
export const estimateRegisterGas = (files: number) => 400_000 + 46_000 * Math.max(1, files);
