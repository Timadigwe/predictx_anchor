use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::*;

pub fn buy_outcome(
    ctx: Context<BuyOutcome>,
    outcome: u8,
    amount: u64,
) -> Result<()> {
    require!(outcome == 1 || outcome == 2, PredictXError::InvalidOutcome);
    require!(amount > 0, PredictXError::InvalidAmount);
    
    let market = &mut ctx.accounts.market;
    require!(!market.resolved, PredictXError::MarketAlreadyResolved);
    
    // Fixed price: 1 token = 1 SOL (1_000_000_000 lamports)
    let price_per_token = 1_000_000_000u64;
    let tokens_to_receive = amount.checked_div(price_per_token).ok_or(PredictXError::InvalidAmount)?;
    require!(tokens_to_receive > 0, PredictXError::InvalidAmount);
    
    // Update market supply
    if outcome == 1 {
        market.outcome1_supply = market.outcome1_supply.checked_add(tokens_to_receive).ok_or(PredictXError::InvalidAmount)?;
    } else {
        market.outcome2_supply = market.outcome2_supply.checked_add(tokens_to_receive).ok_or(PredictXError::InvalidAmount)?;
    }
    
    // Transfer SOL from buyer to market
    let transfer_ctx = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        anchor_lang::system_program::Transfer {
            from: ctx.accounts.buyer.to_account_info(),
            to: ctx.accounts.market.to_account_info(),
        },
    );
    anchor_lang::system_program::transfer(transfer_ctx, amount)?;
    
    // Update user holdings
    let user_holdings = &mut ctx.accounts.user_holdings;
    if outcome == 1 {
        user_holdings.outcome1_tokens = user_holdings.outcome1_tokens.checked_add(tokens_to_receive).ok_or(PredictXError::InvalidAmount)?;
    } else {
        user_holdings.outcome2_tokens = user_holdings.outcome2_tokens.checked_add(tokens_to_receive).ok_or(PredictXError::InvalidAmount)?;
    }
    
    Ok(())
}

#[derive(Accounts)]
pub struct BuyOutcome<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    
    #[account(
        init_if_needed,
        payer = buyer,
        space = 8 + UserHoldings::INIT_SPACE,
        seeds = [b"user_holdings", buyer.key().as_ref(), market.key().as_ref()],
        bump
    )]
    pub user_holdings: Account<'info, UserHoldings>,
    
    #[account(mut)]
    pub buyer: Signer<'info>,
    pub system_program: Program<'info, System>,
} 