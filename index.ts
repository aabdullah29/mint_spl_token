import {
  SystemProgram,
  Keypair,
  Connection,
  PublicKey,
  clusterApiUrl,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  getMinimumBalanceForRentExemptMint,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
} from "@solana/spl-token";
import {
  DataV2,
  createCreateMetadataAccountV3Instruction,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  bundlrStorage,
  keypairIdentity,
  Metaplex,
  UploadMetadataInput,
} from "@metaplex-foundation/js";
import { bs58 } from "@project-serum/anchor/dist/cjs/utils/bytes";
require("dotenv").config();

// network config
const getNetworkConfig = (network: string) => {
  return network === "mainnet"
    ? {
        cluster: clusterApiUrl("mainnet-beta"),
        address: "https://node1.bundlr.network",
        providerUrl: "https://api.mainnet-beta.solana.com",
      }
    : {
        cluster: clusterApiUrl("devnet"),
        address: "https://devnet.bundlr.network",
        providerUrl: "https://api.devnet.solana.com",
      };
};

// upload metadata on arwave function
const uploadMetadata = async (
  metaplex: Metaplex,
  tokenMetadata: UploadMetadataInput
): Promise<string> => {
  const { uri } = await metaplex.nfts().uploadMetadata(tokenMetadata);
  return uri;
};

// mint token instuction function
const createMintTokenTransaction = async (
  connection: Connection,
  metaplex: Metaplex,
  payer: Keypair,
  mintKeypair: Keypair,
  token: any,
  tokenMetadata: DataV2,
  destinationWallet: PublicKey,
  mintAuthority: PublicKey
  // freezeAuthority: PublicKey,
) => {
  const requiredBalance = await getMinimumBalanceForRentExemptMint(connection);
  const metadataPDA = metaplex
    .nfts()
    .pdas()
    .metadata({ mint: mintKeypair.publicKey });
  const tokenATA = await getAssociatedTokenAddress(
    mintKeypair.publicKey,
    destinationWallet
  );

  const txInstructions: TransactionInstruction[] = [];
  txInstructions.push(
    // 1st
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mintKeypair.publicKey,
      space: MINT_SIZE,
      lamports: requiredBalance,
      programId: TOKEN_PROGRAM_ID,
    }),
    // 2nd
    createInitializeMintInstruction(
      mintKeypair.publicKey,
      token.decimals,
      mintAuthority,
      // freezeAuthority,
      null,
      TOKEN_PROGRAM_ID
    ),
    // 3rd
    createAssociatedTokenAccountInstruction(
      payer.publicKey,
      tokenATA,
      payer.publicKey,
      mintKeypair.publicKey
    ),
    // 4th
    createMintToInstruction(
      mintKeypair.publicKey,
      tokenATA,
      mintAuthority,
      token.totalSupply * Math.pow(10, token.decimals)
    ),
    // 5th
    createCreateMetadataAccountV3Instruction(
      {
        metadata: metadataPDA,
        mint: mintKeypair.publicKey,
        mintAuthority: mintAuthority,
        payer: payer.publicKey,
        updateAuthority: mintAuthority,
      },
      {
        createMetadataAccountArgsV3: {
          data: tokenMetadata,
          isMutable: true,
          collectionDetails: null,
        },
      }
    )
  );

  // get last block and initiate transaction
  const latestBlockhash = await connection.getLatestBlockhash();
  const messageV0 = new TransactionMessage({
    payerKey: payer.publicKey,
    recentBlockhash: latestBlockhash.blockhash,
    instructions: txInstructions,
  }).compileToV0Message();
  console.log("   ✅ - Compiled Transaction Message");
  const transaction = new VersionedTransaction(messageV0);
  transaction.sign([payer, mintKeypair]);
  return transaction;
};

/* 
 main function
*/
const main = async () => {
  const network = getNetworkConfig("devnet");
  const connection = new Connection(network.cluster);
  const secretKey: any = process.env.USER_WALLET;
  const userWallet = Keypair.fromSecretKey(bs58.decode(secretKey));
  console.log("userWallet address: ", userWallet.publicKey.toString());

  // create metaplex instance
  const metaplex = Metaplex.make(connection)
    .use(keypairIdentity(userWallet))
    .use(
      bundlrStorage({
        address: network.address,
        providerUrl: network.providerUrl,
        timeout: 60000,
      })
    );

  // token data
  const token = {
    decimals: 6,
    totalSupply: 10000000000000, //10,000,000,000,000
  };

  // token ofchain metadata
  const tokenMetadata: UploadMetadataInput = {
    name: "AbdullahTestToken", // token name
    symbol: "ATT", // token symbol
    // image uri
    image:
      "https://quizizz.com/_media/quizzes/ed154ed7-0959-4a99-9aac-ff2256cd000b_400_400",
  };

  // upload metadata
  let metadataUri = await uploadMetadata(metaplex, tokenMetadata);

  // convert metadata in V2
  const tokenMetadataV2 = {
    name: tokenMetadata.name,
    symbol: tokenMetadata.symbol,
    uri: metadataUri, // uploaded metadata uri
    sellerFeeBasisPoints: 1000, // royalty 10%
    creators: null,
    collection: null,
    uses: null,
  } as DataV2;

  // new solana address for token
  let mintKeypair = Keypair.generate();
  console.log(`token Address: ${mintKeypair.publicKey.toString()}`);

  const mintTransaction: VersionedTransaction =
    await createMintTokenTransaction(
      connection,
      metaplex,
      userWallet,
      mintKeypair,
      token,
      tokenMetadataV2,
      userWallet.publicKey,
      mintKeypair.publicKey
    );

  // get chain block data
  let { lastValidBlockHeight, blockhash } = await connection.getLatestBlockhash(
    "finalized"
  );
  const transactionId = await connection.sendTransaction(mintTransaction);
  await connection.confirmTransaction({
    signature: transactionId,
    lastValidBlockHeight,
    blockhash,
  });
  console.log(`transaction Hash`, transactionId);
  console.log(
    `Transaction: https://explorer.solana.com/tx/${transactionId}?cluster=devnet`
  );
};

main();
