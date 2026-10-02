import { useEffect, useRef, useState } from 'react';
import PlayerLossStatsPanel from './PlayerLossStatsPanel.jsx';
import {
  addPlayerLoss,
  loadGamePlayers,
  loadLossStats,
  saveGamePlayers,
  saveLossStats,
  shufflePlayers,
} from './gameStats.js';

const BOARD_SIZE = 36;
const PLAYER_LIMIT = 8;

function createMinefield() {
  const mineCount = Math.floor(Math.random() * 11) + 5;
  const cells = Array.from({ length: BOARD_SIZE }, (_, index) => index);

  for (let index = cells.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [cells[index], cells[swapIndex]] = [cells[swapIndex], cells[index]];
  }

  return { mineCount, minePositions: cells.slice(0, mineCount) };
}

function createInitialPlayers() {
  return [
    { id: 1, name: 'ผู้เล่น 1' },
    { id: 2, name: 'ผู้เล่น 2' },
  ];
}

function MineIcon({ triggered = false }) {
  return (
    <svg className={triggered ? 'mine-icon is-triggered' : 'mine-icon'} aria-hidden="true" viewBox="0 0 44 44" fill="none">
      <path d="M22 4v8m0 20v8M4 22h8m20 0h8M9.3 9.3l5.7 5.7m14 14 5.7 5.7m0-25.4L29 15m-14 14-5.7 5.7" stroke="#25213F" strokeWidth="3.6" strokeLinecap="round" />
      <circle cx="22" cy="22" r="12.5" fill="#25213F" />
      <path d="M17 17c1.1-1.3 2.4-2 4-2" stroke="#FFF8EE" strokeWidth="2.5" strokeLinecap="round" />
      <path d="m31 7 1.4 3.5 3.6 1.5-3.6 1.5L31 17l-1.4-3.5L26 12l3.6-1.5L31 7Z" fill={triggered ? '#FF6874' : '#FFC94F'} />
    </svg>
  );
}

function AddIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function RemoveIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
      <path d="M5 10h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
      <path d="M3.5 10h12m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MinesweeperGame() {
  const [players, setPlayers] = useState(() => loadGamePlayers('minesweeper', createInitialPlayers()));
  const [nextPlayerId, setNextPlayerId] = useState(() => players.length + 1);
  const [lossStats, setLossStats] = useState(() => loadLossStats('minesweeper'));
  const [phase, setPhase] = useState('setup');
  const [minePositions, setMinePositions] = useState([]);
  const [mineCount, setMineCount] = useState(0);
  const [clearedCells, setClearedCells] = useState(() => new Set());
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [loser, setLoser] = useState('');
  const [triggeredCell, setTriggeredCell] = useState(null);
  const [setupError, setSetupError] = useState('');
  const [roundMessage, setRoundMessage] = useState('เปิดช่องหนึ่งช่องเพื่อเริ่มรอบ');
  const cellRefs = useRef([]);
  const lossRecordedRef = useRef(false);

  const currentPlayer = players[currentPlayerIndex] ?? players[0];
  const minePositionSet = new Set(minePositions);

  useEffect(() => saveGamePlayers('minesweeper', players), [players]);
  useEffect(() => saveLossStats('minesweeper', lossStats), [lossStats]);

  const recordPlayerLoss = (name) => {
    if (lossRecordedRef.current) return;
    lossRecordedRef.current = true;
    setLossStats((stats) => addPlayerLoss(stats, name));
  };

  const updatePlayerName = (playerId, name) => {
    setPlayers((currentPlayers) =>
      currentPlayers.map((player) => (player.id === playerId ? { ...player, name } : player)),
    );
    setSetupError('');
  };

  const addPlayer = () => {
    if (players.length >= PLAYER_LIMIT) return;
    setPlayers((currentPlayers) => [
      ...currentPlayers,
      { id: nextPlayerId, name: `ผู้เล่น ${nextPlayerId}` },
    ]);
    setNextPlayerId((id) => id + 1);
  };

  const removePlayer = (playerId) => {
    if (players.length <= 2) return;
    setPlayers((currentPlayers) => currentPlayers.filter((player) => player.id !== playerId));
    setSetupError('');
  };

  const beginRound = (roundPlayers = players) => {
    const field = createMinefield();
    setPlayers(shufflePlayers(roundPlayers));
    lossRecordedRef.current = false;
    setMinePositions(field.minePositions);
    setMineCount(field.mineCount);
    setClearedCells(new Set());
    setCurrentPlayerIndex(0);
    setLoser('');
    setTriggeredCell(null);
    setSetupError('');
    setRoundMessage('เปิดช่องหนึ่งช่องเพื่อเริ่มรอบ');
    setPhase('playing');
    cellRefs.current = [];
  };

  const startFromSetup = (event) => {
    event.preventDefault();
    const cleanedPlayers = players.map((player) => ({ ...player, name: player.name.trim() }));

    if (cleanedPlayers.some((player) => !player.name)) {
      setSetupError('กรุณากรอกชื่อผู้เล่นให้ครบทุกคน');
      return;
    }

    const names = cleanedPlayers.map((player) => player.name.toLocaleLowerCase());
    if (new Set(names).size !== names.length) {
      setSetupError('ชื่อผู้เล่นต้องไม่ซ้ำกัน เพื่อให้รู้ว่าใครเป็นคนแพ้');
      return;
    }

    beginRound(cleanedPlayers);
  };

  const openCell = (cellIndex) => {
    if (phase !== 'playing' || clearedCells.has(cellIndex)) return;

    if (minePositionSet.has(cellIndex)) {
      setTriggeredCell(cellIndex);
      setLoser(currentPlayer.name);
      recordPlayerLoss(currentPlayer.name);
      setRoundMessage(`บึ้ม! ${currentPlayer.name} เจอระเบิดแล้ว`);
      setPhase('lost');
      return;
    }

    const nextClearedCells = new Set(clearedCells);
    nextClearedCells.add(cellIndex);
    setClearedCells(nextClearedCells);

    const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
    setCurrentPlayerIndex(nextPlayerIndex);
    setRoundMessage(`${currentPlayer.name} รอด! ตาต่อไปเป็นของ ${players[nextPlayerIndex].name}`);

    const nextCellIndex = Array.from({ length: BOARD_SIZE }, (_, offset) => (cellIndex + offset + 1) % BOARD_SIZE)
      .find((index) => !nextClearedCells.has(index));

    if (nextCellIndex !== undefined) {
      window.requestAnimationFrame(() => cellRefs.current[nextCellIndex]?.focus());
    }
  };

  const renderBoard = (revealed = false) => (
    <div className={`mine-board-grid${revealed ? ' is-revealed' : ''}`} role="group" aria-label="กระดานกู้ระเบิด 6 คูณ 6">
      {Array.from({ length: BOARD_SIZE }, (_, cellIndex) => {
        const wasCleared = clearedCells.has(cellIndex);
        const isMine = minePositionSet.has(cellIndex);

        if (revealed) {
          return isMine ? (
            <div
              className={`mine-tile mine-visible${triggeredCell === cellIndex ? ' is-triggered' : ''}`}
              key={cellIndex}
              role="img"
              aria-label={`ช่องที่ ${cellIndex + 1} มีระเบิด${triggeredCell === cellIndex ? ' และเป็นช่องที่กดโดน' : ''}`}
              style={{ '--cell-order': cellIndex }}
            >
              <MineIcon triggered={triggeredCell === cellIndex} />
            </div>
          ) : (
            <div
              className="mine-tile is-cleared is-blasted-safe"
              key={cellIndex}
              role="img"
              aria-label={`ช่องที่ ${cellIndex + 1} ปลอดภัย`}
            />
          );
        }

        if (wasCleared) {
          return (
            <button
              className="mine-tile is-cleared"
              type="button"
              disabled
              aria-label={`ช่องที่ ${cellIndex + 1} ปลอดภัยและเปิดแล้ว`}
              key={cellIndex}
            />
          );
        }

        return (
          <button
            className="mine-tile is-hidden"
            type="button"
            aria-label={`ช่องที่ ${cellIndex + 1} ยังไม่เปิด`}
            key={cellIndex}
            ref={(element) => { cellRefs.current[cellIndex] = element; }}
            onClick={() => openCell(cellIndex)}
          >
            <span className="tile-glyph" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );

  return (
    <section className="minesweeper-shell" aria-labelledby="minesweeper-title">
      <div className="minesweeper-container">
        <header className="minesweeper-heading">
          <span className="section-kicker">เกมที่ 02 · เกมปาร์ตี้</span>
          <h1 id="minesweeper-title">เปิดช่อง ลุ้นบึ้ม</h1>
          <p>ผลัดกันเปิดช่องปลอดภัย ใครกดเจอระเบิดคนนั้นแพ้</p>
        </header>

        {phase === 'setup' && (
          <div className="mine-setup-layout">
            <section className="guess-panel setup-panel" aria-labelledby="mine-players-title">
              <div className="guess-panel-heading">
                <span className="panel-step">ก่อนเริ่มเกม</span>
                <h2 id="mine-players-title">ใครจะเป็นคนเปิดช่อง?</h2>
                <p>ใส่ชื่อผู้เล่น ระบบจะสุ่มลำดับก่อนเริ่มทุกรอบ</p>
              </div>

              <form onSubmit={startFromSetup}>
                <div className="player-list">
                  {players.map((player, index) => (
                    <div className="player-row" key={player.id}>
                      <span className={`player-number player-number--${index % 4}`} aria-hidden="true">{index + 1}</span>
                      <label className="visually-hidden" htmlFor={`mine-player-${player.id}`}>ชื่อผู้เล่นคนที่ {index + 1}</label>
                      <input
                        id={`mine-player-${player.id}`}
                        value={player.name}
                        maxLength={24}
                        onChange={(event) => updatePlayerName(player.id, event.target.value)}
                        placeholder={`ชื่อผู้เล่น ${index + 1}`}
                        autoComplete="off"
                      />
                      <button
                        className="remove-player-button"
                        type="button"
                        aria-label={`ลบผู้เล่น ${player.name || index + 1}`}
                        disabled={players.length <= 2}
                        onClick={() => removePlayer(player.id)}
                      >
                        <RemoveIcon />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="setup-actions">
                  <button
                    className="add-player-button"
                    type="button"
                    disabled={players.length >= PLAYER_LIMIT}
                    onClick={addPlayer}
                  >
                    <AddIcon /> เพิ่มผู้เล่น <span>({players.length}/{PLAYER_LIMIT})</span>
                  </button>
                  <p className="setup-hint">ตั้งวงได้ 2–{PLAYER_LIMIT} คน ชื่อไม่ซ้ำกัน</p>
                </div>

                {setupError && <p className="form-error" role="alert">{setupError}</p>}

                <button className="button button--primary guess-start-button" type="submit">
                  เริ่มเกม <ArrowIcon />
                </button>
              </form>
            </section>

            <div className="mine-setup-sidebar">
              <aside className="mine-rules-panel" aria-labelledby="mine-rules-title">
                <div className="mine-rules-icon" aria-hidden="true"><MineIcon /></div>
                <span className="panel-step">กติกาในรอบนี้</span>
                <h2 id="mine-rules-title">เปิดทีละช่อง<br />อย่าให้เจอระเบิด</h2>
                <ul className="mine-rules-list">
                  <li><span>36</span><p>กระดานมี 6 × 6 ช่อง</p></li>
                  <li><span>5–15</span><p>สุ่มจำนวนระเบิดใหม่ทุกรอบ</p></li>
                  <li><span>→</span><p>ช่องปลอดภัยหายไป แล้วส่งตาให้คนถัดไป</p></li>
                </ul>
                <div className="mine-rule-note">ถ้าใครเปิดเจอระเบิด กระดานจะเผยระเบิดทั้งหมด</div>
              </aside>
              <PlayerLossStatsPanel
                id="minesweeper-loss-stats"
                stats={lossStats}
                onReset={() => setLossStats([])}
              />
            </div>
          </div>
        )}

        {phase === 'playing' && (
          <div className="mine-playing-layout">
            <aside className="mine-round-sidebar">
              <section className="turn-card" aria-live="polite">
                <span className="panel-step">ถึงตาเปิดช่อง</span>
                <div className="turn-player">
                  <span className={`turn-avatar player-number--${currentPlayerIndex % 4}`} aria-hidden="true">{currentPlayerIndex + 1}</span>
                  <div><small>คนที่กำลังเล่น</small><strong>{currentPlayer.name}</strong></div>
                </div>
                <div className="turn-order" aria-label={`ผู้เล่นทั้งหมด ${players.length} คน`}>
                  {players.map((player, index) => (
                    <span className={index === currentPlayerIndex ? 'is-current' : ''} key={player.id} title={player.name} />
                  ))}
                </div>
              </section>

              <section className="mine-stats-card">
                <span className="panel-step">สถานะกระดาน</span>
                <div className="mine-stat-line"><span>ช่องทั้งหมด</span><strong>36</strong></div>
                <div className="mine-stat-line"><span>เปิดไปแล้ว</span><strong>{clearedCells.size}</strong></div>
                <div className="mine-stat-line"><span>ยังเหลือ</span><strong>{BOARD_SIZE - clearedCells.size}</strong></div>
                <div className="mine-stat-range"><MineIcon /> ระเบิดสุ่ม 5–15 ลูก</div>
              </section>
            </aside>

            <section className="mine-board-panel" aria-labelledby="mine-board-title">
              <div className="mine-board-heading">
                <div>
                  <span className="panel-step">เปิดได้ครั้งละ 1 ช่อง</span>
                  <h2 id="mine-board-title">เลือกช่องที่ยังไม่เปิด</h2>
                </div>
                <span className="board-count">{BOARD_SIZE - clearedCells.size}<small>ช่อง</small></span>
              </div>
              {renderBoard()}
              <p className="mine-round-message" role="status" aria-live="polite">{roundMessage}</p>
            </section>
          </div>
        )}

        {phase === 'lost' && (
          <div className="mine-loss-layout" aria-live="assertive">
            <section className="mine-board-panel is-exploded" aria-labelledby="mine-reveal-title">
              <div className="mine-board-heading">
                <div>
                  <span className="panel-step">บึ้ม! เปิดระเบิดทั้งกระดาน</span>
                  <h2 id="mine-reveal-title">มีระเบิด {mineCount} ลูก</h2>
                </div>
                <span className="mine-board-burst" aria-hidden="true">!</span>
              </div>
              {renderBoard(true)}
            </section>

            <section className="mine-loss-card" aria-labelledby="mine-loss-title">
              <div className="loss-mine-art" aria-hidden="true">
                <span className="loss-mine-flash" />
                <MineIcon triggered />
              </div>
              <span className="loss-secret">ระเบิดช่องที่ {triggeredCell + 1}</span>
              <h2 id="mine-loss-title">{loser} แพ้แล้ว!</h2>
              <p>เปิดเจอระเบิดเข้าเต็ม ๆ รอบนี้จบแล้ว!</p>
              <button className="button button--primary mine-restart-button" type="button" onClick={() => beginRound()}>
                เริ่มเกมใหม่ <ArrowIcon />
              </button>
              <button className="change-players-button" type="button" onClick={() => setPhase('setup')}>
                เปลี่ยนผู้เล่น
              </button>
            </section>
          </div>
        )}
      </div>
    </section>
  );
}

export default MinesweeperGame;
