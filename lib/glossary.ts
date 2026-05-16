// Shared educational tooltips for tickers and ETF symbols used across the site.
// Keyed by Yahoo symbol OR by friendly label so lookups work in both contexts.

export const TICKER_TIPS: Record<string, string> = {
  "^GSPC":
    "S&P 500 — the index of the 500 largest US public companies, weighted by market cap. The default benchmark for 'the US stock market'. When people say 'stocks were up today,' they usually mean this.",
  "S&P 500":
    "S&P 500 — the index of the 500 largest US public companies, weighted by market cap. The default benchmark for 'the US stock market'. When people say 'stocks were up today,' they usually mean this.",

  "^NDX":
    "Nasdaq 100 — the 100 largest non-financial companies listed on the Nasdaq exchange. Tech-heavy (Apple, Microsoft, Nvidia, Amazon, Meta dominate). More volatile and more growth-tilted than the S&P 500.",
  NDX: "Nasdaq 100 — the 100 largest non-financial companies listed on the Nasdaq exchange. Tech-heavy (Apple, Microsoft, Nvidia, Amazon, Meta dominate). More volatile and more growth-tilted than the S&P 500.",
  "Nasdaq 100":
    "Nasdaq 100 — the 100 largest non-financial companies listed on the Nasdaq exchange. Tech-heavy (Apple, Microsoft, Nvidia, Amazon, Meta dominate). More volatile and more growth-tilted than the S&P 500.",

  "^VIX":
    "CBOE Volatility Index — the market's expected 30-day volatility of the S&P 500, implied from S&P option prices. Often called the 'fear gauge.' Below 15 = complacent. Above 25 = stressed. Above 40 = panic. Spikes when stocks crash, falls during calm grinds higher.",
  VIX: "CBOE Volatility Index — the market's expected 30-day volatility of the S&P 500, implied from S&P option prices. Often called the 'fear gauge.' Below 15 = complacent. Above 25 = stressed. Above 40 = panic. Spikes when stocks crash, falls during calm grinds higher.",

  "^TNX":
    "10-Year US Treasury yield. The most-watched 'risk-free' rate in the world. The whole rest of the financial system prices off it. Rising 10Y = bond prices down, mortgages up, growth stocks pressured.",
  "10Y": "10-Year US Treasury yield. The most-watched 'risk-free' rate in the world. The whole rest of the financial system prices off it. Rising 10Y = bond prices down, mortgages up, growth stocks pressured.",
  "10Y UST":
    "10-Year US Treasury yield. The most-watched 'risk-free' rate in the world. The whole rest of the financial system prices off it. Rising 10Y = bond prices down, mortgages up, growth stocks pressured.",

  "DX-Y.NYB":
    "US Dollar Index — value of the US dollar against a basket of 6 major currencies (Euro 57.6%, Yen 13.6%, Pound 11.9%, plus CAD, SEK, CHF). Strong dollar = headwind for emerging markets, gold, and US multinationals' overseas earnings.",
  DXY: "US Dollar Index — value of the US dollar against a basket of 6 major currencies (Euro 57.6%, Yen 13.6%, Pound 11.9%, plus CAD, SEK, CHF). Strong dollar = headwind for emerging markets, gold, and US multinationals' overseas earnings.",

  "BTC-USD":
    "Bitcoin price in US dollars. The original cryptocurrency. Fixed supply of 21 million coins, ever. Often called 'digital gold.' Trades 24/7, no market close. Highly correlated with risk assets in recent years.",
  BTC: "Bitcoin price in US dollars. The original cryptocurrency. Fixed supply of 21 million coins, ever. Often called 'digital gold.' Trades 24/7, no market close. Highly correlated with risk assets in recent years.",
  Bitcoin:
    "Bitcoin price in US dollars. The original cryptocurrency. Fixed supply of 21 million coins, ever. Often called 'digital gold.' Trades 24/7, no market close. Highly correlated with risk assets in recent years.",

  "ETH-USD":
    "Ethereum price in US dollars. Second-largest crypto by market cap. Native asset of the Ethereum smart-contract platform — used to pay transaction fees ('gas') and stake to secure the network. Different risk profile than BTC: more like a 'tech platform' bet.",
  ETH: "Ethereum price in US dollars. Second-largest crypto by market cap. Native asset of the Ethereum smart-contract platform — used to pay transaction fees ('gas') and stake to secure the network. Different risk profile than BTC: more like a 'tech platform' bet.",
  Ethereum:
    "Ethereum price in US dollars. Second-largest crypto by market cap. Native asset of the Ethereum smart-contract platform — used to pay transaction fees ('gas') and stake to secure the network. Different risk profile than BTC: more like a 'tech platform' bet.",

  "GC=F":
    "Gold front-month futures contract, priced in dollars per troy ounce. Classic inflation hedge and crisis asset — historically rises when real yields fall or when trust in fiat currency erodes. Negatively correlated with the dollar most of the time.",
  Gold: "Gold front-month futures contract, priced in dollars per troy ounce. Classic inflation hedge and crisis asset — historically rises when real yields fall or when trust in fiat currency erodes. Negatively correlated with the dollar most of the time.",

  "CL=F":
    "West Texas Intermediate (WTI) crude oil front-month futures, priced in dollars per barrel. The US oil benchmark. Sensitive to OPEC supply decisions, geopolitical risk in the Middle East, and global demand expectations. Rising WTI pushes inflation higher and pressures the Fed.",
  WTI: "West Texas Intermediate (WTI) crude oil front-month futures, priced in dollars per barrel. The US oil benchmark. Sensitive to OPEC supply decisions, geopolitical risk in the Middle East, and global demand expectations. Rising WTI pushes inflation higher and pressures the Fed.",

  // International equity indices — useful as overnight session reads.
  "^N225":
    "Nikkei 225 — Japan's headline index, 225 blue-chip companies on the Tokyo Stock Exchange. Heavy in tech (Sony, Keyence, Tokyo Electron) and autos (Toyota). Read as: BoJ policy moves, yen direction, global tech demand. Trades roughly 7pm–2am US ET.",
  "Nikkei 225":
    "Nikkei 225 — Japan's headline index, 225 blue-chip companies on the Tokyo Stock Exchange. Heavy in tech (Sony, Keyence, Tokyo Electron) and autos (Toyota). Read as: BoJ policy moves, yen direction, global tech demand. Trades roughly 7pm–2am US ET.",
  "^HSI":
    "Hang Seng — Hong Kong's main index. Dominated by China tech (Tencent, Alibaba, JD, Meituan) and Chinese state-owned enterprises listed in HK. The most accessible China exposure for outside investors. Trades roughly 9:30pm–4am US ET.",
  "Hang Seng":
    "Hang Seng — Hong Kong's main index. Dominated by China tech (Tencent, Alibaba, JD, Meituan) and Chinese state-owned enterprises listed in HK. The most accessible China exposure for outside investors. Trades roughly 9:30pm–4am US ET.",
  "000001.SS":
    "Shanghai Composite — all A-shares (mainland China) on the Shanghai exchange. Direct read on Chinese retail investor sentiment and domestic policy actions. Less foreign-accessible than Hong Kong. Trades roughly 9:30pm–3am US ET.",
  "Shanghai":
    "Shanghai Composite — all A-shares (mainland China) on the Shanghai exchange. Direct read on Chinese retail investor sentiment and domestic policy actions. Less foreign-accessible than Hong Kong. Trades roughly 9:30pm–3am US ET.",
  "^KS11":
    "KOSPI — South Korea's main index. Dominated by Samsung Electronics and SK Hynix — the global memory-chip duopoly. A strong KOSPI usually signals strong tech/semis demand cycle. Trades roughly 8pm–2am US ET.",
  KOSPI:
    "KOSPI — South Korea's main index. Dominated by Samsung Electronics and SK Hynix — the global memory-chip duopoly. A strong KOSPI usually signals strong tech/semis demand cycle. Trades roughly 8pm–2am US ET.",

  "^GDAXI":
    "DAX — Germany's 40 largest companies. Heavy in industrials (Siemens), autos (Mercedes, BMW, VW), chemicals (BASF), and software (SAP). Europe's economic engine — very sensitive to China demand and energy prices. Trades roughly 3am–11:30am US ET.",
  DAX: "DAX — Germany's 40 largest companies. Heavy in industrials (Siemens), autos (Mercedes, BMW, VW), chemicals (BASF), and software (SAP). Europe's economic engine — very sensitive to China demand and energy prices. Trades roughly 3am–11:30am US ET.",
  "^FTSE":
    "FTSE 100 — UK's top 100 companies. Dominated by energy majors (Shell, BP), miners (Rio Tinto, Glencore), banks (HSBC), and consumer giants (Unilever, Diageo). 70%+ of revenue is non-UK, so it's more a global play than a domestic UK read. Trades roughly 3am–11:30am US ET.",
  "FTSE 100":
    "FTSE 100 — UK's top 100 companies. Dominated by energy majors (Shell, BP), miners (Rio Tinto, Glencore), banks (HSBC), and consumer giants (Unilever, Diageo). 70%+ of revenue is non-UK, so it's more a global play than a domestic UK read. Trades roughly 3am–11:30am US ET.",
  "^FCHI":
    "CAC 40 — France's top 40 companies. Anchored by luxury (LVMH, Hermès, L'Oréal, Kering), pharma (Sanofi), and energy (TotalEnergies). Heavy luxury weight makes it a read on global luxury demand, especially Chinese consumers. Trades roughly 3am–11:30am US ET.",
  "CAC 40":
    "CAC 40 — France's top 40 companies. Anchored by luxury (LVMH, Hermès, L'Oréal, Kering), pharma (Sanofi), and energy (TotalEnergies). Heavy luxury weight makes it a read on global luxury demand, especially Chinese consumers. Trades roughly 3am–11:30am US ET.",
  "^STOXX50E":
    "Euro Stoxx 50 — the top 50 blue chips across the Eurozone. Broadest pan-European read available. The benchmark European equity futures and ETFs track. Trades roughly 3am–11:30am US ET.",
  "Euro Stoxx 50":
    "Euro Stoxx 50 — the top 50 blue chips across the Eurozone. Broadest pan-European read available. The benchmark European equity futures and ETFs track. Trades roughly 3am–11:30am US ET.",

  "^NSEI":
    "Nifty 50 — India's main index, the 50 largest stocks on the National Stock Exchange. The biggest growth story in EM, increasingly important as foreign capital diversifies away from China. Heavy in IT services (TCS, Infosys) and banks (HDFC, ICICI). Trades roughly 11pm–5:30am US ET.",
  "Nifty 50":
    "Nifty 50 — India's main index, the 50 largest stocks on the National Stock Exchange. The biggest growth story in EM, increasingly important as foreign capital diversifies away from China. Heavy in IT services (TCS, Infosys) and banks (HDFC, ICICI). Trades roughly 11pm–5:30am US ET.",
  "^BVSP":
    "Bovespa — Brazil's main index. Commodity-heavy (Vale = iron ore, Petrobras = oil) plus large banks (Itaú, Bradesco). A pure-play on emerging-markets commodity demand and the US dollar (a weaker dollar usually helps Bovespa). Trades roughly 9am–5pm US ET.",
  Bovespa:
    "Bovespa — Brazil's main index. Commodity-heavy (Vale = iron ore, Petrobras = oil) plus large banks (Itaú, Bradesco). A pure-play on emerging-markets commodity demand and the US dollar (a weaker dollar usually helps Bovespa). Trades roughly 9am–5pm US ET.",
  "^GSPTSE":
    "S&P/TSX Composite — Canada's main index. Heavy in energy (Suncor, Canadian Natural), banks (RBC, TD), and miners. Highly correlated with US markets but with a commodity tilt. Trades 9:30am–4pm US ET (identical to US hours).",
  TSX: "S&P/TSX Composite — Canada's main index. Heavy in energy (Suncor, Canadian Natural), banks (RBC, TD), and miners. Highly correlated with US markets but with a commodity tilt. Trades 9:30am–4pm US ET (identical to US hours).",

  // US market-internals: breadth and risk indicators a desk trader scans first thing.
  "^RUT":
    "Russell 2000 — index of 2,000 small-cap US stocks. The cleanest read on the *US domestic economy* (small caps have ~85% domestic revenue vs. SPX's ~60%). When Russell outperforms SPX, the rally is broad. When it underperforms, only mega-caps are working.",
  "Russell 2000":
    "Russell 2000 — index of 2,000 small-cap US stocks. The cleanest read on the *US domestic economy* (small caps have ~85% domestic revenue vs. SPX's ~60%). When Russell outperforms SPX, the rally is broad. When it underperforms, only mega-caps are working.",
  RSP: "Invesco S&P 500 Equal Weight ETF — every S&P stock weighted ~0.2%, regardless of market cap. Compared to cap-weighted SPY: when RSP outperforms, the average stock is doing well; when SPY outperforms, the rally is being carried by the mega-caps (Apple, Microsoft, Nvidia). Best single-symbol breadth proxy.",
  "RSP−SPY":
    "Today's RSP return minus today's SPY return, in basis points (1bp = 0.01%). Positive = equal-weight outperforming (breadth healthy, average stock rising). Negative = cap-weight outperforming (narrow rally — only mega-caps lifting the index). Sustained negative spreads often precede tops because narrow rallies are fragile.",
  "HG=F":
    "Copper front-month futures, $/lb. Often called 'Dr. Copper, the PhD economist' because copper goes into everything industrial (construction, EVs, electronics, grid). Rising copper = global growth accelerating. Falling copper = demand softening. One of the cleanest leading indicators of real economic activity.",
  Copper:
    "Copper front-month futures, $/lb. Often called 'Dr. Copper, the PhD economist' because copper goes into everything industrial (construction, EVs, electronics, grid). Rising copper = global growth accelerating. Falling copper = demand softening. One of the cleanest leading indicators of real economic activity.",
  HYG: "iShares iBoxx High Yield Corporate Bond ETF — tracks below-investment-grade ('junk') corporate bonds. Credit-stress signal: when HYG falls, investors are demanding higher yields to hold risky corporate debt — often a leading indicator of equity weakness because credit stress shows up before stocks crack.",
  "^TYX":
    "30-Year US Treasury yield. Captures long-run inflation expectations and term-premium. Rising 30Y = bond investors demanding more compensation for long-duration risk (often inflation or fiscal concerns). Falling 30Y = bonds rallying (deflation/recession fear or flight to safety).",
  "30Y Yield":
    "30-Year US Treasury yield. Captures long-run inflation expectations and term-premium. Rising 30Y = bond investors demanding more compensation for long-duration risk (often inflation or fiscal concerns). Falling 30Y = bonds rallying (deflation/recession fear or flight to safety).",
  TLT: "iShares 20+ Year Treasury Bond ETF — the cleanest way to chart long-duration bonds without dealing with yields directly. TLT up = long yields down (bonds rallying). TLT down = long yields up (bonds selling off). Inverse to yields. Many traders chart TLT instead of TYX because price action is easier to read than yield levels.",

  // Mega-cap tech individual stocks — the "Magnificent 7" + AVGO.
  AAPL: "Apple — consumer hardware (iPhone, Mac, Wearables), services, and emerging AI features. Largest US company by market cap. Plays a defensive role in risk-off because of its cash hoard and consistent buybacks. iPhone unit estimates drive earnings reactions.",
  MSFT: "Microsoft — enterprise software, Azure cloud, gaming (Xbox/Activision), and AI infrastructure via the OpenAI partnership. The pre-eminent quality-flight name in risk-off. AI capex and Copilot adoption are the two narratives driving earnings sentiment.",
  NVDA: "Nvidia — designer of AI accelerator chips (H100/H200/Blackwell) plus networking. The single most important stock for the AI capex thesis. Every AI cycle question — hyperscaler spending, sovereign AI, model training demand — lives or dies on the NVDA guide.",
  GOOGL: "Alphabet / Google — search advertising, YouTube, Google Cloud (GCP), Waymo, and DeepMind/Gemini. Two big narrative overhangs: DOJ antitrust ruling and the AI-cost-of-search question (do AI overviews cannibalize ad revenue?).",
  AMZN: "Amazon — e-commerce (the consumer story), AWS cloud (the margin story), advertising (the growth story), Prime Video, robotics. AWS is the most-watched cloud-services business; retail margin direction is the consumer-economy read.",
  META: "Meta Platforms — Facebook, Instagram, WhatsApp, Threads, and Reality Labs (VR/AR). Ads-cycle bellwether — sees consumer spending shifts earliest. Reality Labs losses are still material but the ad business funds them.",
  TSLA: "Tesla — EVs (Model S/3/X/Y, Cybertruck), energy storage (Powerwall, Megapack), Full Self-Driving software, and Optimus humanoid robot ambition. High-beta sentiment proxy — often moves with crypto. Vehicle margins compressed by price cuts; the FSD/robotaxi narrative is the optionality.",
  AVGO: "Broadcom — semiconductor designer (networking, wireless, storage) + infrastructure software (post-VMware acquisition). Increasingly mentioned alongside the Mag 7. AI networking demand from hyperscalers and custom 'XPU' silicon for major cloud customers are the growth narrative.",
  AMD: "AMD — CPUs (server EPYC + consumer Ryzen) and AI GPUs (MI300 series). The credible #2 to Nvidia in AI accelerators. Server CPU share gains from Intel are an underrated steady-growth story.",
  TSM: "Taiwan Semiconductor Manufacturing — the world's largest contract chip manufacturer (foundry). Manufactures chips designed by Nvidia, Apple, AMD, and basically everyone in AI. Taiwan geopolitical risk + advanced-node capacity expansion are the two narrative drivers.",

  SPY: "SPDR S&P 500 ETF — the largest and most-traded ETF in the world, designed to track the S&P 500 index. Effectively 'the stock market' in one ticker. Trades intraday like a stock, unlike the index itself.",
  QQQ: "Invesco QQQ Trust — the ETF that tracks the Nasdaq 100 (the largest 100 non-financial Nasdaq-listed companies). Tech-heavy: Apple, Microsoft, Nvidia, Amazon, Meta, Alphabet dominate the weighting. More volatile than SPY because of the concentration; the cleanest proxy for 'big tech.'",
  IWM: "iShares Russell 2000 ETF — tracks the Russell 2000 small-cap index. The cleanest US-listed read on the *domestic* economy because small caps have ~85% US revenue (vs. SPX's ~60%). When IWM outperforms SPY, the rally is broad. When it underperforms, only mega-caps are working.",
  GLD: "SPDR Gold Shares — the largest gold ETF, backed by physical gold bullion held in vaults. The simplest way for retail investors to get gold exposure without owning bars or coins. Tracks gold's spot price closely.",
  SLV: "iShares Silver Trust — the largest silver ETF, backed by physical silver bullion. Silver is more volatile than gold (smaller market, more industrial demand) and often called 'high-beta gold' — it amplifies gold's moves in both directions.",
  Silver:
    "Silver — precious metal with both monetary and industrial demand (electronics, solar panels, EVs). More volatile than gold because the market is smaller and ~50% of demand is industrial, so it's more sensitive to growth expectations.",
};

// ---- Regime Risk Indicators -----------------------------------------------
// Each verdict's regime_risk[] uses free-form names (the analyst can add new
// ones). This table is matched by case-insensitive `includes()` against the
// indicator name, so variants like "Russell-2K daily" and "Russell-2K Friday"
// both find the same explanation. Order matters — more specific entries first.

type RegimeTipRule = { match: string[]; tip: string };

const REGIME_RISK_RULES: RegimeTipRule[] = [
  {
    match: ["vix"],
    tip: "CBOE Volatility Index — expected 30-day S&P 500 volatility implied by option prices. Often called the 'fear gauge.' This bar fills toward the trigger (typically 18–20). Above the trigger, options markets are pricing meaningful equity stress and the buy-the-dip reflex historically stops working. Above 25 = stressed. Above 40 = panic.",
  },
  {
    match: ["30y yield", "30-year yield", "30 year yield", "30y "],
    tip: "30-Year US Treasury yield, percent. Bar fills toward a high-water threshold (typically 5.0%). Above the trigger means long-duration bond yields are in a secular-high zone, which mechanically compresses equity multiples (especially long-duration growth stocks) and signals bond-market stress. The long end is harder for the Fed to control than short rates.",
  },
  {
    match: ["10y yield", "10-year yield", "10 year yield", "10y "],
    tip: "10-Year US Treasury yield, percent. The benchmark 'risk-free' rate the whole financial system prices off. Bar fills toward a high-water trigger. Above the trigger raises borrowing costs system-wide and pressures growth-stock multiples; a fast rise often pairs with bond-market stress.",
  },
  {
    match: ["aaii"],
    tip: "American Association of Individual Investors weekly bullish-sentiment survey, percent of respondents who say they're bullish on the next 6 months. Bar fills toward an over-bullish trigger (typically 55%). Above the trigger is historically a contrarian signal — extreme retail bullishness means most potential buyers are already in, leaving the marginal next move skewed downward.",
  },
  {
    match: ["fear & greed", "fear and greed", "fear/greed"],
    tip: "CNN's 0–100 composite of 7 market-mood indicators (put/call ratio, momentum, breadth, safe-haven demand, junk-bond demand, market volatility, stock-price strength). Bar fills toward the extreme-greed trigger (typically 80). Above the trigger means market mood is overheated and vulnerable to bad-news shocks. Below 20 is extreme fear — historically a contrarian buy zone.",
  },
  {
    match: ["fwd p/e", "forward p/e", "fwd pe", "forward pe", "p/e"],
    tip: "S&P 500 forward price-to-earnings ratio — the index level divided by the next-12-months consensus EPS estimate. Long-run average is roughly 16–18x. Bar fills toward a stretched-valuation trigger (typically 22–23x). Above the trigger means the index is priced for everything going right; multiple-compression risk dominates even if earnings hold up.",
  },
  {
    match: ["shiller cape", "cape ratio"],
    tip: "Cyclically Adjusted P/E — index level divided by the 10-year average of inflation-adjusted earnings. Smooths out earnings-cycle noise. 100-year average ≈ 17. Bar fills toward a stretched-valuation trigger. Elevated readings historically pair with lower long-term forward returns.",
  },
  {
    match: ["russell-2k", "russell 2k", "russell-2000", "rut "],
    tip: "Russell 2000 small-cap index daily percent change. Bar fills toward a downside trigger (typically -2.0%). Below the trigger means small caps are leading the downside — a breadth-breakdown signal. Small caps lack the mega-cap defensive bid and have the most US-domestic-economy sensitivity, so they break first when broader risk-off begins.",
  },
  {
    match: ["sectors red"],
    tip: "Count of S&P sectors closing red on the session, out of 11. Bar fills toward an extreme trigger (typically 9 or 10). Above the trigger means broad-based sector weakness, not just mega-cap-led decline — a stronger risk-off signal than a narrow drawdown. A day where everything sells is harder to brush off than a day where Tech-leads-down with defensives green.",
  },
  {
    match: ["btc weekend", "btc overnight", "crypto weekend", "crypto overnight"],
    tip: "Bitcoin percent change since the prior US-market close, used as a weekend / overnight risk-sentiment gauge. Crypto is the only meaningful price-discovery happening when US markets are closed. A reading below zero means crypto continued lower with no dip-buying — confirmation that the prior risk-off regime is persisting, not relief-bouncing.",
  },
  {
    match: ["2s10s", "2s/10s", "yield curve"],
    tip: "10-Year minus 2-Year Treasury yield, in basis points. Bar fills toward an inverted trigger. When negative (the curve is inverted), the bond market is pricing slower growth ahead — historically preceded recessions by 6–18 months. Positive and steep = normal expansion. Flat = late-cycle caution.",
  },
  {
    match: ["hyg", "high yield", "credit spread"],
    tip: "High-yield ('junk') corporate bond ETF or spread. Bar fills toward credit-stress trigger. Falling HYG / widening spreads means investors are demanding more compensation to hold risky corporate debt — historically a leading indicator of equity weakness because credit cracks before stocks do.",
  },
  {
    match: ["dxy", "dollar"],
    tip: "US Dollar Index. Bar fills toward a stressed-strength trigger. A sharp DXY rally usually pairs with global risk-off (flight to USD), commodity weakness (priced in USD), and emerging-market stress. Sustained breaks above key levels reset the macro regime.",
  },
];

/**
 * Look up an educational tooltip for a regime-risk indicator by its free-form
 * name. Returns undefined when no match — caller should skip the tooltip
 * rather than show a generic placeholder.
 */
export function getRegimeTip(name: string): string | undefined {
  const n = name.toLowerCase();
  for (const rule of REGIME_RISK_RULES) {
    if (rule.match.some((m) => n.includes(m))) return rule.tip;
  }
  return undefined;
}

export const SECTOR_TIPS: Record<string, string> = {
  XLK: "Technology Select Sector SPDR — the S&P 500 tech sector ETF. Apple, Microsoft, Nvidia, Broadcom dominate. Largest sector by weight in the S&P. Sensitive to interest rates (high duration).",
  XLF: "Financial Select Sector SPDR — big banks (JPMorgan, Bank of America), insurers, asset managers, exchanges. Generally benefits when rates rise and the yield curve steepens, suffers in credit stress.",
  XLE: "Energy Select Sector SPDR — oil & gas majors (Exxon, Chevron) and refiners. Tracks crude oil prices and capex cycles. Inflation hedge in commodity-led inflation regimes.",
  XLV: "Health Care Select Sector SPDR — pharma (JNJ, Lilly, Pfizer), insurers (UnitedHealth), medical devices. Traditionally defensive (people need healthcare in any economy) but exposed to policy/election risk.",
  XLY: "Consumer Discretionary Select Sector SPDR — Amazon, Tesla, Home Depot, McDonald's. Cyclical — discretionary spending rises in expansions, gets cut first in recessions.",
  XLP: "Consumer Staples Select Sector SPDR — Coca-Cola, Procter & Gamble, Walmart, Costco. Classic defensive sector — people buy toothpaste and groceries in any economy. Outperforms in downturns.",
  XLI: "Industrials Select Sector SPDR — Caterpillar, Honeywell, Union Pacific, UPS. Cyclical — leads economic expansions, lags in slowdowns. Often a tell for global growth.",
  XLU: "Utilities Select Sector SPDR — electric and gas utility companies. Bond-like behavior — sensitive to interest rates (high yields hurt), defensive in stock downturns, pays high dividends.",
  XLB: "Materials Select Sector SPDR — chemicals, metals, mining, packaging. Cyclical — tied to construction, manufacturing, and global industrial demand. Sensitive to China.",
  XLRE: "Real Estate Select Sector SPDR — REITs (real estate investment trusts) spanning offices, malls, apartments, data centers, cell towers. Bond-like, very sensitive to interest rates.",
  XLC: "Communications Select Sector SPDR — Meta (Facebook), Alphabet (Google), Netflix, Disney, telcos. Hybrid of growth tech and traditional media. Created in 2018 by splitting old 'telecom' sector.",
};
