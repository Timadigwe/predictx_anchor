const fs = require('fs');
const { Keypair } = require('@solana/web3.js');

// Generate a new keypair
const keypair = Keypair.generate();

// Save the keypair to a file
const keypairData = {
  publicKey: keypair.publicKey.toString(),
  secretKey: Array.from(keypair.secretKey)
};

fs.writeFileSync('test-keypair.json', JSON.stringify(keypairData, null, 2));

console.log('Keypair saved to test-keypair.json');
console.log('Public Key:', keypair.publicKey.toString());
console.log('You can now airdrop SOL to this address manually'); 