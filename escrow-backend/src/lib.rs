use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::pubkey::Pubkey;

pub mod entrypoint;
pub mod errors;
pub mod instructions;
pub mod processor;

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone, PartialEq)]
pub struct Escrow {
    pub user_a: Pubkey,
    pub user_b: Pubkey,
    pub token_a_mint: Pubkey,
    pub token_b_mint: Pubkey,
    pub amount_a: u64,
    pub amount_b: u64,
    pub token_a_deposited: bool,
    pub token_b_deposited: bool,
    pub vault_pda: Pubkey,
    pub status: EscrowStatus,
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone, PartialEq)]
pub enum EscrowStatus {
    Active,
    Completed,
    Cancelled,
}
