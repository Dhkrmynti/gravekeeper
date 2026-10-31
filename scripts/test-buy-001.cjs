const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

try {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
} catch (e) {}

const RPC_URL = process.env.RPC_URL || "https://rpc.mainnet.chain.robinhood.com";
const PRIVATE_KEY = process.env.CREATOR_PRIVATE_KEY || process.env.PRIVATE_KEY || "";
const BLAZE_TOKEN = process.env.TOKEN_ADDRESS || process.env.VITE_TOKEN_ADDRESS || "";
const UNISWAP_V4_ROUTER = "0x8876789976dEcBfCbBbe364623C63652db8C0904";
const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD";

const V4_SWAP_TEMPLATE = "0x000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000003060c0f00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000001e00000000000000000000000000000000000000000000000000000000000000240000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a6a44f24780b95d467d482de278a017fd6d7c2b3000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c8000000000000000000000000e5e702641ea86f4ae6cc3cdaed2b886f976be044000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000038d7ea4c680000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000038d7ea4c680000000000000000000000000000000000000000000000000000000000000000040000000000000000000000000a6a44f24780b95d467d482de278a017fd6d7c2b30000000000000000000000000000000000000000000000000000000000000001";

function buildUniswapV4Buy(buyAmountWei, deadlineSeconds = 1800) {
  const routerInterface = new ethers.Interface([
    "function execute(bytes commands, bytes[] inputs, uint256 deadline) external payable"
  ]);
  const oldHex = ethers.toBeHex(ethers.parseEther("0.001"), 32).slice(2);
  const newHex = ethers.toBeHex(buyAmountWei, 32).slice(2);
  const replacedInput0 = "0x" + V4_SWAP_TEMPLATE.slice(2).replaceAll(oldHex, newHex);
  const deadline = Math.floor(Date.now() / 1000) + deadlineSeconds;
  return routerInterface.encodeFunctionData("execute", ["0x10", [replacedInput0], deadline]);
}

const ERC20_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)"
];

async function main() {
  if (!PRIVATE_KEY) {
    console.error("Error: CREATOR_PRIVATE_KEY atau PRIVATE_KEY tidak diset di .env");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log("=== TEST BUY 0.001 ETH & BURN TO DEAD ADDRESS ===");
  console.log("Network        : Robinhood Chain (ID: 4663)");
  console.log("Operator Wallet:", wallet.address);

  const ethBalance = await provider.getBalance(wallet.address);
  console.log("Saldo ETH      :", ethers.formatEther(ethBalance), "ETH");

  const buyAmount = ethers.parseEther("0.001");
  if (ethBalance < buyAmount + ethers.parseEther("0.0005")) {
    console.error("Error: Saldo ETH tidak mencukupi untuk buy 0.001 ETH + gas.");
    process.exit(1);
  }

  const token = new ethers.Contract(BLAZE_TOKEN, ERC20_ABI, wallet);
  const initialTokenBal = await token.balanceOf(wallet.address);
  console.log("Saldo Token Awal:", ethers.formatUnits(initialTokenBal, 18), "$BLAZE");

  // 1. Eksekusi Buyback 0.001 ETH di Uniswap v4 Router
  console.log("\n[1/2] Mengeksekusi Buy 0.001 ETH di Uniswap v4 Universal Router...");
  const buyData = buildUniswapV4Buy(buyAmount);
  const buyNonce = await provider.getTransactionCount(wallet.address, "latest");
  const buyTx = await wallet.sendTransaction({
    to: UNISWAP_V4_ROUTER,
    value: buyAmount,
    data: buyData,
    gasLimit: 400000n,
    nonce: buyNonce
  });
  console.log("Buy Tx Sent     :", buyTx.hash);
  console.log("Menunggu konfirmasi blok...");
  const buyReceipt = await buyTx.wait();
  console.log("Buy Berhasil di Blok:", buyReceipt.blockNumber);

  // 2. Cek Token Yang Didapat & Burn ke Dead Address
  const tokenBalAfter = await token.balanceOf(wallet.address);
  const receivedTokens = tokenBalAfter - initialTokenBal;
  console.log("\nToken didapat   :", ethers.formatUnits(receivedTokens, 18), "$BLAZE");

  if (receivedTokens > 0n) {
    console.log("[2/2] Membakar", ethers.formatUnits(receivedTokens, 18), "$BLAZE ke DEAD ADDRESS...");
    const burnNonce = await provider.getTransactionCount(wallet.address, "latest");
    const burnTx = await token.transfer(DEAD_ADDRESS, receivedTokens, { nonce: burnNonce });
    console.log("Burn Tx Sent    :", burnTx.hash);
    console.log("Menunggu konfirmasi blok...");
    const burnReceipt = await burnTx.wait();
    console.log("Burn Selesai di Blok:", burnReceipt.blockNumber);
    console.log("\nHASIL TEST:");
    console.log("- Buy Tx : https://explorer.mainnet.chain.robinhood.com/tx/" + buyTx.hash);
    console.log("- Burn Tx: https://explorer.mainnet.chain.robinhood.com/tx/" + burnTx.hash);
    console.log("- Jumlah token dibakar:", ethers.formatUnits(receivedTokens, 18), "$BLAZE");
  } else {
    console.warn("Peringatan: Tidak ada pertambahan saldo token.");
  }

  console.log("=== TEST SELESAI ===");
}

main().catch((err) => {
  console.error("Test Gagal:", err);
  process.exit(1);
});
