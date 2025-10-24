import React, { useMemo, useState, useEffect } from "react";
import {
  ChevronDown,
  Settings,
  Repeat,
  Info,
  X,
  Search,
  Wallet,
  AlertCircle,
  Loader2,
  Coins,
  Droplets,
} from "lucide-react";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";
import useWallet from "./hooks/useWallet.js";
import useTokens from "./hooks/useTokens.js";
import useSwap from "./hooks/useSwap.js";
import useTokenBalance from "./hooks/useTokenBalance.js";
import usePools from "./hooks/usePools.js";
import { formatUnits, parseUnits } from "ethers";
import TokensList from "./components/TokensList.jsx";
import CreateToken from "./components/CreateToken.jsx";
import AddLiquidity from "./components/AddLiquidity.jsx";
import RemoveLiquidity from "./components/RemoveLiquidity.jsx";
import PoolsList from "./components/PoolsList.jsx";
import UniverseBackground from "./components/UniverseBackground.tsx";

function TokenBadge({ token, onClick }) {
  if (!token)
    return (
      <button
        onClick={onClick}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-700 transition text-slate-200"
      >
        <span>Select token</span>
        <ChevronDown className="w-4 h-4" />
      </button>
    );
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-700 transition text-slate-100"
    >
      <span className="font-medium">{token.symbol}</span>
      <ChevronDown className="w-4 h-4 opacity-80" />
    </button>
  );
}

function BalanceDisplay({ balance, loading }) {
  if (loading) return <div className="text-xs text-slate-400">Loading...</div>;
  return <div className="text-xs text-slate-400">Balance: {balance}</div>;
}

function NumberInput({ value, onChange, placeholder }) {
  return (
    <input
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
      placeholder={placeholder}
      className="w-full bg-transparent outline-none text-2xl md:text-3xl font-semibold text-white placeholder:text-slate-500"
    />
  );
}

function Row({ children }) {
  return (
    <div className="flex items-center justify-between w-full">{children}</div>
  );
}

function StatLine({ label, value, icon }) {
  const Icon = icon;
  return (
    <div className="flex items-center justify-between text-sm text-slate-300">
      <div className="inline-flex items-center gap-1.5">
        {Icon ? <Icon className="w-4 h-4 opacity-80" /> : null}
        <span className="opacity-80">{label}</span>
      </div>
      <span className="font-medium text-slate-100">{value}</span>
    </div>
  );
}

function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl">
          <div className="flex items-center justify-between p-4 border-b border-slate-800">
            <h3 className="text-slate-100 font-semibold">Settings</h3>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5 text-slate-300" />
            </button>
          </div>
          <div className="p-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

function TokenModal({ open, onClose, onSelect, tokens, onImportToken }) {
  const [query, setQuery] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = tokens && tokens.length > 0 ? tokens : [];
    if (!q) return list;
    return list.filter(
      (t) =>
        (t.symbol && t.symbol.toLowerCase().includes(q)) ||
        (t.name && t.name.toLowerCase().includes(q)) ||
        (t.address && t.address.toLowerCase().includes(q))
    );
  }, [query, tokens]);

  // Check if query is a valid address (0x... 42 chars)
  const isValidAddress = query.trim().match(/^0x[a-fA-F0-9]{40}$/);
  const alreadyInList = tokens.find(
    (t) => t.address && t.address.toLowerCase() === query.trim().toLowerCase()
  );

  const handleImport = async () => {
    if (!isValidAddress || !onImportToken) return;

    setImporting(true);
    setImportError("");
    try {
      const imported = await onImportToken(query.trim());
      onSelect(imported);
      onClose();
      setQuery("");
    } catch (err) {
      setImportError(err?.message || "Failed to import token");
    } finally {
      setImporting(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden">
          <div className="flex items-center gap-2 p-3 border-b border-slate-800">
            <div className="px-2 text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or paste address"
              className="flex-1 bg-transparent outline-none text-slate-100 placeholder:text-slate-500"
            />
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5 text-slate-300" />
            </button>
          </div>

          {/* Import token button */}
          {isValidAddress && !alreadyInList && (
            <div className="p-3 border-b border-slate-800 bg-slate-800/40">
              <button
                onClick={handleImport}
                disabled={importing}
                className="w-full p-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 flex items-center justify-center gap-2 font-medium"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Coins className="w-4 h-4" />
                    Import Token
                  </>
                )}
              </button>
              {importError && (
                <div className="mt-2 text-xs text-red-400">{importError}</div>
              )}
            </div>
          )}

          <div className="max-h-96 overflow-y-auto p-2">
            {filtered.map((t, idx) => (
              <button
                key={t.address || t.symbol || idx}
                onClick={() => {
                  onSelect(t);
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-800/70 text-left"
              >
                <div className="flex-1">
                  <div className="text-slate-100 font-medium">{t.symbol}</div>
                  <div className="text-xs text-slate-400">
                    {t.name}
                    {t.address && (
                      <span className="ml-2 opacity-60">
                        {t.address.slice(0, 6)}...{t.address.slice(-4)}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">{t.name}</div>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="text-center text-slate-400 py-6">No results</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SwapApp() {
  const {
    address,
    chainId,
    isOnSepolia,
    connect,
    disconnect,
    connecting,
    provider,
    signerPromise,
  } = useWallet();

  // Active tab
  const [activeTab, setActiveTab] = useState("swap"); // "swap" | "liquidity" | "pools" | "tokens"
  const [liquidityMode, setLiquidityMode] = useState("add"); // "add" | "remove"
  const [createTokenOpen, setCreateTokenOpen] = useState(false);

  // Load tokens from factory
  const {
    tokens: availableTokens,
    loading: tokensLoading,
    importToken,
  } = useTokens(provider);

  // Load pools
  const {
    pools,
    loading: poolsLoading,
    refetch: refetchPools,
  } = usePools(provider);

  // Token selection
  const [fromToken, setFromToken] = useState(null);
  const [toToken, setToToken] = useState(null);

  // Auto-select first 2 tokens when loaded
  useEffect(() => {
    if (availableTokens.length >= 2 && !fromToken && !toToken) {
      setFromToken(availableTokens[0]);
      setToToken(availableTokens[1]);
    }
  }, [availableTokens, fromToken, toToken]);

  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [slippage, setSlippage] = useState(0.5); // %
  const [deadline, setDeadline] = useState(20); // minutes
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pickSide, setPickSide] = useState(null); // "from" | "to"
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);

  // Swap logic
  const {
    getQuote,
    executeSwap,
    swapping,
    approving,
    error: swapError,
  } = useSwap(provider, signerPromise, address);

  // Balances
  const {
    balance: fromBalance,
    loading: fromBalanceLoading,
    refetch: refetchFromBalance,
  } = useTokenBalance(
    provider,
    fromToken?.address,
    address,
    fromToken?.decimals
  );

  const {
    balance: toBalance,
    loading: toBalanceLoading,
    refetch: refetchToBalance,
  } = useTokenBalance(provider, toToken?.address, address, toToken?.decimals);

  // Store quote info for price impact calculation
  const [quoteInfo, setQuoteInfo] = useState(null);

  // Quote calculation
  useEffect(() => {
    if (!fromAmount || !fromToken || !toToken || fromAmount === "0") {
      setToAmount("");
      setQuoteInfo(null);
      return;
    }

    let cancelled = false;
    const debounce = setTimeout(async () => {
      setQuoteLoading(true);
      try {
        const amountInRaw = parseUnits(fromAmount, fromToken.decimals);
        const quote = await getQuote(
          amountInRaw.toString(),
          fromToken,
          toToken
        );
        if (!cancelled) {
          const formatted = formatUnits(quote.amountOut, toToken.decimals);
          setToAmount(parseFloat(formatted).toFixed(6));
          // Store quote info for price impact
          setQuoteInfo({
            amountIn: amountInRaw.toString(),
            amountOut: quote.amountOut,
            reserveIn: quote.reserveIn,
            reserveOut: quote.reserveOut,
          });
        }
      } catch {
        if (!cancelled) {
          setToAmount("0");
          setQuoteInfo(null);
        }
      } finally {
        if (!cancelled) setQuoteLoading(false);
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(debounce);
    };
  }, [fromAmount, fromToken, toToken, getQuote]);

  const handleFlip = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  const onAmountChange = (val) => {
    setFromAmount(val);
  };

  const minReceived = useMemo(() => {
    const out = Number(toAmount || 0);
    return out - (out * slippage) / 100;
  }, [toAmount, slippage]);

  const priceImpact = useMemo(() => {
    if (!quoteInfo || !fromToken || !toToken) return null;

    try {
      const { amountIn, amountOut, reserveIn, reserveOut } = quoteInfo;

      // Price before swap (market price)
      const priceBefore =
        Number(formatUnits(reserveOut, toToken.decimals)) /
        Number(formatUnits(reserveIn, fromToken.decimals));

      // Price after swap (execution price)
      const priceAfter =
        Number(formatUnits(amountOut, toToken.decimals)) /
        Number(formatUnits(amountIn, fromToken.decimals));

      // Price impact = ((priceBefore - priceAfter) / priceBefore) * 100
      const impact = ((priceBefore - priceAfter) / priceBefore) * 100;

      if (impact < 0.01) return "<0.01%";
      return `${impact.toFixed(2)}%`;
    } catch {
      return null;
    }
  }, [quoteInfo, fromToken, toToken]);

  const canSwap =
    fromAmount &&
    Number(fromAmount) > 0 &&
    fromToken &&
    toToken &&
    fromToken.address !== toToken.address &&
    !swapping &&
    !approving &&
    !quoteLoading &&
    address &&
    isOnSepolia;

  const shortAddr = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : "";

  const handleSwap = async () => {
    if (!canSwap) return;

    const toastId = toast.loading(
      `Swapping ${fromAmount} ${fromToken.symbol} for ${toToken.symbol}...`
    );

    try {
      // Calculate deadline timestamp
      const deadlineTimestamp = Math.floor(Date.now() / 1000) + deadline * 60;

      toast.loading("Waiting for approval...", { id: toastId });

      await executeSwap({
        amountIn: fromAmount,
        amountOutMin: minReceived.toString(),
        tokenIn: fromToken,
        tokenOut: toToken,
        deadline: deadlineTimestamp,
      });

      toast.success(
        `Successfully swapped ${fromAmount} ${fromToken.symbol} for ${toToken.symbol}!`,
        {
          id: toastId,
          duration: 6000,
          icon: "🎉",
        }
      );

      // Refresh balances after successful swap
      setTimeout(() => {
        refetchFromBalance();
        refetchToBalance();
      }, 2000);

      // Reset amounts
      setFromAmount("");
      setToAmount("");
    } catch (err) {
      // Swap failed, show error
      const errorMsg = err?.message || "Swap failed";
      toast.error(errorMsg, { id: toastId, duration: 5000 });
    }
  };

  // Calculate rate from amounts
  const rate = useMemo(() => {
    if (!fromAmount || !toAmount || Number(fromAmount) === 0) return 0;
    return Number(toAmount) / Number(fromAmount);
  }, [fromAmount, toAmount]);

  return (
    <>
      {/* Universe Background - ở dưới cùng */}
      <UniverseBackground />

      <div className="min-h-screen text-slate-100 relative z-10">
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#1e293b",
              color: "#f1f5f9",
              border: "1px solid #334155",
              borderRadius: "12px",
              padding: "12px 16px",
            },
            success: {
              iconTheme: {
                primary: "#10b981",
                secondary: "#f1f5f9",
              },
            },
            error: {
              iconTheme: {
                primary: "#ef4444",
                secondary: "#f1f5f9",
              },
            },
            loading: {
              iconTheme: {
                primary: "#6366f1",
                secondary: "#f1f5f9",
              },
            },
          }}
        />

        {/* Header */}
        <header className="sticky top-0 z-40 backdrop-blur-md supports-[backdrop-filter]:bg-slate-900/20 bg-slate-900/20 border-b border-slate-700/30">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                width={"15%"}
                src="../public/walleticon-removebg-preview.png"
              />
              <span className="font-semibold tracking-tight">LVSwap</span>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => setActiveTab("swap")}
                className={`px-3 py-1.5 rounded-xl text-sm transition ${
                  activeTab === "swap"
                    ? "bg-slate-800/70 text-slate-100"
                    : "hover:bg-slate-800 text-slate-400"
                }`}
              >
                Swap
              </button>
              <button
                onClick={() => setActiveTab("liquidity")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm transition ${
                  activeTab === "liquidity"
                    ? "bg-slate-800/70 text-slate-100"
                    : "hover:bg-slate-800 text-slate-400"
                }`}
              >
                <Droplets className="w-4 h-4" />
                Liquidity
              </button>
              <button
                onClick={() => setActiveTab("pools")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm transition ${
                  activeTab === "pools"
                    ? "bg-slate-800/70 text-slate-100"
                    : "hover:bg-slate-800 text-slate-400"
                }`}
              >
                <Droplets className="w-4 h-4" />
                Pools
              </button>
              <button
                onClick={() => setActiveTab("tokens")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm transition ${
                  activeTab === "tokens"
                    ? "bg-slate-800/70 text-slate-100"
                    : "hover:bg-slate-800 text-slate-400"
                }`}
              >
                <Coins className="w-4 h-4" />
                Tokens
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSettingsOpen(true)}
                className="p-2 rounded-xl hover:bg-slate-800"
              >
                <Settings className="w-5 h-5" />
              </button>
              {address ? (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800">
                  <span className="text-xs text-slate-400">
                    {isOnSepolia ? "Sepolia" : `Chain ${chainId}`}
                  </span>
                  <span className="text-sm font-medium">{shortAddr}</span>
                  <button
                    onClick={disconnect}
                    className="text-xs text-slate-400 hover:text-slate-200"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={connect}
                  disabled={connecting}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60"
                >
                  <Wallet className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {connecting ? "Connecting…" : "Connect"}
                  </span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="max-w-6xl mx-auto px-4 py-10">
          {activeTab === "swap" ? (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr,360px] gap-8">
              {/* Swap Card */}
              <div className="mx-auto w-full max-w-xl">
                <div className="rounded-3xl border border-white-400/30 backdrop-blur-md supports-[backdrop-filter]:bg-slate-900/20 bg-slate-900/20 l shadow-2xl p-4 md:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Swap</h2>
                    <div className="text-xs text-slate-400">
                      Network:{" "}
                      <span className="text-slate-200">
                        {isOnSepolia ? "Sepolia" : "Unknown"}
                      </span>
                    </div>
                  </div>

                  {/* From */}
                  <div className="rounded-2xl p-4 bg-slate-800/60 border border-slate-800">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-[160px]">
                        <TokenBadge
                          token={fromToken}
                          onClick={() => {
                            setPickSide("from");
                            setTokenModalOpen(true);
                          }}
                        />
                        <BalanceDisplay
                          balance={fromBalance}
                          loading={fromBalanceLoading}
                        />
                      </div>
                      <div className="flex-1 text-right">
                        <NumberInput
                          value={fromAmount}
                          onChange={onAmountChange}
                          placeholder="0.0"
                        />
                        {quoteLoading && (
                          <div className="text-xs text-slate-400 mt-1 flex items-center justify-end gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Calculating...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Flip */}
                  <div className="flex justify-center -my-2">
                    <button
                      onClick={handleFlip}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 -translate-y-1"
                    >
                      <Repeat className="w-5 h-5" />
                    </button>
                  </div>

                  {/* To */}
                  <div className="rounded-2xl p-4 bg-slate-800/60 border border-slate-800">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-[160px]">
                        <TokenBadge
                          token={toToken}
                          onClick={() => {
                            setPickSide("to");
                            setTokenModalOpen(true);
                          }}
                        />
                        <BalanceDisplay
                          balance={toBalance}
                          loading={toBalanceLoading}
                        />
                      </div>
                      <div className="flex-1 text-right">
                        <NumberInput
                          value={toAmount}
                          onChange={() => {}}
                          placeholder="0.0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="mt-4 space-y-2">
                    {fromToken && toToken && rate > 0 && (
                      <StatLine
                        label={`Rate`}
                        value={`1 ${fromToken.symbol} = ${rate.toFixed(6)} ${
                          toToken.symbol
                        }`}
                      />
                    )}
                    {toToken && minReceived > 0 && (
                      <StatLine
                        label={`Min received (${slippage}% slippage)`}
                        value={`${minReceived.toFixed(6)} ${toToken.symbol}`}
                        icon={Info}
                      />
                    )}
                    {priceImpact && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400 opacity-80">
                          Price impact
                        </span>
                        <span
                          className={`font-medium ${
                            parseFloat(priceImpact) > 5
                              ? "text-red-400"
                              : parseFloat(priceImpact) > 3
                              ? "text-yellow-400"
                              : "text-slate-300"
                          }`}
                        >
                          {priceImpact}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Price Impact Warning */}
                  {priceImpact && parseFloat(priceImpact) > 3 && (
                    <div className="mt-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5" />
                      <div className="text-sm text-yellow-400">
                        High price impact! You will receive significantly less
                        than expected.
                      </div>
                    </div>
                  )}

                  {/* Error display */}
                  {swapError && (
                    <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
                      <div className="text-sm text-red-300">{swapError}</div>
                    </div>
                  )}

                  {/* CTA */}
                  <div className="mt-5">
                    {!address ? (
                      <button
                        onClick={connect}
                        disabled={connecting}
                        className="w-full py-3 rounded-2xl font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60"
                      >
                        {connecting ? "Connecting..." : "Connect Wallet"}
                      </button>
                    ) : !isOnSepolia ? (
                      <button
                        disabled
                        className="w-full py-3 rounded-2xl font-semibold bg-orange-600 text-white cursor-not-allowed"
                      >
                        Switch to Sepolia Network
                      </button>
                    ) : (
                      <button
                        onClick={handleSwap}
                        disabled={!canSwap}
                        className={`w-full py-3 rounded-2xl font-semibold transition border border-transparent ${
                          canSwap
                            ? "bg-indigo-600 hover:bg-indigo-500"
                            : "bg-slate-700 text-slate-400 cursor-not-allowed border-slate-700"
                        }`}
                      >
                        {swapping || approving ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {approving ? "Approving..." : "Swapping..."}
                          </span>
                        ) : canSwap && fromToken && toToken ? (
                          `Swap ${fromToken.symbol} → ${toToken.symbol}`
                        ) : !fromToken || !toToken ? (
                          "Select tokens"
                        ) : !fromAmount || Number(fromAmount) === 0 ? (
                          "Enter an amount"
                        ) : (
                          "Enter an amount"
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Right column: Market info */}
              <aside className="hidden lg:block">
                <div className="rounded-3xl border border-gray-400/20 backdrop-blur-md supports-[backdrop-filter]:bg-slate-900/20 bg-slate-900/20    p-5 sticky top-24">
                  <h3 className="font-semibold mb-4">Market</h3>
                  {fromToken && toToken ? (
                    <div className="space-y-3 text-sm">
                      <Row>
                        <span className="text-slate-400">Pair</span>
                        <span>
                          {fromToken.symbol}/{toToken.symbol}
                        </span>
                      </Row>
                      {rate > 0 && (
                        <Row>
                          <span className="text-slate-400">Rate</span>
                          <span>
                            {rate.toFixed(6)} {toToken.symbol}
                          </span>
                        </Row>
                      )}
                      <Row>
                        <span className="text-slate-400">Network</span>
                        <span>{isOnSepolia ? "Sepolia" : "Unknown"}</span>
                      </Row>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-400">
                      Select tokens to view market info
                    </div>
                  )}
                </div>
              </aside>
            </div>
          ) : activeTab === "liquidity" ? (
            /* Liquidity Tab */
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="flex gap-3 mb-4">
                <button
                  onClick={() => setLiquidityMode("add")}
                  className={`flex-1 py-2.5 rounded-xl font-medium transition ${
                    liquidityMode === "add"
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  Add Liquidity
                </button>
                <button
                  onClick={() => setLiquidityMode("remove")}
                  className={`flex-1 py-2.5 rounded-xl font-medium transition ${
                    liquidityMode === "remove"
                      ? "bg-red-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  Remove Liquidity
                </button>
              </div>

              <div className="rounded-3xl border border-gray-400/20 bg-white/10 backdrop-blur-xl shadow-2xl p-6">
                {liquidityMode === "add" ? (
                  <AddLiquidity
                    pools={pools}
                    tokens={availableTokens}
                    provider={provider}
                    signerPromise={signerPromise}
                    address={address}
                    onSuccess={() => {
                      refetchPools();
                    }}
                  />
                ) : (
                  <RemoveLiquidity
                    pools={pools}
                    provider={provider}
                    signerPromise={signerPromise}
                    address={address}
                    onSuccess={() => {
                      // Refresh balances and pools
                      refetchPools();
                    }}
                  />
                )}
              </div>
            </div>
          ) : activeTab === "pools" ? (
            /* Pools Tab */
            <div className="max-w-4xl mx-auto">
              <div className="rounded-3xl border border-gray-400/20 bg-white/10 backdrop-blur-xl shadow-2xl p-6">
                <PoolsList
                  pools={pools}
                  loading={poolsLoading}
                  onRefresh={refetchPools}
                />
              </div>
            </div>
          ) : (
            /* Tokens Tab */
            <div className="max-w-4xl mx-auto">
              <TokensList
                tokens={availableTokens}
                loading={tokensLoading}
                onCreateToken={() => setCreateTokenOpen(true)}
                onImportToken={importToken}
              />
            </div>
          )}
        </main>

        {/* Modals */}
        {/* Settings Modal */}
        <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)}>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-slate-300 mb-2">
                Slippage tolerance
              </div>
              <div className="flex items-center gap-2">
                {[0.1, 0.5, 1].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSlippage(s)}
                    className={`px-3 py-1.5 rounded-xl border ${
                      slippage === s
                        ? "bg-indigo-600 border-indigo-500"
                        : "bg-slate-800 border-slate-700 hover:bg-slate-700"
                    }`}
                  >
                    {s}%
                  </button>
                ))}
                <div className="flex items-center gap-2 ml-2 px-2 py-1.5 rounded-xl bg-slate-800 border border-slate-700">
                  <input
                    value={slippage}
                    onChange={(e) => setSlippage(Number(e.target.value || 0))}
                    className="w-16 bg-transparent outline-none text-slate-100 text-sm"
                  />
                  <span className="text-slate-400 text-sm">%</span>
                </div>
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-300 mb-2">
                Transaction deadline
              </div>
              <div className="flex items-center gap-2">
                {[5, 10, 20, 30].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDeadline(d)}
                    className={`px-3 py-1.5 rounded-xl border text-sm ${
                      deadline === d
                        ? "bg-indigo-600 border-indigo-500"
                        : "bg-slate-800 border-slate-700 hover:bg-slate-700"
                    }`}
                  >
                    {d}m
                  </button>
                ))}
                <div className="flex items-center gap-2 ml-2 px-2 py-1.5 rounded-xl bg-slate-800 border border-slate-700">
                  <input
                    value={deadline}
                    onChange={(e) => setDeadline(Number(e.target.value || 20))}
                    className="w-12 bg-transparent outline-none text-slate-100 text-sm"
                  />
                  <span className="text-slate-400 text-sm">min</span>
                </div>
              </div>
            </div>
          </div>
        </Modal>

        {/* Token picker */}
        <TokenModal
          open={tokenModalOpen}
          onClose={() => setTokenModalOpen(false)}
          onSelect={(t) =>
            pickSide === "from" ? setFromToken(t) : setToToken(t)
          }
          tokens={availableTokens}
          onImportToken={importToken}
        />

        {/* Create Token Modal */}
        <CreateToken
          open={createTokenOpen}
          onClose={() => setCreateTokenOpen(false)}
          onSuccess={async () => {
            // Reload tokens after creating new one
            window.location.reload();
          }}
          signer={signerPromise}
        />
      </div>
    </>
  );
}
