use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use crate::state::*;
use crate::errors::*;

// Base unit for token scaling (1 billion)
const BASE_UNIT: u64 = 1_000_000_000;

pub fn initialize_market(
    ctx: Context<CreateMarket>,
    outcome1: String,
    outcome2: String,
    description: String,
    initial_liquidity: u64,
    market_name: String,
) -> Result<()> {
    let market = &mut ctx.accounts.market;
    market.authority = ctx.accounts.authority.key();
    market.name = market_name;
    market.outcome1 = outcome1;
    market.outcome2 = outcome2;
    market.description = description;
    market.resolved = false;
    market.asserted_outcome = 0;
    // Scale the initial liquidity by BASE_UNIT
    market.outcome1_supply = initial_liquidity.checked_mul(BASE_UNIT).ok_or(PredictXError::InvalidAmount)?;
    market.outcome2_supply = initial_liquidity.checked_mul(BASE_UNIT).ok_or(PredictXError::InvalidAmount)?;
    market.mint = ctx.accounts.mint.key();
    market.treasury = ctx.accounts.treasury.key();
    market.bump = ctx.bumps.market;
    
    // Transfer initial tokens from authority to treasury
    let initial_tokens = initial_liquidity.checked_mul(2).ok_or(PredictXError::InvalidAmount)?; // 2x for both outcomes
    anchor_spl::token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token::Transfer {
                from: ctx.accounts.authority_token_account.to_account_info(),
                to: ctx.accounts.treasury.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            },
        ),
        initial_tokens,
    )?;
    
    Ok(())
}

#[derive(Accounts)]
#[instruction(outcome1: String, outcome2: String, description: String, initial_liquidity: u64, market_name: String)]
pub struct CreateMarket<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Market::INIT_SPACE,
        seeds = [b"market", authority.key().as_ref(), market_name.as_bytes()],
        bump
    )]
    pub market: Account<'info, Market>,
    
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    
    #[account(
        init,
        payer = authority,
        token::mint = mint,
        token::authority = market,
        seeds = [b"treasury", market.key().as_ref()],
        bump
    )]
    pub treasury: Account<'info, TokenAccount>,

    
    #[account(
        mut
    )]
    pub authority_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
} 