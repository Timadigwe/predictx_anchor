import { PublicKey } from '@solana/web3.js';

export interface Market {
  authority: PublicKey;
  name: string;
  outcome1: string;
  outcome2: string;
  description: string;
  resolved: boolean;
  assertedOutcome: number;
  outcome1Supply: number;
  outcome2Supply: number;
  bump: number;
}

export interface UserHoldings {
  user: PublicKey;
  market: PublicKey;
  outcome1Tokens: number;
  outcome2Tokens: number;
  bump: number;
}

export interface MarketInfo {
  publicKey: PublicKey;
  account: Market;
}

export interface UserHoldingsInfo {
  publicKey: PublicKey;
  account: UserHoldings;
}

export interface CreateMarketParams {
  outcome1: string;
  outcome2: string;
  description: string;
  initialLiquidity: number;
  marketName: string;
}

export interface BuyOutcomeParams {
  marketPublicKey: PublicKey;
  outcome: 1 | 2;
  amount: number;
  mint: PublicKey;
  buyerTokenAccount: PublicKey;
}

export interface SellOutcomeParams {
  marketPublicKey: PublicKey;
  outcome: 1 | 2;
  tokensToSell: number;
  mint: PublicKey;
  sellerTokenAccount: PublicKey;
}

export interface ResolveMarketParams {
  marketPublicKey: PublicKey;
  outcome: 1 | 2 | 3; // 1=outcome1, 2=outcome2, 3=unresolvable
}

export interface ClaimWinningsParams {
  marketPublicKey: PublicKey;
  mint: PublicKey;
  userTokenAccount: PublicKey;
}

export interface MarketStats {
  totalOutcome1Supply: number;
  totalOutcome2Supply: number;
  outcome1Price: number;
  outcome2Price: number;
  totalLiquidity: number;
}

export interface UserMarketPosition {
  outcome1Tokens: number;
  outcome2Tokens: number;
  outcome1Value: number;
  outcome2Value: number;
  totalValue: number;
}

export enum Outcome {
  OUTCOME_1 = 1,
  OUTCOME_2 = 2,
  UNRESOLVABLE = 3
}

export interface SDKConfig {
  programId: PublicKey;
  connection: any; // Connection from @solana/web3.js
  wallet?: any; // Wallet adapter or keypair
}

export interface TransactionResult {
  signature: string;
  success: boolean;
  error?: string;
} 