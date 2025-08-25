use crate::errors::EscrowError;
use crate::instructions::{EscrowInstruction, check_rent_exempt};
use borsh::BorshDeserialize;
use solana_program::{account_info::AccountInfo, entrypoint::ProgramResult, pubkey::Pubkey};

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let instruction = EscrowInstruction::try_from_slice(instruction_data)?;

    match instruction {
        EscrowInstruction::InitEscrow { .. } => {
            let user_a_account = &accounts[0];
            let escrow_account = &accounts[1];
            let rent_account = &accounts[2];

            if !user_a_account.is_signer {
                return Err(EscrowError::UnauthorizedCancel.into());
            }

            check_rent_exempt(escrow_account, rent_account)?;
        }

        EscrowInstruction::Deposit { .. } => {}

        EscrowInstruction::CompleteSwap { .. } => {}

        EscrowInstruction::Cancel { .. } => {}
    }

    Ok(())
}
