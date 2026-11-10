# Heimfall balance report (v0.8)

Run it yourself: `npm run sim -w packages/kingdoms -- 400` (add `--json`, or override any setting, for example `scoring.stiftComplete=9` or `deck.wein.home.stift=3`). Raw numbers for this report are in `balance-v0.2.json` (v0.1 numbers are in `balance-v0.1.json`).

**v0.2 board (2026-11-10):** the centre is a four-sided Burg (the Marktburg), each Vorland is a 1-1-3 T (one tile facing the Markt, one behind, a crossbar of three facing home, two empty cells before the Stammburg), and the game lasts 17 rounds, one per home tile left after setup. The new board pushed Forst down to 13.5% and Wein up to 36%, so Forst's deck got more waymarked roads and a second Stift, its Markt pile swapped crossroads for Burg-edged tiles that can sit next to the Marktburg, and Wein lost one Stift with lane.

## Table sizes (v0.3)

Two to six duchies can now play (see the rules spec). Erz and Tuch were added so six can play. Raw numbers are in `balance-v0.3-tables.json`; run `npm run sim -w packages/kingdoms -- 300 players=6` or `duchyIds=erz,tuch,salz,wein`. Duchies rotate through every seat, so seat and duchy results are separate.

| Table | Seats (wins per seat) | Duchies (wins) | Home points | All linked |
| --- | --- | --- | --- | --- |
| 3: Salz, Wein, Forst (300 games) | 36, 32, 32% (fair 33) | Salz 25, Wein 33, Forst 42% | 77% | 74% |
| 4: Erz, Tuch, Salz, Wein (300) | 25, 26, 24, 26% (fair 25) | Erz 29, Tuch 29, Salz 22, Wein 20% | 64% | 90% |
| 5: first five (300) | 19, 20, 16, **28**, 16% (fair 20) | 17 to 23% | 79% | 39% |
| 6: all six (400) | 14 to 21% (fair 17) | Tuch 14 to Hopfen 21% | 70% | 46% |

What this shows:
- **The board layouts are fair** at 3, 4 and 6. At 5 the lone south seat wins too often (28%): it faces the wide side of the Markt on its own.
- **Duchy powers scale with the table.** Salz's Zoll needs many swappers, so Salz is weak at small tables; Forst's double swap is strongest with few rivals. Erz and Tuch were tuned at six and are a little strong at four.
- **Wide tables link less.** With six, everyone links in 46% of games (four players: 66 to 74%). A 7 × 3 Markt was worse (24%), so the default wide Markt is 5 × 3.
- Next tuning steps: a 5-player seat layout for the south seat, and per-table-size power values (for example Salz's Zoll factor) if the small-table numbers matter.

## Side quests and one shared deck (v0.8)

About 6,500 bot games. With one deck for all, the lines are even before quests; the cards were then tuned so each tier completes at about the same rate. 400 games, four players, balanced bots:

| Line | Low | Medium | High | Quest points per game | Wins |
|---|---|---|---|---|---|
| Salz | 57% | 30% | 14% | 5.8 | 26.0% |
| Wein | 52% | 31% | 9% | 5.1 | 21.6% |
| Forst | 54% | 34% | 14% | 5.9 | 24.8% |
| Hopfen | 52% | 33% | 19% | 6.3 | 27.6% |

Erz and Tuch at a four-line table with Salz and Wein (300 games): Erz 57 / 30 / 16% (6.0 points), Tuch 46 / 27 / 18% (5.5 points). At six lines, Hopfen (7.8) and Tuch (7.3) pull ahead because wider tables finish more Burgs and link more; a six-line pass is still owed.

Findings:

- A second Stift in the shared deck cut every line's score by 6 and the contested share by a third, so the deck keeps one.
- Measured rates for the kinds not adopted: shared Burg 2%, road loop 3%, Stift abroad 9 to 11%, all Wanderers out 60%, linked to every line 85%, swap 10 times 56% but 14 times 1%.
- Quests add about 6 points to an 86-point average. Contested share stays at 38%.

Raw output: `balance-v0.8.json`.

## Empty Markt and longer games (v0.7)

Mark asked for the centre tile to go and for 20 and 25 round games, to get more contested tiles per line. 200 games per variant, 400 for the two candidates, 4 players.

| Rounds | Markt pile | Contested share | Markt tiles per game | First pact (round) | Everyone linked | Average score | Duchy wins (Salz, Wein, Forst, Hopfen) |
|---|---|---|---|---|---|---|---|
| 19 (v0.6, no centre) | 6 | 22% | 18 | 10.7 | 58% | 59 | 18 / 27 / 29 / 27 |
| 20 (400 games) | 8 | 27% | 22 | 11.4 | 66% | 63 | 22 / 24 / 29 / 24 |
| 22 | 10 | 29% | 27 | 12.5 | 75% | 68 | 18 / 25 / 33 / 25 |
| **25 (adopted, 400 games)** | **12** | **33%** | **35** | **13.1** | **86%** | **76** | **24 / 20 / 33 / 23** |
| 25 | 16 | 36% | 36 | 12.6 | 85% | 78 | 26 / 15 / 30 / 29 |

Findings:

- Each extra round past the home deck is a Markt tile, so contested share climbs about 1.4 points per round. 25 rounds puts a third of all points on contested land and links almost every table.
- Scores spread more in long games (score spread 41 at 25 rounds against 28 at 19), which is good for a game with a single winner.
- Forst wins most at 25 rounds (33%). Its Markt pile (junctions and Burg walls at a junction) earns Zoll well. Trimming its home deck to 3 Burg walls and 3 fields brought it to 28% in 300 games; not adopted yet.
- Removing the centre tile alone changed little: the first Markt tile just takes its place.

Raw output: `balance-v0.7.json`.

## Zoll as a road reward, no powers, no cap (v0.6)

About 5,500 bot games, 240 to 400 per variant, 4 players unless noted.

| Variant | Zoll points per game | Average score | Duchy wins (Salz, Wein, Forst, Hopfen) |
|---|---|---|---|
| No Zoll, old decks | 0 | 54.9 | 16 / 22 / 40 / 21 |
| Flat 2 | 16.5 | 58.8 | 21 / 17 / 43 / 20 |
| Flat 3 | 27.6 | 60.9 | 18 / 16 / 48 / 18 |
| Flat 4 | 39.3 | 63.0 | 14 / 15 / 52 / 20 |
| 1 per Burg | 20.6 | 58.9 | 17 / 20 / 41 / 22 |
| 2 per Burg | 48.3 | 65.1 | 13 / 17 / 54 / 17 |
| **Adopted: flat 3, new Forst deck (400 games)** | **26.4** | **58.2** | **24.6 / 26.1 / 25.2 / 24.1** |

Findings:

- The powers were holding Forst down. With them gone its road-heavy deck won 40% before any Zoll. Removing waymarks alone did not fix it; it took four fewer road tiles as well.
- Flat 3 makes Zoll about 11% of all points. A road between two Burgs is usually 3 to 5 tiles, so the Zoll roughly doubles it.
- Without the cap, contested land is back to 25% of feature points (it was 51% with the cap). Balanced bots still win 37.5% per seat, reachers 24%, pure cultivators 1%.
- The gap closes around round 5.6 and the first pact lands around round 10. Everyone is linked in 66% of games, down from 85%, because nothing forces players out of their own land now.
- Other tables are untuned after this change: at 3 players Forst wins 45%, at 6 players duchies range from 9.5 to 23%.

Raw output: `balance-v0.6.json`.

## Three-space gap (v0.5)

Mark chose the three-space gap. About 3,500 more bot games.

- Gap 3 alone at 17 rounds put Salz at 34% and the rest near 21%. Extra rounds (18, 19, 20) did not fix that but restored scores. 19 rounds brings the average score back to 48.
- Salz: one Stift became a road. Hopfen: one Burg wall became a road bend.
- Adopted set, 400 games, 4 players: duchies 26.2 / 22.6 / 24.2 / 27.1%. Contested 50.6%, 7.6 points struck off per player. Gap closes round 5.3, first pact round 8.7, everyone linked in 85% of games. Balanced 36.8%, reacher 23%, cultivator 3.4% per seat.
- Other tables (before the Hopfen change, 100 to 120 games): 2 players first pact round 10 and 77% link; 3 players 32 to 36% each; 5 players 16 to 23% by duchy; 6 players 9.5 to 23.5% by duchy, so six needs its own pass.
- With 19 rounds and 17 home tiles, the last two turns need a Markt or reserve tile.

Raw output: `balance-v0.5.json`.

## Contested land and harder alliances (v0.4)

Mark asked for more points to come from contested land and for alliances and the Markt to be harder to reach. About 2,500 bot games, 160 per variant unless noted. "Contested" is the share of feature points from the Markt and other lines' portions after the award.

| Variant (4 players) | Contested | Struck off per player | Gap closes (round) | First link (round) | Everyone linked | Duchy wins |
|---|---|---|---|---|---|---|
| v0.3 baseline | about 28% | 0 | 3.7 | 7.5 | 76% | 23.5 to 26.8% |
| Award 1:1 plus 10 | 51.8% | 6.5 | 3.6 | 7.0 | 89% | 22 to 29% |
| Award plus Residenz bonus | 55.2% | 5.2 | 3.7 | 6.8 | 96% | 21 to 30% |
| Award, Residenz, pact fee 3 | 51.0% | 7.1 | 3.7 | 7.3 | 90% | 23 to 28% |
| **Adopted: plus Markt fee 1 (400 games)** | **53.9%** | **6.0** | **3.7** | **7.1** | **91%** | **20.4 to 28.0%** |
| Adopted plus Vorland toll 1 | 48.7% | 8.5 | 3.7 | 7.3 | 91% | 17 to 39% (Hopfen) |
| Pact fee 5, Markt fee 2 | 49.5% | 8.5 | 3.7 | 7.7 | 79% | 20 to 34% |
| Adopted plus gap 3 | 46.9% | 10.2 | 5.3 | 9.0 | 80% | 17 to 35% |

Findings:

- The award is what moves contested points. It also makes players link more, because linking is how they reach contested land. Fees alone slow linking only a little.
- The gap length is the one strong lever on how hard the Markt is to reach. Gap 3 needs a deck rebalance (Forst 17%) and probably one or two more rounds.
- Pure cultivators win 4% of seats, reachers 19%, balanced bots 39%.
- Other table sizes with the adopted set: 2 players 45.7% contested (only 70% link), 3 players 50%, 5 players 55%, 6 players 60%. The south seat problem at 5 remains.
- Forst sits at 20.4% in the adopted set, the low end of acceptable.

Raw output: `balance-v0.4.json`.

## How it was measured

- **Bots.** Every bot scores each full turn (pile, swap, spot, Wanderer) with the same point estimates, then adds a style bias:
  - **Cultivator:** never takes Markt tiles, never swaps, never builds outside its own land.
  - **Reacher:** rushes the gap, favours Markt tiles, foreign land and swaps, and avoids its own Stammland.
  - **Balanced:** weighs both.
- **Experiments**, 400 games each, first player rotated every game:
  1. **Seat fairness:** four balanced bots.
  2. **Mixed table:** one cultivator, one reacher and two balanced bots, with the styles rotated through all four duchies.
  3. **Head to head:** two cultivators against two reachers, seats alternating.

## Results against the targets

| Target | Result | Status |
| --- | --- | --- |
| Each duchy wins about 25% | Salz 25.0%, Wein 24.8%, Forst 23.5%, Hopfen 26.8% | Met |
| Average score per duchy close together | 53.9, 54.2, 55.5, 55.1 | Met |
| Balanced bot best | Wins per seat: balanced 36.8%, reacher 24.5%, cultivator 1.9% | Met |
| Mixing beats a pure home-builder | Reachers beat cultivators 84% to 16% | Met (decided 2026-11-10) |
| About 55% home points, 45% foreign | 75% home, 25% foreign (v0.1: 66/34) | Short |
| Dead tiles under 2% | None seen in 400 games | Met |
| Everyone actively expands | 99% of duchies close their gap (on average in round 3 or 4); 81% join a league; in 66% of games all four are linked | Met |

Other numbers per game: 15 swaps, 19 Markt tiles placed, 13 points of Zoll. Average score 55, with a 22-point gap between first and last.

**Where points come from (balanced bots):**

| | Burgs | Roads | Stifte | Fields |
| --- | --- | --- | --- | --- |
| Salz | 25 | 10 | 8 | 7 |
| Wein | 18 | 13 | 17 | 7 |
| Forst | 17 | 22 | 11 | 8 |
| Hopfen | 19 | 15 | 9 | 9 |

Each duchy wins through its theme: Salz through Burgs, Wein through Stifte, Forst through roads, Hopfen through Burgs and fields.

## What reach versus cultivate looks like

Within balanced play, leaning toward home or toward reach both work. In 160-game tests a balanced bot pushed toward foreign land (60% home points) and one pushed toward home (74% home points) both won within 2 points of the standard balanced bot. So the 55/45 split is a style choice, not a requirement.

The extremes lose. A pure reacher wins about 1 game in 5, and a pure cultivator almost never wins at a mixed table. The cultivator's problem is structural: it never gets Markt tiles, which are stronger than home tiles, and it never gets the choice that swapping gives. Every rule variant tried (no swaps, half-size Markt piles, longer gap, Zoll 2 or 3, swaps only within a league) left reachers winning 70 to 93% of head-to-head games.

## Tuning log

| Change | Before | After |
| --- | --- | --- |
| Starting point (5 × 5 Markt, Stift 9, play until the decks run out) | Wein 60%, Salz 6%; 74% home points | |
| Fixed 18 rounds, so a Markt tile replaces a home tile instead of adding a turn | Cultivator per seat 8% | 15% (before the later rule fixes) |
| Fewer Stifte in Wein's deck and Markt pile | Wein 75% | 50% |
| Your land joins the Markt only after you close your own gap; swaps need your gap closed | Rivals could reach a Vorland before its owner connected | Matches the agreed rule |
| 3 × 3 Markt instead of 5 × 5 | Wein 54%, 82% home points | Wein 28%, 65% home points |
| Salz collects double Zoll without charging the swapper double | Salz 10% | 19% |
| Salz deck: more Burg walls, a second Stift, fewer three-edge Burgs | Salz 19% | 23% |
| Unfinished Stifte capped below a finished one; Stift 7 | A nearly finished Stift was worth more than a finished one | Duchies 24 to 26% |
| v0.2 board: Marktburg centre, 1-1-3 Vorland T, 17 rounds | Duchies 24 to 26% | Forst 13.5%, Wein 36.3%, 75% home points |
| Forst: more waymarked roads, a second Stift, Burg-edged Markt tiles instead of crossroads; Wein: one Stift with lane fewer | Forst 13.5%, Wein 36.3% | Duchies 23.5 to 27% |

## Knobs and what they did

| Knob | Effect seen |
| --- | --- |
| Wein's peek (2 to 1) | Worth about 15 points of Wein's win rate; kept, with a lighter deck instead |
| Zoll 2 or 3 | Hurts Salz (Salz pays Zoll too), helps Hopfen (never pays); left at 1 |
| Salz factor 3 | Salz 29%, a little too strong; left at 2 |
| Field 2 per Burg | Hurts Salz; left at 3 |
| Gap 3 | Games slower, cultivators even weaker; left at 2 |
| Vorland 3 rings deep | 61% home points, but Salz fell to 7% |
| Markt piles of 3 | 73% home points; left at 6 |
| Wanderers | Not changed from 7 |

## Decisions

1. **Should a pure home-builder be able to win?** Mark decided no (2026-11-10): mixing reach and cultivation should win, so the Markt stays as strong as it is and the "neither pure style beats the other" target is dropped. The remaining style target is that a balanced player does best, which is met.

## Open questions

1. **Is 75/25 home/foreign close enough to 55/45?** The longer v0.2 Vorland and the Burg centre made home building stronger (it was 66/34). Getting closer needs a bigger or more rewarding shared area, which so far has unbalanced the duchies. Balanced bots leaning 60% or 74% home win equally, so this is a style range rather than a requirement.
