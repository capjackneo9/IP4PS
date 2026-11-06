import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

export default [
  { ignores: [".next/**", "node_modules/**", "contracts/artifacts/**", "next-env.d.ts", "src/lib/contract/abi.ts"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];
