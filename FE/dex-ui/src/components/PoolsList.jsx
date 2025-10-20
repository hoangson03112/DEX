import React from "react";
import { Droplets, Loader2, RefreshCw, ExternalLink } from "lucide-react";

export default function PoolsList({ pools, loading, onRefresh }) {
  if (loading && pools.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mb-3" />
        <p>Loading pools...</p>
      </div>
    );
  }

  if (pools.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <Droplets className="w-12 h-12 mb-3 opacity-40" />
        <p className="text-lg font-medium mb-1">No pools found</p>
        <p className="text-sm">Create your first pool by adding liquidity</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Liquidity Pools</h2>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-2 rounded-xl hover:bg-slate-800 disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="space-y-3">
        {pools.map((pool, idx) => (
          <div
            key={pool.address || idx}
            className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 hover:bg-slate-800/50 transition"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-100">
                  {pool.token0.symbol} / {pool.token1.symbol}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {pool.token0.name} • {pool.token1.name}
                </p>
              </div>
              <a
                href={`https://sepolia.etherscan.io/address/${pool.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-400 mb-1">
                  {pool.token0.symbol} Reserve
                </div>
                <div className="text-sm font-medium text-slate-200">
                  {pool.reserve0.toLocaleString(undefined, {
                    maximumFractionDigits: 6,
                  })}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">
                  {pool.token1.symbol} Reserve
                </div>
                <div className="text-sm font-medium text-slate-200">
                  {pool.reserve1.toLocaleString(undefined, {
                    maximumFractionDigits: 6,
                  })}
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-800/60">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Total Liquidity (LP)</span>
                <span className="font-medium text-slate-300">
                  {pool.totalSupply.toLocaleString(undefined, {
                    maximumFractionDigits: 6,
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-slate-400">Price</span>
                <span className="font-medium text-slate-300">
                  1 {pool.token0.symbol} ={" "}
                  {(pool.reserve1 / pool.reserve0).toFixed(6)}{" "}
                  {pool.token1.symbol}
                </span>
              </div>
            </div>

            <div className="mt-3 text-xs text-slate-500 font-mono truncate">
              {pool.address}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
