use anchor_lang::prelude::*;

declare_id!("2X5Y9i9Y4b8qbUiZiNaMc1Eh2qsarETH7bjDkhFrPuza");

pub mod state;
pub mod errors;
pub mod instructions;

use instructions::*;

#[program]
pub mod predictx_anchor {
    use super::*;

    pub fn initialize_market(
        ctx: Context<CreateMarket>,
        outcome1: String,
        outcome2: String,
        description: String,
        initial_liquidity: u64,
        market_name: String,
    ) -> Result<()> {
        instructions::initialize_market(ctx, outcome1, outcome2, description, initial_liquidity, market_name)
    }

    pub fn buy_outcome(
        ctx: Context<BuyOutcome>,
        outcome: u8,
        amount: u64,
    ) -> Result<()> {
        instructions::buy_outcome(ctx, outcome, amount)
    }

    pub fn sell_outcome(
        ctx: Context<SellOutcome>,
        outcome: u8,
        tokens_to_sell: u64,
    ) -> Result<()> {
        instructions::sell_outcome(ctx, outcome, tokens_to_sell)
    }

    pub fn resolve_market(
        ctx: Context<ResolveMarket>,
        outcome: u8,
    ) -> Result<()> {
        instructions::resolve_market(ctx, outcome)
    }

    pub fn claim_winnings(
        ctx: Context<ClaimWinnings>,
    ) -> Result<()> {
        instructions::claim_winnings(ctx)
    }
}

