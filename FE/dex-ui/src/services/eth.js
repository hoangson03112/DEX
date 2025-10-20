import { BrowserProvider, Contract, JsonRpcProvider } from "ethers";
import { NETWORK } from "./config.js";

export async function getBrowserProvider() {
	if (!window.ethereum) throw new Error("No wallet found. Install MetaMask.");
	return new BrowserProvider(window.ethereum);
}

export function getPublicProvider() {
	return new JsonRpcProvider(NETWORK.rpcUrl);
}

export async function switchOrAddSepolia(provider) {
	try {
		await provider.send("wallet_switchEthereumChain", [{ chainId: NETWORK.chainIdHex }]);
	} catch (err) {
		// 4902: chain not added
		if (err && err.code === 4902) {
			await provider.send("wallet_addEthereumChain", [
				{
					chainId: NETWORK.chainIdHex,
					chainName: "Sepolia",
					nativeCurrency: { name: "SepoliaETH", symbol: "SEP", decimals: 18 },
					rpcUrls: [NETWORK.rpcUrl],
					blockExplorerUrls: ["https://sepolia.etherscan.io"],
				},
			]);
			return;
		}
		throw err;
	}
}

export async function requestAccounts(provider) {
	const accounts = await provider.send("eth_requestAccounts", []);
	return accounts;
}

export async function getSigner(provider) {
	return await provider.getSigner();
}

export function getContract(address, abi, signerOrProvider) {
	return new Contract(address, abi, signerOrProvider);
}
