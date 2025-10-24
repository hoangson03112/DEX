import { useEffect, useState, useMemo, useCallback } from "react";
import { getFactory } from "../services/dexApi.js";
import {
  fetchTokenInfo,
  listAllTokensFromFactory,
} from "../services/dexApi.js";
import { getPublicProvider } from "../services/eth.js";

const STORAGE_KEY = "uniswap_imported_tokens";

export default function useTokens(provider) {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load custom tokens from localStorage
  const loadCustomTokens = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (err) {
      console.error("Failed to load custom tokens:", err);
    }
    return [];
  }, []);

  // Save custom token to localStorage
  const importToken = useCallback(
    async (address) => {
      if (!provider) throw new Error("Provider not connected");

      // Fetch token info
      const tokenInfo = await fetchTokenInfo(address, provider);

      // Load existing custom tokens
      const customTokens = loadCustomTokens();

      // Check if already imported
      const exists = customTokens.find(
        (t) => t.address.toLowerCase() === address.toLowerCase()
      );
      if (exists) {
        return tokenInfo; // Already imported
      }

      // Add to custom tokens
      customTokens.push(tokenInfo);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customTokens));

      // Reload tokens
      setTokens((prev) => {
        const newTokens = [...prev];
        const alreadyExists = newTokens.find(
          (t) => t.address.toLowerCase() === address.toLowerCase()
        );
        if (!alreadyExists) {
          newTokens.push(tokenInfo);
        }
        return newTokens;
      });

      return tokenInfo;
    },
    [provider, loadCustomTokens]
  );

  // Remove custom token
  const removeToken = useCallback(
    (address) => {
      const customTokens = loadCustomTokens();
      const filtered = customTokens.filter(
        (t) => t.address.toLowerCase() !== address.toLowerCase()
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

      setTokens((prev) =>
        prev.filter((t) => t.address.toLowerCase() !== address.toLowerCase())
      );
    },
    [loadCustomTokens]
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError("");
      try {
        const readProvider = provider || getPublicProvider();

        const allTokens = [];

        try {
          const factory = getFactory(readProvider);
          const tokenAddresses = await listAllTokensFromFactory(
            factory,
            readProvider
          );

          for (const addr of tokenAddresses) {
            try {
              const exists = allTokens.find(
                (t) => t.address.toLowerCase() === addr.toLowerCase()
              );
              if (!exists) {
                const info = await fetchTokenInfo(addr, readProvider);
                allTokens.push(info);
              }
            } catch (err) {
              console.error(`  ❌ Failed to load token ${addr}:`, err);
            }
          }
        } catch (err) {
          console.warn("⚠️ Failed to load factory tokens:", err);
        }

        const customTokens = loadCustomTokens();
        let customAdded = 0;
        for (const custom of customTokens) {
          const exists = allTokens.find(
            (t) => t.address.toLowerCase() === custom.address.toLowerCase()
          );
          if (!exists) {
            allTokens.push(custom);
            customAdded++;
          }
        }
        if (customAdded > 0) {
          console.log(`✅ Added ${customAdded} custom imported tokens`);
        }

        if (!cancelled) {
          setTokens(allTokens);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("❌ Error loading tokens:", err);
          setError(err?.message || String(err));

          // Fallback: only load custom tokens
          const customTokens = loadCustomTokens();
          if (!cancelled) setTokens(customTokens);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [provider, loadCustomTokens]);

  const tokensMap = useMemo(() => {
    const map = {};
    for (const t of tokens) {
      if (t && t.address) {
        map[t.address.toLowerCase()] = t;
      }
    }
    return map;
  }, [tokens]);

  return {
    tokens,
    tokensMap,
    loading,
    error,
    importToken,
    removeToken,
  };
}
