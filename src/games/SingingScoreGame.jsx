import { useCallback, useEffect, useRef, useState } from 'react';
import { loadGamePlayers, saveGamePlayers, shufflePlayers } from './gameStats.js';
import { analyzeVoiceFrame, calculateSingingScore } from './singingScore.js';

const GAME_ID = 'singing-score';
const MIN_PLAYERS = 4;
const MAX_PLAYERS = 20;
const ROUND_COUNT = 1;
const ROUND_NUMBER = 1;
const MAX_PERFORMANCE_MS = 60_000;
const MIN_PERFORMANCE_MS = 30_000;
const AUDIO_SAMPLE_INTERVAL_MS = 100;

function formatElapsedTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function createAudioRecorder(stream) {
  const RecorderConstructor = window.MediaRecorder;
  if (!RecorderConstructor) throw new Error('recording-unsupported');

  const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
    .find((type) => RecorderConstructor.isTypeSupported?.(type));
  const options = { audioBitsPerSecond: 64_000 };
  if (mimeType) options.mimeType = mimeType;
  return new RecorderConstructor(stream, options);
}

function createInitialPlayers() {
  return Array.from({ length: MIN_PLAYERS }, (_, index) => ({
    id: index + 1,
    name: 'ผู้เล่น ' + (index + 1),
  }));
}

function loadInitialPlayers() {
  const loadedPlayers = loadGamePlayers(GAME_ID, []);
  const players = loadedPlayers.slice(0, MAX_PLAYERS);
  let nextId = Math.max(0, ...players.map((player) => Number(player.id) || 0)) + 1;

  while (players.length < MIN_PLAYERS) {
    players.push({ id: nextId, name: 'ผู้เล่น ' + (players.length + 1) });
    nextId += 1;
  }

  return players;
}

function createTeams(players) {
  const shuffledPlayers = shufflePlayers(players);

  return Array.from({ length: shuffledPlayers.length / 2 }, (_, index) => ({
    id: 'team-' + (index + 1),
    number: index + 1,
    name: 'ทีม ' + (index + 1),
    players: shuffledPlayers.slice(index * 2, index * 2 + 2),
  }));
}

function createRoundTurns(teams) {
  return shufflePlayers(teams).map((team) => ({
    teamId: team.id,
    teamName: team.name,
  }));
}

function createFunnyCommentary(score) {
  const commentaries = score >= 85
    ? [
      'เสียงนิ่งจนโน้ตตัวอื่นขอมาเข้าแถว',
      'ทำนองเป๊ะจนเมโทรนอมขอพักร้อน',
      'ไมค์กำลังสงสัยว่านี่ซ้อมใหญ่หรือขึ้นคอนเสิร์ต',
      'คุมโทนได้ดีจนโน้ตไม่กล้าเถลไถล',
    ]
    : score >= 60
      ? [
        'ทำนองมาถูกทาง มีโน้ตแวะซื้อชาไข่มุกนิดหน่อย',
        'เสียงไปได้สวย มีบางโน้ตขอเดินชมวิวระหว่างทาง',
        'โทนกำลังดี โน้ตหลงซอยนิดเดียวก็กลับมาทัน',
        'เพลงนี้มีลูกเล่นจนเมโทรนอมต้องตั้งใจฟัง',
      ]
      : [
        'โน้ตแอบเล่นซ่อนหากับคีย์ รอบหน้าจับได้แน่',
        'ทำนองมีพล็อตหักมุมจนคีย์เพลงเดาตอนจบไม่ออก',
        'บางโน้ตออกไปเที่ยว แต่ทีมยังร้องจนจบอย่างสง่างาม',
        'เสียงพาเพลงไปผจญภัย รอบหน้าค่อยพากลับบ้าน',
      ];

  return commentaries[Math.floor(Math.random() * commentaries.length)];
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

function SingingScoreGame() {
  const [players, setPlayers] = useState(loadInitialPlayers);
  const [nextPlayerId, setNextPlayerId] = useState(() => (
    Math.max(0, ...players.map((player) => Number(player.id) || 0)) + 1
  ));
  const [teams, setTeams] = useState([]);
  const [roundTurns, setRoundTurns] = useState([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [performances, setPerformances] = useState([]);
  const [performanceScore, setPerformanceScore] = useState(null);
  const [performanceCommentary, setPerformanceCommentary] = useState('');
  const [setupError, setSetupError] = useState('');
  const [microphoneError, setMicrophoneError] = useState('');
  const [recordingError, setRecordingError] = useState('');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState('');
  const [phase, setPhase] = useState('setup');
  const microphoneStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioSourceRef = useRef(null);
  const analyserRef = useRef(null);
  const audioBufferRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedAudioChunksRef = useRef([]);
  const recordedAudioUrlsRef = useRef(new Set());
  const sampleFramesRef = useRef([]);
  const sampleTimerRef = useRef(null);
  const recordingStartedAtRef = useRef(0);
  const microphoneRequestRef = useRef(0);
  const isFinishingRef = useRef(false);

  const clearRecordedAudio = () => {
    recordedAudioUrlsRef.current.forEach((audioUrl) => URL.revokeObjectURL(audioUrl));
    recordedAudioUrlsRef.current.clear();
    setRecordedAudioUrl('');
  };

  const stopAudioRecording = (keepRecording) => {
    const recorder = mediaRecorderRef.current;
    mediaRecorderRef.current = null;

    if (!recorder) {
      recordedAudioChunksRef.current = [];
      return Promise.resolve('');
    }

    return new Promise((resolve) => {
      let finalized = false;
      const finalizeCapture = () => {
        if (finalized) return;
        finalized = true;
        const chunks = recordedAudioChunksRef.current;
        recordedAudioChunksRef.current = [];
        const audioBlob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        let audioUrl = '';

        if (keepRecording && audioBlob.size > 0) {
          audioUrl = URL.createObjectURL(audioBlob);
          recordedAudioUrlsRef.current.add(audioUrl);
          setRecordedAudioUrl(audioUrl);
        }

        resolve(audioUrl);
      };

      if (recorder.state === 'inactive') {
        finalizeCapture();
        return;
      }

      recorder.addEventListener('stop', finalizeCapture, { once: true });
      try {
        recorder.stop();
      } catch {
        recorder.removeEventListener('stop', finalizeCapture);
        finalizeCapture();
      }
    });
  };

  const currentTurn = roundTurns[currentTurnIndex];
  const nextTurn = roundTurns[currentTurnIndex + 1];
  const continueLabel = nextTurn
    ? 'ให้ทีมถัดไปร้อง'
    : 'ดูผลการแข่งขัน';

  useEffect(() => saveGamePlayers(GAME_ID, players), [players]);

  const releaseMicrophone = useCallback(() => {
    microphoneRequestRef.current += 1;
    if (sampleTimerRef.current !== null) {
      window.clearInterval(sampleTimerRef.current);
      sampleTimerRef.current = null;
    }

    audioSourceRef.current?.disconnect();
    audioSourceRef.current = null;
    analyserRef.current = null;
    audioBufferRef.current = null;
    const mediaRecorder = mediaRecorderRef.current;
    mediaRecorderRef.current = null;
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      try {
        mediaRecorder.stop();
      } catch {
        recordedAudioChunksRef.current = [];
      }
    }
    microphoneStreamRef.current?.getTracks().forEach((track) => track.stop());
    microphoneStreamRef.current = null;

    const audioContext = audioContextRef.current;
    audioContextRef.current = null;
    if (audioContext && audioContext.state !== 'closed') void audioContext.close().catch(() => {});
  }, []);

  useEffect(() => () => {
    void stopAudioRecording(false);
    releaseMicrophone();
    recordedAudioUrlsRef.current.forEach((audioUrl) => URL.revokeObjectURL(audioUrl));
    recordedAudioUrlsRef.current.clear();
  }, [releaseMicrophone]);

  const updatePlayerName = (playerId, name) => {
    setPlayers((currentPlayers) => currentPlayers.map((player) => (
      player.id === playerId ? { ...player, name } : player
    )));
    setSetupError('');
  };

  const addPlayer = () => {
    if (players.length >= MAX_PLAYERS) return;

    setPlayers((currentPlayers) => [
      ...currentPlayers,
      { id: nextPlayerId, name: 'ผู้เล่น ' + nextPlayerId },
    ]);
    setNextPlayerId((id) => id + 1);
    setSetupError('');
  };

  const removePlayer = (playerId) => {
    if (players.length <= MIN_PLAYERS) return;
    setPlayers((currentPlayers) => currentPlayers.filter((player) => player.id !== playerId));
    setSetupError('');
  };

  const startGame = (event) => {
    event.preventDefault();
    const cleanedPlayers = players.map((player) => ({ ...player, name: player.name.trim() }));

    if (cleanedPlayers.some((player) => !player.name)) {
      setSetupError('กรุณากรอกชื่อผู้เล่นให้ครบทุกคน');
      return;
    }

    if (cleanedPlayers.length < MIN_PLAYERS || cleanedPlayers.length > MAX_PLAYERS || cleanedPlayers.length % 2 !== 0) {
      setSetupError('เกมนี้ต้องมีผู้เล่น 4–20 คน และจำนวนผู้เล่นต้องเป็นเลขคู่');
      return;
    }

    const normalizedNames = cleanedPlayers.map((player) => player.name.normalize('NFKC').toLocaleLowerCase());
    if (new Set(normalizedNames).size !== normalizedNames.length) {
      setSetupError('ชื่อผู้เล่นต้องไม่ซ้ำกัน เพื่อให้บันทึกคะแนนได้ถูกคน');
      return;
    }

    const nextTeams = createTeams(cleanedPlayers);
    setPlayers(cleanedPlayers);
    setTeams(nextTeams);
    setRoundTurns(createRoundTurns(nextTeams));
    setCurrentTurnIndex(0);
    setPerformances([]);
    setPerformanceScore(null);
    setPerformanceCommentary('');
    setRecordingError('');
    clearRecordedAudio();
    setSetupError('');
    setMicrophoneError('');
    setPhase('playing');
  };

  const finishRecording = async () => {
    if (isFinishingRef.current || !currentTurn) return;
    isFinishingRef.current = true;

    if (sampleTimerRef.current !== null) {
      window.clearInterval(sampleTimerRef.current);
      sampleTimerRef.current = null;
    }

    const frames = [...sampleFramesRef.current];
    const result = calculateSingingScore(frames);
    sampleFramesRef.current = [];
    const audioUrl = await stopAudioRecording(!result.insufficientData);
    releaseMicrophone();
    setRecordingSeconds(0);
    if (result.insufficientData) {
      setRecordingError('');
      setMicrophoneError('จับโน้ตได้น้อยเกินไปสำหรับประเมินโทนและความนิ่ง ลองเริ่มร้องใหม่');
      setPhase('playing');
      return;
    }

    setRecordingError(audioUrl ? '' : 'บันทึกคลิปเสียงไม่สำเร็จ แต่ระบบยังคำนวณคะแนนจากเสียงที่ฟังได้');
    setPerformanceScore(result);
    const commentary = createFunnyCommentary(result.score);
    setPerformanceCommentary(commentary);
    setPerformances((currentPerformances) => [...currentPerformances, {
      round: ROUND_NUMBER,
      teamId: currentTurn.teamId,
      teamName: currentTurn.teamName,
      score: result.score,
      audioUrl,
      commentary,
    }]);
    setMicrophoneError('');
    setPhase('score');
  };

  const startListening = async () => {
    if (!currentTurn || phase !== 'playing') return;
    setMicrophoneError('');
    setRecordingError('');
    setRecordedAudioUrl('');

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setMicrophoneError('เบราว์เซอร์นี้ยังใช้ไมโครโฟนไม่ได้ กรุณาเปิดเกมผ่าน HTTPS หรือ localhost');
      return;
    }

    releaseMicrophone();
    const requestId = ++microphoneRequestRef.current;
    sampleFramesRef.current = [];
    isFinishingRef.current = false;

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (microphoneRequestRef.current !== requestId) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextConstructor) throw new Error('audio-unsupported');

      const audioContext = new AudioContextConstructor();
      audioContextRef.current = audioContext;
      microphoneStreamRef.current = stream;
      await audioContext.resume();
      if (microphoneRequestRef.current !== requestId) {
        releaseMicrophone();
        return;
      }

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0;
      source.connect(analyser);
      const mediaRecorder = createAudioRecorder(stream);
      recordedAudioChunksRef.current = [];
      mediaRecorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) recordedAudioChunksRef.current.push(event.data);
      });
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      audioSourceRef.current = source;
      analyserRef.current = analyser;
      audioBufferRef.current = new Float32Array(analyser.fftSize);
      recordingStartedAtRef.current = performance.now();
      setRecordingSeconds(0);
      setPhase('listening');

      sampleTimerRef.current = window.setInterval(() => {
        if (microphoneRequestRef.current !== requestId || !analyserRef.current || !audioBufferRef.current) return;

        analyserRef.current.getFloatTimeDomainData(audioBufferRef.current);
        const frame = analyzeVoiceFrame(audioBufferRef.current, audioContext.sampleRate);
        sampleFramesRef.current.push(frame);
        const elapsed = performance.now() - recordingStartedAtRef.current;
        setRecordingSeconds(Math.floor(elapsed / 1000));
        if (elapsed >= MAX_PERFORMANCE_MS) finishRecording();
      }, AUDIO_SAMPLE_INTERVAL_MS);
    } catch (error) {
      stream?.getTracks().forEach((track) => track.stop());
      const canUpdateState = microphoneRequestRef.current === requestId;
      releaseMicrophone();
      if (!canUpdateState) return;

      if (error?.message === 'audio-unsupported') {
        setMicrophoneError('เบราว์เซอร์นี้ไม่รองรับการวิเคราะห์เสียง');
      } else if (error?.message === 'recording-unsupported') {
        setMicrophoneError('เบราว์เซอร์นี้ไม่รองรับการบันทึกเสียง');
      } else if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') {
        setMicrophoneError('ยังไม่ได้รับอนุญาตให้ใช้ไมโครโฟน กรุณาอนุญาตในเบราว์เซอร์แล้วลองอีกครั้ง');
      } else if (error?.name === 'NotFoundError') {
        setMicrophoneError('ไม่พบไมโครโฟนที่ใช้งานได้');
      } else if (error?.name === 'NotReadableError') {
        setMicrophoneError('ไมโครโฟนอาจกำลังถูกใช้งานโดยแอปอื่น');
      } else {
        setMicrophoneError('เปิดไมโครโฟนไม่สำเร็จ กรุณาตรวจสอบอุปกรณ์แล้วลองอีกครั้ง');
      }
    }
  };

  const continueAfterScore = () => {
    setPerformanceScore(null);
    setPerformanceCommentary('');
    setRecordedAudioUrl('');

    if (currentTurnIndex + 1 < roundTurns.length) {
      setCurrentTurnIndex((index) => index + 1);
      setPhase('playing');
      return;
    }

    setPhase('results');
  };

  const cancelRecording = () => {
    void stopAudioRecording(false);
    releaseMicrophone();
    sampleFramesRef.current = [];
    isFinishingRef.current = false;
    setRecordingSeconds(0);
    setRecordingError('');
    setPhase('playing');
  };

  const returnToSetup = () => {
    releaseMicrophone();
    clearRecordedAudio();
    sampleFramesRef.current = [];
    setTeams([]);
    setRoundTurns([]);
    setCurrentTurnIndex(0);
    setPerformances([]);
    setPerformanceScore(null);
    setPerformanceCommentary('');
    setMicrophoneError('');
    setRecordingError('');
    setPhase('setup');
  };

  const teamResults = teams.map((team) => {
    const teamPerformances = performances.filter((performance) => performance.teamId === team.id);
    const totalScore = teamPerformances.reduce((total, performance) => total + performance.score, 0);

    return {
      ...team,
      averageScore: teamPerformances.length > 0 ? totalScore / teamPerformances.length : 0,
      performances: teamPerformances.sort((first, second) => first.round - second.round),
    };
  }).sort((first, second) => second.averageScore - first.averageScore || first.number - second.number);
  const winningScore = teamResults[0]?.averageScore ?? 0;
  const winningTeams = teamResults.filter((team) => team.averageScore === winningScore);

  return (
    <section className="guess-game-shell singing-game-shell" aria-labelledby="singing-game-title">
      <div className="guess-game-container">
        <header className="guess-game-heading">
          <span className="section-kicker">เกมที่ 07 · เกมปาร์ตี้</span>
          <h1 id="singing-game-title">ศึกเสียงทอง</h1>
          <p>สุ่มทีมละ 2 คน แล้วแต่ละทีมร้องหนึ่งครั้งต่อรอบ ให้แอปวิเคราะห์เสียงและคิดคะแนนทีม</p>
        </header>

        {phase === 'setup' && (
          <div className="guess-setup-layout singing-setup-layout">
            <section className="guess-panel setup-panel" aria-labelledby="singing-players-title">
              <div className="guess-panel-heading">
                <span className="panel-step">ก่อนเริ่มเกม</span>
                <h2 id="singing-players-title">ใครอยู่ในวงบ้าง?</h2>
                <p>ระบบสุ่มจับคู่ทีมละ 2 คนและสุ่มลำดับทีมใหม่ทุกรอบ เมื่อถึงคิว สมาชิกคนใดในทีมก็ร้องแทนทีมได้ โดยระบบไม่แยกผู้ร้อง</p>
              </div>

              <form onSubmit={startGame}>
                <div className="player-list">
                  {players.map((player, index) => (
                    <div className="player-row" key={player.id}>
                      <span className={'player-number player-number--' + (index % 4)} aria-hidden="true">{index + 1}</span>
                      <label className="visually-hidden" htmlFor={'singing-player-' + player.id}>ชื่อผู้เล่นคนที่ {index + 1}</label>
                      <input
                        id={'singing-player-' + player.id}
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
                  <p className="setup-hint">ผู้เล่น 4–{MAX_PLAYERS} คน จำนวนต้องเป็นเลขคู่</p>
                </div>

                {setupError && <p className="form-error" role="alert">{setupError}</p>}
                <button className="button button--primary guess-start-button" type="submit">
                  สุ่มทีมและเริ่มเล่น <ArrowIcon />
                </button>
              </form>
            </section>

            <aside className="guess-rules-panel singing-rules-panel" aria-labelledby="singing-rules-title">
              <span className="panel-step">กติกาง่าย ๆ</span>
              <h2 id="singing-rules-title">ทีมละหนึ่งครั้ง<br />รับคะแนนรวมกัน</h2>
              <ol className="rules-list">
                <li><span>1</span><p>ระบบสุ่มสมาชิกเป็นทีมละ 2 คน</p></li>
                <li><span>2</span><p>เล่นรอบเดียว แต่ละทีมร้องหนึ่งครั้ง คะแนนและคลิปผูกกับทีม ไม่แยกว่าผู้เล่นคนไหนร้อง</p></li>
                <li><span>3</span><p>ระบบให้โบนัสหรือหักคะแนนจากความนิ่งของโน้ตและลักษณะโทนเสียง โดยไม่คิดจากความดังหรือเทียบเพลงต้นฉบับ</p></li>
              </ol>
              <p className="singing-storage-note">ไมโครโฟนเริ่มบันทึกเมื่อกดปุ่ม คลิปเก็บชั่วคราวไว้ฟังย้อนหลังตลอดเกมและลบเมื่อเริ่มเกมใหม่หรือปิดเกม เสียงไม่ถูกส่งออกจากอุปกรณ์</p>
            </aside>
          </div>
        )}

        {(phase === 'playing' || phase === 'listening' || phase === 'score') && currentTurn && (
          <div className="singing-play-layout">
            <section className="guess-panel singing-score-panel" aria-labelledby="singing-turn-title">
              <span className="panel-step">รอบ {ROUND_NUMBER} จาก {ROUND_COUNT} · {currentTurn.teamName}</span>
              {phase !== 'score' && (
                <>
                  <h2 id="singing-turn-title">
                    {phase === 'listening'
                      ? 'กำลังบันทึกเสียงของ ' + currentTurn.teamName
                      : currentTurn.teamName + ' ถึงคิวร้องเพลง'}
                  </h2>
                  <p className="singing-turn-hint">
                    {phase === 'listening'
                      ? 'ร้องเพลงแทนทีม กดจบได้เมื่อครบ 30 วินาที'
                      : 'ร้องหนึ่งครั้งแทนทีมนี้ ใครในทีมเป็นผู้ร้องก็ได้ · ใช้เพลงและท่อนเดียวกันทุกทีม'}
                  </p>
                </>
              )}

              {phase === 'playing' && (
                <div className="singing-microphone-start">
                  {microphoneError && <p className="form-error" role="alert">{microphoneError}</p>}
                  <button className="button button--primary guess-start-button" type="button" onClick={() => void startListening()}>
                    บันทึกเสียงและเริ่มร้อง <ArrowIcon />
                  </button>
                  <p>กดบันทึกแล้วร้องหนึ่งครั้งแทนทีม บันทึกหนึ่งเทค ฟังอย่างน้อย 30 วินาที และจบให้อัตโนมัติเมื่อครบ 60 วินาที</p>
                </div>
              )}

              {phase === 'listening' && (
                <div className="singing-listening-status">
                  <div className="singing-stage" aria-hidden="true">
                    <span className="singing-stage-note singing-stage-note--left">♪</span>
                    <span className="singing-stage-note singing-stage-note--right">♫</span>
                    <span className="singing-stage-note singing-stage-note--small">♪</span>
                    <span className="singing-stage-halo singing-stage-halo--one" />
                    <span className="singing-stage-halo singing-stage-halo--two" />
                    <svg className="singing-stage-mic" viewBox="0 0 48 48" fill="none">
                      <rect x="17" y="4" width="14" height="24" rx="7" fill="#ff6874" stroke="currentColor" strokeWidth="2.5" />
                      <path d="M11 21v3a13 13 0 0 0 26 0v-3M24 37v6m-8 0h16" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
                      <path d="M20 11h8m-8 5h8" stroke="#fffdf8" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <div className="singing-stage-equalizer">
                      {Array.from({ length: 7 }, (_, index) => <span key={index} />)}
                    </div>
                  </div>
                  <div className="singing-recording-timer" aria-live="off"><span className="singing-recording-dot" />{formatElapsedTime(recordingSeconds)}<small> / 01:00</small></div>
                  <p className="singing-mic-hint">ร้องต่อเนื่องอย่างน้อย 30 วินาที แล้วกดจบได้ · ครบ 60 วินาทีระบบจะประเมินให้เอง</p>
                  <button className="button button--primary guess-start-button" type="button" disabled={recordingSeconds < 30} onClick={finishRecording}>
                    จบเพลงและคำนวณคะแนนอัตโนมัติ
                  </button>
                  <button className="change-players-button singing-cancel-recording" type="button" onClick={cancelRecording}>ยกเลิกและเริ่มร้องใหม่</button>
                </div>
              )}

              {phase === 'score' && performanceScore && (
                <div className="singing-auto-score" aria-live="polite">
                  <h2 id="singing-turn-title">คะแนนของ {currentTurn.teamName}</h2>
                  <span className="singing-auto-score-label">คะแนนจากการฟังเสียงทีม</span>
                  <strong>{performanceScore.score}<small> / 100</small></strong>
                  <ul className="singing-score-breakdown">
                    <li><span>ลักษณะโทนเสียง</span><strong>{performanceScore.toneQuality}%</strong></li>
                    <li><span>ความนิ่งของโน้ต</span><strong>{performanceScore.pitchStability}%</strong></li>
                  </ul>
                  <section className="singing-auto-judgement" aria-label="คำตัดสินโบนัสและหักคะแนน">
                    <div className="singing-judgement-heading"><strong>คำตัดสินระบบ</strong><span>คะแนนพื้นฐาน {performanceScore.baseScore}</span></div>
                    {performanceScore.judgments.length > 0 ? (
                      <ul>
                        {performanceScore.judgments.map((judgment, index) => (
                          <li className={'is-' + judgment.type} key={judgment.reason + index}>
                            <span>{judgment.reason}</span>
                            <strong>{judgment.points > 0 ? '+' : ''}{judgment.points}</strong>
                          </li>
                        ))}
                      </ul>
                    ) : <p>ไม่มีโบนัสหรือหักคะแนนพิเศษ</p>}
                    <small>ปรับคะแนน {performanceScore.adjustment > 0 ? '+' : ''}{performanceScore.adjustment} · จำกัดผลรวมไว้ที่ 1–100</small>
                  </section>
                  {performanceCommentary && (
                    <p className="singing-funny-commentary" role="status">
                      <span aria-hidden="true">🎤</span>{performanceCommentary}
                    </p>
                  )}
                  {recordedAudioUrl && (
                    <div className="singing-recording-playback">
                      <label htmlFor="singing-recording-preview">ฟังเสียงที่บันทึกไว้</label>
                      <audio id="singing-recording-preview" controls preload="metadata" src={recordedAudioUrl}>
                        เบราว์เซอร์นี้ไม่รองรับการเล่นเสียง
                      </audio>
                    </div>
                  )}
                  {recordingError && <p className="singing-score-warning" role="status">{recordingError}</p>}
                  <p className="singing-score-disclaimer">คะแนนไม่คิดจากความดังและไม่เทียบกับเพลงต้นฉบับ ประเมินจากความนิ่งของโน้ตและลักษณะโทนเสียง</p>
                  <button className="button button--primary guess-start-button" type="button" onClick={continueAfterScore}>
                    {continueLabel} <ArrowIcon />
                  </button>
                </div>
              )}
            </section>

            <aside className="guess-rules-panel singing-round-progress" aria-labelledby="singing-progress-title">
              <span className="panel-step">ความคืบหน้าทั้งเกม</span>
              <h2 id="singing-progress-title">ผลงานของแต่ละทีม</h2>
              <div className="singing-progress-list">
                {roundTurns.reduce((roundTeams, turn) => {
                  if (!roundTeams.some((team) => team.id === turn.teamId)) {
                    const team = teams.find((entry) => entry.id === turn.teamId);
                    roundTeams.push({ id: turn.teamId, name: turn.teamName, players: team?.players ?? [] });
                  }
                  return roundTeams;
                }, []).map((team) => {
                  const completedRounds = performances.filter((performance) => performance.teamId === team.id).length;
                  const performedThisRound = performances.some((performance) => (
                    performance.round === ROUND_NUMBER && performance.teamId === team.id
                  ));

                  return (
                    <div className={'singing-progress-team' + (team.id === currentTurn.teamId ? ' is-active' : '')} key={team.id}>
                      <div><strong>{team.name}</strong><span>{completedRounds}/{ROUND_COUNT} รอบ</span></div>
                      <p>{performedThisRound ? 'ร้องแล้วรอบนี้' : 'รอร้องรอบนี้'}</p>
                    </div>
                  );
                })}
              </div>
              <p className="singing-progress-note">แต่ละทีมร้องหนึ่งครั้งในรอบนี้</p>
            </aside>
          </div>
        )}

        {phase === 'results' && (
          <section className="singing-results" aria-labelledby="singing-results-title" aria-live="polite">
            <span className="panel-step">ครบ {ROUND_COUNT} รอบแล้ว</span>
            <h2 id="singing-results-title">{winningTeams.length > 1 ? 'คะแนนเสมอกัน!' : 'ทีมเสียงทองประจำวง'}</h2>
            <p className="singing-winner-names">{winningTeams.map((team) => team.name).join(' · ')} ได้คะแนนเฉลี่ยสูงสุด {winningScore.toFixed(1)} / 100</p>

            <ol className="singing-results-list">
              {teamResults.map((team, index) => (
                <li className={'singing-result-team' + (team.averageScore === winningScore ? ' is-winner' : '')} key={team.id}>
                  <div className="singing-result-heading">
                    <span className="singing-result-rank">{index + 1}</span>
                    <div><h3>{team.name}</h3><p>{team.players.map((player) => player.name).join(' · ')}</p></div>
                    <strong>{team.averageScore.toFixed(1)}<small> / 100</small></strong>
                  </div>
                  <div className="singing-team-rounds">
                    {team.performances.map((performance) => (
                      <div className="singing-team-round" key={performance.round}>
                        <strong>รอบ {performance.round}</strong>
                        <span>{performance.score} คะแนน</span>
                        {performance.commentary && <p className="singing-funny-commentary">{performance.commentary}</p>}
                        {performance.audioUrl ? (
                          <details className="singing-result-recording">
                            <summary>ฟังคลิปของทีม</summary>
                            <audio controls preload="none" src={performance.audioUrl} aria-label={'เสียงร้องของ ' + team.name + ' รอบ ' + performance.round}>
                              เบราว์เซอร์นี้ไม่รองรับการเล่นเสียง
                            </audio>
                          </details>
                        ) : <small>ไม่มีคลิปเสียง</small>}
                      </div>
                    ))}
                  </div>
                </li>
              ))}
            </ol>

            <div className="singing-result-actions">
              <button className="button button--primary" type="button" onClick={returnToSetup}>ตั้งทีมใหม่</button>
              <button className="change-players-button" type="button" onClick={returnToSetup}>เปลี่ยนรายชื่อผู้เล่น</button>
            </div>
          </section>
        )}
      </div>
    </section>
  );
}

export default SingingScoreGame;
