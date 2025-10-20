import { useState, useCallback } from "react";
import { parseUnits } from "ethers";
import { getRouter, getFactory, getPair, getErc20, fetchPairAddress, fetchReserves } from "../services/dexApi.js";
import { ADDR, MAX_UINT256 } from "../services/config.js";

/**
 * Hook để xử lý swap logic:
 * - Tính toán quote từ reserves
 * - Approve tokens
 * - Execute swap
 */
export default function useSwap(provider, signerPromise, address) {
  const [swapping, setSwapping] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState("");

  /**
   * Get quote amount out từ reserves của pair
   * @param {string} amountIn - số lượng token input (raw, đã parse)
   * @param {object} tokenIn - token info {address, decimals}
   * @param {object} tokenOut - token info {address, decimals}
   * @returns {Promise<{amountOut: string, reserveIn: string, reserveOut: string}>}
   */
  const getQuote = useCallback(
    async (amountIn, tokenIn, tokenOut) => {
      if (!provider || !amountIn || amountIn === "0") {
        return { amountOut: "0", reserveIn: "0", reserveOut: "0" };
      }

      // Validate tokens
      if (!tokenIn || !tokenOut || !tokenIn.address || !tokenOut.address) {
        return { amountOut: "0", reserveIn: "0", reserveOut: "0" };
      }

      try {
        const factory = getFactory(provider);
        const pairAddress = await fetchPairAddress(factory, tokenIn.address, tokenOut.address);
        
        if (!pairAddress || pairAddress === "0x0000000000000000000000000000000000000000") {
          throw new Error("Pair does not exist");
        }

        const pair = getPair(pairAddress, provider);
        const { reserve0, reserve1 } = await fetchReserves(pair);

        // Xác định token0 và token1
        const token0 = await pair.token0();
        const isToken0In = token0?.toLowerCase() === tokenIn?.address?.toLowerCase();
        
        const reserveIn = isToken0In ? reserve0 : reserve1;
        const reserveOut = isToken0In ? reserve1 : reserve0;

        // Tính amountOut theo công thức Uniswap V2
        // amountOut = (amountIn * 997 * reserveOut) / (reserveIn * 1000 + amountIn * 997)
        const amountInWithFee = BigInt(amountIn) * 997n;
        const numerator = amountInWithFee * reserveOut;
        const denominator = reserveIn * 1000n + amountInWithFee;
        const amountOut = numerator / denominator;

        return {
          amountOut: amountOut.toString(),
          reserveIn: reserveIn.toString(),
          reserveOut: reserveOut.toString(),
        };
      } catch (err) {
        console.error("Error getting quote:", err);
        throw err;
      }
    },
    [provider]
  );

  /**
   * Check token allowance và approve nếu cần
   * @param {string} tokenAddress 
   * @param {string} amount - raw amount đã parse
   */
  const ensureApproval = useCallback(
    async (tokenAddress, amount) => {
      if (!signerPromise || !address) {
        throw new Error("Wallet not connected");
      }

      setApproving(true);
      setError("");

      try {
        const signer = await signerPromise;
        const token = getErc20(tokenAddress, signer);
        
        const allowance = await token.allowance(address, ADDR.ROUTER);
        
        if (BigInt(allowance.toString()) < BigInt(amount)) {
          const approveTx = await token.approve(ADDR.ROUTER, MAX_UINT256);
          await approveTx.wait();
        }
      } catch (err) {
        console.error("Approval error:", err);
        setError(err?.message || String(err));
        throw err;
      } finally {
        setApproving(false);
      }
    },
    [signerPromise, address]
  );

  /**
   * Execute swap
   * @param {object} params
   * @param {string} params.amountIn - formatted amount (e.g. "1.5")
   * @param {string} params.amountOutMin - formatted amount minimum to receive
   * @param {object} params.tokenIn - {address, decimals, symbol}
   * @param {object} params.tokenOut - {address, decimals, symbol}
   * @param {number} params.deadline - Unix timestamp (optional, defaults to 20 minutes)
   */
  const executeSwap = useCallback(
    async ({ amountIn, amountOutMin, tokenIn, tokenOut, deadline }) => {
      if (!signerPromise || !address) {
        throw new Error("Wallet not connected");
      }

      // Validate tokens
      if (!tokenIn || !tokenOut || !tokenIn.address || !tokenOut.address) {
        throw new Error("Invalid tokens selected");
      }

      setSwapping(true);
      setError("");

      try {
        // Parse amounts
        const amountInRaw = parseUnits(amountIn, tokenIn.decimals);
        const amountOutMinRaw = parseUnits(amountOutMin, tokenOut.decimals);

        // Approve token
        await ensureApproval(tokenIn.address, amountInRaw.toString());

        // Execute swap
        const signer = await signerPromise;
        const router = getRouter(signer);

        const path = [tokenIn.address, tokenOut.address];

        // Default deadline: 20 minutes from now
        const finalDeadline = deadline || Math.floor(Date.now() / 1000) + 60 * 20;

        const swapTx = await router.swapExactTokensForTokens(
          amountInRaw,
          amountOutMinRaw,
          path,
          address,
          finalDeadline
        );

        const receipt = await swapTx.wait();

        return receipt;
      } catch (err) {
        setError(err?.message || String(err));
        throw err;
      } finally {
        setSwapping(false);
      }
    },
    [signerPromise, address, ensureApproval]
  );

  return {
    getQuote,
    executeSwap,
    ensureApproval,
    swapping,
    approving,
    error,
  };
}
