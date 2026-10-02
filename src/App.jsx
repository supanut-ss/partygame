import { useState } from 'react';
import NumberGuessGame from './games/NumberGuessGame.jsx';
import MinesweeperGame from './games/MinesweeperGame.jsx';
import TruthOrDareGame from './games/TruthOrDareGame.jsx';
import LastFingerGame from './games/LastFingerGame.jsx';
import SecretRangeGame from './games/SecretRangeGame.jsx';
import BigCardGame from './games/BigCardGame.jsx';

const gameSlots = [
  {
    id: 'number-guess',
    number: '01',
    title: 'อย่าโดนเลขลับ!',
    description: 'ทายเลขลับ 1–100 ใครทายโดนก็แพ้',
    tone: 'coral',
    available: true,
  },
  {
    id: 'minesweeper',
    number: '02',
    title: 'เปิดช่อง ลุ้นบึ้ม',
    description: 'กระดานกู้ระเบิด 6×6 ใครเปิดเจอก็แพ้',
    tone: 'blue',
    available: true,
  },
  {
    id: 'truth-or-dare',
    number: '03',
    title: 'Truth or Dare',
    description: 'เลือกความจริงหรือความกล้า แล้วเล่นต่อกันทั้งวง',
    tone: 'yellow',
    available: true,
  },
  {
    id: 'last-finger',
    number: '04',
    title: 'อย่าปล่อยช้า!',
    description: 'จับจังหวะสัญญาณ ใครยกนิ้วช้าที่สุดแพ้',
    tone: 'mint',
    available: true,
  },
  {
    id: 'secret-range',
    number: '05',
    title: 'เลขลับขั้วสุดโต่ง',
    description: 'ใส่เลขลับ 1–1,000 ใครต่ำสุดหรือสูงสุดแพ้',
    tone: 'purple',
    available: true,
  },
  {
    id: 'big-card',
    number: '06',
    title: 'จับใหญ่',
    description: 'จั่วไพ่คนละใบ ใครได้ไพ่ใหญ่สุดเป็นผู้แพ้',
    tone: 'orange',
    available: true,
  },
];

function BrandMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 44 44" fill="none">
      <rect width="44" height="44" rx="15" fill="currentColor" />
      <path
        d="M22 8.5 25.5 18l10 1-7.6 6.5 2.3 9.7L22 30l-8.2 5.2 2.3-9.7L8.5 19l10-1L22 8.5Z"
        fill="#FFD45D"
        stroke="#25213F"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="22" cy="22" r="3.1" fill="#FF6D76" />
    </svg>
  );
}

function ArrowIcon({ diagonal = false }) {
  return (
    <svg
      aria-hidden="true"
      className={diagonal ? 'arrow-icon arrow-icon--diagonal' : 'arrow-icon'}
      viewBox="0 0 20 20"
      fill="none"
    >
      <path d="M3.5 10h12m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HeroIllustration() {
  return (
    <svg
      className="hero-illustration"
      viewBox="0 0 560 480"
      role="img"
      aria-labelledby="hero-art-title"
    >
      <title id="hero-art-title">ภาพการ์ดเกมสีสันสดใสบนโต๊ะปาร์ตี้</title>
      <ellipse cx="290" cy="253" rx="223" ry="185" fill="#EAE4FF" />
      <circle cx="87" cy="148" r="17" fill="#FF7180" />
      <circle cx="476" cy="333" r="12" fill="#63C9A8" />
      <path d="m438 90 6 15 16 1-12 10 4 16-14-9-13 9 4-16-12-10 16-1 5-15Z" fill="#FFC94F" />
      <path d="m98 330 4 10 11 1-8 7 2 11-9-6-9 6 3-11-9-7 11-1 4-10Z" fill="#8F73FF" />
      <circle cx="464" cy="153" r="5" fill="#25213F" />
      <circle cx="480" cy="169" r="5" fill="#25213F" />
      <circle cx="448" cy="169" r="5" fill="#25213F" />

      <g transform="rotate(-8 181 243)">
        <rect x="102" y="173" width="151" height="194" rx="23" fill="#FF7180" />
        <rect x="119" y="190" width="117" height="160" rx="16" fill="#FF9AA0" />
        <circle cx="177" cy="246" r="28" fill="#FFF8EE" />
        <circle cx="168" cy="239" r="4" fill="#25213F" />
        <circle cx="185" cy="252" r="4" fill="#25213F" />
        <circle cx="186" cy="236" r="4" fill="#25213F" />
        <text x="177" y="321" textAnchor="middle" className="illustration-label">เกม 01</text>
      </g>

      <g transform="rotate(7 374 246)">
        <rect x="298" y="156" width="161" height="207" rx="25" fill="#FFC94F" />
        <rect x="316" y="174" width="125" height="171" rx="17" fill="#FFE18D" />
        <path d="M379 202c-19 0-34 15-34 34 0 18 15 32 34 32s34-14 34-32c0-19-15-34-34-34Z" fill="#7355E8" />
        <path d="M365 234h28m-14-14v28" stroke="#FFF8EE" strokeWidth="5" strokeLinecap="round" />
        <text x="379" y="321" textAnchor="middle" className="illustration-label">เกม 02</text>
      </g>

      <g>
        <rect x="172" y="99" width="218" height="283" rx="28" fill="#25213F" />
        <rect x="181" y="108" width="200" height="265" rx="22" fill="#FFFDF8" />
        <circle cx="204" cy="131" r="4" fill="#FF7180" />
        <circle cx="218" cy="131" r="4" fill="#FFC94F" />
        <circle cx="232" cy="131" r="4" fill="#63C9A8" />
        <path d="M202 155h158" stroke="#EAE7F1" strokeWidth="2" />
        <text x="281" y="199" textAnchor="middle" className="illustration-heading">ปาร์ตี้เริ่มตรงนี้</text>
        <text x="281" y="219" textAnchor="middle" className="illustration-subtitle">เลือกเกม แล้วชวนเพื่อนมาเล่น</text>
        <rect x="204" y="243" width="67" height="66" rx="17" fill="#FFE5E4" />
        <rect x="282" y="243" width="67" height="66" rx="17" fill="#EAE4FF" />
        <circle cx="237.5" cy="273" r="14" fill="#FF7180" />
        <path d="m237.5 261 3.5 8 8.5 1-6.5 5.5 2 8-7.5-4.5-7.5 4.5 2-8-6.5-5.5 8.5-1 3.5-8Z" fill="#FFF8EE" />
        <path d="M304 263h24m-12-12v24" stroke="#7355E8" strokeWidth="5" strokeLinecap="round" />
        <rect x="204" y="322" width="145" height="33" rx="16.5" fill="#7355E8" />
        <text x="276.5" y="343" textAnchor="middle" className="illustration-button">ดูเกมทั้งหมด</text>
      </g>
    </svg>
  );
}

function GameArtwork({ number, tone }) {
  return (
    <div className={`game-art game-art--${tone}`} aria-hidden="true">
      <span className="art-spark art-spark--one" />
      <span className="art-spark art-spark--two" />
      <span className="art-orbit" />
      <span className="art-number">{number}</span>
      <span className="art-token art-token--one" />
      <span className="art-token art-token--two" />
    </div>
  );
}

function DeviceIcon({ type }) {
  if (type === 'mobile') {
    return (
      <svg aria-hidden="true" viewBox="0 0 32 32" fill="none">
        <rect x="8.5" y="3.5" width="15" height="25" rx="3.5" stroke="currentColor" strokeWidth="2" />
        <path d="M13 7h6m-3 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === 'tablet') {
    return (
      <svg aria-hidden="true" viewBox="0 0 32 32" fill="none">
        <rect x="5" y="3.5" width="22" height="25" rx="3.5" stroke="currentColor" strokeWidth="2" />
        <circle cx="16" cy="24.5" r=".9" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" fill="none">
      <rect x="3.5" y="4" width="25" height="18" rx="2.5" stroke="currentColor" strokeWidth="2" />
      <path d="M12 28h8m-4-6v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeGame, setActiveGame] = useState(null);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="#top" aria-label="เล่นกันมั้ย — กลับไปด้านบน" onClick={closeMenu}>
            <span className="brand-mark"><BrandMark /></span>
            <span className="brand-name">เล่นกันมั้ย<span className="brand-period">.</span></span>
          </a>

          {activeGame ? (
            <button
              className="nav-cta game-header-back"
              type="button"
              aria-label="กลับหน้ารวมเกม"
              onClick={() => setActiveGame(null)}
            >
              <span aria-hidden="true">←</span><span className="game-header-back-label">กลับหน้ารวมเกม</span>
            </button>
          ) : (
            <>
              <button
                className={`menu-toggle${menuOpen ? ' is-open' : ''}`}
                type="button"
                aria-label={menuOpen ? 'ปิดเมนู' : 'เปิดเมนู'}
                aria-expanded={menuOpen}
                aria-controls="primary-navigation"
                onClick={() => setMenuOpen((open) => !open)}
              >
                <span />
                <span />
              </button>

              <nav id="primary-navigation" className={`site-nav${menuOpen ? ' is-open' : ''}`} aria-label="เมนูหลัก">
                <a href="#games" onClick={closeMenu}>เกมทั้งหมด</a>
                <a href="#platforms" onClick={closeMenu}>เล่นได้ทุกจอ</a>
                <a href="#about" onClick={closeMenu}>เกี่ยวกับเรา</a>
                <a className="nav-cta" href="#games" onClick={closeMenu}>
                  เลือกเกม <ArrowIcon />
                </a>
              </nav>
            </>
          )}
        </div>
      </header>

      <main id="top">
        {activeGame === 'number-guess' ? (
          <NumberGuessGame />
        ) : activeGame === 'minesweeper' ? (
          <MinesweeperGame />
        ) : activeGame === 'truth-or-dare' ? (
          <TruthOrDareGame />
        ) : activeGame === 'last-finger' ? (
          <LastFingerGame />
        ) : activeGame === 'secret-range' ? (
          <SecretRangeGame />
        ) : activeGame === 'big-card' ? (
          <BigCardGame />
        ) : (
          <>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> เว็บรวมเกมสำหรับสายปาร์ตี้</div>
            <h1 id="hero-title">วงพร้อมแล้ว<br />เกมไหนก็<span className="hero-highlight">สนุก</span></h1>
            <p className="hero-description">
              รวม 6 เกมปาร์ตี้ไว้เล่นผลัดกันบนเครื่องเดียว ชวนเพื่อนใส่ชื่อแล้วเริ่มเล่นได้ทันที
              รองรับทั้งมือถือ แท็บเล็ต และคอมพิวเตอร์
            </p>
            <div className="hero-actions">
              <a className="button button--primary" href="#games">
                ดูเกมทั้งหมด <ArrowIcon />
              </a>
              <a className="text-link" href="#platforms">
                เล่นได้บนทุกอุปกรณ์ <ArrowIcon diagonal />
              </a>
            </div>
            <div className="hero-note">
              <span className="note-stamp" aria-hidden="true">
                <svg viewBox="0 0 16 16" fill="none">
                  <path d="m3.5 8.3 2.8 2.8 6.2-6.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span>ไม่ต้องสมัครสมาชิก เพิ่มชื่อเพื่อนแล้วเริ่มเล่นได้เลย</span>
            </div>
          </div>

          <div className="hero-visual">
            <span className="visual-label visual-label--top">ชวนเพื่อน แล้วเริ่มสนุก</span>
            <HeroIllustration />
            <span className="visual-label visual-label--bottom">ทุกจอ · ทุกวง · ทุกเวลา</span>
          </div>
          <span className="hero-doodle hero-doodle--left" aria-hidden="true" />
          <span className="hero-doodle hero-doodle--right" aria-hidden="true" />
        </section>

        <section className="game-section" id="games" aria-labelledby="games-title">
          <div className="section-heading">
            <div>
              <span className="section-kicker">เลือกเกมให้เข้ากับวง</span>
              <h2 id="games-title">เลือกเกมแล้วเล่นกัน</h2>
            </div>
            <p>เลือกเกมที่พร้อมเล่น<br className="desktop-break" /> เกมใหม่จะทยอยเพิ่มในภายหลัง</p>
          </div>

          <div className="game-grid">
            {gameSlots.map((game) => (
              <article className="game-card" key={game.number}>
                <GameArtwork number={game.number} tone={game.tone} />
                <div className="game-card-content">
                  <div className="game-card-meta">
                    <span className="game-index">เกมที่ {game.number}</span>
                    <span className={game.available ? 'ready-badge' : 'coming-badge'}>
                      <span /> {game.available ? 'พร้อมเล่น' : 'เร็ว ๆ นี้'}
                    </span>
                  </div>
                  <h3>{game.title}</h3>
                  <p>{game.description}</p>
                  {game.available ? (
                    <button
                      className="game-card-action"
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setActiveGame(game.id);
                      }}
                    >
                      เริ่มเล่น <ArrowIcon />
                    </button>
                  ) : (
                    <span className="game-card-footer">เตรียมพบกันเร็ว ๆ นี้</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="platform-section" id="platforms" aria-labelledby="platform-title">
          <div className="platform-intro">
            <span className="section-kicker">พร้อมไปกับทุกวง</span>
            <h2 id="platform-title">หน้าจอไหน<br />ก็เล่นด้วยกันได้</h2>
            <p>จัดวางให้ใช้งานสะดวก ไม่ว่าจะนั่งล้อมมือถือหรือเปิดเล่นบนจอใหญ่</p>
          </div>
          <div className="device-grid">
            {[
              { type: 'mobile', title: 'มือถือ', detail: 'หยิบขึ้นมาเล่นได้ทุกที่' },
              { type: 'tablet', title: 'แท็บเล็ต', detail: 'พื้นที่สบายตาสำหรับทั้งวง' },
              { type: 'desktop', title: 'คอมพิวเตอร์', detail: 'เต็มจอ เล่นได้ถนัดขึ้น' },
            ].map((device) => (
              <div className={`device-card device-card--${device.type}`} key={device.type}>
                <span className="device-icon"><DeviceIcon type={device.type} /></span>
                <h3>{device.title}</h3>
                <p>{device.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="closing-section" id="about" aria-labelledby="closing-title">
          <div className="closing-decoration closing-decoration--one" aria-hidden="true" />
          <div className="closing-decoration closing-decoration--two" aria-hidden="true" />
          <span className="closing-kicker">เสียงหัวเราะเริ่มจากเกมดี ๆ</span>
          <h2 id="closing-title">รวมเพื่อนให้ครบ<br />แล้วมา<span>เล่นกัน</span></h2>
          <a className="button button--light" href="#games">สำรวจเกมทั้งหมด <ArrowIcon /></a>
        </section>
          </>
        )}
      </main>

      {!activeGame && <footer className="site-footer">
        <a className="brand footer-brand" href="#top" aria-label="เล่นกันมั้ย — กลับไปด้านบน">
          <span className="brand-mark"><BrandMark /></span>
          <span className="brand-name">เล่นกันมั้ย<span className="brand-period">.</span></span>
        </a>
        <p>พื้นที่เล็ก ๆ สำหรับความสนุกของทุกคน</p>
        <a className="back-to-top" href="#top">กลับขึ้นด้านบน <ArrowIcon diagonal /></a>
      </footer>}
    </>
  );
}

export default App;
