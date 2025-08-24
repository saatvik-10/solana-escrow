pub struct Escrow {
    pub userA: Pubkey;
    pub userB: Pubkey;
    pub token_A_mint: Pubkey;
    pub token_B_mint: Pubkey;
    pub token_a_deposited: bool;
    pub token_b_deposited: bool;
    pub vault_pda: Pubkey;
    pub status: EscrowStatus;
}

pub enum EscrowStatus {
    Active, 
    Completed,
    Cancelled
}