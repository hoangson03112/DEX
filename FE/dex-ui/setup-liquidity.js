/**
 * Setup Script - Chạy trên Node.js để setup tokens và liquidity
 *
 * Requirements:
 * - npm install ethers
 * - Có private key với SepoliaETH
 *
 * Usage:
 * node setup-liquidity.js
 */

import { ethers } from "ethers";

// Config
const SEPOLIA_RPC =
  "https://eth-sepolia.g.alchemy.com/v2/q1_Rwv-1w3pEv7Uzo48Vu";
const PRIVATE_KEY =
  "2eca46f8c299c194322649807ed87d2ebcf6f3eeffb682aa53b74a6b13f07b0e";

const ADDRESSES = {
  ROUTER: "0xB4d4dd642a0cC757C1D3c941897915BBCcf22C9E",
  FACTORY: "0xcb515099c8272ef1Fe352f9C2B7475BD7d53795D",
  TOKEN_A: "0x77Aa9c3F95C1E81f01C8272BD7B8e2722CBd0c7b",
  TOKEN_B: "0x850B32ED32e70a09BA17E6C05cd910eaCE287dc1",
};

// ABIs
const ERC20_ABI = [
  "function mint(address to, uint256 value)",
  "function approve(address spender, uint256 value)",
  "function balanceOf(address owner) view returns (uint256)",
  "function symbol() view returns (string)",
];

const ROUTER_ABI = [
  "function addLiquidity(address tokenA, address tokenB, uint256 amountADesired, uint256 amountBDesired) returns (uint256 amountA, uint256 amountB, uint256 liquidity)",
];

async function main() {
  console.log("🚀 Starting DEX Setup...\n");

  // Connect to Sepolia
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const address = await wallet.getAddress();

  console.log("Wallet:", address);
  const balance = await provider.getBalance(address);
  console.log("ETH Balance:", ethers.formatEther(balance), "ETH\n");

  // Step 1: Mint tokens
  console.log("Step 1: Minting tokens...");
  const tokenA = new ethers.Contract(ADDRESSES.TOKEN_A, ERC20_ABI, wallet);
  const tokenB = new ethers.Contract(ADDRESSES.TOKEN_B, ERC20_ABI, wallet);

  const symbolA = await tokenA.symbol();
  const symbolB = await tokenB.symbol();

  console.log(`Minting 1000 ${symbolA}...`);
  let tx = await tokenA.mint(address, ethers.parseEther("1000"));
  await tx.wait();
  console.log(`✅ Minted ${symbolA}`);

  console.log(`Minting 1000 ${symbolB}...`);
  tx = await tokenB.mint(address, ethers.parseEther("1000"));
  await tx.wait();
  console.log(`✅ Minted ${symbolB}\n`);

  // Step 2: Approve tokens
  console.log("Step 2: Approving tokens...");
  console.log(`Approving ${symbolA}...`);
  tx = await tokenA.approve(ADDRESSES.ROUTER, ethers.MaxUint256);
  await tx.wait();
  console.log(`✅ Approved ${symbolA}`);

  console.log(`Approving ${symbolB}...`);
  tx = await tokenB.approve(ADDRESSES.ROUTER, ethers.MaxUint256);
  await tx.wait();
  console.log(`✅ Approved ${symbolB}\n`);

  // Step 3: Add liquidity
  console.log("Step 3: Adding liquidity...");
  const router = new ethers.Contract(ADDRESSES.ROUTER, ROUTER_ABI, wallet);

  tx = await router.addLiquidity(
    ADDRESSES.TOKEN_A,
    ADDRESSES.TOKEN_B,
    ethers.parseEther("100"),
    ethers.parseEther("100")
  );

  console.log("Transaction:", tx.hash);
  const receipt = await tx.wait();
  console.log("✅ Liquidity added!");
  console.log("Gas used:", receipt.gasUsed.toString(), "\n");

  // Check final balances
  console.log("Final balances:");
  const balA = await tokenA.balanceOf(address);
  const balB = await tokenB.balanceOf(address);
  console.log(`${symbolA}:`, ethers.formatEther(balA));
  console.log(`${symbolB}:`, ethers.formatEther(balB));

  console.log("\n✅ Setup complete! DEX is ready for testing.");
}

main().catch((error) => {
  console.error("❌ Error:", error);
});
