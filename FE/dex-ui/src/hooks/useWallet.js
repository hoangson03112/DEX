import { useCallback, useEffect, useMemo, useState } from "react";
import { getBrowserProvider, switchOrAddSepolia, requestAccounts, getSigner } from "../services/eth.js";
import { NETWORK } from "../services/config.js";

const LAST_CONNECTED_KEY = "dex_last_connected";

export default function useWallet() {
	const [provider, setProvider] = useState(null);
	const [address, setAddress] = useState("");
	const [chainId, setChainId] = useState("");
	const [connecting, setConnecting] = useState(false);
	const [error, setError] = useState("");

	const signerPromise = useMemo(() => (provider ? getSigner(provider) : null), [provider]);

	const connect = useCallback(async () => {
		setError("");
		setConnecting(true);
		try {
			const p = await getBrowserProvider();
			await switchOrAddSepolia(p);
			await requestAccounts(p);
			const network = await p.getNetwork();
			setChainId(network.chainId.toString());
			const signer = await p.getSigner();
			setAddress(await signer.getAddress());
			setProvider(p);
			try { localStorage.setItem(LAST_CONNECTED_KEY, "1"); } catch { /* ignore persist error */ }
		} catch (e) {
			setError(e?.message || String(e));
			throw e;
		} finally {
			setConnecting(false);
		}
	}, []);

	const disconnect = useCallback(() => {
		setProvider(null);
		setAddress("");
		setChainId("");
		setError("");
		try { localStorage.removeItem(LAST_CONNECTED_KEY); } catch { /* ignore persist error */ }
	}, []);

	// Eager reconnect on page load (no prompts)
	useEffect(() => {
		(async () => {
			if (!window.ethereum) return;
			
			// Check if user manually disconnected before
			let wasConnected = false;
			try {
				wasConnected = localStorage.getItem(LAST_CONNECTED_KEY) === "1";
			} catch { /* ignore localStorage error */ }
			
			// Only reconnect if user was previously connected
			if (!wasConnected) return;
			
			try {
				const p = await getBrowserProvider();
				// Only query previously authorized accounts (no request prompt)
				const accounts = await p.send("eth_accounts", []);
				if (accounts && accounts.length) {
					// Try to switch to Sepolia silently
					try {
						await switchOrAddSepolia(p);
					} catch (switchErr) {
						// Ignore switch error during eager reconnect
						console.warn("Could not switch network during reconnect:", switchErr);
					}
					
					const network = await p.getNetwork();
					setChainId(network.chainId.toString());
					setAddress(accounts[0]);
					setProvider(p);
				}
			} catch { /* ignore eager connect error */ }
		})();
	}, []);

	useEffect(() => {
		if (!window.ethereum) return;
		const handleAccountsChanged = (accs) => {
			setAddress(accs && accs.length ? accs[0] : "");
		};
		const handleChainChanged = async (newChainId) => {
			// newChainId is hex per EIP-1193
			try {
				const decimalId = typeof newChainId === "string" && newChainId.startsWith("0x")
					? parseInt(newChainId, 16).toString()
					: String(newChainId);
				setChainId(decimalId);
				// Refresh signer/address without reloading the page
				if (provider) {
					const signer = await provider.getSigner();
					setAddress(await signer.getAddress());
				}
			} catch { /* ignore chain change error */ }
		};
		window.ethereum.on && window.ethereum.on("accountsChanged", handleAccountsChanged);
		window.ethereum.on && window.ethereum.on("chainChanged", handleChainChanged);
		return () => {
			window.ethereum?.removeListener?.("accountsChanged", handleAccountsChanged);
			window.ethereum?.removeListener?.("chainChanged", handleChainChanged);
		};
	}, [provider]);

	const isOnSepolia = chainId === NETWORK.chainIdHex || chainId === NETWORK.chainId.toString();

	return {
		provider,
		signerPromise,
		address,
		chainId,
		isOnSepolia,
		connecting,
		error,
		connect,
		disconnect,
	};
}
