use solana_program::program_error::ProgramError;
// use thiserror::Error

#[derive(Debug)]
pub enum EscrowError {
    AlreadyDeposited,
    EscrowNotReady,
    InvalidAmount,
    UnauthorizedCancel,
}

impl From<EscrowError> for ProgramError {
    fn from(e: EscrowError) -> Self {
        match e {
            EscrowError::AlreadyDeposited => ProgramError::Custom(1000),
            EscrowError::EscrowNotReady => ProgramError::Custom(1001),
            EscrowError::InvalidAmount => ProgramError::Custom(1002),
            EscrowError::UnauthorizedCancel => ProgramError::Custom(1003),
        }
    }
}
