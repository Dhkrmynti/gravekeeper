import { useCallback, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { connectWallet, ERC20_ABI, ROBINHOOD_CHAIN_PARAMS } from '../../utils/web3';

type Listener = (...args: unknown[]) => void;
type InjectedProvider = ethers.Eip1193Provider & {
  on?: (event: string, fn: Listener) => void;
  removeListener?: (event: string, fn: Listener) => void;
};

/** Remembers that the visitor connected once, so the next visit reconnects without a prompt. */
const REMEMBER_KEY = 'gravekeeper-wallet-connected';
const REFRESH_MS = 20_000;

const injected = () => (typeof window === 'undefined' ? undefined : (window as unknown as { ethereum?: InjectedProvider }).ethereum);
const isRobinhood = (id: unknown) => String(id).toLowerCase() === ROBINHOOD_CHAIN_PARAMS.chainId;
const isAddress = (a: string) => /^0x[0-9a-fA-F]{40}$/.test(a);

/**
 * The visitor's own wallet, read-only: address, network, ETH and token balances.
 * Connecting goes through the engine's connectWallet(), which also switches to Robinhood Chain.
 */
export function useWallet(tokenAddress: string) {
  const [address, setAddress] = useState<string | null>(null);
  const [onRightChain, setOnRightChain] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [ethBalance, setEthBalance] = useState<number | null>(null);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const hasWallet = Boolean(injected());

  const readChain = useCallback(async () => {
    const eth = injected();
    if (!eth) return;
    try {
      setOnRightChain(isRobinhood(await eth.request({ method: 'eth_chainId' })));
    } catch {
      // keep the last known state
    }
  }, []);

  // Reconnect silently on return visits, and follow account / network changes in the wallet
  useEffect(() => {
    const eth = injected();
    if (!eth) return;
    if (window.localStorage.getItem(REMEMBER_KEY)) {
      eth
        .request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts?.[0]) {
            setAddress(ethers.getAddress(accounts[0]));
            readChain();
          }
        })
        .catch(() => undefined);
    }
    const onAccounts: Listener = (accounts) => {
      const list = accounts as string[];
      if (list?.[0]) {
        setAddress(ethers.getAddress(list[0]));
      } else {
        setAddress(null);
        window.localStorage.removeItem(REMEMBER_KEY);
      }
    };
    const onChain: Listener = (id) => setOnRightChain(isRobinhood(id));
    eth.on?.('accountsChanged', onAccounts);
    eth.on?.('chainChanged', onChain);
    return () => {
      eth.removeListener?.('accountsChanged', onAccounts);
      eth.removeListener?.('chainChanged', onChain);
    };
  }, [readChain]);

  // Balances come straight from the Robinhood Chain RPC, so they read right even on the wrong network
  useEffect(() => {
    if (!address) {
      setEthBalance(null);
      setTokenBalance(null);
      return;
    }
    const rpc = new ethers.JsonRpcProvider(ROBINHOOD_CHAIN_PARAMS.rpcUrls[0], 4663, { staticNetwork: true });
    const token = isAddress(tokenAddress) ? new ethers.Contract(tokenAddress, ERC20_ABI, rpc) : null;
    let cancelled = false;
    const read = async () => {
      try {
        const [wei, raw, decimals] = await Promise.all([
          rpc.getBalance(address),
          token ? (token.balanceOf(address) as Promise<bigint>) : Promise.resolve(null),
          token ? (token.decimals() as Promise<bigint>) : Promise.resolve(18n),
        ]);
        if (cancelled) return;
        setEthBalance(Number(ethers.formatEther(wei)));
        setTokenBalance(raw === null ? null : Number(ethers.formatUnits(raw, decimals)));
      } catch {
        // RPC hiccup: try again on the next tick
      }
    };
    read();
    const id = window.setInterval(read, REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      rpc.destroy();
    };
  }, [address, tokenAddress]);

  const connect = useCallback(async () => {
    if (!injected()) return;
    setConnecting(true);
    try {
      const result = await connectWallet();
      if (result) {
        setAddress(result.address);
        window.localStorage.setItem(REMEMBER_KEY, '1');
        await readChain();
      }
    } finally {
      setConnecting(false);
    }
  }, [readChain]);

  const disconnect = useCallback(() => {
    setAddress(null);
    window.localStorage.removeItem(REMEMBER_KEY);
  }, []);

  return { address, onRightChain, connecting, hasWallet, ethBalance, tokenBalance, connect, switchNetwork: connect, disconnect };
}
