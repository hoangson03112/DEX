export const NETWORK = {
  chainId: 11155111, // Sepolia (decimal)
  chainIdHex: "0xaa36a7", // Sepolia (hex)
  rpcUrl: "https://eth-sepolia.g.alchemy.com/v2/q1_Rwv-1w3pEv7Uzo48Vu",
};

export const ADDR = {
  FACTORY: import.meta.env.VITE_FACTORY || "",
  ROUTER: import.meta.env.VITE_ROUTER || "",
  PAIR: import.meta.env.VITE_PAIR || "",
};

// Hằng số cho approval
export const MAX_UINT256 = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
