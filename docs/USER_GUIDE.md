# PartyGame — Full Documentation & User Guide / เอกสารและคู่มือการใช้งานฉบับสมบูรณ์

**Last reviewed / ตรวจทานล่าสุด:** 2026-10-02  
**Languages / ภาษา:** English and Thai, in this file / ภาษาอังกฤษและภาษาไทยในไฟล์เดียว

---

# English

## 1. What PartyGame is

PartyGame is a responsive, browser-based collection of party games built with React 19 and Vite 8. The current app contains six playable games. Players take turns on a shared phone, tablet, or computer; the app does not provide accounts, online matchmaking, or cross-device synchronization.

The interface is currently in Thai. This document explains the current implementation and is written for both players and maintainers.

## 2. Requirements and local setup

- Node.js `20.19+` or `22.12+`.
- A modern browser with JavaScript enabled.
- Core gameplay runs in the browser without a game server. Voice recognition availability may depend on the browser.

From the project root, run:

```bash
npm install
npm run dev
```

Open the local URL printed by Vite in the terminal. To create and preview a production build:

```bash
npm run build
npm run preview
```

The production files are written to `dist/`. They can be served from a static web host. The project currently has no backend, database, or test script.

## 3. General play instructions

1. On the home page, browse the game cards and select **เริ่มเล่น** (Start) for a game.
2. Add or remove players, enter a name for each player, and start the game. Most games accept 2–8 players; Secret Range requires 3–8. Names must be non-empty and unique within the game, and each name is limited to 24 characters.
3. Follow the turn prompt shown on screen. Pass the device to the named player when the game asks for a handoff.
4. When a game's result screen appears, choose **เริ่มเกมใหม่** (New game/round) to replay with the same roster or **เปลี่ยนผู้เล่น** (Change players) to return to setup. Truth or Dare continues into the next round automatically; use its sidebar controls to shuffle the order or edit players.
5. Use the header's **กลับหน้ารวมเกม** (Back to games) button to leave a game and return to the catalog.

Player order is randomized at the start of a round in the games that use turn order. Keep the device visible to the current player, and use the private handoff steps in Secret Range and Big Card to reduce accidental spoilers.

## 4. Games

### 4.1 Number Guess — “อย่าโดนเลขลับ!”

- **Players:** 2–8.
- **Goal:** Avoid being the player who guesses the hidden number.
- **How to play:** The app picks an integer from 1–100 and shuffles the player order. Players enter one guess per turn. The app reports whether the secret number is higher or lower, narrows the valid range, and prevents repeating a number that has already been guessed. The player who guesses the secret number loses the round.
- **Input:** Type a number, or use the microphone button to speak in Thai if the browser supports speech recognition. If voice input is unavailable or inaccurate, type the guess instead. The microphone feature may require browser permission.
- **After the round:** The loser's count is added to this game's loss statistics. Start another round or edit the roster.

### 4.2 Minesweeper — “เปิดช่อง ลุ้นบึ้ม”

- **Players:** 2–8.
- **Board:** 6 × 6 cells, with 5–15 mines placed randomly for each round.
- **How to play:** Players take turns opening one unopened cell. A safe cell is cleared from the board and the next turn begins. Opening a mine ends the round immediately; that player loses and the board reveals all mines.
- **After the round:** Choose **เริ่มเกมใหม่** to generate a fresh board, or change the player list. Losses are counted in this game's statistics.

### 4.3 Truth or Dare

- **Players:** 2–8.
- **How to play:** After player order is randomized, the current player chooses **Truth** or **Dare**. The app draws a prompt from its built-in set. Prompts cover love, friends, childhood, and work. Select **ขอเปลี่ยนโจทย์** (Change prompt) for another prompt of the same type, or **ส่งตาให้คนถัดไป** (Pass to next player) to continue.
- **Passing:** Players may skip a prompt or pass their turn. The game applies no points or penalties.
- **Rounds:** After everyone has had a turn, the order is shuffled for the next round. Use **สุ่มลำดับใหม่** (Shuffle order) to restart the session order, or **เปลี่ยนรายชื่อผู้เล่น** (Change players) to edit the roster.
- This game does not maintain loss statistics.

### 4.4 Last Finger — “อย่าปล่อยช้า!”

- **Players:** 2–8.
- **Goal:** React quickly after the signal goes silent.
- **How to play:** Players take turns one at a time. The current player presses and holds the large play area (touch or mouse). On a computer, focus the play area and hold **Space** or **Enter**. Wait through the randomly timed signal, which lasts 10–20 seconds, and release as soon as it becomes silent. The app records reaction time, then prompts the next player.
- **Early release:** Releasing while the warning signal is still active is a foul and makes that player lose immediately.
- **Result:** Once all players have completed a valid turn, the slowest reaction loses. The game displays the reaction times and saves the loss statistic. Start a new round or change players.
- Keep the active player's turn private so other players do not influence their reaction.

### 4.5 Secret Range — “เลขลับขั้วสุดโต่ง”

- **Players:** 3–8.
- **Goal:** Avoid submitting the lowest or highest number.
- **How to play:** The app shuffles the turn order. Pass the device to each player individually. When prompted, enter a whole number from 1–1,000; the field masks the entry. Submitted values stay hidden until everyone has entered a number.
- **Result:** The lowest and highest submissions lose. If several players tie at either extreme, all players at that extreme lose. If everyone submits the same number, everyone loses. The result screen then reveals every player's number.
- **Privacy and data:** Ask players to look away while another person enters a number. Secret submissions are held only for the active round and are not saved as browser data. Loss statistics are saved locally.

### 4.6 Big Card — “จับใหญ่”

- **Players:** 2–8.
- **Deck:** A standard 52-card deck, shuffled for each round. Ace is lowest; King is highest. When ranks match, suits break the tie in this order: Spades, Hearts, Diamonds, Clubs.
- **How to play:** The app shuffles the player order and passes the device to each player. Select **สุ่มการ์ด** (Draw card) to receive a face-down card. You may draw again before opening it; every drawn card is removed from the deck, including cards replaced by another draw. Select **เปิดการ์ด** (Reveal card), then **เก็บไพ่ใบนี้** (Keep this card) to confirm your final card and pass the device on.
- The app prevents drawing when doing so would leave too few cards for players who have not had a turn. Once everyone has kept one card, the highest card loses. All cards are shown on the result screen, and the loss is recorded locally.

## 5. Saved data and privacy

- Player names are saved separately for each game in the current browser's local storage and may be restored on a later visit using the same browser profile.
- Loss statistics are saved locally for Number Guess, Minesweeper, Last Finger, Secret Range, and Big Card. Each game's setup panel has a reset control for its statistics.
- Truth or Dare has no loss-statistics panel. Secret Range does not save submitted numbers. Active rounds, card draws, and turn progress are not stored as resumable sessions.
- Data is not sent to a PartyGame server and does not sync between devices. Clearing the browser's site data can remove saved names and statistics. If browser storage is unavailable, the games remain playable but saved data may not persist.

## 6. Troubleshooting

- **A game will not start:** Check that every player name is filled in and unique. Use 2–8 players, or 3–8 for Secret Range.
- **Voice guessing does not work:** Voice recognition depends on browser support and permission. Type the number instead, or speak it in Thai when voice recognition is available.
- **Last Finger seems to wait:** Keep holding through the signal and release only after it becomes silent. On a computer, focus the game area before using Space or Enter.
- **Names or statistics are missing:** Return in the same browser profile and check whether site data was cleared or local storage is disabled.
- **The page does not open:** Start the Vite development server with `npm run dev`, then use the local address printed in the terminal.

## 7. Project map

| Path | Purpose |
| --- | --- |
| `src/main.jsx` | React entry point and stylesheet loading |
| `src/App.jsx` | Home page, game catalog, navigation, and game selection |
| `src/games/` | Six game screens and shared loss-statistics panel |
| `src/games/gameStats.js` | Player-name storage, loss-statistics storage, and player shuffling |
| `src/games/numberGuess.js` | Number parsing and secret-number generation |
| `src/games/truthOrDareTopics.js` | Built-in Truth or Dare topics and prompts |
| `src/styles.css` | Responsive layout, visual styles, and interaction states |
| `index.html` | HTML shell and page metadata |
| `package.json` | Runtime requirements and npm scripts |

## 8. Maintainer notes

- Update this guide when a game's rules, supported player count, or controls change.
- Add or change game cards and their availability in `src/App.jsx`; keep the selected game ID connected to the corresponding component in the same file.
- Shared player/statistics helpers live in `src/games/gameStats.js`. Game-specific behavior is implemented in each component under `src/games/`.
- Use `npm run dev` for local development and `npm run build` to produce the deployable static site in `dist/`.

---

# ภาษาไทย

## 1. PartyGame คืออะไร

PartyGame คือเว็บไซต์รวมเกมปาร์ตี้ที่พัฒนาด้วย React 19 และ Vite 8 และปรับหน้าจอตามอุปกรณ์ได้ ปัจจุบันมีเกมเล่นได้ 6 เกม ผู้เล่นผลัดกันใช้โทรศัพท์ แท็บเล็ต หรือคอมพิวเตอร์เครื่องเดียวกัน ระบบยังไม่มีบัญชีผู้ใช้ ระบบจับคู่ผู้เล่นออนไลน์ หรือการซิงก์ข้อมูลระหว่างอุปกรณ์

ตัวแอปในปัจจุบันแสดงผลเป็นภาษาไทย ส่วนเอกสารฉบับนี้อธิบายทั้งวิธีเล่นและโครงสร้างสำหรับผู้ดูแลโปรเจกต์

## 2. ข้อกำหนดและการเริ่มโปรเจกต์

- ต้องใช้ Node.js เวอร์ชัน `20.19+` หรือ `22.12+`.
- ใช้เบราว์เซอร์รุ่นปัจจุบันที่เปิดใช้งาน JavaScript.
- เกมหลักทำงานในเบราว์เซอร์โดยไม่ต้องมีเซิร์ฟเวอร์เกม ส่วนการรู้จำเสียงขึ้นอยู่กับเบราว์เซอร์ที่ใช้

เปิดเทอร์มินัลที่โฟลเดอร์หลักของโปรเจกต์ แล้วรัน:

```bash
npm install
npm run dev
```

เปิด URL ในเครื่องที่ Vite แสดงในเทอร์มินัล หากต้องการสร้างและดูตัวอย่างไฟล์สำหรับใช้งานจริง ให้รัน:

```bash
npm run build
npm run preview
```

ไฟล์สำหรับนำไปเผยแพร่จะอยู่ใน `dist/` และสามารถให้บริการผ่านโฮสต์เว็บไซต์แบบสแตติกได้ ปัจจุบันโปรเจกต์ไม่มีแบ็กเอนด์ ฐานข้อมูล หรือสคริปต์ทดสอบ

## 3. วิธีเล่นทั่วไป

1. ที่หน้าแรก เลือกการ์ดเกมที่ต้องการ แล้วกด **เริ่มเล่น**.
2. เพิ่มหรือลบผู้เล่น กรอกชื่อทุกคน แล้วเริ่มเกม เกมส่วนใหญ่รองรับ 2–8 คน ส่วนเลขลับขั้วสุดโต่งต้องมี 3–8 คน ชื่อต้องไม่เว้นว่างและห้ามซ้ำกันในเกมเดียวกัน โดยกรอกได้ไม่เกิน 24 ตัวอักษร
3. ทำตามข้อความบอกตาบนหน้าจอ เมื่อเกมให้ส่งต่ออุปกรณ์ ให้ส่งให้ผู้เล่นที่มีชื่อแสดงอยู่
4. เมื่อเกมแสดงหน้าผลลัพธ์ เลือก **เริ่มเกมใหม่** เพื่อเล่นต่อด้วยรายชื่อเดิม หรือ **เปลี่ยนผู้เล่น** เพื่อกลับไปแก้รายชื่อ ส่วน Truth or Dare จะเล่นต่อรอบใหม่อัตโนมัติ โดยใช้ปุ่มข้างหน้าจอเพื่อสุ่มลำดับใหม่หรือแก้รายชื่อ
5. กด **กลับหน้ารวมเกม** ที่แถบด้านบนเพื่อออกจากเกมและกลับไปยังรายการเกม

เกมที่ใช้ลำดับผู้เล่นจะสุ่มลำดับเมื่อเริ่มรอบ ให้ผู้เล่นที่กำลังเล่นดูหน้าจอ และทำตามขั้นตอนส่งอุปกรณ์ส่วนตัวในเกมเลขลับขั้วสุดโต่งและจับใหญ่ เพื่อป้องกันไม่ให้เห็นคำตอบโดยไม่ตั้งใจ

## 4. รายละเอียดเกม

### 4.1 อย่าโดนเลขลับ! (Number Guess)

- **จำนวนผู้เล่น:** 2–8 คน
- **เป้าหมาย:** หลีกเลี่ยงการเป็นคนทายเลขลับถูก
- **วิธีเล่น:** ระบบสุ่มจำนวนเต็มตั้งแต่ 1–100 และสุ่มลำดับผู้เล่น ทุกคนผลัดกันส่งคำทายคนละหนึ่งครั้ง ระบบจะแจ้งว่าเลขลับมากกว่าหรือน้อยกว่าคำทาย พร้อมจำกัดช่วงตัวเลขที่ทายได้ และไม่อนุญาตให้ทายเลขที่เคยทายไปแล้ว ผู้ที่ทายเลขลับถูกเป็นผู้แพ้ในรอบนั้น
- **การป้อนคำตอบ:** พิมพ์ตัวเลข หรือกดปุ่มไมโครโฟนแล้วพูดภาษาไทย หากเบราว์เซอร์รองรับการรู้จำเสียง หากใช้เสียงไม่ได้หรือจับคำผิด ให้พิมพ์แทน ฟังก์ชันไมโครโฟนอาจต้องได้รับอนุญาตจากเบราว์เซอร์
- **เมื่อจบรอบ:** ระบบบันทึกสถิติแพ้ของผู้เล่นคนนั้นไว้ในเกมนี้ จากนั้นเริ่มรอบใหม่หรือเปลี่ยนรายชื่อผู้เล่นได้

### 4.2 เปิดช่อง ลุ้นบึ้ม (Minesweeper)

- **จำนวนผู้เล่น:** 2–8 คน
- **กระดาน:** 6 × 6 ช่อง แต่ละรอบสุ่มระเบิด 5–15 ลูก
- **วิธีเล่น:** ผู้เล่นผลัดกันเปิดช่องที่ยังไม่เปิดครั้งละหนึ่งช่อง หากเป็นช่องปลอดภัย ช่องนั้นจะถูกนำออกจากกระดานและส่งตาให้คนถัดไป หากเปิดเจอระเบิด รอบจะจบทันที ผู้เล่นคนนั้นแพ้และระบบจะแสดงระเบิดทั้งหมดบนกระดาน
- **เมื่อจบรอบ:** เลือก **เริ่มเกมใหม่** เพื่อสุ่มกระดานใหม่ หรือเปลี่ยนรายชื่อผู้เล่น ระบบบันทึกสถิติแพ้ในเกมนี้

### 4.3 Truth or Dare

- **จำนวนผู้เล่น:** 2–8 คน
- **วิธีเล่น:** หลังสุ่มลำดับ ผู้เล่นที่ถึงตาเลือก **Truth** หรือ **Dare** แล้วระบบสุ่มโจทย์จากชุดคำถามที่มีหัวข้อความรัก เรื่องเพื่อน วัยเด็ก และการทำงาน กด **ขอเปลี่ยนโจทย์** เพื่อรับโจทย์ใหม่ประเภทเดิม หรือกด **ส่งตาให้คนถัดไป** เพื่อเล่นต่อ
- **การขอผ่าน:** ผู้เล่นข้ามโจทย์หรือส่งตาต่อได้ เกมไม่มีคะแนนหรือบทลงโทษ
- **รอบถัดไป:** เมื่อทุกคนได้เล่นแล้ว ระบบจะสุ่มลำดับใหม่สำหรับรอบถัดไป กด **สุ่มลำดับใหม่** เพื่อเริ่มลำดับใหม่ หรือ **เปลี่ยนรายชื่อผู้เล่น** เพื่อกลับไปแก้รายชื่อ
- เกมนี้ไม่มีแผงสถิติแพ้

### 4.4 อย่าปล่อยช้า! (Last Finger)

- **จำนวนผู้เล่น:** 2–8 คน
- **เป้าหมาย:** ตอบสนองให้เร็วหลังสัญญาณเงียบ
- **วิธีเล่น:** เล่นทีละคน ผู้เล่นที่ถึงตากดค้างบนพื้นที่เล่นขนาดใหญ่ด้วยการแตะหรือเมาส์ หากใช้คอมพิวเตอร์ ให้โฟกัสพื้นที่เล่นแล้วกด **Space** หรือ **Enter** ค้างไว้ รอช่วงสัญญาณที่สุ่มนาน 10–20 วินาที แล้วปล่อยทันทีเมื่อเสียงเงียบ ระบบจะบันทึกเวลาตอบสนองและเรียกผู้เล่นคนถัดไป
- **ปล่อยก่อนเวลา:** หากปล่อยขณะที่สัญญาณเตือนยังทำงาน จะถือว่าฟาวล์และผู้เล่นคนนั้นแพ้ทันที
- **ผลการแข่งขัน:** เมื่อทุกคนเล่นครบโดยไม่ฟาวล์ ผู้ที่ตอบสนองช้าที่สุดเป็นผู้แพ้ หน้าผลลัพธ์จะแสดงเวลาของแต่ละคนและบันทึกสถิติแพ้ จากนั้นเริ่มรอบใหม่หรือเปลี่ยนรายชื่อได้
- ให้ผู้เล่นเล่นทีละคนโดยไม่ดูผลหรือคำแนะนำจากคนอื่น

### 4.5 เลขลับขั้วสุดโต่ง (Secret Range)

- **จำนวนผู้เล่น:** 3–8 คน
- **เป้าหมาย:** หลีกเลี่ยงการส่งเลขที่ต่ำที่สุดหรือสูงที่สุด
- **วิธีเล่น:** ระบบสุ่มลำดับ แล้วส่งอุปกรณ์ให้ผู้เล่นทีละคน เมื่อถึงตาให้กรอกจำนวนเต็มตั้งแต่ 1–1,000 ช่องกรอกจะซ่อนตัวเลขที่พิมพ์ไว้ ระบบจะไม่แสดงคำตอบจนกว่าทุกคนจะส่งครบ
- **ผลการแข่งขัน:** ผู้ที่ส่งเลขต่ำสุดและสูงสุดเป็นผู้แพ้ หากมีหลายคนได้เลขซ้ำกันที่ค่าต่ำสุดหรือสูงสุด ทุกคนที่อยู่ในกลุ่มค่านั้นจะแพ้ หากทุกคนส่งเลขเดียวกัน ทุกคนจะแพ้ หลังจบรอบระบบจะแสดงตัวเลขของผู้เล่นทุกคน
- **ความเป็นส่วนตัวและข้อมูล:** ขอให้คนอื่นไม่มองหน้าจอขณะผู้เล่นกำลังกรอกเลข คำตอบถูกเก็บไว้เฉพาะในหน่วยความจำระหว่างรอบและไม่บันทึกเป็นข้อมูลในเบราว์เซอร์ ส่วนสถิติแพ้จะบันทึกไว้ในเบราว์เซอร์

### 4.6 จับใหญ่ (Big Card)

- **จำนวนผู้เล่น:** 2–8 คน
- **สำรับ:** ไพ่สำรับมาตรฐาน 52 ใบ ซึ่งสับใหม่ทุกรอบ A ต่ำสุด และ K สูงสุด หากหน้าไพ่มีค่าเท่ากัน จะใช้ดอกตัดสินตามลำดับ โพดำ โพแดง ข้าวหลามตัด และดอกจิก
- **วิธีเล่น:** ระบบสุ่มลำดับแล้วส่งอุปกรณ์ให้ผู้เล่นทีละคน กด **สุ่มการ์ด** เพื่อรับไพ่คว่ำไว้ ผู้เล่นสุ่มใหม่ได้ก่อนเปิดไพ่ ไพ่ทุกใบที่สุ่มจะถูกนำออกจากสำรับ แม้จะสุ่มใบใหม่มาแทนก็ตาม กด **เปิดการ์ด** แล้วกด **เก็บไพ่ใบนี้** เพื่อยืนยันไพ่สุดท้ายและส่งอุปกรณ์ต่อ
- ระบบจะไม่ให้สุ่มไพ่เพิ่มหากจะทำให้ไพ่ไม่พอสำหรับผู้เล่นที่ยังไม่ได้เล่น เมื่อทุกคนเก็บไพ่คนละใบแล้ว ผู้ที่ได้ไพ่ใหญ่ที่สุดจะแพ้ หน้าผลลัพธ์แสดงไพ่ทุกใบและบันทึกสถิติแพ้ไว้ในเบราว์เซอร์

## 5. ข้อมูลที่บันทึกและความเป็นส่วนตัว

- ระบบบันทึกชื่อผู้เล่นแยกตามเกมไว้ในพื้นที่จัดเก็บภายในเบราว์เซอร์ และอาจโหลดกลับมาใช้เมื่อเปิดเกมผ่านโปรไฟล์เบราว์เซอร์เดิม
- ระบบบันทึกสถิติแพ้ในเบราว์เซอร์สำหรับเกมอย่าโดนเลขลับ เปิดช่องลุ้นบึ้ม อย่าปล่อยช้า เลขลับขั้วสุดโต่ง และจับใหญ่ แผงตั้งค่าของแต่ละเกมมีปุ่มรีเซ็ตสถิติ
- Truth or Dare ไม่มีแผงสถิติแพ้ เกมเลขลับขั้วสุดโต่งไม่บันทึกตัวเลขที่ส่ง รอบที่กำลังเล่น ไพ่ที่จั่ว และความคืบหน้าของตาจะไม่ถูกบันทึกเพื่อกลับมาเล่นต่อ
- ข้อมูลจะไม่ถูกส่งไปยังเซิร์ฟเวอร์ของ PartyGame และไม่มีการซิงก์ข้ามอุปกรณ์ การล้างข้อมูลเว็บไซต์ในเบราว์เซอร์อาจลบรายชื่อและสถิติที่บันทึกไว้ หากเบราว์เซอร์ปิดกั้นพื้นที่จัดเก็บ เกมยังเล่นได้ แต่อาจไม่สามารถเก็บข้อมูลไว้ได้

## 6. วิธีแก้ปัญหาเบื้องต้น

- **เริ่มเกมไม่ได้:** ตรวจว่ากรอกชื่อผู้เล่นครบและไม่มีชื่อซ้ำ จำนวนผู้เล่นต้องอยู่ในช่วง 2–8 คน หรือ 3–8 คนสำหรับเกมเลขลับขั้วสุดโต่ง
- **ทายด้วยเสียงไม่ได้:** การรู้จำเสียงขึ้นอยู่กับความสามารถและสิทธิ์ของเบราว์เซอร์ ให้พิมพ์ตัวเลขแทน หรือพูดตัวเลขภาษาไทยเมื่อเบราว์เซอร์รองรับ
- **เกมอย่าปล่อยช้ารอนาน:** กดค้างระหว่างสัญญาณ แล้วปล่อยเมื่อเสียงเงียบ หากใช้คอมพิวเตอร์ ให้คลิกพื้นที่เล่นก่อนใช้ Space หรือ Enter
- **ชื่อหรือสถิติหาย:** เปิดเกมจากโปรไฟล์เบราว์เซอร์เดิม และตรวจว่ามีการล้างข้อมูลเว็บไซต์หรือปิดพื้นที่จัดเก็บในเบราว์เซอร์หรือไม่
- **เปิดหน้าเว็บไม่ได้:** เริ่มเซิร์ฟเวอร์พัฒนาด้วย `npm run dev` แล้วเปิด URL ในเครื่องที่แสดงในเทอร์มินัล

## 7. โครงสร้างโปรเจกต์

| ที่อยู่ไฟล์ | หน้าที่ |
| --- | --- |
| `src/main.jsx` | จุดเริ่มต้นของ React และโหลดไฟล์สไตล์ |
| `src/App.jsx` | หน้าแรก รายการเกม เมนู และการเลือกเกม |
| `src/games/` | หน้าจอเกมทั้ง 6 เกมและแผงสถิติแพ้ที่ใช้ร่วมกัน |
| `src/games/gameStats.js` | จัดเก็บรายชื่อผู้เล่น สถิติแพ้ และสุ่มลำดับผู้เล่น |
| `src/games/numberGuess.js` | แปลงคำทายเป็นตัวเลขและสุ่มเลขลับ |
| `src/games/truthOrDareTopics.js` | หัวข้อและโจทย์ที่มีใน Truth or Dare |
| `src/styles.css` | เลย์เอาต์แบบปรับตามจอ สี และสถานะการโต้ตอบ |
| `index.html` | โครง HTML และข้อมูลกำกับหน้าเว็บ |
| `package.json` | เวอร์ชันที่ต้องใช้และคำสั่ง npm |

## 8. หมายเหตุสำหรับผู้ดูแลโปรเจกต์

- แก้ไขคู่มือนี้เมื่อกติกา จำนวนผู้เล่นที่รองรับ หรือวิธีควบคุมเกมเปลี่ยนไป
- เพิ่มหรือแก้การ์ดเกมและสถานะพร้อมเล่นใน `src/App.jsx` และตรวจว่า ID ของเกมเชื่อมกับคอมโพเนนต์ที่ถูกต้องในไฟล์เดียวกัน
- ฟังก์ชันจัดการรายชื่อและสถิติที่ใช้ร่วมกันอยู่ใน `src/games/gameStats.js` ส่วนกติกาเฉพาะเกมอยู่ในคอมโพเนนต์ใต้ `src/games/`
- ใช้ `npm run dev` เพื่อพัฒนาในเครื่อง และ `npm run build` เพื่อสร้างเว็บไซต์สแตติกที่พร้อมนำไปเผยแพร่ไว้ใน `dist/`
