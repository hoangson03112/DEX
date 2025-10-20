import React, { useState, useEffect, useCallback } from "react";
import { Plus, Info, AlertCircle, Loader2, ArrowDown } from "lucide-react";
import { parseUnits, formatUnits } from "ethers";
import {
  getRouter,
  getFactory,
  getPair,
  getErc20,
  fetchPairAddress,
  fetchReserves,
} from "../services/dexApi.js";
import { ADDR, MAX_UINT256 } from "../services/config.js";
import useTokenBalance from "../hooks/useTokenBalance.js";

/**
 * AddLiquidity Component - Giống Uniswap V2
 * Cho phép user thêm liquidity vào pool
 */
export default function AddLiquidity({
  tokens,
  provider,
  signerPromise,
  address,
  onSuccess,
}) {
  const [tokenA, setTokenA] = useState(null);
  const [tokenB, setTokenB] = useState(null);
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState("");
  const [poolInfo, setPoolInfo] = useState(null);
  const [shareOfPool, setShareOfPool] = useState("0");

  const { balance: balanceA } = useTokenBalance(
    provider,
    tokenA?.address,
    address,
    tokenA?.decimals
  );
  const { balance: balanceB } = useTokenBalance(
    provider,
    tokenB?.address,
    address,
    tokenB?.decimals
  );

  // Fetch pool info (reserves, total supply)
  const fetchPoolInfo = useCallback(async () => {
    if (!provider || !tokenA || !tokenB) return;

    try {
      const factory = getFactory(provider);
      const pairAddress = await fetchPairAddress(
        factory,
        tokenA.address,
        tokenB.address
      );

      if (
        !pairAddress ||
        pairAddress === "0x0000000000000000000000000000000000000000"
      ) {
        setPoolInfo({ exists: false });
        return;
      }

      const pair = getPair(pairAddress, provider);
      const { reserve0, reserve1 } = await fetchReserves(pair);
      const totalSupply = await pair.totalSupply();
      const token0 = await pair.token0();

      const isToken0A = token0.toLowerCase() === tokenA.address.toLowerCase();

      setPoolInfo({
        exists: true,
        pairAddress,
        reserveA: isToken0A ? reserve0.toString() : reserve1.toString(),
        reserveB: isToken0A ? reserve1.toString() : reserve0.toString(),
        totalSupply: totalSupply.toString(),
      });
    } catch (err) {
      console.error("Error fetching pool info:", err);
      setPoolInfo({ exists: false });
    }
  }, [provider, tokenA, tokenB]);

  useEffect(() => {
    fetchPoolInfo();
  }, [fetchPoolInfo]);

  useEffect(() => {
    if (!poolInfo?.exists || !amountA || amountA === "0") {
      return;
    }

    try {
      const amountAWei = parseUnits(amountA, tokenA.decimals);
      const reserveA = BigInt(poolInfo.reserveA);
      const reserveB = BigInt(poolInfo.reserveB);

      // amountB = (amountA * reserveB) / reserveA
      const amountBWei = (amountAWei * reserveB) / reserveA;
      const amountBFormatted = formatUnits(amountBWei, tokenB.decimals);

      setAmountB(amountBFormatted);

      // Calculate share of pool
      const liquidityMinted = calculateLiquidityMinted(
        amountAWei.toString(),
        poolInfo.reserveA,
        poolInfo.totalSupply
      );
      const newTotalSupply =
        BigInt(poolInfo.totalSupply) + BigInt(liquidityMinted);
      const share = (Number(liquidityMinted) / Number(newTotalSupply)) * 100;
      setShareOfPool(share.toFixed(2));
    } catch (err) {
      console.error("Error calculating amounts:", err);
    }
  }, [amountA, poolInfo, tokenA, tokenB]);

  const calculateLiquidityMinted = (amountA, reserveA, totalSupply) => {
    if (totalSupply === "0") {
      return amountA;
    }
    return (BigInt(amountA) * BigInt(totalSupply)) / BigInt(reserveA);
  };

  const approveToken = async (tokenAddress, amount) => {
    const signer = await signerPromise;
    const token = getErc20(tokenAddress, signer);

    const allowance = await token.allowance(address, ADDR.ROUTER);

    if (BigInt(allowance.toString()) < BigInt(amount)) {
      const approveTx = await token.approve(ADDR.ROUTER, MAX_UINT256);
      await approveTx.wait();
    }
  };

  // Add liquidity
  const handleAddLiquidity = async () => {
    if (!tokenA || !tokenB || !amountA || !amountB) {
      setError("Please fill all fields");
      return;
    }

    setLoading(true);
    setApproving(true);
    setError("");

    try {
      const amountAWei = parseUnits(amountA, tokenA.decimals);
      const amountBWei = parseUnits(amountB, tokenB.decimals);

      // Approve both tokens
      await approveToken(tokenA.address, amountAWei.toString());
      await approveToken(tokenB.address, amountBWei.toString());

      setApproving(false);

      // Add liquidity with 0.5% slippage
      const amountAMin = (amountAWei * 995n) / 1000n;
      const amountBMin = (amountBWei * 995n) / 1000n;

      const deadline = Math.floor(Date.now());

      const signer = await signerPromise;
      const router = getRouter(signer);

      const addTx = await router.addLiquidity(
        tokenA.address,
        tokenB.address,
        amountAWei,
        amountBWei,
        amountAMin,
        amountBMin,
        address,
        deadline
      );

      await addTx.wait();

      // Success
      setAmountA("");
      setAmountB("");
      await fetchPoolInfo();

      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Error adding liquidity:", err);
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
      setApproving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Token A Input */}
      <div className="rounded-2xl p-4 bg-slate-800/60 border border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm text-slate-400">Token A</label>
          <div className="text-xs text-slate-400">Balance: {balanceA}</div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={tokenA?.address || ""}
            onChange={(e) => {
              const selected = tokens.find((t) => t.address === e.target.value);
              setTokenA(selected);
              setAmountA("");
              setAmountB("");
            }}
            className="px-3 py-2 rounded-xl bg-slate-700 text-white outline-none"
          >
            <option value="">Select token</option>
            {tokens.map((token) => (
              <option key={token.address} value={token.address}>
                {token.symbol}
              </option>
            ))}
          </select>
          <input
            type="text"
            inputMode="decimal"
            value={amountA}
            onChange={(e) => setAmountA(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="0.0"
            className="flex-1 bg-transparent outline-none text-2xl text-white placeholder:text-slate-500"
          />
        </div>
      </div>

      <div className="flex justify-center">
        <Plus className="w-5 h-5 text-slate-400" />
      </div>

      {/* Token B Input */}
      <div className="rounded-2xl p-4 bg-slate-800/60 border border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm text-slate-400">Token B</label>
          <div className="text-xs text-slate-400">Balance: {balanceB}</div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={tokenB?.address || ""}
            onChange={(e) => {
              const selected = tokens.find((t) => t.address === e.target.value);
              setTokenB(selected);
              setAmountA("");
              setAmountB("");
            }}
            className="px-3 py-2 rounded-xl bg-slate-700 text-white outline-none"
          >
            <option value="">Select token</option>
            {tokens.map((token) => (
              <option key={token.address} value={token.address}>
                {token.symbol}
              </option>
            ))}
          </select>
          <input
            type="text"
            inputMode="decimal"
            value={amountB}
            onChange={(e) => {
              setAmountB(e.target.value.replace(/[^0-9.]/g, ""));
              setAmountA(""); // Clear A to recalculate based on B
            }}
            placeholder="0.0"
            className="flex-1 bg-transparent outline-none text-2xl text-white placeholder:text-slate-500"
            disabled={poolInfo?.exists && amountA}
          />
        </div>
      </div>

      {/* Pool Info */}
      {poolInfo && (
        <div className="rounded-xl p-4 bg-slate-800/40 space-y-2 text-sm">
          <div className="flex items-center gap-2 text-slate-300">
            <Info className="w-4 h-4" />
            <span className="font-medium">
              {poolInfo.exists ? "Pool exists" : "First liquidity provider"}
            </span>
          </div>
          {poolInfo.exists && (
            <>
              <div className="flex justify-between text-slate-400">
                <span>Reserve {tokenA?.symbol}:</span>
                <span>
                  {formatUnits(poolInfo.reserveA, tokenA?.decimals || 18)}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Reserve {tokenB?.symbol}:</span>
                <span>
                  {formatUnits(poolInfo.reserveB, tokenB?.decimals || 18)}
                </span>
              </div>
              {shareOfPool !== "0" && (
                <div className="flex justify-between text-indigo-400 font-medium">
                  <span>Your share of pool:</span>
                  <span>{shareOfPool}%</span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
          <span className="text-sm text-red-400">{error}</span>
        </div>
      )}

      {/* Add Button */}
      <button
        onClick={handleAddLiquidity}
        disabled={loading || !tokenA || !tokenB || !amountA || !amountB}
        className="w-full py-3 rounded-2xl font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            {approving ? "Approving..." : "Adding Liquidity..."}
          </>
        ) : (
          <>
            <Plus className="w-5 h-5" />
            Add Liquidity
          </>
        )}
      </button>
    </div>
  );
}
