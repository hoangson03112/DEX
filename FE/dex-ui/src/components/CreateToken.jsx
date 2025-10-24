import { useState } from "react";
import { X, Loader2, CheckCircle, AlertCircle } from "lucide-react";

/**
 * Component để tạo token mới (deploy ERC20)
 */
export default function CreateToken({ open, onClose }) {
  const [formData, setFormData] = useState({
    name: "",
    symbol: "",
    initialSupply: "1000000",
    decimals: "18",
  });
  const [creating] = useState(false);
  const [error, setError] = useState("");
  const [success] = useState(null);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    setError(
      "Token creation feature requires deploying from Remix IDE or using a deployment script."
    );
    setError(
      "Please use the deployment script in the smart contract folder or deploy via Remix IDE."
    );
  };

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
            <h3 className="text-slate-100 font-semibold text-lg">
              Create New Token
            </h3>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5 text-slate-300" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Token Name */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Token Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="e.g. My Token"
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Token Symbol */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Symbol
              </label>
              <input
                type="text"
                value={formData.symbol}
                onChange={(e) =>
                  handleChange("symbol", e.target.value.toUpperCase())
                }
                placeholder="e.g. MTK"
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                maxLength={10}
              />
            </div>

            {/* Initial Supply */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Initial Supply
              </label>
              <input
                type="number"
                value={formData.initialSupply}
                onChange={(e) => handleChange("initialSupply", e.target.value)}
                placeholder="1000000"
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Decimals */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Decimals
              </label>
              <select
                value={formData.decimals}
                onChange={(e) => handleChange("decimals", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="6">6 (like USDT)</option>
                <option value="8">8 (like WBTC)</option>
                <option value="18">18 (standard)</option>
              </select>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
                <div className="text-sm text-red-300">{error}</div>
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                <div className="text-sm text-green-300">
                  <div className="font-medium">Token created successfully!</div>
                  <div className="text-xs mt-1 font-mono opacity-80">
                    {success.address}
                  </div>
                </div>
              </div>
            )}

            {/* Create Button */}
            <button
              onClick={handleCreate}
              disabled={creating || !formData.name || !formData.symbol}
              className="w-full py-3 rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Token...
                </>
              ) : (
                "Create Token"
              )}
            </button>

            <div className="text-xs text-slate-400 text-center">
              Note: This will deploy a new ERC20 token contract
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
