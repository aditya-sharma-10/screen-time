import cors from 'cors'
import express from 'express'
import { Buffer } from 'node:buffer'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  createNotificationLog,
  createKid,
  createSession,
  deleteKid,
  getActiveSession,
  getAllKids,
  getNotificationLog,
  getRecentSessions,
  getSettings,
  stopSession,
  updateSettings
} from './db.js'

function loadEnvFile() {
  const envPath = path.resolve(globalThis.process?.cwd?.() ?? '.', '.env')

  if (!existsSync(envPath)) {
    return
  }

  const envContent = readFileSync(envPath, 'utf8')

  for (const rawLine of envContent.split('\n')) {
    const line = rawLine.trim()

    if (!line || line.startsWith('#')) {
      continue
    }

    const separatorIndex = line.indexOf('=')
    if (separatorIndex === -1) {
      continue
    }

    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '')

    if (key && globalThis.process?.env && !(key in globalThis.process.env)) {
      globalThis.process.env[key] = value
    }
  }
}

loadEnvFile()

const app = express()
const PORT = Number(globalThis.process?.env?.PORT) || 3001
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DIST_DIR = path.resolve(__dirname, '../dist')
const TWILIO_ACCOUNT_SID = globalThis.process?.env?.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = globalThis.process?.env?.TWILIO_AUTH_TOKEN
const TWILIO_FROM_NUMBER = globalThis.process?.env?.TWILIO_FROM_NUMBER

app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/kids', async (_req, res, next) => {
  try {
    const kids = await getAllKids()
    res.json(kids)
  } catch (error) {
    next(error)
  }
})

app.post('/api/kids', async (req, res, next) => {
  try {
    const { id, name, pin } = req.body

    if (!id || !name?.trim() || !pin?.trim()) {
      return res.status(400).json({ error: 'id, name, and pin are required.' })
    }

    const kid = await createKid({
      id,
      name: name.trim(),
      pin: pin.trim()
    })

    res.status(201).json(kid)
  } catch (error) {
    next(error)
  }
})

app.delete('/api/kids/:kidId', async (req, res, next) => {
  try {
    const activeSession = await getActiveSession(req.params.kidId)

    if (activeSession) {
      return res.status(409).json({
        error: 'Stop the running session before deleting this kid.'
      })
    }

    const result = await deleteKid(req.params.kidId)

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Kid not found.' })
    }

    res.status(204).send()
  } catch (error) {
    next(error)
  }
})

app.get('/api/sessions', async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 50
    const sessions = await getRecentSessions(limit)
    res.json(sessions)
  } catch (error) {
    next(error)
  }
})

app.post('/api/sessions', async (req, res, next) => {
  try {
    const { id, kidId, startTime, date } = req.body

    if (!id || !kidId || !startTime || !date) {
      return res.status(400).json({
        error: 'id, kidId, startTime, and date are required.'
      })
    }

    const activeSession = await getActiveSession(kidId)
    if (activeSession) {
      return res.status(409).json({ error: 'A session is already running.' })
    }

    const session = await createSession({ id, kidId, startTime, date })
    res.status(201).json(session)
  } catch (error) {
    next(error)
  }
})

app.patch('/api/sessions/:sessionId/stop', async (req, res, next) => {
  try {
    const { endTime } = req.body

    if (!endTime) {
      return res.status(400).json({ error: 'endTime is required.' })
    }

    const session = await stopSession(req.params.sessionId, endTime)

    if (!session) {
      return res.status(404).json({ error: 'Session not found.' })
    }

    res.json(session)
  } catch (error) {
    next(error)
  }
})

app.get('/api/settings', async (_req, res, next) => {
  try {
    const settings = await getSettings()
    res.json(settings)
  } catch (error) {
    next(error)
  }
})

app.put('/api/settings', async (req, res, next) => {
  try {
    const allowedKeys = [
      'parentPasscode',
      'parentPhoneNumber',
      'schoolLimitMinutes',
      'breakLimitMinutes',
      'rewardMinutes',
      'penaltyMinutes',
      'schoolDays',
      'soundEnabled',
      'smsNotificationsEnabled',
      'kidPhoneNumbers',
      'timeAdjustments'
    ]

    const nextSettings = Object.fromEntries(
      Object.entries(req.body).filter(([key]) => allowedKeys.includes(key))
    )

    const settings = await updateSettings(nextSettings)
    res.json(settings)
  } catch (error) {
    next(error)
  }
})

async function sendSmsMessage(to, body) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    throw new Error('Twilio environment variables are not configured.')
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        To: to,
        From: TWILIO_FROM_NUMBER,
        Body: body
      })
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Twilio request failed: ${errorText}`)
  }
}

app.post('/api/notifications/screen-limit', async (req, res, next) => {
  try {
    const { kidId, type, date, remainingMinutes = 0, overtimeMinutes = 0 } = req.body

    if (!kidId || !type || !date) {
      return res.status(400).json({ error: 'kidId, type, and date are required.' })
    }

    const existingLog = await getNotificationLog(kidId, type, date)
    if (existingLog) {
      return res.status(200).json({ sent: false, deduped: true })
    }

    const settings = await getSettings()
    if (!settings.smsNotificationsEnabled) {
      return res.status(200).json({ sent: false, skipped: 'sms-disabled' })
    }

    const kids = await getAllKids()
    const kid = kids.find(item => item.id === kidId)

    if (!kid) {
      return res.status(404).json({ error: 'Kid not found.' })
    }

    const recipients = [
      settings.parentPhoneNumber,
      settings.kidPhoneNumbers?.[kidId]
    ].filter(Boolean)

    if (recipients.length === 0) {
      return res.status(200).json({ sent: false, skipped: 'no-recipients' })
    }

    const message =
      type === 'warning'
        ? `${kid.name} has ${Math.max(0, Math.floor(remainingMinutes))} minutes of screen time left today. Please wrap things up soon.`
        : `${kid.name} has reached the screen time limit. Overtime tracked so far: ${Math.max(0, Math.floor(overtimeMinutes))} minutes.`

    await Promise.all(recipients.map(number => sendSmsMessage(number, message)))
    await createNotificationLog({
      id: globalThis.crypto?.randomUUID?.() ?? `${kidId}-${type}-${date}`,
      kidId,
      notificationType: type,
      date
    })

    res.status(201).json({ sent: true })
  } catch (error) {
    next(error)
  }
})

app.use((error, _req, res) => {
  console.error(error)
  res.status(500).json({ error: 'Something went wrong on the server.' })
})

app.use(express.static(DIST_DIR))

app.get(/^(?!\/api\/).*$/, (req, res) => {
  return res.sendFile(path.join(DIST_DIR, 'index.html'))
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API server running on http://0.0.0.0:${PORT}`)
})
