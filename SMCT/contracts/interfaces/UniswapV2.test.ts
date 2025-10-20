import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { UniswapV2Factory, UniswapV2Router, ERC20Mock, UniswapV2Pair } from "../../types/ethers-contracts";

describe("Uniswap V2 Clone - Complete Test Suite", function () {
  let factory: UniswapV2Factory;
  let router: UniswapV2Router;
  let tokenA: ERC20Mock;
  let tokenB: ERC20Mock;
  let pair: UniswapV2Pair;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const INITIAL_SUPPLY = ethers.parseEther("10000");
  const LIQUIDITY_AMOUNT_A = ethers.parseEther("100");
  const LIQUIDITY_AMOUNT_B = ethers.parseEther("100");

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy Factory
    const FactoryFactory = await ethers.getContractFactory("UniswapV2Factory");
    factory = await FactoryFactory.deploy(owner.address);
    await factory.waitForDeployment();

    // Deploy Router
    const RouterFactory = await ethers.getContractFactory("UniswapV2Router");
    router = await RouterFactory.deploy(await factory.getAddress());
    await router.waitForDeployment();

    // Deploy test tokens
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    tokenA = await TokenFactory.deploy("Token A", "TKA", INITIAL_SUPPLY);
    await tokenA.waitForDeployment();

    tokenB = await TokenFactory.deploy("Token B", "TKB", INITIAL_SUPPLY);
    await tokenB.waitForDeployment();

    // Sort tokens (Uniswap convention)
    const tokenAAddress = await tokenA.getAddress();
    const tokenBAddress = await tokenB.getAddress();
    if (tokenAAddress > tokenBAddress) {
      [tokenA, tokenB] = [tokenB, tokenA];
    }

    // Transfer tokens to users
    await tokenA.transfer(user1.address, ethers.parseEther("1000"));
    await tokenB.transfer(user1.address, ethers.parseEther("1000"));
    await tokenA.transfer(user2.address, ethers.parseEther("1000"));
    await tokenB.transfer(user2.address, ethers.parseEther("1000"));
  });

  describe("Factory", function () {
    it("Should create a pair", async function () {
      const tx = await factory.createPair(
        await tokenA.getAddress(),
        await tokenB.getAddress()
      );
      await tx.wait();

      const pairAddress = await factory.getPair(
        await tokenA.getAddress(),
        await tokenB.getAddress()
      );

      expect(pairAddress).to.not.equal(ethers.ZeroAddress);
    });

    it("Should fail to create duplicate pair", async function () {
      await factory.createPair(
        await tokenA.getAddress(),
        await tokenB.getAddress()
      );

      await expect(
        factory.createPair(
          await tokenA.getAddress(),
          await tokenB.getAddress()
        )
      ).to.be.revertedWith("EXISTS");
    });

    it("Should increment allPairsLength", async function () {
      expect(await factory.allPairsLength()).to.equal(0);

      await factory.createPair(
        await tokenA.getAddress(),
        await tokenB.getAddress()
      );

      expect(await factory.allPairsLength()).to.equal(1);
    });
  });

  describe("Router - Add Liquidity", function () {
    beforeEach(async function () {
      // Approve router
      await tokenA.approve(await router.getAddress(), ethers.MaxUint256);
      await tokenB.approve(await router.getAddress(), ethers.MaxUint256);
    });

    it("Should add liquidity and create pair", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

      const tx = await router.addLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        LIQUIDITY_AMOUNT_A,
        LIQUIDITY_AMOUNT_B,
        0,
        0,
        owner.address,
        deadline
      );

      await tx.wait();

      const pairAddress = await factory.getPair(
        await tokenA.getAddress(),
        await tokenB.getAddress()
      );

      expect(pairAddress).to.not.equal(ethers.ZeroAddress);

      const PairFactory = await ethers.getContractFactory("UniswapV2Pair");
      pair = PairFactory.attach(pairAddress) as UniswapV2Pair;

      const lpBalance = await pair.balanceOf(owner.address);
      expect(lpBalance).to.be.gt(0);
    });

    it("Should fail with expired deadline", async function () {
      const deadline = Math.floor(Date.now() / 1000) - 60; // Past deadline

      await expect(
        router.addLiquidity(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          LIQUIDITY_AMOUNT_A,
          LIQUIDITY_AMOUNT_B,
          0,
          0,
          owner.address,
          deadline
        )
      ).to.be.revertedWith("EXPIRED");
    });

    it("Should respect minimum amounts", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

      // First add liquidity
      await router.addLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        LIQUIDITY_AMOUNT_A,
        LIQUIDITY_AMOUNT_B,
        0,
        0,
        owner.address,
        deadline
      );

      // Try to add with unrealistic minimum
      await expect(
        router.addLiquidity(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          ethers.parseEther("10"),
          ethers.parseEther("10"),
          ethers.parseEther("100"), // Too high minimum
          0,
          owner.address,
          deadline
        )
      ).to.be.revertedWith("INSUFFICIENT_A_AMOUNT");
    });
  });

  describe("Router - Swap", function () {
    beforeEach(async function () {
      // Create pair and add liquidity
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

      await tokenA.approve(await router.getAddress(), ethers.MaxUint256);
      await tokenB.approve(await router.getAddress(), ethers.MaxUint256);

      await router.addLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        LIQUIDITY_AMOUNT_A,
        LIQUIDITY_AMOUNT_B,
        0,
        0,
        owner.address,
        deadline
      );

      const pairAddress = await factory.getPair(
        await tokenA.getAddress(),
        await tokenB.getAddress()
      );

      const PairFactory = await ethers.getContractFactory("UniswapV2Pair");
      pair = PairFactory.attach(pairAddress) as UniswapV2Pair;
    });

    it("Should swap tokens", async function () {
      const swapAmount = ethers.parseEther("1");
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

      // User1 swaps tokenA for tokenB
      await tokenA.connect(user1).approve(await router.getAddress(), ethers.MaxUint256);

      const balanceBefore = await tokenB.balanceOf(user1.address);

      await router.connect(user1).swapExactTokensForTokens(
        swapAmount,
        0,
        [await tokenA.getAddress(), await tokenB.getAddress()],
        user1.address,
        deadline
      );

      const balanceAfter = await tokenB.balanceOf(user1.address);
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("Should respect slippage protection", async function () {
      const swapAmount = ethers.parseEther("1");
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

      await tokenA.connect(user1).approve(await router.getAddress(), ethers.MaxUint256);

      // Set minimum too high
      const unrealisticMin = ethers.parseEther("100");

      await expect(
        router.connect(user1).swapExactTokensForTokens(
          swapAmount,
          unrealisticMin,
          [await tokenA.getAddress(), await tokenB.getAddress()],
          user1.address,
          deadline
        )
      ).to.be.revertedWith("SLIPPAGE");
    });

    it("Should calculate correct amountOut", async function () {
      const swapAmount = ethers.parseEther("1");
      const reserves = await pair.getReserves();

      const amountOut = await router.getAmountOut(
        swapAmount,
        reserves[0],
        reserves[1]
      );

      expect(amountOut).to.be.gt(0);
      expect(amountOut).to.be.lt(swapAmount); // Due to 0.3% fee
    });
  });

  describe("Router - Remove Liquidity", function () {
    let lpTokens: bigint;

    beforeEach(async function () {
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

      await tokenA.approve(await router.getAddress(), ethers.MaxUint256);
      await tokenB.approve(await router.getAddress(), ethers.MaxUint256);

      await router.addLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        LIQUIDITY_AMOUNT_A,
        LIQUIDITY_AMOUNT_B,
        0,
        0,
        owner.address,
        deadline
      );

      const pairAddress = await factory.getPair(
        await tokenA.getAddress(),
        await tokenB.getAddress()
      );

      const PairFactory = await ethers.getContractFactory("UniswapV2Pair");
      pair = PairFactory.attach(pairAddress) as UniswapV2Pair;

      lpTokens = await pair.balanceOf(owner.address);
    });

    it("Should remove liquidity", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

      await pair.approve(await router.getAddress(), ethers.MaxUint256);

      const balanceABefore = await tokenA.balanceOf(owner.address);
      const balanceBBefore = await tokenB.balanceOf(owner.address);

      await router.removeLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        lpTokens,
        0,
        0,
        owner.address,
        deadline
      );

      const balanceAAfter = await tokenA.balanceOf(owner.address);
      const balanceBAfter = await tokenB.balanceOf(owner.address);

      expect(balanceAAfter).to.be.gt(balanceABefore);
      expect(balanceBAfter).to.be.gt(balanceBBefore);
      expect(await pair.balanceOf(owner.address)).to.equal(0);
    });
  });

  describe("Pair - Direct interactions", function () {
    beforeEach(async function () {
      await factory.createPair(
        await tokenA.getAddress(),
        await tokenB.getAddress()
      );

      const pairAddress = await factory.getPair(
        await tokenA.getAddress(),
        await tokenB.getAddress()
      );

      const PairFactory = await ethers.getContractFactory("UniswapV2Pair");
      pair = PairFactory.attach(pairAddress) as UniswapV2Pair;
    });

    it("Should mint LP tokens on first liquidity", async function () {
      await tokenA.transfer(await pair.getAddress(), LIQUIDITY_AMOUNT_A);
      await tokenB.transfer(await pair.getAddress(), LIQUIDITY_AMOUNT_B);

      const lpTokens = await pair.mint(owner.address);
      
      expect(await pair.balanceOf(owner.address)).to.be.gt(0);
    });

    it("Should maintain k=xy constant on swaps", async function () {
      // Add liquidity first
      await tokenA.transfer(await pair.getAddress(), LIQUIDITY_AMOUNT_A);
      await tokenB.transfer(await pair.getAddress(), LIQUIDITY_AMOUNT_B);
      await pair.mint(owner.address);

      const reserves1 = await pair.getReserves();
      const k1 = reserves1[0] * reserves1[1];

      // Perform swap
      const swapAmount = ethers.parseEther("1");
      await tokenA.transfer(await pair.getAddress(), swapAmount);
      
      const amountOut = ethers.parseEther("0.99"); // Approximate
      await pair.swap(0, amountOut, owner.address);

      const reserves2 = await pair.getReserves();
      const k2 = reserves2[0] * reserves2[1];

      // K should increase slightly due to 0.3% fee
      expect(k2).to.be.gte(k1);
    });
  });
});
