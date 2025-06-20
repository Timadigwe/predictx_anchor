import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PredictxAnchor } from "../target/types/predictx_anchor";
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as fs from 'fs';

// Helper function to load keypair from file
function loadKeypairFromFile(filePath: string): Keypair {
  const keypairData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const secretKey = new Uint8Array(keypairData.secretKey);
  return Keypair.fromSecretKey(secretKey);
}

describe("predictx_anchor", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.PredictxAnchor as Program<PredictxAnchor>;
  
  let authority: Keypair;
  let user1: Keypair;
  let market: PublicKey;
  let marketName: string;

  before(async () => {
    // Load pre-funded keypair from file
    authority = loadKeypairFromFile('./test-keypair.json');
    user1 = Keypair.generate();

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

    // Find market PDA
    [market] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("market"),
        authority.publicKey.toBuffer(),
        Buffer.from(marketName),
      ],
      program.programId
    );
  });

  it("Create a prediction market", async () => {
    const outcome1 = "Team A Wins";
    const outcome2 = "Team B Wins";
    const description = "Who will win the championship game?";
    const initialLiquidity = 10 * LAMPORTS_PER_SOL; // 10 SOL per side

    await program.methods
      .initializeMarket(outcome1, outcome2, description, new anchor.BN(initialLiquidity), marketName)
      .accounts({
        market: market,
        authority: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([authority])
      .rpc();

    console.log("Market created successfully!");
  });

  it("User buys outcome1 tokens", async () => {
    const buyAmount = 1 * LAMPORTS_PER_SOL; // 1 SOL (to receive 1 token)

    await program.methods
      .buyOutcome(1, new anchor.BN(buyAmount))
      .accounts({
        market: market,
        userHoldings: await getUserHoldingsPDA(user1.publicKey, market),
        buyer: user1.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user1])
      .rpc();

    console.log("User bought outcome1 tokens successfully!");
  });

  it("Authority resolves the market", async () => {
    await program.methods
      .resolveMarket(1) // Outcome1 wins
      .accounts({
        market: market,
        authority: authority.publicKey,
      })
      .signers([authority])
      .rpc();

    console.log("Market resolved successfully!");
  });

  it("User claims winnings", async () => {
    await program.methods
      .claimWinnings()
      .accounts({
        market: market,
        userHoldings: await getUserHoldingsPDA(user1.publicKey, market),
        user: user1.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user1])
      .rpc();

    console.log("User claimed winnings successfully!");
  });
});

async function getUserHoldingsPDA(user: PublicKey, market: PublicKey): Promise<PublicKey> {
  const [userHoldings] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("user_holdings"),
      user.toBuffer(),
      market.toBuffer(),
    ],
    anchor.workspace.PredictxAnchor.programId
  );
  return userHoldings;
}
