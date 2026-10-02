function PlayerLossStatsPanel({ id, stats, onReset }) {
  return (
    <section className="player-loss-stats" aria-labelledby={`${id}-title`}>
      <div className="player-loss-stats-heading">
        <div>
          <span className="panel-step">สถิติแพ้ในเกมนี้</span>
          <h2 id={`${id}-title`}>จำนวนครั้งที่แพ้</h2>
        </div>
        <button
          className="player-loss-stats-reset"
          type="button"
          onClick={onReset}
          disabled={stats.length === 0}
        >
          รีเซ็ตสถิติ
        </button>
      </div>

      {stats.length > 0 ? (
        <ol className="player-loss-stats-list">
          {stats.map((entry) => (
            <li key={entry.key}>
              <span>{entry.name}</span>
              <strong>{entry.losses}<small>ครั้ง</small></strong>
            </li>
          ))}
        </ol>
      ) : (
        <p className="player-loss-stats-empty">ยังไม่มีสถิติ เริ่มเล่นเพื่อบันทึกผู้แพ้</p>
      )}

      <p className="player-loss-stats-note">บันทึกไว้ในเบราว์เซอร์นี้</p>
    </section>
  );
}

export default PlayerLossStatsPanel;
