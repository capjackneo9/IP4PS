import { beforeEach, describe, expect, it } from "vitest";
import {
  createPublicClient,
  createTestClient,
  createWalletClient,
  custom,
  decodeErrorResult,
  getAddress,
  getContract,
  keccak256,
  parseEther,
  toHex,
  type Address,
  type Hex,
} from "viem";
import { hardhat } from "viem/chains";
import artifact from "../artifacts/IP4PSRegistry.json";
import { ip4psRegistryAbi as abi } from "../../src/lib/contract/abi";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const hre = require("hardhat");
const transport = custom(hre.network.provider);
const pub = createPublicClient({ chain: hardhat, transport });
const test = createTestClient({ chain: hardhat, mode: "hardhat", transport });

let accounts: Address[];
const ZERO = "0x0000000000000000000000000000000000000000" as Address;
let address: Address;
const h = (s: string): Hex => keccak256(toHex(s));

function wallet(account: Address) {
  return createWalletClient({ chain: hardhat, transport, account });
}
function as(account: Address) {
  return getContract({ address, abi, client: { public: pub, wallet: wallet(account) } });
}
/** Hardhat cannot decode this contract's custom errors, so decode the revert data with the ABI. */
async function reverts(p: Promise<unknown>, errorName: string) {
  try {
    await p;
  } catch (e) {
    const data = String((e as Error).message).match(/return data: (0x[0-9a-f]+)/i)?.[1] as Hex | undefined;
    expect(data, "revert data").toBeDefined();
    expect(decodeErrorResult({ abi, data: data! }).errorName).toBe(errorName);
    return;
  }
  throw new Error(`expected revert ${errorName}`);
}
async function mined(hash: Hex) {
  const r = await pub.waitForTransactionReceipt({ hash });
  expect(r.status).toBe("success");
  return r;
}

beforeEach(async () => {
  accounts = (await wallet(ZERO).getAddresses()).map((a) => getAddress(a));
  const hash = await wallet(accounts[0]).deployContract({ abi, bytecode: artifact.bytecode as Hex });
  const r = await mined(hash);
  address = r.contractAddress!;
});

describe("register", () => {
  it("mints a token to the creator and records all four pillars", async () => {
    const [artist] = accounts;
    const c = as(artist);
    await mined(await c.write.register([0, "single", "Silent Night Vibes", "ipfs://meta", [h("audio"), h("lyrics")], 500n]));

    const [record, files, owner] = await c.read.getIP([1n]);
    expect(record.creator).toBe(artist);
    expect(record.title).toBe("Silent Night Vibes");
    expect(record.fileCount).toBe(2);
    expect(record.contentHash).toBe(h("audio"));
    expect(files).toEqual([h("audio"), h("lyrics")]);
    expect(owner).toBe(artist);
    expect(await c.read.tokenURI([1n])).toBe("ipfs://meta");
    expect(await c.read.tokenOfHash([h("lyrics")])).toBe(1n);
    expect(await c.read.verifyFourPillars([1n])).toEqual([true, true, true, true]);
    expect(await c.read.tokensOfOwner([artist])).toEqual([1n]);

    const [receiver, amount] = await c.read.royaltyInfo([1n, 10_000n]);
    expect(receiver).toBe(artist);
    expect(amount).toBe(500n);
  });

  it("rejects a file that is already registered, even by someone else", async () => {
    const [artist, copycat] = accounts;
    await mined(await as(artist).write.register([2, "", "Vibe Art #001", "", [h("art")], 0n]));
    await reverts(as(copycat).write.register([2, "", "Stolen", "", [h("art")], 0n]), "AlreadyRegistered");
  });

  it("rejects the same file twice in one registration, empty titles and bad royalties", async () => {
    const c = as(accounts[0]);
    await reverts(c.write.register([0, "", "Dup", "", [h("a"), h("a")], 0n]), "AlreadyRegistered");
    await reverts(c.write.register([0, "", "", "", [h("b")], 0n]), "EmptyTitle");
    await reverts(c.write.register([0, "", "No files", "", [], 0n]), "NoFiles");
    await reverts(c.write.register([0, "", "Greedy", "", [h("c")], 2501n]), "RoyaltyTooHigh");
    await reverts(c.write.register([0, "", "Zero", "", [`0x${"0".repeat(64)}`], 0n]), "ZeroHash");
  });

  it("reports pillars as false for an unknown token", async () => {
    expect(await as(accounts[0]).read.verifyFourPillars([99n])).toEqual([false, false, false, false]);
    await reverts(as(accounts[0]).read.getIP([99n]), "UnknownToken");
  });

  it("keeps the creator on record after the token is transferred", async () => {
    const [artist, buyer] = accounts;
    await mined(await as(artist).write.register([1, "short", "Film", "", [h("film")], 0n]));
    await mined(await as(artist).write.transferFrom([artist, buyer, 1n]));
    const [record, , owner] = await as(buyer).read.getIP([1n]);
    expect(record.creator).toBe(artist);
    expect(owner).toBe(buyer);
  });
});

describe("licensing", () => {
  beforeEach(async () => {
    await mined(await as(accounts[0]).write.register([0, "single", "Track", "", [h("track")], 0n]));
  });

  it("activates a free license immediately", async () => {
    const [artist, licensee] = accounts;
    await mined(await as(artist).write.grantLicense([1n, licensee, 30n, 0n, "STREAMING", ""]));
    expect(await as(artist).read.isLicenseActive([1n])).toBe(true);
    expect(await as(artist).read.licensesOfToken([1n])).toEqual([1n]);
    expect(await as(artist).read.licensesOfLicensee([licensee])).toEqual([1n]);

    await test.increaseTime({ seconds: 31 * 24 * 3600 });
    await test.mine({ blocks: 1 });
    expect(await as(artist).read.isLicenseActive([1n])).toBe(false);
  });

  it("requires the licensee to pay the exact fee, then lets the licensor withdraw", async () => {
    const [artist, licensee, stranger] = accounts;
    const fee = parseEther("1");
    await mined(await as(artist).write.grantLicense([1n, licensee, 0n, fee, "COMMERCIAL", "ipfs://terms"]));
    expect(await as(artist).read.isLicenseActive([1n])).toBe(false);

    await reverts(as(stranger).write.acceptLicense([1n], { value: fee }), "NotLicensee");
    await reverts(as(licensee).write.acceptLicense([1n], { value: fee - 1n }), "WrongFee");
    await mined(await as(licensee).write.acceptLicense([1n], { value: fee }));

    const license = await as(artist).read.getLicense([1n]);
    expect(license.status).toBe(2);
    expect(license.expiresAt).toBe(2n ** 64n - 1n); // perpetual
    expect(await as(artist).read.pendingWithdrawals([artist])).toBe(fee);

    const before = await pub.getBalance({ address: artist });
    await mined(await as(artist).write.withdraw());
    expect(await pub.getBalance({ address: artist })).toBeGreaterThan(before);
    await reverts(as(artist).write.withdraw(), "NothingToWithdraw");
  });

  it("only lets the current owner grant, and only the licensor revoke an open offer", async () => {
    const [artist, licensee, stranger] = accounts;
    await reverts(as(stranger).write.grantLicense([1n, licensee, 1n, 0n, "SYNC", ""]), "NotTokenOwner");
    await reverts(as(artist).write.grantLicense([1n, artist, 1n, 0n, "SYNC", ""]), "InvalidLicensee");

    await mined(await as(artist).write.grantLicense([1n, licensee, 1n, 5n, "SYNC", ""]));
    await reverts(as(stranger).write.revokeOffer([1n]), "NotLicensor");
    await mined(await as(artist).write.revokeOffer([1n]));
    await reverts(as(licensee).write.acceptLicense([1n], { value: 5n }), "LicenseNotOffered");
  });

  it("blocks accepting an offer after the licensor sold the work", async () => {
    const [artist, licensee, buyer] = accounts;
    await mined(await as(artist).write.grantLicense([1n, licensee, 1n, 5n, "COVER", ""]));
    await mined(await as(artist).write.transferFrom([artist, buyer, 1n]));
    await reverts(as(licensee).write.acceptLicense([1n], { value: 5n }), "LicensorNoLongerOwner");
  });
});
