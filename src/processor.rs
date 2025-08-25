use crate::Escrow;
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

            let (vault_pda, _vault_bump) =
                Pubkey::find_program_address(&[b"vault", escrow_account.key.as_ref()], program_id);

            let escrow = Escrow {
                user_a: *user_a_account.key,
                user_b: Pubkey::default(),
                token_a_mint,
                token_b_mint,
                token_a_deposited: false,
                token_b_deposited: false,
                vault_pda,
                status: crate::EscrowStatus::Active,
            };
        }

        EscrowInstruction::Deposit { .. } => {}

        EscrowInstruction::CompleteSwap { .. } => {}

        EscrowInstruction::Cancel { .. } => {}
    }

    Ok(())
}
