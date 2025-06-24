import { Program, AnchorProvider, web3, BN, Wallet } from '@coral-xyz/anchor';
import { PublicKey, Transaction, Keypair, SystemProgram, Connection } from '@solana/web3.js';
import { IDL, PredictxAnchor } from './idl/predictx_anchor';
import {
  Market,
  UserHoldings,
  MarketInfo,
  UserHoldingsInfo,
  CreateMarketParams,
  BuyOutcomeParams,
  SellOutcomeParams,
  ResolveMarketParams,
  ClaimWinningsParams,
  MarketStats,
  UserMarketPosition,
  Outcome,
  SDKConfig,
  TransactionResult
} from './types';
import {
  deriveMarketPDA,
  deriveUserHoldingsPDA,
  deriveTreasuryPDA,
  lamportsToSol,
  solToLamports,
  tokensToSol,
  calculateMarketStats,
  calculateUserPosition,
  validateMarketName,
  validateOutcome,
  validateDescription,
  validateAmount,
  validateOutcomeNumber,
  formatError
} from './utils';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

export class PredictXSDK {
  private program: Program<PredictxAnchor>;
  private provider: AnchorProvider;
  private connection: Connection;
  private wallet?: Wallet;

  constructor(connection: Connection, wallet?: Wallet) {
    this.connection = connection;
    this.wallet = wallet;
    
    // Use the provided wallet or create a default one
    const signer = wallet || new Wallet(Keypair.generate());
    
    this.provider = new AnchorProvider(connection, signer, {
        commitment: 'confirmed',
      });
    this.program = new Program(IDL, new PublicKey('2X5Y9i9Y4b8qbUiZiNaMc1Eh2qsarETH7bjDkhFrPuza'), this.provider);
  }

  getProgram(): Program<PredictxAnchor> {
    return this.program;
  }

  getProvider(): AnchorProvider {
    return this.provider;
  }

  getConnection(): Connection {
    return this.connection;
  }

  /**
   * Create a new prediction market transaction
   */
  async createMarketTx(params: CreateMarketParams & { mint: PublicKey; authorityTokenAccount: PublicKey }): Promise<string> {
    // Validate inputs
    if (!validateMarketName(params.marketName)) {
      throw new Error('Invalid market name');
    }
    if (!validateOutcome(params.outcome1) || !validateOutcome(params.outcome2)) {
      throw new Error('Invalid outcome strings');
    }
    if (!validateDescription(params.description)) {
      throw new Error('Invalid description');
    }
    if (!validateAmount(params.initialLiquidity)) {
      throw new Error('Invalid initial liquidity amount');
    }

    if (!this.wallet) {
      throw new Error('Wallet is required for creating markets');
    }

    // Derive PDAs
    const [marketPDA, marketBump] = deriveMarketPDA(this.wallet.publicKey, params.marketName);
    // Derive treasury PDA
    const [treasuryPDA, treasuryBump] = deriveTreasuryPDA(marketPDA);

    // Convert initial liquidity to lamports
    const initialLiquidityLamports = solToLamports(params.initialLiquidity);

    // Create and send transaction directly
    const signature = await this.program.methods
      .initializeMarket(
        params.outcome1,
        params.outcome2,
        params.description,
        new BN(initialLiquidityLamports),
        params.marketName
      )
      .accounts({
        market: marketPDA,
        mint: params.mint,
        treasury: treasuryPDA,
        authorityTokenAccount: params.authorityTokenAccount,
        authority: this.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    return signature;
  }

  /**
   * Buy outcome tokens transaction
   */
  async buyOutcomeTx(params: BuyOutcomeParams): Promise<Transaction> {
    // Validate inputs
    if (!validateOutcomeNumber(params.outcome)) {
      throw new Error('Invalid outcome number');
    }
    if (!validateAmount(params.amount)) {
      throw new Error('Invalid amount');
    }

    if (!this.wallet) {
      throw new Error('Wallet is required for buying outcomes');
    }

    // Derive PDAs
    const [userHoldingsPDA] = deriveUserHoldingsPDA(this.wallet.publicKey, params.marketPublicKey);
    const [treasuryPDA, treasuryBump] = deriveTreasuryPDA(params.marketPublicKey);

    // Convert amount to lamports
    const amountLamports = solToLamports(params.amount);

    // Create transaction
    const tx = await this.program.methods
      .buyOutcome(params.outcome, new BN(amountLamports))
      .accounts({
        market: params.marketPublicKey,
        mint: params.mint,
        treasury: treasuryPDA,
        buyerTokenAccount: params.buyerTokenAccount,
        userHoldings: userHoldingsPDA,
        buyer: this.wallet.publicKey,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .transaction();

    return tx;
  }

  /**
   * Sell outcome tokens transaction
   */
  async sellOutcomeTx(params: SellOutcomeParams): Promise<Transaction> {
    // Validate inputs
    if (!validateOutcomeNumber(params.outcome)) {
      throw new Error('Invalid outcome number');
    }
    if (!validateAmount(params.tokensToSell)) {
      throw new Error('Invalid tokens to sell amount');
    }

    if (!this.wallet) {
      throw new Error('Wallet is required for selling outcomes');
    }

    // Derive PDAs
    const [userHoldingsPDA] = deriveUserHoldingsPDA(this.wallet.publicKey, params.marketPublicKey);
    const [treasuryPDA, treasuryBump] = deriveTreasuryPDA(params.marketPublicKey);

    // Create transaction
    const tx = await this.program.methods
      .sellOutcome(params.outcome, new BN(params.tokensToSell))
      .accounts({
        market: params.marketPublicKey,
        mint: params.mint,
        treasury: treasuryPDA,
        sellerTokenAccount: params.sellerTokenAccount,
        userHoldings: userHoldingsPDA,
        seller: this.wallet.publicKey,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
        associatedTokenProgram: new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),
        rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .transaction();

    return tx;
  }

  /**
   * Resolve a market transaction (only market authority can do this)
   */
  async resolveMarketTx(params: ResolveMarketParams): Promise<Transaction> {
    // Validate inputs
    if (!validateOutcomeNumber(params.outcome)) {
      throw new Error('Invalid outcome number');
    }

    if (!this.wallet) {
      throw new Error('Wallet is required for resolving markets');
    }

    // Create transaction
    const tx = await this.program.methods
      .resolveMarket(params.outcome)
      .accounts({
        market: params.marketPublicKey,
        authority: this.wallet.publicKey,
      })
      .transaction();

    return tx;
  }

  /**
   * Claim winnings transaction from a resolved market
   */
  async claimWinningsTx(params: ClaimWinningsParams): Promise<Transaction> {
    if (!this.wallet) {
      throw new Error('Wallet is required for claiming winnings');
    }

    // Derive PDAs
    const [userHoldingsPDA] = deriveUserHoldingsPDA(this.wallet.publicKey, params.marketPublicKey);
    const [treasuryPDA, treasuryBump] = deriveTreasuryPDA(params.marketPublicKey);
    // Create transaction
    const tx = await this.program.methods
      .claimWinnings()
      .accounts({ 
        market: params.marketPublicKey,
        mint: params.mint,
        treasury: treasuryPDA,
        userTokenAccount: params.userTokenAccount,
        userHoldings: userHoldingsPDA,
        user: this.wallet.publicKey,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
        associatedTokenProgram: new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),
        rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .transaction();

    return tx;
  }

  /**
   * Send a signed transaction
   */
  async sendTransaction(transaction: Transaction): Promise<TransactionResult> {
    try {
      if (!this.wallet) {
        throw new Error('Wallet is required for sending transactions');
      }

      // Use the provider's sendAndConfirm method which handles PDA signing
      const signature = await this.provider.sendAndConfirm(transaction);
      
      return {
        signature,
        success: true
      };
    } catch (error) {
      return {
        signature: '',
        success: false,
        error: formatError(error)
      };
    }
  }

  /**
   * Get market information
   */
  async getMarket(marketPublicKey: PublicKey): Promise<MarketInfo | null> {
    try {
      const marketAccount = await this.program.account.market.fetch(marketPublicKey);
      
      return {
        publicKey: marketPublicKey,
        account: {
          authority: marketAccount.authority,
          name: marketAccount.name,
          outcome1: marketAccount.outcome1,
          outcome2: marketAccount.outcome2,
          description: marketAccount.description,
          resolved: marketAccount.resolved,
          assertedOutcome: marketAccount.assertedOutcome,
          outcome1Supply: Number(marketAccount.outcome1Supply.toString()),
          outcome2Supply: Number(marketAccount.outcome2Supply.toString()),
          bump: marketAccount.bump
        }
      };
    } catch (error) {
      console.error('Error fetching market:', error);
      return null;
    }
  }

  /**
   * Get user holdings for a specific market
   */
  async getUserHoldings(userPublicKey: PublicKey, marketPublicKey: PublicKey): Promise<UserHoldingsInfo | null> {
    try {
      const [userHoldingsPDA] = deriveUserHoldingsPDA(userPublicKey, marketPublicKey);
      const holdingsAccount = await this.program.account.userHoldings.fetch(userHoldingsPDA);
      
      return {
        publicKey: userHoldingsPDA,
        account: {
          user: holdingsAccount.user,
          market: holdingsAccount.market,
          outcome1Tokens: Number(holdingsAccount.outcome1Tokens.toString()),
          outcome2Tokens: Number(holdingsAccount.outcome2Tokens.toString()),
          bump: holdingsAccount.bump
        }
      };
    } catch (error) {
      // If account doesn't exist, return null
      return null;
    }
  }

  /**
   * Get market statistics
   */
  async getMarketStats(marketPublicKey: PublicKey): Promise<MarketStats | null> {
    const market = await this.getMarket(marketPublicKey);
    if (!market) {
      return null;
    }

    return calculateMarketStats(market.account.outcome1Supply, market.account.outcome2Supply);
  }

  /**
   * Get user position in a market
   */
  async getUserPosition(userPublicKey: PublicKey, marketPublicKey: PublicKey): Promise<UserMarketPosition | null> {
    const holdings = await this.getUserHoldings(userPublicKey, marketPublicKey);
    if (!holdings) {
      return calculateUserPosition(0, 0);
    }

    return calculateUserPosition(holdings.account.outcome1Tokens, holdings.account.outcome2Tokens);
  }

  /**
   * Get all markets created by a specific authority
   */
  async getMarketsByAuthority(authorityPublicKey: PublicKey): Promise<MarketInfo[]> {
    try {
      const markets = await this.program.account.market.all([
        {
          memcmp: {
            offset: 8, // Skip discriminator
            bytes: authorityPublicKey.toBase58()
          }
        }
      ]);

      return markets.map(market => ({
        publicKey: market.publicKey,
        account: {
          authority: market.account.authority,
          name: market.account.name,
          outcome1: market.account.outcome1,
          outcome2: market.account.outcome2,
          description: market.account.description,
          resolved: market.account.resolved,
          assertedOutcome: market.account.assertedOutcome,
          outcome1Supply: Number(market.account.outcome1Supply.toString()),
          outcome2Supply: Number(market.account.outcome2Supply.toString()),
          bump: market.account.bump
        }
      }));
    } catch (error) {
      console.error('Error fetching markets by authority:', error);
      return [];
    }
  }

  /**
   * Get all user holdings for a specific user
   */
  async getUserHoldingsAll(userPublicKey: PublicKey): Promise<UserHoldingsInfo[]> {
    try {
      const holdings = await this.program.account.userHoldings.all([
        {
          memcmp: {
            offset: 8, // Skip discriminator
            bytes: userPublicKey.toBase58()
          }
        }
      ]);

      return holdings.map(holding => ({
        publicKey: holding.publicKey,
        account: {
          user: holding.account.user,
          market: holding.account.market,
          outcome1Tokens: Number(holding.account.outcome1Tokens.toString()),
          outcome2Tokens: Number(holding.account.outcome2Tokens.toString()),
          bump: holding.account.bump
        }
      }));
    } catch (error) {
      console.error('Error fetching user holdings:', error);
      return [];
    }
  }

  /**
   * Calculate potential winnings for a user in a resolved market
   */
  async calculatePotentialWinnings(userPublicKey: PublicKey, marketPublicKey: PublicKey): Promise<number> {
    const market = await this.getMarket(marketPublicKey);
    const holdings = await this.getUserHoldings(userPublicKey, marketPublicKey);

    if (!market || !market.account.resolved || !holdings) {
      return 0;
    }

    const totalTokens = holdings.account.outcome1Tokens + holdings.account.outcome2Tokens;
    if (totalTokens === 0) {
      return 0;
    }

    switch (market.account.assertedOutcome) {
      case Outcome.OUTCOME_1:
        return tokensToSol(holdings.account.outcome1Tokens);
      case Outcome.OUTCOME_2:
        return tokensToSol(holdings.account.outcome2Tokens);
      case Outcome.UNRESOLVABLE:
        return tokensToSol(totalTokens);
      default:
        return 0;
    }
  }
} 