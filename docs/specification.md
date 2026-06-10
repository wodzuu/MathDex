

**MathDex**

A Pokémon-Inspired Mathematics Learning Game

*Full Game Design Specification  ·  v1.4*

*Revised: Dungeon floors removed. Difficulty now scales with opponent level. Pokémon rarity system added. Incremental damage-proportional EXP. Speed-based turn order. Addition-only curriculum re-tuned by level.*

Target audience: ages 9–11

Math scope: addition (single concept, re-tuned by opponent level)

Genre: Endless wild-encounter RPG with level-driven progression

# **Changelog**

## **v1.0 → v1.1**

Changes made in first design review:

| Change | Affected sections | Rationale |
| :---- | :---- | :---- |
| TMs removed | 5,6,9,12 | Moves come from level-up only. One source, no complexity. |
| Evolution stones removed | 6,9,12 | All evolution is level-based. No item category with no math payoff. |
| Trainer battles removed | 2,7,10,12 | All combat is wild Pokémon only. Removes parallel conflict system. |
| Floor Tokens removed | 7,9,12 | Third currency eliminated. Pokédollars only. |
| Heart Scales removed | 7,10,12 | Special currency eliminated alongside Move Reminder NPC. |
| Move Reminder NPC removed | 10,12 | Lost function without Heart Scales. |
| Rival as battler removed | 10,12 | Narrative character only — no battle function. |
| Multiplayer removed | 7,9,12 | Trainer Card becomes personal progress screen only. |
| Soft gating added | 2,7,9 | Boss room every 5 floors. Clearing it unlocks next block. |
| Economy revised | 7 | Income: wild drops + item selling. Spending: Potions and Balls only. |

## **v1.1 → v1.2**

Changes made in second design review:

| Change | Affected sections | Rationale |
| :---- | :---- | :---- |
| Item system hidden until first Pokémon reaches level 20 | 2,5,7,8,9,12 | Removes item complexity from early game entirely. Child bonds with Pokémon and battle math before any loot system appears. |
| Symmetric item rule added | 5 | Wild Pokémon carry and drop items if and only if the player has at least one item slot. |
| First item gifted by Professor Oak (pre-identified) | 5,10 | Tutorial introduction to item system. |
| Item slots changed from floor-based to per-Pokémon level-based | 5,9,12 | Slot 1 at level 20, slot 2 at level 36, slot 3 at level 50. Rewards individual Pokémon development. |
| Berry introduction tied to item system activation | 5 | Berries are held items — they cannot exist before item slots do. |
| Item selling tied to item system activation | 7,12 | Selling becomes available when items first appear. |
| Professor Oak lab note added | 8 | Lab is locked and unavailable until item system activates. |

## **v1.2 → v1.3**

Changes made in third design review:

| Change | Affected sections | Rationale |
| :---- | :---- | :---- |
| Dungeon navigation system specified | 2,8,12 | Floor-by-floor map with room nodes. |
| Room types defined | 2,8 | Encounter, chest, rest point, stairs, boss rooms. |
| Dungeon top bar shows full party HP | 8 | All party Pokémon shown with HP bars; Lead prominent. |
| Switching added as 5th battle action | 4 | Player can switch active Pokémon during battle. |
| XP participation rule confirmed | 4,6,7 | All Pokémon sent out receive full EXP; reserves receive nothing. |
| Equip flow redesigned | 8 | Party list first → select Pokémon → view slots and stats. |
| Party size at floor 8 clarified | 6 | Party of 3 at floor 8. |

## **v1.3 → v1.4**

Changes made in implementation review (this is the version the live build reflects):

| Change | Affected sections | Rationale |
| :---- | :---- | :---- |
| **Dungeon floors removed entirely** | 2,3,4,7,8,9,11,12 | No floor map, no rooms, no stairs, no boss floors, no floor-based soft gating. The dungeon is now an endless stream of single wild encounters. Simpler to reason about; removes the spatial/navigation layer a young player did not need. |
| **Difficulty scales with opponent level, not floor** | 2,3,4,11,12 | Every difficulty knob (math content, timer, enemy strength) is now a function of the wild Pokémon's level. The opponent's level itself tracks the player's strongest party member. |
| **Curriculum reduced to addition, re-tuned by level** | 3 | All battle and catch puzzles are addition problems whose number ranges grow with opponent level (see §3). Multiplication/division/order-of-operations/fractions/percentages/algebra tiers are no longer used in the live build (retained only as an extension path). |
| **Pokémon rarity system added (5 tiers)** | 6,8 | Common / Uncommon / Rare / Epic / Legendary, derived from each species' capture rate (with an `is_legendary` override). Shown as a tag beside the Pokémon name in every view. |
| **Rarity "bag" encounter selection** | 2,6,11 | Encounter rarity is drawn from a persisted 100-ticket shuffle bag (55/27/12/5/1 for Common/Uncommon/Rare/Epic/Legendary), refilled when empty. Every rarity is guaranteed to appear a fixed number of times per 100 encounters; rarity is decoupled from level (no level bands). Replaces the earlier weighted/level-banded roll. |
| **All 151 Generation-1 Pokémon included** | 6,11 | Species config (types, base stats, capture rate, legendary flag) externalised to `src/data/pokemon.json`. |
| **EXP is incremental and damage-proportional** | 4,6,7 | EXP is granted the instant damage is dealt, to the Pokémon that dealt it, in proportion to the HP fraction removed. Replaces the "full EXP to every participant at battle end" rule. A Pokémon keeps EXP it earned even if the enemy is later caught. |
| **Speed determines turn order** | 4 | The faster Pokémon strikes first. A faster wild Pokémon takes one clearly-labelled opening strike at the start of the battle; thereafter every turn is player-attacks-then-enemy-counters. Ties go to the player. |
| **"Fight" action renamed "Attack"** | 4,8 | Clearer verb for the age group. |
| **LEAD text tag removed from party cards** | 8 | The lead is still distinguished by a larger sprite and a highlighted frame; the redundant text badge was removed. |
| **"Already caught" indicator in the ball view** | 4,8 | A panel beside the catch-chance indicator tells the player whether this species is already in their collection. |
| **Money earned only on defeat** | 7 | Pokédollars are awarded only when the opponent is defeated (not on catch or flee). |
| **Potion healing fixed** | 5,7 | Potions restore their stated HP value (+20 / +60 / +120), converted correctly into the HP bar. |
| **Blackout no longer costs money** | 2 | Fainting returns the player to town; no Pokédollars are lost. The fainted Pokémon is left at 0 HP and must be healed at the Pokémon Center before battling again. |
| **Trainer Card reworked** | 7,8 | Shows Correct answers, longest Streak, Pokémon Caught, and highest opponent level encountered ("Top Lv", persisted). Floor-based stats removed. |
| **Battle screen re-laid-out + party carousel** | 4 | The opponent panel is on top; below it the active Pokémon's panel holds its details, a left/right **carousel** to switch party members, and its move list; Ball/Potion/Flee sit beneath. The Pokémon visible in the carousel is the one that attacks and takes damage. |
| **Mid-battle switching (free) + per-member HP** | 4,6 | Switching via the carousel costs no turn. Each party member keeps its own HP through the battle; all are persisted at battle end. A faster enemy's opening strike hits the Pokémon the player entered with. When the active Pokémon faints the next healthy one is sent out; the player blacks out only when the whole party faints. |
| **Focus is a trainer property, persisted** | 4,7,11 | The Focus meter belongs to the trainer (not a Pokémon): one battle-wide meter shown in a neutral strip, carrying across switches *and* battles, persisted in game state. |

# **1. Vision and Design Philosophy**

MathDex is a Pokémon-style RPG in which every act of progression — attacking, catching Pokémon, and (later) identifying and equipping items — is gated or enhanced by solving arithmetic problems. The core insight driving the design is that mathematics should be load-bearing, not decorative. Equations are not doors to pass through before the fun begins; they are the mechanism that generates the fun.

The primary inspiration is the loot-and-grow loop of action RPGs: fight enemies, grow stronger, face stronger enemies. Every element of that loop has been mapped onto Pokémon's existing mechanics, with a mathematics layer woven into each junction point.

## **1.1 Core Design Principles**

* **Math as mechanism, not gate.** Answering correctly makes numbers bigger. That is the game. Incorrect answers still produce a result — a weaker one. The child never hits a wall; they hit a floor (a minimum outcome).

* **One number at a time.** The battle UI shows one equation. The catch screen shows one puzzle.

* **Complexity unlocks with strength.** The simplified core is complete and satisfying. Advanced mechanics arrive as the player's Pokémon grow.

* **Visible consequence.** Every stat traces back to a puzzle the child solved.

* **Extensibility over addition.** Every simplified mechanic has a documented extension path so the game can grow with the player.

* **Systems are all-or-nothing.** A system is either fully present or fully absent. The item system is the primary example: before activation it is completely invisible.

## **1.2 What This Game Is Not**

* Not a quiz with a Pokémon skin. Equations appear inside the action, not before it.
* Not a punishment system. Mistakes reduce rewards, never block progress.
* Not front-loaded. A 9-year-old can understand the entire core loop in a 10-minute tutorial.
* Not a faithful Pokémon clone. Many mechanics are deliberately simplified or removed.

| Design test: Can a child who has never played before understand what to do within 5 minutes, feel successful within 10 minutes, and want to return within 30 minutes? Every design decision should be evaluated against this test. |
| :---- |

# **2. Core Game Loop**

The game operates between two locations: the Town (hub) and the Dungeon (action). Town is calm and preparatory; the Dungeon is fast and exciting. The game has two phases based on whether the item system has been activated.

**There are no floors.** The Dungeon is an endless sequence of single wild-Pokémon encounters. After each encounter resolves (win, catch, or flee) a fresh wild Pokémon appears. The player returns to town whenever they choose.

## **2.1 Phase 1 — Battle-Only (Before Item System Activation)**

This phase lasts from the start of the game until the first Pokémon in the player's party reaches level 20. During this phase the item system does not exist in any form — no slots, no drops, no identification screen, no equip screen. Professor Oak's lab is closed.

1. Enter town. Heal at the Pokémon Center (free). Buy Potions and Balls at the Mart.
2. Choose which party Pokémon will lead (tap it in the party strip).
3. Enter the Dungeon. A wild Pokémon appears.
4. Battle: choose a move, solve the equation, see the result. Or throw a ball to catch it. Or flee.
5. Defeat: earn EXP (incrementally, as damage is dealt) and Pokédollars. Catch: the Pokémon joins your collection. Flee: nothing.
6. A new wild Pokémon appears immediately. Continue as long as you like.
7. Return to town when HP or Potions run low. If the active Pokémon faints, the player blacks out and is returned to town. No Pokédollars are lost, but the fainted Pokémon stays at 0 HP and must be healed at the Pokémon Center (free) before it can battle again.

## **2.2 Phase 2 — Full Loop (After Item System Activation)**

Triggered when the first Pokémon reaches level 20. Professor Oak sends a field note and gifts the first pre-identified item. From this point the full loop is active: wild Pokémon carry items, defeats drop mystery items, and the identification and equip screens open. (See §5. The item system is level-gated and independent of any floor concept.)

| The item system is symmetric: wild Pokémon carry and drop items if and only if at least one of the player's Pokémon has an item slot. If the player has slots, enemies have items. If the player has no slots, enemies carry nothing. |
| :---- |

## **2.3 Progression — Level, Not Floors**

There is no floor-based soft gating. Progression is driven entirely by Pokémon **level**:

* The strength of wild Pokémon scales with the player's strongest party Pokémon (see §2.4).
* Math difficulty scales with the opponent's level (see §3).
* The item system, evolutions, and item slots are per-Pokémon level milestones.

Because survival requires accurate math, math fluency and progression are the same thing — never stated explicitly. A struggling player naturally faces lower-level opponents (their party is lower level) with easier math; a confident player's party climbs and the opponents/math climb with it.

## **2.4 Encounter Generation**

When the player enters the Dungeon or advances to the next wild Pokémon, an encounter is generated:

* **Opponent level** = `max(1, partyHighestLevel + ⌊random·3⌋ − 1)` — i.e. the level of the player's strongest party member, ±1.
* **Rarity** is drawn from a persisted 100-ticket "rarity bag" (see §6.2), which guarantees every rarity appears a fixed number of times per 100 encounters.
* **Species** is then chosen uniformly at random from the Pokémon of that rarity, and rendered at the opponent's level (rarity is independent of level — an early legendary is simply a low-level one).
* The highest opponent level the player has ever encountered is recorded and shown on the Trainer Card ("Top Lv").

## **2.5 The Lead Pokémon**

At any time one party Pokémon is the **Lead** — the one that fights. All others are Reserves. The Lead is chosen in town or in the Dungeon by tapping a party member in the party strip; it is shown with a larger sprite and a highlighted frame. The Lead the player enters with is the one a faster opponent's opening strike targets. During battle the player can freely switch which party member is active using the carousel on the Pokémon panel (see §4.6).

If the Lead faints (HP reaches 0) the player blacks out and returns to town. No Pokédollars are lost, but the fainted Pokémon is kept at 0 HP — the player must heal it at the Pokémon Center (free) before battling again.

# **3. Mathematics Curriculum**

In the live build every battle and catch puzzle is **addition** (early levels) or **subtraction** (later levels). Difficulty is a function of the **opponent's level** — there are no floor tiers. The same generator is used for attacking and for throwing a Poké Ball, so a catch is exactly as hard as a hit at the same opponent level.

## **3.1 Curriculum by Opponent Level**

| Opponent level | Operation | Problem |
| :---- | :---- | :---- |
| 1–2 | addition | result up to 10 |
| 3 | addition | result between 10 and 20 |
| 4 | addition | result up to 50, with one addend in 0–9 |
| 5 | addition | result between 20 and 50 |
| 6 | addition | result between 40 and 100 |
| 7 | subtraction | operands up to 10, no negative result |
| 8 | subtraction | operands up to 20, no negative result |
| 9 | subtraction | operands up to 50, no negative result, **no borrowing** (each digit of the subtrahend ≤ the minuend's) |
| 10 | subtraction | operands up to 50, no negative result, **borrowing required** (subtrahend's units digit > the minuend's) |
| 11 | subtraction | operands up to 10, negative results allowed |
| 12 | subtraction | operands up to 20, negative results allowed |
| 13+ | subtraction | operands up to 50, negative results allowed |

For addition the order of the two addends is randomised for variety; subtraction operands keep their order (`a − b`). Every problem has exactly one whole-number answer (which may be negative at levels 11+, entered with a leading `−`).

## **3.2 Difficulty Scaling**

* **Operation & number size** grow with opponent level per the table above — addition first, then subtraction (no-borrow → borrow → signed results).
* **Time pressure**: the battle puzzle timer is `battleTimerSeconds(level)` — 8 seconds at level 1, decreasing linearly to 4 seconds at level 40 and above.
* All puzzles accept the exact integer answer.

## **3.3 Partial Credit Design**

* Battle puzzles: correct = 100% move power; incorrect or time-expired = 75% power.
* Catch puzzles: correct = full catch accuracy; incorrect or expired = 75% of catch accuracy.
* No puzzle produces a zero outcome. The child always makes progress.

| Pedagogical note: Spaced repetition occurs naturally through play. A child grinding encounters solves dozens of addition and subtraction problems per session without perceiving it as drilling. |
| :---- |

## **3.4 Extension Path (not in the live build)**

The richer curriculum from earlier versions — multiplication, division, order of operations, fractions, percentages, and introductory algebra — remains a documented extension path, layered on after the addition/subtraction bands as additional opponent-level tiers reusing the same level-driven generator.

# **4. Battle System**

## **4.1 Battle Structure**

Battles are turn-based. The screen stacks three regions: the **opponent panel** on top, then the **active Pokémon's panel** (its details, a left/right party **carousel**, and its move list), and finally the **Ball / Potion / Flee** buttons. A neutral **Focus** strip sits between the opponent and the active-Pokémon panels (see §4.4).

Each turn the player picks one of the active Pokémon's moves (the puzzle then resolves the attack), or instead throws a **Ball**, uses a **Potion**, **Flees**, or **switches** to another party member via the carousel (switching is free — see §4.6). Turn order between the two combatants is decided by Speed (see §4.6).

## **4.2 Damage Formula**

| Damage = (Move Power + Item Bonus) × Attacker Atk ÷ Defender Def × Type Multiplier × STAB × Crit × Accuracy ÷ 50 |
| :---- |

* **Item Bonus** is zero until the item system activates.
* **Type Multiplier** comes from the simplified type chart (see §6.3); pairs not in that chart default to ×1.
* **STAB** is ×1.5 when the move's type matches one of the attacker's types, otherwise ×1.
* **Crit** is ×2 on a charged critical hit (see §4.4), otherwise ×1.
* **Accuracy** is ×1.0 on a correct answer and ×0.75 on a wrong/expired answer (partial credit).
* The engine evaluates the full formula; the player only ever sees the addition puzzle.

Status moves (move power 0) deal a small fixed chip of damage and additionally apply a stat modifier (see §4.5).

## **4.3 The Battle Math Puzzle**

* When the player selects a move, an addition equation appears, generated from the opponent's level (see §3).
* Timer: 8 seconds at opponent level 1, down to 4 seconds at level 40+.
* Correct: the move fires at 100% power and the Focus meter advances one pip.
* Incorrect or expired: the move fires at 75% power and the Focus meter resets.

## **4.4 Focus Meter and Charged Critical Hits**

Focus is a property of the **trainer**, not of any Pokémon — a single battle-wide meter shown in a neutral strip between the opponent and active-Pokémon panels. Each consecutive correct answer fills one of five pips; at five pips the next correct answer triggers a **Charged Critical Hit (×2 damage)** and discharges the meter. Any wrong answer resets it to zero.

Because Focus is the trainer's accuracy streak, it **carries across party switches and across battles**, and it is **persisted in game state** (`Trainer.focus`). A hot streak is never lost by switching Pokémon or leaving the dungeon — only a wrong answer or discharging the crit resets it. This rewards sustained accuracy without requiring the child to understand the mechanic explicitly.

## **4.5 Status Moves**

Status moves (e.g. Growl) deal a small fixed chip of damage and apply a persistent battle stat modifier — for example, lowering the enemy's Attack or raising the player's Defense. The affected stat updates visibly on the combatant's stat chips (reduced enemy stats shown in red, player buffs in green), and a short message names the effect. A wrong answer softens the effect rather than nullifying it.

## **4.6 Turn Order and Switching**

**Turn order** is decided by Speed; ties go to the player.

* If the **player is faster or tied**: each turn the player's move lands first, then the wild Pokémon counterattacks.
* If the **wild Pokémon is faster**: it takes one clearly-labelled **opening strike** at the very start of the battle (before the player acts), hitting the Pokémon the player **entered with**, with a "Wild *X* attacked!" banner. Thereafter every turn follows the same player-attacks-then-enemy-counters rhythm. This keeps the speed advantage meaningful (the enemy lands one extra hit over the fight) while ensuring the player's own action never appears to damage themselves.

Every point of incoming damage is attributed to the wild Pokémon with an on-screen banner, so it never reads as self-harm.

**Switching — the party carousel.** The active Pokémon's panel has left/right arrows that cycle through the party; the Pokémon currently visible is the one that **attacks and receives damage**. Switching is **free** — it costs no turn and provokes no enemy attack. Each party member keeps its own HP, moves and PP across switches. The carousel is locked only during the opening strike (so that strike lands on the entered Pokémon) and while a puzzle is being answered. When the active Pokémon faints, the next healthy party member is sent out automatically; the player blacks out only once **every** party member has fainted (see §6.6).

## **4.7 EXP Distribution — Damage-Proportional and Incremental**

EXP is awarded **the instant damage is dealt**, to the Pokémon that dealt it, in proportion to the share of the opponent's health removed:

| EXP for one hit = TotalEXP(opponent) × (HP fraction removed by that hit) |
| :---- |

where `TotalEXP(opponent) = ⌊Base EXP × opponent level ÷ 7⌋`. Because the per-hit fractions sum to the whole, defeating an opponent grants approximately its full EXP value, split across hits in proportion to the damage each attacker dealt.

Consequences:

* If two or more Pokémon fight the same opponent (across encounters or after evolving mid-collection), each earns EXP proportional to the total damage it dealt.
* EXP is persisted immediately. If the weakened opponent is later **caught** rather than defeated, the Pokémon(s) that weakened it **keep** the EXP they already earned.
* The player's EXP bar fills live during the battle as damage lands.
* Money, by contrast, is awarded only on defeat (see §7).

## **4.8 Battle UI Components**

* **Opponent panel** (top): name, level, type badge(s), rarity tag, HP bar, Atk/Def/Spd chips, bag icon (if carrying an item, once the item system is active).
* **Focus strip**: the battle-wide trainer Focus meter (five pips + `n/5` / CHARGED) — see §4.4.
* **Active-Pokémon panel** (below): name, level, type badge(s), rarity tag, HP bar, EXP bar, Atk/Def/Spd chips (modified stats shown in colour). Carries left/right **carousel arrows** and a party-position dot row when the party has more than one member, and contains the **move list** ("Choose a move") for the active Pokémon. (Focus is *not* shown here — it belongs to the trainer.)
* **Secondary actions**: Ball / Potion / Flee, beneath the active-Pokémon panel.
* **Move-type cue**: a super-effective move shows a small `×2 vs <TYPE>` tag next to its name.
* **Contextual panel**: the move list / Math / Ball / Potion / Catch view swaps in below the panels based on the current decision.
* **Damage floaters**: animated numbers over the relevant combatant after each hit; the wild Pokémon's hits also raise an attribution banner over the player.
* **Sprites**: the battle uses the animated "walk" sprite with a drop shadow; out-of-battle screens use the "idle" sprite (also enlarged with a drop shadow).

# **5. Loot and Item System**

The two-phase item system from v1.2/v1.3 is retained as the design for Phase 2. It is **level-gated** (independent of any floor concept).

## **5.0 Item System Activation**

The item system is completely hidden until triggered. Before activation, item slots do not exist, wild Pokémon carry nothing, no items drop, and the identification and equip screens and Professor Oak's lab are closed.

**Activation trigger:** the first Pokémon in the player's party reaches level 20. Once true it never resets.

| Stage | What happens |
| :---- | :---- |
| Any Pokémon reaches level 20 — activation | Professor Oak sends a field note; the lab unlocks in town. |
| Oak gifts the first item | A pre-identified Common item is given directly — no puzzle. The child sees the equip screen and one stat bar grow. |
| Wild Pokémon begin carrying items | All wild Pokémon now carry items (bag icon). Defeating them drops a mystery item; catching transfers the held item. |
| Identification screen unlocks | The second item found is a mystery item requiring Professor Oak's identification. |

| Symmetric item rule: wild Pokémon carry and drop items if and only if at least one of the player's Pokémon has an item slot. |
| :---- |

## **5.1 Item Rarity Tiers**

| Tier | Colour | Stat slots | Notes |
| :---- | :---- | :---- | :---- |
| Common | Gray | 1 | Most frequent early item-system drop |
| Uncommon | Green | 2 | |
| Rare | Blue | 3 | Guaranteed from tougher opponents |
| Epic | Purple | 3 | Adds a type-boost (percentage) stat |
| Legendary | Gold | 4 | Adds a special effect |

(Item-stat schema, identification flow, hint system, and special effects are unchanged from v1.3 §5.3–5.5 and are not repeated here.)

## **5.2 Item Slots — Per-Pokémon Progression**

Item slots are a per-Pokémon milestone. Each Pokémon gains slots by reaching specific levels; two party members can have different slot counts.

| Pokémon level | Item slots | Notes |
| :---- | :---- | :---- |
| 1–19 | 0 | Item system not yet active for this Pokémon |
| 20–35 | 1 | First slot. The first Pokémon to reach 20 triggers global item-system activation. |
| 36–49 | 2 | Coincides with evolution level for many species (e.g. Pikachu → Raichu at 36). |
| 50+ | 3 | Fully developed Pokémon. |

The engine resizes a Pokémon's held-item slots automatically on level change, and fires global activation automatically when a level-20 threshold is first crossed.

## **5.3 Consumables**

* **Potions**: Potion (+20 HP, ₽300), Super Potion (+60 HP, ₽700), Hyper Potion (+120 HP, ₽1200). In-battle use costs a turn; the stated HP value is restored (capped at the Pokémon's max HP). Available from the start of the game.
* **Poké Balls**: Poké Ball (40% base, ₽200), Great Ball (60%, ₽600), Ultra Ball (80%, ₽1200). Available from the start.
* **Berries**: held items that activate automatically on a condition. Available only once the item system is active (they require an item slot).

# **6. Pokémon System**

## **6.1 Stats**

| Stat at level N = ⌊(2 × Base + 15) × N ÷ 100⌋ + 5     |     HP = same formula + N + 10 |
| :---- |

IVs are fixed at 15, EVs at 0, natures neutral. Stats are fully predictable. Level is derived from total EXP via `level = ⌊∛(totalEXP)⌋` (Medium-Fast curve: total EXP to reach level N = N³).

## **6.2 Rarity and Encounter Selection**

Every species has a **rarity** derived from its capture rate (stored per species), with an `is_legendary` override:

| Rarity | Capture-rate range | Override |
| :---- | :---- | :---- |
| Common | 190–255 | |
| Uncommon | 100–189 | |
| Rare | 45–99 | |
| Epic | 3–44 | |
| Legendary | — | `is_legendary = true` always wins |

The four Generation-1 legendaries are Articuno, Zapdos, Moltres, and Mewtwo. Rarity is shown as a coloured tag beside the Pokémon's name in every view (encounter card, battle, party, PC).

### **Rarity selection — the "rarity bag" (shuffle-bag randomiser)**

Encounter rarity is **not** a plain weighted roll. Instead it is drawn from a persisted bag of 100 tickets, which guarantees that every rarity shows up a fixed number of times in each window of 100 encounters — no long droughts, no lucky streaks.

The bag is filled with one ticket per percentage point of each rarity (the counts always sum to 100):

| Rarity | Tickets (per 100) | Guaranteed appearances per 100 encounters |
| :---- | :---- | :---- |
| Common | 55 | 55 |
| Uncommon | 27 | 27 |
| Rare | 12 | 12 |
| Epic | 5 | 5 |
| Legendary | 1 | 1 |

Algorithm:

1. To pick an encounter's rarity, draw one ticket from the bag **at random and remove it** (draw without replacement).
2. The drawn ticket determines the rarity. A species of that rarity is then chosen uniformly at random and rendered at the opponent's level.
3. When the bag is **empty**, refill it with a fresh 100 tickets using the table above.

Because every rarity has at least one ticket, **all rarities are guaranteed to appear**. Legendary, for example, appears exactly once per 100 encounters. Rarity is fully decoupled from level — there are no level bands; a rarity drawn early simply yields a low-level member of that tier.

The bag (its current remaining ticket counts) is **persisted in game state** so the guarantee holds across sessions — closing and reopening the game does not reset the cadence.

## **6.3 Types — Simplified Type Chart**

All 151 Generation-1 species are present with their real Gen-1 typings, but the **effectiveness chart** used for the damage multiplier is the simplified six-type set: Fire, Water, Grass, Electric, Normal, Rock. Attacking/defending pairs outside this set default to ×1.

| Attacking type | Super effective ×2 | Not very effective ×0.5 |
| :---- | :---- | :---- |
| Fire | Grass, Rock | Water, Fire |
| Water | Fire, Rock | Grass, Water |
| Grass | Water, Rock | Fire, Grass |
| Electric | Water | Grass, Electric |
| Normal | — | Rock |
| Rock | Fire | — |

Extension path: stage in the remaining types and the full 18-type chart as opponents grow.

## **6.4 Moves**

Pokémon learn moves automatically at species-specific levels (level-up is the only source). PP is a visible per-move counter; a move at 0 PP is unavailable for the rest of the run and restores free at the Pokémon Center. PP is persisted per move per Pokémon.

## **6.5 Evolution**

All Pokémon evolve automatically at a species-specific level. Evolution cannot be prevented or triggered early; stones do not exist. Species that evolve by stone in mainline games are assigned a fixed level (e.g. Pikachu → Raichu at 36, chosen to coincide with the second item slot).

## **6.6 The Party and PC Box**

* The party holds up to `maxPartySize` Pokémon. *(Implementation note: party-size growth was previously tied to boss floors, which have been removed. A new growth trigger — e.g. a trainer-level or catch-count milestone — is to be defined; the live build currently uses a fixed starting size.)*
* The **PC Box** is unlimited. Box Pokémon earn nothing — only party Pokémon grow.
* The **Lead** is the Pokémon the player enters battle with; during battle any party member can be made active via the carousel (see §4.6). EXP follows the damage-proportional rule in §4.7.
* **Per-member HP in battle.** Each party member keeps its own HP as the player switches; every member's HP is persisted at battle end (a member that fainted stays fainted at 0 HP). When the active member faints the next healthy one is sent out automatically; the player blacks out only when the whole party has fainted — at which point all members are returned to town at 0 HP to be healed at the Pokémon Center.

## **6.7 Catching**

The catch screen shows two visible inputs and one new informational panel:

* **Ball tier** (Poké/Great/Ultra) — the base catch rate.
* **HP zone colour** — green (high HP, low catch), orange (below 50%, moderate), red (below 25%, high).
* **Already-caught indicator** — a panel beside the chance indicator that tells the player whether this species is already in their collection ("New! You haven't caught *X* yet" vs "You've already caught *X*").

The catch math is a level-scaled **addition** puzzle (identical difficulty to a battle hit at that opponent level). Catch success probability is computed by the engine from the species' capture rate, the ball's base rate, and the opponent's current HP, multiplied by the answer-accuracy factor (1.0 correct, 0.75 wrong). A successfully weakened-then-caught Pokémon lets the weakener keep its earned EXP (see §4.7).

# **7. Progression and Economy**

## **7.1 Growth Axes**

| Axis | Mechanism | Math involved |
| :---- | :---- | :---- |
| Leveling | Damage-proportional EXP → level up → stat increase (+ item slot milestones) | EXP accumulation; stat formula |
| Items (Phase 2) | Drops → identify → equip → stat bonus | Identification puzzles; stat comparison |
| Team building | Catch Pokémon with type coverage | Type chart; stat comparison |
| Math accuracy | Correct → full damage → fewer Potions → tougher opponents | All curriculum math |

## **7.2 Economy**

Single currency — Pokédollars (₽).

### **Income**

| Source | Amount | Available from |
| :---- | :---- | :---- |
| Wild Pokémon **defeated** | ⌊opponent level × 12⌋ | Start of game |
| Selling identified items | 30% of estimated item value | Item system activation |

Money is awarded **only on defeat** — never on catch or flee.

### **Spending**

| Item | Price |
| :---- | :---- |
| Potion (+20 HP) | ₽300 |
| Super Potion (+60 HP) | ₽700 |
| Hyper Potion (+120 HP) | ₽1200 |
| Poké Ball (40% catch) | ₽200 |
| Great Ball (60% catch) | ₽600 |
| Ultra Ball (80% catch) | ₽1200 |

## **7.3 EXP and Leveling**

Medium-Fast curve: total EXP to reach level N = N³. The EXP value of an opponent is `⌊Base EXP × opponent level ÷ 7⌋`, distributed across hits in proportion to damage (see §4.7).

## **7.4 Trainer Card**

Personal progress dashboard — no social features. The live build shows:

* **Correct** — total problems solved.
* **Streak** — longest accuracy streak.
* **Caught** — total Pokémon caught.
* **Top Lv** — the highest opponent level ever encountered (persisted in game state).

Accuracy-by-topic is still tracked under the hood for a future teacher/parent dashboard.

# **8. User Interface Specification**

## **8.1 UI Design Principles**

* One number at a time. Green means better; red means worse. Numbers always carry their label and source. Every equation answer produces a visible change within ~500 ms. No item-system UI appears before activation.

## **8.2 Town Hub**

* **Pokémon Center**: one-tap full heal (HP + PP). Always available.
* **Pokémart**: Potions and Balls. Always available.
* **Professor Oak's Lab**: identification queue. Locked until the item system activates (first Pokémon level 20).
* **PC Terminal**: party and PC Box management. Always available.
* **Dungeon Entrance**: enters the endless wild-encounter stream. Always available.
* **Trainer Card**: Correct / Streak / Caught / Top Lv (see §7.4).

Party members are shown as cards with an enlarged, drop-shadowed sprite, name/level, type badge, rarity tag, HP and EXP bars, and Atk/Def/Spd chips. The lead is shown with a larger sprite and a highlighted frame (no separate text tag).

## **8.3 Dungeon**

* A top bar shows the party strip (tap a member to make it the Lead) and the player's potions and Pokédollars.
* The current wild Pokémon is shown on an encounter card: enlarged sprite, name, level, type badge(s), rarity tag, HP, and Atk/Def/Spd chips, with a single rarity indicator. An **Attack/Fight** button starts the battle; **Return to Town** exits.
* After a victory the card shows the EXP gained per participating Pokémon and the Pokédollars earned, then offers the next encounter.

## **8.4 Battle Screen**

See §4.1 and §4.8 for the layout: opponent panel on top, the trainer **Focus** strip, the active Pokémon's panel (party **carousel** + move list), then Ball / Potion / Flee. The ball view includes the catch-chance indicator and the already-caught indicator.

## **8.5 Identification / Equip Screens (Phase 2)**

Not accessible before item-system activation. Layout unchanged from v1.3 §8.3–8.4 (identification has no timer; equip shows stat-comparison, math-breakdown, and item-slot tabs).

# **9. Extensibility Map**

Every simplified mechanic has a documented extension path, now triggered by **Pokémon/opponent level** rather than floor depth.

| Mechanic | Simplified core | Extension trigger | Full version |
| :---- | :---- | :---- | :---- |
| Math curriculum | Addition then subtraction, level-banded | Opponent level thresholds | Multiplication → division → order of ops → fractions → percentages → algebra, as new level bands |
| Item system | Hidden until Pokémon level 20 | First Pokémon level 20 | Drops, slots, identification, equip |
| Item slots | 1 / 2 / 3 at lv 20 / 36 / 50 | Pokémon level | Multi-item optimisation |
| Type chart | 6 types | Opponent level | Full 18-type chart |
| STAB / dual-type | STAB ×1.5 applied | Later | Shown explicitly as math |
| Speed / turn order | Faster acts first (live) | — | Full speed display each turn |
| Party size | Fixed (growth trigger TBD) | New milestone TBD | Up to 6 Pokémon |
| Status conditions | Status moves modify stats | Later | Catch-rate and battle modifiers |
| Mid-battle switching | Free carousel switch (live) | — | Switch as a costed turn action (v1.3 design) |
| Trainer battles / Gyms | Removed | Later | Math-boss encounters |

## **9.1 Difficulty (live build)**

The live build uses a single default tuning: a level-based battle timer (8 s → 4 s) and 75% partial credit on a wrong/expired answer. The Explorer / Trainer / Champion difficulty presets from v1.3 remain a design option layered on top of these values.

# **10. Narrative and Characters**

Unchanged from v1.3. The player is a junior researcher under Professor Oak; the Dungeon is an ancient ruin beneath Oak's island lab. Oak sends field notes (Phase 1) and runs identification and coaching (Phase 2), never saying the child got something "wrong" — only "partial" or "approximate". A non-battling Rival provides narrative texture; a Mart Clerk handles purchases.

# **11. Technical Implementation Notes**

**Stack:** React 18 · Vite 5 · TypeScript 5 · React Router 6 (hash router) · Zustand 4 · Dexie 3 (IndexedDB) · vite-plugin-pwa. Mobile-web, max 420 px wide, installable as a PWA.

## **11.1 Math Problem Generation**

Addition puzzles are generated at runtime from the opponent's level (see §3). Each puzzle has exactly one whole-number answer. The same generator serves both attack and catch puzzles.

## **11.2 Item System State**

Activation is derived from party state: the item system is active once any owned Pokémon is level 20 or higher. This single condition gates wild-Pokémon item assignment, drop generation, the identification and equip screens, Professor Oak's lab, and the bag icon on enemy cards.

## **11.3 Damage Calculation**

The damage formula (§4.2) is evaluated by the engine. Item Bonus is zero while the item system is inactive. Type multipliers come from the simplified six-type chart; unknown pairs are ×1.

## **11.4 Save State**

Game state is persisted to IndexedDB (Dexie). It holds: trainers (each with caught Pokémon, party, lead, max party size, Pokédollars, Pokéballs, potions, stats, the **rarity bag** — the remaining rarity tickets, see §6.2 — and the **Focus** meter, see §4.4), the active trainer id, and settings. Each owned Pokémon stores its species id, total EXP, current HP (every party member's HP is written back at battle end), and per-move PP; level and stats are derived. Trainer stats include total problems attempted/solved, current and longest streak, total battles, total catches, **highest opponent level encountered**, and per-topic accuracy. There is **no** floor-progress field. Autosave is debounced and runs on state changes and screen transitions. A `/reset` route clears the save and starts a new game.

## **11.5 Build & Deployment**

`npm run dev` / `npm run build` / `npm run preview` / `npm run typecheck`. The app deploys to GitHub Pages via a GitHub Actions workflow; the Vite `base` is set from the repo name at build time, and runtime asset URLs (sprites, balls, items) are prefixed with the base. Hash routing is used so deep links and refreshes work on Pages.

# **12. Appendix: Quick Reference**

## **12.1 Live Build — What Is and Is Not Present**

| Mechanic | In live build? | Notes |
| :---- | :---- | :---- |
| Turn-based battles | Yes | Actions: Attack, Ball, Potion, Flee |
| Endless wild encounters | Yes | One opponent at a time; no floors/rooms/map |
| Opponent level = party-high ±1 | Yes | Drives difficulty and rewards |
| Addition + subtraction curriculum by level | Yes | See §3 |
| Level-based battle timer | Yes | 8 s → 4 s |
| Partial credit (75%) | Yes | Wrong/expired answers |
| Damage formula | Yes | Item Bonus = 0 until activation |
| STAB ×1.5 | Yes | Move type matches attacker type |
| Charged crit ×2 | Yes | Five-pip trainer Focus meter (persisted; carries across switches + battles) |
| Status moves (stat modifiers) | Yes | Shown on stat chips, coloured |
| Speed-based turn order | Yes | Faster first; enemy opening strike |
| Incremental damage-proportional EXP | Yes | Kept by weakener even if enemy is caught |
| Money on defeat only | Yes | ⌊level × 12⌋ |
| Potions (+20/60/120) | Yes | Correct HP restoration |
| Poké Balls (40/60/80%) | Yes | Catch math = level-scaled addition |
| Already-caught indicator | Yes | In the ball view |
| Pokémon rarity (5 tiers) | Yes | From capture rate; shown as a tag |
| All 151 Gen-1 Pokémon | Yes | Config in `pokemon.json` |
| Rarity-bag encounters | Yes | Persisted 100-ticket bag (55/27/12/5/1); every rarity guaranteed per 100; no level bands |
| Lead via party strip + battle carousel | Yes | Free mid-battle switching; per-member HP |
| Blackout → fainted Pokémon at 0 HP, no money lost | Yes | Heal at the Pokémon Center before re-entering |
| Trainer Card (Correct/Streak/Caught/Top Lv) | Yes | Top Lv persisted |
| PC Box | Yes | Unlimited; box Pokémon don't grow |
| Item system (Phase 2) | Designed, level-gated | Activates at first level 20 |
| Dungeon floors / rooms / boss rooms | No | Removed in v1.4 |
| Floor-based soft gating | No | Replaced by level scaling |
| Multiplication/division/etc. tiers | No | Extension path only |
| In-battle switching | No | Lead chosen pre-battle |
| Party-size growth | Not yet | Trigger to be redefined |
| TMs / stones / trainer battles / multiplayer | No | Long-term extensions |

## **12.2 Curriculum at a Glance**

| Opponent level | Operation | Notes |
| :---- | :---- | :---- |
| 1–2 | addition | result up to 10 |
| 3 | addition | result 10–20 |
| 4 | addition | result up to 50, one addend 0–9 |
| 5 | addition | result 20–50 |
| 6 | addition | result 40–100 |
| 7 | subtraction | operands ≤ 10, no negative |
| 8 | subtraction | operands ≤ 20, no negative |
| 9 | subtraction | operands ≤ 50, no negative, no borrow |
| 10 | subtraction | operands ≤ 50, no negative, borrow required |
| 11 | subtraction | operands ≤ 10, negatives allowed |
| 12 | subtraction | operands ≤ 20, negatives allowed |
| 13+ | subtraction | operands ≤ 50, negatives allowed |

## **12.3 Type Chart — Simplified Core (6 Types)**

| Attacker → | vs Normal | vs Fire | vs Water | vs Electric | vs Grass | vs Rock |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| Normal | ×1 | ×1 | ×1 | ×1 | ×1 | ×0.5 |
| Fire | ×1 | ×0.5 | ×0.5 | ×1 | ×2 | ×2 |
| Water | ×1 | ×2 | ×0.5 | ×1 | ×0.5 | ×2 |
| Electric | ×1 | ×1 | ×2 | ×0.5 | ×0.5 | ×1 |
| Grass | ×1 | ×0.5 | ×2 | ×1 | ×0.5 | ×2 |
| Rock | ×1 | ×2 | ×1 | ×1 | ×1 | ×1 |

Pairs involving any type outside these six default to ×1.

## **12.4 Economy at a Glance**

| Category | Detail | Amount / Price |
| :---- | :---- | :---- |
| Income | Wild Pokémon **defeated** | ⌊opponent level × 12⌋ |
| Income | Selling identified items (Phase 2) | 30% of item value |
| Spending | Potion / Super / Hyper | ₽300 / ₽700 / ₽1200 |
| Spending | Poké / Great / Ultra Ball | ₽200 / ₽600 / ₽1200 |
