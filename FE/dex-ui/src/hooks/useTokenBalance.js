import { useState, useEffect, useCallback } from "react";
import { formatUnits } from "ethers";
import { getErc20 } from "../services/dexApi.js";

/**
 * Hook để lấy balance của một token
 * @param {object} provider
 * @param {string} tokenAddress
 * @param {string} userAddress
 * @param {number} decimals
 * @returns {string} formatted balance
 */
export default function useTokenBalance(provider, tokenAddress, userAddress, decimals = 18) {
  const [balance, setBalance] = useState("0.00");
  const [loading, setLoading] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!provider || !tokenAddress || !userAddress) {
      setBalance("0.00");
      return;
    }

    // Validate tokenAddress format
    if (typeof tokenAddress !== 'string' || tokenAddress.length !== 42) {
      setBalance("0.00");
      return;
    }

    setLoading(true);
    try {
      const token = getErc20(tokenAddress, provider);
      const bal = await token.balanceOf(userAddress);
      const formatted = formatUnits(bal, decimals);
      // Làm tròn đến 6 chữ số thập phân
      const num = parseFloat(formatted);
      setBalance(num < 0.000001 ? "0.00" : num.toFixed(6));
    } catch (err) {
      console.error("Error fetching balance:", err);
      setBalance("0.00");
    } finally {
      setLoading(false);
    }
  }, [provider, tokenAddress, userAddress, decimals]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return { balance, loading, refetch: fetchBalance };
}
