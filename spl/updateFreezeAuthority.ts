import {
  SystemProgram,
  Keypair,
  Connection,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  getMinimumBalanceForRentExemptMint,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  createSetAuthorityInstruction,
  AuthorityType,
} from "@solana/spl-token";
import {
  DataV2,
  createCreateMetadataAccountV3Instruction,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  Metaplex,
  UploadMetadataInput,
  toPublicKey,
} from "@metaplex-foundation/js";
import { bs58 } from "@project-serum/anchor/dist/cjs/utils/bytes";
import {
  getMetaplexInstance,
  getNetworkConfig,
  uploadMetadata,
} from "./helper";
import {
  decimals,
  getMintAddress,
  image,
  name,
  networkName,
  royalty,
  setMintAddress,
  symbol,
  totalSupply,
} from "./consts";
require("dotenv").config();

// mint token instuction function
const createMintTokenTransaction = async (
  connection: Connection,
  metaplex: Metaplex,
  payer: Keypair,
  mintKeypair: Keypair,
  decimals: any,
  totalSupply: any,
  tokenMetadata: DataV2,
  destinationWallet: PublicKey,
  mintAuthority: PublicKey,
  freezeAuthority: PublicKey | null
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
      decimals,
      mintAuthority,
      freezeAuthority,
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
      totalSupply * Math.pow(10, decimals)
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
  let tx = new Transaction().add(
    createSetAuthorityInstruction(
      mintKeypair.publicKey, // mint acocunt || token account
      payer.publicKey, // current auth
      AuthorityType.MintTokens, // authority type
      null // new auth (you can pass `null` to close it)
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
  const secretKey: any = process.env.USER_WALLET;
  const userWallet = Keypair.fromSecretKey(bs58.decode(secretKey));
  console.log("userWallet address: ", userWallet.publicKey.toString());
  const MINT_ADDRESS = await getMintAddress(); //token address
  const network = getNetworkConfig(networkName);
  const connection = new Connection(network.cluster);

  let authorityTransaction = new Transaction().add(
    createSetAuthorityInstruction(
      toPublicKey(MINT_ADDRESS), // mint acocunt || token account
      userWallet.publicKey, // current auth
      AuthorityType.FreezeAccount, // authority type
      null // new auth (you can pass `null` to close it)
    )
  );

  console.log(`Updating Authority of Token: ${MINT_ADDRESS}`);
  
  const transactionId = await sendAndConfirmTransaction(
    connection,
    authorityTransaction,
    [userWallet]
  );

  console.log(`transaction Hash`, transactionId);
};

main();
