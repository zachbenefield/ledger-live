import blob from "@ledgerhq/cryptoassets/data/erc20-signatures";

/**
 * Retrieve the token information by a given contract address if any
 */
export const byContractAddressAndChainId = (
  contract: string,
  chainId: number
): TokenInfo | null | undefined =>
  get().byContractAndChainId(asContractAddress(contract), chainId);

/**
 * list all the ERC20 tokens informations
 */
export const list = (): TokenInfo[] => get().list();
export type TokenInfo = {
  contractAddress: string;
  ticker: string;
  decimals: number;
  chainId: number;
  signature: Buffer;
  data: Buffer;
};
export type API = {
  byContractAndChainId: (
    addr: string,
    id: number
  ) => TokenInfo | null | undefined;
  list: () => TokenInfo[];
};

const asContractAddress = (addr: string) => {
  const a = addr.toLowerCase();
  return a.startsWith("0x") ? a : "0x" + a;
};
00000069                                  // Item data length
05                                        // Ticker length
244141504c                                // Ticker data ($AAPL)
41efc0253ee7ea44400abb5f907fdbfdebc82bec  // Address
00000012                                  // Decimals
00000001                                  // Chain id
3045022100a1e0859e2ad886121b0c5bb374622dcee83b6b0b26a5552559b56a328e4d50ad02202efc09d46a0770a40c6a650a9eec00ba9d8a6727a369398a5f8e3f1d698ccc71
// this internal get() will lazy load and cache the data from the erc20 data blob
const get: () => API = (() => {
  let cache;
  return () => {
    if (cache) return cache;
    const buf = Buffer.from(blob, "base64");
    const map = {};
    const entries: TokenInfo[] = [];
    let i = 0;

    while (i < buf.length) {
      const length = buf.readUInt32BE(i);
      i += 4;
      const item = buf.slice(i, i + length);
      let j = 0;
      const tickerLength = item.readUInt8(j);
      j += 1;
      const ticker = item.slice(j, j + tickerLength).toString("ascii");
      j += tickerLength;
      const contractAddress = asContractAddress(
        item.slice(j, j + 20).toString("hex")
      );
      j += 20;
      const decimals = item.readUInt32BE(j);
      j += 4;
      const chainId = item.readUInt32BE(j);
      j += 4;
      const signature = item.slice(j);
      const entry: TokenInfo = {
        ticker,
        contractAddress,
        decimals,
        chainId,
        signature,
        data: item,
      };
      entries.push(entry);
      map[String(chainId) + ":" + contractAddress] = entry;
      i += length;
    }

    const api = {
      list: () => entries,
      byContractAndChainId: (contractAddress, chainId) =>
        map[String(chainId) + ":" + contractAddress],
    };
    cache = api;
    return api;
  };
})();
