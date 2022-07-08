# PermanentPump

PermanentPump is a tokenized perpetual double-sided liquidity position on OTCSwap.pro. It is a crowd-owned blob of HOGE+ETH intended to make cheap, attractive trades continually available for anyone wanting to avoid price impact.

Anyone can add liquidity on either side to mint new PP tokens. PP tokens can be exchanged at any time for corresponding amounts of HOGE+ETH. The bid and ask prices will be recalibrated daily to roughly +/-5% of the UniSwap price. Fills on either side are automatically stacked into the opposite side. That means, for example, that PP could run out of HOGE and end up being just a large buy wall - or vice versa.

## Benefits

By placing the HOGE tax burden on the taker, PP accumulates a 1% fee on each transaction.

## Risks

PP reserves are subject to a risk that I'll call "worse-than-impermanent loss". Think about it: if you are always willing to sell HOGE for a premium, and always willing to buy at a discount, then it's entirely possible to end up buying high and selling low depending on the price evolution.

## Centralized Risk Mitigation

Contract structure requires some owner maintenance, namely setting the bid/ask prices to track the spot price. However there are 3 failsafes to mitigate exposure to a malicious or absent owner:

1) No requirements on the removePP() function, meaning HOGE+ETH can always be withdrawn.

2) Price setting bounds. The owner is unable to set the bid above the UniSwap price, or the Ask below. So a malicious owner can't make wildly unfavorable trades possible by setting silly prices.

3) Unlike other OTC Vendor contracts, if the UniSwap price is outside of the spread, the PP contract will NOT ACCEPT TAKERS. So an absentee owner can't allow wildly unfavorable trades to happen by failing to set the bid/ask.