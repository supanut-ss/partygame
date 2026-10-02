import { useEffect, useRef, useState } from 'react';
import { loadGamePlayers, saveGamePlayers, shufflePlayers } from './gameStats.js';
import { promptTopics, truthOrDarePrompts } from './truthOrDareTopics.js';

const GAME_ID = 'truth-or-dare';
const MAX_PLAYERS = 8;
const promptPool = promptTopics.flatMap((topic) =>
  ['truth', 'dare'].flatMap((mode) =>
    truthOrDarePrompts[topic.id][mode].map((text, index) => ({
      id: `${topic.id}-${mode}-${index}`,
      topic: topic.id,
      mode,
      text,
    })),
  ),
);

function createInitialPlayers() {
  return [
    { id: 1, name: 'ผู้เล่น 1' },
    { id: 2, name: 'ผู้เล่น 2' },
  ];
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
      <path d="M4 10h11m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TruthOrDareGame() {
  const [players, setPlayers] = useState(() => loadGamePlayers(GAME_ID, createInitialPlayers()));
  const [nextPlayerId, setNextPlayerId] = useState(() => players.length + 1);
  const [phase, setPhase] = useState('setup');
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [roundNumber, setRoundNumber] = useState(1);
  const [selectedMode, setSelectedMode] = useState(null);
  const [activePrompt, setActivePrompt] = useState(null);
  const [setupError, setSetupError] = useState('');
  const usedPromptsRef = useRef(new Set());

  const currentPlayer = players[currentPlayerIndex] ?? players[0];

  useEffect(() => saveGamePlayers(GAME_ID, players), [players]);

  const updatePlayerName = (playerId, name) => {
    setPlayers((currentPlayers) =>
      currentPlayers.map((player) => (player.id === playerId ? { ...player, name } : player)),
    );
    setSetupError('');
  };

  const addPlayer = () => {
    if (players.length >= MAX_PLAYERS) return;
    setPlayers((currentPlayers) => [...currentPlayers, { id: nextPlayerId, name: '' }]);
    setNextPlayerId((id) => id + 1);
    setSetupError('');
  };

  const removePlayer = (playerId) => {
    if (players.length <= 2) return;
    setPlayers((currentPlayers) => currentPlayers.filter((player) => player.id !== playerId));
    setSetupError('');
  };

  const beginSession = (roundPlayers) => {
    setPlayers(shufflePlayers(roundPlayers));
    setCurrentPlayerIndex(0);
    setRoundNumber(1);
    setSelectedMode(null);
    setActivePrompt(null);
    setSetupError('');
    usedPromptsRef.current.clear();
    setPhase('choose');
  };

  const startFromSetup = (event) => {
    event.preventDefault();
    const cleanedPlayers = players.map((player) => ({ ...player, name: player.name.trim() }));

    if (cleanedPlayers.some((player) => !player.name)) {
      setSetupError('กรุณากรอกชื่อผู้เล่นให้ครบทุกคน');
      return;
    }

    const names = cleanedPlayers.map((player) => player.name.normalize('NFKC').toLocaleLowerCase());
    if (new Set(names).size !== names.length) {
      setSetupError('ชื่อผู้เล่นต้องไม่ซ้ำกัน เพื่อให้รู้ว่าใครเป็นคนเล่น');
      return;
    }

    beginSession(cleanedPlayers);
  };

  const drawRandomPrompt = (mode = selectedMode) => {
    if (mode !== 'truth' && mode !== 'dare') return;

    const usedPromptIds = usedPromptsRef.current;
    const modePrompts = promptPool.filter((prompt) => prompt.mode === mode);
    let availablePrompts = modePrompts.filter((prompt) => !usedPromptIds.has(prompt.id));

    if (availablePrompts.length === 0) {
      modePrompts.forEach((prompt) => usedPromptIds.delete(prompt.id));
      availablePrompts = modePrompts;
    }

    const prompt = availablePrompts[Math.floor(Math.random() * availablePrompts.length)];
    usedPromptIds.add(prompt.id);
    setSelectedMode(mode);
    setActivePrompt(prompt);
    setPhase('prompt');
  };

  const advanceTurn = () => {
    setActivePrompt(null);
    setSelectedMode(null);
    setPhase('choose');

    if (currentPlayerIndex + 1 >= players.length) {
      setPlayers(shufflePlayers(players));
      setCurrentPlayerIndex(0);
      setRoundNumber((round) => round + 1);
      return;
    }

    setCurrentPlayerIndex((index) => index + 1);
  };

  const restartSession = () => beginSession(players);

  return (
    <section className="truth-game-shell" aria-labelledby="truth-game-title">
      <div className="truth-game-container">
        <header className="truth-game-heading">
          <span className="section-kicker">เกมที่ 03 · เกมปาร์ตี้</span>
          <h1 id="truth-game-title">Truth <span>or</span> Dare</h1>
          <p>เลือกความจริงหรือความกล้า แล้วส่งเสียงหัวเราะต่อกันทั้งวง</p>
        </header>

        {phase === 'setup' ? (
          <div className="truth-setup-layout">
            <section className="guess-panel setup-panel" aria-labelledby="truth-players-title">
              <div className="guess-panel-heading">
                <span className="panel-step">ก่อนเริ่มเกม</span>
                <h2 id="truth-players-title">ใครอยู่ในวงบ้าง?</h2>
                <p>ใส่ชื่อผู้เล่น แล้วระบบจะสุ่มลำดับใหม่ทุกครั้งที่เริ่มรอบ</p>
              </div>

              <form onSubmit={startFromSetup}>
                <div className="player-list">
                  {players.map((player, index) => (
                    <div className="player-row" key={player.id}>
                      <span className={`player-number player-number--${index % 4}`} aria-hidden="true">{index + 1}</span>
                      <label className="visually-hidden" htmlFor={`truth-player-${player.id}`}>ชื่อผู้เล่นคนที่ {index + 1}</label>
                      <input
                        id={`truth-player-${player.id}`}
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
                        <span aria-hidden="true">−</span>
                      </button>
                    </div>
                  ))}
                </div>

                <div className="setup-actions">
                  <button
                    className="add-player-button"
                    type="button"
                    disabled={players.length >= MAX_PLAYERS}
                    onClick={addPlayer}
                  >
                    <span aria-hidden="true">+</span> เพิ่มผู้เล่น <span>({players.length}/{MAX_PLAYERS})</span>
                  </button>
                  <p className="setup-hint">เล่นได้ 2–{MAX_PLAYERS} คน โจทย์เลือกผ่านได้เสมอ</p>
                </div>

                {setupError && <p className="form-error" role="alert">{setupError}</p>}

                <button className="button button--primary guess-start-button" type="submit">
                  เริ่มเล่น <ArrowIcon />
                </button>
              </form>
            </section>

            <aside className="truth-rules-panel" aria-labelledby="truth-rules-title">
              <span className="truth-rules-mark" aria-hidden="true">T<span>?</span>D</span>
              <span className="panel-step">เล่นง่าย ไม่กดดัน</span>
              <h2 id="truth-rules-title">เลือกโจทย์<br />ให้เข้ากับวง</h2>
              <ol className="truth-rules-list">
                <li><span>1</span><p>เลือก Truth หรือ Dare ก่อนสุ่มคำถาม</p></li>
                <li><span>2</span><p>คำถามสุ่มจากหลายเรื่องใกล้ตัวและชีวิตประจำวัน</p></li>
                <li><span>3</span><p>ขอเปลี่ยนโจทย์หรือส่งตาได้ ไม่มีบทลงโทษ</p></li>
              </ol>
              <p className="truth-storage-note">รายชื่อผู้เล่นจะจำไว้ในเบราว์เซอร์นี้</p>
            </aside>
          </div>
        ) : (
          <div className="truth-play-layout">
            <aside className="truth-turn-sidebar" aria-label="ลำดับผู้เล่น">
              <div className="truth-round-badge">รอบที่ {roundNumber}</div>
              <div className="truth-current-player">
                <span className="panel-step">ตานี้เป็นของ</span>
                <strong>{currentPlayer.name}</strong>
                <span className="truth-turn-count">ผู้เล่น {currentPlayerIndex + 1} จาก {players.length} คน</span>
              </div>

              <ol className="truth-player-order">
                {players.map((player, index) => (
                  <li className={index === currentPlayerIndex ? 'is-active' : ''} key={player.id}>
                    <span className="truth-order-number">{String(index + 1).padStart(2, '0')}</span>
                    <span className="truth-order-name">{player.name}</span>
                    {index === currentPlayerIndex && <span className="truth-now-label">ตานี้</span>}
                  </li>
                ))}
              </ol>

              <button className="truth-sidebar-button" type="button" onClick={restartSession}>
                สุ่มลำดับใหม่
              </button>
              <button className="truth-change-players" type="button" onClick={() => setPhase('setup')}>
                เปลี่ยนรายชื่อผู้เล่น
              </button>
            </aside>

            <section className="truth-content-panel" aria-live="polite" aria-label="โจทย์ในตานี้">
              {phase === 'choose' ? (
                <div className="truth-choose-stage">
                  <span className="panel-step">เลือกโหมดของตานี้</span>
                  <h2>Truth หรือ Dare?</h2>
                  <p className="truth-stage-description">เลือกแบบที่อยากเล่น แล้วสุ่มคำถามได้เลย</p>

                  <div className="truth-choice-options" aria-label="เลือกโหมดคำถาม">
                    <button
                      className="truth-choice-button truth-choice-button--truth"
                      type="button"
                      onClick={() => drawRandomPrompt('truth')}
                    >
                      <span className="truth-choice-label">Truth</span>
                      <span className="truth-choice-subtitle">ตอบความจริง</span>
                    </button>
                    <button
                      className="truth-choice-button truth-choice-button--dare"
                      type="button"
                      onClick={() => drawRandomPrompt('dare')}
                    >
                      <span className="truth-choice-label">Dare</span>
                      <span className="truth-choice-subtitle">ทำตามคำท้า</span>
                    </button>
                  </div>
                  <p className="truth-pass-note">ไม่สะดวกตอบหรือทำ? เปลี่ยนโจทย์หรือส่งตาได้เลย</p>
                </div>
              ) : (
                <div className="truth-prompt-stage">
                  <div className={`truth-prompt-card truth-prompt-card--${activePrompt.mode}`}>
                    <div className="truth-prompt-meta">
                      <span className={`truth-prompt-mode truth-prompt-mode--${activePrompt.mode}`}>
                        {activePrompt.mode === 'truth' ? 'TRUTH' : 'DARE'}
                      </span>
                    </div>
                    <p className="truth-prompt-text">{activePrompt.text}</p>
                    <span className="truth-prompt-caption">โจทย์สำหรับ {currentPlayer.name}</span>
                  </div>
                  <div className="truth-prompt-actions">
                    <button
                      className="truth-redraw-button"
                      type="button"
                      onClick={() => drawRandomPrompt(selectedMode)}
                    >
                      ขอเปลี่ยนโจทย์
                    </button>
                    <button className="button button--primary truth-next-button" type="button" onClick={advanceTurn}>
                      ส่งตาให้คนถัดไป <ArrowIcon />
                    </button>
                  </div>
                  <p className="truth-pass-note">ทุกคนเลือกผ่านได้ ไม่มีคะแนนหรือบทลงโทษ</p>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </section>
  );
}

export default TruthOrDareGame;
