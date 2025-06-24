use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
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
    
    let tokens_to_transfer = match market.asserted_outcome {
        1 => {
            let tokens = user_holdings.outcome1_tokens;
            user_holdings.outcome1_tokens = 0;
            user_holdings.outcome2_tokens = 0;
            tokens
        },
        2 => {
            let tokens = user_holdings.outcome2_tokens;
            user_holdings.outcome1_tokens = 0;
            user_holdings.outcome2_tokens = 0;
            tokens
        },
        3 => {
            let tokens = total_tokens;
            user_holdings.outcome1_tokens = 0;
            user_holdings.outcome2_tokens = 0;
            tokens
        },
        _ => return err!(PredictXError::InvalidOutcome),
    };
    
    if tokens_to_transfer > 0 {
        // Transfer tokens from treasury to user
        let seeds = &[
            b"market",
            market.authority.as_ref(),
            market.name.as_bytes(),
            &[market.bump],
        ];
        let signer_seeds = &[&seeds[..]];
        
        anchor_spl::token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.treasury.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.market.to_account_info(),
                },
                signer_seeds,
            ),
            tokens_to_transfer,
        )?;
    }
    
    Ok(())
}

#[derive(Accounts)]
pub struct ClaimWinnings<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    
    #[account(
        mut,
        seeds = [b"treasury", market.key().as_ref()],
        bump
    )]
    pub treasury: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = user,
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        seeds = [b"user_holdings", user.key().as_ref(), market.key().as_ref()],
        bump
    )]
    pub user_holdings: Account<'info, UserHoldings>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
} 