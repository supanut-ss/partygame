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

const GAME_ID = 'last-finger';
const MAX_PLAYERS = 8;

function createInitialPlayers() {
  return [
    { id: 1, name: 'ผู้เล่น 1' },
    { id: 2, name: 'ผู้เล่น 2' },
  ];
}

function getRandomRoundDuration() {
  return 10_000 + Math.floor(Math.random() * 10_001);
}

function formatReactionTime(milliseconds) {
  return `${(milliseconds / 1000).toFixed(2)} วิ`;
}

function LastFingerGame() {
  const [players, setPlayers] = useState(() => loadGamePlayers(GAME_ID, createInitialPlayers()));
  const [nextPlayerId, setNextPlayerId] = useState(() => players.length + 1);
  const [lossStats, setLossStats] = useState(() => loadLossStats(GAME_ID));
  const [phase, setPhase] = useState('setup');
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [turnResults, setTurnResults] = useState([]);
  const [activePlayerReactionMs, setActivePlayerReactionMs] = useState(0);
  const [pulseCount, setPulseCount] = useState(0);
  const [loser, setLoser] = useState(null);
  const [setupError, setSetupError] = useState('');
  const [audioStatus, setAudioStatus] = useState('idle');
  const vibrationSupported = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

  const playersRef = useRef(players);
  const phaseRef = useRef('setup');
  const currentPlayerIndexRef = useRef(0);
  const turnResultsRef = useRef([]);
  const activeContactRef = useRef(null);
  const silenceAtRef = useRef(0);
  const roundDurationRef = useRef(0);
  const lossRecordedRef = useRef(false);
  const audioContextRef = useRef(null);
  const padRef = useRef(null);
  const pulseTimerRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const reactionTimerRef = useRef(null);
  const keyboardHandlersRef = useRef({ onKeyDown: () => {}, onKeyUp: () => {} });

  playersRef.current = players;
  currentPlayerIndexRef.current = currentPlayerIndex;

  useEffect(() => saveGamePlayers(GAME_ID, players), [players]);
  useEffect(() => saveLossStats(GAME_ID, lossStats), [lossStats]);

  const updatePhase = (nextPhase) => {
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
  };

  const clearTimer = (timerRef) => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const clearRoundTimers = () => {
    clearTimer(pulseTimerRef);
    clearTimer(silenceTimerRef);
    if (reactionTimerRef.current !== null) {
      window.clearInterval(reactionTimerRef.current);
      reactionTimerRef.current = null;
    }
  };

  const stopVibration = () => {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(0);
      } catch {
        // Vibration is optional and may be blocked by the browser or device.
      }
    }
  };

  const prepareAudio = async () => {
    if (typeof window === 'undefined') return false;
    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextConstructor) {
      setAudioStatus('unsupported');
      return false;
    }

    setAudioStatus('checking');
    try {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioContextConstructor();
      }
      const context = audioContextRef.current;
      if (context.state !== 'running') {
        await Promise.race([
          context.resume(),
          new Promise((resolve) => window.setTimeout(resolve, 1200)),
        ]);
      }
      const isReady = context.state === 'running';
      setAudioStatus(isReady ? 'ready' : 'unavailable');
      return isReady;
    } catch {
      // Keep the visual signal available when audio cannot start.
      setAudioStatus('unavailable');
      return false;
    }
  };

  const playSignal = ({ test = false } = {}) => {
    const context = audioContextRef.current;
    if (context && context.state !== 'closed') {
      try {
        if (context.state !== 'running') {
          context.resume().catch(() => setAudioStatus('unavailable'));
        }
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const startAt = context.currentTime;
        const signalDuration = test ? 0.16 : 0.08;
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(570, startAt);
        gain.gain.setValueAtTime(0.0001, startAt);
        gain.gain.exponentialRampToValueAtTime(test ? 0.18 : 0.1, startAt + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + signalDuration - 0.005);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(startAt);
        oscillator.stop(startAt + signalDuration);
      } catch {
        // Continue with visual and vibration cues if audio playback fails.
        setAudioStatus('unavailable');
      }
    }

    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(test ? 70 : 40);
      } catch {
        // Keep the sound and visual cues when haptics are unavailable.
      }
    }

    if (
      typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches !== true
    ) {
      padRef.current?.animate?.(
        [
          { transform: 'translate3d(0, 0, 0)' },
          { transform: 'translate3d(-2px, 1px, 0)' },
          { transform: 'translate3d(2px, -1px, 0)' },
          { transform: 'translate3d(0, 0, 0)' },
        ],
        { duration: 115, easing: 'ease-out' },
      );
    }

    if (!test) setPulseCount((count) => count + 1);
  };

  const testAudio = async () => {
    if (await prepareAudio()) playSignal({ test: true });
  };

  const recordLoss = (playerName) => {
    if (lossRecordedRef.current) return;
    lossRecordedRef.current = true;
    setLossStats((stats) => addPlayerLoss(stats, playerName));
  };

  const finishGame = (results) => {
    if (lossRecordedRef.current || results.length === 0) return;
    const slowestPlayer = results.reduce((slowest, result) => (
      result.reactionMs > slowest.reactionMs ? result : slowest
    ));
    setLoser(slowestPlayer);
    recordLoss(slowestPlayer.name);
    updatePhase('result');
  };

  const startTurn = () => {
    if (phaseRef.current !== 'ready') return;

    void prepareAudio();
    roundDurationRef.current = getRandomRoundDuration();
    const duration = roundDurationRef.current;
    const startedAt = Date.now();
    updatePhase('warning');

    const playNextPulse = () => {
      if (phaseRef.current !== 'warning') return;
      const elapsed = Date.now() - startedAt;
      if (elapsed >= duration - 70) return;

      playSignal();
      const progress = elapsed / duration;
      const interval = progress < 0.24
        ? 790 + Math.random() * 510
        : progress < 0.58
          ? 480 + Math.random() * 410
          : progress < 0.8
            ? 310 + Math.random() * 260
            : 150 + Math.random() * 130;
      const remaining = duration - (Date.now() - startedAt);
      if (remaining > 90) {
        pulseTimerRef.current = window.setTimeout(playNextPulse, Math.min(interval, remaining - 70));
      }
    };

    playNextPulse();
    silenceTimerRef.current = window.setTimeout(() => {
      silenceTimerRef.current = null;
      clearTimer(pulseTimerRef);
      stopVibration();
      silenceAtRef.current = performance.now();
      setActivePlayerReactionMs(0);
      updatePhase('silence');
      reactionTimerRef.current = window.setInterval(() => {
        setActivePlayerReactionMs(performance.now() - silenceAtRef.current);
      }, 30);
    }, duration);
  };

  const startTurnWithContact = (contact) => {
    if (phaseRef.current !== 'ready' || activeContactRef.current !== null) return;
    activeContactRef.current = contact;
    setActivePlayerReactionMs(0);
    startTurn();
  };

  const releaseCurrentTurn = (contact) => {
    if (activeContactRef.current !== contact) return;
    const releasedDuring = phaseRef.current;
    activeContactRef.current = null;
    clearRoundTimers();
    stopVibration();

    const currentPlayer = playersRef.current[currentPlayerIndexRef.current];
    if (!currentPlayer) return;

    if (releasedDuring === 'warning') {
      const earlyResult = { id: currentPlayer.id, name: currentPlayer.name, early: true, reactionMs: null };
      const updatedResults = [...turnResultsRef.current, earlyResult];
      turnResultsRef.current = updatedResults;
      setTurnResults(updatedResults);
      setLoser(earlyResult);
      recordLoss(currentPlayer.name);
      updatePhase('result');
      return;
    }

    if (releasedDuring !== 'silence') return;

    const reactionMs = Math.max(0, performance.now() - silenceAtRef.current);
    const turnResult = { id: currentPlayer.id, name: currentPlayer.name, early: false, reactionMs };
    const updatedResults = [...turnResultsRef.current, turnResult];
    turnResultsRef.current = updatedResults;
    setTurnResults(updatedResults);
    setActivePlayerReactionMs(reactionMs);

    if (currentPlayerIndexRef.current + 1 >= playersRef.current.length) {
      finishGame(updatedResults);
      return;
    }

    const nextIndex = currentPlayerIndexRef.current + 1;
    currentPlayerIndexRef.current = nextIndex;
    setCurrentPlayerIndex(nextIndex);
    updatePhase('ready');
  };

  const onPointerDown = (event) => {
    if (phaseRef.current !== 'ready') return;
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Some browsers release a pointer before capture can be requested.
    }
    startTurnWithContact(`pointer:${event.pointerId}`);
  };

  const onPointerUp = (event) => releaseCurrentTurn(`pointer:${event.pointerId}`);

  keyboardHandlersRef.current = {
    onKeyDown: (event) => {
      if (event.code !== 'Space' && event.code !== 'Enter') return;
      if (document.activeElement !== padRef.current || event.repeat) return;
      event.preventDefault();
      startTurnWithContact('keyboard');
    },
    onKeyUp: (event) => {
      if (event.code !== 'Space' && event.code !== 'Enter') return;
      event.preventDefault();
      releaseCurrentTurn('keyboard');
    },
  };

  useEffect(() => {
    const handleKeyDown = (event) => keyboardHandlersRef.current.onKeyDown(event);
    const handleKeyUp = (event) => keyboardHandlersRef.current.onKeyUp(event);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      clearRoundTimers();
      stopVibration();
      audioContextRef.current?.close().catch(() => {});
    };
  }, []);

  const resetRound = () => {
    clearRoundTimers();
    stopVibration();
    activeContactRef.current = null;
    silenceAtRef.current = 0;
    roundDurationRef.current = 0;
    turnResultsRef.current = [];
    currentPlayerIndexRef.current = 0;
    setTurnResults([]);
    setCurrentPlayerIndex(0);
    setActivePlayerReactionMs(0);
    setPulseCount(0);
    setLoser(null);
  };

  const beginRound = (roundPlayers = players) => {
    void prepareAudio();
    resetRound();
    lossRecordedRef.current = false;
    const shuffledPlayers = shufflePlayers(roundPlayers);
    playersRef.current = shuffledPlayers;
    setPlayers(shuffledPlayers);
    setSetupError('');
    updatePhase('ready');
  };

  const startFromSetup = (event) => {
    event.preventDefault();
    const cleanedPlayers = players.map((player) => ({ ...player, name: player.name.trim() }));
    if (cleanedPlayers.some((player) => !player.name)) {
      setSetupError('กรุณากรอกชื่อผู้เล่นให้ครบทุกคน');
      return;
    }
    if (new Set(cleanedPlayers.map((player) => player.name.toLocaleLowerCase())).size !== cleanedPlayers.length) {
      setSetupError('ชื่อผู้เล่นต้องไม่ซ้ำกัน เพื่อให้รู้ว่าใครเป็นคนแพ้');
      return;
    }

    beginRound(cleanedPlayers);
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
    if (players.length <= 2) return;
    setPlayers((current) => current.filter((player) => player.id !== playerId));
    setSetupError('');
  };

  const returnToSetup = () => {
    resetRound();
    updatePhase('setup');
  };

  const currentPlayer = players[currentPlayerIndex] ?? players[0];
  const isPlaying = phase === 'ready' || phase === 'warning' || phase === 'silence';
  const resultByPlayerId = new Map(turnResults.map((result) => [result.id, result]));

  return (
    <section className="guess-game-shell last-finger-game-shell" aria-labelledby="last-finger-title">
      <div className="guess-game-container">
        <header className="guess-game-heading">
          <span className="section-kicker">เกมที่ 04 · เกมปาร์ตี้</span>
          <h1 id="last-finger-title">อย่าปล่อย<span>ช้า!</span></h1>
          <p>เล่นทีละคน รอเสียงเงียบแล้วยกนิ้ว ใครตอบสนองช้าที่สุดแพ้</p>
        </header>

        {phase === 'setup' && (
          <div className="guess-setup-layout">
            <section className="guess-panel setup-panel" aria-labelledby="finger-players-title">
              <div className="guess-panel-heading">
                <span className="panel-step">ก่อนเริ่มเกม</span>
                <h2 id="finger-players-title">ใครอยู่ในวงบ้าง?</h2>
                <p>ใส่ชื่อผู้เล่น 2–{MAX_PLAYERS} คน ระบบจะสุ่มลำดับใหม่ทุกรอบ</p>
              </div>

              <form onSubmit={startFromSetup}>
                <div className="player-list">
                  {players.map((player, index) => (
                    <div className="player-row" key={player.id}>
                      <span className={`player-number player-number--${index % 4}`} aria-hidden="true">{index + 1}</span>
                      <label className="visually-hidden" htmlFor={`finger-player-${player.id}`}>ชื่อผู้เล่นคนที่ {index + 1}</label>
                      <input
                        id={`finger-player-${player.id}`}
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
                        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none"><path d="M5 10h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                      </button>
                    </div>
                  ))}
                </div>

                <div className="setup-actions">
                  <button className="add-player-button" type="button" disabled={players.length >= MAX_PLAYERS} onClick={addPlayer}>
                    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                    เพิ่มผู้เล่น <span>({players.length}/{MAX_PLAYERS})</span>
                  </button>
                  <p className="setup-hint">ชื่อผู้เล่นไม่ซ้ำกัน</p>
                </div>

                {setupError && <p className="form-error" role="alert">{setupError}</p>}
                <button className="button button--primary guess-start-button" type="submit">
                  เริ่มเกม <svg aria-hidden="true" viewBox="0 0 20 20" fill="none"><path d="M3.5 10h12m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </form>
            </section>

            <div className="guess-setup-sidebar">
              <aside className="guess-rules-panel last-finger-rules" aria-labelledby="finger-rules-title">
                <span className="panel-step">กติกาง่าย ๆ</span>
                <h2 id="finger-rules-title">เล่นทีละคน<br />วัดความไวหลังเงียบ</h2>
                <ol className="rules-list">
                  <li><span>1</span><p>ผู้เล่นคนปัจจุบันวางนิ้วค้าง เริ่มสัญญาณของตัวเอง</p></li>
                  <li><span>2</span><p>รอเสียงเงียบแล้วยกนิ้ว ระบบจับเวลาตอบสนอง</p></li>
                  <li><span>3</span><p>เล่นครบทุกคน คนที่ยกช้าที่สุดเป็นผู้แพ้</p></li>
                </ol>
                <div className="last-finger-duration"><span>รอเสียงก่อนเงียบ</span><strong>สุ่ม 10–20 วินาทีต่อคน</strong></div>
                <p className="last-finger-desktop-hint">คอมพิวเตอร์: โฟกัสแป้นเกม แล้วกดค้าง Space หรือ Enter</p>
                <div className="last-finger-audio-check">
                  <button className="last-finger-audio-test-button" type="button" disabled={audioStatus === 'checking'} onClick={testAudio}>
                    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none"><path d="M3.5 8v4h3l4 3V5l-4 3h-3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><path d="M13 7.5a3.5 3.5 0 0 1 0 5m2-7a6.3 6.3 0 0 1 0 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                    ทดสอบเสียงและสั่น
                  </button>
                  <p className="last-finger-support-note" role="status" aria-live="polite">
                    {audioStatus === 'checking'
                      ? 'กำลังตรวจเสียง…'
                      : audioStatus === 'ready'
                        ? 'เสียงพร้อมแล้ว หากไม่ได้ยินให้ตรวจระดับเสียงสื่อและโหมดเงียบ'
                        : audioStatus === 'unsupported'
                          ? 'เบราว์เซอร์นี้ไม่รองรับเสียงเกม'
                          : audioStatus === 'unavailable'
                            ? 'เปิดเสียงเกมไม่ได้ ลองทดสอบอีกครั้งหรือตรวจการตั้งค่าเสียง'
                            : 'แตะเพื่อทดสอบเสียงก่อนเริ่มเกม'}
                  </p>
                </div>
                {!vibrationSupported && (
                  <p className="last-finger-support-note">เบราว์เซอร์นี้ไม่รองรับการสั่นผ่านเว็บ ใช้เสียงและภาพแทน</p>
                )}
              </aside>
              <PlayerLossStatsPanel
                id="last-finger-loss-stats"
                stats={lossStats}
                onReset={() => setLossStats([])}
              />
            </div>
          </div>
        )}

        {isPlaying && currentPlayer && (
          <div className="last-finger-play-layout">
            <section
              ref={padRef}
              className={`last-finger-pad last-finger-pad--${phase}`}
              role="button"
              tabIndex={0}
              aria-label={phase === 'ready'
                ? `แตะค้างเพื่อเริ่มตาของ ${currentPlayer.name}`
                : `ตาของ ${currentPlayer.name} รอฟังสัญญาณแล้วปล่อยเมื่อเงียบ`}
              aria-pressed={phase === 'warning' || phase === 'silence'}
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onLostPointerCapture={onPointerUp}
            >
              <div className="last-finger-signal" aria-live="polite" aria-atomic="true">
                <span key={pulseCount} className={`last-finger-signal-orb${phase === 'warning' ? ' is-active' : ''}`} aria-hidden="true" />
                <span className="last-finger-state-label">
                  {phase === 'ready'
                    ? `ตาของ ${currentPlayer.name}`
                    : phase === 'warning'
                      ? 'ฟังสัญญาณ…'
                      : 'เงียบแล้ว! ยกนิ้วออก'}
                </span>
                <span className="last-finger-state-hint">
                  {phase === 'ready'
                    ? 'วางนิ้วค้างเพื่อเริ่มตานี้'
                    : phase === 'warning'
                      ? 'รอจนเสียงเงียบแล้วค่อยยก'
                      : 'ยกนิ้วให้เร็วที่สุด'}
                </span>
                {phase === 'silence' && (
                  <span className="last-finger-live-time" aria-hidden="true">
                    {formatReactionTime(activePlayerReactionMs)}
                  </span>
                )}
                <span className="last-finger-tap-hint">แต่ละคนเล่นทีละตา · คอมพิวเตอร์กดค้าง Space หรือ Enter</span>
                {!vibrationSupported && (
                  <span className="last-finger-support-note">เบราว์เซอร์นี้ไม่รองรับการสั่นผ่านเว็บ</span>
                )}
                {audioStatus === 'unsupported' && (
                  <span className="last-finger-support-note">เบราว์เซอร์นี้ไม่รองรับเสียงเกม ใช้ภาพแทน</span>
                )}
                {audioStatus === 'unavailable' && (
                  <span className="last-finger-support-note">เสียงเกมเปิดไม่ได้ ตรวจระดับเสียงและโหมดเงียบของเครื่อง</span>
                )}
              </div>

              <div className="last-finger-player-list" aria-label="ลำดับผู้เล่นและเวลาตอบสนอง">
                {players.map((player, index) => {
                  const result = resultByPlayerId.get(player.id);
                  const isCurrent = index === currentPlayerIndex && !result;
                  const status = result
                    ? result.early ? 'ยกก่อนเสียงเงียบ' : formatReactionTime(result.reactionMs)
                    : isCurrent
                      ? phase === 'ready' ? 'ตานี้ · พร้อมเริ่ม' : 'กำลังเล่น'
                      : 'รอคิว';
                  return (
                    <span
                      className={`last-finger-player-chip${isCurrent ? ' is-active' : ''}${result ? ' is-released' : ''}`}
                      key={player.id}
                      aria-label={`${player.name}: ${status}`}
                    >
                      <span className={`player-number player-number--${index % 4}`} aria-hidden="true">{index + 1}</span>
                      <span>{player.name}</span>
                      <small>{status}</small>
                    </span>
                  );
                })}
              </div>
            </section>

            <div className="last-finger-round-note">
              {phase === 'ready'
                ? `ส่งต่อให้ ${currentPlayer.name} เล่นคนเดียว`
                : phase === 'warning'
                  ? `ตาของ ${currentPlayer.name} · รอให้เสียงเงียบ`
                  : 'จับเวลาตอบสนองจากตอนเสียงเงียบ'}
            </div>
            <button className="change-players-button last-finger-cancel" type="button" onClick={returnToSetup}>
              ยกเลิกรอบนี้
            </button>
          </div>
        )}

        {phase === 'result' && loser && (
          <section className="last-finger-result" aria-labelledby="last-finger-result-title" aria-live="assertive">
            <div className="last-finger-result-art" aria-hidden="true">
              <svg viewBox="0 0 180 160" fill="none">
                <path d="m88 7 13 24 27-12-5 29 30 5-19 22 20 21-30 4 4 30-27-13-15 26-14-26-27 13 4-30-30-4 20-21-19-22 30-5-5-29 27 12L88 7Z" fill="#FFC94F" />
                <path d="M87 51v36m0 18h.1" stroke="#25213F" strokeWidth="11" strokeLinecap="round" />
                <circle cx="41" cy="39" r="5" fill="#FF6874" /><circle cx="140" cy="44" r="6" fill="#63C9A8" />
              </svg>
            </div>
            <span className="panel-step">{loser.early ? 'ฟาวล์ · ยกก่อนเสียงเงียบ' : 'ตอบสนองช้าที่สุด'}</span>
            <h2 id="last-finger-result-title">{loser.name} แพ้แล้ว!</h2>
            <p>{loser.early ? 'ยกนิ้วก่อนเสียงเงียบ รอบนี้แพ้เลย' : `ใช้เวลา ${formatReactionTime(loser.reactionMs)} หลังเสียงเงียบ`}</p>
            <ol className="last-finger-result-times" aria-label="เวลาตอบสนองของผู้เล่น">
              {turnResults.map((result) => (
                <li className={result.id === loser.id ? 'is-loser' : ''} key={result.id}>
                  <span>{result.name}</span>
                  <strong>{result.early ? 'ฟาวล์' : formatReactionTime(result.reactionMs)}</strong>
                </li>
              ))}
            </ol>
            <div className="last-finger-result-actions">
              <button className="button button--primary" type="button" onClick={() => beginRound()}>
                เริ่มเกมใหม่ <svg aria-hidden="true" viewBox="0 0 20 20" fill="none"><path d="M3.5 10h12m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <button className="change-players-button" type="button" onClick={returnToSetup}>เปลี่ยนผู้เล่น</button>
            </div>
          </section>
        )}
      </div>
    </section>
  );
}

export default LastFingerGame;
