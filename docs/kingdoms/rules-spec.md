# Heimfall, rules spec (v0.8)

Heimfall is a fork of Glockenfels. It keeps square tiles, edge matching and Wanderers, and adds four rival duchies of a fractured Bavaria around a central Markt. It lives on the `kingdoms` branch and never merges into `main`; the original game is untouched.

Every number below is a setting in `packages/kingdoms/src/config.ts` or a deck list in `packages/kingdoms/src/tiles.ts`. The values here are the tuned defaults from the balance simulator (see `balance-report.md`).

## The story

*Heimfall* is the old legal word for land falling home. The Duke of Bavaria-Glockenfels (an invented line of the Wittelsbach house) dies without a son. Under the house treaties his duchy reverts to the surviving lines, and every cousin has an equal right to it.

- The **board** is the dead duke's land. The empty ground in the centre, the Markt, is where his Residenz stood.
- The **players** are his agnates. Each is already a duke with a line of their own, and each plants a seat (Stammburg) on the edge of his land.
- The draft treaty gives each line a portion on paper: its **Vorland** by the Residenz, cut off from its seat by the **gap**.
- The **Emperor forbids a feud** and issues his award after the last season. He confirms what each line holds and has built.

It is settled by development, diplomacy and deception, never by war. The rules below do not yet include the proposed extinct lines, disputed land, clause cards or pacts; see the review doc linked from the README.

## Names

| Glockenfels | Heimfall |
| --- | --- |
| Town | **Burg**. Every Burg edge matches every other Burg edge, whoever's style it is. |
| Road | **Road**. Some roads carry a waymark badge. |
| Monastery | **Stift** |
| Field | **Field**. A field's style (its duchy) is identity only, used for swaps and Zoll, never for points. |
| Start tile | **Stammburg**, one per duchy |
| Centre | The **Markt**, empty at the start (the Marktburg is an option, off) |

## The duchies

Every line plays with the **same home deck and the same Markt pile** (v0.8). What sets a line apart is its story and its three **side quests**.

| Line | Seat | Story | Low (4) | Medium (7) | High (10) |
| --- | --- | --- | --- | --- | --- |
| **Salz** | North | The salt line builds walls. | Stadtmauer: finish a Burg of 4+ tiles | Residenz: place 12 Markt tiles | Stadttore: finish a road joining 4 Burgs |
| **Wein** | East | The wine line keeps the abbeys. | Zwei Klöster: claim a second Stift | Pilgerweg: finish a road of 6+ tiles | Abtei in der Fremde: finish a Stift outside your portion |
| **Forst** | South | The forest line keeps the roads. | Landstraße: finish a road of 5+ tiles | Wanderschaft: place 11 tiles on other lines' land | Weitgereist: send out your Wanderers 17 times |
| **Hopfen** | West | The hop line farms the open land. | Dorf um Dorf: finish 3 Burgs | Friedensweg: finish a road of 6+ tiles | Kornkammer: end holding a field touching 10 finished Burgs |
| **Erz** | (5 or 6) | The ore line sells at the Markt. | Marktrecht: place 10 Markt tiles | Residenzbau: finish a Burg with 2+ tiles in the Markt | Marktherr: place 15 Markt tiles |
| **Tuch** | (6) | The cloth line settles where the trade is. | Niederlassung: place 7 tiles on other lines' land | Tauschhandel: swap 11 times | Bleichwiese: end holding a field touching 10 finished Burgs |

A quest pays once, the moment it is met (end-of-game quests at the final scoring), with no choice to make and no limit per turn: if one move meets two cards, both pay. To keep that rare, no two cards of a line can be met by the same feature; each needs a different kind of move (a Burg, a road, a Stift, a count of placements or claims, or a field at the end). In 400 bot games a line paid two cards on one move in 0.3 to 1.8% of games, down from 32% for Forst and 14% for Salz with the first deal. All three are optional. Each line's cards total 21 points, and the bot simulator completes each tier at about the same rate for every line (low 52 to 57%, medium 29 to 34%, high 9 to 19%). No line has a special ability.

The seats in the table above are for the standard four-player game. Any 2 to 6 different lines can play; see **Table sizes**.

## The board

North is up. The **3 × 3 Markt** at the centre starts empty (9 cells); only Markt tiles may go there. The Marktburg, a four-sided Burg at the centre, is a config option (`centreTile`) that is off. Each duchy owns a quarter of the board outside the Markt, cut along the diagonals.

```
              Stammburg (Salz)
                  .   gap: 3 empty cells
                  .
                  .
               V  V  V      Vorland ring 3 (crossbar)
                  V         Vorland ring 2
                  V         Vorland ring 1 (faces the Markt)
 Hopfen ...  Vorland  [ Markt ]  Vorland ... Wein
                  V
                  V
               V  V  V
                  .
                  .
              Stammburg (Forst)
```

- **Vorland:** the three rings just outside the Markt. Each duchy's Vorland is a preplaced T of five tiles, shaped 1-1-3: one tile facing the Markt, one behind it, and a crossbar of three facing home.
- **Stammland:** everything further out. The Stammburg sits 3 empty cells beyond the middle of the crossbar (the **gap**).
- The Markt holds only Markt tiles. Stammland never holds Markt tiles.

## Table sizes

Two to six duchies can play. What has to stay true at every size:

- **Every duchy gets the same shape of land:** the same Vorland T, the same two-cell gap and the same distance from its Stammburg to the Markt along its own spine. Only which side of the Markt it faces changes.
- **Every Vorland touches the Markt,** so every duchy can link to every other through it.
- **Land is split fairly:** each cell belongs to the duchy whose spine (the line from the Markt out to its Stammburg) is nearest. Cells exactly between two spines go to the duchy they lie clockwise of.
- **Rounds do not depend on the table:** a duchy always has 17 home tiles after setup and the game is 25 rounds at any size, so at least 8 turns per player come from the Markt piles or the reserve. Bigger tables simply take longer.

| Duchies | Markt | Seats |
| --- | --- | --- |
| 2 | 3 × 3 | North and south |
| 3 | 3 × 3 | North, east and west (the empty south is split by the east and west duchies) |
| 4 | 3 × 3 | One on each side |
| 5 | 5 × 3 | Two on the north side, one each on east, south and west |
| 6 | 5 × 3 | Two on the north side, two on the south side, one each on east and west |

On the wide Markt the two duchies sharing a side sit two cells either side of the centre, so their crossbars are one cell apart and the land between them is split down the middle. (Three cells apart, on a 7 × 3 Markt, made linking much rarer: all six linked in only 24% of games.)

## Decks

Every line has the same **home deck of 22 tiles** and draws its **Markt pile of 12** from the same list, shuffled.

### Home deck (22)

| Tile | Edges (N, E, S, W) | Count |
| --- | --- | --- |
| Burg square | Burg, Burg, field, Burg | 2 |
| Burg gate | Burg, Burg, road, Burg | 1 |
| Burg corner | Burg, field, field, Burg | 2 |
| Burg corner with road | Burg, road, road, Burg | 1 |
| Burg street | field, Burg, field, Burg | 1 |
| Burg wall | Burg, field, field, field | 3 |
| Burg wall with road | Burg, road, field, road | 2 |
| Burg wall with bend | Burg, field, road, road | 1 |
| Road | road, field, road, field | 3 |
| Road bend | field, field, road, road | 3 |
| Junction | field, road, road, road · shrine | 1 |
| Stift | field ×4 · Stift | 1 |
| Open field | field ×4 | 1 |

### Markt list (repeated to fill a pile of 12)

Burg corner with banner, Burg wall with banner, Burg wall at a junction, Stift by the Burg, Junction, Burg corner with road.

## Setup

1. Leave the Markt empty.
2. Each duchy places its Stammburg with its road pointing at the Markt.
3. Shuffle each home deck and each Markt pile separately.
4. **Vorland, drawn at random.** Each duchy fills its five Vorland slots in order: the cell beside the Markt, the cell behind it, the middle of the crossbar (facing the gap), then the two ends of the crossbar. For each slot, draw from the top of that duchy's deck and place the tile in the rotation that fits:
   - prefer rotations that close Burg edges against tiles already there (complete Burgs where possible),
   - on the gap-side slot, prefer a road pointing home,
   - if the tile fits nowhere, it goes to a **one-tile reserve slot** and the next tile is drawn; the reserve tile is tried first at the next slot; if the reserve is already full, the tile goes to the bottom of the deck.
   - At the end of setup any reserve tile goes to the bottom of the deck. Nothing scores during setup.
5. Each duchy now has 17 home tiles left. The game lasts **25 rounds**, eight more than the home deck, so at least eight of your turns use Markt tiles or your reserve. Each Markt pile holds 12 tiles (the duchy's Markt list, repeated).

## A turn

1. **Pick a pile, not a tile.** Choose one face-up tile from:
   - the top of your home deck,
   - your reserve tile, if you have one,
   - the top of any Markt pile you can reach (see Reach).
2. **Swap (optional).** Once your own gap is closed, you may trade the tile you took (not a Markt tile) for the face-up top tile of another duchy's home deck. Your tile goes to the bottom of their deck. Swapping is free. One swap per turn.
3. **Place** the tile by edge shape (Burg to Burg, road to road, field to field) next to at least one tile in your **network** (see Reach), following the land rules:
   - **Your tiles** (your style, or a tile you swapped for) go on your own land or on any Vorland you reach.
   - **A swapped tile** may also go on the land of the duchy whose style it carries, anywhere you reach there.
   - **Markt tiles** go in the Markt or on any Vorland you reach, never in Stammland.
4. **Claim (optional):** put one of your 7 Wanderers on an unclaimed feature of the tile you just placed.
5. **Score** completed Burgs, roads and Stifte. Wanderers on them come home.

**Dead tiles.** If none of your piles has a tile you can place, your home top goes to your reserve slot (or is lost if the slot is full) and you look again. In 400 simulated games this happened to under 0.1% of tiles.

## Reach

- **Your network** is every tile joined to your Stammburg through adjacent tiles. Tiles in the same duchy's land always join. Tiles in two different duchies' lands never join directly.
- **The gap.** Your Vorland is cut off from your Stammburg by the gap. Bridge it with your own tiles to **close the gap**. That is permanent, and it:
  - opens your Markt pile,
  - lets your swaps start,
  - opens your land to the Markt: from now on a Markt tile touching your Vorland joins your network.
- **The Markt league.** A Markt tile joins whatever it touches, but a duchy's land joins the Markt only after that duchy has closed its gap. So when Markt tiles run between two connected duchies' Vorlands, their networks merge. Links are **transitive**: one league, any size.
- **Mutual reach.** Everyone in a league can place their own tiles on each other's Vorland, swapped tiles on each other's land, and draw from each other's open Markt piles.

## Scoring (uniform for everyone)

| Feature | Complete | Unfinished at game end |
| --- | --- | --- |
| Burg | 2 per tile, +2 per banner | 1 per tile, +1 per banner |
| Road | 1 per tile, +1 per waymark badge | same |
| Stift | **7** when it and all 8 neighbours are filled | 1 per tile in its 3 × 3, at most 6 |
| Field | (only at game end) | **3** per completed Burg it touches |
| Zoll | **3** on top of the road's points when the road joins two or more Burgs | same |

A road **joins** a Burg when one of its tiles also holds part of that Burg: a gate where the road ends, or a wall the road runs past. Roads through open fields earn no Zoll. The Zoll is the same for everyone and is paid once per road.

Majority rules as in Glockenfels: most Wanderers on a feature scores it; ties all score in full.

**Game end:** after 25 rounds, score unfinished features and fields. Highest score wins; ties share the win. Home tiles you never drew score nothing, so a Markt tile always costs you a home tile.

## Side quests, one deck for all (v0.8)

Mark's change of 2026-11-10: the lines no longer differ by deck. Each carries three optional quest cards from its story (low 4, medium 7, high 10; `questPoints`). The quest kinds the engine can check: Burg size, Burg banners, Burg shared with another line, Burg tiles in the Markt, Stift finished, Stift finished abroad, Stift neighbours, road length, Burgs joined by a road, road loop, field touching finished Burgs at the end, linked to every line at the end, Markt tiles placed, tiles placed on other lines' land, swaps, all Wanderers out. Cards were tuned so each tier completes at about the same rate for every line. Not used because the bots never manage them: the shared Burg (2%) and the road loop (3%); both stay available as kinds.

## Empty Markt and 25 rounds (v0.7)

Mark's changes of 2026-11-10:

- **No centre tile.** The Markt starts as nine empty cells (`centreTile: false`). The first Markt tile placed there may be anything.
- **25 rounds** (`rounds: 25`) with **Markt piles of 12** (`marktPile: 12`). Home decks are unchanged at 17 tiles after setup, so every player plays at least 8 Markt or reserve tiles. Mark's aim: more contested tiles per line.

## Zoll as a road reward (v0.6)

Mark's changes of 2026-11-10, which replace parts of v0.4:

- **No swap toll and no Markt fee.** Swapping and drawing from a reachable Markt pile are free (`swapFee: 0`, `marktFee: 0`).
- **No duchy powers.** The old abilities remain as config options for experiments but are off.
- **Zoll is now income from trade roads** (`zoll: 3`, `zollMode: 'flat'`). A road that joins two or more Burgs pays its holder 3.
- **No cap on home points.** The award is off (`awardRatio: 0`).
- Still on from v0.4 and v0.5: the Residenz bonus, the pact fee of 3, the three-cell gap and 19 rounds.
- Forst's deck lost most waymarks and its Stift lane and gained Burg walls, a Burg corner and two fields. Without the powers its road deck won 40% of games.

## The award and the price of company (v0.4)

These rules push points toward contested land and make the Markt and its pacts cost something. Each is one config knob.

- **The award** (`awardRatio: 1`, `awardAllowance: 10`). At the end the Emperor confirms points from your own portion only up to your contested points plus 10. Contested points come from features that lie mostly in the Markt or in another line's portion. Home points above the cap are struck off and shown in the results as "not confirmed".
- **The Residenz bonus** (`scoring.residenzPerTile: 1`). A Burg or road scores 1 more for each of its tiles in the Markt.
- **Pact fee** (`pactFee: 3`). Whoever lays the tile that links two lines pays 3 points for each new pact. Nobody receives it.
- **Markt fee** (`marktFee: 1`). Drawing from another line's Markt pile costs 1 Zoll, paid to that line. You cannot draw if you cannot pay.
- **Vorland toll** (`vorlandToll`, off). Building on another line's Vorland pays that line. Off because it hands Hopfen, who pays no Zoll, 39% of wins.
- **A longer gap** (`gap: 3`, adopted in v0.5 on Mark's call). Three empty cells between the Stammburg and the Vorland. The gap closes around round 5.3 instead of 3.7 and the first pact lands around round 8.7 instead of 7. The game runs 19 rounds to make up the lost time. Salz gave up a Stift for a road and Hopfen a Burg wall for a road bend to keep the duchies even.

## Changes from the brainstorm, and why

- **Fixed rounds (17, one per home tile left after setup).** With "play until the decks run out", Markt tiles were extra turns on top of a full home deck, so connecting was simply more tiles. Fixed rounds make a Markt tile a choice instead of a bonus.
- **Your land joins the Markt only after your own gap is closed.** Without this, a rival's Markt tiles could reach your Vorland while you were still building your gap. Your reading ("mutual reach for both players that are connected, so long as the player is connected from their starting tile to the vorland to the markt") is now the rule.
- **Swaps need your own gap closed**, matching "the reward for connecting to the Markt is the player is allowed to exchange their tiles".
- **Smaller Markt (3 × 3, not 5 × 5).** With the larger Markt, Wein won 50 to 60% and about 75% of points were home points.
- **Stift 7, with unfinished Stifte capped below 7.** At 9 Wein's Stifte dominated.
- **Salzregal pays double to Salz without charging the swapper double.** When swappers paid double, everyone avoided Salz and Salz won about 10% of games.
