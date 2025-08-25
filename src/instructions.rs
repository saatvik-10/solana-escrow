use solana_program::{
    account_info::AccountInfo,
    program_error::ProgramError,
    pubkey::Pubkey,
    sysvar::{Sysvar, rent::Rent},
};
use borsh::{BorshDeserialize, BorshSerialize};

#[derive(BorshDeserialize, BorshSerialize, Debug)]
pub enum EscrowInstruction {
    InitEscrow {
        //token type and how much
        token_a_mint: Pubkey,
        token_b_mint: Pubkey,
        amount_a: u64,
        amount_b: u64,
    },
    Deposit,
    CompleteSwap,
    Cancel,
}

pub fn check_rent_exempt(
    account: &AccountInfo,
    rent_account: &AccountInfo,
) -> Result<(), ProgramError> {
    let rent = Rent::from_account_info(rent_account)?;
    if !rent.is_exempt(account.lamports(), account.data_len()) {
        return Err(ProgramError::AccountNotRentExempt);
    }
    Ok(())
}
