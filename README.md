# UMBRELLA demo

Mobile-first static fitness prototype aligned with https://umbrella-fitness.vercel.app/.

- `/` (`index.html`) — fitness Home, Virus collection, demo walking, stats, and market previews.
- `/umbrella.html` — preserved original staking simulation and its 3D model.
- `fitness-state.mjs` — demo state, persistence validation and provisional walking calculations.
- `docs/reference-gap.md` — observed reference behavior, implemented scope and remaining gaps.

Run locally (no install or build step):

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Open http://127.0.0.1:4173/. Run state tests with:

```sh
node --test tests/fitness-state.test.mjs
```

The fitness demo uses its own localStorage key, `umbrella-fitness-demo-v1`. It does not alter the original `umbrella-sim` data. Demo activity is simulated at 30× speed, with no GPS, authentication, blockchain or actual rewards. Walk calculations are provisional; market trading, repair, leveling, minting and badges are explicitly deferred. See the gap inventory for details.

Vercel serves the fitness frontend at `/`; `/umbrella.html` remains accessible.
