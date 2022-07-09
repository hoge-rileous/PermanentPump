# PermanentPump

PermanentPump is a tokenized, perpetual, double-sided liquidity position on OTCSwap.pro. It is a crowd-owned blob of HOGE+ETH intended to make cheap, attractive trades continually available for anyone wanting to avoid price impact. Anyone can add either ETH or HOGE to mint new PP tokens. 

PP tokens can be exchanged at any time for corresponding amounts of HOGE+ETH. *NOTE: Staking & Unstaking can change exposure instantly. As an example, say 1 ETH is worth 10 million HOGE, and PP has zero reserves. Person 1 adds 10 million HOGE and mints 1000 PP. Person 2 adds 1 ETH and mints 1000 PP. Now if either of them withdraws their PP, they receive 5 million HOGE and .5 ETH. Welcome to the pool, be careful with your PP.*

The bid and ask prices are recalibrated daily to roughly +/-2% of the UniSwap price. Fills on either side are automatically stacked into the opposite side. That means, for example, that PP could run out of HOGE and end up being just a large buy wall - or vice versa. If the UniSwap price is greater 5% away from bid/ask, PP is closed for business.

## Benefits

By placing the HOGE tax burden on the taker (which is completely normal when buying HOGE on any DeX), PP accumulates a 1% fee on each transaction. For normal vendor contracts this goes as revenue to OTCSwap.pro, but PP is treated as a special case.

## Risks

PP reserves are subject to a risk that I'll call "worse-than-impermanent loss" or "getting rekt". Think about it: if you are always willing to sell HOGE for a premium, and always willing to buy at a discount, then it's entirely possible to end up buying high and selling low depending on the price evolution. If regular LP is an infantry, PP is the elite crack-force SEAL team.

## Centralized Risk Mitigation

Contract structure requires some owner maintenance, namely setting the bid/ask prices to track the spot price. However there are 3 failsafes to mitigate exposure to a malicious or absent owner:

1) No requirements on the removePP() function, meaning HOGE+ETH can always be withdrawn. New PP can only be minted while the bid/ask are within +/-5% tolerance of market price, to prevent flashloan attacks.

2) Price setting bounds. The owner is unable to set the bid above the UniSwap price, or the Ask below. So a malicious owner can't make wildly unfavorable trades possible by setting silly prices.

3) As mentioned, if the UniSwap price is outside +/-5% of the bid/ask, the PP contract will NOT ACCEPT TAKERS. So an absentee owner can't allow wildly unfavorable trades to happen by failing to set the bid/ask.