import { useEffect, useRef, useState } from 'react';

const YOUTUBE_PLAYER_SIZE = 200;
const YOUTUBE_API_SOURCES = [
  'https://www.youtube.com/iframe_api',
  'https://www.youtube-nocookie.com/s/player/22cb88bc/www-widgetapi.vflset/www-widgetapi.js',
];

function shuffle(items) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function createRandomDeck(videoIds, previousVideoId = null) {
  const deck = shuffle(videoIds.map((videoId) => ({ videoId })));
  const lastIndex = deck.length - 1;

  if (lastIndex > 0 && deck[lastIndex].videoId === previousVideoId) {
    const swapIndex = Math.floor(Math.random() * lastIndex);
    [deck[swapIndex], deck[lastIndex]] = [deck[lastIndex], deck[swapIndex]];
  }

  return deck;
}

function getPlaylistId(value) {
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase();
    const isYouTubeHost = host === 'youtube.com' || host === 'youtu.be' || host.endsWith('.youtube.com');
    const playlistId = url.searchParams.get('list')?.trim();

    if (url.protocol !== 'https:' || !isYouTubeHost || !playlistId) return null;
    return playlistId;
  } catch {
    return null;
  }
}

function loadYouTubeApiScript(scriptUrl) {
  return new Promise((resolve, reject) => {
    document.querySelector(`script[src="${scriptUrl}"]`)?.remove();
    const previousReadyCallback = window.onYouTubeIframeAPIReady;
    const script = document.createElement('script');
    let timeoutId = null;
    let isSettled = false;

    const finish = (error) => {
      if (isSettled) return;
      isSettled = true;
      window.clearTimeout(timeoutId);
      script.removeEventListener('error', fail);
      if (window.onYouTubeIframeAPIReady === ready) {
        window.onYouTubeIframeAPIReady = previousReadyCallback;
      }
      if (error) {
        script.remove();
        reject(error);
      } else {
        resolve(window.YT);
      }
    };

    const fail = () => finish(new Error(`YouTube API script did not load: ${scriptUrl}`));
    const ready = () => {
      try {
        previousReadyCallback?.call(window);
      } finally {
        finish(window.YT?.Player ? null : new Error('YouTube player is unavailable'));
      }
    };

    window.onYouTubeIframeAPIReady = ready;
    script.src = scriptUrl;
    script.async = true;
    script.addEventListener('error', fail, { once: true });
    timeoutId = window.setTimeout(fail, 8000);
    document.head.appendChild(script);
  });
}

function loadYouTubeIframeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (window.__partyGameYouTubeApiPromise) return window.__partyGameYouTubeApiPromise;

  const promise = (async () => {
    for (const scriptUrl of YOUTUBE_API_SOURCES) {
      try {
        return await loadYouTubeApiScript(scriptUrl);
      } catch {
        // Try the next official YouTube host when this one is unreachable.
      }
    }
    throw new Error('YouTube player did not load');
  })();

  window.__partyGameYouTubeApiPromise = promise.catch((error) => {
    window.__partyGameYouTubeApiPromise = null;
    throw error;
  });
  return window.__partyGameYouTubeApiPromise;
}

function getPlayerErrorMessage(code) {
  if (code === 2) return 'ลิงก์หรือ playlist นี้ไม่ถูกต้อง';
  if (code === 5) return 'เบราว์เซอร์เล่นวิดีโอนี้ไม่ได้';
  if (code === 100) return 'หาเพลงไม่พบ หรือ playlist ถูกตั้งเป็นส่วนตัว';
  if (code === 101 || code === 150) return 'เพลงนี้ไม่อนุญาตให้เล่นผ่าน player ที่ฝังในเว็บ';
  if (code === 153) return 'YouTube ตรวจสอบแหล่งที่มาของ player ไม่ได้ ลองเปิดเว็บจากลิงก์หลักอีกครั้ง';
  return 'เชื่อมต่อ YouTube ไม่สำเร็จ ลองใช้ playlist อื่น';
}

function getSelectedVideoTitle(player, selectedVideoId) {
  const videoData = player.getVideoData?.();
  return videoData?.video_id === selectedVideoId ? videoData.title ?? '' : '';
}

function YouTubeSongGuessGame() {
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [playlistId, setPlaylistId] = useState('');
  const [connectAttempt, setConnectAttempt] = useState(0);
  const [playlistCount, setPlaylistCount] = useState(0);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isPlayerMostlyVisible, setIsPlayerMostlyVisible] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState('');
  const [currentTitle, setCurrentTitle] = useState('');
  const [drawCount, setDrawCount] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  const playerContainerRef = useRef(null);
  const playerRef = useRef(null);
  const playlistVideoIdsRef = useRef([]);
  const deckRef = useRef([]);
  const previousVideoIdRef = useRef(null);
  const currentSelectionRef = useRef(null);
  const progressTimerRef = useRef(null);
  const clipStartRef = useRef(0);
  const isRevealedRef = useRef(false);
  const hasInitializedPlaylistRef = useRef(false);

  const stopProgressTimer = () => {
    if (progressTimerRef.current) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };

  const setErrorMessage = (nextMessage) => {
    setMessage(nextMessage);
    setMessageType('error');
  };

  const startProgressTimer = (player) => {
    stopProgressTimer();
    const startedAt = player.getCurrentTime() || 0;
    clipStartRef.current = startedAt;

    progressTimerRef.current = window.setInterval(() => {
      const currentTime = player.getCurrentTime() || startedAt;
      setElapsedSeconds(Math.max(0, currentTime - startedAt));
    }, 250);
  };

  useEffect(() => {
    if (!playlistId) return undefined;

    let isCancelled = false;
    setIsConnecting(true);
    setIsPlayerReady(false);
    setIsAudioPlaying(false);
    setMessage('กำลังเชื่อมต่อ playlist และสุ่มลำดับเพลง…');
    setMessageType('info');
    hasInitializedPlaylistRef.current = false;
    playlistVideoIdsRef.current = [];
    deckRef.current = [];
    previousVideoIdRef.current = null;
    currentSelectionRef.current = null;
    setCurrentVideoId('');
    setCurrentTitle('');
    setElapsedSeconds(0);
    setDrawCount(0);
    setIsRevealed(false);

    loadYouTubeIframeApi()
      .then((youtube) => {
        if (isCancelled || !playerContainerRef.current) return;

        const mount = document.createElement('div');
        playerContainerRef.current.replaceChildren(mount);
        const player = new youtube.Player(mount, {
          width: YOUTUBE_PLAYER_SIZE,
          height: YOUTUBE_PLAYER_SIZE,
          host: 'https://www.youtube-nocookie.com',
          playerVars: {
            controls: 0,
            disablekb: 1,
            playsinline: 1,
            origin: window.location.origin,
            rel: 0,
          },
          events: {
            onReady: ({ target }) => {
              if (isCancelled) {
                target.destroy();
                return;
              }

              playerRef.current = target;
              target.cuePlaylist({ listType: 'playlist', list: playlistId, index: 0 });
            },
            onStateChange: ({ data, target }) => {
              if (isCancelled) return;

              if (data === youtube.PlayerState.CUED && !hasInitializedPlaylistRef.current) {
                hasInitializedPlaylistRef.current = true;
                target.setShuffle(true);
                target.setLoop(false);
                const videoIds = target.getPlaylist() ?? [];
                playlistVideoIdsRef.current = videoIds;
                deckRef.current = createRandomDeck(videoIds);
                setPlaylistCount(videoIds.length);
                setIsConnecting(false);
                setIsPlayerReady(videoIds.length > 0);

                if (videoIds.length > 0) {
                  setMessage(`เชื่อม playlist แล้ว ${videoIds.length} เพลง กดเริ่มเกมเพื่อสุ่มเพลงแรก`);
                  setMessageType('success');
                } else {
                  setErrorMessage('playlist นี้ไม่มีเพลงที่เปิดเล่นได้');
                }
                return;
              }

              if (data === youtube.PlayerState.PLAYING) {
                setIsAudioPlaying(true);
                setIsRevealed(false);
                setCurrentTitle(getSelectedVideoTitle(target, currentSelectionRef.current?.videoId));
                startProgressTimer(target);
                return;
              }

              if (data === youtube.PlayerState.ENDED && !isRevealedRef.current) {
                target.seekTo(0, true);
                target.playVideo();
                return;
              }

              if (data === youtube.PlayerState.PAUSED || data === youtube.PlayerState.ENDED) {
                const currentTime = target.getCurrentTime() || 0;
                const startedAt = clipStartRef.current;
                setElapsedSeconds(Math.max(0, currentTime - startedAt));
                setIsAudioPlaying(false);
                stopProgressTimer();
              }
            },
            onError: ({ data }) => {
              if (isCancelled) return;
              setIsConnecting(false);
              setIsPlayerReady(false);
              setIsAudioPlaying(false);
              stopProgressTimer();
              setErrorMessage(getPlayerErrorMessage(data));
            },
          },
        });

        playerRef.current = player;
      })
      .catch(() => {
        if (isCancelled) return;
        setIsConnecting(false);
        setIsPlayerReady(false);
        setErrorMessage('โหลด YouTube player ไม่สำเร็จ ตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง');
      });

    return () => {
      isCancelled = true;
      stopProgressTimer();
      playerRef.current?.destroy();
      playerRef.current = null;
      playerContainerRef.current?.replaceChildren();
    };
  }, [playlistId, connectAttempt]);

  const getPlayerElement = () => {
    const iframe = playerRef.current?.getIframe?.();
    if (iframe?.isConnected) return iframe;
    return playerContainerRef.current?.isConnected ? playerContainerRef.current : null;
  };

  const isPlayerInView = () => {
    const playerElement = getPlayerElement();
    if (!playerElement) return false;

    const bounds = playerElement.getBoundingClientRect();
    const visibleWidth = Math.max(0, Math.min(bounds.right, window.innerWidth) - Math.max(bounds.left, 0));
    const visibleHeight = Math.max(0, Math.min(bounds.bottom, window.innerHeight) - Math.max(bounds.top, 0));

    return bounds.width > 0
      && bounds.height > 0
      && (visibleWidth * visibleHeight) / (bounds.width * bounds.height) > 0.5;
  };

  const canStartPlayback = () => {
    const isVisible = isPlayerInView();
    setIsPlayerMostlyVisible(isVisible);

    if (!isVisible) {
      setErrorMessage('เลื่อนหน้าจอให้เห็น YouTube player มากกว่าครึ่งก่อนเริ่มเล่นเพลง');
    }

    return isVisible;
  };

  useEffect(() => {
    const playerElement = getPlayerElement();

    if (!playlistId || !isPlayerReady || !playerElement) {
      setIsPlayerMostlyVisible(false);
      return undefined;
    }

    const updateVisibility = () => setIsPlayerMostlyVisible(isPlayerInView());

    if (typeof IntersectionObserver === 'undefined') {
      updateVisibility();
      return undefined;
    }

    const observer = new IntersectionObserver(updateVisibility, { threshold: [0, 0.5, 1] });

    observer.observe(playerElement);
    updateVisibility();
    return () => observer.disconnect();
  }, [playlistId, isPlayerReady]);

  useEffect(() => () => stopProgressTimer(), []);

  const handlePlaylistSubmit = (event) => {
    event.preventDefault();
    const nextPlaylistId = getPlaylistId(playlistUrl);

    if (!nextPlaylistId) {
      stopProgressTimer();
      if (isPlayerReady) playerRef.current?.stopVideo();
      setPlaylistId('');
      setIsPlayerReady(false);
      setIsConnecting(false);
      setIsGameStarted(false);
      setErrorMessage('วางลิงก์ YouTube playlist หรือ YouTube Music playlist ที่มีคำว่า list= ในลิงก์');
      return;
    }

    stopProgressTimer();
    setPlaylistId(nextPlaylistId);
    setConnectAttempt((attempt) => attempt + 1);
    setIsGameStarted(false);
    setIsPlayerReady(false);
    setIsAudioPlaying(false);
    setMessage('กำลังเชื่อมต่อ playlist…');
    setMessageType('info');
  };

  const selectNextTrack = (player) => {
    if (deckRef.current.length === 0) {
      deckRef.current = createRandomDeck(playlistVideoIdsRef.current, previousVideoIdRef.current);
    }

    const nextTrack = deckRef.current.pop();
    if (!nextTrack) return false;

    previousVideoIdRef.current = nextTrack.videoId;
    currentSelectionRef.current = nextTrack;
    setCurrentVideoId(nextTrack.videoId);
    setCurrentTitle('');
    setDrawCount((count) => count + 1);
    setElapsedSeconds(0);
    setIsRevealed(false);
    isRevealedRef.current = false;
    setMessage('');
    clipStartRef.current = 0;
    player.loadVideoById({
      videoId: nextTrack.videoId,
      startSeconds: 0,
    });
    return true;
  };

  const startGame = () => {
    const player = playerRef.current;
    if (!player || !isPlayerReady) return;
    if (!canStartPlayback()) return;

    setIsGameStarted(true);
    selectNextTrack(player);
  };

  const replaySong = () => {
    const player = playerRef.current;
    const selection = currentSelectionRef.current;
    if (!player || !selection) return;
    if (!canStartPlayback()) return;

    setElapsedSeconds(0);
    setIsRevealed(false);
    isRevealedRef.current = false;
    setMessage('');
    clipStartRef.current = 0;
    player.loadVideoById({
      videoId: selection.videoId,
      startSeconds: 0,
    });
  };

  const revealAnswer = () => {
    isRevealedRef.current = true;
    const player = playerRef.current;
    if (player) {
      const currentTime = player.getCurrentTime() || 0;
      const startedAt = clipStartRef.current;
      setElapsedSeconds(Math.max(0, currentTime - startedAt));
      player.pauseVideo();
    }

    stopProgressTimer();
    setIsAudioPlaying(false);
    setIsRevealed(true);
    if (player) {
      const selectedTitle = getSelectedVideoTitle(player, currentSelectionRef.current?.videoId);
      if (selectedTitle) setCurrentTitle(selectedTitle);
    }
  };

  const drawNextTrack = () => {
    const player = playerRef.current;
    if (!player) return;
    if (!canStartPlayback()) return;

    stopProgressTimer();
    setIsAudioPlaying(false);
    selectNextTrack(player);
  };

  const returnToSetup = () => {
    playerRef.current?.stopVideo();
    stopProgressTimer();
    setIsAudioPlaying(false);
    setIsGameStarted(false);
    setIsRevealed(false);
  };

  return (
    <section className="guess-game-shell song-guess-shell" aria-labelledby="song-guess-title">
      <div className="guess-game-container">
        <header className="guess-game-heading">
          <span className="section-kicker">เกมที่ 09 · เกมปาร์ตี้</span>
          <h1 id="song-guess-title">ทายเพลงให้ทัน</h1>
          <p>สุ่มเพลงจาก YouTube playlist แล้วทายชื่อเพลงก่อนเฉลย</p>
        </header>

        {!isGameStarted ? (
          <section className="song-guess-panel song-guess-setup" aria-label="ตั้งค่าเกมทายชื่อเพลง">
            <div className="song-guess-record" aria-hidden="true">
              <span className="song-guess-record-label">♪</span>
            </div>
            <div className="song-guess-setup-copy">
              <h2>ใส่ลิงก์ playlist เพลงไทย</h2>
              <p>ใช้ playlist สาธารณะจาก YouTube หรือ YouTube Music ระบบจะสุ่มเพลงโดยไม่ซ้ำจนกว่าจะครบรายการ</p>
            </div>

            <form className="song-guess-playlist-form" onSubmit={handlePlaylistSubmit}>
              <label className="song-guess-playlist-label" htmlFor="song-guess-playlist-url">ลิงก์ YouTube playlist</label>
              <div className="song-guess-playlist-row">
                <input
                  id="song-guess-playlist-url"
                  className="song-guess-playlist-input"
                  type="url"
                  inputMode="url"
                  autoComplete="url"
                  placeholder="https://youtube.com/playlist?list=…"
                  value={playlistUrl}
                  onChange={(event) => setPlaylistUrl(event.target.value)}
                  aria-describedby="song-guess-playlist-help"
                />
                <button className="button song-guess-secondary-button song-guess-connect-button" type="submit">
                  เชื่อม playlist
                </button>
              </div>
              <span id="song-guess-playlist-help" className="song-guess-playlist-help">ต้องเป็น playlist ที่เปิดให้เล่นและฝังในเว็บไซต์ได้</span>
            </form>

            {message && <p className={`song-guess-message song-guess-message--${messageType}`} role="status">{message}</p>}

            <p className="song-guess-privacy-note">เสียงเล่นผ่าน YouTube โดยตรง และ player จะแสดงชื่อหรือข้อมูลเพลงตามรูปแบบของ YouTube</p>
          </section>
        ) : (
          <section className="song-guess-panel song-guess-play-panel" aria-label="เกมทายชื่อเพลง">
            <div className="song-guess-round-line">
              <span>เพลงที่ {drawCount}</span>
              <span>สุ่มไม่ซ้ำจนครบ {playlistCount} เพลง</span>
            </div>

            <div className={`song-guess-stage${isAudioPlaying ? ' is-playing' : ''}${isRevealed ? ' is-revealed' : ''}`} aria-live="polite">
              <div className="song-guess-record song-guess-record--stage" aria-hidden="true">
                <span className="song-guess-record-label">♪</span>
              </div>
              <div className="song-guess-wave" aria-hidden="true">
                {Array.from({ length: 25 }, (_, index) => (
                  <i key={index} style={{ '--bar-index': index, '--bar-height': `${14 + ((index * 17 + 11) % 29)}px` }} />
                ))}
              </div>
              {isRevealed ? (
                <div className="song-guess-answer">
                  <span>เฉลยเพลง</span>
                  <h2>{currentTitle || `รอโหลดชื่อเพลง (${currentVideoId})`}</h2>
                </div>
              ) : (
                <div className="song-guess-hidden-answer">
                  <span>กำลังเล่นเพลงจาก YouTube</span>
                  <strong>{isAudioPlaying ? 'ฟังให้ดี แล้วรีบทาย' : 'พร้อมฟังหรือยัง?'}</strong>
                </div>
              )}
            </div>

            <div className="song-guess-timer" aria-label={`เล่นเพลงมาแล้ว ${Math.floor(elapsedSeconds)} วินาที`}>
              <span>เล่นเพลงมาแล้ว {Math.floor(elapsedSeconds)} วิ · หยุดเมื่อกดเฉลย</span>
            </div>

            {message && <p className={`song-guess-message song-guess-message--${messageType}`} role="status">{message}</p>}

            <div className="song-guess-actions">
              {!isAudioPlaying && !isRevealed && (
                <button
                  className="button button--primary song-guess-play-button"
                  type="button"
                  onClick={replaySong}
                  disabled={!isPlayerMostlyVisible}
                >
                  ฟังเพลงอีกครั้ง <span aria-hidden="true">▶</span>
                </button>
              )}
              {!isRevealed ? (
                <button className="button song-guess-secondary-button" type="button" onClick={revealAnswer}>
                  เฉลยเพลง
                </button>
              ) : (
                <button
                  className="button button--primary song-guess-next-button"
                  type="button"
                  onClick={drawNextTrack}
                  disabled={!isPlayerMostlyVisible}
                >
                  เพลงถัดไป <span aria-hidden="true">→</span>
                </button>
              )}
            </div>
            <div className="song-guess-actions">
              <button className="button song-guess-secondary-button" type="button" onClick={returnToSetup}>เปลี่ยน playlist</button>
            </div>
            <p className="song-guess-privacy-note">เล่นเพลงตั้งแต่ต้นจนกดเฉลย · เพลงถูกสุ่มแบบไม่ซ้ำจนกว่าจะครบ playlist</p>
          </section>
        )}

        {playlistId && (
          <section className="song-guess-youtube-shell" aria-label="เครื่องเล่น YouTube">
            <p className="song-guess-youtube-label">♫ โหมดเพลง · YouTube</p>
            <div className="song-guess-youtube-layout">
              <div className="song-guess-youtube-viewport" ref={playerContainerRef} />
              <div className="song-guess-youtube-controls">
                <p className="song-guess-youtube-status" role="status" aria-live="polite">
                  {isConnecting
                    ? 'กำลังโหลด playlist…'
                    : isPlayerReady && isPlayerMostlyVisible
                      ? 'พร้อมเล่น · player อยู่ในจอแล้ว'
                      : isPlayerReady
                        ? 'เลื่อนให้เห็น player มากกว่าครึ่งก่อนเล่นเพลง'
                        : 'player จะแสดงข้อความผิดพลาดหากเพลงเล่นไม่ได้'}
                </p>
                {!isGameStarted && (
                  <button
                    className="button button--primary song-guess-start-button"
                    type="button"
                    onClick={startGame}
                    disabled={!isPlayerReady || !isPlayerMostlyVisible}
                  >
                    เริ่มเกม · สุ่มเพลง <span aria-hidden="true">▶</span>
                  </button>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </section>
  );
}

export default YouTubeSongGuessGame;
