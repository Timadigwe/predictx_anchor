use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::*;

pub fn sell_outcome(
    ctx: Context<SellOutcome>,
    outcome: u8,
    tokens_to_sell: u64,
) -> Result<()> {
    require!(outcome == 1 || outcome == 2, PredictXError::InvalidOutcome);
    require!(tokens_to_sell > 0, PredictXError::InvalidAmount);
    
    let market = &mut ctx.accounts.market;
    require!(!market.resolved, PredictXError::MarketAlreadyResolved);
    
    let user_holdings = &mut ctx.accounts.user_holdings;
    if outcome == 1 {
        require!(user_holdings.outcome1_tokens >= tokens_to_sell, PredictXError::InsufficientTokens);
    } else {
        require!(user_holdings.outcome2_tokens >= tokens_to_sell, PredictXError::InsufficientTokens);
    }
    
    // Fixed price: 1 token = 1 SOL (1_000_000_000 lamports)
    let price_per_token = 1_000_000_000u64;
    let sol_to_receive = tokens_to_sell.checked_mul(price_per_token).ok_or(PredictXError::InvalidAmount)?;
    
    // Update market supply
    if outcome == 1 {
        market.outcome1_supply = market.outcome1_supply.checked_sub(tokens_to_sell).ok_or(PredictXError::InvalidAmount)?;
        user_holdings.outcome1_tokens = user_holdings.outcome1_tokens.checked_sub(tokens_to_sell).ok_or(PredictXError::InvalidAmount)?;
    } else {
        market.outcome2_supply = market.outcome2_supply.checked_sub(tokens_to_sell).ok_or(PredictXError::InvalidAmount)?;
        user_holdings.outcome2_tokens = user_holdings.outcome2_tokens.checked_sub(tokens_to_sell).ok_or(PredictXError::InvalidAmount)?;
    }
    
    // Transfer SOL from market to seller
    let transfer_ctx = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        anchor_lang::system_program::Transfer {
            from: ctx.accounts.market.to_account_info(),
            to: ctx.accounts.seller.to_account_info(),
        },
    );
    anchor_lang::system_program::transfer(transfer_ctx, sol_to_receive)?;
    
    Ok(())
}

#[derive(Accounts)]
pub struct SellOutcome<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    
    #[account(
        mut,
        seeds = [b"user_holdings", seller.key().as_ref(), market.key().as_ref()],
        bump
    )]
    pub user_holdings: Account<'info, UserHoldings>,
    
    #[account(mut)]
    pub seller: Signer<'info>,
    pub system_program: Program<'info, System>,
} 