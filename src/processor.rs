use solana_program::{account_info::AccountInfo, entrypoint::ProgramResult, pubkey::Pubkey};

use crate::instruction::EscrowInstruction;

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let instruction = EscrowInstruction::unpack(instruction_data)?;

    match instruction {
        EscrowInstruction::InitEscrow { .. } => {}

        EscrowInstruction::Deposit { .. } => {}

        EscrowInstruction::CompleteSwap { .. } => {}

        EscrowInstruction::Cancel { .. } => {}
    }

    Ok(());
}
