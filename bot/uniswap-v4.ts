import { ethers } from "ethers";

export const UNISWAP_V4_POOL_MANAGER = process.env.UNISWAP_POOL_MANAGER || "0x8366a39CC670B4001A1121B8F6A443A643e40951";

export type PoolKey = { fee: number; tickSpacing: number; hooks: string };

const coder = ethers.AbiCoder.defaultAbiCoder();
const Q96 = 1n << 96n;
// the `pools` mapping slot in PoolManager, and where liquidity sits inside a pool's state
const POOLS_SLOT = 6n;
const LIQUIDITY_OFFSET = 3n;

/** The v4 pool id of the native ETH / token pool. Native ETH is the zero address, so it is always currency0. */
export function poolId(token: string, key: PoolKey) {
  return ethers.keccak256(coder.encode(["address", "address", "uint24", "int24", "address"], [ethers.ZeroAddress, token, key.fee, key.tickSpacing, key.hooks]));
}

/** Tokens out for `amountIn` of currency0 at this price and liquidity, before any fee. */
export function v4AmountOut(sqrtPriceX96: bigint, liquidity: bigint, amountIn: bigint) {
  const next = (liquidity * Q96 * sqrtPriceX96) / (liquidity * Q96 + amountIn * sqrtPriceX96);
  return (liquidity * (sqrtPriceX96 - next)) / Q96;
}

/**
 * What a buy should return, read straight from the PoolManager's storage: the graduation pool is one
 * full-range position, so price and liquidity are enough. Pons publishes no quoter for this chain.
 */
export async function quoteV4Buy(provider: ethers.Provider, token: string, key: PoolKey, amountIn: bigint) {
  const manager = new ethers.Contract(UNISWAP_V4_POOL_MANAGER, ["function extsload(bytes32 slot) view returns (bytes32)"], provider);
  const state = BigInt(ethers.keccak256(coder.encode(["bytes32", "uint256"], [poolId(token, key), POOLS_SLOT])));
  const [slot0, rawLiquidity] = await Promise.all([manager.extsload(ethers.toBeHex(state, 32)), manager.extsload(ethers.toBeHex(state + LIQUIDITY_OFFSET, 32))]);
  const sqrtPriceX96 = BigInt(slot0) & ((1n << 160n) - 1n);
  const liquidity = BigInt(rawLiquidity) & ((1n << 128n) - 1n);
  if (sqrtPriceX96 === 0n || liquidity === 0n) throw new Error("the Uniswap v4 pool has no price or liquidity");
  return v4AmountOut(sqrtPriceX96, liquidity, amountIn);
}

/**
 * Universal Router calldata that swaps exactly `buyAmountWei` of native ETH for the token in
 * the given pool: V4_SWAP with SWAP_EXACT_IN_SINGLE, SETTLE_ALL (pay the ETH), TAKE_ALL.
 * Checked on 2026-10-15 by simulating a buy of a graduated Pons token on mainnet.
 */
export function buildUniswapV4Buy(targetToken: string, buyAmountWei: bigint, key: PoolKey, minTokensOut: bigint, deadlineSeconds = 300) {
  const token = ethers.getAddress(targetToken);
  const poolKey = [ethers.ZeroAddress, token, key.fee, key.tickSpacing, key.hooks];
  const swap = coder.encode(
    ["tuple(tuple(address,address,uint24,int24,address),bool,uint128,uint128,bytes)"],
    [[poolKey, true, buyAmountWei, minTokensOut, "0x"]],
  );
  const settle = coder.encode(["address", "uint256"], [ethers.ZeroAddress, buyAmountWei]);
  const take = coder.encode(["address", "uint256"], [token, minTokensOut]);
  const input = coder.encode(["bytes", "bytes[]"], ["0x060c0f", [swap, settle, take]]);
  const router = new ethers.Interface(["function execute(bytes commands, bytes[] inputs, uint256 deadline) external payable"]);
  return router.encodeFunctionData("execute", ["0x10", [input], Math.floor(Date.now() / 1000) + deadlineSeconds]);
}
