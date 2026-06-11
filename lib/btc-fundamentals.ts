// ---------------------------------------------------------------------------
// Bitcoin-native "fundamentals" — the crypto analog to an equity's valuation &
// health. Bitcoin has no earnings, so the fundamentals that matter are its
// monetary policy (supply, issuance, inflation, the halving clock), the
// security of its network (hash rate, difficulty), real on-chain usage
// (transactions, settled value), and network valuation (market cap, NVT, the
// "crypto P/E"). All from free, no-auth sources:
//   • CoinGecko   /coins/bitcoin + /global  → price, market cap, supply, ATH, dominance
//   • blockchain.info /stats + block height → hash rate, difficulty, on-chain volume
// Halving math is derived from the live block height, so it stays correct over
// time with nothing hard-coded but Bitcoin's own constants. Every field is
// null-safe; a dead source degrades to "—" rather than crashing the page.
// ---------------------------------------------------------------------------

const HALVING_INTERVAL = 210_000; // blocks between halvings
const BLOCKS_PER_DAY = 144; // ~10 min/block
const MAX_SUPPLY = 21_000_000;
const GENESIS_SUBSIDY = 50; // BTC

export type BtcFundamentals = {
  asOf: string;

  // Market
  price: number | null;
  marketCap: number | null;
  volume24h: number | null;
  volToMcapPct: number | null;
  dominancePct: number | null;

  // Structure
  ath: number | null;
  athChangePct: number | null;
  athDate: string | null;
  change24hPct: number | null;
  change7dPct: number | null;
  change30dPct: number | null;
  change1yPct: number | null;

  // Supply & scarcity
  circulatingSupply: number | null;
  pctMined: number | null;
  blockSubsidy: number | null;
  annualIssuance: number | null;
  inflationPct: number | null;

  // Network security & usage
  hashRateEh: number | null;
  difficulty: number | null;
  txCount24h: number | null;
  txVolumeUsd: number | null;
  nvt: number | null;

  // Halving cycle
  blockHeight: number | null;
  lastHalvingBlock: number | null;
  nextHalvingBlock: number | null;
  blocksToHalving: number | null;
  daysToHalving: number | null;
  daysSinceHalving: number | null;
  cycleProgressPct: number | null;
};

type CoinGeckoCoin = {
  market_cap_rank?: number;
  market_data?: {
    current_price?: { usd?: number };
    market_cap?: { usd?: number };
    total_volume?: { usd?: number };
    circulating_supply?: number;
    ath?: { usd?: number };
    ath_change_percentage?: { usd?: number };
    ath_date?: { usd?: string };
    price_change_percentage_24h?: number;
    price_change_percentage_7d?: number;
    price_change_percentage_30d?: number;
    price_change_percentage_1y?: number;
  };
};

type CoinGeckoGlobal = {
  data?: { market_cap_percentage?: { btc?: number } };
};

type BlockchainStats = {
  hash_rate?: number; // GH/s
  difficulty?: number;
  n_tx?: number; // transactions in last 24h
  estimated_transaction_volume_usd?: number;
  totalbc?: number; // satoshi
};

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { accept: "application/json", "user-agent": "buy-side-briefings/1.0" },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (err) {
    console.error(`[btc-fundamentals] fetch failed: ${url}`, err);
    return null;
  }
}

async function getBlockHeight(): Promise<number | null> {
  try {
    const res = await fetch("https://blockchain.info/q/getblockcount", {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const n = parseInt((await res.text()).trim(), 10);
    return Number.isFinite(n) ? n : null;
  } catch (err) {
    console.error("[btc-fundamentals] block height fetch failed", err);
    return null;
  }
}

export async function getBtcFundamentals(): Promise<BtcFundamentals> {
  const [coin, global, stats, height] = await Promise.all([
    getJson<CoinGeckoCoin>(
      "https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false",
    ),
    getJson<CoinGeckoGlobal>("https://api.coingecko.com/api/v3/global"),
    getJson<BlockchainStats>("https://blockchain.info/stats?format=json"),
    getBlockHeight(),
  ]);

  const md = coin?.market_data ?? {};
  const marketCap = md.market_cap?.usd ?? null;
  const volume24h = md.total_volume?.usd ?? null;

  // Supply: prefer CoinGecko; fall back to blockchain.info totalbc (satoshi).
  const circulatingSupply =
    md.circulating_supply ??
    (stats?.totalbc != null ? stats.totalbc / 1e8 : null);

  // ---- Halving cycle + issuance (derived from live block height) ----
  let lastHalvingBlock: number | null = null;
  let nextHalvingBlock: number | null = null;
  let blocksToHalving: number | null = null;
  let daysToHalving: number | null = null;
  let daysSinceHalving: number | null = null;
  let cycleProgressPct: number | null = null;
  let blockSubsidy: number | null = null;
  let annualIssuance: number | null = null;
  let inflationPct: number | null = null;

  if (height != null) {
    const halvings = Math.floor(height / HALVING_INTERVAL);
    lastHalvingBlock = halvings * HALVING_INTERVAL;
    nextHalvingBlock = (halvings + 1) * HALVING_INTERVAL;
    blocksToHalving = nextHalvingBlock - height;
    daysToHalving = Math.round((blocksToHalving / BLOCKS_PER_DAY) * 10) / 10;
    const blocksSince = height - lastHalvingBlock;
    daysSinceHalving = Math.round((blocksSince / BLOCKS_PER_DAY) * 10) / 10;
    cycleProgressPct = (blocksSince / HALVING_INTERVAL) * 100;
    blockSubsidy = GENESIS_SUBSIDY / 2 ** halvings;
    annualIssuance = blockSubsidy * BLOCKS_PER_DAY * 365;
    if (circulatingSupply && circulatingSupply > 0) {
      inflationPct = (annualIssuance / circulatingSupply) * 100;
    }
  }

  const txVolumeUsd = stats?.estimated_transaction_volume_usd ?? null;
  const nvt =
    marketCap != null && txVolumeUsd != null && txVolumeUsd > 0
      ? marketCap / txVolumeUsd
      : null;

  return {
    asOf: new Date().toISOString().slice(0, 10),

    price: md.current_price?.usd ?? null,
    marketCap,
    volume24h,
    volToMcapPct:
      volume24h != null && marketCap != null && marketCap > 0
        ? (volume24h / marketCap) * 100
        : null,
    dominancePct: global?.data?.market_cap_percentage?.btc ?? null,

    ath: md.ath?.usd ?? null,
    athChangePct: md.ath_change_percentage?.usd ?? null,
    athDate: md.ath_date?.usd ? md.ath_date.usd.slice(0, 10) : null,
    change24hPct: md.price_change_percentage_24h ?? null,
    change7dPct: md.price_change_percentage_7d ?? null,
    change30dPct: md.price_change_percentage_30d ?? null,
    change1yPct: md.price_change_percentage_1y ?? null,

    circulatingSupply,
    pctMined: circulatingSupply != null ? (circulatingSupply / MAX_SUPPLY) * 100 : null,
    blockSubsidy,
    annualIssuance,
    inflationPct,

    hashRateEh: stats?.hash_rate != null ? stats.hash_rate / 1e9 : null, // GH/s → EH/s
    difficulty: stats?.difficulty ?? null,
    txCount24h: stats?.n_tx ?? null,
    txVolumeUsd,
    nvt,

    blockHeight: height,
    lastHalvingBlock,
    nextHalvingBlock,
    blocksToHalving,
    daysToHalving,
    daysSinceHalving,
    cycleProgressPct,
  };
}
