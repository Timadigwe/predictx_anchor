use anchor_lang::prelude::*;
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
    market.bump = ctx.bumps.market;
    
    let transfer_ctx = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        anchor_lang::system_program::Transfer {
            from: ctx.accounts.authority.to_account_info(),
            to: ctx.accounts.market.to_account_info(),
        },
    );
    anchor_lang::system_program::transfer(transfer_ctx, initial_liquidity)?;
    
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
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
} 