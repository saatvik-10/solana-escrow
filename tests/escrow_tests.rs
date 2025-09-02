use std::vec;

use borsh::BorshDeserialize;
use solana_escrow::EscrowStatus;
use solana_escrow::{Escrow, instructions::EscrowInstruction, processor::process_instruction};
use solana_program::program_pack::Pack;
use solana_program::{
    instruction::{AccountMeta, Instruction},
    system_instruction,
};
use solana_program_test::*;
use solana_sdk::{pubkey::Pubkey, signature::Keypair, signer::Signer, transaction::Transaction};
use spl_associated_token_account;
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
    let user_b = Keypair::new();
    let escrow_account = Keypair::new();
    let token_a_mint = Keypair::new();
    let token_b_mint = Keypair::new();

    let (vault_pda, vault_bump) =
        Pubkey::find_program_address(&[b"vault", escrow_account.pubkey().as_ref()], &program_id);

    let dummy_escrow = Escrow {
        user_a: user_a.pubkey(),
        user_b: Pubkey::default(),
        token_a_mint: token_a_mint.pubkey(),
        token_b_mint: token_b_mint.pubkey(),
        amount_a: 1000,
        amount_b: 2000,
        token_a_deposited: false,
        token_b_deposited: false,
        vault_pda,
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

    println!("Creating user token accounts!");

    let user_a_token_account = spl_associated_token_account::get_associated_token_address(
        &user_a.pubkey(),
        &token_a_mint.pubkey(),
    );

    //ata instruction
    let create_user_a_ata_ix = spl_associated_token_account::create_associated_token_account(
        &payer.pubkey(),
        &user_a.pubkey(),
        &token_a_mint.pubkey(),
    );

    //instruction
    let create_ata_ix = Transaction::new_signed_with_payer(
        &[create_user_a_ata_ix],
        Some(&payer.pubkey()),
        &[&payer],
        recent_blockhash,
    );

    banks_client
        .process_transaction(create_ata_ix)
        .await
        .unwrap();

    //verifying the ata creationg
    let user_a_ata_account = banks_client
        .get_account(user_a_token_account)
        .await
        .unwrap()
        .expect("User a ata token should exist");
    assert_eq!(user_a_ata_account.owner, spl_token::id());
    println!("✅ User A's ata account created successfully");

    let user_b_token_account = spl_associated_token_account::get_associated_token_address(
        &user_b.pubkey(),
        &token_b_mint.pubkey(),
    );

    //ata instruction
    let create_user_b_ata_ix = spl_associated_token_account::create_associated_token_account(
        &payer.pubkey(),
        &user_b.pubkey(),
        &token_b_mint.pubkey(),
    );

    //instruction
    let create_ata_ix = Transaction::new_signed_with_payer(
        &[create_user_b_ata_ix],
        Some(&payer.pubkey()),
        &[&payer],
        recent_blockhash,
    );

    banks_client
        .process_transaction(create_ata_ix)
        .await
        .unwrap();

    //verifying the ata creationg
    let user_b_ata_account = banks_client
        .get_account(user_b_token_account)
        .await
        .unwrap()
        .expect("User b ata token should exist");
    assert_eq!(user_b_ata_account.owner, spl_token::id());
    println!("✅ User B's ata account created successfully");

    //minting tokens to users
    println!("Minting tokens to users...");

    //to user_a
    let mint_to_user_a = spl_token::instruction::mint_to(
        &spl_token::id(),
        &token_a_mint.pubkey(),
        &&user_a_token_account,
        &payer.pubkey(),
        &[],
        amount_a,
    )
    .unwrap();

    //executing
    let mint_to_user_a_tx = Transaction::new_signed_with_payer(
        &[mint_to_user_a],
        Some(&payer.pubkey()),
        &[&payer],
        recent_blockhash,
    );

    banks_client
        .process_transaction(mint_to_user_a_tx)
        .await
        .unwrap();

    //verification
    let user_a_ata_data = banks_client
        .get_account(user_a_token_account)
        .await
        .unwrap()
        .unwrap();

    let user_a_token_balance = TokenAccount::unpack(&user_a_ata_data.data).unwrap();
    assert_eq!(user_a_token_balance.amount, amount_a);
    println!("✅ User A received {} Token A", amount_a);

    //to user_b
    let mint_to_user_b = spl_token::instruction::mint_to(
        &spl_token::id(),
        &token_b_mint.pubkey(),
        &user_b_token_account,
        &payer.pubkey(),
        &[],
        amount_b,
    )
    .unwrap();

    //executing
    let mint_to_user_b_tx = Transaction::new_signed_with_payer(
        &[mint_to_user_b],
        Some(&payer.pubkey()),
        &[&payer],
        recent_blockhash,
    );

    banks_client
        .process_transaction(mint_to_user_b_tx)
        .await
        .unwrap();

    //verification
    let user_b_ata_data = banks_client
        .get_account(user_b_token_account)
        .await
        .unwrap()
        .unwrap();

    let user_b_token_balance = TokenAccount::unpack(&user_b_ata_data.data).unwrap();
    assert_eq!(user_b_token_balance.amount, amount_b);
    println!("✅ User B received {} Token B", amount_b);

    //deposit test
    println!("Testing deposit instruction...");

    println!("Creating vault A token account...");

    let vault_token_a_account = spl_associated_token_account::get_associated_token_address(
        &vault_pda,             // Owner = vault PDA
        &token_a_mint.pubkey(), // Mint = Token A
    );

    // Create the vault's ATA
    let create_vault_ata_ix = spl_associated_token_account::create_associated_token_account(
        &payer.pubkey(),        // Payer
        &vault_pda,             // Owner (the vault PDA)
        &token_a_mint.pubkey(), // Mint
    );

    // Execute vault ATA creation
    let create_vault_tx = Transaction::new_signed_with_payer(
        &[create_vault_ata_ix],
        Some(&payer.pubkey()),
        &[&payer],
        recent_blockhash,
    );

    banks_client
        .process_transaction(create_vault_tx)
        .await
        .unwrap();

    // Verify vault ATA
    let vault_ata_account = banks_client
        .get_account(vault_token_a_account)
        .await
        .unwrap()
        .expect("Vault ATA should exist");

    assert_eq!(vault_ata_account.owner, spl_token::id());
    println!("✅ Vault token account created");

    let deposit_a_ix = EscrowInstruction::Deposit { amount: (1000) };

    //deposit instruction
    let deposit_a_instruction = Instruction::new_with_borsh(
        program_id,
        &deposit_a_ix,
        vec![
            AccountMeta::new(user_a.pubkey(), true),          // depositor
            AccountMeta::new(escrow_account.pubkey(), false), // escrow account
            AccountMeta::new(user_a_token_account, false),    // depositor's token account
            AccountMeta::new(vault_token_a_account, false),   // vault's token account ← FIXED!
            AccountMeta::new_readonly(spl_token::id(), false), // token program
        ],
    );

    //executing deposit
    let deposit_a_tx = Transaction::new_signed_with_payer(
        &[deposit_a_instruction],
        Some(&payer.pubkey()),
        &[&payer, &user_a],
        recent_blockhash,
    );

    banks_client
        .process_transaction(deposit_a_tx)
        .await
        .unwrap();

    //verification
    let escrow_after_deposit = banks_client
        .get_account(escrow_account.pubkey())
        .await
        .unwrap()
        .unwrap();

    let escrow_data = Escrow::try_from_slice(&escrow_after_deposit.data).unwrap();
    assert_eq!(escrow_data.token_a_deposited, true);
    println!("✅ User A has deposited the tokens");

    //vault balance
    let vault_account = banks_client
        .get_account(vault_token_a_account)
        .await
        .unwrap()
        .unwrap();

    let vault_balance = TokenAccount::unpack(&vault_account.data).unwrap();
    assert_eq!(vault_balance.amount, amount_a);
    println!("✅ Vault now holds {} Token A", amount_a);

    println!("Creating vault B token account...");

    let vault_token_b_account = spl_associated_token_account::get_associated_token_address(
        &vault_pda,             // Owner = vault PDA
        &token_b_mint.pubkey(), // Mint = Token A
    );

    // Create the vault's ATA
    let create_vault_ata_ix = spl_associated_token_account::create_associated_token_account(
        &payer.pubkey(),        // Payer
        &vault_pda,             // Owner (the vault PDA)
        &token_b_mint.pubkey(), // Mint
    );

    // Execute vault ATA creation
    let create_vault_tx = Transaction::new_signed_with_payer(
        &[create_vault_ata_ix],
        Some(&payer.pubkey()),
        &[&payer],
        recent_blockhash,
    );

    banks_client
        .process_transaction(create_vault_tx)
        .await
        .unwrap();

    // Verify vault ATA
    let vault_ata_account = banks_client
        .get_account(vault_token_b_account)
        .await
        .unwrap()
        .expect("Vault ATA should exist");

    assert_eq!(vault_ata_account.owner, spl_token::id());
    println!("✅ Vault token B account created");

    let deposit_b_ix = EscrowInstruction::Deposit { amount: (2000) };

    //deposit instruction
    let deposit_b_instruction = Instruction::new_with_borsh(
        program_id,
        &deposit_b_ix,
        vec![
            AccountMeta::new(user_b.pubkey(), true),          // depositor
            AccountMeta::new(escrow_account.pubkey(), false), // escrow account
            AccountMeta::new(user_b_token_account, false),    // depositor's token account
            AccountMeta::new(vault_token_b_account, false),   // vault's token account ← FIXED!
            AccountMeta::new_readonly(spl_token::id(), false), // token program
        ],
    );

    //executing deposit
    let deposit_b_tx = Transaction::new_signed_with_payer(
        &[deposit_b_instruction],
        Some(&payer.pubkey()),
        &[&payer, &user_b],
        recent_blockhash,
    );

    banks_client
        .process_transaction(deposit_b_tx)
        .await
        .unwrap();

    //verification
    let escrow_after_deposit = banks_client
        .get_account(escrow_account.pubkey())
        .await
        .unwrap()
        .unwrap();

    let escrow_data = Escrow::try_from_slice(&escrow_after_deposit.data).unwrap();
    assert_eq!(escrow_data.token_b_deposited, true);
    println!("✅ User B has deposited the tokens");

    //vault balance
    let vault_account = banks_client
        .get_account(vault_token_b_account)
        .await
        .unwrap()
        .unwrap();

    let vault_balance = TokenAccount::unpack(&vault_account.data).unwrap();
    assert_eq!(vault_balance.amount, amount_b);
    println!("✅ Vault now holds {} Token B", amount_b);

    //completing the swap btw the 2 accounts
    let user_a_token_b_account = spl_associated_token_account::get_associated_token_address(
        &user_a.pubkey(),
        &token_b_mint.pubkey(),
    );

    let create_user_a_token_b_ata_ix =
        spl_associated_token_account::create_associated_token_account(
            &payer.pubkey(),
            &user_a.pubkey(),
            &token_b_mint.pubkey(),
        );

    let create_user_a_token_b_tx = Transaction::new_signed_with_payer(
        &[create_user_a_token_b_ata_ix],
        Some(&payer.pubkey()),
        &[&payer],
        recent_blockhash,
    );

    banks_client
        .process_transaction(create_user_a_token_b_tx)
        .await
        .unwrap();

    let user_b_token_a_account = spl_associated_token_account::get_associated_token_address(
        &user_b.pubkey(),
        &token_a_mint.pubkey(),
    );

    let create_user_b_token_a_ata_ix =
        spl_associated_token_account::create_associated_token_account(
            &payer.pubkey(),
            &user_b.pubkey(),
            &token_a_mint.pubkey(),
        );

    let create_user_b_token_a_tx = Transaction::new_signed_with_payer(
        &[create_user_b_token_a_ata_ix],
        Some(&payer.pubkey()),
        &[&payer],
        recent_blockhash,
    );

    banks_client
        .process_transaction(create_user_b_token_a_tx)
        .await
        .unwrap();

    println!("Testing Complete Swap...");

    let complete_swap_ix = EscrowInstruction::CompleteSwap;

    //solana instruction for completion
    let complete_swap_instruction = Instruction::new_with_borsh(
        program_id,
        &complete_swap_ix,
        vec![
            AccountMeta::new(user_a.pubkey(), true),
            AccountMeta::new(escrow_account.pubkey(), false),
            AccountMeta::new(vault_pda, false),
            AccountMeta::new(vault_token_a_account, false),
            AccountMeta::new(vault_token_b_account, false),
            AccountMeta::new(user_a_token_b_account, false),
            AccountMeta::new(user_b_token_a_account, false),
            AccountMeta::new_readonly(spl_token::id(), false),
        ],
    );

    //execution
    let complete_swap_tx = Transaction::new_signed_with_payer(
        &[complete_swap_instruction],
        Some(&payer.pubkey()),
        &[&payer, &user_a],
        recent_blockhash,
    );

    banks_client
        .process_transaction(complete_swap_tx)
        .await
        .unwrap();

    //user_a token_a_account should be 0
    let user_a_token_a_data = banks_client
        .get_account(user_a_token_account)
        .await
        .unwrap()
        .unwrap();

    let user_a_token_a_balance = TokenAccount::unpack(&user_a_token_a_data.data).unwrap();

    assert_eq!(user_a_token_a_balance.amount, 0);

    //user_a token_b_account = amount_b
    let user_a_token_b_data = banks_client
        .get_account(user_a_token_b_account)
        .await
        .unwrap()
        .unwrap();

    let user_a_token_b_balance = TokenAccount::unpack(&user_a_token_b_data.data).unwrap();

    assert_eq!(user_a_token_b_balance.amount, amount_b);

    // User B Token B should be 0
    let user_b_token_b_data = banks_client
        .get_account(user_b_token_account)
        .await
        .unwrap()
        .unwrap();

    let user_b_token_b_balance = TokenAccount::unpack(&user_b_token_b_data.data).unwrap();

    assert_eq!(user_b_token_b_balance.amount, 0);

    // User B Token A should be amount_a
    let user_b_token_a_data = banks_client
        .get_account(user_b_token_a_account)
        .await
        .unwrap()
        .unwrap();

    let user_b_token_a_balance = TokenAccount::unpack(&user_b_token_a_data.data).unwrap();

    assert_eq!(user_b_token_a_balance.amount, amount_a);

    //vaults should be empty
    let vault_a_data = banks_client
        .get_account(vault_token_a_account)
        .await
        .unwrap()
        .unwrap();
    let vault_a_balance = TokenAccount::unpack(&vault_a_data.data).unwrap();
    assert_eq!(vault_a_balance.amount, 0);

    let vault_b_data = banks_client
        .get_account(vault_token_b_account)
        .await
        .unwrap()
        .unwrap();
    let vault_b_balance = TokenAccount::unpack(&vault_b_data.data).unwrap();
    assert_eq!(vault_b_balance.amount, 0);

    //escrow final status after swap
    let final_escrow_status = banks_client
        .get_account(escrow_account.pubkey())
        .await
        .unwrap()
        .unwrap();

    let final_escrow = Escrow::try_from_slice(&final_escrow_status.data).unwrap();

    matches!(final_escrow.status, EscrowStatus::Completed);

    println!("✅ CompleteSwap verified");

    //cancel instruction test
    println!("Testing cancel Escrow instruction...");

    let cancel_escrow_account = Keypair::new();
    let cancel_vault_pda = Pubkey::find_program_address(
        &[b"vault", cancel_escrow_account.pubkey().as_ref()],
        &program_id,
    );

    //init escrow
    let cancel_init_ix = EscrowInstruction::InitEscrow {
        token_a_mint: token_a_mint.pubkey(),
        token_b_mint: token_b_mint.pubkey(),
        amount_a: 500,
        amount_b: 1000,
    };

    let cancel_dummy_escrow = Escrow {
        user_a: user_a.pubkey(),
        user_b: Pubkey::default(),
        token_a_mint: token_a_mint.pubkey(),
        token_b_mint: token_b_mint.pubkey(),
        amount_a: 500,
        amount_b: 1000,
        token_a_deposited: false,
        token_b_deposited: false,
        vault_pda: cancel_vault_pda.0, // Use the new vault PDA
        status: solana_escrow::EscrowStatus::Active,
    };

    //on chain escrow
    let cancel_escrow_size = borsh::to_vec(&cancel_dummy_escrow).unwrap().len() as u64;
    let cancel_escrow_rent = rent.minimum_balance(cancel_escrow_size as usize);

    let create_cancel_escrow_ix = system_instruction::create_account(
        &payer.pubkey(),
        &cancel_escrow_account.pubkey(),
        cancel_escrow_rent,
        cancel_escrow_size,
        &program_id,
    );

    //initializing escrow instruction
    let cancel_init_instruction = Instruction::new_with_borsh(
        program_id,
        &cancel_init_ix,
        vec![
            AccountMeta::new(user_a.pubkey(), true),
            AccountMeta::new(cancel_escrow_account.pubkey(), false),
            AccountMeta::new_readonly(solana_program::sysvar::rent::id(), false),
        ],
    );

    //execution
    let cancel_init_tx = Transaction::new_signed_with_payer(
        &[create_cancel_escrow_ix, cancel_init_instruction],
        Some(&payer.pubkey()),
        &[&payer, &user_a, &cancel_escrow_account],
        recent_blockhash,
    );

    banks_client
        .process_transaction(cancel_init_tx)
        .await
        .unwrap();

    //verifying the creation
    let cancel_escrow_data = banks_client
        .get_account(cancel_escrow_account.pubkey())
        .await
        .unwrap()
        .unwrap();

    let cancel_escrow = Escrow::try_from_slice(&cancel_escrow_data.data).unwrap();

    assert_eq!(cancel_escrow.user_a, user_a.pubkey());
    assert_eq!(cancel_escrow.amount_a, 500);
    matches!(cancel_escrow.status, solana_escrow::EscrowStatus::Active);
    println!("✅ New escrow created for cancel testing");

    // --- Deposit one token for cancel test ---
    // Create vault ATA for cancel escrow
    // Vault Token A ATA
    let cancel_vault_token_a_account = spl_associated_token_account::get_associated_token_address(
        &cancel_vault_pda.0,
        &token_a_mint.pubkey(),
    );

    let create_cancel_vault_a_ata_ix =
        spl_associated_token_account::create_associated_token_account(
            &payer.pubkey(),
            &cancel_vault_pda.0,
            &token_a_mint.pubkey(),
        );

    // Vault Token B ATA
    let cancel_vault_token_b_account = spl_associated_token_account::get_associated_token_address(
        &cancel_vault_pda.0,
        &token_b_mint.pubkey(),
    );

    let create_cancel_vault_b_ata_ix =
        spl_associated_token_account::create_associated_token_account(
            &payer.pubkey(),
            &cancel_vault_pda.0,
            &token_b_mint.pubkey(),
        );

    // Create both vault ATAs
    let create_cancel_vault_tx = Transaction::new_signed_with_payer(
        &[create_cancel_vault_a_ata_ix, create_cancel_vault_b_ata_ix],
        Some(&payer.pubkey()),
        &[&payer],
        recent_blockhash,
    );

    banks_client
        .process_transaction(create_cancel_vault_tx)
        .await
        .unwrap();

    // --- Mint more tokens to User A for cancel test ---
    println!("Minting additional tokens to User A for cancel test...");

    let mint_more_to_user_a = spl_token::instruction::mint_to(
        &spl_token::id(),
        &token_a_mint.pubkey(),
        &user_a_token_account,
        &payer.pubkey(),
        &[],
        500, // Mint 500 more Token A
    )
    .unwrap();

    let mint_more_tx = Transaction::new_signed_with_payer(
        &[mint_more_to_user_a],
        Some(&payer.pubkey()),
        &[&payer],
        recent_blockhash,
    );

    banks_client
        .process_transaction(mint_more_tx)
        .await
        .unwrap();

    // Verify User A now has 500 Token A
    let user_a_before_cancel = banks_client
        .get_account(user_a_token_account)
        .await
        .unwrap()
        .unwrap();

    let user_a_balance_before = TokenAccount::unpack(&user_a_before_cancel.data).unwrap();
    assert_eq!(user_a_balance_before.amount, 500);
    println!(
        "✅ User A now has {} Token A for cancel test",
        user_a_balance_before.amount
    );

    // Deposit Token A from User A
    let cancel_deposit_ix = EscrowInstruction::Deposit { amount: 500 };
    let cancel_deposit_instruction = Instruction::new_with_borsh(
        program_id,
        &cancel_deposit_ix,
        vec![
            AccountMeta::new(user_a.pubkey(), true),
            AccountMeta::new(cancel_escrow_account.pubkey(), false),
            AccountMeta::new(user_a_token_account, false), // User's Token A ATA
            AccountMeta::new(cancel_vault_token_a_account, false), // Vault's Token A ATA
            AccountMeta::new_readonly(spl_token::id(), false),
        ],
    );

    let cancel_deposit_tx = Transaction::new_signed_with_payer(
        &[cancel_deposit_instruction],
        Some(&payer.pubkey()),
        &[&payer, &user_a],
        recent_blockhash,
    );

    banks_client
        .process_transaction(cancel_deposit_tx)
        .await
        .unwrap();

    // Verify deposit
    let cancel_escrow_after_deposit = banks_client
        .get_account(cancel_escrow_account.pubkey())
        .await
        .unwrap()
        .unwrap();

    let cancel_escrow_data = Escrow::try_from_slice(&cancel_escrow_after_deposit.data).unwrap();
    assert_eq!(cancel_escrow_data.token_a_deposited, true);
    assert_eq!(cancel_escrow_data.token_b_deposited, false); // Only one deposited
    println!("✅ One token deposited for cancel test");

    // --- Call Cancel instruction ---
    // Note: Cancel requires 8 accounts (same as CompleteSwap)
    let cancel_ix = EscrowInstruction::Cancel;
    let cancel_instruction = Instruction::new_with_borsh(
        program_id,
        &cancel_ix,
        vec![
            AccountMeta::new(user_a.pubkey(), true),
            AccountMeta::new(cancel_escrow_account.pubkey(), false),
            AccountMeta::new(cancel_vault_pda.0, false),
            AccountMeta::new(cancel_vault_token_a_account, false), // Vault Token A
            AccountMeta::new(cancel_vault_token_b_account, false), // Vault Token B ✅ Now separate!
            AccountMeta::new(user_a_token_account, false),
            AccountMeta::new(user_b_token_account, false),
            AccountMeta::new_readonly(spl_token::id(), false),
        ],
    );

    let cancel_tx = Transaction::new_signed_with_payer(
        &[cancel_instruction],
        Some(&payer.pubkey()),
        &[&payer, &user_a], // Caller must sign
        recent_blockhash,
    );

    banks_client.process_transaction(cancel_tx).await.unwrap();
    println!("✅ Cancel instruction executed");

    // --- Verify refunds and status ---
    // User A should get their 500 Token A back
    let user_a_after_cancel = banks_client
        .get_account(user_a_token_account)
        .await
        .unwrap()
        .unwrap();

    let user_a_balance = TokenAccount::unpack(&user_a_after_cancel.data).unwrap();
    assert_eq!(user_a_balance.amount, 500); // Refunded

    // Vault should be empty
    let vault_after_cancel = banks_client
        .get_account(cancel_vault_token_a_account)
        .await
        .unwrap()
        .unwrap();

    let vault_balance = TokenAccount::unpack(&vault_after_cancel.data).unwrap();
    assert_eq!(vault_balance.amount, 0);

    // Escrow status should be Cancelled
    let final_cancel_escrow = banks_client
        .get_account(cancel_escrow_account.pubkey())
        .await
        .unwrap()
        .unwrap();

    let final_cancel_data = Escrow::try_from_slice(&final_cancel_escrow.data).unwrap();
    matches!(
        final_cancel_data.status,
        solana_escrow::EscrowStatus::Cancelled
    );
    println!("✅ Cancel verified - refunds processed and status updated");
}
