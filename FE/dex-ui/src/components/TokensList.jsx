import React, { useState } from "react";
import { Copy, ExternalLink, Plus, Loader2, Search } from "lucide-react";

/**
 * Component hiển thị danh sách tokens với pools
 */
export default function TokensList({
  tokens,
  loading,
  onCreateToken,
  onImportToken,
}) {
  const [copiedAddress, setCopiedAddress] = useState(null);
  const [importAddress, setImportAddress] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");

  const handleCopy = (address) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
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
      return;
    }

    // Check if already exists
    const exists = tokens.find(
      (t) =>
        t.address && t.address.toLowerCase() === importAddress.toLowerCase()
    );
    if (exists) {
      setImportError("Token already in list");
      return;
    }

    setImporting(true);
    setImportError("");

    try {
      await onImportToken(importAddress.trim());
      setImportAddress("");
      setImportError("");
    } catch (err) {
      setImportError(err?.message || "Failed to import token");
    } finally {
      setImporting(false);
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
        <div className="text-sm font-medium text-slate-200 mb-2">
          Import Token
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
          {tokens.map((token, idx) => (
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
                        <span className="text-xs text-green-400">Copied!</span>
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
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
