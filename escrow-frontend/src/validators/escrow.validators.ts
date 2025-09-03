import { z } from 'zod';

const SOLANA_PUBKEY = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const solanaPublicKey = z
  .string()
  .regex(SOLANA_PUBKEY, 'Invalid Solana public key');

export const EscrowDataSchema = z.object({
  user_a: solanaPublicKey,
  user_b: solanaPublicKey,
  token_a_mint: solanaPublicKey,
  token_b_mint: solanaPublicKey,
  amount_a: z.number().positive('Initializer Amount must be valid'),
  amount_b: z.number().positive('Receiver Amount must be valid'),
  token_a_deposited: z.boolean(),
  token_b_deposited: z.boolean(),
  vault_pda: solanaPublicKey,
  status: z.enum(['Active', 'Completed', 'Cancelled']),
});

export const InitializeEscrowSchema = z.object({
  initializerTokenMint: solanaPublicKey,
  receiverTokenMint: solanaPublicKey,
  initializerAmount: z.string().min(1, 'Amount required'),
  receiverAmount: z.string().min(1, 'Amount required'),
});

export const DepositEscrowSchema = z.object({
  escrowAccount: solanaPublicKey,
  depositAmount: z.string().min(1, 'Amount required'),
});

export const CompletedEscrowSchema = z.object({
  escrowAccount: solanaPublicKey,
});

export const CancelledEscrowSchema = z.object({
  escrowAccount: solanaPublicKey,
});

export type EscrowData = z.infer<typeof EscrowDataSchema>;
export type InitializeEscrow = z.infer<typeof InitializeEscrowSchema>;
export type DepositEscrow = z.infer<typeof DepositEscrowSchema>;
export type CompletedEscrow = z.infer<typeof CompletedEscrowSchema>;
export type CancelledEscrow = z.infer<typeof CancelledEscrowSchema>;
