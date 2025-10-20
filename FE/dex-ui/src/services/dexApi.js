import { getContract } from "./eth.js";
import FACTORY_ABI from "../abi/factory.js";
import ROUTER_ABI from "../abi/router.js";
import PAIR_ABI from "../abi/pair.js";
import ERC20_ABI from "../abi/erc20.js";
import { ADDR } from "./config.js";

export function getFactory(signerOrProvider) {
	return getContract(ADDR.FACTORY, FACTORY_ABI, signerOrProvider);
}

export function getRouter(signerOrProvider) {
	return getContract(ADDR.ROUTER, ROUTER_ABI, signerOrProvider);
}

export function getPair(pairAddress, signerOrProvider) {
	return getContract(pairAddress, PAIR_ABI, signerOrProvider);
}

export function getErc20(tokenAddress, signerOrProvider) {
	return getContract(tokenAddress, ERC20_ABI, signerOrProvider);
}

export async function fetchPairAddress(factory, tokenA, tokenB) {
	return await factory.getPair(tokenA, tokenB);
}

export async function fetchReserves(pair) {
	const [reserve0, reserve1] = await pair.getReserves();
	return { reserve0, reserve1 };
}

// Enumerate all pairs from the Factory (warning: O(N) loops)
export async function listAllPairs(factory) {
	const len = await factory.allPairsLength(); // BigInt in ethers v6
	const n = Number(len);
	const pairs = [];
	for (let i = 0; i < n; i++) {
		pairs.push(await factory.allPairs(i));
	}
	return pairs; // array of pair addresses
}

// Derive unique token addresses from all pairs
export async function listAllTokensFromFactory(factory, signerOrProvider) {
	const pairs = await listAllPairs(factory);
	const tokens = new Set();
	for (const pairAddr of pairs) {
		const pair = getPair(pairAddr, signerOrProvider);
		const [t0, t1] = await Promise.all([pair.token0(), pair.token1()]);
		tokens.add(t0.toLowerCase());
		tokens.add(t1.toLowerCase());
	}
	return Array.from(tokens);
}

// Optional: fetch ERC20 metadata for a token address
export async function fetchTokenInfo(tokenAddress, signerOrProvider) {
	const erc20 = getErc20(tokenAddress, signerOrProvider);
	const [name, symbol, decimals] = await Promise.all([
		erc20.name(),
		erc20.symbol(),
		erc20.decimals(),
	]);
	return { address: tokenAddress, name, symbol, decimals: Number(decimals) };
}

// Optional: get enriched token infos for all tokens in the factory
export async function listAllTokenInfos(factory, signerOrProvider) {
	const tokenAddrs = await listAllTokensFromFactory(factory, signerOrProvider);
	const infos = [];
	for (const addr of tokenAddrs) {
		try {
			infos.push(await fetchTokenInfo(addr, signerOrProvider));
		} catch {
			// skip tokens that don't conform fully to ERC20 metadata
		}
	}
	return infos;
}
