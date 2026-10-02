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

const GAME_ID = 'secret-range';
const MIN_PLAYERS = 3;
const MAX_PLAYERS = 8;

function createInitialPlayers() {
  return Array.from({ length: MIN_PLAYERS }, (_, index) => ({
    id: index + 1,
    name: 'ผู้เล่น ' + (index + 1),
  }));
}

function createDefaultPlayerName(players, id) {
  const existingNames = new Set(
    players.map((player) => player.name.trim().normalize('NFKC').toLocaleLowerCase()),
  );
  let name = 'ผู้เล่น ' + id;
  let suffix = 2;

  while (existingNames.has(name.normalize('NFKC').toLocaleLowerCase())) {
    name = 'ผู้เล่น ' + id + ' (' + suffix + ')';
    suffix += 1;
  }

  return name;
}

function loadInitialPlayers() {
  const savedPlayers = loadGamePlayers(GAME_ID, createInitialPlayers());
  const initializedPlayers = [...savedPlayers];
  let nextId = Math.max(0, ...initializedPlayers.map((player) => Number(player.id) || 0)) + 1;

  while (initializedPlayers.length < MIN_PLAYERS) {
    initializedPlayers.push({
      id: nextId,
      name: createDefaultPlayerName(initializedPlayers, nextId),
    });
    nextId += 1;
  }

  return initializedPlayers;
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

function SecretRangeGame() {
  const [players, setPlayers] = useState(() => loadInitialPlayers());
  const [nextPlayerId, setNextPlayerId] = useState(() => Math.max(0, ...players.map((player) => Number(player.id) || 0)) + 1);
  const [lossStats, setLossStats] = useState(() => loadLossStats(GAME_ID));
  const [phase, setPhase] = useState('setup');
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [submissions, setSubmissions] = useState([]);
  const [secretInput, setSecretInput] = useState('');
  const [inputError, setInputError] = useState('');
  const [setupError, setSetupError] = useState('');
  const [losingPlayers, setLosingPlayers] = useState([]);
  const phaseRef = useRef('setup');
  const currentPlayerIndexRef = useRef(0);
  const submissionsRef = useRef([]);
  const lossRecordedRef = useRef(false);

  const currentPlayer = players[currentPlayerIndex] ?? players[0];
  const minimum = submissions.length > 0 ? Math.min(...submissions.map((entry) => entry.value)) : null;
  const maximum = submissions.length > 0 ? Math.max(...submissions.map((entry) => entry.value)) : null;
  const roundLosers = submissions.filter((entry) => entry.value === minimum || entry.value === maximum);

  useEffect(() => saveGamePlayers(GAME_ID, players), [players]);
  useEffect(() => saveLossStats(GAME_ID, lossStats), [lossStats]);

  const updatePhase = (nextPhase) => {
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
  };

  const updatePlayerName = (playerId, name) => {
    setPlayers((current) => current.map((player) => (player.id === playerId ? { ...player, name } : player)));
    setSetupError('');
  };

  const addPlayer = () => {
    if (players.length >= MAX_PLAYERS) return;
    setPlayers((current) => [...current, { id: nextPlayerId, name: `ผู้เล่น ${nextPlayerId}` }]);
    setNextPlayerId((id) => id + 1);
  };

  const removePlayer = (playerId) => {
    if (players.length <= MIN_PLAYERS) return;
    setPlayers((current) => current.filter((player) => player.id !== playerId));
    setSetupError('');
  };

  const beginRound = (roundPlayers = players) => {
    const shuffledPlayers = shufflePlayers(roundPlayers);
    setPlayers(shuffledPlayers);
    currentPlayerIndexRef.current = 0;
    submissionsRef.current = [];
    setCurrentPlayerIndex(0);
    setSubmissions([]);
    setSecretInput('');
    setInputError('');
    setSetupError('');
    setLosingPlayers([]);
    lossRecordedRef.current = false;
    updatePhase('handoff');
  };

  const startFromSetup = (event) => {
    event.preventDefault();
    const cleanedPlayers = players.map((player) => ({ ...player, name: player.name.trim() }));
    if (cleanedPlayers.length < MIN_PLAYERS) {
      setSetupError('เกมนี้ต้องมีผู้เล่นอย่างน้อย ' + MIN_PLAYERS + ' คน');
      return;
    }
    if (cleanedPlayers.some((player) => !player.name)) {
      setSetupError('กรุณากรอกชื่อผู้เล่นให้ครบทุกคน');
      return;
    }

    const names = cleanedPlayers.map((player) => player.name.normalize('NFKC').toLocaleLowerCase());
    if (new Set(names).size !== names.length) {
      setSetupError('ชื่อผู้เล่นต้องไม่ซ้ำกัน เพื่อให้รู้ว่าใครใส่เลขอะไร');
      return;
    }

    beginRound(cleanedPlayers);
  };

  const startTurn = () => {
    if (phaseRef.current !== 'handoff') return;
    setSecretInput('');
    setInputError('');
    updatePhase('input');
  };

  const recordRoundLosers = (completedSubmissions) => {
    if (lossRecordedRef.current) return;

    const lowest = Math.min(...completedSubmissions.map((entry) => entry.value));
    const highest = Math.max(...completedSubmissions.map((entry) => entry.value));
    const losers = completedSubmissions.filter((entry) => entry.value === lowest || entry.value === highest);
    lossRecordedRef.current = true;
    setLosingPlayers(losers);
    setLossStats((stats) => losers.reduce((updated, player) => addPlayerLoss(updated, player.name), stats));
    updatePhase('result');
  };

  const submitSecret = (event) => {
    event.preventDefault();
    if (phaseRef.current !== 'input' || !currentPlayer) return;

    const trimmedValue = secretInput.trim();
    const value = Number(trimmedValue);
    if (!/^\d{1,4}$/.test(trimmedValue) || !Number.isInteger(value) || value < 1 || value > 1000) {
      setInputError('ใส่จำนวนเต็มตั้งแต่ 1 ถึง 1,000');
      return;
    }

    const completedSubmissions = [
      ...submissionsRef.current,
      { id: currentPlayer.id, name: currentPlayer.name, value },
    ];
    submissionsRef.current = completedSubmissions;
    setSubmissions(completedSubmissions);
    setSecretInput('');
    setInputError('');

    if (completedSubmissions.length === players.length) {
      recordRoundLosers(completedSubmissions);
      return;
    }

    const nextIndex = currentPlayerIndexRef.current + 1;
    currentPlayerIndexRef.current = nextIndex;
    setCurrentPlayerIndex(nextIndex);
    updatePhase('handoff');
  };

  const returnToSetup = () => {
    submissionsRef.current = [];
    currentPlayerIndexRef.current = 0;
    setSubmissions([]);
    setCurrentPlayerIndex(0);
    setSecretInput('');
    setInputError('');
    setLosingPlayers([]);
    updatePhase('setup');
  };

  return (
    <section className="guess-game-shell secret-range-shell" aria-labelledby="secret-range-title">
      <div className="guess-game-container">
        <header className="guess-game-heading">
          <span className="section-kicker">เกมที่ 05 · เกมปาร์ตี้</span>
          <h1 id="secret-range-title">เลขลับ<span>ขั้วสุดขีด</span></h1>
          <p>ทุกคนใส่เลขลับ 1–1,000 คนที่ได้เลขต่ำสุดและสูงสุดแพ้</p>
        </header>

        {phase === 'setup' && (
          <div className="guess-setup-layout">
            <section className="guess-panel setup-panel" aria-labelledby="secret-players-title">
              <div className="guess-panel-heading">
                <span className="panel-step">ก่อนเริ่มเกม</span>
                <h2 id="secret-players-title">ใครอยู่ในวงบ้าง?</h2>
                <p>ใส่ชื่อผู้เล่น ระบบจะสุ่มลำดับการใส่เลขทุกรอบ</p>
              </div>

              <form onSubmit={startFromSetup}>
                <div className="player-list">
                  {players.map((player, index) => (
                    <div className="player-row" key={player.id}>
                      <span className={`player-number player-number--${index % 4}`} aria-hidden="true">{index + 1}</span>
                      <label className="visually-hidden" htmlFor={`secret-player-${player.id}`}>ชื่อผู้เล่นคนที่ {index + 1}</label>
                      <input
                        id={`secret-player-${player.id}`}
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
                        disabled={players.length <= MIN_PLAYERS}
                        onClick={() => removePlayer(player.id)}
                      >
                        <RemoveIcon />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="setup-actions">
                  <button className="add-player-button" type="button" disabled={players.length >= MAX_PLAYERS} onClick={addPlayer}>
                    <AddIcon /> เพิ่มผู้เล่น <span>({players.length}/{MAX_PLAYERS})</span>
                  </button>
                  <p className="setup-hint">เล่นได้ {MIN_PLAYERS}–{MAX_PLAYERS} คน ชื่อไม่ซ้ำกัน</p>
                </div>

                {setupError && <p className="form-error" role="alert">{setupError}</p>}
                <button className="button button--primary guess-start-button" type="submit">
                  เริ่มเกม <ArrowIcon />
                </button>
              </form>
            </section>

            <div className="guess-setup-sidebar">
              <aside className="guess-rules-panel secret-range-rules" aria-labelledby="secret-rules-title">
                <span className="panel-step">กติกาง่าย ๆ</span>
                <h2 id="secret-rules-title">ใส่เลขลับ<br />ลุ้นขั้วสุดโต่ง</h2>
                <ol className="rules-list">
                  <li><span>1</span><p>ส่งอุปกรณ์ให้ผู้เล่นตามคิว แล้วใส่เลข 1–1,000</p></li>
                  <li><span>2</span><p>ซ่อนเลขไว้จนทุกคนส่งคำตอบครบ</p></li>
                  <li><span>3</span><p>เลขต่ำสุดและสูงสุดของรอบเป็นผู้แพ้</p></li>
                </ol>
                <p className="secret-range-note">ตัวเลขจะไม่บันทึกไว้ในเบราว์เซอร์</p>
              </aside>
              <PlayerLossStatsPanel
                id="secret-range-loss-stats"
                stats={lossStats}
                onReset={() => setLossStats([])}
              />
            </div>
          </div>
        )}

        {phase === 'handoff' && currentPlayer && (
          <section className="secret-range-handoff" aria-labelledby="secret-handoff-title">
            <span className="panel-step">ส่งต่ออุปกรณ์ · ผู้เล่น {currentPlayerIndex + 1} จาก {players.length}</span>
            <div className="secret-handoff-icon" aria-hidden="true">
              <svg viewBox="0 0 56 56" fill="none">
                <rect x="9" y="5" width="38" height="46" rx="9" stroke="currentColor" strokeWidth="3" />
                <path d="M22 11h12m-6 33h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                <path d="m20 27 5 5 11-12" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 id="secret-handoff-title">ถึงตา {currentPlayer.name}</h2>
            <p>ส่งจอให้ผู้เล่นคนนี้ ตรวจให้แน่ใจว่าไม่มีใครเห็นตอนกรอกเลข</p>
            <button className="button button--primary secret-handoff-button" type="button" onClick={startTurn}>
              เริ่มใส่เลขลับ <ArrowIcon />
            </button>
            <span className="secret-handoff-progress">ส่งคำตอบแล้ว {submissions.length} / {players.length} คน</span>
          </section>
        )}

        {phase === 'input' && currentPlayer && (
          <div className="secret-range-input-layout">
            <aside className="secret-range-turn-panel" aria-label="ความคืบหน้าการส่งเลข">
              <span className="panel-step">ผู้เล่น {currentPlayerIndex + 1} จาก {players.length}</span>
              <h2>{currentPlayer.name}</h2>
              <div className="secret-range-progress" aria-label={`ส่งเลขแล้ว ${submissions.length} จาก ${players.length} คน`}>
                <span style={{ width: `${(submissions.length / players.length) * 100}%` }} />
              </div>
              <ol className="secret-range-turn-list">
                {players.map((player, index) => (
                  <li className={index < submissions.length ? 'is-submitted' : index === currentPlayerIndex ? 'is-current' : ''} key={player.id}>
                    <span className={`player-number player-number--${index % 4}`} aria-hidden="true">{index + 1}</span>
                    <span>{player.name}</span>
                    <small>{index < submissions.length ? 'ส่งแล้ว' : index === currentPlayerIndex ? 'กำลังเลือก' : 'รอคิว'}</small>
                  </li>
                ))}
              </ol>
              <p className="secret-range-privacy">คำตอบที่ส่งแล้วจะถูกซ่อนไว้จนจบรอบ</p>
            </aside>

            <section className="secret-range-entry-panel" aria-labelledby="secret-entry-title">
              <span className="panel-step">กรอกส่วนตัว · คนอื่นจะไม่เห็นตัวเลข</span>
              <h2 id="secret-entry-title">เลือกเลขของคุณ</h2>
              <p>คิดเลขระหว่าง 1 ถึง 1,000 แล้วส่งคำตอบเมื่อพร้อม</p>
              <form onSubmit={submitSecret}>
                <label htmlFor="secret-range-input">เลขลับ</label>
                <div className="secret-range-field">
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                    <rect x="5" y="10" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <circle cx="12" cy="15" r="1.2" fill="currentColor" />
                  </svg>
                  <input
                    id="secret-range-input"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    autoComplete="new-password"
                    autoCapitalize="off"
                    spellCheck="false"
                    value={secretInput}
                    onChange={(event) => {
                      setSecretInput(event.target.value.replace(/\D/g, '').slice(0, 4));
                      setInputError('');
                    }}
                    aria-describedby="secret-range-help"
                  />
                </div>
                <span id="secret-range-help" className="secret-range-help">เลขที่กรอกจะถูกซ่อนจนกว่าทุกคนจะส่งครบ</span>
                {inputError && <p className="form-error" role="alert">{inputError}</p>}
                <button className="button button--primary secret-submit-button" type="submit">
                  ยืนยันเลขลับ <ArrowIcon />
                </button>
              </form>
            </section>
          </div>
        )}

        {phase === 'result' && (
          <section className="secret-range-result" aria-labelledby="secret-result-title" aria-live="assertive">
            <span className="panel-step">ผลรอบนี้ · คำตอบถูกเปิดเผยแล้ว</span>
            <h2 id="secret-result-title">
              {roundLosers.length === players.length
                ? 'เลขซ้ำทั้งวง! แพ้กันหมดเลย'
                : roundLosers.length > 1
                  ? `${roundLosers.length} คนได้เลขขั้วสุดโต่ง!`
                  : `${roundLosers[0]?.name} แพ้แล้ว!`}
            </h2>
            <p className="secret-range-result-summary">
              เลขต่ำสุด <strong>{minimum}</strong> · เลขสูงสุด <strong>{maximum}</strong>
            </p>
            <ol className="secret-range-result-list">
              {submissions.map((entry, index) => {
                const isLowest = entry.value === minimum;
                const isHighest = entry.value === maximum;
                const isLoser = isLowest || isHighest;
                const label = isLowest && isHighest
                  ? 'ต่ำสุดและสูงสุด · แพ้'
                  : isLowest
                    ? 'ต่ำสุด · แพ้'
                    : isHighest
                      ? 'สูงสุด · แพ้'
                      : 'รอด';
                return (
                  <li className={isLoser ? 'is-loser' : ''} key={entry.id}>
                    <span className={`player-number player-number--${index % 4}`} aria-hidden="true">{index + 1}</span>
                    <span className="secret-result-player">{entry.name}<small>{label}</small></span>
                    <strong>{entry.value}</strong>
                  </li>
                );
              })}
            </ol>
            <div className="secret-range-result-actions">
              <button className="button button--primary" type="button" onClick={() => beginRound()}>
                เริ่มเกมใหม่ <ArrowIcon />
              </button>
              <button className="change-players-button" type="button" onClick={returnToSetup}>เปลี่ยนผู้เล่น</button>
            </div>
          </section>
        )}
      </div>
    </section>
  );
}

export default SecretRangeGame;
