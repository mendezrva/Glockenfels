# Glockenfels: Tiny Kingdoms (fork)

A separate game built on Glockenfels: two to six duchies, an earned gap to a central Markt, Markt piles, a transitive Markt league, swaps and Zoll.

- **Where it lives:** the long-lived `kingdoms` branch. It is never merged into `main`, so the original Glockenfels stays as it is.
- **Rules:** [rules-spec.md](rules-spec.md)
- **Balance:** [balance-report.md](balance-report.md), raw numbers in `balance-v0.1.json`
- **Code:** `packages/kingdoms` (rules engine, bots, simulator). It reuses the Glockenfels tile analysis from `packages/engine` and changes nothing there.

```
npm install
npm run test -w packages/kingdoms     # rules tests
npm run sim -- 400                     # balance report, 400 games per experiment
npm run sim -- 200 --json zoll=2       # try a setting
```

## 3D client

`apps/kingdoms` is the Tiny Kingdoms client. It reuses the Glockenfels tile builder, scene, Wanderers and interface styles from `apps/client` through a `@gf` import alias, without changing them.

```
npm run dev:kingdoms      # local dev server
npm run build:kingdoms    # static build in apps/kingdoms/dist
```

- **Setup screen:** choose 2 to 6 duchies, pick which duchy each seat plays (picking one another seat holds swaps them), name each ruler and choose Person or Bot. Bots are the simulator's balanced bot.
- **Turn dock:** one compact row. Tap a tile card to take from that pile (home deck, reserve or a reachable Markt pile; the first usable one is picked for you), optionally tap a swap card after the ⇄ (its Zoll is shown), tap a glowing spot, turn the tile with ⟳, pick a Wanderer chip, then Place.
- **Moving around:** it works like a maps app. One finger drags the board; two fingers pinch to zoom, drag to pan and twist to turn. On a desktop, the left button drags, the right button turns and the wheel zooms. The viewing angle (straight down to 70°) is a slider in the menu, not a gesture. Whole board, My land (turns your home to the bottom) and the N compass (north up) sit above the dock.
- **On the board:** each tile carries a band in its duchy's colour (its field style; Markt tiles are gold). The ground under empty cells is tinted by duchy, the Markt is gold, and your open gap pulses.
- **Pass and play:** a hand-off screen appears between people. The game saves itself, and the menu has undo.
