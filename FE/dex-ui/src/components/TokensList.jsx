import React, { useState } from "react";
import {
  Copy,
  ExternalLink,
  Plus,
  Loader2,
  Search,
  Coins,
  RefreshCw,
} from "lucide-react";
import { parseUnits } from "ethers";
import { getErc20 } from "../services/dexApi.js";
import useWallet from "../hooks/useWallet.js";
import useTokenBalance from "../hooks/useTokenBalance.js";
import toast from "react-hot-toast";

/**
 * Component hiển thị danh sách tokens với pools
 */
export default function TokensList({
  tokens,
  loading,
  onCreateToken,
  onImportToken,
}) {
  const { address, provider, signerPromise } = useWallet();
  const [copiedAddress, setCopiedAddress] = useState(null);
  const [importAddress, setImportAddress] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [mintingToken, setMintingToken] = useState(null);
  const [mintAmounts, setMintAmounts] = useState({});
  const [mintError, setMintError] = useState("");

  const handleCopy = (address) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    toast.success("Address copied to clipboard!", {
      icon: "📋",
    });
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const openEtherscan = (address) => {
    window.open(`https://sepolia.etherscan.io/address/${address}`, "_blank");
  };

  const handleImport = async () => {
    if (!importAddress.trim()) return;

    // Validate address format
    if (!importAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      setImportError("Invalid address format");
      toast.error("Invalid address format");
      return;
    }

    // Check if already exists
    const exists = tokens.find(
      (t) =>
        t.address && t.address.toLowerCase() === importAddress.toLowerCase()
    );
    if (exists) {
      setImportError("Token already in list");
      toast.error(`${exists.symbol} is already imported!`);
      return;
    }

    setImporting(true);
    setImportError("");

    const toastId = toast.loading("Importing token...");

    try {
      console.log("🔍 Importing token from address:", importAddress);
      const imported = await onImportToken(importAddress.trim());
      console.log("✅ Token imported successfully:", imported);
      
      setImportAddress("");
      setImportError("");
      toast.success(
        `Successfully imported ${imported.symbol} (${imported.name})! Check your balance below.`,
        { id: toastId, duration: 6000 }
      );
    } catch (err) {
      console.error("❌ Import error:", err);
      const errorMsg = err?.message || "Failed to import token";
      setImportError(errorMsg);
      
      // Better error messages
      if (errorMsg.includes("invalid address")) {
        toast.error("Invalid token address. Make sure it's deployed on Sepolia.", { id: toastId });
      } else if (errorMsg.includes("call revert")) {
        toast.error("Token not found. Did you deploy it on Sepolia testnet?", { id: toastId });
      } else {
        toast.error(errorMsg, { id: toastId });
      }
    } finally {
      setImporting(false);
    }
  };

  const handleMint = async (token) => {
    if (!address) {
      const errorMsg = "Please connect wallet first";
      setMintError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    const mintAmount = mintAmounts[token.address] || "";

    if (!mintAmount || Number(mintAmount) <= 0) {
      const errorMsg = "Please enter a valid amount";
      setMintError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    setMintingToken(token.address);
    setMintError("");

    const toastId = toast.loading(`Minting ${mintAmount} ${token.symbol}...`);

    try {
      const signer = await signerPromise;
      const tokenContract = getErc20(token.address, signer);

      // Parse amount with decimals
      const amountWithDecimals = parseUnits(mintAmount, token.decimals);

      // Call mint function
      toast.loading("Waiting for confirmation...", { id: toastId });
      const tx = await tokenContract.mint(address, amountWithDecimals);

      toast.loading("Transaction submitted, waiting for confirmation...", {
        id: toastId,
      });
      await tx.wait();

      // Success
      toast.success(`Successfully minted ${mintAmount} ${token.symbol}!`, {
        id: toastId,
        duration: 6000,
        icon: "🎉",
      });

      // Clear form for this specific token
      setMintAmounts((prev) => ({ ...prev, [token.address]: "" }));
      setMintingToken(null);

      // Trigger a small delay then reload to show updated balance
      setTimeout(() => {
        toast.loading("Refreshing balances...");
        window.location.reload();
      }, 1500);
    } catch (err) {
      console.error("Mint error:", err);
      const errorMsg = err?.message || "Failed to mint tokens";
      setMintError(errorMsg);
      toast.error(errorMsg, { id: toastId, duration: 5000 });
      setMintingToken(null);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Tokens</h2>
        <button
          onClick={onCreateToken}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-medium transition"
        >
          <Plus className="w-4 h-4" />
          Create Token
        </button>
      </div>

      {/* Import Token Section */}
      <div className="mb-6 p-4 rounded-xl bg-slate-800/50 border border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium text-slate-200">
            Import Token
          </div>
          <div className="text-xs text-slate-400">
            Deploy token ở Remix? Paste address vào đây!
          </div>
        </div>
        <div className="text-xs text-slate-500 mb-3">
          💡 Sau khi deploy token mới từ Remix IDE, paste địa chỉ contract vào đây để xem balance và mint tokens.
        </div>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={importAddress}
              onChange={(e) => {
                setImportAddress(e.target.value);
                setImportError("");
              }}
              placeholder="Paste token address (0x...)"
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder:text-slate-500 outline-none focus:border-indigo-500 transition"
            />
            {importAddress && (
              <button
                onClick={() => {
                  setImportAddress("");
                  setImportError("");
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                ×
              </button>
            )}
          </div>
          <button
            onClick={handleImport}
            disabled={!importAddress.trim() || importing}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition inline-flex items-center gap-2"
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Import
              </>
            )}
          </button>
        </div>
        {importError && (
          <div className="mt-2 text-xs text-red-400">{importError}</div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : tokens.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <div className="text-lg mb-2">No tokens found</div>
          <div className="text-sm">Create your first token to get started</div>
        </div>
      ) : (
        <div className="space-y-2">
          {tokens.map((token, idx) => {
            // Use hook to get real-time balance
            const TokenRow = () => {
              const {
                balance,
                loading: balanceLoading,
                refetch,
              } = useTokenBalance(
                provider,
                token.address,
                address,
                token.decimals
              );

              return (
                <div
                  key={token.address || idx}
                  className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-slate-600 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="text-lg font-semibold text-slate-100">
                          {token.symbol}
                        </div>
                        <div className="px-2 py-0.5 rounded text-xs bg-slate-700 text-slate-300">
                          {token.decimals} decimals
                        </div>
                      </div>
                      <div className="text-sm text-slate-400 mt-1">
                        {token.name}
                      </div>

                      {/* Balance Display */}
                      {address && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="text-sm text-slate-300">
                            Balance:{" "}
                            {balanceLoading ? (
                              <span className="text-slate-500">Loading...</span>
                            ) : (
                              <span className="font-semibold text-green-400">
                                {balance}
                              </span>
                            )}{" "}
                            {token.symbol}
                          </div>
                          <button
                            onClick={() => {
                              toast.promise(
                                refetch(),
                                {
                                  loading: "Refreshing balance...",
                                  success: "Balance refreshed!",
                                  error: "Failed to refresh balance",
                                },
                                { duration: 2000 }
                              );
                            }}
                            className="p-1 hover:bg-slate-700 rounded transition"
                            title="Refresh balance"
                          >
                            <RefreshCw className="w-3 h-3 text-slate-400" />
                          </button>
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-2">
                        <code className="text-xs font-mono text-slate-400">
                          {token.address?.slice(0, 10)}...
                          {token.address?.slice(-8)}
                        </code>
                        <button
                          onClick={() => handleCopy(token.address)}
                          className="p-1 hover:bg-slate-700 rounded transition"
                          title="Copy address"
                        >
                          {copiedAddress === token.address ? (
                            <span className="text-xs text-green-400">
                              Copied!
                            </span>
                          ) : (
                            <Copy className="w-3 h-3 text-slate-400" />
                          )}
                        </button>
                        <button
                          onClick={() => openEtherscan(token.address)}
                          className="p-1 hover:bg-slate-700 rounded transition"
                          title="View on Etherscan"
                        >
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </button>
                      </div>

                      {/* Mint Section */}
                      {address && (
                        <div className="mt-3 pt-3 border-t border-slate-700">
                          <div className="text-xs text-slate-400 mb-2">
                            Mint Tokens (Test Only)
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              value={mintAmounts[token.address] || ""}
                              onChange={(e) => {
                                setMintAmounts((prev) => ({
                                  ...prev,
                                  [token.address]: e.target.value,
                                }));
                                setMintError("");
                              }}
                              placeholder="Amount to mint"
                              className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm placeholder:text-slate-500 outline-none focus:border-indigo-500"
                              disabled={mintingToken === token.address}
                            />
                            <button
                              onClick={() => handleMint(token)}
                              disabled={
                                mintingToken === token.address ||
                                !mintAmounts[token.address] ||
                                Number(mintAmounts[token.address]) <= 0
                              }
                              className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition inline-flex items-center gap-1"
                            >
                              {mintingToken === token.address ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Minting...
                                </>
                              ) : (
                                <>
                                  <Coins className="w-3 h-3" />
                                  Mint
                                </>
                              )}
                            </button>
                          </div>
                          {mintError && (
                            <div className="mt-1 text-xs text-red-400">
                              {mintError}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            };

            return <TokenRow key={token.address || idx} />;
          })}
        </div>
      )}
    </div>
  );
}
