import fs from "fs";
import { getFileData, writeFileData } from "./helper";
import { toPublicKey } from "@metaplex-foundation/js";

export const networkName = "devnet";
export const decimals = 6;
export const totalSupply = 96000000000;
export const name = "WOKE FRENS";
export const symbol = "$WOKE";
export const image =
  "https://bafkreievpa5j5w7mpbny3gpzvwdckculahwnvzwpnaekns5dvrj7kma5ra.ipfs.nftstorage.link/";
export const royalty = 1000; // 100 = 1%
export const isMutable = true;
export const newUpdateAuthority = undefined;
export const mintAuthority = null;
export const freezeAuthority = null;

// royalty distribution
export const creators = newUpdateAuthority
  ? [{ address: toPublicKey(newUpdateAuthority), share: 100 }]
  : undefined;

const mintAddressConfig = {
  path: "spl/outputs/mintAddress.txt",
  key: "MINT_ADDRESS",
};
export const getMintAddress = async () => {
  return getFileData(mintAddressConfig.path, mintAddressConfig.key);
};
export const setMintAddress = async (data: string) => {
  return writeFileData(mintAddressConfig.path, mintAddressConfig.key, data);
};
