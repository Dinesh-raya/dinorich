# DINO-RICHUP: Complete Game Data Reference

---

## 1. Board Layout (40 Tiles)

| Tile | Name | Type | Price | Mortgage |
|------|------|------|-------|----------|
| 0 | **GO** | Corner | — | — |
| 1 | Guwahati | Property (Brown) | ₹60,000 | ₹30,000 |
| 2 | Treasury Card | Card | — | — |
| 3 | Goa | Property (Brown) | ₹60,000 | ₹30,000 |
| 4 | **Income Tax** | Tax (₹2,00,000) | — | — |
| 5 | Delhi Airport | Airport | ₹2,00,000 | ₹1,00,000 |
| 6 | Ahmedabad | Property (Light Blue) | ₹1,00,000 | ₹50,000 |
| 7 | Surprise Card | Card | — | — |
| 8 | Pune | Property (Light Blue) | ₹1,00,000 | ₹50,000 |
| 9 | Hyderabad | Property (Light Blue) | ₹1,20,000 | ₹60,000 |
| 10 | **Traffic Police Jail** | Corner | — | — |
| 11 | Jaipur | Property (Pink) | ₹1,40,000 | ₹70,000 |
| 12 | NTPC Power | Utility | ₹1,50,000 | ₹75,000 |
| 13 | Chandigarh | Property (Pink) | ₹1,40,000 | ₹70,000 |
| 14 | Lucknow | Property (Pink) | ₹1,60,000 | ₹80,000 |
| 15 | Mumbai Airport | Airport | ₹2,00,000 | ₹1,00,000 |
| 16 | Kochi | Property (Orange) | ₹1,80,000 | ₹90,000 |
| 17 | Treasury Card | Card | — | — |
| 18 | Thiruvananthapuram | Property (Orange) | ₹1,80,000 | ₹90,000 |
| 19 | Chennai | Property (Orange) | ₹2,00,000 | ₹1,00,000 |
| 20 | **Free Parking** | Corner | — | — |
| 21 | Surat | Property (Red) | ₹2,20,000 | ₹1,10,000 |
| 22 | Surprise Card | Card | — | — |
| 23 | Indore | Property (Red) | ₹2,20,000 | ₹1,10,000 |
| 24 | Bhopal | Property (Red) | ₹2,40,000 | ₹1,20,000 |
| 25 | Chennai Airport | Airport | ₹2,00,000 | ₹1,00,000 |
| 26 | Kolkata | Property (Yellow) | ₹2,60,000 | ₹1,30,000 |
| 27 | Patna | Property (Yellow) | ₹2,60,000 | ₹1,30,000 |
| 28 | Jal Jeevan Water | Utility | ₹1,50,000 | ₹75,000 |
| 29 | Bengaluru | Property (Yellow) | ₹2,80,000 | ₹1,40,000 |
| 30 | **Go To Jail** | Corner | — | — |
| 31 | Noida | Property (Green) | ₹3,00,000 | ₹1,50,000 |
| 32 | Gurugram | Property (Green) | ₹3,00,000 | ₹1,50,000 |
| 33 | Treasury Card | Card | — | — |
| 34 | Agra | Property (Green) | ₹3,20,000 | ₹1,60,000 |
| 35 | Kolkata Airport | Airport | ₹2,00,000 | ₹1,00,000 |
| 36 | Surprise Card | Card | — | — |
| 37 | Mumbai | Property (Dark Blue) | ₹3,50,000 | ₹1,75,000 |
| 38 | **Luxury Tax** | Tax (₹1,00,000) | — | — |
| 39 | Delhi | Property (Dark Blue) | ₹4,00,000 | ₹2,00,000 |

---

## 2. Property Rent Tables

Rent array format: `[Base, 1-House, 2-House, 3-House, 4-House, Hotel]`

### 🟫 Brown (2 properties: Guwahati, Goa)

| Property | Price | Base | 1-House | 2-House | 3-House | 4-House | Hotel | Mortgage |
|----------|-------|------|---------|---------|---------|---------|-------|----------|
| Guwahati | ₹60k | ₹2k | ₹10k | ₹30k | ₹90k | ₹1.6L | ₹2.5L | ₹30k |
| Goa | ₹60k | ₹4k | ₹20k | ₹60k | ₹1.8L | ₹3.2L | ₹4.5L | ₹30k |

**House price (brown):** ₹50,000 | **Monopoly base rent:** 2× Base

### 🟦 Light Blue (3 properties: Ahmedabad, Pune, Hyderabad)

| Property | Price | Base | 1-House | 2-House | 3-House | 4-House | Hotel | Mortgage |
|----------|-------|------|---------|---------|---------|---------|-------|----------|
| Ahmedabad | ₹1L | ₹6k | ₹30k | ₹90k | ₹2.7L | ₹4L | ₹5.5L | ₹50k |
| Pune | ₹1L | ₹6k | ₹30k | ₹90k | ₹2.7L | ₹4L | ₹5.5L | ₹50k |
| Hyderabad | ₹1.2L | ₹8k | ₹40k | ₹1L | ₹3L | ₹4.5L | ₹6L | ₹60k |

**House price (light_blue):** ₹50,000 | **Monopoly base rent:** 2× Base

### 🩷 Pink (3 properties: Jaipur, Chandigarh, Lucknow)

| Property | Price | Base | 1-House | 2-House | 3-House | 4-House | Hotel | Mortgage |
|----------|-------|------|---------|---------|---------|---------|-------|----------|
| Jaipur | ₹1.4L | ₹10k | ₹50k | ₹1.5L | ₹4.5L | ₹6.25L | ₹7.5L | ₹70k |
| Chandigarh | ₹1.4L | ₹10k | ₹50k | ₹1.5L | ₹4.5L | ₹6.25L | ₹7.5L | ₹70k |
| Lucknow | ₹1.6L | ₹12k | ₹60k | ₹1.8L | ₹5L | ₹7L | ₹9L | ₹80k |

**House price (pink):** ₹1,00,000 | **Monopoly base rent:** 2× Base

### 🟧 Orange (3 properties: Kochi, Thiruvananthapuram, Chennai)

| Property | Price | Base | 1-House | 2-House | 3-House | 4-House | Hotel | Mortgage |
|----------|-------|------|---------|---------|---------|---------|-------|----------|
| Kochi | ₹1.8L | ₹14k | ₹70k | ₹2L | ₹5.5L | ₹7.5L | ₹9.5L | ₹90k |
| Thiruvananthapuram | ₹1.8L | ₹14k | ₹70k | ₹2L | ₹5.5L | ₹7.5L | ₹9.5L | ₹90k |
| Chennai | ₹2L | ₹16k | ₹80k | ₹2.2L | ₹6L | ₹8L | ₹10L | ₹1L |

**House price (orange):** ₹1,00,000 | **Monopoly base rent:** 2× Base

### ❤️ Red (3 properties: Surat, Indore, Bhopal)

| Property | Price | Base | 1-House | 2-House | 3-House | 4-House | Hotel | Mortgage |
|----------|-------|------|---------|---------|---------|---------|-------|----------|
| Surat | ₹2.2L | ₹18k | ₹90k | ₹2.5L | ₹7L | ₹8.75L | ₹10.5L | ₹1.1L |
| Indore | ₹2.2L | ₹18k | ₹90k | ₹2.5L | ₹7L | ₹8.75L | ₹10.5L | ₹1.1L |
| Bhopal | ₹2.4L | ₹20k | ₹1L | ₹3L | ₹7.5L | ₹9.25L | ₹11L | ₹1.2L |

**House price (red):** ₹1,50,000 | **Monopoly base rent:** 2× Base

### 💛 Yellow (3 properties: Kolkata, Patna, Bengaluru)

| Property | Price | Base | 1-House | 2-House | 3-House | 4-House | Hotel | Mortgage |
|----------|-------|------|---------|---------|---------|---------|-------|----------|
| Kolkata | ₹2.6L | ₹22k | ₹1.1L | ₹3.3L | ₹8L | ₹9.75L | ₹11.5L | ₹1.3L |
| Patna | ₹2.6L | ₹22k | ₹1.1L | ₹3.3L | ₹8L | ₹9.75L | ₹11.5L | ₹1.3L |
| Bengaluru | ₹2.8L | ₹24k | ₹1.2L | ₹3.6L | ₹8.5L | ₹10.25L | ₹12L | ₹1.4L |

**House price (yellow):** ₹1,50,000 | **Monopoly base rent:** 2× Base

### 💚 Green (3 properties: Noida, Gurugram, Agra)

| Property | Price | Base | 1-House | 2-House | 3-House | 4-House | Hotel | Mortgage |
|----------|-------|------|---------|---------|---------|---------|-------|----------|
| Noida | ₹3L | ₹26k | ₹1.3L | ₹3.9L | ₹9L | ₹11L | ₹12.75L | ₹1.5L |
| Gurugram | ₹3L | ₹26k | ₹1.3L | ₹3.9L | ₹9L | ₹11L | ₹12.75L | ₹1.5L |
| Agra | ₹3.2L | ₹28k | ₹1.5L | ₹4.5L | ₹10L | ₹12L | ₹14L | ₹1.6L |

**House price (green):** ₹2,00,000 | **Monopoly base rent:** 2× Base

### 💙 Dark Blue (2 properties: Mumbai, Delhi)

| Property | Price | Base | 1-House | 2-House | 3-House | 4-House | Hotel | Mortgage |
|----------|-------|------|---------|---------|---------|---------|-------|----------|
| Mumbai | ₹3.5L | ₹35k | ₹1.75L | ₹5L | ₹11L | ₹13L | ₹15L | ₹1.75L |
| Delhi | ₹4L | ₹50k | ₹2L | ₹6L | ₹14L | ₹17L | ₹20L | ₹2L |

**House price (dark_blue):** ₹2,00,000 | **Monopoly base rent:** 2× Base

---

## 3. Airport Rent

All 4 airports priced at **₹2,00,000** (mortgage: ₹1,00,000).

| Airports Owned | Rent |
|----------------|------|
| 1 | ₹25,000 |
| 2 | ₹50,000 |
| 3 | ₹1,00,000 |
| 4 | ₹2,00,000 |

Formula: `₹25,000 × 2^(owned - 1)`

---

## 4. Utility Rent

Both utilities priced at **₹1,50,000** (mortgage: ₹75,000).

| Utilities Owned | Rent Formula | Example (dice=7) |
|-----------------|-------------|------------------|
| 1 | Dice × ₹4,000 | ₹28,000 |
| 2 | Dice × ₹10,000 | ₹70,000 |

---

## 5. House & Hotel Building

| Color Group | House Price | Hotel Price (5× House) |
|-------------|-------------|----------------------|
| Brown | ₹50,000 | ₹2,50,000 |
| Light Blue | ₹50,000 | ₹2,50,000 |
| Pink | ₹1,00,000 | ₹5,00,000 |
| Orange | ₹1,00,000 | ₹5,00,000 |
| Red | ₹1,50,000 | ₹7,50,000 |
| Yellow | ₹1,50,000 | ₹7,50,000 |
| Green | ₹2,00,000 | ₹10,00,000 |
| Dark Blue | ₹2,00,000 | ₹10,00,000 |

### Building Rules
- **Max houses per property:** 4
- **Houses before hotel:** 4 (hotel replaces 4 houses)
- **Max hotels per property:** 1
- **Monopoly required:** can only build if you own ALL properties in the color group
- **Even building rule:** properties in the same color group cannot differ by more than 1 house
- **Bank supply:** limited houses/hotels (set at game init; 32 houses and 12 hotels in a standard set)
- **Sell-back:** houses/hotels sell back at **half price**
- **Hotel sell-back:** when selling a hotel, it reverts to 4 houses (not 0)

---

## 6. Tax Tiles

| Tile | Name | Flat Amount | Alternative |
|------|------|-------------|-------------|
| 4 | Income Tax | ₹2,00,000 | 10% of total worth (cash + property prices + building costs) |
| 38 | Luxury Tax | ₹1,00,000 | Flat only (no percentage option) |

**Income Tax 10% calculation includes:**
- Cash on hand
- Property purchase prices (all owned properties)
- House construction costs (at house price per color group)
- Hotel construction costs (house price × 5 per hotel)
- **Minimum:** if 10% would be ₹0 or less, flat amount is enforced

---

## 7. Game Constants

| Constant | Value |
|----------|-------|
| Starting Cash | ₹5,00,000 (default, overridable by room settings) |
| GO Reward | ₹50,000 |
| Jail Fine | ₹5,000 |
| Max Jail Turns | 3 (forced release with fine on 3rd) |
| Max Doubles | 3 (3rd double = Go To Jail) |
| Turn Timer | 60s (default, configurable) |
| Auction Timer | 9s (resets on each bid to prevent sniping) |
| Buy Phase Timeout | 15s (auto-auction if no decision) |
| Trade Timeout | 120s (pending offers auto-cancel) |
| Disconnect Timeout | 120s (auto-bankruptcy) |
| Min Human Players | 2 (to start without bots) |
| Bot Fill Target | 4 (auto-fill empty slots to 4 players) |

---

## 8. Treasury Cards (20 cards)

| # | Card Text | Action | Detail |
|---|-----------|--------|--------|
| 1 | Advance to GO. Collect ₹20,000 | Move to 0 | +₹50k GO reward if passing |
| 2 | Bank error in your favor. Collect ₹20,000 | +₹20,000 | — |
| 3 | Doctor's fees. Pay ₹5,000 | −₹5,000 | Adds to Free Parking pool if enabled |
| 4 | Get Out of Jail Free card | GOOJF | Kept until used; returned to deck after use |
| 5 | Go directly to Jail. Do not pass GO. | Go to Jail | No GO reward |
| 6 | Income tax refund. Collect ₹2,000 | +₹2,000 | — |
| 7 | Pay hospital fees of ₹10,000 | −₹10,000 | Adds to Free Parking pool if enabled |
| 8 | Advance to Bengaluru. If you pass GO, collect ₹20,000 | Move to 29 | +₹50k if passing GO |
| 9 | Life insurance matures. Collect ₹15,000 | +₹15,000 | — |
| 10 | Pay school fees of ₹5,000 | −₹5,000 | Adds to Free Parking pool if enabled |
| 11 | Received dividend on shares. Collect ₹8,000 | +₹8,000 | — |
| 12 | Advance to Mumbai Airport. If you pass GO, collect ₹20,000 | Move to 15 | +₹50k if passing GO |
| 13 | Pay your insurance premium of ₹5,000 | −₹5,000 | Adds to Free Parking pool if enabled |
| 14 | You have won second prize in a beauty contest. Collect ₹10,000 | +₹10,000 | — |
| 15 | Pay electricity bill of ₹7,500 | −₹7,500 | Adds to Free Parking pool if enabled |
| 16 | Consultancy fee. Collect ₹5,000 | +₹5,000 | — |
| 17 | It's your birthday. Collect ₹2,000 from each player | +₹2k × others | Each non-bankrupt opponent pays ₹2k |
| 18 | Property tax due. Pay ₹15,000 | −₹15,000 | Adds to Free Parking pool if enabled |
| 19 | Advance to Jaipur. If you pass GO, collect ₹20,000 | Move to 11 | +₹50k if passing GO |
| 20 | Toothpaste advertisement royalty. Collect ₹3,000 | +₹3,000 | — |

---

## 9. Surprise Cards (20 cards)

| # | Card Text | Action | Detail |
|---|-----------|--------|--------|
| 1 | Advance to GO. Collect ₹20,000 | Move to 0 | +₹50k GO reward if passing |
| 2 | Advance to Delhi. If you pass GO, collect ₹20,000 | Move to 39 | +₹50k if passing GO |
| 3 | Bank pays you dividend of ₹5,000 | +₹5,000 | — |
| 4 | Get Out of Jail Free card | GOOJF | Kept until used; returned to deck after use |
| 5 | Go back 3 spaces | Move −3 | Board wrap, no GO reward |
| 6 | Go directly to Jail. Do not pass GO. | Go to Jail | No GO reward |
| 7 | Speeding fine. Pay ₹1,500 | −₹1,500 | Adds to Free Parking pool if enabled |
| 8 | Advance to Chennai. If you pass GO, collect ₹20,000 | Move to 19 | +₹50k if passing GO |
| 9 | Bank gives you a loan repayment. Collect ₹12,000 | +₹12,000 | — |
| 10 | Go to Kolkata. If you pass GO, collect ₹20,000 | Move to 26 | +₹50k if passing GO |
| 11 | Pay road tax of ₹4,000 | −₹4,000 | Adds to Free Parking pool if enabled |
| 12 | Advance to the nearest Utility. If unowned, you may buy it | Move to utility | Nearest of tiles 12 or 28; buy option if unowned; +₹50k if passing GO |
| 13 | You are assessed for street repairs. ₹4,000 per house, ₹20,000 per hotel | Pay per building | −₹4k × houses − ₹20k × hotels; adds to Free Parking pool if enabled |
| 14 | Your building loan matures. Collect ₹15,000 | +₹15,000 | — |
| 15 | Go back to Goa | Move to 3 | Board wrap, no GO reward |
| 16 | Pay lawyer fees of ₹3,000 | −₹3,000 | Adds to Free Parking pool if enabled |
| 17 | Advance to Free Parking | Move to 20 | No GO reward (Free Parking is after GO) |
| 18 | Collect ₹5,000 consultancy fee | +₹5,000 | — |
| 19 | Holiday bonus. Collect ₹3,000 | +₹3,000 | — |
| 20 | Pay entertainment tax of ₹2,000 | −₹2,000 | Adds to Free Parking pool if enabled |

---

## 10. Bankruptcy Rules

### Player owes another player (creditor exists)
1. All properties transferred to creditor (duplicates skipped)
2. For each **mortgaged** property transferred: creditor pays **10% interest** on mortgage value
3. Debtor's money set to ₹0

### Player owes the bank (no creditor, e.g. tax debt)
1. All buildings refunded at **half price** back to bank supply
2. Houses and hotels returned to bank supply (`houses_remaining` / `hotels_remaining`)
3. All properties reset: owner cleared, mortgage cleared, houses/hotels zeroed
4. Building refund logged (money goes back to bank, not any player)

### After bankruptcy
- Debtor removed from turn order
- If only **1 active player** remains → game over, that player wins

---

## 11. Auction Rules

| Property | Starting Bid |
|----------|-------------|
| All properties | 10% of price (minimum ₹10) |

- **Starting bid:** `int(price × 0.1)`, floor of ₹10
- **Timer:** 9 seconds, resets on each valid bid (anti-sniping)
- **Participants:** all non-bankrupt players in the game
- **Bid rules:**
  - Must have enough cash to cover the bid
  - Must bid strictly higher than current highest bid
  - If no one bids, property remains unowned
- **Winner:** pays bid amount, property transferred to them
- **Edge cases:** handles disconnected winner, bankrupt winner, can't-afford winner

---

## 12. Monopoly & Double Rent

- **Monopoly:** owning ALL properties of a color group
- **Double Rent:** when `double_rent_enabled` setting is ON (default: enabled), base rent (no houses) is **doubled** on monopoly
- Double rent does NOT apply once houses are built (house/hotel rents are used as-is)

---

## 13. Jail Rules

| Action | Cost/Effect |
|--------|-------------|
| Pay fine | ₹5,000 → released, can roll next turn |
| Use GOOJF card | Uses card → returned to deck → released, can roll |
| Roll doubles (1st/2nd turn) | Free escape, roll again |
| 3rd turn without doubles | Forced release, ₹5,000 fine deducted |
| Go To Jail tile (30) | Sent directly, no GO reward |
| Go To Jail card | Sent directly, no GO reward |
| 3 consecutive doubles | Sent to jail immediately (even mid-turn) |

---

## 14. Free Parking Jackpot

When `free_parking_jackpot` room setting is **enabled**, the following payments **accumulate** into the Free Parking pool:

- Income Tax payments
- Luxury Tax payments
- Jail fine payments
- All `pay_money` card payments (doctor fees, school fees, etc.)
- `pay_per_building` card payments (street repairs)

The accumulated pool is **collected by the first player** who lands on Free Parking (tile 20).

---

## 15. Starting Game Setup

| Setting | Default | Range |
|---------|---------|-------|
| Starting Cash | ₹5,00,000 | Configurable |
| Max Players | 6 | 1–6 |
| Turn Timer | 60s | Configurable |
| Auction Enabled | True | Toggle |
| Double Rent | True | Toggle |
| Mortgage Enabled | True | Toggle |
| Free Parking Jackpot | False | Toggle |
| Random Turn Order | False | Toggle |
| Jail Strict Mode | False | Toggle |
| Bot Enabled | False | Auto-fill to 4 players |
| Board Theme | "" | Placeholder |
