import { useRef, useState } from 'react';

const COMMAND_CARDS = [
  {
    id: 'left',
    icon: '👈',
    title: 'คนทางซ้าย',
    instruction: 'คนที่นั่งทางซ้ายของคนเปิดการ์ด จิบ 1 ครั้ง',
    tone: 'purple',
  },
  {
    id: 'right',
    icon: '👉',
    title: 'คนทางขวา',
    instruction: 'คนที่นั่งทางขวาของคนเปิดการ์ด จิบ 1 ครั้ง',
    tone: 'coral',
  },
  {
    id: 'everyone',
    icon: '🥂',
    title: 'ยกแก้วทั้งวง',
    instruction: 'ทุกคนในวง รวมถึงคนเปิดการ์ด จิบ 1 ครั้ง',
    tone: 'yellow',
  },
  {
    id: 'solo',
    icon: '🕺',
    title: 'เดี่ยวไมโครโฟน',
    instruction: 'คนที่เปิดการ์ดใบนี้ จิบเอง 1 ครั้ง',
    tone: 'blue',
  },
  {
    id: 'friend-one',
    icon: '🤝',
    title: 'หาเพื่อน 1 คน',
    instruction: 'เลือกเพื่อน 1 คน แล้วจิบพร้อมกันคนละ 1 ครั้ง',
    tone: 'mint',
  },
  {
    id: 'friend-two',
    icon: '👯',
    title: 'ชวนเพื่อน 2 คน',
    instruction: 'เลือกเพื่อน 2 คน แล้วจิบพร้อมกันคนละ 1 ครั้ง',
    tone: 'orange',
  },
  {
    id: 'rock-paper-scissors',
    icon: '✊',
    title: 'เป่ายิงฉุบ',
    instruction: 'ชวนเพื่อน 1 คน ใครแพ้จิบ 1 ครั้ง ถ้าเสมอเล่นใหม่',
    tone: 'purple',
  },
  {
    id: 'color-match',
    icon: '🎨',
    title: 'สีนี้ใครใส่?',
    instruction: 'คนเปิดเลือกสี ทุกคนที่ใส่สีนั้นจิบ 1 ครั้ง',
    tone: 'coral',
  },
  {
    id: 'category',
    icon: '🧠',
    title: 'หมวดห้ามซ้ำ',
    instruction: 'คนเปิดเลือกหมวด แล้ววนกันตอบ ห้ามซ้ำหรือคิดเกิน 3 วินาที ใครพลาดจิบ 1 ครั้ง',
    tone: 'blue',
  },
  {
    id: 'stare-contest',
    icon: '👀',
    title: 'จ้องตาห้ามหลบ',
    instruction: 'คนเปิดเลือกเพื่อน 1 คน ใครหลบตาก่อนจิบ 1 ครั้ง',
    tone: 'mint',
  },
  {
    id: 'dont-laugh',
    icon: '😂',
    title: 'ห้ามขำก่อน',
    instruction: 'คนเปิดทำหน้าตลก 5 วินาที ใครหลุดขำจิบ 1 ครั้ง',
    tone: 'yellow',
  },
  {
    id: 'thumb-war',
    icon: '👍',
    title: 'สงครามนิ้วโป้ง',
    instruction: 'คนเปิดเลือกเพื่อน 1 คน งัดข้อหัวแม่มือ คนแพ้จิบ 1 ครั้ง',
    tone: 'orange',
  },
  {
    id: 'majority-vote',
    icon: '🗳️',
    title: 'เสียงข้างมาก',
    instruction: 'คนเปิดถามคำถามที่มี 2 ตัวเลือก ทุกคนตอบพร้อมกัน ฝั่งเสียงข้างน้อยจิบ 1 ครั้ง ถ้าเสมอไม่มีใครจิบ',
    tone: 'purple',
  },
  {
    id: 'even-odd',
    icon: '🔢',
    title: 'คู่หรือคี่',
    instruction: 'คนเปิดกับเพื่อน 1 คนชูนิ้ว 0–5 พร้อมกัน ถ้าผลรวมเป็นเลขคู่คนเปิดจิบ ถ้าเลขคี่เพื่อนจิบ',
    tone: 'blue',
  },
  {
    id: 'table-tap',
    icon: '🫳',
    title: 'โต๊ะสายฟ้า',
    instruction: 'คนเปิดนับ 3–2–1 ทุกคนแตะโต๊ะ ใครแตะเป็นคนสุดท้ายจิบ 1 ครั้ง',
    tone: 'coral',
  },
  {
    id: 'freeze',
    icon: '🧊',
    title: 'หยุดนิ่ง!',
    instruction: 'ทุกคนขยับตัว 3 วินาที คนเปิดพูดว่า “หยุด” แล้วใครขยับต่อจิบ 1 ครั้ง',
    tone: 'blue',
  },
  {
    id: 'tongue-twister',
    icon: '🗣️',
    title: 'ลิ้นพันกัน',
    instruction: 'เลือกเพื่อน 1 คน แข่งพูด “ยายกินลำไย น้ำลายยายไหลย้อย” ใครพูดผิดก่อนจิบ 1 ครั้ง',
    tone: 'purple',
  },
  {
    id: 'three-things',
    icon: '⚡',
    title: 'สามคำในห้าวิ',
    instruction: 'คนเปิดเลือกเพื่อน 1 คนและหมวดหมู่ ให้บอกสิ่งในหมวดนั้น 3 อย่างใน 5 วินาที ถ้าไม่ทันจิบ 1 ครั้ง',
    tone: 'yellow',
  },
  {
    id: 'hum-and-guess',
    icon: '🎶',
    title: 'ฮัมให้ทาย',
    instruction: 'คนเปิดฮัมเพลง 5 วินาที ใครทายไม่ออกใน 10 วินาทีจิบ 1 ครั้ง',
    tone: 'mint',
  },
  {
    id: 'clap-copy',
    icon: '👏',
    title: 'จับจังหวะปรบมือ',
    instruction: 'คนเปิดปรบมือเป็นจังหวะ ทุกคนทำตาม ใครทำผิดจิบ 1 ครั้ง',
    tone: 'orange',
  },
  {
    id: 'copy-pose',
    icon: '🪩',
    title: 'ท่านี้ต้องเป๊ะ',
    instruction: 'คนเปิดทำท่า 1 ท่า ทุกคนเลียนแบบ ใครทำช้าที่สุดจิบ 1 ครั้ง',
    tone: 'purple',
  },
  {
    id: 'seven-pop',
    icon: '🔢',
    title: 'เลขเจ็ดป๊อป',
    instruction: 'วนกันนับ 1–20 เลขที่มี 7 หรือหาร 7 ลงตัวให้พูดว่า “ป๊อป” ใครพลาดจิบ 1 ครั้ง',
    tone: 'yellow',
  },
  {
    id: 'opposite-word',
    icon: '🔄',
    title: 'ตอบคำตรงข้าม',
    instruction: 'คนเปิดพูดคำง่าย ๆ แล้วเลือกเพื่อน 1 คนให้ตอบคำตรงข้ามใน 3 วินาที ถ้าตอบไม่ทันจิบ 1 ครั้ง',
    tone: 'blue',
  },
  {
    id: 'charades',
    icon: '🎭',
    title: 'ใบ้ท่าสัตว์',
    instruction: 'คนเปิดใบ้ชื่อสัตว์ด้วยท่าทาง ห้ามส่งเสียง ถ้าไม่มีใครทายถูกใน 10 วินาที คนเปิดจิบ 1 ครั้ง',
    tone: 'coral',
  },
  {
    id: 'find-color',
    icon: '🎯',
    title: 'ชี้สีให้ไว',
    instruction: 'คนเปิดบอกสี ทุกคนรีบชี้สิ่งของสีนั้น ใครชี้เป็นคนสุดท้ายจิบ 1 ครั้ง',
    tone: 'mint',
  },
  {
    id: 'word-association',
    icon: '💭',
    title: 'คำนี้นึกถึงอะไร',
    instruction: 'คนเปิดพูดคำหนึ่งคำ แล้ววนกันพูดคำที่เกี่ยวข้อง ห้ามซ้ำหรือคิดเกิน 3 วินาที ใครพลาดจิบ 1 ครั้ง',
    tone: 'purple',
  },
  {
    id: 'quick-math',
    icon: '🧮',
    title: 'เลขไวใจต้องนิ่ง',
    instruction: 'คนเปิดถามโจทย์บวกเลขง่าย ๆ กับเพื่อน 1 คน ถ้าตอบไม่ทันใน 3 วินาทีจิบ 1 ครั้ง',
    tone: 'orange',
  },
  {
    id: 'one-word-story',
    icon: '📖',
    title: 'นิยายคนละคำ',
    instruction: 'วนกันแต่งเรื่องโดยพูดเพิ่มคนละ 1 คำ ห้ามซ้ำหรือเว้นเกิน 3 วินาที ใครพลาดจิบ 1 ครั้ง',
    tone: 'blue',
  },
  {
    id: 'memory-sequence',
    icon: '🧠',
    title: 'จำให้ครบแล้วทวน',
    instruction: 'คนเปิดพูดของ 3 อย่าง แล้วเลือกเพื่อน 1 คนให้ทวนตามลำดับ ถ้าจำผิดจิบ 1 ครั้ง',
    tone: 'yellow',
  },
  {
    id: 'rhyme-time',
    icon: '🎤',
    title: 'สัมผัสคล้องจอง',
    instruction: 'คนเปิดพูดคำหนึ่งคำ แล้ววนกันหาคำที่คล้องจอง ห้ามซ้ำหรือคิดเกิน 3 วินาที ใครพลาดจิบ 1 ครั้ง',
    tone: 'coral',
  },
  {
    id: 'forbidden-word',
    icon: '🤐',
    title: 'ห้ามพูดคำนี้',
    instruction: 'คนเปิดเลือกคำต้องห้าม เช่น “ใช่” แล้วถามเพื่อน 1 คน 3 คำถาม ถ้าหลุดพูดคำนั้นจิบ 1 ครั้ง',
    tone: 'purple',
  },
  {
    id: 'truth-or-lie',
    icon: '🤥',
    title: 'สองจริงหนึ่งหลอก',
    instruction: 'คนเปิดเล่า 3 เรื่องเกี่ยวกับตัวเอง โดยมีเรื่องแต่ง 1 เรื่อง ทุกคนชี้ทายพร้อมกัน ใครทายผิดจิบ 1 ครั้ง',
    tone: 'mint',
  },
  {
    id: 'compliment-duel',
    icon: '💌',
    title: 'ดวลคำชม',
    instruction: 'คนเปิดเลือกเพื่อน 1 คน ผลัดกันพูดคำชม ห้ามซ้ำหรือคิดเกิน 3 วินาที ใครตันก่อนจิบ 1 ครั้ง',
    tone: 'yellow',
  },
  {
    id: 'mirror-move',
    icon: '🪞',
    title: 'กระจกเงา',
    instruction: 'คนเปิดเลือกเพื่อน 1 คน ทำท่ามือช้า ๆ 5 วินาที อีกคนเลียนแบบให้ทัน ถ้าพลาดจิบ 1 ครั้ง',
    tone: 'blue',
  },
  {
    id: 'high-five-race',
    icon: '🙌',
    title: 'ไฮไฟว์สายฟ้า',
    instruction: 'คนเปิดนับ 3–2–1 ทุกคนแตะมือกับเพื่อนข้าง ๆ ใครได้ไฮไฟว์เป็นคนสุดท้ายจิบ 1 ครั้ง',
    tone: 'orange',
  },
  {
    id: 'sound-copy',
    icon: '📣',
    title: 'เสียงนี้เลียนแบบ',
    instruction: 'คนเปิดทำเสียงสั้น ๆ 3 จังหวะ ทุกคนทำตาม ใครเลียนแบบผิดจิบ 1 ครั้ง',
    tone: 'coral',
  },
];

function shuffleCards(cards) {
  const shuffledCards = [...cards];

  for (let index = shuffledCards.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffledCards[index], shuffledCards[swapIndex]] = [shuffledCards[swapIndex], shuffledCards[index]];
  }

  return shuffledCards;
}

function createShuffledDeck(previousCardId = null) {
  const shuffledCards = shuffleCards(COMMAND_CARDS);
  const lastIndex = shuffledCards.length - 1;

  if (shuffledCards[lastIndex].id === previousCardId) {
    const swapIndex = Math.floor(Math.random() * lastIndex);
    [shuffledCards[swapIndex], shuffledCards[lastIndex]] = [shuffledCards[lastIndex], shuffledCards[swapIndex]];
  }

  return shuffledCards;
}

function CommandCardGame() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentCard, setCurrentCard] = useState(null);
  const [drawCount, setDrawCount] = useState(0);
  const deckRef = useRef([]);
  const previousCardIdRef = useRef(null);
  const drawCountRef = useRef(0);

  const drawNextCard = () => {
    if (deckRef.current.length === 0) {
      deckRef.current = createShuffledDeck(previousCardIdRef.current);
    }

    const nextCard = deckRef.current.pop();
    previousCardIdRef.current = nextCard.id;
    drawCountRef.current += 1;
    setDrawCount(drawCountRef.current);
    setCurrentCard(nextCard);
  };

  const startGame = () => {
    deckRef.current = createShuffledDeck();
    previousCardIdRef.current = null;
    drawCountRef.current = 0;
    setDrawCount(0);
    setIsPlaying(true);
    drawNextCard();
  };

  return (
    <section className="guess-game-shell command-card-shell" aria-labelledby="command-card-title">
      <div className="guess-game-container">
        <header className="guess-game-heading">
          <span className="section-kicker">เกมที่ 08 · เกมปาร์ตี้</span>
          <h1 id="command-card-title">เปิดการ์ดคำสั่ง</h1>
          <p>จั่วการ์ดสุ่ม แล้วทำตามคำสั่งให้วงคึกคัก</p>
        </header>

        {!isPlaying ? (
          <section className="command-card-start-panel" aria-label="เริ่มเกมเปิดการ์ดคำสั่ง">
            <div className="command-card-deck" aria-hidden="true">
              <span className="command-card-deck-back command-card-deck-back--one" />
              <span className="command-card-deck-back command-card-deck-back--two" />
              <span className="command-card-deck-top">✦</span>
            </div>
            <p>ไม่ต้องกรอกรายชื่อ ใครเปิดก็ได้<br />สุ่มไม่ซ้ำจนครบ {COMMAND_CARDS.length} ใบแล้วสับใหม่</p>
            <button className="button button--primary" type="button" onClick={startGame}>เริ่มเกม</button>
          </section>
        ) : (
          <section className="command-card-play-panel" aria-label="เกมเปิดการ์ดคำสั่ง">
            <div className="command-card-progress">
              <span>การ์ดใบที่ {drawCount}</span>
              <span>ไม่ซ้ำจนครบ {COMMAND_CARDS.length} ใบ</span>
            </div>
            {currentCard && (
              <article
                className={'command-card-face command-card-face--' + currentCard.tone}
                key={drawCount}
                aria-live="polite"
              >
                <span className="command-card-icon" aria-hidden="true">{currentCard.icon}</span>
                <span className="command-card-label">คำสั่งสุ่ม</span>
                <h2>{currentCard.title}</h2>
                <p>{currentCard.instruction}</p>
              </article>
            )}
            <p className="command-card-note">เลือกเครื่องดื่มตามสะดวก จะจิบน้ำเปล่าหรือข้ามคำสั่งก็ได้</p>
            <div className="command-card-actions">
              <button className="button button--primary" type="button" onClick={drawNextCard}>เปิดการ์ดต่อไป</button>
            </div>
          </section>
        )}
      </div>
    </section>
  );
}

export default CommandCardGame;
