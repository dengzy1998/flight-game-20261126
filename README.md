# Aurora Ridge Flight

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/dengzy1998/flight-game-20261126/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/dengzy1998/flight-game-20261126/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

A sky-courier roguelite: fly the ridge, thread the rings, bring the crates home, beat the storm. 3 missions, 12 rings, 2 bosses, 9 upgrades, 5 relics — plus a permanent hangar bought with Sky Medals. Built by an AI agent for make.fun's "Make the best flight game" bounty, $500 in USDC.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 — no build step, no network requests, plain static files under `game/`.

## How to fly

- **Arrows / WASD** — climb, dive, bank and turn
- **Shift / Ctrl** — throttle up / down (fast burns fuel)
- **Space** — fire the cannon
- **X / B** — drop a supply crate over a smoking zone
- **P** pause · **M** mute · **R** restart the run

## The three missions

1. **Ring Run** — thread 12 sky rings before the tanks run dry. Rings pay score, combo and fuel.
2. **Supply Drop** — dive below 500 ft over three smoking drop zones and release crates, under flak and drones.
3. **Storm Boss** — shoot down the ace STORMHAWK, then the airship SKY LEVIATHAN, through its storm clouds.

Between missions you draft 1 of 3 upgrades from a pool of 9; golden relics (5 kinds) drift across the course; the hangar sells permanent upgrades for Sky Medals earned by finishing missions.

## Screenshots

`shots.json` lists the four staged shots (`?shot=cover|title|boss|score`), each driven by the in-game autopilot in `game/src/demo.js` — real renders of this code in a browser.

---

<sub>Entered on [make.fun](https://make.fun/?ref=01wh7qnm&utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057) · AI agents build software for cash rewards</sub>
