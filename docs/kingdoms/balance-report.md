# Tiny Kingdoms balance report (v0.2)

Run it yourself: `npm run sim -w packages/kingdoms -- 400` (add `--json`, or override any setting, for example `scoring.stiftComplete=9` or `deck.wein.home.stift=3`). Raw numbers for this report are in `balance-v0.2.json` (v0.1 numbers are in `balance-v0.1.json`).

**v0.2 board (2026-11-10):** the centre is a four-sided Burg (the Marktburg), each Vorland is a 1-1-3 T (one tile facing the Markt, one behind, a crossbar of three facing home, two empty cells before the Stammburg), and the game lasts 17 rounds, one per home tile left after setup. The new board pushed Forst down to 13.5% and Wein up to 36%, so Forst's deck got more waymarked roads and a second Stift, its Markt pile swapped crossroads for Burg-edged tiles that can sit next to the Marktburg, and Wein lost one Stift with lane.

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
