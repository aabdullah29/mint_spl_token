import { PublicKey, Keypair, Connection } from "@solana/web3.js";
import { toPublicKey } from "@metaplex-foundation/js";
import { bs58 } from "@project-serum/anchor/dist/cjs/utils/bytes";
import { getMetaplexInstance, getNetworkConfig } from "./helper";
import {
  creators,
  getMintAddress,
  image,
  name,
  networkName,
  newUpdateAuthority,
  royalty,
  symbol,
} from "./consts";
require("dotenv").config();

const secretKey: any = process.env.USER_WALLET;
const userWallet = Keypair.fromSecretKey(bs58.decode(secretKey));
console.log('\n\n\n my address: ', userWallet.publicKey);

(async () => {
  const MINT_ADDRESS = await getMintAddress(); //token address
  const network = getNetworkConfig(networkName);
  const connection = new Connection(network.cluster);
  const metaplex = getMetaplexInstance(network, connection, userWallet);

  const token = await metaplex.nfts().findByMint({
    mintAddress: new PublicKey(MINT_ADDRESS),
  });
  console.log(`Updating Metadata of Token: ${MINT_ADDRESS}`);
  console.log("Token:", token);

  if (!token) {
    throw new Error("Unable to find existing token or image uri!");
  }

  // new metadata
  const newMetadata = {
    name: name,
    symbol: symbol,
    image: image,
  };

  // upload new metadata
  const { uri: newUri } = await metaplex.nfts().uploadMetadata({
    ...token.json,
    name: newMetadata.name,
    symbol: newMetadata.symbol,
    image: newMetadata.image,
  });

  // onchain update
  const update = await metaplex.nfts().update({
    name: newMetadata.name,
    symbol: newMetadata.symbol,
    sellerFeeBasisPoints: royalty,
    creators: creators
      ? [{ address: userWallet.publicKey, share: 0, authority: userWallet}, ...creators]
      : undefined,
    nftOrSft: token,
    uri: newUri,
    isMutable: true,
    ...(newUpdateAuthority && newUpdateAuthority != userWallet.publicKey.toString()
      ? {
          newUpdateAuthority: toPublicKey(newUpdateAuthority),
          authority: userWallet,
        }
      : {}),
  });

  console.log(`New Metadata URI: ${newUri} 
  Tx Signature: ${update.response.signature}`);
})();
