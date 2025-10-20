import { useEffect, useState, useCallback } from "react";
import { getFactory } from "../services/dexApi.js";
import { Contract, formatUnits } from "ethers";
import { getPublicProvider } from "../services/eth.js";

const PAIR_ABI = [
  "function token0() external view returns (address)",
  "function token1() external view returns (address)",
  "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function totalSupply() external view returns (uint256)",
];

const ERC20_ABI = [
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)",
  "function name() external view returns (string)",
];

export default function usePools(provider) {
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchPools = useCallback(async () => {
    setLoading(true);
    setError("");
    
    try {
      // Use wallet provider if connected, otherwise use public RPC
      const readProvider = provider || getPublicProvider();
      const factory = getFactory(readProvider);
      
      // Get total number of pairs
      const allPairsLength = await factory.allPairsLength();
      const pairsCount = Number(allPairsLength);
      
      console.log(`🔍 Found ${pairsCount} pools in factory`);
      
      const poolsData = [];
      
      // Fetch each pair
      for (let i = 0; i < pairsCount; i++) {
        try {
          const pairAddress = await factory.allPairs(i);
          const pair = new Contract(pairAddress, PAIR_ABI, readProvider);
          
          // Get tokens
          const token0Address = await pair.token0();
          const token1Address = await pair.token1();
          
          // Get token info
          const token0Contract = new Contract(token0Address, ERC20_ABI, readProvider);
          const token1Contract = new Contract(token1Address, ERC20_ABI, readProvider);
          
          const [symbol0, symbol1, decimals0, decimals1, name0, name1] = await Promise.all([
            token0Contract.symbol(),
            token1Contract.symbol(),
            token0Contract.decimals(),
            token1Contract.decimals(),
            token0Contract.name(),
            token1Contract.name(),
          ]);
          
          // Get reserves
          const reserves = await pair.getReserves();
          const totalSupply = await pair.totalSupply();
          
          const reserve0 = formatUnits(reserves.reserve0, decimals0);
          const reserve1 = formatUnits(reserves.reserve1, decimals1);
          const supply = formatUnits(totalSupply, 18); // LP tokens always 18 decimals
          
          poolsData.push({
            address: pairAddress,
            token0: {
              address: token0Address,
              symbol: symbol0,
              decimals: decimals0,
              name: name0,
            },
            token1: {
              address: token1Address,
              symbol: symbol1,
              decimals: decimals1,
              name: name1,
            },
            reserve0: parseFloat(reserve0),
            reserve1: parseFloat(reserve1),
            totalSupply: parseFloat(supply),
          });
          
          console.log(`  ✅ Pool ${i + 1}: ${symbol0}/${symbol1}`);
        } catch (err) {
          console.error(`  ❌ Failed to load pool ${i}:`, err);
        }
      }
      
      setPools(poolsData);
      console.log(`🎉 Loaded ${poolsData.length} pools`);
    } catch (err) {
      console.error("❌ Error loading pools:", err);
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [provider]);

  useEffect(() => {
    fetchPools();
  }, [fetchPools]);

  return {
    pools,
    loading,
    error,
    refetch: fetchPools,
  };
}
