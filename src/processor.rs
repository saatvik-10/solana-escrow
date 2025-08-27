use crate::errors::EscrowError;
use crate::instructions::{EscrowInstruction, check_rent_exempt};
use crate::{Escrow, EscrowStatus};
use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::program::invoke_signed;
use solana_program::{
    account_info::AccountInfo, entrypoint::ProgramResult, msg, program::invoke,
    program_error::ProgramError, pubkey::Pubkey,
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
            let (_token_mint, expected_amount) = if is_user_a {
                (escrow.token_a_mint, escrow.amount_a)
            } else {
                (escrow.token_b_mint, escrow.amount_b)
            };

            if amount != expected_amount {
                return Err(EscrowError::InvalidAmount.into());
            }

            //token transfer instruction
            let transfer_instruction = spl_token::instruction::transfer(
                token_program.key,
                depositor_token_account.key,
                vault_token_account.key,
                depositor_account.key,
                &[],
                amount,
            )?;

            //cpi transfer
            invoke(
                &transfer_instruction,
                &[
                    depositor_account.clone(),
                    vault_token_account.clone(),
                    depositor_token_account.clone(),
                    token_program.clone(),
                ],
            )?;

            //updating the escrow state
            if is_user_a {
                escrow.token_a_deposited = true;
            } else {
                escrow.token_b_deposited = true;
            }

            //saving the escrow state
            escrow.serialize(&mut &mut escrow_account.data.borrow_mut()[..])?;

            msg!("Deposit successful! Amount: {}", amount);
        }

        EscrowInstruction::CompleteSwap { .. } => {
            let caller = &accounts[0];
            let escrow_account = &accounts[1];
            let vault_authority = &accounts[2];
            let vault_token_a = &accounts[3];
            let vault_token_b = &accounts[4];
            let user_a_token_account = &accounts[5];
            let user_b_token_account = &accounts[6];
            let token_program = &accounts[7];

            if !caller.is_signer {
                return Err(EscrowError::UnauthorizedCancel.into());
            }

            let mut escrow = Escrow::try_from_slice(&escrow_account.data.borrow())?;

            if caller.key != &escrow.user_a && caller.key != &escrow.user_b {
                return Err(EscrowError::UnauthorizedCancel.into());
            }

            if !escrow.token_a_deposited || !escrow.token_b_deposited {
                return Err(EscrowError::EscrowNotReady.into());
            }

            let (vault_pda, vault_bump) =
                Pubkey::find_program_address(&[b"vault", escrow_account.key.as_ref()], program_id);

            let transfer_a_ix = spl_token::instruction::transfer(
                token_program.key,
                vault_token_a.key,
                user_a_token_account.key,
                &vault_pda,
                &[],
                escrow.amount_a,
            )?;

            let transfer_b_ix = spl_token::instruction::transfer(
                token_program.key,
                vault_token_b.key,
                user_b_token_account.key,
                &vault_pda,
                &[],
                escrow.amount_b,
            )?;

            let seeds: &[&[u8]] = &[b"vault", escrow_account.key.as_ref(), &[vault_bump]];
            let signer_seeds = &[seeds];

            invoke_signed(
                &transfer_a_ix,
                &[
                    vault_token_a.clone(),
                    user_a_token_account.clone(),
                    vault_authority.clone(),
                    token_program.clone(),
                ],
                signer_seeds,
            )?;

            invoke_signed(
                &transfer_b_ix,
                &[
                    vault_token_b.clone(),
                    user_b_token_account.clone(),
                    vault_authority.clone(),
                    token_program.clone(),
                ],
                signer_seeds,
            )?;

            escrow.status = EscrowStatus::Completed;

            escrow.serialize(&mut &mut escrow_account.data.borrow_mut()[..])?;

            msg!("Tokens have been swapped successfully!");
        }

        EscrowInstruction::Cancel { .. } => {
            let caller = &accounts[0];
            let escrow_account = &accounts[1];
            let vault_authority = &accounts[2];
            let vault_token_a = &accounts[3];
            let vault_token_b = &accounts[4];
            let user_a_token_account = &accounts[5];
            let user_b_token_account = &accounts[6];
            let token_program = &accounts[7];

            if !caller.is_signer {
                return Err(EscrowError::UnauthorizedCancel.into());
            }

            let mut escrow = Escrow::try_from_slice(&escrow_account.data.borrow())?;

            if caller.key != &escrow.user_a && caller.key != &escrow.user_b {
                return Err(EscrowError::UnauthorizedCancel.into());
            }

            if !matches!(&escrow.status, EscrowStatus::Active) {
                return Err(EscrowError::EscrowNotReady.into());
            }

            if escrow.token_a_deposited && escrow.token_b_deposited {
                return Err(EscrowError::UnauthorizedCancel.into());
            }

            let (vault_pda, vault_bump) =
                Pubkey::find_program_address(&[b"vault", escrow_account.key.as_ref()], program_id);

            let seeds: &[&[u8]] = &[b"vault", escrow_account.key.as_ref(), &[vault_bump]];
            let signer_seeds = &[seeds];

            //refunding
            if escrow.token_a_deposited {
                let refund_a_ix = spl_token::instruction::transfer(
                    token_program.key,
                    vault_token_a.key,
                    user_a_token_account.key,
                    &vault_pda,
                    &[],
                    escrow.amount_a,
                )?;

                invoke_signed(
                    &refund_a_ix,
                    &[
                        vault_token_a.clone(),
                        user_a_token_account.clone(),
                        vault_authority.clone(),
                        token_program.clone(),
                    ],
                    signer_seeds,
                )?;

                escrow.token_a_deposited = false;
            }

            if escrow.token_b_deposited {
                let refund_b_ix = spl_token::instruction::transfer(
                    token_program.key,
                    vault_token_b.key,
                    user_b_token_account.key,
                    &vault_pda,
                    &[],
                    escrow.amount_b,
                )?;

                invoke_signed(
                    &refund_b_ix,
                    &[
                        vault_token_b.clone(),
                        user_b_token_account.clone(),
                        vault_authority.clone(),
                        token_program.clone(),
                    ],
                    signer_seeds,
                )?;

                escrow.token_b_deposited = false;
            }

            escrow.status = EscrowStatus::Cancelled;

            escrow.serialize(&mut &mut escrow_account.data.borrow_mut()[..])?;

            msg!("Escrow cancelled! Refund has been initiated!");
        }
    }

    Ok(())
}
