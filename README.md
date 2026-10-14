# PartyGame

A responsive React party-game website with eight games, randomized turns, automatic singing scores, and player-loss statistics. Player names and loss statistics are stored in the browser; singing scores last only for the active game. No server database is used.

## Run locally

Requires Node.js `20.19+` or `22.12+`.

```bash
npm install
npm run dev
```

## Project structure

- `src/App.jsx` contains the page layout, game catalog, and game selection.
- `src/styles.css` contains the responsive visual system and interactions.
