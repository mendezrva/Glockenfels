# Tiny Kingdoms balance report (v0.1)

Run it yourself: `npm run sim -w packages/kingdoms -- 400` (add `--json`, or override any setting, for example `scoring.stiftComplete=9` or `deck.wein.home.stift=3`). Raw numbers for this report are in `balance-v0.1.json`.

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
| Each duchy wins about 25% | Salz 23.8%, Wein 24.5%, Forst 25.7%, Hopfen 26.1% | Met |
| Average score per duchy close together | 55.2, 55.3, 55.4, 55.9 | Met |
| Balanced bot slightly best | Wins per seat: balanced 36.8%, reacher 22.5%, cultivator 3.9% | Met (balanced is clearly best, not just slightly) |
| Neither pure style beats the other clearly | Reachers beat cultivators 81% to 19% | **Not met** |
| About 55% home points, 45% foreign | 66% home, 34% foreign | Short |
| Dead tiles under 2% | Under 0.1% (none seen in 400 games) | Met |
| Everyone actively expands | 96% of duchies close their gap (on average in round 4 or 5); 92% join a league; in 81% of games all four are linked | Met |

Other numbers per game: 18 swaps, 15 Markt tiles placed, 14 points of Zoll. Average score 55, with a 26-point gap between first and last.

**Where points come from (balanced bots):**

| | Burgs | Roads | Stifte | Fields |
| --- | --- | --- | --- | --- |
| Salz | 21 | 12 | 8 | 9 |
| Wein | 17 | 14 | 17 | 8 |
| Forst | 15 | 20 | 13 | 11 |
| Hopfen | 18 | 15 | 10 | 10 |

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

## Open decisions

1. **Should a pure home-builder be able to win?** Today mixing both is clearly best and both extremes lose, which pushes every player to reach and cultivate. Making pure cultivation competitive would mean weakening the Markt (for example, Markt tiles worth less than home tiles), which also weakens the reason to connect.
2. **Is 66/34 home/foreign close enough to 55/45?** Getting closer needs a bigger shared area, which so far has unbalanced the duchies.
