const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const appDataDir = path.join(require('os').homedir(), '.optimizer-panel');
const dbPath = path.join(appDataDir, 'optimizer-panel.db');

if (!fs.existsSync(appDataDir)) {
  fs.mkdirSync(appDataDir, { recursive: true });
}

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    module TEXT,
    operation TEXT,
    involved TEXT,
    result TEXT,
    errorCode TEXT,
    durationMs INTEGER,
    releasedSpace INTEGER,
    metadata TEXT
  );

  CREATE TABLE IF NOT EXISTS metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    period TEXT,
    cpu REAL,
    ram REAL,
    gpu TEXT,
    disk REAL,
    network REAL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

function ensureDefaults() {
  db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES ('lastRun', 'never')`).run();
}

function recordLog({ module, operation, involved = null, result = 'success', errorCode = null, durationMs = 0, releasedSpace = 0, metadata = null }) {
  db.prepare(`
    INSERT INTO logs (timestamp, module, operation, involved, result, errorCode, durationMs, releasedSpace, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    new Date().toISOString(),
    module,
    operation,
    involved,
    result,
    errorCode,
    durationMs,
    releasedSpace,
    metadata ? JSON.stringify(metadata) : null,
  );
}

function listLogs(limit = 50) {
  return db.prepare(`SELECT * FROM logs ORDER BY id DESC LIMIT ?`).all(limit).map((row) => ({
    ...row,
    metadata: row.metadata ? JSON.parse(row.metadata) : null,
  }));
}

function insertMetric({ period = '30m', cpu = 0, ram = 0, gpu = 'N/A', disk = 0, network = 0 }) {
  db.prepare(`INSERT INTO metrics (timestamp, period, cpu, ram, gpu, disk, network) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(new Date().toISOString(), period, cpu, ram, gpu, disk, network);
}

function getMetricsHistory(period = '30m') {
  const rows = db.prepare(`SELECT * FROM metrics WHERE period = ? ORDER BY id DESC LIMIT 60`).all(period);
  return rows.reverse().map((row) => ({
    timestamp: row.timestamp,
    cpu: row.cpu,
    ram: row.ram,
    gpu: row.gpu,
    disk: row.disk,
    network: row.network,
  }));
}

function setSetting(key, value) {
  db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(key, value);
}

function getSetting(key) {
  const row = db.prepare(`SELECT value FROM settings WHERE key = ?`).get(key);
  return row ? row.value : null;
}

function getDb() {
  return db;
}

module.exports = {
  getDb,
  ensureDefaults,
  recordLog,
  listLogs,
  insertMetric,
  getMetricsHistory,
  setSetting,
  getSetting,
};
