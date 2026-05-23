# DINO-RICHUP: Complete Game Data Reference (Proposed Rebalance — ÷100 Scale)

> **Status:** Implemented (÷100 scale, active). These values match the current codebase.
> Codebase edge-case rules are preserved and annotated.

---

## 1. Board Layout (40 Tiles)

| Tile | Name | Type | Price | Mortgage | Unmortgage (Mtg + 10%) |
|------|------|------|-------|----------|------------------------|
| 0 | **GO** | Corner | — | — | — |
| 1 | Guwahati | Property (Brown) | ₹600 | ₹300 | ₹330 |
| 2 | Treasury Card | Card | — | — | — |
| 3 | Goa | Property (Brown) | ₹600 | ₹300 | ₹330 |
| 4 | **Income Tax** | Tax (₹2,400 / 10%) | — | — | — |
| 5 | Delhi Airport | Airport | ₹2,000 | ₹1,000 | ₹1,100 |
| 6 | Ahmedabad | Property (Light Blue) | ₹1,000 | ₹500 | ₹550 |
| 7 | Surprise Card | Card | — | — | — |
| 8 | Pune | Property (Light Blue) | ₹1,000 | ₹500 | ₹550 |
| 9 | Hyderabad | Property (Light Blue) | ₹1,200 | ₹600 | ₹660 |
| 10 | **Traffic Police Jail** | Corner | — | — | — |
| 11 | Jaipur | Property (Pink) | ₹1,400 | ₹700 | ₹770 |
| 12 | NTPC Power | Utility | ₹1,500 | ₹750 | ₹825 |
| 13 | Chandigarh | Property (Pink) | ₹1,400 | ₹700 | ₹770 |
| 14 | Lucknow | Property (Pink) | ₹1,600 | ₹800 | ₹880 |
| 15 | Mumbai Airport | Airport | ₹2,000 | ₹1,000 | ₹1,100 |
| 16 | Kochi | Property (Orange) | ₹1,800 | ₹900 | ₹990 |
| 17 | Treasury Card | Card | — | — | — |
| 18 | Thiruvananthapuram | Property (Orange) | ₹1,800 | ₹900 | ₹990 |
| 19 | Chennai | Property (Orange) | ₹2,000 | ₹1,000 | ₹1,100 |
| 20 | **Free Parking** | Corner | — | — | — |
| 21 | Surat | Property (Red) | ₹2,200 | ₹1,100 | ₹1,210 |
| 22 | Surprise Card | Card | — | — | — |
| 23 | Indore | Property (Red) | ₹2,200 | ₹1,100 | ₹1,210 |
| 24 | Bhopal | Property (Red) | ₹2,400 | ₹1,200 | ₹1,320 |
| 25 | Chennai Airport | Airport | ₹2,000 | ₹1,000 | ₹1,100 |
| 26 | Kolkata | Property (Yellow) | ₹2,600 | ₹1,300 | ₹1,430 |
| 27 | Patna | Property (Yellow) | ₹2,600 | ₹1,300 | ₹1,430 |
| 28 | Jal Jeevan Water | Utility | ₹1,500 | ₹750 | ₹825 |
| 29 | Bengaluru | Property (Yellow) | ₹2,800 | ₹1,400 | ₹1,540 |
| 30 | **Go To Jail** | Corner | — | — | — |
| 31 | Noida | Property (Green) | ₹3,000 | ₹1,500 | ₹1,650 |
| 32 | Gurugram | Property (Green) | ₹3,000 | ₹1,500 | ₹1,650 |
| 33 | Treasury Card | Card | — | — | — |
| 34 | Agra | Property (Green) | ₹3,200 | ₹1,600 | ₹1,760 |
| 35 | Kolkata Airport | Airport | ₹2,000 | ₹1,000 | ₹1,100 |
| 36 | Surprise Card | Card | — | — | — |
| 37 | Mumbai | Property (Dark Blue) | ₹3,500 | ₹1,750 | ₹1,925 |
| 38 | **Luxury Tax** | Tax (Flat ₹1,500) | — | — | — |
| 39 | Delhi | Property (Dark Blue) | ₹4,000 | ₹2,000 | ₹2,200 |

---

## 2. Property Rent Tables

Rent format: `[Base, 1-House, 2-House, 3-House, 4-House, Hotel]`

### 🟫 Brown

| Property | Price | Base | 1-H | 2-H | 3-H | 4-H | Hotel | Mortgage |
|----------|-------|------|-----|-----|-----|-----|-------|----------|
| Guwahati | ₹600 | ₹20 | ₹100 | ₹300 | ₹900 | ₹1,600 | ₹2,500 | ₹300 |
| Goa | ₹600 | ₹40 | ₹200 | ₹600 | ₹1,800 | ₹3,200 | ₹4,500 | ₹300 |

**House price:** ₹500 | **Monopoly base rent:** 2× Base

### 🟦 Light Blue

| Property | Price | Base | 1-H | 2-H | 3-H | 4-H | Hotel | Mortgage |
|----------|-------|------|-----|-----|-----|-----|-------|----------|
| Ahmedabad | ₹1,000 | ₹60 | ₹300 | ₹900 | ₹2,700 | ₹4,000 | ₹5,500 | ₹500 |
| Pune | ₹1,000 | ₹60 | ₹300 | ₹900 | ₹2,700 | ₹4,000 | ₹5,500 | ₹500 |
| Hyderabad | ₹1,200 | ₹80 | ₹400 | ₹1,000 | ₹3,000 | ₹4,500 | ₹6,000 | ₹600 |

**House price:** ₹600 | **Monopoly base rent:** 2× Base

### 🩷 Pink

| Property | Price | Base | 1-H | 2-H | 3-H | 4-H | Hotel | Mortgage |
|----------|-------|------|-----|-----|-----|-----|-------|----------|
| Jaipur | ₹1,400 | ₹100 | ₹500 | ₹1,500 | ₹4,500 | ₹6,250 | ₹7,500 | ₹700 |
| Chandigarh | ₹1,400 | ₹100 | ₹500 | ₹1,500 | ₹4,500 | ₹6,250 | ₹7,500 | ₹700 |
| Lucknow | ₹1,600 | ₹120 | ₹600 | ₹1,800 | ₹5,000 | ₹7,000 | ₹9,000 | ₹800 |

**House price:** ₹1,000 | **Monopoly base rent:** 2× Base

### 🟧 Orange

| Property | Price | Base | 1-H | 2-H | 3-H | 4-H | Hotel | Mortgage |
|----------|-------|------|-----|-----|-----|-----|-------|----------|
| Kochi | ₹1,800 | ₹140 | ₹700 | ₹2,000 | ₹5,500 | ₹7,500 | ₹9,500 | ₹900 |
| Thiruvananthapuram | ₹1,800 | ₹140 | ₹700 | ₹2,000 | ₹5,500 | ₹7,500 | ₹9,500 | ₹900 |
| Chennai | ₹2,000 | ₹160 | ₹800 | ₹2,200 | ₹6,000 | ₹8,000 | ₹10,000 | ₹1,000 |

**House price:** ₹1,000 | **Monopoly base rent:** 2× Base

### ❤️ Red

| Property | Price | Base | 1-H | 2-H | 3-H | 4-H | Hotel | Mortgage |
|----------|-------|------|-----|-----|-----|-----|-------|----------|
| Surat | ₹2,200 | ₹180 | ₹900 | ₹2,500 | ₹7,000 | ₹8,750 | ₹10,500 | ₹1,100 |
| Indore | ₹2,200 | ₹180 | ₹900 | ₹2,500 | ₹7,000 | ₹8,750 | ₹10,500 | ₹1,100 |
| Bhopal | ₹2,400 | ₹200 | ₹1,000 | ₹3,000 | ₹7,500 | ₹9,250 | ₹11,000 | ₹1,200 |

**House price:** ₹1,500 | **Monopoly base rent:** 2× Base

### 💛 Yellow

| Property | Price | Base | 1-H | 2-H | 3-H | 4-H | Hotel | Mortgage |
|----------|-------|------|-----|-----|-----|-----|-------|----------|
| Kolkata | ₹2,600 | ₹220 | ₹1,100 | ₹3,300 | ₹8,000 | ₹9,750 | ₹11,500 | ₹1,300 |
| Patna | ₹2,600 | ₹220 | ₹1,100 | ₹3,300 | ₹8,000 | ₹9,750 | ₹11,500 | ₹1,300 |
| Bengaluru | ₹2,800 | ₹240 | ₹1,200 | ₹3,600 | ₹8,500 | ₹10,250 | ₹12,000 | ₹1,400 |

**House price:** ₹1,500 | **Monopoly base rent:** 2× Base

### 💚 Green

| Property | Price | Base | 1-H | 2-H | 3-H | 4-H | Hotel | Mortgage |
|----------|-------|------|-----|-----|-----|-----|-------|----------|
| Noida | ₹3,000 | ₹260 | ₹1,300 | ₹3,900 | ₹9,000 | ₹11,000 | ₹12,750 | ₹1,500 |
| Gurugram | ₹3,000 | ₹260 | ₹1,300 | ₹3,900 | ₹9,000 | ₹11,000 | ₹12,750 | ₹1,500 |
| Agra | ₹3,200 | ₹280 | ₹1,500 | ₹4,500 | ₹10,000 | ₹12,000 | ₹14,000 | ₹1,600 |

**House price:** ₹2,000 | **Monopoly base rent:** 2× Base

### 💙 Dark Blue

| Property | Price | Base | 1-H | 2-H | 3-H | 4-H | Hotel | Mortgage |
|----------|-------|------|-----|-----|-----|-----|-------|----------|
| Mumbai | ₹3,500 | ₹350 | ₹1,750 | ₹5,000 | ₹11,000 | ₹13,000 | ₹15,000 | ₹1,750 |
| Delhi | ₹4,000 | ₹500 | ₹2,000 | ₹6,000 | ₹14,000 | ₹17,000 | ₹20,000 | ₹2,000 |

**House price:** ₹2,000 | **Monopoly base rent:** 2× Base

---

## 3. Airport Rent

| Airports Owned | Rent |
|----------------|------|
| 1 | ₹250 |
| 2 | ₹500 |
| 3 | ₹1,000 |
| 4 | ₹2,000 |

Formula: `₹250 × 2^(owned - 1)`

Each airport price: **₹2,000** | Mortgage: **₹1,000** | Unmortgage: **₹1,100**

---

## 4. Utility Rent

| Utilities Owned | Rent Formula | Example (dice=7) |
|-----------------|-------------|------------------|
| 1 | Dice × ₹40 | ₹280 |
| 2 | Dice × ₹100 | ₹700 |

Each utility price: **₹1,500** | Mortgage: **₹750** | Unmortgage: **₹825**

---

## 5. House & Hotel Building

| Color Group | House Price | Hotel Price (5× House) |
|-------------|-------------|----------------------|
| Brown | ₹500 | ₹2,500 |
| Light Blue | ₹600 | ₹3,000 |
| Pink | ₹1,000 | ₹5,000 |
| Orange | ₹1,000 | ₹5,000 |
| Red | ₹1,500 | ₹7,500 |
| Yellow | ₹1,500 | ₹7,500 |
| Green | ₹2,000 | ₹10,000 |
| Dark Blue | ₹2,000 | ₹10,000 |

### Rules (Backend-Enforced)

- **Monopoly required:** can only build if you own **all** properties in the color group.
- **Even building forced:** No property can have more than 1 house difference from another in the same group. The backend rejects any build/sell that would violate this. When selling down to pay debts, the reverse order is enforced to prevent illegal cascades.
- **Max houses:** 4 per property (5th = replace 4 houses with 1 hotel).
- **Max hotels:** 1 per property.
- **Bank supply:** limited houses (32) and hotels (12) at game start.
- **Sell-back:** houses and hotels sell back at **50% value**.
- **Hotel sell-back:** 1 hotel → 4 houses (not 0). The houses are returned to the property and the bank supply is adjusted.
- **Mortgage zero-rent rule:** A mortgaged property's rent is **forced to ₹0**, even if a player lands on it. Unmortgaging costs `Mortgage Value + 10% Banking Fee`.

---

## 6. Tax Tiles

| Tile | Name | Amount | Notes |
|------|------|--------|-------|
| 4 | Income Tax | Flat ₹2,400 **or** 10% of total worth | Player chooses at landing |
| 38 | Luxury Tax | Flat ₹1,500 | Flat only — no percentage choice |

**Income Tax 10% calculation includes:** cash on hand + sum of all owned property purchase prices + total house/hotel construction costs paid.

**Exact landing only:** the 10% option is only offered if the player physically lands on tile 4. Automatic passes (e.g., from a card) process the flat amount.

---

## 7. Game Constants

| Constant | Value |
|----------|-------|
| Starting Cash | **₹15,000** |
| GO Reward | **₹1,500** |
| Jail Fine | **₹500** |
| Max Jail Turns | 3 (forced release with fine on 3rd turn) |
| Max Consecutive Doubles | 3 (3rd double = Go To Jail immediately) |
| Turn Timer | 60s (configurable) |
| Auction Timer | 9s (resets on each bid — anti-sniping) |
| Buy Phase Timeout | 15s (auto-auction if no decision) |
| Trade Timeout | 120s (pending offers auto-cancel) |
| Disconnect Timeout | 120s (auto-bankruptcy handler triggered) |
| Bot Fill Target | 4 (auto-fill empty slots) |
| Min Human Players | 1 (can start without bots for solo testing) |
| Max Players | 6 |

---

## 8. Treasury Cards (20 cards)

| # | Card Text | Action | Backend Notes |
|---|-----------|--------|---------------|
| 1 | Advance to GO. Collect ₹1,500 | Move to 0 | +₹1,500 GO reward |
| 2 | Bank error in your favor. Collect ₹2,000 | +₹2,000 | Direct cash adjustment |
| 3 | Doctor's fees. Pay ₹500 | −₹500 | Adds to Free Parking pool if setting ON |
| 4 | Get Out of Jail Free card | GOOJF | Player flag set to true; card is **popped from the deck** to prevent duplication on reshuffle |
| 5 | Go directly to Jail. Do not pass GO. | Go to Jail | Teleport to tile 10; no GO reward |
| 6 | Income tax refund. Collect ₹200 | +₹200 | |
| 7 | Pay hospital fees of ₹1,000 | −₹1,000 | Adds to Free Parking pool if setting ON |
| 8 | Advance to Bengaluru. If you pass GO, collect ₹1,500 | Move to 29 | +₹1,500 if passing GO |
| 9 | Life insurance matures. Collect ₹1,500 | +₹1,500 | |
| 10 | Pay school fees of ₹500 | −₹500 | Adds to Free Parking pool if setting ON |
| 11 | Received dividend on shares. Collect ₹800 | +₹800 | |
| 12 | Advance to Mumbai Airport. If you pass GO, collect ₹1,500 | Move to 15 | +₹1,500 if passing GO |
| 13 | Pay your insurance premium of ₹500 | −₹500 | Adds to Free Parking pool if setting ON |
| 14 | You have won second prize in a beauty contest. Collect ₹1,000 | +₹1,000 | |
| 15 | Pay electricity bill of ₹750 | −₹750 | Adds to Free Parking pool if setting ON |
| 16 | Consultancy fee. Collect ₹500 | +₹500 | |
| 17 | It's your birthday. Collect ₹200 from each player | Peer payment | Loops through non-bankrupt opponents; each pays ₹200 |
| 18 | Property tax due. Pay ₹1,500 | −₹1,500 | Adds to Free Parking pool if setting ON |
| 19 | Advance to Jaipur. If you pass GO, collect ₹1,500 | Move to 11 | +₹1,500 if passing GO |
| 20 | Toothpaste advertisement royalty. Collect ₹300 | +₹300 | |

---

## 9. Surprise Cards (20 cards)

| # | Card Text | Action | Backend Notes |
|---|-----------|--------|---------------|
| 1 | Advance to GO. Collect ₹1,500 | Move to 0 | +₹1,500 GO reward |
| 2 | Advance to Delhi. If you pass GO, collect ₹1,500 | Move to 39 | +₹1,500 if passing GO |
| 3 | Bank pays you dividend of ₹500 | +₹500 | |
| 4 | Get Out of Jail Free card | GOOJF | Same deck-pop safeguard as Treasury GOOJF |
| 5 | Go back 3 spaces | Move −3 | Board wrap; tile events re-evaluated on landing |
| 6 | Go directly to Jail. Do not pass GO. | Go to Jail | Teleport to tile 10 |
| 7 | Speeding fine. Pay ₹150 | −₹150 | Adds to Free Parking pool if setting ON |
| 8 | Advance to Chennai. If you pass GO, collect ₹1,500 | Move to 19 | +₹1,500 if passing GO |
| 9 | Bank gives you a loan repayment. Collect ₹1,200 | +₹1,200 | |
| 10 | Go to Kolkata. If you pass GO, collect ₹1,500 | Move to 26 | +₹1,500 if passing GO |
| 11 | Pay road tax of ₹400 | −₹400 | Adds to Free Parking pool if setting ON |
| 12 | Advance to the nearest Utility. If unowned, you may buy it | Move to utility | Nearest of tiles 12 or 28; buy option if unowned; if owned, rent = dice × ₹100 (2-utility rate) |
| 13 | You are assessed for street repairs. ₹400 per house, ₹2,000 per hotel | Building tax | Iterates over all owned buildings; adds to Free Parking pool if setting ON |
| 14 | Your building loan matures. Collect ₹1,500 | +₹1,500 | |
| 15 | Go back to Goa | Move to 3 | Board wrap with wrap-index fallback |
| 16 | Pay lawyer fees of ₹300 | −₹300 | Adds to Free Parking pool if setting ON |
| 17 | Advance to Free Parking | Move to 20 | Bypasses GO tracking — no reward |
| 18 | Collect ₹500 consultancy fee | +₹500 | |
| 19 | Holiday bonus. Collect ₹300 | +₹300 | |
| 20 | Pay entertainment tax of ₹200 | −₹200 | Adds to Free Parking pool if setting ON |

---

## 10. Bankruptcy Rules

### Player owes another player (creditor exists)

1. All properties transferred to creditor.
2. For each **mortgaged** property transferred: creditor must pay **10% interest** on the mortgage value to the bank (or pay the full unmortgage cost to flip the mortgage immediately).
3. Debtor's remaining cash set to ₹0.

### Player owes the bank (no creditor — e.g. tax debt)

1. All buildings refunded at **50% value** back to bank supply.
2. Houses and hotels returned to bank supply pool.
3. All properties reset: owner cleared, mortgage cleared, houses/hotels zeroed.

### After bankruptcy

- Debtor removed from turn execution order.
- If only **1 active player** remains → game over, that player wins.

---

## 11. Auction Rules

| Property | Starting Bid |
|----------|-------------|
| All | 10% of price (minimum ₹10) |

- **Starting bid:** `int(price × 0.1)`, floor of ₹10
- **Timer:** 9 seconds, resets on each valid bid (anti-sniping)
- **Participants:** all players with `isBankrupt === false`
- **Bid rules:**
  - Must have enough cash to cover the bid
  - Must bid strictly higher than the current highest bid
  - If no one bids, property remains unowned
- **Winner:** pays bid amount, property transferred
- **Edge cases:** handles disconnected winner, bankrupt winner, unable-to-afford winner (next highest bidder gets the property)

---

## 12. Monopoly & Double Rent

- **Monopoly:** owning **all** properties of a color group.
- **Double Rent:** when `double_rent_enabled` is ON (default: enabled), base rent (no structures) is **doubled** on monopoly.
- Double rent **does not apply** once any houses or hotels are built — house/hotel rents are used as-is.

---

## 13. Jail Rules

| Action | Cost / Effect |
|--------|---------------|
| Pay fine | −₹500 → released, can roll next turn |
| Use GOOJF card | Card consumed (returned to bottom of deck) → released, can roll |
| Roll doubles (turn 1 or 2) | Free escape, roll again |
| 3rd turn without escaping | Forced release, −₹500 deducted |
| Go To Jail tile (30) | Sent directly, no GO reward |
| Go To Jail card | Sent directly, no GO reward |
| 3 consecutive doubles | Sent to jail mid-turn, turn ends |

---

## 14. Free Parking Jackpot

When `free_parking_jackpot` room setting is **enabled**, the following payments accumulate in a pool:

- Income Tax payments (flat or 10%)
- Luxury Tax payments
- Jail fine payments
- All negative card payments (doctor fees, school fees, insurance, etc.)
- Building assessment payments (street repairs card)

The accumulated pool is **collected by the first player** who lands on Free Parking (tile 20). The pool resets to ₹0 after collection.

---

## 15. Starting Game Setup (Room Config Defaults)

| Setting | Default | Range |
|---------|---------|-------|
| startingCash | **₹15,000** | configurable |
| maxPlayers | 6 | 1–6 |
| turnTimer | 60s | configurable |
| auctionEnabled | true | toggle |
| doubleRent | true | toggle |
| mortgageEnabled | true | toggle |
| freeParkingJackpot | false | toggle |
| randomTurnOrder | false | toggle |
| jailStrictMode | false | toggle |
| botFillTarget | 4 | — |

---

## 16. ROI & Balance Reference (Proposed Scale)

### Base Rent ROI (turns to recoup purchase via rent)

| Group | Price | Base Rent | ROI |
|-------|-------|-----------|:---:|
| Brown | ₹600 | ₹20–₹40 | 15–30 |
| Light Blue | ₹1,000–₹1,200 | ₹60–₹80 | 15–17 |
| Pink | ₹1,400–₹1,600 | ₹100–₹120 | 13–14 |
| Orange | ₹1,800–₹2,000 | ₹140–₹160 | 12–13 |
| Red | ₹2,200–₹2,400 | ₹180–₹200 | 12 |
| Yellow | ₹2,600–₹2,800 | ₹220–₹240 | 12 |
| Green | ₹3,000–₹3,200 | ₹260–₹280 | 11–12 |
| Dark Blue | ₹3,500–₹4,000 | ₹350–₹500 | 8–10 |

### House Investment ROI (turns to recoup 1st house via rent increase)

| Group | House Cost | Rent Jump | ROI |
|-------|-----------|-----------|:---:|
| Brown | ₹500 | +₹60–₹160 | 3–8 |
| Light Blue | ₹600 | +₹220–₹320 | 1.9–2.7 |
| Pink | ₹1,000 | +₹380–₹480 | 2–2.5 |
| Orange | ₹1,000 | +₹540–₹640 | 1.5–2 |
| Red | ₹1,500 | +₹700–₹800 | 1.8–2 |
| Yellow | ₹1,500 | +₹860–₹960 | 1.5–1.7 |
| Green | ₹2,000 | +₹1,020–₹1,220 | 1.6–2 |
| Dark Blue | ₹2,000 | +₹1,400–₹1,500 | 1.3–1.4 |

**Note:** Light Blue house price bumped to ₹600 (from a flat ÷100 conversion of ₹500) specifically to slow the early snowball — the 1.9–2.7 turn payback is still strong but no longer trivial. The worst investment (Guwahati: 8 turns) is reasonable; the best (Dark Blue: 1.3 turns) is powerful but not game-ending. This is a significant improvement over the current scale where Dark Blue houses pay back in **1.33 turns** while the absolute values are 4× starting cash.

### Purchase Power (what % of starting cash is one property)

| Group | Cheapest | % of Start | Priciest | % of Start |
|-------|----------|:----------:|----------|:----------:|
| Brown | ₹600 | **4%** | ₹600 | **4%** |
| Light Blue | ₹1,000 | **7%** | ₹1,200 | **8%** |
| Pink | ₹1,400 | **9%** | ₹1,600 | **11%** |
| Orange | ₹1,800 | **12%** | ₹2,000 | **13%** |
| Red | ₹2,200 | **15%** | ₹2,400 | **16%** |
| Yellow | ₹2,600 | **17%** | ₹2,800 | **19%** |
| Green | ₹3,000 | **20%** | ₹3,200 | **21%** |
| Dark Blue | ₹3,500 | **23%** | ₹4,000 | **27%** |

| Hotel Rent for Delhi | ₹20,000 | **133% of starting cash** |
| (for comparison) | | |

This means a single hotel landing on Delhi is painful (₹20,000 when you started at ₹15,000) but **survivable** — you'd need to mortgage assets or trade to recover, rather than being instantly bankrupt. This creates the tension the game needs in the endgame without ending it on the first hotel landing.
