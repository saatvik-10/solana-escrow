use crate::errors::EscrowError;
use crate::instructions::{EscrowInstruction, check_rent_exempt};
use crate::{Escrow, EscrowStatus};
use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::AccountInfo, entrypoint::ProgramResult, program_error::ProgramError,
    pubkey::Pubkey,
};

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let instruction = EscrowInstruction::try_from_slice(instruction_data)?;

    match instruction {
        EscrowInstruction::InitEscrow {
            token_a_mint,
            token_b_mint,
            amount_a,
            amount_b,
        } => {
            let user_a_account = &accounts[0];
            let escrow_account = &accounts[1];
            let rent_account = &accounts[2];

            if !user_a_account.is_signer {
                return Err(EscrowError::UnauthorizedCancel.into());
            }

            check_rent_exempt(escrow_account, rent_account)?;

            if escrow_account.owner != program_id {
                return Err(ProgramError::IncorrectProgramId);
            }

            let (vault_pda, _vault_bump) =
                Pubkey::find_program_address(&[b"vault", escrow_account.key.as_ref()], program_id);

            let escrow = Escrow {
                user_a: *user_a_account.key,
                user_b: Pubkey::default(),
                token_a_mint,
                token_b_mint,
                amount_a,
                amount_b,
                token_a_deposited: false,
                token_b_deposited: false,
                vault_pda,
                status: EscrowStatus::Active,
            };

            escrow.serialize(&mut &mut escrow_account.data.borrow_mut()[..])?;
        }

        EscrowInstruction::Deposit { amount } => {
            let depositor_account = &accounts[0];
            let escrow_account = &accounts[1];
            let depositor_token_account = &accounts[2];
            let vault_token_account = &accounts[3];
            let token_program = &accounts[4];

            let mut escrow = Escrow::try_from_slice(&escrow_account.data.borrow())?;

            if !depositor_account.is_signer {
                return Err(EscrowError::UnauthorizedCancel.into());
            }

            //checking if user_a depositing of user_b
            let is_user_a = depositor_account.key == &escrow.user_a;
            let is_user_b = depositor_account.key == &escrow.user_b;

            if !is_user_a && !is_user_b {
                return Err(EscrowError::UnauthorizedCancel.into());
            }

            //double deposit checking
            if is_user_a && escrow.token_a_deposited {
                return Err(EscrowError::AlreadyDeposited.into());
            }

            if is_user_b && escrow.token_b_deposited {
                return Err(EscrowError::AlreadyDeposited.into());
            }

            //if user_b depositing for the first , setting their address
            if is_user_b && escrow.user_b == Pubkey::default() {
                escrow.user_b = *depositor_account.key;
            }

            //token and the amount to transfer
            let (token_mint, expected_amount) = if is_user_a {
                (escrow.token_a_mint, escrow.amount_a)
            } else {
                (escrow.token_b_mint, escrow.amount_b)
            };

            if amount != expected_amount {
                return Err(EscrowError::InvalidAmount.into());
            }
        }

        EscrowInstruction::CompleteSwap { .. } => {}

        EscrowInstruction::Cancel { .. } => {}
    }

    Ok(())
}
