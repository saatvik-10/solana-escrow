import { Connection, PublicKey } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getMint,
} from '@solana/spl-token';
import toast from 'react-hot-toast';

// decimals from on-chain mint info
export async function getTokenDecimals(
  connection: Connection,
  mint: PublicKey
): Promise<number> {
  try {
    const mintInfo = await getMint(connection, mint);
    return mintInfo.decimals;
  } catch (err) {
    toast.error('Failed to get token decimals');
    return 0;
  }
}

// user amount to raw token units
// parseTokenAmount("1.5", 9) = 1500000000n

export function parseTokenAmount(amountStr: string, decimals: number): bigint {
  const [whole, frac = ''] = amountStr.split('.');
  const fracPadded = (frac + '0'.repeat(decimals)).slice(0, decimals);
  const wholeBig = BigInt(whole || '0');
  const fracBig = BigInt(fracPadded || '0');
  const multiplier = BigInt('1' + '0'.repeat(decimals));
  return wholeBig * multiplier + fracBig;
}

//ata address
export async function getATA(
  owner: PublicKey,
  mint: PublicKey
): Promise<PublicKey> {
  return await getAssociatedTokenAddress(owner, mint);
}

//creating ata if not there
export async function createATA(
  connection: Connection,
  payer: PublicKey,
  owner: PublicKey,
  mint: PublicKey
) {
  const ata = await getAssociatedTokenAddress(mint, owner);

  const account = await connection.getAccountInfo(ata);
  if (account) {
    return { ata, instruction: null };
  }

  const instruction = createAssociatedTokenAccountInstruction(
    payer,
    ata,
    owner,
    mint
  );

  return { ata, instruction };
}
