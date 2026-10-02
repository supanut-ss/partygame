const STORAGE_PREFIX = 'party-game';

function storageKey(type, gameId) {
  return `${STORAGE_PREFIX}.${type}.${gameId}.v1`;
}

function normalizePlayerName(name) {
  return name.trim().normalize('NFKC').toLocaleLowerCase();
}

function compareLosses(first, second) {
  return second.losses - first.losses || first.name.localeCompare(second.name, 'th');
}

export function loadGamePlayers(gameId, fallbackPlayers) {
  if (typeof window === 'undefined') return fallbackPlayers;

  try {
    const savedNames = JSON.parse(window.localStorage.getItem(storageKey('players', gameId)));
    if (
      !Array.isArray(savedNames)
      || savedNames.length < 2
      || savedNames.length > 8
      || savedNames.some((name) => typeof name !== 'string')
    ) {
      return fallbackPlayers;
    }

    return savedNames
      .map((name, index) => ({ id: index + 1, name: name.slice(0, 24) }));
  } catch {
    return fallbackPlayers;
  }
}

export function saveGamePlayers(gameId, players) {
  if (typeof window === 'undefined') return;

  try {
    const savedNames = [...players]
      .sort((first, second) => first.id - second.id)
      .map((player) => player.name);
    window.localStorage.setItem(storageKey('players', gameId), JSON.stringify(savedNames));
  } catch {
    // Keep the game usable if browser storage is unavailable.
  }
}

export function shufflePlayers(players) {
  const shuffled = [...players];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

export function loadLossStats(gameId) {
  if (typeof window === 'undefined') return [];

  try {
    const savedStats = JSON.parse(window.localStorage.getItem(storageKey('losses', gameId)));
    if (!Array.isArray(savedStats)) return [];

    const uniqueStats = new Map();
    savedStats.forEach((entry) => {
      if (typeof entry?.name !== 'string' || !Number.isSafeInteger(entry.losses) || entry.losses < 1) return;
      const name = entry.name.trim();
      if (!name) return;

      const key = normalizePlayerName(name);
      const current = uniqueStats.get(key);
      uniqueStats.set(key, {
        key,
        name: current?.name ?? name,
        losses: (current?.losses ?? 0) + entry.losses,
      });
    });

    return [...uniqueStats.values()].sort(compareLosses);
  } catch {
    return [];
  }
}

export function addPlayerLoss(stats, playerName) {
  const name = playerName.trim();
  if (!name) return stats;

  const key = normalizePlayerName(name);
  const existing = stats.find((entry) => entry.key === key);
  const updatedStats = stats.filter((entry) => entry.key !== key);
  updatedStats.push({
    key,
    name: existing?.name ?? name,
    losses: (existing?.losses ?? 0) + 1,
  });

  return updatedStats.sort(compareLosses);
}

export function saveLossStats(gameId, stats) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(storageKey('losses', gameId), JSON.stringify(stats));
  } catch {
    // Keep the game usable if browser storage is unavailable.
  }
}
