# Heimfall, rules spec (v0.4)

Heimfall is a fork of Glockenfels. It keeps square tiles, edge matching and Wanderers, and adds four rival duchies of a fractured Bavaria around a central Markt. It lives on the `kingdoms` branch and never merges into `main`; the original game is untouched.

Every number below is a setting in `packages/kingdoms/src/config.ts` or a deck list in `packages/kingdoms/src/tiles.ts`. The values here are the tuned defaults from the balance simulator (see `balance-report.md`).

## The story

*Heimfall* is the old legal word for land falling home. The Duke of Bavaria-Glockenfels (an invented line of the Wittelsbach house) dies without a son. Under the house treaties his duchy reverts to the surviving lines, and every cousin has an equal right to it.

- The **board** is the dead duke's land. The castle in the centre is his empty Residenz with its Markt.
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
| Centre | **Marktburg** (a four-sided Burg), inside the **Markt** |

## The duchies

| Duchy | Seat | Theme | Deck leans toward | Markt pile (complementary tiles) | Power |
| --- | --- | --- | --- | --- | --- |
| **Salz** | North | Urban density | Most three-edge Burgs, plus Burg walls to close them | Banner caps and corners that finish big Burgs, the maypole centre | **Salzregal:** collects double Zoll on every swap into Salz. The swapper pays the normal Zoll; even Hopfen's swaps pay Salz. |
| **Wein** | East | Monks and contemplation | Most Stifte | Stifte with a road exit, plus a junction | **Besinnung:** sees the top two tiles of its home deck and may take either; the other stays on top. |
| **Forst** | South | Traveller variety | Waymarked roads (+1 each), no junctions | Junctions, Burg walls at a junction, Burg corners with road | **Waldläufer:** may swap twice per turn. |
| **Hopfen** | West | Rural peace and freedom | Small Burgs by open fields | Field gates: Burg corners and walls with roads | **Landfrieden:** pays no Zoll. |
| **Erz** | (5 or 6 players) | Miners and smiths | Burg walls, corners and squares with plenty of roads | Banner Burgs, a Burg centre, a Stift by the Burg | **Bergleute:** starts with 10 Wanderers instead of 7. |
| **Tuch** | (6 players) | Weavers and dyers | Banner Burg streets, Burg squares and four Stifte | Banner Burg streets, corners, a square and a gate | **Tuchhandel:** may swap before closing its gap. |

The seats in the table above are for the standard four-player game. Any 2 to 6 different duchies can play; see **Table sizes**.

Players rule one duchy each. Version 0.1 is for four players; three or two players leave a duchy empty, which the engine supports but the simulator has not tuned yet.

## The board

North is up. The Marktburg, a four-sided Burg with a banner, sits at the centre of a **3 × 3 Markt** (8 empty cells around it). Markt tiles next to it must show a Burg edge on that side. Each duchy owns a quarter of the board outside the Markt, cut along the diagonals.

```
              Stammburg (Salz)
                  .   gap: 2 empty cells
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
- **Stammland:** everything further out. The Stammburg sits 2 empty cells beyond the middle of the crossbar (the **gap**).
- The Markt holds only Markt tiles. Stammland never holds Markt tiles.

## Table sizes

Two to six duchies can play. What has to stay true at every size:

- **Every duchy gets the same shape of land:** the same Vorland T, the same two-cell gap and the same distance from its Stammburg to the Markt along its own spine. Only which side of the Markt it faces changes.
- **Every Vorland touches the Markt,** so every duchy can link to every other through it.
- **Land is split fairly:** each cell belongs to the duchy whose spine (the line from the Markt out to its Stammburg) is nearest. Cells exactly between two spines go to the duchy they lie clockwise of.
- **Rounds do not depend on the table:** a duchy always has 17 home tiles after setup, so the game is 17 rounds at any size. Bigger tables simply take longer.

| Duchies | Markt | Seats |
| --- | --- | --- |
| 2 | 3 × 3 | North and south |
| 3 | 3 × 3 | North, east and west (the empty south is split by the east and west duchies) |
| 4 | 3 × 3 | One on each side |
| 5 | 5 × 3 | Two on the north side, one each on east, south and west |
| 6 | 5 × 3 | Two on the north side, two on the south side, one each on east and west |

On the wide Markt the two duchies sharing a side sit two cells either side of the centre, so their crossbars are one cell apart and the land between them is split down the middle. (Three cells apart, on a 7 × 3 Markt, made linking much rarer: all six linked in only 24% of games.)

## Decks

Each duchy has a **home deck of 22 tiles** (same size, different mix) and a **Markt pile of 6**.

### Home decks

| Tile | Edges (N, E, S, W) | Salz | Wein | Forst | Hopfen |
| --- | --- | --- | --- | --- | --- |
| Burg square | Burg, Burg, field, Burg | 2 | 2 | 1 | 1 |
| Burg square with banner | Burg, Burg, field, Burg · banner | 1 | 0 | 0 | 0 |
| Burg gate | Burg, Burg, road, Burg | 1 | 0 | 0 | 0 |
| Burg corner | Burg, field, field, Burg | 1 | 2 | 1 | 2 |
| Burg corner with road | Burg, road, road, Burg | 1 | 0 | 1 | 0 |
| Burg street | field, Burg, field, Burg | 1 | 1 | 0 | 1 |
| Burg wall | Burg, field, field, field | 4 | 2 | 2 | 4 |
| Burg wall with road | Burg, road, field, road | 3 | 2 | 2 | 3 |
| Burg wall with bend | Burg, field, road, road | 0 | 0 | 2 | 2 |
| Road | road, field, road, field | 3 | 4 | 1 | 3 |
| Waymarked road | road, field, road, field · badge | 0 | 0 | 4 | 0 |
| Road bend | field, field, road, road | 2 | 5 | 2 | 2 |
| Waymarked bend | field, field, road, road · badge | 0 | 0 | 3 | 0 |
| Junction | field, road, road, road · shrine | 1 | 1 | 0 | 1 |
| Stift | field ×4 · Stift | 2 | 1 | 2 | 1 |
| Stift with lane | field, field, road, field · Stift | 0 | 1 | 1 | 0 |
| Open field | field ×4 | 0 | 1 | 0 | 2 |
| **Total** | | **22** | **22** | **22** | **22** |

### Markt piles

| Tile | Edges (N, E, S, W) | Salz | Wein | Forst | Hopfen |
| --- | --- | --- | --- | --- | --- |
| Burg wall with banner | Burg, field, field, field · banner | 2 | 0 | 0 | 0 |
| Burg corner with banner | Burg, field, field, Burg · banner | 2 | 0 | 0 | 0 |
| Burg street with banner | field, Burg, field, Burg · banner | 1 | 0 | 0 | 1 |
| Burg centre with maypole | Burg ×4 · banner | 1 | 0 | 0 | 0 |
| Stift by the Burg | Burg, field, road, field · Stift | 0 | 2 | 0 | 0 |
| Stift at the crossing | field, road, road, road · Stift | 0 | 1 | 0 | 0 |
| Junction | field, road, road, road · shrine | 0 | 1 | 1 | 0 |
| Burg wall at a junction | Burg, road, road, road · shrine | 0 | 0 | 3 | 0 |
| Burg corner with road | Burg, road, road, Burg | 0 | 1 | 2 | 2 |
| Burg wall with road | Burg, road, field, road | 0 | 1 | 0 | 1 |
| Burg wall with bend | Burg, field, road, road | 0 | 0 | 0 | 1 |
| Burg gate | Burg, Burg, road, Burg | 0 | 0 | 0 | 1 |
| **Total** | | **6** | **6** | **6** | **6** |

## Setup

1. Place the Marktburg (a four-sided Burg) at the centre.
2. Each duchy places its Stammburg with its road pointing at the Markt.
3. Shuffle each home deck and each Markt pile separately.
4. **Vorland, drawn at random.** Each duchy fills its five Vorland slots in order: the cell beside the Markt, the cell behind it, the middle of the crossbar (facing the gap), then the two ends of the crossbar. For each slot, draw from the top of that duchy's deck and place the tile in the rotation that fits:
   - prefer rotations that close Burg edges against tiles already there (complete Burgs where possible),
   - on the gap-side slot, prefer a road pointing home,
   - if the tile fits nowhere, it goes to a **one-tile reserve slot** and the next tile is drawn; the reserve tile is tried first at the next slot; if the reserve is already full, the tile goes to the bottom of the deck.
   - At the end of setup any reserve tile goes to the bottom of the deck. Nothing scores during setup.
5. Each duchy now has 17 home tiles left. The game lasts **17 rounds**.

## A turn

1. **Pick a pile, not a tile.** Choose one face-up tile from:
   - the top of your home deck (Wein sees the top two and may take either),
   - your reserve tile, if you have one,
   - the top of any Markt pile you can reach (see Reach).
2. **Swap (optional).** Once your own gap is closed, you may trade the tile you took (not a Markt tile) for the face-up top tile of another duchy's home deck. Your tile goes to the bottom of their deck. You pay **1 Zoll** (1 point) to that duchy, but only if that duchy has closed its gap. Salz collects 2; Hopfen pays nothing. One swap per turn (Forst: two).
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
| Zoll | 1 per swap into your duchy (Salz 2) | |

Majority rules as in Glockenfels: most Wanderers on a feature scores it; ties all score in full.

**Game end:** after 17 rounds, score unfinished features and fields. Highest score wins; ties share the win. Home tiles you never drew score nothing, so a Markt tile always costs you a home tile.

## The award and the price of company (v0.4)

These rules push points toward contested land and make the Markt and its pacts cost something. Each is one config knob.

- **The award** (`awardRatio: 1`, `awardAllowance: 10`). At the end the Emperor confirms points from your own portion only up to your contested points plus 10. Contested points come from features that lie mostly in the Markt or in another line's portion. Home points above the cap are struck off and shown in the results as "not confirmed".
- **The Residenz bonus** (`scoring.residenzPerTile: 1`). A Burg or road scores 1 more for each of its tiles in the Markt.
- **Pact fee** (`pactFee: 3`). Whoever lays the tile that links two lines pays 3 points for each new pact. Nobody receives it.
- **Markt fee** (`marktFee: 1`). Drawing from another line's Markt pile costs 1 Zoll, paid to that line. You cannot draw if you cannot pay.
- **Vorland toll** (`vorlandToll`, off). Building on another line's Vorland pays that line. Off because it hands Hopfen, who pays no Zoll, 39% of wins.
- **A longer gap** (`gap: 3`, not adopted). Moves gap closing from round 3.7 to 5.4 and the first link from round 7 to 9. It is the strongest way to make the Markt harder to reach but it breaks the two-space rule Mark set, so it waits on his call.

## Changes from the brainstorm, and why

- **Fixed rounds (17, one per home tile left after setup).** With "play until the decks run out", Markt tiles were extra turns on top of a full home deck, so connecting was simply more tiles. Fixed rounds make a Markt tile a choice instead of a bonus.
- **Your land joins the Markt only after your own gap is closed.** Without this, a rival's Markt tiles could reach your Vorland while you were still building your gap. Your reading ("mutual reach for both players that are connected, so long as the player is connected from their starting tile to the vorland to the markt") is now the rule.
- **Swaps need your own gap closed**, matching "the reward for connecting to the Markt is the player is allowed to exchange their tiles".
- **Smaller Markt (3 × 3, not 5 × 5).** With the larger Markt, Wein won 50 to 60% and about 75% of points were home points.
- **Stift 7, with unfinished Stifte capped below 7.** At 9 Wein's Stifte dominated.
- **Salzregal pays double to Salz without charging the swapper double.** When swappers paid double, everyone avoided Salz and Salz won about 10% of games.
