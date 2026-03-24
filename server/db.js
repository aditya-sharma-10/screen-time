import fs from 'node:fs/promises'
import path from 'node:path'
import { open } from 'sqlite'
import sqlite3 from 'sqlite3'

const DATA_DIR = path.resolve('data')
const DB_PATH = path.join(DATA_DIR, 'screen-time.db')

const DEFAULT_KIDS = [
  { id: '1', name: 'Shaurya', pin: '1111' },
  { id: '2', name: 'Shivane', pin: '2222' }
]

const DEFAULT_SETTINGS = {
  parentPasscode: '1234',
  parentPhoneNumber: '',
  schoolLimitMinutes: 120,
  breakLimitMinutes: 180,
  rewardMinutes: 10,
  penaltyMinutes: 5,
  schoolDays: [1, 2, 3, 4, 5],
  soundEnabled: true,
  smsNotificationsEnabled: false,
  kidPhoneNumbers: {},
  timeAdjustments: []
}

let databasePromise

function normalizeSettingValue(value) {
  if (Array.isArray(value) || typeof value === 'object') {
    return JSON.stringify(value)
  }

  return String(value)
}

function parseSettingValue(key, value) {
  if (key === 'schoolDays' || key === 'timeAdjustments' || key === 'kidPhoneNumbers') {
    return JSON.parse(value)
  }

  if (
    key === 'schoolLimitMinutes' ||
    key === 'breakLimitMinutes' ||
    key === 'rewardMinutes' ||
    key === 'penaltyMinutes'
  ) {
    return Number(value)
  }

  if (key === 'soundEnabled' || key === 'smsNotificationsEnabled') {
    return value === 'true'
  }

  return value
}

async function seedDefaults(db) {
  const kidsCount = await db.get('SELECT COUNT(*) AS count FROM kids')

  if (kidsCount.count === 0) {
    for (const kid of DEFAULT_KIDS) {
      await db.run(
        'INSERT INTO kids (id, name, pin, created_at) VALUES (?, ?, ?, ?)',
        [kid.id, kid.name, kid.pin, new Date().toISOString()]
      )
    }
  }

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await db.run(
      `
        INSERT INTO settings (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO NOTHING
      `,
      [key, normalizeSettingValue(value)]
    )
  }
}

async function createDatabase() {
  await fs.mkdir(DATA_DIR, { recursive: true })

  const db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  })

  await db.exec('PRAGMA foreign_keys = ON')

  await db.exec(`
    CREATE TABLE IF NOT EXISTS kids (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      pin TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      kid_id TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (kid_id) REFERENCES kids(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notification_logs (
      id TEXT PRIMARY KEY,
      kid_id TEXT NOT NULL,
      notification_type TEXT NOT NULL,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(kid_id, notification_type, date)
    );
  `)

  await seedDefaults(db)
  return db
}

export async function getDb() {
  if (!databasePromise) {
    databasePromise = createDatabase()
  }

  return databasePromise
}

export async function getAllKids() {
  const db = await getDb()
  return db.all('SELECT id, name, pin, created_at AS createdAt FROM kids ORDER BY name COLLATE NOCASE')
}

export async function createKid({ id, name, pin }) {
  const db = await getDb()
  const createdAt = new Date().toISOString()

  await db.run(
    'INSERT INTO kids (id, name, pin, created_at) VALUES (?, ?, ?, ?)',
    [id, name, pin, createdAt]
  )

  return { id, name, pin, createdAt }
}

export async function deleteKid(kidId) {
  const db = await getDb()
  return db.run('DELETE FROM kids WHERE id = ?', [kidId])
}

export async function getActiveSession(kidId) {
  const db = await getDb()
  return db.get(
    `
      SELECT
        id,
        kid_id AS kidId,
        start_time AS startTime,
        end_time AS endTime,
        date
      FROM sessions
      WHERE kid_id = ? AND end_time IS NULL
      LIMIT 1
    `,
    [kidId]
  )
}

export async function getRecentSessions(limit = 50) {
  const db = await getDb()
  return db.all(
    `
      SELECT
        sessions.id,
        sessions.kid_id AS kidId,
        kids.name AS kidName,
        sessions.start_time AS startTime,
        sessions.end_time AS endTime,
        sessions.date
      FROM sessions
      JOIN kids ON kids.id = sessions.kid_id
      ORDER BY sessions.start_time DESC
      LIMIT ?
    `,
    [limit]
  )
}

export async function createSession({ id, kidId, startTime, date }) {
  const db = await getDb()
  const createdAt = new Date().toISOString()

  await db.run(
    `
      INSERT INTO sessions (id, kid_id, start_time, end_time, date, created_at)
      VALUES (?, ?, ?, NULL, ?, ?)
    `,
    [id, kidId, startTime, date, createdAt]
  )

  return { id, kidId, startTime, endTime: null, date }
}

export async function stopSession(sessionId, endTime) {
  const db = await getDb()

  await db.run(
    'UPDATE sessions SET end_time = ? WHERE id = ? AND end_time IS NULL',
    [endTime, sessionId]
  )

  return db.get(
    `
      SELECT
        id,
        kid_id AS kidId,
        start_time AS startTime,
        end_time AS endTime,
        date
      FROM sessions
      WHERE id = ?
    `,
    [sessionId]
  )
}

export async function getSettings() {
  const db = await getDb()
  const rows = await db.all('SELECT key, value FROM settings')

  return rows.reduce((settings, row) => {
    settings[row.key] = parseSettingValue(row.key, row.value)
    return settings
  }, {})
}

export async function updateSettings(nextSettings) {
  const db = await getDb()

  for (const [key, value] of Object.entries(nextSettings)) {
    await db.run(
      `
        INSERT INTO settings (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `,
      [key, normalizeSettingValue(value)]
    )
  }

  return getSettings()
}

export async function getNotificationLog(kidId, notificationType, date) {
  const db = await getDb()
  return db.get(
    `
      SELECT id, kid_id AS kidId, notification_type AS notificationType, date
      FROM notification_logs
      WHERE kid_id = ? AND notification_type = ? AND date = ?
      LIMIT 1
    `,
    [kidId, notificationType, date]
  )
}

export async function createNotificationLog({ id, kidId, notificationType, date }) {
  const db = await getDb()
  const createdAt = new Date().toISOString()

  await db.run(
    `
      INSERT OR IGNORE INTO notification_logs (id, kid_id, notification_type, date, created_at)
      VALUES (?, ?, ?, ?, ?)
    `,
    [id, kidId, notificationType, date, createdAt]
  )
}
