# Glockenfels: Tiny Kingdoms (fork)

A separate game built on Glockenfels: four duchies, an earned gap to a central Markt, Markt piles, a transitive Markt league, swaps and Zoll.

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
