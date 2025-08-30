use borsh::BorshDeserialize;
use solana_escrow::{Escrow, instructions::EscrowInstruction, processor::process_instruction};
use solana_program::program_pack::Pack;
use solana_program::{
    instruction::{AccountMeta, Instruction},
    system_instruction,
};
use solana_program_test::*;
use solana_program_test::*;
use solana_sdk::{pubkey::Pubkey, signature::Keypair, signer::Signer, transaction::Transaction};
// use spl_associated_token_account;
use spl_token::state::{Account as TokenAccount, Mint};

// fn program_id() -> Pubkey {
//     Pubkey::new_unique() //for testing purpose only
// }

#[tokio::test]
async fn test_escrow_initialization() {
    let program_id = Pubkey::new_unique();
    //test environment
    let program_test =
        ProgramTest::new("solana_escrow", program_id, processor!(process_instruction));

    //testing on blockchain
    let (banks_client, payer, recent_blockhash) = program_test.start().await;

    //test accounts
    let user_a = Keypair::new();
    let escrow_account = Keypair::new();

    let dummy_escrow = Escrow {
        user_a: user_a.pubkey(),
        user_b: Pubkey::default(),
        token_a_mint: Pubkey::new_unique(),
        token_b_mint: Pubkey::new_unique(),
        amount_a: 1000,
        amount_b: 2000,
        token_a_deposited: false,
        token_b_deposited: false,
        vault_pda: Pubkey::new_unique(),
        status: solana_escrow::EscrowStatus::Active,
    };

    //escrow account on chain
    let rent = banks_client.get_rent().await.unwrap();
    let escrow_size = borsh::to_vec(&dummy_escrow).unwrap().len() as u64;
    let escrow_rent = rent.minimum_balance(escrow_size as usize);

    //initialize instruction
    let token_a_mint = Pubkey::new_unique();
    let token_b_mint = Pubkey::new_unique();
    let amount_a = 1000;
    let amount_b = 2000;

    let init_ix = EscrowInstruction::InitEscrow {
        token_a_mint,
        token_b_mint,
        amount_a,

        amount_b,
    };

    //escrow account instruction
    let create_escrow_account_ix = system_instruction::create_account(
        &payer.pubkey(),
        &escrow_account.pubkey(),
        escrow_rent,
        escrow_size,
        &program_id,
    );

    //transaction
    let init_escrow_ix = Instruction::new_with_borsh(
        program_id,
        &init_ix,
        vec![
            AccountMeta::new(user_a.pubkey(), true),
            AccountMeta::new(escrow_account.pubkey(), false),
            AccountMeta::new_readonly(solana_program::sysvar::rent::id(), false),
        ],
    );

    //verifying
    let transaction = Transaction::new_signed_with_payer(
        &[create_escrow_account_ix, init_escrow_ix],
        Some(&payer.pubkey()),
        &[&payer, &user_a, &escrow_account],
        recent_blockhash,
    );

    banks_client.process_transaction(transaction).await.unwrap();

    //if escrow was created or not
    let escrow_data = banks_client
        .get_account(escrow_account.pubkey())
        .await
        .unwrap()
        .unwrap();
    let escrow: Escrow = Escrow::try_from_slice(&escrow_data.data).unwrap();

    assert_eq!(escrow.user_a, user_a.pubkey());
    assert_eq!(escrow.token_a_mint, token_a_mint);
    assert_eq!(escrow.amount_a, amount_a);
    matches!(escrow.status, solana_escrow::EscrowStatus::Active);
}

#[tokio::test]
async fn test_deposit_tokens() {
    let program_id = Pubkey::new_unique();
    //test environment
    let program_test =
        ProgramTest::new("solana_escrow", program_id, processor!(process_instruction));

    //testing on blockchain
    let (banks_client, payer, recent_blockhash) = program_test.start().await;

    //test accounts
    let user_a = Keypair::new();
    let escrow_account = Keypair::new();
    let token_a_mint = Keypair::new();
    let token_b_mint = Keypair::new();

    let dummy_escrow = Escrow {
        user_a: user_a.pubkey(),
        user_b: Pubkey::default(),
        token_a_mint: token_a_mint.pubkey(),
        token_b_mint: token_b_mint.pubkey(),
        amount_a: 1000,
        amount_b: 2000,
        token_a_deposited: false,
        token_b_deposited: false,
        vault_pda: Pubkey::new_unique(),
        status: solana_escrow::EscrowStatus::Active,
    };

    //escrow account on chain
    let rent = banks_client.get_rent().await.unwrap();
    let escrow_size = borsh::to_vec(&dummy_escrow).unwrap().len() as u64;
    let escrow_rent = rent.minimum_balance(escrow_size as usize);

    //initialize instruction
    let amount_a = 1000;
    let amount_b = 2000;

    let init_ix = EscrowInstruction::InitEscrow {
        token_a_mint: token_a_mint.pubkey(),
        token_b_mint: token_b_mint.pubkey(),
        amount_a,
        amount_b,
    };

    //escrow account instruction
    let create_escrow_account_ix = system_instruction::create_account(
        &payer.pubkey(),
        &escrow_account.pubkey(),
        escrow_rent,
        escrow_size,
        &program_id,
    );

    //transaction
    let init_escrow_ix = Instruction::new_with_borsh(
        program_id,
        &init_ix,
        vec![
            AccountMeta::new(user_a.pubkey(), true),
            AccountMeta::new(escrow_account.pubkey(), false),
            AccountMeta::new_readonly(solana_program::sysvar::rent::id(), false),
        ],
    );

    //verifying
    let transaction = Transaction::new_signed_with_payer(
        &[create_escrow_account_ix, init_escrow_ix],
        Some(&payer.pubkey()),
        &[&payer, &user_a, &escrow_account],
        recent_blockhash,
    );

    banks_client.process_transaction(transaction).await.unwrap();

    //if escrow was created or not
    let escrow_data = banks_client
        .get_account(escrow_account.pubkey())
        .await
        .unwrap()
        .unwrap();
    let escrow: Escrow = Escrow::try_from_slice(&escrow_data.data).unwrap();

    assert_eq!(escrow.user_a, user_a.pubkey());
    assert_eq!(escrow.token_a_mint, token_a_mint.pubkey());
    assert_eq!(escrow.amount_a, amount_a);
    matches!(escrow.status, solana_escrow::EscrowStatus::Active);

    //mint account size
    let mint_size = Mint::LEN;
    let mint_rent = rent.minimum_balance(mint_size);

    //account for token a mint
    let create_token_a_mint_ix = system_instruction::create_account(
        &payer.pubkey(),
        &token_a_mint.pubkey(),
        mint_rent,
        mint_size as u64,
        &spl_token::id(),
    );

    //initializing
    let init_token_a_mint_ix = spl_token::instruction::initialize_mint(
        &spl_token::id(),
        &token_a_mint.pubkey(),
        &payer.pubkey(),
        None,
        9,
    )
    .unwrap();

    //executing token a creation
    let token_a_mint_tx = Transaction::new_signed_with_payer(
        &[create_token_a_mint_ix, init_token_a_mint_ix],
        Some(&payer.pubkey()),
        &[&payer, &token_a_mint],
        recent_blockhash,
    );

    banks_client
        .process_transaction(token_a_mint_tx)
        .await
        .unwrap();

    //account for token b mint
    let create_token_b_mint_ix = system_instruction::create_account(
        &payer.pubkey(),
        &token_b_mint.pubkey(),
        mint_rent,
        mint_size as u64,
        &spl_token::id(),
    );

    //initializing
    let init_token_b_mint_ix = spl_token::instruction::initialize_mint(
        &spl_token::id(),
        &token_b_mint.pubkey(),
        &payer.pubkey(),
        None,
        9,
    )
    .unwrap();

    //executing token a creation
    let token_b_mint_tx = Transaction::new_signed_with_payer(
        &[create_token_b_mint_ix, init_token_b_mint_ix],
        Some(&payer.pubkey()),
        &[&payer, &token_b_mint],
        recent_blockhash,
    );

    banks_client
        .process_transaction(token_b_mint_tx)
        .await
        .unwrap();

    //verification
    let token_a_mint_account = banks_client
        .get_account(token_a_mint.pubkey())
        .await
        .unwrap()
        .expect("Token A mint should exist!");
    assert_eq!(token_a_mint_account.owner, spl_token::id());
    println!("✅ Token A mint created successfully");

    let token_b_mint_account = banks_client
        .get_account(token_b_mint.pubkey())
        .await
        .unwrap()
        .expect("Token B mint should exist!");
    assert_eq!(token_b_mint_account.owner, spl_token::id());
    println!("✅ Token B mint created successfully");
}
