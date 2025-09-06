import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  Keypair,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';
import { Buffer } from 'buffer';
import { createATA } from '@/helpers/ata';
import toast from 'react-hot-toast';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { UnsafeBurnerWalletAdapter } from '@solana/wallet-adapter-wallets';

export const ESCROW_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID!
);

//instruction data for init escrow
function initEscrowData(
  tokenAMint: PublicKey,
  tokenBMint: PublicKey,
  amountA: bigint,
  amountB: bigint
): Buffer {
  const data = Buffer.alloc(1 + 32 + 32 + 8 + 8);
  let offset = 0;

  data.writeUInt8(0, offset);
  offset += 1;

  tokenAMint.toBuffer().copy(data, offset);
  offset += 32;

  tokenBMint.toBuffer().copy(data, offset);
  offset += 32;

  data.writeBigUInt64LE(amountA, offset);
  offset += 8;

  data.writeBigUInt64LE(amountB, offset);
  offset += 8;

  return data;
}

//initializing a new escrow
export async function initializeEscrow(params: {
  connection: Connection;
  userWallet: any;
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  amountA: bigint;
  amountB: bigint;
}) {
  const { connection, userWallet, tokenAMint, tokenBMint, amountA, amountB } =
    params;

  if (!userWallet.publicKey || !userWallet.signTransaction) {
    toast.error('Wallet not connected');
  }

  const userPublicKey = userWallet.publicKey;
  const transaction = new Transaction();

  //new escrow account
  const escrowAccount = Keypair.generate();
  const rentExemption = await connection.getMinimumBalanceForRentExemption(200); //TODO

  const createAccountTx = SystemProgram.createAccount({
    fromPubkey: userPublicKey,
    newAccountPubkey: escrowAccount.publicKey,
    lamports: rentExemption,
    space: 200, //TODO
    programId: ESCROW_PROGRAM_ID,
  });

  transaction.add(createAccountTx);

  //checking user's ata
  const { instruction: createATAIx } = await createATA(
    connection,
    userPublicKey,
    userPublicKey,
    tokenAMint
  );

  if (createATAIx) {
    transaction.add(createATAIx);
  }

  //init escrow
  const instructionData = initEscrowData(
    tokenAMint,
    tokenBMint,
    amountA,
    amountB
  );

  const initEscrowIx = new TransactionInstruction({
    keys: [
      { pubkey: userPublicKey, isSigner: true, isWritable: true },
      { pubkey: escrowAccount.publicKey, isSigner: false, isWritable: true },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    programId: ESCROW_PROGRAM_ID,
    data: instructionData,
  });

  transaction.add(initEscrowIx);

  //transaction details
  transaction.feePayer = userPublicKey;
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;

  //escrow account signing first
  transaction.partialSign(escrowAccount);

  //user signing
  const signedTx = await userWallet.signTransaction(transaction);

  //to blockchain
  const txId = await connection.sendRawTransaction(signedTx.serialize());

  //confirmation
  await connection.confirmTransaction(txId, 'confirmed');

  return {
    txId,
    escrowAccount: escrowAccount.publicKey.toString(),
  };
}

function depositEscrowData(amount: bigint): Buffer {
  const data = Buffer.alloc(1 + 8);
  let offset = 0;

  data.writeUInt8(1, offset);
  offset += 1;

  data.writeBigUInt64LE(amount, offset);
  offset += 8;

  return data;
}

export async function depositEscrow(params: {
  connection: Connection;
  userWallet: any;
  escrowAccount: PublicKey;
  tokenMint: PublicKey;
  amount: bigint;
}) {
  const { connection, userWallet, escrowAccount, tokenMint, amount } = params;

  if (!userWallet.publicKey || !userWallet.signTransaction) {
    toast.error('Wallet not connected');
  }

  const userPublicKey = userWallet.publicKey;
  const transaction = new Transaction();

  //depositor token account(ata)
  const { instruction: createUserATAIx, ata: userTokenAccount } =
    await createATA(connection, userPublicKey, userPublicKey, tokenMint);

  if (createUserATAIx) {
    transaction.add(createUserATAIx);
  }

  //vault pda
  const [vaultPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), escrowAccount.toBuffer()],
    ESCROW_PROGRAM_ID
  );

  //vauls token account
  const { instruction: createVaultATAIx, ata: vaultTokenAccount } =
    await createATA(connection, userPublicKey, vaultPDA, tokenMint);

  if (createVaultATAIx) {
    transaction.add(createVaultATAIx);
  }

  const depositIx = new TransactionInstruction({
    keys: [
      { pubkey: userPublicKey, isSigner: true, isWritable: true },
      { pubkey: escrowAccount, isSigner: false, isWritable: true },
      { pubkey: userTokenAccount, isSigner: false, isWritable: true },
      { pubkey: vaultTokenAccount, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: ESCROW_PROGRAM_ID,
    data: depositEscrowData(amount),
  });

  transaction.add(depositIx);

  transaction.feePayer = userPublicKey;
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;

  const signedTx = await userWallet.signTransaction(transaction);

  const txId = await connection.sendRawTransaction(signedTx.serialize());

  await connection.confirmTransaction(txId, 'confirmed');

  return { txId };
}
