# PredictX Anchor - Solana Prediction Market Platform

A decentralized prediction market platform built on Solana using Anchor framework. This implementation provides a basic prediction market with binary outcomes, automated market making, and market resolution.

## Project Structure

```
programs/predictx_anchor/src/
├── lib.rs                 # Main program entry point
├── errors.rs              # Custom error definitions
├── state.rs               # Account state structures
└── instructions/          # Instruction handlers
    ├── mod.rs             # Module exports
    ├── create_market.rs   # Market creation
    ├── buy_outcome.rs     # Buy outcome tokens
    ├── sell_outcome.rs    # Sell outcome tokens
    ├── resolve_market.rs  # Market resolution
    └── claim_winnings.rs  # Claim winnings after resolution
```

## Core Features

### 1. Market Creation
- Create binary prediction markets with two possible outcomes
- Set initial liquidity for automated market making
- Market authority controls resolution

### 2. Automated Market Making (AMM)
- Fixed product market maker: `x * y = k`
- Automatic price discovery through trading
- Slippage increases with trade size

### 3. Trading
- Buy outcome tokens using SOL
- Sell outcome tokens for SOL
- Real-time price updates based on supply/demand

### 4. Market Resolution
- Three possible outcomes:
  - Outcome 1 wins
  - Outcome 2 wins
  - Unresolvable (50/50 split)

### 5. Winnings Distribution
- Winners receive proportional payout based on token holdings
- Losers receive nothing
- Unresolvable markets split payout 50/50

## Account Structures

### Market
```rust
pub struct Market {
    pub authority: Pubkey,           // Market creator
    pub name: String,                // Market name/identifier
    pub outcome1: String,            // First outcome name
    pub outcome2: String,            // Second outcome name
    pub description: String,         // Market description
    pub resolved: bool,              // Resolution status
    pub asserted_outcome: u8,        // 0=unresolved, 1=outcome1, 2=outcome2, 3=unresolvable
    pub outcome1_supply: u64,        // Current supply of outcome1 tokens
    pub outcome2_supply: u64,        // Current supply of outcome2 tokens
    pub bump: u8,                   // PDA bump
}
```

### UserHoldings
```rust
pub struct UserHoldings {
    pub user: Pubkey,               // User public key
    pub market: Pubkey,             // Market public key
    pub outcome1_tokens: u64,       // User's outcome1 token balance
    pub outcome2_tokens: u64,       // User's outcome2 token balance
    pub bump: u8,                   // PDA bump
}
```

## Instructions

### 1. Create Market
Creates a new prediction market with initial liquidity.

**Parameters:**
- `outcome1`: Name of first outcome
- `outcome2`: Name of second outcome  
- `description`: Market description
- `initial_liquidity`: Initial SOL liquidity
- `market_name`: Unique name for the market

### 2. Buy Outcome
Buy outcome tokens using SOL through the AMM.

**Parameters:**
- `outcome`: 1 for outcome1, 2 for outcome2
- `amount`: SOL amount to spend

### 3. Sell Outcome
Sell outcome tokens for SOL through the AMM.

**Parameters:**
- `outcome`: 1 for outcome1, 2 for outcome2
- `tokens_to_sell`: Number of tokens to sell

### 4. Resolve Market
Resolve the market outcome (authority only).

**Parameters:**
- `outcome`: 1=outcome1 wins, 2=outcome2 wins, 3=unresolvable

### 5. Claim Winnings
Claim winnings after market resolution.

## Usage Example

```typescript
// Use a market name
const marketName = "championship-game-2024";

// Find market PDA
const [market] = PublicKey.findProgramAddressSync(
  [
    Buffer.from("market"),
    authority.publicKey.toBuffer(),
    Buffer.from(marketName),
  ],
  program.programId
);

// Create market
await program.methods.createMarket(
  "Team A Wins",
  "Team B Wins", 
  "Championship game prediction",
  new anchor.BN(100 * LAMPORTS_PER_SOL),
  marketName
).accounts({
  market: market,
  authority: authority.publicKey,
  systemProgram: SystemProgram.programId,
}).signers([authority]).rpc();

// Buy outcome tokens
await program.methods.buyOutcome(1, new anchor.BN(10 * LAMPORTS_PER_SOL))
.accounts({
  market: market,
  userHoldings: userHoldingsPda,
  buyer: user.publicKey,
  systemProgram: SystemProgram.programId,
}).signers([user]).rpc();

// Resolve market
await program.methods.resolveMarket(1)
.accounts({
  market: market,
  authority: authority.publicKey,
}).signers([authority]).rpc();

// Claim winnings
await program.methods.claimWinnings()
.accounts({
  market: market,
  userHoldings: userHoldingsPda,
  user: user.publicKey,
  systemProgram: SystemProgram.programId,
}).signers([user]).rpc();
```

## Building and Testing

1. **Build the program:**
   ```bash
   anchor build
   ```

2. **Run tests:**
   ```bash
   anchor test
   ```

3. **Deploy to localnet:**
   ```bash
   anchor deploy
   ```

## Key Differences from Ethereum Version

1. **Simplified Oracle**: No UMA integration, direct authority resolution
2. **SOL-based**: Uses SOL instead of ERC20 tokens
3. **PDA-based**: Uses Program Derived Addresses for account management
4. **AMM Integration**: Built-in automated market making
5. **Simplified Bond System**: No complex bond/reward mechanism
6. **Market Names**: Uses descriptive market names for identification

## Security Considerations

- Market authority has full control over resolution
- No external oracle integration (simplified version)
- AMM provides price discovery but can be manipulated with large trades
- Consider adding time locks and multi-sig for production use

## Future Enhancements

1. **Oracle Integration**: Add Pyth or other oracle networks
2. **Multi-sig Resolution**: Require multiple authorities for resolution
3. **Time-based Markets**: Add expiration dates
4. **Fee System**: Add trading fees for sustainability
5. **Liquidity Mining**: Incentivize liquidity providers
6. **Advanced AMM**: Implement more sophisticated market making algorithms 