# Heimfall handoff

Read this first when continuing Heimfall in a new project or thread. It is the state as of 2026-11-10 and replaces the chat history.

## What Heimfall is

A distinct fork of Glockenfels. It lives on the `kingdoms` branch of github.com/mendezrva/Glockenfels and must never merge into `main`. Work is pushed to `claude/project-thread-kuk1oa` and tracked in draft PR #9 (base `kingdoms`). Mark decides every rule; he dislikes caps and taxes and prefers rewards; he wants rules changes bot-tested before they are adopted.

Story: a duke dies without an heir (Wittelsbach partition and Landshut succession). The board is his land; the players are six cousin lines dividing it by development, diplomacy and deception, never war but never peace. The Emperor will confirm what each line holds after 25 seasons.

## Where things are

- `packages/kingdoms`: rules engine (`src/game.ts`), board geometry (`src/board.ts`), tiles, decks and the six lines with their quests (`src/tiles.ts`), quest checks (`src/quests.ts`), config knobs (`src/config.ts`), bots (`src/bots.ts`), simulator (`src/sim.ts`), 19 vitest tests.
- `apps/kingdoms`: the 3D client (React, react-three-fiber), reusing `apps/client` through the `@gf` alias. `npm run dev:kingdoms`.
- `docs/kingdoms/rules-spec.md`: the rules, with a dated section per version. `balance-report.md`: every simulator result and the reasons behind each decision. `cards/card-language.html`: the card design language (also at https://claude.ai/artifact/PvL3Tvu3bdd2Z1emiWG5cc).
- Playable build: https://claude.ai/artifact/HxVybcNgnYgz1Q2g4p8YWg. To republish: `npx vite build` in `apps/kingdoms`, then inline the CSS, JS and fonts of `dist/index.html` into one HTML file (strip the doctype, charset, viewport, script and link tags; fonts as data URIs) and publish it to that same artifact URL.
- Simulator: `cd packages/kingdoms && npx tsx src/sim.ts 400 --json`, with overrides such as `rounds=20`, `players=6`, `duchyIds=erz,tuch,salz,wein`, `deck.salz.home.stift=2`, `quest.forst.2=road-burgs:4`. Report fields include duchy wins, contested share, quest completion rates per tier, quest doubles.

## Rules as they stand (v0.8.1)

- 2 to 6 lines, 25 rounds, one shared home deck of 22 and Markt piles of 12 from one shared list; the Markt centre starts empty; three empty cells between a Stammburg and its Vorland (1-1-3 T).
- No duchy powers, no swap toll, no Markt fee, no cap on home points (all still exist as config knobs, off). Pact fee 3 paid by whoever lays a linking tile. Residenz bonus: Burgs and roads score 1 more per tile in the Markt. Zoll: a road that joins 2 or more Burgs earns a flat 3.
- Side quests: each line has three optional cards (4, 7, 10 points) that pay automatically the moment they are met; several may pay on one move, so each line's three cards need different kinds of moves. Tuned so bots complete low about 55%, medium about 32%, high about 15% for every line, with two cards on one move in under 2% of games.
- Cards: tier tab (LOW, MEDIUM, HIGH) and a hexagonal point seal, one metal per tier: ice blue #1a9fd4 for 4, silver #c3c9d2 for 7, gold #c9931f for 10. The scoreboard shows the same seal when a card is earned.

## Open items

- Six-line tables are uneven (Hopfen and Tuch earn more quest points); five-line south seat was strong earlier. Both need a balance pass.
- The card page's sample art for Wein and Hopfen still shows the earlier quest names; the remaining 30 cards are not drawn.
- The theatrical intro film: screenplay approved in direction, not filmed. Must not hard-code a player count or round count.
- Ideas from the design review not built: extinct lines for uneven tables, disputed border land, secret clause cards, breakable pacts, Apanage, uncertain award date, a shared-Burg or loop-road quest for human play.
- Online play for Heimfall is not started; the Glockenfels server design in `docs/online.md` applies.

## Suggested project instructions for a Heimfall project

"Heimfall is a fork of Glockenfels on the `kingdoms` branch; never merge into main. Read docs/kingdoms/HANDOFF.md, rules-spec.md and balance-report.md before changing rules. Bot-test every rule change with the simulator and report the numbers. Keep the playable artifact and the rules spec current with every change. Mark prefers rewards over caps and taxes."
