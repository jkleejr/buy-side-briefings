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

  SPY: "SPDR S&P 500 ETF — the largest and most-traded ETF in the world, designed to track the S&P 500 index. Effectively 'the stock market' in one ticker. Trades intraday like a stock, unlike the index itself.",
  QQQ: "Invesco QQQ Trust — the ETF that tracks the Nasdaq 100 (the largest 100 non-financial Nasdaq-listed companies). Tech-heavy: Apple, Microsoft, Nvidia, Amazon, Meta, Alphabet dominate the weighting. More volatile than SPY because of the concentration; the cleanest proxy for 'big tech.'",
  IWM: "iShares Russell 2000 ETF — tracks the Russell 2000 small-cap index. The cleanest US-listed read on the *domestic* economy because small caps have ~85% US revenue (vs. SPX's ~60%). When IWM outperforms SPY, the rally is broad. When it underperforms, only mega-caps are working.",
  GLD: "SPDR Gold Shares — the largest gold ETF, backed by physical gold bullion held in vaults. The simplest way for retail investors to get gold exposure without owning bars or coins. Tracks gold's spot price closely.",
  SLV: "iShares Silver Trust — the largest silver ETF, backed by physical silver bullion. Silver is more volatile than gold (smaller market, more industrial demand) and often called 'high-beta gold' — it amplifies gold's moves in both directions.",
  Silver:
    "Silver — precious metal with both monetary and industrial demand (electronics, solar panels, EVs). More volatile than gold because the market is smaller and ~50% of demand is industrial, so it's more sensitive to growth expectations.",
};

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
