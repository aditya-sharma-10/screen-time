import cors from 'cors'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  createKid,
  createSession,
  deleteKid,
  getActiveSession,
  getAllKids,
  getRecentSessions,
  getSettings,
  stopSession,
  updateSettings
} from './db.js'

const app = express()
const PORT = Number(globalThis.process?.env?.PORT) || 3001
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DIST_DIR = path.resolve(__dirname, '../dist')

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
      'schoolLimitMinutes',
      'breakLimitMinutes',
      'rewardMinutes',
      'penaltyMinutes',
      'schoolDays',
      'soundEnabled',
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
