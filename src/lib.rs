use solana_program::pubkey::Pubkey;

pub mod instructions;
pub mod processor;
pub mod errors;

pub struct Escrow {
    pub user_a: Pubkey,
    pub user_b: Pubkey,
    pub token_a_mint: Pubkey,
    pub token_b_mint: Pubkey,
    pub token_a_deposited: bool,
    pub token_b_deposited: bool,
    pub vault_pda: Pubkey,
    pub status: EscrowStatus,
}

pub enum EscrowStatus {
    Active,
    Completed,
    Cancelled,
}
