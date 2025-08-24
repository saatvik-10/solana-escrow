use solana_program::pubkey::Pubkey;

pub enum EscrowInstruction {
    InitEscrow {
        //token type and how much
        token_A_mint: Pubkey,
        token_B_mint: Pubkey,
        amount_A: u64,
        amount_b: u64,
    },
    Deposit,
    CompleteSwap,
    Cancel,
}
