import { ethers } from "ethers";
import { getProvider } from "./eth";
import { ADDR } from "./config";
import FACTORY_ABI from "../abi/factory.json";
import PAIR_ABI from "../abi/pair.json";
import ERC20_ABI from "../abi/erc20.json";

const c = (addr, abi, sOrP) => new ethers.Contract(addr, abi, sOrP);

async function readTokenMeta(addr, provider) {
  const t = c(addr, ERC20_ABI, provider);
  let symbol = "TKN", name = "Token", decimals = 18;
  try {
    [symbol, name, decimals] = await Promise.all([t.symbol(), t.name(), t.decimals()]);
  } catch {
    // console.log("⚠️ Failed to fetch token metadata for", addr);
  }
  return { address: addr, symbol, name, decimals };
}

/** Lấy toàn bộ pairs đã tạo từ Factory */
export async function fetchAllPairs() {
  const provider = getProvider();
  const F = c(ADDR.FACTORY, FACTORY_ABI, provider);
  const len = Number(await F.allPairsLength());
  const pairs = [];

  for (let i = 0; i < len; i++) {
    const pairAddr = await F.allPairs(i);
    const P = c(pairAddr, PAIR_ABI, provider);
    const [token0, token1] = await Promise.all([P.token0(), P.token1()]);
    const [m0, m1] = await Promise.all([readTokenMeta(token0, provider), readTokenMeta(token1, provider)]);

    // reserves (tuỳ: để hiển thị thanh khoản)
    const [r0, r1] = await P.getReserves().then(([a,b]) => [a, b]);

    pairs.push({
      pair: pairAddr,
      token0: m0, token1: m1,
      reserve0: r0, reserve1: r1,
    });
  }
  return pairs;
}

/** Lập index: tokenAddress -> danh sách token đối ứng có thể swap 1-hop */
export function buildPairIndex(pairs) {
  const idx = new Map(); // key = token.lowercase, value = Map(counterToken -> pairAddr)

  const add = (a, b, pair) => {
    const k = a.address.toLowerCase();
    const v = b.address.toLowerCase();
    if (!idx.has(k)) idx.set(k, new Map());
    idx.get(k).set(v, pair);
  };

  for (const p of pairs) {
    add(p.token0, p.token1, p.pair);
    add(p.token1, p.token0, p.pair);
  }
  return idx;
}

/** Cho tokenIn, trả về danh sách tokenOut hợp lệ + pair address */
export function getCounterparts(index, tokenInAddr) {
  if (!tokenInAddr) return [];
  const m = index.get(tokenInAddr.toLowerCase());
  if (!m) return [];
  return Array.from(m.entries()).map(([outAddr, pair]) => ({ outAddr, pair }));
}

/** Lấy pair và reserves cho một cặp cụ thể (để hiện giá/estimate) */
export async function getPairInfo(tokenIn, tokenOut) {
  const provider = getProvider();
  const F = c(ADDR.FACTORY, FACTORY_ABI, provider);
  const pair = await F.getPair(tokenIn, tokenOut);
  if (pair === ethers.ZeroAddress) return { pair, reserveIn: 0n, reserveOut: 0n, isZero: true };

  const P = c(pair, PAIR_ABI, provider);
  // eslint-disable-next-line no-unused-vars
  const [t0, t1] = await Promise.all([P.token0(), P.token1()]);
  const [r0, r1] = await P.getReserves().then(([a,b]) => [a,b]);
  const zeroForOne = tokenIn.toLowerCase() === t0.toLowerCase();
  const reserveIn = zeroForOne ? r0 : r1;
  const reserveOut = zeroForOne ? r1 : r0;
  return { pair, reserveIn, reserveOut, isZero: false };
}
