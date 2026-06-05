  
**MathDex**

A Pokémon-Inspired Mathematics Learning Game

*Full Game Design Specification  ·  v1.3*

*Revised: Dungeon navigation system added.*

*Switching mechanic added. XP participation rule confirmed.*

Target audience: ages 9–11

Math scope: addition through introductory algebra

Genre: Dungeon crawler RPG with loot-driven progression

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
| Economy revised | 7 | Income: wild drops \+ item selling. Spending: Potions and Balls only. |

## **v1.1 → v1.2**

Changes made in second design review:

| Change | Affected sections | Rationale |
| :---- | :---- | :---- |
| Item system hidden until first Pokémon reaches level 20 | 2,5,7,8,9,12 | Removes item complexity from early game entirely. Child bonds with Pokémon and battle math before any loot system appears. |
| Symmetric item rule added | 5 | Wild Pokémon carry and drop items if and only if the player has at least one item slot. Items either exist fully or not at all. |
| First item gifted by Professor Oak (pre-identified) | 5,10 | Tutorial introduction to item system. Child sees equip screen before seeing identification screen. |
| Item slots changed from floor-based to per-Pokémon level-based | 5,9,12 | Slot 1 at level 20, slot 2 at level 36, slot 3 at level 50\. Rewards individual Pokémon development, not global floor progress. |
| Berry introduction tied to item system activation | 5 | Berries are held items — they cannot exist before item slots do. Removed floor 20 boss trigger. |
| Item selling tied to item system activation | 7,12 | Selling becomes available when items first appear, not at a fixed floor. |
| Boss floor table cleaned | 2 | Removed item slot references from floor 40 and 60 rows. Berry items removed from floor 20 row. |
| Professor Oak lab note added | 8 | Lab is locked and unavailable until item system activates. |

## **v1.2 → v1.3**

Changes made in third design review:

| Change | Affected sections | Rationale |
| :---- | :---- | :---- |
| Dungeon navigation system specified | 2,8,12 | Floor-by-floor map with room nodes. Player sees only current floor. Rooms are mandatory or optional. Tap to trigger encounter. |
| Room types defined | 2,8 | Encounter, chest, rest point, and stairs rooms. Mandatory rooms gated in sequence. Optional rooms skippable. |
| Dungeon top bar shows full party HP | 8 | All party Pokémon shown with HP bars. Lead Pokémon (currently in battle) shown prominently. Dynamic LEAD indicator updates on switch. |
| Switching added as 5th battle action | 4 | Player can switch active Pokémon during battle. Costs the player's turn — wild Pokémon still attacks after switch. |
| XP participation rule confirmed | 4,6,7 | All Pokémon that were sent out during a battle receive the full EXP amount. Pokémon that remained in reserve receive nothing. Split XP is not used. |
| Equip flow redesigned | 8 | Party list first → select Pokémon → view slots and stats → open item browser. More intuitive than the previous single-Pokémon view. |
| Party size at floor 8 clarified | 6 | Party of 3 at floor 8 (2 starting \+ 1 from floor 5 boss). 4th slot unlocks at floor 15 boss. |

# **1\. Vision and Design Philosophy**

MathDex is a dungeon-crawling Pokémon-style game in which every act of progression — attacking, identifying loot, equipping items, catching Pokémon — is gated or enhanced by solving arithmetic problems. The core insight driving the design is that mathematics should be load-bearing, not decorative. Equations are not doors to pass through before the fun begins; they are the mechanism that generates the fun.

The primary inspiration is Diablo's loot loop: fight enemies, collect drops, identify items, optimise builds, go deeper. Every element of that loop has been mapped onto Pokémon's existing mechanics, with a mathematics layer woven into each junction point.

## **1.1 Core Design Principles**

* **Math as mechanism, not gate. Answering correctly makes numbers bigger. That is the game.**

  * Incorrect answers still produce a result — a weaker one. The child never hits a wall; they hit a floor.

* **One number at a time. A 9-year-old can engage with one interesting number per moment.**

  * The battle UI shows one equation. The identification screen shows one puzzle. The equip screen shows one comparison.

* **Complexity unlocks with depth. The simplified core is complete and satisfying. Advanced mechanics arrive one at a time as the child progresses.**

* **Visible consequence. Every stat traces back to a puzzle the child solved. The math result is the game result.**

* **Extensibility over addition. Every simplified mechanic has a documented extension path so the game can grow with the player.**

* **Systems are all-or-nothing. A system is either fully present or fully absent. No system appears in partial form.**

  * The item system is the primary example: before activation it is completely invisible. After activation it is fully operational.

## **1.2 What This Game Is Not**

* Not a quiz with a Pokémon skin. Equations appear inside the action, not before it.

* Not a punishment system. Mistakes reduce rewards, never block progress.

* Not front-loaded. A 9-year-old can understand the entire core loop in a 10-minute tutorial.

* Not a faithful Pokémon clone. Many mechanics are deliberately simplified or removed.

| Design test: Can a child who has never played before understand what to do within 5 minutes, feel successful within 10 minutes, and want to return within 30 minutes? Every design decision should be evaluated against this test. |
| :---- |

# **2\. Core Game Loop**

The game operates between two locations: the Town (hub) and the Dungeon (action). Each has a distinct emotional register. Town is calm and preparatory. The dungeon is fast and exciting. The game has two distinct phases based on whether the item system has been activated.

## **2.1 Phase 1 — Battle-Only (Before Item System Activation)**

This phase lasts from the start of the game until the first Pokémon in the player's party reaches level 20\. During this phase the item system does not exist in any form — no slots, no drops, no identification screen, no equip screen. Professor Oak's lab is closed.

1. Enter town. Heal at the Pokémon Center (free). Buy Potions and Balls at the Mart.

2. Enter dungeon. Choose a floor block based on current unlocks.

3. Battle wild Pokémon. Choose a move, solve the equation, see the result. Flee at any time.

4. Defeat: earn EXP and Pokédollars. No item drops.

5. Boss room every fifth floor. Defeating it unlocks the next floor block.

6. Return to town when HP or Potions are depleted. Blackout returns child to town, losing half Pokédollars.

## **2.2 Phase 2 — Full Loop (After Item System Activation)**

Triggered when the first Pokémon reaches level 20\. Professor Oak sends a field note and gifts the first pre-identified item directly. From this point the full loop is active.

7. Enter town. Heal at Pokémon Center. Buy supplies at Mart. Visit Professor Oak's lab to identify queued mystery items. Review party on equip screen.

8. Enter dungeon. Choose a floor block.

9. Battle. Wild Pokémon now carry items visible as a bag icon on their encounter card.

10. Defeat: EXP \+ Pokédollars \+ one mystery item drop. Catch: Pokémon joins party with its held item (also unidentified). Flee: nothing.

11. Boss room: guaranteed Rare or above item drop in addition to regular defeat drop.

12. Return to town. Identify loot with Professor Oak. Equip items. Stronger Pokémon — deeper floors — harder math — better loot.

| The item system is symmetric: wild Pokémon carry and drop items if and only if at least one of the player's Pokémon has an item slot. If the player has slots, enemies have items. If the player has no slots, enemies carry nothing. The systems are always in balance. |
| :---- |

## **2.3 Soft Gating — Floor Progression**

Floors are unlocked by defeating boss rooms, not by math scores. Survival requires accurate math, so fluency and floor progression are the same thing — never stated explicitly.

| Boss floor | Unlocks | Additional unlock |
| :---- | :---- | :---- |
| Floor 5 | Floors 6–10 | 3rd Pokémon party slot |
| Floor 10 | Floors 11–15 | Multiplication math tier |
| Floor 15 | Floors 16–20 | 4th Pokémon party slot |
| Floor 20 | Floors 21–25 | Division math tier |
| Floor 25 | Floors 26–30 | 5th Pokémon party slot |
| Floor 30 | Floors 31–35 | Order of operations math tier · Dual types appear |
| Floor 35 | Floors 36–40 | 6th Pokémon party slot |
| Floor 40 | Floors 41–45 | Fractions math tier |
| Floor 45 | Floors 46–50 | — |
| Floor 50 | Floors 51–55 | Percentages math tier |
| Floor 55 | Floors 56–60 | — |
| Floor 60 | Floors 61+ | Algebra math tier |

Note: Item system activation, Pokémon evolution levels, and item slot unlocks are all per-Pokémon milestones — not boss floor milestones. They occur independently of floor progression based on individual Pokémon levels.

The child may return to any previously unlocked floor at any time. Earlier floors function as grinding grounds — more EXP, easier math, less Potion drain.

## **2.4 Dungeon Navigation — The Floor Map**

The dungeon is navigated floor by floor. On each floor the player sees a single horizontal path of 3–5 rooms shown as tappable nodes. The player never sees the contents of the next floor until they descend — future floors are shown only as a dark tile labelled Unknown.

Tapping a room node opens a bottom sheet showing the encounter details before committing. The player then chooses to Fight or Flee. This two-step approach means every battle is a conscious decision, never an accidental one.

## **2.5 Room Types**

| Room type | Icon | Contents | Mandatory? |
| :---- | :---- | :---- | :---- |
| Encounter | ⚔️ | One wild Pokémon battle. Level and type visible on the node before entering. | Some are mandatory, some optional |
| Chest | 📦 | One mystery item (unidentified). Awarded immediately on entering the room. | Optional |
| Rest point | 🏕️ | HP and PP fully restored. Appears after every 5-floor boss clear. | Mandatory (it is the floor) |
| Stairs | ⬇️ | Descend to the next floor. Available only once all mandatory rooms on the current floor are cleared. | Mandatory to progress |
| Boss room | 👑 | Single high-level Pokémon. Harder math. Guaranteed Rare+ drop. Unlocks next floor block. | Mandatory |

| Mandatory rooms are marked with a yellow \! badge on the node. Optional rooms have no badge. The child can skip optional rooms entirely — they offer more EXP and loot but cost HP. This is the core dungeon resource decision. |
| :---- |

## **2.6 The Lead Pokémon**

At any time one Pokémon is the Lead — the one currently active in battle. All other party members are Reserves. The Lead is shown prominently in the dungeon top bar with a LEAD badge and a slightly larger sprite. When the player switches, the badge and prominence move to the new Pokémon immediately.

If the Lead Pokémon faints (HP reaches 0), the next party member automatically steps in. If all party Pokémon faint, the player blacks out and is returned to town, losing half their current Pokédollars.

## **2.7 The Boss Room**

* Visually distinct room — darker atmosphere, brief pause before encounter.

* Professor Oak field note on entry: one line of flavour establishing stakes.

* Boss Pokémon has a star indicator — familiar UI with a new marker.

* Boss math puzzles use the hardest problems from the current floor range's curriculum tier.

* Boss has higher HP — more turns, more math puzzles per fight.

* Clearing: next five floors unlock, guaranteed Rare+ item drop (if item system active), celebratory screen.

* Failing (blackout): no floor unlock, return to town, retry after healing.

## **2.5 The Diablo Parallel**

| Diablo mechanic | MathDex equivalent | Math moment |
| :---- | :---- | :---- |
| Kill enemies for XP | Defeat wild Pokémon for EXP | Move power equation per attack |
| Loot drops from enemies | Mystery items drop once item system is active | Identification puzzles unlock stats |
| Identify items (Deckard Cain) | Professor Oak identification screen | Progressively harder math per rarity |
| Equip and compare gear | Equip screen with stat bars | Addition comparison old vs new stats |
| Build optimisation | Party and item slot strategy | Multi-stat arithmetic planning |
| Deeper dungeons \= better loot | Deeper floors \= rarer drops \+ harder math | Curriculum scales with depth |
| Health potions as resource | Potions limit dungeon depth | HP subtraction \+ budget arithmetic |
| Boss encounters | Boss room every 5 floors | Hardest math of that floor block |

# **3\. Mathematics Curriculum**

The math curriculum is structured around dungeon floor depth. Each floor range introduces exactly one new concept while keeping all previous concepts active. Complexity accumulates gradually across weeks of play.

## **3.1 Floor-by-Floor Curriculum Map**

| Floors | Math topic | Where it appears | Extension path |
| :---- | :---- | :---- | :---- |
| 1–10 | Addition & subtraction (to 100\) | Battle move power puzzles; HP subtraction; Potion budgeting | Larger numbers, carrying |
| 11–20 | Multiplication tables (×2 to ×10) | Type effectiveness (×2); move power scaling | Multi-digit multiplication |
| 21–30 | Division; intro to remainders | PP tracking; EXP-per-battle estimation; item selling (30% of value) | Long division, fractions |
| 31–40 | Order of operations (BODMAS) | Compound move power: (base \+ item) × type modifier | Nested brackets |
| 41–50 | Fractions | Catch rate calculation; Berry HP restoration (25% of max) | Fractions of larger numbers |
| 51–60 | Percentages | Percentage item bonuses; STAB ×1.5 shown as math from floor 51 | Percentage of a percentage |
| 61+ | Introductory algebra | Legendary item identification; damage prediction | Two-step equations |

Note on floors 31–40: The order of operations formula (base \+ item) × type only applies if the item system is active. For players who have not yet reached Pokémon level 20, the formula remains base × type at this floor range. The curriculum still works — the item bonus term simply equals zero.

## **3.2 Difficulty Scaling Within a Floor Range**

* Number size: floor 1 addition uses numbers to 20; floor 10 addition uses numbers to 100\.

* Time pressure: battle puzzles start at 8 seconds (floor 1), scaling to 4 seconds (floor 40+). Identification puzzles are always untimed.

* Answer precision: early floors accept ±1. Later floors require exact answers.

## **3.3 Partial Credit Design**

* Battle puzzles: correct \= 100% move power. Incorrect or time expired \= 75% power.

* Identification puzzles: correct \= full stat unlocked. Incorrect \= partial stat (approximately 60% of full value).

* No puzzle produces a zero outcome. The child always makes progress.

| Pedagogical note: Spaced repetition occurs naturally through grinding. A child farming floor 15 solves dozens of multiplication problems per session without perceiving it as drilling. The game is the spaced repetition system. |
| :---- |

# **4\. Battle System**

## **4.1 Battle Structure**

Battles are turn-based. Each turn the player chooses one of four actions: Fight, Throw Ball, Use Item, or Flee. The wild Pokémon acts automatically after the player's action with a randomly selected move. In the simplified core the player always acts first regardless of Speed. Speed comparison for turn order unlocks at floor 31+.

## **4.2 Simplified Damage Formula**

| Damage \= (Move Power \+ Item Bonus) × Attacker Atk ÷ Defender Def × Type Multiplier × STAB ÷ 50 |
| :---- |

Item Bonus is zero until the item system activates. The formula is identical in both phases — the item term simply contributes nothing in Phase 1\.

| Component | Introduced | Math required | Extension |
| :---- | :---- | :---- | :---- |
| Move Power | Floor 1 | Reading a number | Larger values |
| Item Bonus | Item system active | Addition | Percentage bonuses (floor 51+) |
| Atk ÷ Def ratio | Floor 11 | Division (simplified) | Full ratio as fraction (floor 31+) |
| Type Multiplier ×2 | Floor 11 | Multiplication | Dual-type stacking (floor 31+) |
| STAB ×1.5 | Floor 21 (visual) | Fractions shown floor 51+ | Math shown from floor 51+ |
| ÷50 scaling | Always | Hidden — engine handles | Exposed in Math Breakdown tab |

## **4.3 The Battle Math Puzzle**

* When the player selects a move, an equation appears based on that move's power calculation.

* Timer: 8 seconds at floor 1, scaling to 4 seconds at floor 40+.

* Correct: move fires at 100% power. Focus meter advances one pip.

* Incorrect or expired: move fires at 75% power. Focus meter resets to zero.

## **4.4 Focus Meter and Critical Hits**

The Focus Meter has five pips. Each consecutive correct answer fills one pip. At five pips, the next correct answer triggers a Critical Hit (×1.5 damage) and resets the meter. This rewards sustained accuracy without requiring the child to understand the mechanic explicitly.

## **4.5 Enemy Attacks**

Enemy attacks use the same damage formula with attacker and defender swapped. Damage is applied to the player's Pokémon HP immediately after the player's action resolves. Enemy Item Bonus is zero until the item system is active — at which point wild Pokémon may carry items that boost their own stats.

| Extension path (floor 31+): Speed comparison introduced. Both Speed stats are briefly displayed before each turn. The faster Pokémon acts first. Introduces turn order as a number comparison problem. |
| :---- |

## **4.6 Switching Pokémon**

Switching is a full turn action — the wild Pokémon attacks after the switch resolves. The player opens the party panel, selects a reserve Pokémon, and the new Pokémon steps in. The Lead indicator updates immediately.

* Switching is available from Turn 1\. No restriction on when the player may switch.

* The incoming Pokémon takes the wild Pokémon's counter-attack. This is the strategic cost.

* A fainted Pokémon cannot be switched in. Player must choose from healthy reserves.

* If the Lead faints mid-battle, the switch panel opens automatically.

| The switching decision is a natural type-chart reasoning moment. Facing a Fire-type enemy, the child sees their Water Pokémon has a ×2 advantage and switches. That decision requires reading the matchup bar, understanding type effectiveness, and predicting incoming damage — all curriculum skills in action. |
| :---- |

## **4.7 XP Distribution — Participation Rule**

Every Pokémon sent out during a battle receives the full EXP amount upon defeat. Pokémon that stayed in reserve receive nothing. XP is never split — each participant receives the complete amount independently.

| Scenario | Pikachu (lead all battle) | Charizard (switched in) | Vaporeon (stayed in reserve) |
| :---- | :---- | :---- | :---- |
| EXP awarded | Full amount | Full amount | Zero |
| EVs awarded | Full amount | Full amount | Zero |
| Example vs Lv22 Growlithe | 240 EXP | 240 EXP | 0 EXP |

The post-battle victory screen shows EXP awarded per participant. Each Pokémon's EXP bar fills visibly. The child sees the direct connection between switching and their reserve Pokémon growing.

## **4.8 Battle UI Components**

* Opponent card: name, level, type badge, HP bar, stats, rarity star (boss), bag icon (if carrying item and item system active).

* Player card: same fields plus Focus Meter pips.

* Matchup bar: type effectiveness, Speed comparison (floor 31+), turn order indicator.

* Battle log: italic text showing last action result in plain language.

* Contextual panel: Action / Move / Math / Catch — swaps based on current decision.

* Damage floater: animated number over enemy card after each hit.

# **5\. Loot and Item System**

## **5.0 Item System Activation**

The item system is completely hidden until triggered. Before activation, item slots do not exist, wild Pokémon carry nothing, no items drop, the identification screen does not exist, the equip screen does not exist, and Professor Oak's lab is closed.

Activation trigger: the first Pokémon in the player's party reaches level 20\.

| Stage | What happens |
| :---- | :---- |
| Any Pokémon reaches level 20 — activation | Professor Oak sends a field note: 'Your Pokémon has grown strong enough to channel the energy of a held item. I've found something in the ruins.' The lab unlocks in town. |
| Professor Oak gifts the first item | A pre-identified Common item is given directly — no puzzle required. The child sees the equip screen for the first time, watches one stat bar grow, and understands what items do before encountering the identification screen. |
| Wild Pokémon begin carrying items | From this moment, all wild Pokémon encountered carry items (shown as a bag icon). Defeating them drops a mystery item. Catching them transfers their held item. The world shifts completely and consistently. |
| Identification screen unlocks | The second item the child finds is a mystery item requiring Professor Oak's identification. This is the intended first exposure to the identification puzzle — after the system has been demonstrated, not before. |

| Symmetric item rule: wild Pokémon carry and drop items if and only if at least one of the player's Pokémon has an item slot. The item system is always fully present or fully absent. There is no in-between state. |
| :---- |

## **5.1 Item Acquisition (Once System Is Active)**

* **Defeat drop: every defeated wild Pokémon drops exactly one mystery held item. Rarity determined by floor depth and Pokémon rarity tier.**

* **Catch transfer: a caught Pokémon's held item transfers to the bag unidentified and joins the identification queue.**

* **Boss drop: every defeated boss drops a guaranteed Rare or above mystery item in addition to the regular defeat drop.**

* **Oak's gift: the first item ever received, given pre-identified as a tutorial. This is the only pre-identified item in the game.**

| Consumables (Potions and Balls) are purchased at the Mart only. They never drop in the dungeon. Everything that drops from the dungeon is a mystery held item. |
| :---- |

## **5.2 Item Rarity Tiers**

| Tier | Colour | Stat slots | Math level | Drop frequency |
| :---- | :---- | :---- | :---- | :---- |
| Common | Gray | 1 | Addition / subtraction | Most frequent — early item system |
| Uncommon | Green | 2 | Multiplication / division | Common from floor 20 |
| Rare | Blue | 3 | Order of operations | Floor 25+ regular drops; boss drops floor 10+ |
| Epic | Purple | 3 | Fractions & percentages | Floor 40+ regular drops |
| Legendary | Gold | 4 | Introductory algebra | Floor 60+ only; boss drops only |

## **5.3 Item Stat Schema**

### **Core stats — always visible before identification**

| Stat | Description | Example |
| :---- | :---- | :---- |
| Name | Hidden until identification complete | ??? → Volt Shard |
| Rarity tier | Always visible — determines math difficulty | Rare (blue) |
| Item type | Always held item in simplified core | Held item |
| Type affinity | Which Pokémon type it belongs to | Electric |
| Dropped by | Which Pokémon and floor | Magneton, Floor 24 |

### **Bonus stats — revealed through identification puzzles**

Each bonus stat corresponds to one of the six Pokémon stats or a type boost. The number of bonus stat slots scales with rarity tier. All flat-value bonuses use addition math. Type boosts use percentage math and only appear once the player is in the percentage curriculum range.

| Bonus stat | Effect in formula | Math type | Available from |
| :---- | :---- | :---- | :---- |
| HP bonus | Flat HP addition (+4 to \+25 depending on rarity) | Addition | Item system activation |
| Attack bonus | Added to Atk in damage formula | Addition | Item system activation |
| Defense bonus | Added to Def in damage formula (reduces damage taken) | Addition | Item system activation |
| Sp. Atk bonus | Added to Atk for special moves | Addition | Item system activation |
| Sp. Def bonus | Added to Def for special moves | Addition | Item system activation |
| Speed bonus | Affects turn order once Speed mechanic unlocks | Addition | Item system activation |
| Type boost | % damage increase for moves of matching type | Percentages | Floor 40+ (Epic tier) |
| Special effect | Conditional Legendary effect (see 5.3a) | Algebra / % | Floor 60+ |

### **5.3a Special effects — Legendary items only**

| Effect | What it does | Math moment |
| :---- | :---- | :---- |
| Recoil shield | Reduces recoil damage by 50% | Halving a number |
| Focus boost | Adds \+1 Focus pip on each correct battle answer | Counting / addition |
| PP recovery | Restores 5 PP to a move after each battle | Addition |
| Catch assist | Adds \+10% to all catch rates | Percentage addition |
| EXP share | Shares 25% of earned EXP to one extra Pokémon | Fractions |

## **5.4 The Identification Screen**

13. Item card displayed: name hidden, rarity and type affinity visible. Stat rows show ??? for each slot.

14. Professor Oak introduces the item with flavour text hinting at its purpose.

15. First puzzle appears. No timer. Hint button available without penalty.

16. Correct: full stat revealed and locked in. Incorrect: partial stat (approx. 60% of full value).

17. Professor Oak reacts — explains correct method for wrong answers, celebrates correct ones.

18. Next puzzle loads for next stat slot. Repeat until all slots solved.

19. Item name revealed. Equip button appears.

| The identification screen has no timer. This is the reward phase — anticipation and discovery. The tension comes from wanting to see the full stat, not from a countdown. |
| :---- |

## **5.5 Hint System**

Each identification puzzle has one available hint. The hint explains the method, not the answer — for example: 'Solve inside the brackets first, then divide the result.' Hints are always available and never penalised. A correct answer after a hint still awards the full stat value.

## **5.6 Item Slots — Per-Pokémon Progression**

Item slots are a per-Pokémon milestone, not a global player unlock. Each individual Pokémon gains slots by reaching specific levels. Two Pokémon in the same party can have different numbers of slots.

| Pokémon level | Item slots | Notes |
| :---- | :---- | :---- |
| 1–19 | 0 slots | Item system not yet active for this Pokémon (and globally if no Pokémon has reached 20\) |
| 20–35 | 1 slot | Activation level. First slot unlocks. If this is the first Pokémon to reach 20, it triggers global item system activation. |
| 36–49 | 2 slots | Coincides with evolution level for many Pokémon (e.g. Pikachu evolves at 36). Second slot arrives with evolution as a compound reward. |
| 50+ | 3 slots | Fully developed Pokémon. Third slot represents mastery of the individual team member. |

Example: A party of four at floor 35 might have Raichu (level 40, 2 slots), Charizard (level 38, 2 slots), Vaporeon (level 25, 1 slot), and Geodude (level 14, 0 slots). Item distribution across asymmetric slots is a richer arithmetic challenge than all Pokémon gaining slots simultaneously.

| The second slot arriving at level 36 is deliberate. For Pikachu, level 36 is also its evolution level — Raichu gains a stat jump, a new form, and a second item slot simultaneously. The evolution moment becomes the most rewarding event in the game. |
| :---- |

## **5.7 Consumables**

* Potions: Potion (+20 HP, ₽300), Super Potion (+60 HP, ₽700), Hyper Potion (+120 HP, ₽1200). In-battle use costs a turn; outside battle is free. Available from the start of the game — Phase 1 and Phase 2\.

* Poké Balls: Poké Ball (40% base, ₽200), Great Ball (60%, ₽600), Ultra Ball (80%, ₽1200). Available from the start of the game.

* Berries: held items that activate automatically on a condition. Available only once item system is active (first Pokémon level 20\) — they require an item slot to equip. Sitrus Berry restores 25% of max HP when HP drops below 50%. This is the first percentage-trigger mechanic the child encounters in the item system.

## **5.8 Potion Economy and Dungeon Depth**

Potions are the primary resource limiting dungeon depth across both phases. Each encounter depletes HP, which depletes Potion supply. The decision to push deeper is always an implicit arithmetic question: Potions remaining × HP restored per Potion vs expected HP cost per room ahead.

# **6\. Pokémon System**

## **6.1 Stats**

| Stat at level N \= floor((2 × Base \+ 15\) × N ÷ 100\) \+ 5     |     HP \= same formula \+ N \+ 10 |
| :---- |

IVs and EVs are removed in the simplified core. All Pokémon have 15 IVs and 0 EVs. Natures are neutral. Stats are fully predictable — a child can look at a base stat and the formula and calculate the result.

| Extension path (floor 41+): EVs introduced as an optional bonus layer via Professor Oak field notes. Not a required system. |
| :---- |

## **6.2 Types — Simplified Core**

The game launches with six types: Fire, Water, Grass, Electric, Normal, Rock.

| Attacking type | Super effective ×2 | Not very effective ×0.5 | No effect ×0 |
| :---- | :---- | :---- | :---- |
| Fire | Grass, Rock | Water, Fire | — |
| Water | Fire, Rock | Grass, Water | — |
| Grass | Water, Rock | Fire, Grass | — |
| Electric | Water | Grass, Electric | — |
| Normal | — | Rock | — |
| Rock | Fire | — | — |

| Extension path: Floor 21: Ground. Floor 31: Ghost, Psychic. Floor 41: Dragon, Dark, Steel, Ice. Floor 51: Fairy, Bug, Poison. Floor 61: Full 18-type chart. Each with a Professor Oak introduction. |
| :---- |

## **6.3 Moves**

Pokémon learn moves automatically at specific levels. No other acquisition method exists in the simplified core. When a fifth move would be learned, the game pauses and asks which existing move to forget. Forgotten moves are permanent in the simplified core.

PP is a visible counter per move. Warning at three remaining uses. Running out makes the move unavailable for the rest of the dungeon run. PP restores free at the Pokémon Center.

| Extension path (floor 30+): Wandering Move Tutor NPC in certain dungeon rooms teaches one move on the spot for free. No items, no economy. |
| :---- |

## **6.4 Evolution**

All Pokémon evolve automatically at a species-specific level. Evolution cannot be prevented or triggered early. Evolution stones do not exist. When evolution occurs, the equip screen displays before-and-after stat bars. The child sees both the stat jump and any additional item slot that arrives at the same level.

Pokémon that in mainline games require stones are assigned a fixed level. For example: Pikachu → Raichu at level 36\. This is chosen to coincide with the second item slot unlock, making evolution the single most rewarding moment in the game.

## **6.5 The Party and PC Box**

| Floor range | Party size | Unlocked by |
| :---- | :---- | :---- |
| 1–14 | 2 Pokémon | Start of game |
| 15–29 | 3 Pokémon | Floor 5 boss cleared |
| 30–44 | 4 Pokémon | Floor 15 boss cleared |
| 45–59 | 5 Pokémon | Floor 25 boss cleared |
| 60+ | 6 Pokémon | Floor 35 boss cleared |

The PC Box is unlimited. Box Pokémon earn nothing — no EXP, no levels, no evolution. Only party Pokémon grow.

### **Lead and Reserve Pokémon**

At any time one party Pokémon is the Lead — the one active in battle. All others are Reserves. The Lead is shown prominently in the dungeon top bar. Switching during battle makes a reserve Pokémon the new Lead. If the Lead faints the next party member steps in automatically.

EXP rule: every Pokémon sent out during a battle receives the full EXP amount. Pokémon that remained in reserve the entire battle receive nothing. XP is not split — each participant earns the complete amount independently. This makes switching strategically beneficial with no XP penalty.

## **6.6 Catching**

The simplified catch system shows two visible inputs: ball tier and HP zone colour. Green \= high health (low catch rate), orange \= below 50% (moderate), red \= below 25% (high). The math puzzle asks the player to calculate the effective catch percentage — an addition then comparison problem.

| Extension path (floor 31+): Status conditions added as catch rate modifiers (×1.5 paralysis/burn, ×2.5 sleep). Percentage multiplication arrives when the curriculum supports it. |
| :---- |

# **7\. Progression and Economy**

## **7.1 The Four Growth Axes**

| Axis | Mechanism | Math involved | Ceiling without others |
| :---- | :---- | :---- | :---- |
| Leveling | EXP → level up → stat increase \+ item slot milestones | EXP accumulation; stat formula | Hits wall at floor difficulty gap |
| Items | Dungeon drops → identify → equip → stat bonus | Identification puzzles; stat comparison | Under-leveled Pokémon still faint |
| Team building | Catch Pokémon with type coverage | Type chart; stat comparison across party | Wrong types blocked by immunities |
| Math accuracy | Correct → full damage → fewer Potions → deeper floors | All curriculum math | Poor accuracy \= can't defeat boss rooms |

## **7.2 Economy**

MathDex uses a single currency — Pokédollars (₽) — with two income sources and two spending categories.

### **Income**

| Source | Amount | Available from | Math moment |
| :---- | :---- | :---- | :---- |
| Wild Pokémon defeated | ₽20–200 (level \+ rarity) | Start of game — Phase 1 and 2 | Running total across a dungeon run |
| Selling identified items | 30% of estimated item value | Item system activation | Percentage calculation |

### **Spending**

| Item | Price | Available from | Math moment |
| :---- | :---- | :---- | :---- |
| Potion (+20 HP) | ₽300 | Start of game | Budget division: how many can I afford? |
| Super Potion (+60 HP) | ₽700 | Start of game | Value comparison: 60÷700 vs 20÷300 |
| Hyper Potion (+120 HP) | ₽1200 | Start of game | Opportunity cost vs other supplies |
| Poké Ball (40% catch) | ₽200 | Start of game | Counting: how many per run? |
| Great Ball (60% catch) | ₽600 | Start of game | Percentage comparison across tiers |
| Ultra Ball (80% catch) | ₽1200 | Start of game | Cost-benefit: worth 2× Great Ball? |

| There are no other currencies. No Floor Tokens, no Heart Scales. One currency, two income sources, two spending categories. A 9-year-old can hold the entire economy in their head simultaneously. |
| :---- |

## **7.3 EXP and Leveling**

Medium Fast EXP curve: total EXP to reach level N \= N³. EXP gained per battle: (Base EXP × enemy level) ÷ 7\. The formula is surfaced from floor 21+ as a teaching moment. Before that the game shows only the result.

## **7.4 Trainer Card**

Personal progress dashboard — no social or multiplayer features. Displays: total correct answers, longest accuracy streak, boss rooms cleared, Pokémon caught, highest floor reached, accuracy rate by math topic, and item slots unlocked across the party. The accuracy-by-topic field feeds the teacher/parent analytics dashboard described in Section 11\.

# **8\. User Interface Specification**

## **8.1 UI Design Principles**

* One number at a time. No screen demands the child track more than one changing value simultaneously.

* Green means better. Red means worse. Consistent across all screens.

* Numbers always have context. A stat without its label and source is never shown alone.

* Math results are game results. Every equation answer produces a visible change within 500ms.

* Systems are invisible until active. No UI element for the item system appears before item system activation.

## **8.2 Battle Screen**

* Opponent card: name, level, type badge, HP bar, stats, rarity star (boss), bag icon (if carrying item — only visible once item system is active).

* Player card: same fields plus Focus Meter pips.

* Matchup bar: type effectiveness, Speed comparison (floor 31+), turn order indicator.

* Battle log: last action result in plain language.

* Contextual panel: Action / Move / Math / Catch.

* Damage floater: animated number over enemy card after each hit.

## **8.3 Identification Screen**

Not accessible before item system activation. Professor Oak's lab door is visually closed and unselectable in the town hub.

* Professor Oak dialogue: reacts to every correct and incorrect answer with method explanation.

* Item card: icon, hidden name, rarity badge, type affinity, dropped-by. Stat rows show ??? until each puzzle is solved.

* Puzzle box: equation, hint button, answer input, confirm. No timer.

* Progress pips: one per stat slot, turning green (correct) or amber (partial) as solved.

## **8.4 Equip Screen**

Not accessible before item system activation.

* Stat comparison tab: six stats as bars. Item bonus shown as colour-coded bar extension. Delta pills (+N) on changed stats. Before/after preview toggled by checkbox.

* Math breakdown tab: full addition sentence for every stat (e.g. '50 base \+ 8 item \= 58'). Optional.

* Item slots tab: shows each Pokémon's slots with their current level and how many slots that level entitles them to. Empty slots show the next unlock level.

## **8.5 Town Hub**

* Pokémon Center: one-tap heal. Shows before/after HP for all party members. Always available.

* Pokémart: Potions and Balls only. Running total displayed as items are selected. Always available.

* Professor Oak's Lab: identification queue. Locked and visually closed before item system activation. Unlocks when first Pokémon reaches level 20\.

* PC Terminal: party management and Box access. Always available.

* Dungeon Entrance: floor select showing unlocked blocks and boss floor indicators. Always available.

# **9\. Extensibility Map**

Every simplified mechanic has a documented extension path triggered by floor depth or Pokémon level. The child's engagement and survival determine when complexity arrives, not a fixed schedule.

## **9.1 Mechanics Extension Table**

| Mechanic | Simplified core | Extension trigger | Full version | Math added |
| :---- | :---- | :---- | :---- | :---- |
| Item system | Hidden until Pokémon level 20 | First Pokémon level 20 | Fully active with drops, slots, identification | Addition (flat bonuses) |
| Item slot 1 | Level 20 per Pokémon | Pokémon level 20 | First held item slot | Addition (stat bonus) |
| Item slot 2 | Level 36 per Pokémon | Pokémon level 36 | Second held item slot | Multi-item stat addition |
| Item slot 3 | Level 50 per Pokémon | Pokémon level 50 | Third held item slot | Three-item optimisation |
| Type chart | 6 types | Floors 21–61 (staged) | 18 types | Cumulative type relationships |
| Dual-type damage | Not present | Floor 31 | Both modifiers multiply | Fraction × fraction |
| STAB math | Visual effect only | Floor 51 | ×1.5 shown in damage equation | Multiplying by 1.5 |
| Speed / turn order | Player always first | Floor 31 | Speed comparison determines order | Number comparison |
| EVs | Removed | Floor 41 | Optional bonus layer | Addition up to 252; ÷4 |
| Party size | 2 Pokémon | Boss floors 5–35 | Up to 6 Pokémon (staged) | Team management complexity |
| Catch formula | Visual zones only | Floor 31 | Full multiplier chain | Percentage multiplication |
| Status conditions | Not present | Floor 31 | Affect catch rate and battles | Percentage modifiers |
| PP management | Warning at 3 remaining | Floor 21 | Strategic conservation planning | Division planning |
| Move Tutor | Not present | Floor 30 | Dungeon room NPC — exploration reward | None added |
| TMs | Removed | Floor 40+ optional | Optional late-game shop | Currency division |
| Trainer battles | Removed | Floor 50+ (Gyms) | Math-boss Gym encounters | Hardest curriculum per Gym |
| Natures | Removed | Floor 50+ | ±10% note on stat screen | Percentage of stat value |
| IVs | Fixed at 15 | Floor 50+ | Range shown on caught Pokémon | Range arithmetic |
| Item selling | Item system activation | Automatic at activation | 30% value at Mart | Percentage calculation |
| Multiplayer | Removed | Post-launch | Trading with math negotiation | Comparative value arithmetic |

## **9.2 Extension Introduction Pattern**

20. Floor or level N−1: Professor Oak mentions the upcoming mechanic in passing.

21. N: mechanic appears in a low-stakes context for the first time.

22. N+1 to N+5: mechanic appears repeatedly with tutorial overlay available on demand.

23. N+6+: mechanic fully normalised, overlay removed, difficulty scales with it.

## **9.3 Difficulty Settings**

| Setting | Timer (battle) | Partial credit | Hint cost | Recommended for |
| :---- | :---- | :---- | :---- | :---- |
| Explorer | 10 seconds | 80% on wrong | Free, unlimited | Ages 7–8 or first-time players |
| Trainer (default) | 6 seconds | 75% on wrong | Free, one per puzzle | Ages 9–11 |
| Champion | 4 seconds | 65% on wrong | ₽100 per hint | Ages 12+ or confident players |

# **10\. Narrative and Characters**

## **10.1 Setting**

The player is a junior Pokémon researcher working under Professor Oak. The dungeon is an ancient ruin system beneath Oak's island laboratory, teeming with rare Pokémon and mysterious artefacts — the math-locked items. The trainer's academic role provides natural justification for mathematical skill: researchers calculate, analyse, and measure. The better their arithmetic, the deeper they can explore.

## **10.2 Characters**

* **The Trainer (player): customisable, gender-neutral by default. Defined by Trainer Card stats rather than fixed personality.**

* **Professor Oak: primary NPC. Locked in Phase 1 for item purposes but present as a narrative voice via field notes sent during dungeon runs. Fully active in Phase 2 for identification and coaching. Never says the child got something 'wrong' — always 'partial result' or 'approximate answer'.**

* **Rival: narrative character who comments on progress between dungeon runs. Does not battle. Provides social texture and motivation.**

* **Mart Clerk: handles purchases. Displays running total of selected items.**

## **10.3 Professor Oak's Phase 1 Role**

During Phase 1 (before item system activation) Oak sends field notes into the dungeon that serve purely as narrative encouragement and floor lore. These notes build the child's relationship with him so that the item system introduction in Phase 2 feels like a natural story development rather than a tutorial interrupt.

Sample Phase 1 field notes:

* Floor 1: 'Welcome to the ruins. The Pokémon here are not aggressive by nature — they respond to strength. Show them yours.'

* Floor 5 (after first boss): 'Remarkable progress. Something stirs deeper in the ruins. I'm still studying the artefacts we found at the entrance.'

* Floor 10: 'Your Pokémon are growing quickly. I believe I'm close to understanding the artefacts. Keep going.'

## **10.4 Professor Oak's Identification Dialogue**

24. Correct: name the result, name the method. 'Excellent\! You solved the brackets first — that's order of operations. The Volt Shard's Sp. Atk is fully unlocked.'

25. Incorrect: acknowledge, explain method. 'Close\! With order of operations, solve inside the brackets before multiplying. The stat is partially unlocked — you'll get it next time.'

26. Hint request: explain method, not answer. 'Here's a clue: what is 14 \+ 6? Solve that first, then divide the result by 4.'

# **11\. Technical Implementation Notes**

## **11.1 Math Problem Generation**

All equations are procedurally generated at runtime based on floor depth and item rarity. Generation parameters per floor range: number range, operation type, answer uniqueness. A validation step ensures every equation has exactly one integer answer within the expected range, with legible intermediate steps at the current curriculum level.

## **11.2 Item System State Flag**

The item system has a global boolean flag: itemSystemActive. This is set to true the moment any Pokémon in the player's party reaches level 20\. The flag gates: wild Pokémon item assignment, loot drop generation, identification screen accessibility, equip screen accessibility, Professor Oak lab availability, and the bag icon on enemy encounter cards. All item-related UI elements query this flag before rendering.

## **11.3 Damage Calculation**

The damage formula is evaluated in a trusted context. The equation shown to the player is a simplified representation. Item Bonus is set to zero when itemSystemActive is false. The formula structure is identical in both phases — Phase 1 is simply the formula with Item Bonus \= 0\.

## **11.4 Save State**

Save state includes: party Pokémon (stats, moves, level, item slot count, held item), PC Box contents, bag inventory, itemSystemActive flag, floor unlock progress, Trainer Card statistics, curriculum extension flags. Autosave on every room transition and on returning to town.

## **11.5 Analytics Events**

* math\_attempt: floor, puzzle\_type, correct (bool), time\_taken, answer\_given, correct\_answer

* item\_system\_activated: pokemon\_species, pokemon\_level, floor\_at\_activation

* item\_slot\_unlocked: pokemon\_species, pokemon\_level, slot\_number

* item\_identified: item\_rarity, puzzles\_correct, puzzles\_total, stat\_delta

* level\_up: pokemon\_species, new\_level, stat\_gains

* boss\_attempt: floor, outcome (cleared/blacked\_out), accuracy\_rate, attempts\_count

* dungeon\_run: floors\_cleared, blackout (bool), potions\_used, accuracy\_rate

* extension\_unlocked: mechanic\_name, trigger (floor or pokemon\_level)

## **11.6 Teacher / Parent Dashboard**

Separate web dashboard (not visible in-game) displays per-child: accuracy by math topic, time-on-task per session, curriculum extensions unlocked, boss rooms cleared, item system activation date, item slots unlocked across party, and common error patterns by problem type.

# **12\. Appendix: Quick Reference**

## **12.1 Simplified Core — What Is and Is Not Present at Launch**

| Mechanic | In v1.2 core? | Notes |
| :---- | :---- | :---- |
| Turn-based battles | Yes | Full implementation from game start |
| 6 starter types | Yes | Fire, Water, Grass, Electric, Normal, Rock |
| Damage formula | Yes | Item Bonus \= 0 until item system active |
| Move power puzzles | Yes | Core math mechanic from game start |
| 4 moves per Pokémon | Yes | Level-up source only |
| PP system | Yes | Move lockout at 0 PP — no Struggle |
| Pokédollars income | Yes | Wild drops from game start; item selling from activation |
| Loot drops | Yes, conditional | Only once item system is active (first Pokémon level 20\) |
| Symmetric item rule | Yes | Enemies carry items iff player has item slots |
| Item system hidden (Phase 1\) | Yes | No items, slots, or identification before level 20 |
| First item gifted by Oak | Yes | Pre-identified tutorial item at activation |
| Identification screen | Yes, conditional | Locked before item system activation |
| Equip screen | Yes, conditional | Locked before item system activation |
| Item slot 1 (per Pokémon lv 20\) | Yes | Triggers global item system activation if first |
| Item slot 2 (per Pokémon lv 36\) | Yes | Coincides with many Pokémon evolution levels |
| Item slot 3 (per Pokémon lv 50\) | Yes | Fully developed Pokémon milestone |
| Potions (3 tiers) | Yes | Available from game start |
| Poké Balls (3 tiers) | Yes | Available from game start |
| Berries (held items) | Yes, conditional | Require item slot — available from activation |
| Soft gating (boss rooms) | Yes | Every 5 floors unlocks next block |
| Switching in battle | Yes | 5th action; full turn cost; LEAD indicator updates dynamically |
| XP participation rule | Yes | All Pokémon sent out get full EXP; reserves get nothing; no XP split |
| Dungeon floor map | Yes | One floor at a time; horizontal room path; mandatory \+ optional rooms |
| Party HP top bar | Yes | All party Pokémon shown; Lead prominent; reserve visible; warning at 25% HP |
| Party of 2→6 Pokémon | Yes | Grows with boss floor clears |
| PC Box | Yes | Unlimited, no EXP for Box Pokémon |
| Level-based evolution | Yes | No stones — fixed level per species |
| Professor Oak (Phase 1\) | Yes | Field notes only — lab locked |
| Professor Oak (Phase 2\) | Yes | Identification, coaching, item gifting |
| Town hub | Yes | 5 locations; Oak's lab locked in Phase 1 |
| Rival NPC (narrative only) | Yes | No battles |
| Trainer Card | Yes | Personal progress screen only |
| TMs | No | Floor 40+ optional extension |
| Evolution stones | No | Floor 50+ optional prestige mechanic |
| Trainer battles | No | Floor 50+ Gym extension |
| Floor Tokens | No | Removed — single currency only |
| Heart Scales | No | Removed |
| Move Reminder NPC | No | Removed — forgotten moves permanent |
| Multiplayer | No | Post-launch consideration |
| EVs / IVs | No | Floor 41+ / 50+ extensions |
| Natures | No | Floor 50+ extension |
| Dual-type stacking | No | Floor 31+ extension |
| Status conditions | No | Floor 31+ extension |
| STAB math | No (visual only) | Math shown from floor 51+ |
| Speed / turn order | No (player first) | Floor 31+ extension |
| Full 18-type chart | No | Staged from floor 21 |
| Egg moves / breeding | No | Floor 50+ optional |
| Move Tutor | No | Floor 30+ dungeon room extension |

## **12.2 Item Slot Progression — Examples**

| Pokémon | Evolution level (MathDex) | Slot 1 (lv 20\) | Slot 2 (lv 36\) | Slot 3 (lv 50\) |
| :---- | :---- | :---- | :---- | :---- |
| Pikachu → Raichu | 36 (Raichu) | Level 20 | Level 36 (with evolution\!) | Level 50 |
| Charmander → Charizard | 16 then 36 | Level 20 | Level 36 (Stage 2 evo) | Level 50 |
| Geodude → Golem | 25 then 36 | Level 20 | Level 36 | Level 50 |
| Magikarp → Gyarados | 20 | Level 20 (with evolution\!) | Level 36 | Level 50 |

*Note: Magikarp is a special case — it evolves at level 20, meaning it gains both its first item slot and its evolution simultaneously. This is the most dramatic single-level event in the game and provides strong motivation for the child to persist with a weak Pokémon.*

## **12.3 Sample Pokémon — Pikachu at Key Levels**

| Level | HP | Attack | Defense | Sp. Atk | Sp. Def | Speed | Stat total | Item slots |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| 1 | 20 | 16 | 10 | 15 | 13 | 27 | 101 | 0 |
| 10 | 31 | 26 | 16 | 24 | 20 | 42 | 159 | 0 |
| 20 | 45 | 40 | 24 | 36 | 30 | 60 | 235 | 1 ← item system activates |
| 31 | 61 | 56 | 34 | 50 | 42 | 82 | 325 | 1 |
| 36\* | 69 | 63 | 39 | 57 | 48 | 93 | 369 | 2 ← evolves to Raichu |
| 50 | 90 | 82 | 50 | 74 | 62 | 119 | 477 | 3 |
| 100 | 167 | 152 | 94 | 138 | 115 | 220 | 886 | 3 |

*\* Level 36: Pikachu evolves to Raichu and gains second item slot simultaneously.*

## **12.4 Type Chart — Simplified Core (6 Types)**

| Attacker → | vs Normal | vs Fire | vs Water | vs Electric | vs Grass | vs Rock |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| Normal | ×1 | ×1 | ×1 | ×1 | ×1 | ×0.5 |
| Fire | ×1 | ×0.5 | ×0.5 | ×1 | ×2 | ×2 |
| Water | ×1 | ×2 | ×0.5 | ×1 | ×0.5 | ×2 |
| Electric | ×1 | ×1 | ×2 | ×0.5 | ×0.5 | ×1 |
| Grass | ×1 | ×0.5 | ×2 | ×1 | ×0.5 | ×2 |
| Rock | ×1 | ×2 | ×1 | ×1 | ×1 | ×1 |

## **12.5 Economy at a Glance**

| Category | Detail | Amount / Price | Available from |
| :---- | :---- | :---- | :---- |
| Income | Wild Pokémon defeated | ₽20–200 | Game start |
| Income | Selling identified items | 30% of item value | Item system activation |
| Spending | Potion (+20 HP) | ₽300 | Game start |
| Spending | Super Potion (+60 HP) | ₽700 | Game start |
| Spending | Hyper Potion (+120 HP) | ₽1200 | Game start |
| Spending | Poké Ball (40% catch) | ₽200 | Game start |
| Spending | Great Ball (60% catch) | ₽600 | Game start |
| Spending | Ultra Ball (80% catch) | ₽1200 | Game start |

