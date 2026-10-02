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
import { createSecretNumber, parseGuessValue } from './numberGuess.js';

const MAX_PLAYERS = 8;

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

function MicrophoneIcon({ listening }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <rect x="9" y="3" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3m-4 0h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      {listening && <circle cx="18.5" cy="5.5" r="2.5" fill="#FF6874" />}
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

function ExplosionArtwork() {
  return (
    <div className="explosion-art" aria-hidden="true">
      <svg viewBox="0 0 280 250" fill="none">
        <path
          className="explosion-rays"
          d="m140 4 16 38 32-27-1 43 45-12-18 39 49 8-36 29 37 31-48 4 13 44-42-19-13 44-28-36-31 35-3-45-46 13 20-42-45-13 38-25-31-35 47-3-9-45 39 21 15-47Z"
          fill="#FFC94F"
        />
        <path
          className="explosion-core"
          d="m139 42 16 29 35-8-16 32 26 23-35 8-4 36-25-24-29 20-1-36-33-15 31-19-10-34 33 11 22-23Z"
          fill="#FF6874"
        />
        <path d="M82 57 69 44m129 9 15-16M68 167l-20 7m160 25 17 12" stroke="#7355E8" strokeWidth="8" strokeLinecap="round" />
        <circle cx="85" cy="34" r="6" fill="#63C9A8" />
        <circle cx="220" cy="83" r="7" fill="#7355E8" />
        <circle cx="53" cy="116" r="5" fill="#FF6874" />
        <circle cx="211" cy="178" r="5" fill="#FFC94F" />
        <path d="m107 94 4 10 11 1-8 7 2 11-9-6-9 6 3-11-9-7 11-1 4-10Z" fill="#FFF8EE" />
        <path d="m166 119 3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1 3-7Z" fill="#FFF8EE" />
      </svg>
      <span>บึ้ม!</span>
    </div>
  );
}

function SpeechRecognitionConstructor() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function createInitialPlayers() {
  return [
    { id: 1, name: 'ผู้เล่น 1' },
    { id: 2, name: 'ผู้เล่น 2' },
  ];
}

function NumberGuessGame() {
  const [players, setPlayers] = useState(() => loadGamePlayers('number-guess', createInitialPlayers()));
  const [nextPlayerId, setNextPlayerId] = useState(() => players.length + 1);
  const [lossStats, setLossStats] = useState(() => loadLossStats('number-guess'));
  const [phase, setPhase] = useState('setup');
  const [secretNumber, setSecretNumber] = useState(null);
  const [loser, setLoser] = useState('');
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [range, setRange] = useState({ min: 1, max: 100 });
  const [guessInput, setGuessInput] = useState('');
  const [guessHistory, setGuessHistory] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [setupError, setSetupError] = useState('');
  const [speechMessage, setSpeechMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const lossRecordedRef = useRef(false);

  const currentPlayer = players[currentPlayerIndex] ?? players[0];
  const SpeechRecognition = SpeechRecognitionConstructor();
  const speechSupported = Boolean(SpeechRecognition);

  useEffect(() => () => recognitionRef.current?.abort(), []);
  useEffect(() => saveGamePlayers('number-guess', players), [players]);
  useEffect(() => saveLossStats('number-guess', lossStats), [lossStats]);

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
    if (players.length >= MAX_PLAYERS) return;
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

  const stopSpeechInput = () => {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    setIsListening(false);

    if (!recognition) return;
    recognition.onstart = null;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    try {
      recognition.abort();
    } catch {
      // The recognition service may already be stopped.
    }
  };

  const beginRound = (roundPlayers = players) => {
    stopSpeechInput();
    setPlayers(shufflePlayers(roundPlayers));
    lossRecordedRef.current = false;
    setSecretNumber(createSecretNumber());
    setLoser('');
    setCurrentPlayerIndex(0);
    setRange({ min: 1, max: 100 });
    setGuessInput('');
    setGuessHistory([]);
    setFeedback(null);
    setErrorMessage('');
    setSetupError('');
    setSpeechMessage('');
    setPhase('playing');
  };

  const startFromSetup = (event) => {
    event.preventDefault();
    const cleanedPlayers = players.map((player) => ({
      ...player,
      name: player.name.trim(),
    }));

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

  const submitGuess = (rawValue) => {
    const guess = typeof rawValue === 'number' ? rawValue : Number(rawValue);

    if (!Number.isInteger(guess) || guess < 1 || guess > 100) {
      setErrorMessage('กรุณาใส่จำนวนเต็มตั้งแต่ 1 ถึง 100');
      return;
    }

    if (guess < range.min || guess > range.max) {
      setErrorMessage(`ทายได้เฉพาะเลขที่ยังเหลือ ${range.min} ถึง ${range.max}`);
      return;
    }

    setErrorMessage('');

    if (guess === secretNumber) {
      setGuessHistory((history) => [...history, { player: currentPlayer.name, guess, outcome: 'แพ้' }]);
      setLoser(currentPlayer.name);
      recordPlayerLoss(currentPlayer.name);
      setPhase('lost');
      stopSpeechInput();
      return;
    }

    const guessedTooLow = guess < secretNumber;
    const nextRange = guessedTooLow
      ? { ...range, min: guess + 1 }
      : { ...range, max: guess - 1 };
    const nextFeedback = {
      player: currentPlayer.name,
      guess,
      direction: guessedTooLow ? 'มากกว่า' : 'น้อยกว่า',
    };

    setRange(nextRange);
    setFeedback(nextFeedback);
    setGuessHistory((history) => [
      ...history,
      { ...nextFeedback, outcome: guessedTooLow ? 'มากไป' : 'น้อยไป' },
    ]);
    setCurrentPlayerIndex((index) => (index + 1) % players.length);
    setGuessInput('');
  };

  const handleGuessSubmit = (event) => {
    event.preventDefault();
    stopSpeechInput();
    setSpeechMessage('');
    submitGuess(guessInput);
  };

  const toggleSpeechInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    if (!SpeechRecognition) {
      setSpeechMessage('เบราว์เซอร์นี้ไม่รองรับการทายด้วยเสียง กรุณาพิมพ์ตัวเลขแทน');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'th-TH';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;
    setSpeechMessage('กำลังฟัง พูดตัวเลขตั้งแต่ 1 ถึง 100 ได้เลย');
    setErrorMessage('');

    recognition.onstart = () => setIsListening(true);
    recognition.onerror = (event) => {
      const message = event.error === 'not-allowed' || event.error === 'service-not-allowed'
        ? 'ไมโครโฟนยังไม่ได้รับอนุญาต กรุณาพิมพ์ตัวเลขหรือเปิดสิทธิ์ไมโครโฟน'
        : event.error === 'no-speech'
          ? 'ยังไม่ได้ยินเสียง ลองพูดอีกครั้งหรือพิมพ์ตัวเลข'
          : 'ฟังเสียงไม่สำเร็จ ลองพิมพ์ตัวเลขแทนได้เลย';
      setSpeechMessage(message);
      setIsListening(false);
    };
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? '';
      const spokenGuess = parseGuessValue(transcript);
      setSpeechMessage(`ได้ยินว่า “${transcript}”`);

      if (!Number.isInteger(spokenGuess)) {
        setErrorMessage('จับตัวเลขไม่สำเร็จ ลองพูดเลขอีกครั้งหรือพิมพ์แทน');
        return;
      }

      setGuessInput(String(spokenGuess));
      submitGuess(spokenGuess);
    };
    recognition.onend = () => {
      setIsListening(false);
      if (recognitionRef.current === recognition) recognitionRef.current = null;
    };

    try {
      recognition.start();
    } catch {
      setSpeechMessage('เริ่มฟังเสียงไม่ได้ ลองพิมพ์ตัวเลขแทนได้เลย');
      setIsListening(false);
      recognitionRef.current = null;
    }
  };

  const rangeLeft = `${((range.min - 1) / 100) * 100}%`;
  const rangeWidth = `${((range.max - range.min + 1) / 100) * 100}%`;

  return (
    <section className="guess-game-shell" aria-labelledby="number-game-title">
      <div className="guess-game-container">
        <header className="guess-game-heading">
          <span className="section-kicker">เกมที่ 01 · เกมปาร์ตี้</span>
          <h1 id="number-game-title">อย่าโดน <span>เลขลับ!</span></h1>
          <p>ผลัดกันทายเลขที่ซ่อนอยู่ ใครทายเจอคนนั้นแพ้!</p>
        </header>

        {phase === 'setup' && (
          <div className="guess-setup-layout">
            <section className="guess-panel setup-panel" aria-labelledby="players-title">
              <div className="guess-panel-heading">
                <span className="panel-step">ก่อนเริ่มเกม</span>
                <h2 id="players-title">ใครอยู่ในวงบ้าง?</h2>
                <p>ใส่ชื่อผู้เล่นอย่างน้อย 2 คน ระบบจะสุ่มลำดับก่อนเริ่มทุกรอบ</p>
              </div>

              <form onSubmit={startFromSetup}>
                <div className="player-list">
                  {players.map((player, index) => (
                    <div className="player-row" key={player.id}>
                      <span className={`player-number player-number--${index % 4}`} aria-hidden="true">{index + 1}</span>
                      <label className="visually-hidden" htmlFor={`player-${player.id}`}>ชื่อผู้เล่นคนที่ {index + 1}</label>
                      <input
                        id={`player-${player.id}`}
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
                    disabled={players.length >= MAX_PLAYERS}
                    onClick={addPlayer}
                  >
                    <AddIcon /> เพิ่มผู้เล่น <span>({players.length}/{MAX_PLAYERS})</span>
                  </button>
                  <p className="setup-hint">ตั้งวงได้ 2–{MAX_PLAYERS} คน ชื่อผู้เล่นไม่ซ้ำกัน</p>
                </div>

                {setupError && <p className="form-error" role="alert">{setupError}</p>}

                <button className="button button--primary guess-start-button" type="submit">
                  เริ่มเกม <ArrowIcon />
                </button>
              </form>
            </section>

            <div className="guess-setup-sidebar">
              <aside className="guess-rules-panel" aria-labelledby="rules-title">
                <div className="rules-doodle" aria-hidden="true"><span>?</span></div>
                <span className="panel-step">กติกาง่าย ๆ</span>
                <h2 id="rules-title">ทายต่อกันไป<br />จนมีคนพลาด</h2>
                <ol className="rules-list">
                  <li><span>1</span><p>ระบบสุ่มเลขลับหนึ่งตัวจาก 1 ถึง 100</p></li>
                  <li><span>2</span><p>ผลัดกันทาย จะพิมพ์หรือพูดก็ได้</p></li>
                  <li><span>3</span><p>เลขที่ทายถูกตัดออก คนที่เจอเลขลับแพ้</p></li>
                </ol>
                <div className="rules-range"><span>ช่วงเริ่มต้น</span><strong>1 <i /> 100</strong></div>
              </aside>
              <PlayerLossStatsPanel
                id="number-guess-loss-stats"
                stats={lossStats}
                onReset={() => setLossStats([])}
              />
            </div>
          </div>
        )}

        {phase === 'playing' && (
          <div className="guess-playing-layout">
            <aside className="guess-round-sidebar">
              <section className="turn-card" aria-live="polite">
                <span className="panel-step">ตาของใครแล้ว?</span>
                <div className="turn-player">
                  <span className={`turn-avatar player-number--${currentPlayerIndex % 4}`} aria-hidden="true">{currentPlayerIndex + 1}</span>
                  <div><small>ถึงตาของ</small><strong>{currentPlayer.name}</strong></div>
                </div>
                <div className="turn-order" aria-label={`ผู้เล่นทั้งหมด ${players.length} คน`}>
                  {players.map((player, index) => (
                    <span className={index === currentPlayerIndex ? 'is-current' : ''} key={player.id} title={player.name} />
                  ))}
                </div>
              </section>

              <section className="remaining-card" aria-live="polite" aria-label={`เลขที่ยังเป็นไปได้ ${range.min} ถึง ${range.max}`}>
                <span className="panel-step">เลขที่ยังเป็นไปได้</span>
                <strong className="remaining-range">{range.min}<span>ถึง</span>{range.max}</strong>
                <div className="range-track" aria-hidden="true">
                  <span style={{ left: rangeLeft, width: rangeWidth }} />
                </div>
                <p>เลขที่ถูกตัดออกแล้วจะทายซ้ำไม่ได้</p>
              </section>

              <div id="guess-feedback-message" className={`direction-feedback${feedback ? ' has-feedback' : ''}`} role="status" aria-live="polite">
                {feedback ? (
                  <>
                    <span className="feedback-arrow" aria-hidden="true">{feedback.direction === 'มากกว่า' ? '↑' : '↓'}</span>
                    <div><strong>{feedback.direction} {feedback.guess}</strong><span>เลขลับอยู่{feedback.direction} {feedback.guess}</span></div>
                  </>
                ) : (
                  <><span className="feedback-dot" /><div><strong>ยังไม่มีคำทาย</strong><span>เริ่มทายเลขแรกของวงได้เลย</span></div></>
                )}
              </div>
            </aside>

            <div className="guess-main-column">
              <section className="guess-panel guess-input-panel" aria-labelledby="guess-form-title">
                <div className="guess-panel-heading">
                  <span className="panel-step">ช่วงนี้ทายได้ {range.min}–{range.max}</span>
                  <h2 id="guess-form-title">{currentPlayer.name} คิดว่าเลขอะไร?</h2>
                  <p>ทายเลขที่ยังเหลืออยู่ แล้วส่งต่อให้คนถัดไป</p>
                </div>

                <form onSubmit={handleGuessSubmit}>
                  <label className="guess-input-label" htmlFor="number-guess-input">เลขที่ทาย</label>
                  <div className="guess-input-row">
                    <input
                      id="number-guess-input"
                      type="number"
                      inputMode="numeric"
                      min={range.min}
                      max={range.max}
                      step="1"
                      value={guessInput}
                      onChange={(event) => {
                        setGuessInput(event.target.value);
                        setErrorMessage('');
                      }}
                      placeholder={`${range.min}–${range.max}`}
                      aria-describedby="guess-help guess-feedback-message"
                      autoComplete="off"
                    />
                    <button
                      className={`speech-button${isListening ? ' is-listening' : ''}`}
                      type="button"
                      onClick={toggleSpeechInput}
                      aria-pressed={isListening}
                      aria-label={isListening ? 'หยุดฟังเสียง' : 'ทายด้วยเสียง'}
                    >
                      <MicrophoneIcon listening={isListening} />
                    </button>
                  </div>
                  <div className="guess-form-messages">
                    {errorMessage && <span className="form-error" role="alert">{errorMessage}</span>}
                    <span id="guess-help" className="guess-help">
                      {speechSupported ? 'พิมพ์ตัวเลข หรือกดไมค์แล้วพูดเป็นภาษาไทย' : 'เบราว์เซอร์นี้ไม่รองรับเสียง ให้พิมพ์ตัวเลขแทน'}
                    </span>
                    {speechMessage && <span className="speech-message" aria-live="polite">{speechMessage}</span>}
                  </div>
                  <button className="button button--primary guess-submit-button" type="submit">
                    ส่งคำทาย <ArrowIcon />
                  </button>
                </form>
              </section>

              <section className="guess-history-panel" aria-labelledby="history-title">
                <div className="history-heading"><h2 id="history-title">คำทายในรอบนี้</h2><span>{guessHistory.length} ครั้ง</span></div>
                {guessHistory.length === 0 ? (
                  <p className="empty-history">เมื่อเริ่มทาย ประวัติของทุกคนจะแสดงตรงนี้</p>
                ) : (
                  <ol className="guess-history-list" aria-live="polite">
                    {[...guessHistory].reverse().map((entry, index) => (
                      <li className={entry.outcome === 'แพ้' ? 'history-entry is-losing' : 'history-entry'} key={`${entry.player}-${entry.guess}-${index}`}>
                        <span className="history-number">{entry.guess}</span>
                        <span className="history-player">{entry.player}</span>
                        <span className="history-outcome">{entry.outcome === 'แพ้' ? 'เจอเลขลับ · แพ้' : entry.direction}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </div>
          </div>
        )}

        {phase === 'lost' && (
          <section className="guess-loss-screen" aria-labelledby="loss-title" aria-live="assertive">
            <ExplosionArtwork />
            <span className="loss-secret">เลขลับคือ {secretNumber}</span>
            <h2 id="loss-title">{loser} แพ้แล้ว!</h2>
            <p>ทายเจอเลขที่ระบบสุ่มไว้ รอบนี้รับบทผู้แพ้ไปเลย</p>
            <div className="loss-actions">
              <button className="button button--primary" type="button" onClick={() => beginRound()}>
                เริ่มเกมใหม่ <ArrowIcon />
              </button>
              <button className="change-players-button" type="button" onClick={() => setPhase('setup')}>
                เปลี่ยนผู้เล่น
              </button>
            </div>
          </section>
        )}
      </div>
    </section>
  );
}

export default NumberGuessGame;
