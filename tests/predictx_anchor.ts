import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair, LAMPORTS_PER_SOL, Connection } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, createMint, createAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import * as fs from 'fs';
import { PredictXSDK } from "../sdk/src/predictx-sdk";

// Helper function to load keypair from file
function loadKeypairFromFile(filePath: string): Keypair {
  const keypairData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const secretKey = new Uint8Array(keypairData.secretKey);
  return Keypair.fromSecretKey(secretKey);
}

describe("predictx_anchor", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  let authority: Keypair;
  let user1: Keypair;
  let authorityWallet: anchor.Wallet;
  let user1Wallet: anchor.Wallet;
  let authoritySDK: PredictXSDK;
  let user1SDK: PredictXSDK;
  let market: PublicKey;
  let marketName: string;
  let mint: PublicKey;
  let authorityTokenAccount: PublicKey;
  let user1TokenAccount: PublicKey;

  before(async () => {
    // Load pre-funded keypair from file
    authority = loadKeypairFromFile('./test-keypair.json');
    user1 = Keypair.generate();

    // Create wallets using NodeWallet
    authorityWallet = new anchor.Wallet(authority);
    user1Wallet = new anchor.Wallet(user1);

    // Create SDK instances
    authoritySDK = new PredictXSDK(provider.connection, authorityWallet);
    user1SDK = new PredictXSDK(provider.connection, user1Wallet);

    // Use a market name
    marketName = "championship-game-2024";

    // Airdrop SOL to both accounts (localnet allows airdrops)
    const authorityAirdropSig = await provider.connection.requestAirdrop(authority.publicKey, 1100 * LAMPORTS_PER_SOL); // 1,100 SOL
    const user1AirdropSig = await provider.connection.requestAirdrop(user1.publicKey, 5 * LAMPORTS_PER_SOL);
    
    // Wait for confirmations
    await provider.connection.confirmTransaction(authorityAirdropSig);
    await provider.connection.confirmTransaction(user1AirdropSig);

    // Check authority balance
    const authorityBalance = await provider.connection.getBalance(authority.publicKey);
    console.log(`Authority balance: ${authorityBalance / LAMPORTS_PER_SOL} SOL`);

    // Create SPL token mint for testing
    mint = await createMint(
      provider.connection,
      authority,
      authority.publicKey,
      authority.publicKey,
      0 // 0 decimals for whole tokens
    );

    // Create token accounts
    authorityTokenAccount = await createAssociatedTokenAccount(
      provider.connection,
      authority,
      mint,
      authority.publicKey
    );

    user1TokenAccount = await createAssociatedTokenAccount(
      provider.connection,
      user1,
      mint,
      user1.publicKey
    );

    // Mint initial tokens to authority
    await mintTo(
      provider.connection,
      authority,
      mint,
      authorityTokenAccount,
      authority,
      1000 * LAMPORTS_PER_SOL // 1000 tokens
    );

    // Transfer some tokens to user1
    await mintTo(
      provider.connection,
      user1,
      mint,
      user1TokenAccount,
      authority,
      100 * LAMPORTS_PER_SOL // 100 tokens
    );

    // Find market PDA
    [market] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("market"),
        authority.publicKey.toBuffer(),
        Buffer.from(marketName),
      ],
      authoritySDK.getProgram().programId
    );
  });

  it("Create a prediction market", async () => {
    const outcome1 = "Team A Wins";
    const outcome2 = "Team B Wins";
    const description = "Who will win the championship game?";
    const initialLiquidity = 10; // 10 SOL per side

    // Create market directly
    const signature = await authoritySDK.createMarketTx({
      outcome1,
      outcome2,
      description,
      initialLiquidity,
      marketName,
      mint,
      authorityTokenAccount
    });

    console.log("Market created successfully!");
    console.log(`Transaction signature: ${signature}`);
  });

  it("User buys outcome1 tokens", async () => {
    const buyAmount = 2; // Buy 2 tokens (so we can sell 1 and still have 1 to claim)

    // Generate transaction
    const tx = await user1SDK.buyOutcomeTx({
      marketPublicKey: market,
      outcome: 1,
      amount: buyAmount,
      mint,
      buyerTokenAccount: user1TokenAccount
    });

    // Send transaction
    const result = await user1SDK.sendTransaction(tx);

    if (!result.success) {
      throw new Error(`Failed to buy outcome: ${result.error}`);
    }

    console.log("User bought outcome1 tokens successfully!");
    console.log(`Transaction signature: ${result.signature}`);
  });

  it("User sells some outcome1 tokens", async () => {
    const sellAmount = 1; // Sell 1 token (whole token unit)

    // Generate transaction
    const tx = await user1SDK.sellOutcomeTx({
      marketPublicKey: market,
      outcome: 1,
      tokensToSell: sellAmount,
      mint,
      sellerTokenAccount: user1TokenAccount
    });

    // Send transaction
    const result = await user1SDK.sendTransaction(tx);

    if (!result.success) {
      throw new Error(`Failed to sell outcome: ${result.error}`);
    }

    console.log("User sold outcome1 tokens successfully!");
    console.log(`Transaction signature: ${result.signature}`);
  });

  it("Authority resolves the market", async () => {
    // Generate transaction
    const tx = await authoritySDK.resolveMarketTx({
      marketPublicKey: market,
      outcome: 1 // Outcome1 wins
    });

    // Send transaction
    const result = await authoritySDK.sendTransaction(tx);

    if (!result.success) {
      throw new Error(`Failed to resolve market: ${result.error}`);
    }

    console.log("Market resolved successfully!");
    console.log(`Transaction signature: ${result.signature}`);
  });

  it("User claims winnings", async () => {
    // Generate transaction
    const tx = await user1SDK.claimWinningsTx({
      marketPublicKey: market,
      mint,
      userTokenAccount: user1TokenAccount
    });

    // Send transaction
    const result = await user1SDK.sendTransaction(tx);

    if (!result.success) {
      throw new Error(`Failed to claim winnings: ${result.error}`);
    }

    console.log("User claimed winnings successfully!");
    console.log(`Transaction signature: ${result.signature}`);
  });

  it("Get market information", async () => {
    const marketInfo = await authoritySDK.getMarket(market);
    
    if (!marketInfo) {
      throw new Error("Failed to get market information");
    }

    console.log("Market information:");
    console.log(`- Name: ${marketInfo.account.name}`);
    console.log(`- Outcome 1: ${marketInfo.account.outcome1}`);
    console.log(`- Outcome 2: ${marketInfo.account.outcome2}`);
    console.log(`- Resolved: ${marketInfo.account.resolved}`);
    console.log(`- Asserted Outcome: ${marketInfo.account.assertedOutcome}`);
    console.log(`- Outcome 1 Supply: ${marketInfo.account.outcome1Supply}`);
    console.log(`- Outcome 2 Supply: ${marketInfo.account.outcome2Supply}`);
  });

  it("Get user holdings", async () => {
    const holdings = await user1SDK.getUserHoldings(user1.publicKey, market);
    
    if (!holdings) {
      console.log("User has no holdings in this market");
      return;
    }

    console.log("User holdings:");
    console.log(`- Outcome 1 Tokens: ${holdings.account.outcome1Tokens}`);
    console.log(`- Outcome 2 Tokens: ${holdings.account.outcome2Tokens}`);
  });

  it("Get market statistics", async () => {
    const stats = await authoritySDK.getMarketStats(market);
    
    if (!stats) {
      throw new Error("Failed to get market statistics");
    }

    console.log("Market statistics:");
    console.log(`- Total Outcome 1 Supply: ${stats.totalOutcome1Supply}`);
    console.log(`- Total Outcome 2 Supply: ${stats.totalOutcome2Supply}`);
    console.log(`- Total Liquidity: ${stats.totalLiquidity} SOL`);
  });

  it("Calculate potential winnings", async () => {
    const potentialWinnings = await user1SDK.calculatePotentialWinnings(user1.publicKey, market);
    
    console.log(`Potential winnings: ${potentialWinnings} SOL`);
  });
});
