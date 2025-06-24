import { PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';

// Base unit for token scaling (1 billion)
export const BASE_UNIT = 1_000_000_000;

// Price per token in lamports (1 SOL = 1_000_000_000 lamports)
export const PRICE_PER_TOKEN = 1_000_000_000;

/**
 * Derive the market PDA from authority and market name
 */
export function deriveMarketPDA(authority: PublicKey, marketName: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('market'),
      authority.toBuffer(),
      Buffer.from(marketName)
    ],
    new PublicKey('2X5Y9i9Y4b8qbUiZiNaMc1Eh2qsarETH7bjDkhFrPuza') // Program ID
  );
}

/**
 * Derive the treasury associated token account
 */
export function deriveTreasuryPDA(market: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('treasury'),
      market.toBuffer(),
    ],
    new PublicKey('2X5Y9i9Y4b8qbUiZiNaMc1Eh2qsarETH7bjDkhFrPuza') // Program ID
  );
}

/**
 * Derive the user holdings PDA from user and market
 */
export function deriveUserHoldingsPDA(user: PublicKey, market: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('user_holdings'),
      user.toBuffer(),
      market.toBuffer()
    ],
    new PublicKey('2X5Y9i9Y4b8qbUiZiNaMc1Eh2qsarETH7bjDkhFrPuza') // Program ID
  );
}

/**
 * Convert lamports to SOL
 */
export function lamportsToSol(lamports: number): number {
  return lamports / 1_000_000_000;
}

/**
 * Convert SOL to lamports
 */
export function solToLamports(sol: number): number {
  return Math.floor(sol * 1_000_000_000);
}

/**
 * Convert tokens to SOL value
 */
export function tokensToSol(tokens: number): number {
  return (tokens * PRICE_PER_TOKEN) / 1_000_000_000;
}

/**
 * Convert SOL value to tokens
 */
export function solToTokens(sol: number): number {
  return Math.floor((sol * 1_000_000_000) / PRICE_PER_TOKEN);
}

/**
 * Calculate market statistics
 */
export function calculateMarketStats(outcome1Supply: number, outcome2Supply: number) {
  const totalLiquidity = tokensToSol(outcome1Supply + outcome2Supply);
  const outcome1Price = 1; // Fixed price of 1 SOL per token
  const outcome2Price = 1; // Fixed price of 1 SOL per token

  return {
    totalOutcome1Supply: outcome1Supply,
    totalOutcome2Supply: outcome2Supply,
    outcome1Price,
    outcome2Price,
    totalLiquidity
  };
}

/**
 * Calculate user position in a market
 */
export function calculateUserPosition(outcome1Tokens: number, outcome2Tokens: number) {
  const outcome1Value = tokensToSol(outcome1Tokens);
  const outcome2Value = tokensToSol(outcome2Tokens);
  const totalValue = outcome1Value + outcome2Value;

  return {
    outcome1Tokens,
    outcome2Tokens,
    outcome1Value,
    outcome2Value,
    totalValue
  };
}

/**
 * Validate market name
 */
export function validateMarketName(name: string): boolean {
  return name.length > 0 && name.length <= 50;
}

/**
 * Validate outcome strings
 */
export function validateOutcome(outcome: string): boolean {
  return outcome.length > 0 && outcome.length <= 100;
}

/**
 * Validate description
 */
export function validateDescription(description: string): boolean {
  return description.length > 0 && description.length <= 500;
}

/**
 * Validate amount
 */
export function validateAmount(amount: number): boolean {
  return amount > 0 && !isNaN(amount) && isFinite(amount);
}

/**
 * Validate outcome number
 */
export function validateOutcomeNumber(outcome: number): boolean {
  return outcome === 1 || outcome === 2 || outcome === 3;
}

/**
 * Format error message
 */
export function formatError(error: any): string {
  if (typeof error === 'string') {
    return error;
  }
  if (error?.message) {
    return error.message;
  }
  if (error?.toString) {
    return error.toString();
  }
  return 'Unknown error occurred';
}

/**
 * Wait for transaction confirmation
 */
export async function waitForConfirmation(
  connection: any,
  signature: string,
  commitment: any = 'confirmed'
): Promise<void> {
  const latestBlockhash = await connection.getLatestBlockhash();
  await connection.confirmTransaction({
    signature,
    blockhash: latestBlockhash.blockhash,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
  }, commitment);
} 