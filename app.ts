import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  generateSigner,
  transactionBuilder,
  keypairIdentity as umiKeypairIdentity,
  publicKey,
  percentAmount,
  some,
  createSignerFromKeypair,
  Transaction as umiTransaction,
  TransactionBuilder,
  Keypair as umiKeyPair,
} from "@metaplex-foundation/umi";
import {
  TokenStandard,
  verifyCreatorV1,
  verifyCollectionV1,
  createProgrammableNft,
  createNft,
  findMetadataPda,
  mplTokenMetadata,
  updateV1,
  unverifyCollectionV1,
} from "@metaplex-foundation/mpl-token-metadata";
import bs58 from "bs58";
import { PublicKey, Keypair } from "@solana/web3.js";
const umi = createUmi("https://api.devnet.solana.com");
const walletKeypair = Keypair.fromSecretKey(
  bs58.decode(
    "65sehQ35zQCQtKwxQVxeprLgaJBVv5iJSQ4hzjxXu323ss5g1SbsfLvcvsJe7babffkNvBwgxxCm4pNYvpuKa7Ey"
  )
);
const RULE_SET = "AdH2Utn6Fus15ZhtenW4hZBQnvtLgM1YCW2MfVp7pYS5";
let metadata_contents : any = "https://bafyreidc7flfjxnp2rkojnjdnjbrhulviqhybmahjnmdeou47ytzl24f5a.ipfs.nftstorage.link/metadata.json"
async function mintNFT(){
const umiKeypair = umi.eddsa.createKeypairFromSecretKey(
  walletKeypair.secretKey
);
umi.use(umiKeypairIdentity(umiKeypair)).use(mplTokenMetadata());
const mint = generateSigner(umi);
let creators:any = [];
/*metadata_contents.creators.forEach((element) => {
  let createdObj:any = {
    address: null,
    share: 0,
  };
  createdObj.address = new PublicKey(element.address);
  createdObj.share = element.share;
  creators.push(createdObj);
});*/

let ownerCreatedObj = {
  address: publicKey(walletKeypair.publicKey.toBase58()),
  share: 100,
  verified: true,
};
creators.push(ownerCreatedObj);

const metadataAccount = findMetadataPda(umi, {
  mint: mint.publicKey,
});
//Collection_nft result must be nft public id it cannot be a string.
//let collection_nft : any = "New"
//let nftCollection : any = new PublicKey(collection_nft);

console.log("Initiating NFT mint Transaction");
await transactionBuilder()
  .add(
    createProgrammableNft(umi, {
      mint: mint,
      sellerFeeBasisPoints: percentAmount(0),      // sellerFeeBasisPoints: percentAmount(0),
      name: "nftName",
      symbol: "nft",
      uri: "https://bafyreidc7flfjxnp2rkojnjdnjbrhulviqhybmahjnmdeou47ytzl24f5a.ipfs.nftstorage.link/metadata.json",
      //Make sure token owner public key will be a valide public key
      tokenOwner: publicKey("8jnXRLgDCz2kPzMWUUN7Tgp7MmaUdW5RmHLftETkjNg1"),
      ruleSet: some(publicKey(RULE_SET)),
      //If you want to link a collection then use below code.
      /*collection:
        publicKey(nftCollection.toBase58()) &&
        some({
          verified: false,
          key: publicKey(nftCollection?.toBase58()),
        }),*/
      creators: some(creators),
      isMutable: true,
    })
  )
  //This code will be used when you want to verify a collection else it will be unverified collection.
  /*.add(
    verifyCollectionV1(umi, {
      metadata: metadataAccount,
      collectionMint: publicKey(nftCollection.toBase58()),
    })
  )*/
  .sendAndConfirm(umi)
  .then((element) => {
    if (element?.result.value?.err != null) {
      console.log("Mint Transaction response Error:", element.result.value.err);
      return false;
    }
    const nftAddress = new PublicKey(mint.publicKey.bytes).toBase58();
    console.log("Mint Transaction Successful, Mint Address: ", nftAddress);
  })
  .catch((err) => {
    console.log("Mint Transaction Failed:", err);
    return false;
    
  });
}
mintNFT()
