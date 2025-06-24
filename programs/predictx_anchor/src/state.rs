use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Market {
    pub authority: Pubkey,           // Market creator
    #[max_len(50)]
    pub name: String,                // Market name/identifier
    #[max_len(100)]
    pub outcome1: String,            // First outcome name
    #[max_len(100)]
    pub outcome2: String,            // Second outcome name
    #[max_len(500)]
    pub description: String,         // Market description
    pub resolved: bool,              // Resolution status
    pub asserted_outcome: u8,        // 0=unresolved, 1=outcome1, 2=outcome2, 3=unresolvable
    pub outcome1_supply: u64,        // Current supply of outcome1 tokens
    pub outcome2_supply: u64,        // Current supply of outcome2 tokens
    pub mint: Pubkey,                // Mint public key
    pub treasury: Pubkey,            // Treasury public key
    pub bump: u8,                   // PDA bump
}

#[account]
#[derive(InitSpace)]
pub struct Treasury {
    pub market: Pubkey,             // Associated market
    pub bump: u8,                   // PDA bump
}

#[account]
#[derive(InitSpace)]
pub struct UserHoldings {
    pub user: Pubkey,               // User public key
    pub market: Pubkey,             // Market public key
    pub outcome1_tokens: u64,       // User's outcome1 token balance
    pub outcome2_tokens: u64,       // User's outcome2 token balance
    pub bump: u8,                   // PDA bump
} 