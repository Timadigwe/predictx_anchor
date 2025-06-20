use anchor_lang::prelude::*;

#[error_code]
pub enum PredictXError {
    #[msg("Invalid outcome specified")]
    InvalidOutcome,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Market is already resolved")]
    MarketAlreadyResolved,
    #[msg("Market is not resolved")]
    MarketNotResolved,
    #[msg("Insufficient liquidity")]
    InsufficientLiquidity,
    #[msg("Insufficient tokens")]
    InsufficientTokens,
    #[msg("No tokens to claim")]
    NoTokensToClaim,
    #[msg("Unauthorized")]
    Unauthorized,
} 