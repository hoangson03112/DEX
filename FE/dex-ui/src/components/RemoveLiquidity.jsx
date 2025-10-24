import React, { useState, useEffect, useCallback } from "react";
import { Minus, Info, AlertCircle, Loader2, ArrowDown } from "lucide-react";
import { parseUnits, formatUnits } from "ethers";
import {
  getRouter,
  getFactory,
  getPair,
  fetchPairAddress,
  fetchReserves,
} from "../services/dexApi.js";
import { ADDR, MAX_UINT256 } from "../services/config.js";

/**
 * RemoveLiquidity Component - Giống Uniswap V2
 * Cho phép user rút liquidity từ pool
 */
export default function RemoveLiquidity({
  pools,
  provider,
  signerPromise,
  address,
  onSuccess,
}) {
  const [selectedPool, setSelectedPool] = useState(null);
  const [tokenA, setTokenA] = useState(null);
  const [tokenB, setTokenB] = useState(null);
  const [percentage, setPercentage] = useState(50);
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState("");
  const [poolInfo, setPoolInfo] = useState(null);
  const [lpBalance, setLpBalance] = useState("0");
  const [amountsOut, setAmountsOut] = useState({ amountA: "0", amountB: "0" });

  // Handler for pool selection
  const handlePoolSelect = (poolAddress) => {
    const pool = pools.find((p) => p.address === poolAddress);
    if (!pool) {
      setSelectedPool(null);
      setTokenA(null);
      setTokenB(null);
      return;
    }

    setSelectedPool(pool);
    setTokenA(pool.token0);
    setTokenB(pool.token1);
    setPercentage(50);
  };

  // Fetch pool info and LP balance
  const fetchPoolData = useCallback(async () => {
    if (!provider || !address || !tokenA || !tokenB) return;

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
      const balance = await pair.balanceOf(address);

      const isToken0A = token0.toLowerCase() === tokenA.address.toLowerCase();

      setLpBalance(balance.toString());
      setPoolInfo({
        exists: true,
        pairAddress,
        reserveA: isToken0A ? reserve0.toString() : reserve1.toString(),
        reserveB: isToken0A ? reserve1.toString() : reserve0.toString(),
        totalSupply: totalSupply.toString(),
      });
    } catch (err) {
      console.error("Error fetching pool data:", err);
      setPoolInfo({ exists: false });
    }
  }, [provider, address, tokenA, tokenB]);

  useEffect(() => {
    fetchPoolData();
  }, [fetchPoolData]);

  // Calculate amounts out based on percentage
  useEffect(() => {
    if (!poolInfo?.exists || !lpBalance || lpBalance === "0") {
      setAmountsOut({ amountA: "0", amountB: "0" });
      return;
    }

    try {
      const liquidityToRemove = (BigInt(lpBalance) * BigInt(percentage)) / 100n;
      const totalSupply = BigInt(poolInfo.totalSupply);
      const reserveA = BigInt(poolInfo.reserveA);
      const reserveB = BigInt(poolInfo.reserveB);

      // amountA = (liquidity * reserveA) / totalSupply
      const amountAWei = (liquidityToRemove * reserveA) / totalSupply;
      const amountBWei = (liquidityToRemove * reserveB) / totalSupply;

      setAmountsOut({
        amountA: formatUnits(amountAWei, tokenA.decimals),
        amountB: formatUnits(amountBWei, tokenB.decimals),
      });
    } catch (err) {
      console.error("Error calculating amounts:", err);
    }
  }, [percentage, poolInfo, lpBalance, tokenA, tokenB]);

  // Remove liquidity
  const handleRemoveLiquidity = async () => {
    if (!tokenA || !tokenB || !poolInfo?.exists || lpBalance === "0") {
      setError("Invalid pool or no liquidity");
      return;
    }

    setLoading(true);
    setApproving(true);
    setError("");

    try {
      const liquidityToRemove = (BigInt(lpBalance) * BigInt(percentage)) / 100n;

      // Approve LP token
      const signer = await signerPromise;
      const lpToken = getPair(poolInfo.pairAddress, signer);

      const allowance = await lpToken.allowance(address, ADDR.ROUTER);

      if (BigInt(allowance.toString()) < liquidityToRemove) {
        const approveTx = await lpToken.approve(ADDR.ROUTER, MAX_UINT256);
        await approveTx.wait();
      }

      setApproving(false);

      // Remove liquidity with 0.5% slippage
      const amountAWei = parseUnits(amountsOut.amountA, tokenA.decimals);
      const amountBWei = parseUnits(amountsOut.amountB, tokenB.decimals);
      const amountAMin = (amountAWei * 995n) / 1000n;
      const amountBMin = (amountBWei * 995n) / 1000n;

      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

      const router = getRouter(signer);

      const removeTx = await router.removeLiquidity(
        tokenA.address,
        tokenB.address,
        liquidityToRemove,
        amountAMin,
        amountBMin,
        address,
        deadline
      );

      await removeTx.wait();

      // Success
      setPercentage(50);
      await fetchPoolData();

      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Error removing liquidity:", err);
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
      setApproving(false);
    }
  };

  const percentageOptions = [25, 50, 75, 100];

  return (
    <div className="space-y-4">
      {/* Step 1: Select Pool */}
      <div className="rounded-2xl p-4 bg-slate-800/60 border border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm text-slate-400">Select Pool</label>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedPool?.address || ""}
            onChange={(e) => handlePoolSelect(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-700 text-white outline-none"
          >
            <option value="">Choose a pool</option>
            {pools?.map((pool) => (
              <option key={pool.address} value={pool.address}>
                {pool.token0.symbol} / {pool.token1.symbol}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Show rest of UI only when pool is selected */}
      {selectedPool && (
        <>
          {/* LP Balance Info */}
          {poolInfo?.exists && lpBalance !== "0" && (
            <div className="rounded-xl p-4 bg-slate-800/40 text-sm">
              <div className="flex justify-between text-slate-400 mb-2">
                <span>Your LP Balance:</span>
                <span className="text-white font-medium">
                  {formatUnits(lpBalance, 18)} LP
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Your pool share:</span>
                <span className="text-indigo-400">
                  {(
                    (Number(lpBalance) / Number(poolInfo.totalSupply)) *
                    100
                  ).toFixed(2)}
                  %
                </span>
              </div>
            </div>
          )}

          {/* Percentage Selector */}
          <div className="rounded-2xl p-4 bg-slate-800/60 border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm text-slate-400">Amount to remove</label>
              <span className="text-2xl font-bold text-white">
                {percentage}%
              </span>
            </div>

            <input
              type="range"
              min="1"
              max="100"
              value={percentage}
              onChange={(e) => setPercentage(Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />

            <div className="flex gap-2 mt-3">
              {percentageOptions.map((pct) => (
                <button
                  key={pct}
                  onClick={() => setPercentage(pct)}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition ${
                    percentage === pct
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Amounts Out */}
          {poolInfo?.exists && (
            <>
              <div className="flex justify-center">
                <ArrowDown className="w-5 h-5 text-slate-400" />
              </div>

              <div className="space-y-3">
                <div className="rounded-xl p-4 bg-slate-800/40 border border-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">{tokenA?.symbol}</span>
                    <span className="text-xl font-semibold text-white">
                      {amountsOut.amountA}
                    </span>
                  </div>
                </div>
                <div className="rounded-xl p-4 bg-slate-800/40 border border-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">{tokenB?.symbol}</span>
                    <span className="text-xl font-semibold text-white">
                      {amountsOut.amountB}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Info or Error */}
          {!poolInfo?.exists && tokenA && tokenB && (
            <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-2">
              <Info className="w-4 h-4 text-yellow-400 mt-0.5" />
              <span className="text-sm text-yellow-400">
                Pool does not exist for this pair
              </span>
            </div>
          )}

          {lpBalance === "0" && poolInfo?.exists && (
            <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-2">
              <Info className="w-4 h-4 text-yellow-400 mt-0.5" />
              <span className="text-sm text-yellow-400">
                You don't have any liquidity in this pool
              </span>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
              <span className="text-sm text-red-400">{error}</span>
            </div>
          )}

          {/* Remove Button */}
          <button
            onClick={handleRemoveLiquidity}
            disabled={loading || !poolInfo?.exists || lpBalance === "0"}
            className="w-full py-3 rounded-2xl font-semibold bg-red-600 hover:bg-red-500 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {approving ? "Approving..." : "Removing Liquidity..."}
              </>
            ) : (
              <>
                <Minus className="w-5 h-5" />
                Remove Liquidity
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
}
