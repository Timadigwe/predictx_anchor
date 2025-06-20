use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::*;

pub fn claim_winnings(
    ctx: Context<ClaimWinnings>,
) -> Result<()> {
    let market = &ctx.accounts.market;
    require!(market.resolved, PredictXError::MarketNotResolved);
    
    let user_holdings = &mut ctx.accounts.user_holdings;
    let total_tokens = user_holdings.outcome1_tokens.checked_add(user_holdings.outcome2_tokens).ok_or(PredictXError::InvalidAmount)?;
    require!(total_tokens > 0, PredictXError::NoTokensToClaim);
    
    let price_per_token = 1_000_000_000u64;
    let total_payout = match market.asserted_outcome {
        1 => {
            let payout = user_holdings.outcome1_tokens.checked_mul(price_per_token).ok_or(PredictXError::InvalidAmount)?;
            user_holdings.outcome1_tokens = 0;
            user_holdings.outcome2_tokens = 0;
            payout
        },
        2 => {
            let payout = user_holdings.outcome2_tokens.checked_mul(price_per_token).ok_or(PredictXError::InvalidAmount)?;
            user_holdings.outcome1_tokens = 0;
            user_holdings.outcome2_tokens = 0;
            payout
        },
        3 => {
            let payout = total_tokens.checked_mul(price_per_token).ok_or(PredictXError::InvalidAmount)?;
            user_holdings.outcome1_tokens = 0;
            user_holdings.outcome2_tokens = 0;
            payout
        },
        _ => return err!(PredictXError::InvalidOutcome),
    };
    
    if total_payout > 0 {
        **ctx.accounts.market.to_account_info().try_borrow_mut_lamports()? -= total_payout;
        **ctx.accounts.user.to_account_info().try_borrow_mut_lamports()? += total_payout;
    }
    
    Ok(())
}

#[derive(Accounts)]
pub struct ClaimWinnings<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    
    #[account(
        mut,
        seeds = [b"user_holdings", user.key().as_ref(), market.key().as_ref()],
        bump
    )]
    pub user_holdings: Account<'info, UserHoldings>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
} 