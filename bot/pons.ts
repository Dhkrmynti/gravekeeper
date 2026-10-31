import { ethers } from "ethers";
import { poolId, type PoolKey } from "./uniswap-v4";

// docs.ponsfamily.com/v2
export const PONS_FACTORY = process.env.PONS_FACTORY || "0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e";
export const PONS_MEME_HOOK = process.env.PONS_MEME_HOOK || "0xE5e702641Ea86F4ae6cC3cDaeD2B886f976Be044";
export const PHASE_POOL_CREATED = 2;

const BPS = 10_000n;

const FACTORY_ABI = [
  "function getLaunchedToken(address token) view returns (tuple(address token, address curve, address deployer, address creatorFeeRecipient, address pairToken, uint256 graduationThreshold, uint24 poolFee, int24 tickSpacing, uint16 creatorTaxBps, bool buybackEnabled, uint8 phase, uint256 sweptQuote, uint256 sweptTokens, uint256 sweptAt, bool exists))",
  "function getLaunchFeePolicy(address token) view returns (tuple(address protocolFeeRecipient, uint16 protocolFeeShareBps, uint16 buybackBurnBps, uint16 hookFeeBps, uint16 maxInternalPriceImpactBps))",
];
const CURVE_QUOTE_ABI = [
  "function getReserves() view returns (uint256 quoteReserve, uint256 tokenReserve)",
  "function sellableTokens() view returns (uint256)",
  "function feeBps() view returns (uint256)",
  "function creatorTaxBps() view returns (uint256)",
  "function currentSnipeTaxBps(address recipient) view returns (uint256)",
];
const CURVE_FEE_ABI = ["function quoteFeeBalance() view returns (uint256)", "function creatorTaxBalance() view returns (uint256)", "function sweepFees(uint256 minBuybackTokensOut)"];
const HOOK_FEE_ABI = [
  "function pendingFees(bytes32 poolId, address currency) view returns (uint256)",
  "function pendingCreatorTax(bytes32 poolId, address currency) view returns (uint256)",
  "function sweepPoolFees(bytes32 poolId, uint256 minConversionQuoteOut, uint256 minBuybackTokensOut)",
];

export interface Launch {
  curve: string;
  creatorFeeRecipient: string;
  pairToken: string;
  phase: number;
  buybackEnabled: boolean;
  creatorTaxBps: bigint;
  pool: PoolKey;
}

/** The factory's record of a token, or null when it has none (or no factory answers). */
export async function readLaunch(provider: ethers.Provider, token: string): Promise<Launch | null> {
  const factory = new ethers.Contract(PONS_FACTORY, FACTORY_ABI, provider);
  const l = await factory.getLaunchedToken(token).catch(() => null);
  if (!l?.exists) return null;
  return {
    curve: l.curve,
    creatorFeeRecipient: l.creatorFeeRecipient,
    pairToken: l.pairToken,
    phase: Number(l.phase),
    buybackEnabled: l.buybackEnabled,
    creatorTaxBps: BigInt(l.creatorTaxBps),
    pool: { fee: Number(l.poolFee), tickSpacing: Number(l.tickSpacing), hooks: PONS_MEME_HOOK },
  };
}

/** The hook's swap fee for this token, in bps. */
export async function hookFeeBps(provider: ethers.Provider, token: string) {
  const policy = await new ethers.Contract(PONS_FACTORY, FACTORY_ABI, provider).getLaunchFeePolicy(token);
  return BigInt(policy.hookFeeBps);
}

/** Tokens a curve buy should return: the quoteBuy helper from the Pons docs. */
export async function quoteCurveBuy(provider: ethers.Provider, curveAddress: string, quoteIn: bigint, recipient: string) {
  const curve = new ethers.Contract(curveAddress, CURVE_QUOTE_ABI, provider);
  const [reserves, sellable, feeBps, creatorTaxBps, rawSnipeBps] = await Promise.all([curve.getReserves(), curve.sellableTokens(), curve.feeBps(), curve.creatorTaxBps(), curve.currentSnipeTaxBps(recipient)]);
  const [quoteReserve, tokenReserve] = reserves as [bigint, bigint];

  // the snipe tax is capped so the buyer always nets at least 1% of spend
  let snipeBps: bigint = rawSnipeBps;
  if (snipeBps > 0n) {
    const maxSnipeBps = BPS - feeBps - creatorTaxBps - 100n;
    if (snipeBps > maxSnipeBps) snipeBps = maxSnipeBps;
  }
  const net = quoteIn - (quoteIn * feeBps) / BPS - (quoteIn * creatorTaxBps) / BPS - (quoteIn * snipeBps) / BPS;
  const tokensOut = (net * tokenReserve) / (quoteReserve + net);
  if (tokensOut <= sellable) return tokensOut;
  // a buy that crosses the reserved allocation fills to the edge and refunds the rest
  return sellable as bigint;
}

/** Fees a trade has left on the curve or hook. They only reach the escrow after a sweep. */
export async function unsweptFees(provider: ethers.Provider, token: string, curveAddress: string, launch: Launch | null) {
  if (launch?.phase === PHASE_POOL_CREATED) {
    const hook = new ethers.Contract(launch.pool.hooks, HOOK_FEE_ABI, provider);
    const id = poolId(token, launch.pool);
    const [fees, tax] = await Promise.all([hook.pendingFees(id, ethers.ZeroAddress), hook.pendingCreatorTax(id, ethers.ZeroAddress)]);
    return (fees as bigint) + (tax as bigint);
  }
  const curve = new ethers.Contract(curveAddress, CURVE_FEE_ABI, provider);
  const [fees, tax] = await Promise.all([curve.quoteFeeBalance(), curve.creatorTaxBalance()]);
  return (fees as bigint) + (tax as bigint);
}

/** Sends the sweep that moves those fees to the escrow. Reverts at gas estimation cost nothing. */
export async function sweepFees(wallet: ethers.Wallet, token: string, curveAddress: string, launch: Launch | null, nonce: number) {
  if (launch?.phase === PHASE_POOL_CREATED) {
    const hook = new ethers.Contract(launch.pool.hooks, HOOK_FEE_ABI, wallet);
    return hook.sweepPoolFees(poolId(token, launch.pool), 0n, 0n, { nonce }) as Promise<ethers.TransactionResponse>;
  }
  return new ethers.Contract(curveAddress, CURVE_FEE_ABI, wallet).sweepFees(0n, { nonce }) as Promise<ethers.TransactionResponse>;
}
