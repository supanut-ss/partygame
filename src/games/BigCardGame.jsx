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

const GAME_ID = 'big-card';
const MAX_PLAYERS = 8;

const RANKS = [
  { label: 'A', value: 1 },
  { label: '2', value: 2 },
  { label: '3', value: 3 },
  { label: '4', value: 4 },
  { label: '5', value: 5 },
  { label: '6', value: 6 },
  { label: '7', value: 7 },
  { label: '8', value: 8 },
  { label: '9', value: 9 },
  { label: '10', value: 10 },
  { label: 'J', value: 11 },
  { label: 'Q', value: 12 },
  { label: 'K', value: 13 },
];

const SUITS = [
  { id: 'spades', symbol: '♠', name: 'โพดำ', value: 4, color: 'black' },
  { id: 'hearts', symbol: '♥', name: 'โพแดง', value: 3, color: 'red' },
  { id: 'diamonds', symbol: '♦', name: 'ข้าวหลามตัด', value: 2, color: 'red' },
  { id: 'clubs', symbol: '♣', name: 'ดอกจิก', value: 1, color: 'black' },
];

function createInitialPlayers() {
  return [
    { id: 1, name: 'ผู้เล่น 1' },
    { id: 2, name: 'ผู้เล่น 2' },
  ];
}

function createDeck() {
  return SUITS.flatMap((suit) => RANKS.map((rank) => ({
    id: rank.label + '-' + suit.id,
    rank: rank.label,
    rankValue: rank.value,
    suit: suit.symbol,
    suitName: suit.name,
    suitValue: suit.value,
    color: suit.color,
  })));
}

function shuffleDeck(cards) {
  const shuffled = [...cards];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function compareCards(first, second) {
  return first.rankValue - second.rankValue || first.suitValue - second.suitValue;
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

function CardFace({ card, variant = '' }) {
  if (!card) {
    return (
      <div className={'big-card-face big-card-face--back ' + variant} aria-hidden="true">
        <span className="big-card-back-emblem">♠</span>
        <i>PARTY DECK · 52</i>
      </div>
    );
  }

  return (
    <div
      className={'big-card-face big-card-face--' + card.color + ' ' + variant}
      role="img"
      aria-label={card.rank + ' ' + card.suitName}
    >
      <span className="big-card-corner big-card-corner--top" aria-hidden="true">
        <strong>{card.rank}</strong><i>{card.suit}</i>
      </span>
      <span className="big-card-center-suit" aria-hidden="true">{card.suit}</span>
      <span className="big-card-corner big-card-corner--bottom" aria-hidden="true">
        <strong>{card.rank}</strong><i>{card.suit}</i>
      </span>
    </div>
  );
}

function BigCardGame() {
  const [players, setPlayers] = useState(() => loadGamePlayers(GAME_ID, createInitialPlayers()));
  const [nextPlayerId, setNextPlayerId] = useState(() => Math.max(0, ...players.map((player) => Number(player.id) || 0)) + 1);
  const [lossStats, setLossStats] = useState(() => loadLossStats(GAME_ID));
  const [phase, setPhase] = useState('setup');
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [submissions, setSubmissions] = useState([]);
  const [currentCard, setCurrentCard] = useState(null);
  const [currentCardRevealed, setCurrentCardRevealed] = useState(false);
  const [cardsRemaining, setCardsRemaining] = useState(52);
  const [drawCount, setDrawCount] = useState(0);
  const [setupError, setSetupError] = useState('');
  const [drawError, setDrawError] = useState('');
  const [loserId, setLoserId] = useState(null);
  const phaseRef = useRef('setup');
  const currentPlayerIndexRef = useRef(0);
  const submissionsRef = useRef([]);
  const deckRef = useRef([]);
  const lossRecordedRef = useRef(false);

  const currentPlayer = players[currentPlayerIndex] ?? players[0];
  const playersNeedingCardsAfterCurrent = players.length - submissions.length - 1;
  const canDraw = phase === 'draw'
    && !currentCardRevealed
    && cardsRemaining > playersNeedingCardsAfterCurrent;

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
    setPlayers((current) => [...current, { id: nextPlayerId, name: 'ผู้เล่น ' + nextPlayerId }]);
    setNextPlayerId((id) => id + 1);
  };

  const removePlayer = (playerId) => {
    if (players.length <= 2) return;
    setPlayers((current) => current.filter((player) => player.id !== playerId));
    setSetupError('');
  };

  const beginRound = (roundPlayers = players) => {
    const shuffledPlayers = shufflePlayers(roundPlayers);
    deckRef.current = shuffleDeck(createDeck());
    currentPlayerIndexRef.current = 0;
    submissionsRef.current = [];
    setPlayers(shuffledPlayers);
    setCurrentPlayerIndex(0);
    setSubmissions([]);
    setCurrentCard(null);
    setCurrentCardRevealed(false);
    setCardsRemaining(deckRef.current.length);
    setDrawCount(0);
    setSetupError('');
    setDrawError('');
    setLoserId(null);
    lossRecordedRef.current = false;
    updatePhase('handoff');
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
      setSetupError('ชื่อผู้เล่นต้องไม่ซ้ำกัน เพื่อให้รู้ว่าใครได้ไพ่ใบไหน');
      return;
    }

    beginRound(cleanedPlayers);
  };

  const startTurn = () => {
    if (phaseRef.current !== 'handoff') return;
    setCurrentCard(null);
    setCurrentCardRevealed(false);
    setDrawCount(0);
    setDrawError('');
    updatePhase('draw');
  };

  const drawCard = () => {
    if (phaseRef.current !== 'draw' || currentCardRevealed) return;

    const reserveCount = players.length - submissionsRef.current.length - 1;
    if (deckRef.current.length <= reserveCount) {
      setDrawError('ต้องเหลือไพ่ให้ผู้เล่นที่ยังไม่ได้จับ กรุณาเปิดและเก็บใบนี้');
      return;
    }

    const [nextCard, ...remainingCards] = deckRef.current;
    deckRef.current = remainingCards;
    setCardsRemaining(remainingCards.length);
    setCurrentCard(nextCard);
    setCurrentCardRevealed(false);
    setDrawCount((count) => count + 1);
    setDrawError('');
  };

  const openCard = () => {
    if (phaseRef.current !== 'draw' || !currentCard || currentCardRevealed) return;
    setCurrentCardRevealed(true);
  };

  const keepCard = () => {
    if (phaseRef.current !== 'draw' || !currentPlayer || !currentCard || !currentCardRevealed) return;

    const completedSubmissions = [
      ...submissionsRef.current,
      { id: currentPlayer.id, name: currentPlayer.name, card: currentCard },
    ];
    submissionsRef.current = completedSubmissions;
    setSubmissions(completedSubmissions);
    setCurrentCard(null);
    setCurrentCardRevealed(false);
    setDrawCount(0);
    setDrawError('');

    if (completedSubmissions.length === players.length) {
      if (lossRecordedRef.current) return;
      const largestPlayer = completedSubmissions.reduce((largest, entry) => (
        compareCards(entry.card, largest.card) > 0 ? entry : largest
      ));
      lossRecordedRef.current = true;
      setLoserId(largestPlayer.id);
      setLossStats((stats) => addPlayerLoss(stats, largestPlayer.name));
      updatePhase('result');
      return;
    }

    const nextIndex = currentPlayerIndexRef.current + 1;
    currentPlayerIndexRef.current = nextIndex;
    setCurrentPlayerIndex(nextIndex);
    updatePhase('handoff');
  };

  const returnToSetup = () => {
    deckRef.current = [];
    submissionsRef.current = [];
    currentPlayerIndexRef.current = 0;
    setSubmissions([]);
    setCurrentPlayerIndex(0);
    setCurrentCard(null);
    setCurrentCardRevealed(false);
    setDrawCount(0);
    setDrawError('');
    setLoserId(null);
    updatePhase('setup');
  };

  const largestEntry = submissions.find((entry) => entry.id === loserId);

  return (
    <section className="guess-game-shell big-card-shell" aria-labelledby="big-card-title">
      <div className="guess-game-container">
        <header className="guess-game-heading">
          <span className="section-kicker">เกมที่ 06 · เกมปาร์ตี้</span>
          <h1 id="big-card-title">จับใหญ่</h1>
          <p>จั่วไพ่คนละใบ ใครได้ไพ่ใหญ่สุดเป็นผู้แพ้</p>
        </header>

        {phase === 'setup' && (
          <div className="guess-setup-layout">
            <section className="guess-panel setup-panel" aria-labelledby="big-card-players-title">
              <div className="guess-panel-heading">
                <span className="panel-step">ก่อนเริ่มเกม</span>
                <h2 id="big-card-players-title">ใครอยู่ในวงบ้าง?</h2>
                <p>ใส่ชื่อผู้เล่น ระบบจะสุ่มลำดับจับไพ่ในแต่ละรอบ</p>
              </div>

              <form onSubmit={startFromSetup}>
                <div className="player-list">
                  {players.map((player, index) => (
                    <div className="player-row" key={player.id}>
                      <span className={'player-number player-number--' + (index % 4)} aria-hidden="true">{index + 1}</span>
                      <label className="visually-hidden" htmlFor={'big-card-player-' + player.id}>ชื่อผู้เล่นคนที่ {index + 1}</label>
                      <input
                        id={'big-card-player-' + player.id}
                        value={player.name}
                        maxLength={24}
                        onChange={(event) => updatePlayerName(player.id, event.target.value)}
                        placeholder={'ชื่อผู้เล่น ' + (index + 1)}
                        autoComplete="off"
                      />
                      <button
                        className="remove-player-button"
                        type="button"
                        aria-label={'ลบผู้เล่น ' + (player.name || index + 1)}
                        disabled={players.length <= 2}
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
                  <p className="setup-hint">เล่นได้ 2–{MAX_PLAYERS} คน ชื่อไม่ซ้ำกัน</p>
                </div>

                {setupError && <p className="form-error" role="alert">{setupError}</p>}
                <button className="button button--primary guess-start-button" type="submit">
                  เริ่มเกม <ArrowIcon />
                </button>
              </form>
            </section>

            <div className="guess-setup-sidebar">
              <aside className="guess-rules-panel big-card-rules" aria-labelledby="big-card-rules-title">
                <span className="panel-step">กติกาง่าย ๆ</span>
                <h2 id="big-card-rules-title">ลุ้นไพ่ใหญ่<br />อย่าได้ใบสูง</h2>
                <ol className="rules-list">
                  <li><span>1</span><p>ระบบสุ่มลำดับ แล้วผลัดกันจั่วจากสำรับ 52 ใบ</p></li>
                  <li><span>2</span><p>จั่วซ้ำได้ ไพ่ที่เปิดทุกใบจะออกจากรอบทันที</p></li>
                  <li><span>3</span><p>เก็บไพ่ใบสุดท้ายของตัวเอง ใบใหญ่สุดแพ้</p></li>
                </ol>
                <p className="big-card-note">A ต่ำสุด · K สูงสุด · ดอกใหญ่ไปเล็ก: ♠ โพดำ, ♥ โพแดง, ♦ ข้าวหลามตัด, ♣ ดอกจิก</p>
              </aside>
              <PlayerLossStatsPanel
                id="big-card-loss-stats"
                stats={lossStats}
                onReset={() => setLossStats([])}
              />
            </div>
          </div>
        )}

        {phase === 'handoff' && currentPlayer && (
          <section className="big-card-handoff" aria-labelledby="big-card-handoff-title">
            <span className="panel-step">ส่งต่ออุปกรณ์ · ผู้เล่น {currentPlayerIndex + 1} จาก {players.length}</span>
            <div className="big-card-handoff-mark" aria-hidden="true">♠</div>
            <h2 id="big-card-handoff-title">ถึงตา {currentPlayer.name}</h2>
            <p>ส่งจอให้ผู้เล่นคนนี้ แล้วเริ่มสุ่มไพ่เมื่อพร้อม</p>
            <button className="button button--primary" type="button" onClick={startTurn}>
              เริ่มจับไพ่ <ArrowIcon />
            </button>
            <span className="big-card-handoff-progress">เก็บไพ่แล้ว {submissions.length} / {players.length} คน</span>
          </section>
        )}

        {phase === 'draw' && currentPlayer && (
          <div className="big-card-play-layout">
            <aside className="big-card-turn-panel" aria-label="ลำดับผู้เล่น">
              <span className="panel-step">ผู้เล่น {currentPlayerIndex + 1} จาก {players.length}</span>
              <h2>{currentPlayer.name}</h2>
              <div className="secret-range-progress" aria-label={'จับไพ่แล้ว ' + submissions.length + ' จาก ' + players.length + ' คน'}>
                <span style={{ width: (submissions.length / players.length) * 100 + '%' }} />
              </div>
              <ol className="secret-range-turn-list">
                {players.map((player, index) => (
                  <li className={index < submissions.length ? 'is-submitted' : index === currentPlayerIndex ? 'is-current' : ''} key={player.id}>
                    <span className={'player-number player-number--' + (index % 4)} aria-hidden="true">{index + 1}</span>
                    <span>{player.name}</span>
                    <small>{index < submissions.length ? 'จับแล้ว' : index === currentPlayerIndex ? 'กำลังจับ' : 'รอคิว'}</small>
                  </li>
                ))}
              </ol>
              <p className="big-card-deck-count">ไพ่ในสำรับเหลือ <strong>{cardsRemaining}</strong> ใบ</p>
            </aside>

            <section className="big-card-draw-panel" aria-labelledby="big-card-draw-title">
              <span className="panel-step">จั่วซ้ำได้ · ใบก่อนหน้าจะออกจากรอบ</span>
              <h2 id="big-card-draw-title">
                {currentCardRevealed ? 'เปิดไพ่แล้ว' : currentCard ? 'ไพ่ถูกคว่ำไว้' : 'พร้อมจับไพ่หรือยัง?'}
              </h2>
              <p>
                {currentCardRevealed
                  ? 'เปิดแล้วเปลี่ยนไม่ได้ กดเก็บไพ่ใบนี้เพื่อยืนยัน'
                  : currentCard
                    ? 'กดเปิดการ์ดเพื่อดูไพ่ หรือสุ่มใบใหม่ก่อนเปิดได้'
                    : 'กดสุ่มเพื่อรับไพ่ที่ยังคว่ำอยู่'}
              </p>
              <div className="big-card-display" aria-live="polite">
                <CardFace
                  card={currentCardRevealed ? currentCard : null}
                  variant={currentCardRevealed ? 'big-card-face--revealed' : ''}
                />
              </div>
              {currentCard && !currentCardRevealed && (
                <button className="big-card-open-button" type="button" onClick={openCard}>
                  เปิดการ์ด
                </button>
              )}
              {drawCount > 0 && <span className="big-card-draw-count">จั่วไปแล้ว {drawCount} ใบในตานี้</span>}
              {drawError && <p className="form-error" role="alert">{drawError}</p>}
              <div className="big-card-actions">
                <button className="button button--primary" type="button" disabled={!canDraw} onClick={drawCard}>
                  {currentCard ? 'สุ่มใบใหม่' : 'สุ่มการ์ด'} <ArrowIcon />
                </button>
                <button className="big-card-keep-button" type="button" disabled={!currentCard || !currentCardRevealed} onClick={keepCard}>
                  เก็บไพ่ใบนี้
                </button>
              </div>
              {currentCardRevealed && (
                <p className="big-card-reserve-note">เปิดไพ่แล้ว · เก็บใบนี้เพื่อไปต่อ</p>
              )}
              {!currentCardRevealed && !canDraw && currentCard && (
                <p className="big-card-reserve-note">ต้องเปิดแล้วเก็บใบนี้ เพื่อเหลือไพ่ให้ผู้เล่นที่ยังรอ</p>
              )}
              <p className="big-card-play-note">ไพ่จะไม่เปิดตอนสุ่ม · ไพ่ที่สุ่มทุกใบจะออกจากสำรับ แม้สุ่มใบใหม่</p>
            </section>
          </div>
        )}

        {phase === 'result' && largestEntry && (
          <section className="big-card-result" aria-labelledby="big-card-result-title" aria-live="assertive">
            <span className="panel-step">ผลรอบนี้ · เปิดไพ่ครบแล้ว</span>
            <div className="big-card-result-loser">
              <CardFace card={largestEntry.card} variant="big-card-face--result" />
              <span>ไพ่ใหญ่สุด</span>
            </div>
            <h2 id="big-card-result-title">{largestEntry.name} แพ้แล้ว!</h2>
            <p>ไพ่ที่ใหญ่ที่สุดในรอบนี้คือ {largestEntry.card.rank} {largestEntry.card.suit} {largestEntry.card.suitName}</p>
            <ol className="big-card-result-list">
              {submissions.map((entry, index) => (
                <li className={entry.id === loserId ? 'is-loser' : ''} key={entry.id}>
                  <span className={'player-number player-number--' + (index % 4)} aria-hidden="true">{index + 1}</span>
                  <span className="big-card-result-player">{entry.name}<small>{entry.id === loserId ? 'ไพ่ใหญ่สุด · แพ้' : 'รอด'}</small></span>
                  <CardFace card={entry.card} variant="big-card-face--mini" />
                </li>
              ))}
            </ol>
            <div className="big-card-result-actions">
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

export default BigCardGame;
