use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::*;

pub fn resolve_market(
    ctx: Context<ResolveMarket>,
    outcome: u8,
) -> Result<()> {
    require!(outcome >= 1 && outcome <= 3, PredictXError::InvalidOutcome);
    
    let market = &mut ctx.accounts.market;
    require!(!market.resolved, PredictXError::MarketAlreadyResolved);
    require!(market.authority == ctx.accounts.authority.key(), PredictXError::Unauthorized);
    
    market.resolved = true;
    market.asserted_outcome = outcome;
    
    Ok(())
}

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    pub authority: Signer<'info>,
} 