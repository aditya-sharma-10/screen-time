import { useEffect, useMemo, useState } from 'react'
import './App.css'

const DEFAULT_KIDS = [
  { id: '1', name: 'Shaurya', pin: '1111' },
  { id: '2', name: 'Shivane', pin: '2222' }
]

const DEFAULT_SCHOOL_LIMIT = 120
const DEFAULT_BREAK_LIMIT = 180
const WARNING_MINUTES = 15
const DEFAULT_PARENT_PASSCODE = '1234'
const API_POLL_INTERVAL = 15000
const SOUND_FILES = {
  alert: ['/alert.mp3'],
  start: ['/start.mp3', '/alert.mp3'],
  stop: ['/stop.mp3', '/alert.mp3']
}

function PopupModal({ popup, onClose }) {
  if (!popup.show) return null

  return (
    <div className="popup-overlay">
      <div className={`popup-box ${popup.type}`}>
        <h2>{popup.title}</h2>
        <p>{popup.message}</p>
        <button onClick={onClose}>OK</button>
      </div>
    </div>
  )
}

function formatMinutes(minutes) {
  const safe = Math.max(0, Math.floor(minutes))
  const h = Math.floor(safe / 60)
  const m = safe % 60
  return `${h}h ${m}m`
}

function todayString() {
  return new Date().toISOString().slice(0, 10)
}

function formatTime(dateString) {
  return new Date(dateString).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit'
  })
}

function dateFromString(dateString) {
  return new Date(`${dateString}T12:00:00`)
}

function formatDateLabel(dateString) {
  return dateFromString(dateString).toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

function generateId(prefix = 'id') {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export default function App() {
  const [mode, setMode] = useState('kid')
  const [apiAvailable, setApiAvailable] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

  const [kids, setKids] = useState(() => {
    const saved = localStorage.getItem('screen-time-kids')
    return saved ? JSON.parse(saved) : DEFAULT_KIDS
  })

  const [sessions, setSessions] = useState(() => {
    const saved = localStorage.getItem('screen-time-sessions')
    return saved ? JSON.parse(saved) : []
  })

  const [schoolDays, setSchoolDays] = useState(() => {
    const saved = localStorage.getItem('screen-time-school-days')
    return saved ? JSON.parse(saved) : [1, 2, 3, 4, 5]
  })

  const [parentPasscode, setParentPasscode] = useState(() => {
    const saved = localStorage.getItem('screen-time-parent-passcode')
    return saved ? JSON.parse(saved) : DEFAULT_PARENT_PASSCODE
  })
const [schoolLimitMinutes, setSchoolLimitMinutes] = useState(() => {
  const saved = localStorage.getItem('screen-time-school-limit')
  return saved ? JSON.parse(saved) : DEFAULT_SCHOOL_LIMIT
})

const [popup, setPopup] = useState({
  show: false,
  type: '',
  title: '',
  message: ''
})

const [soundEnabled, setSoundEnabled] = useState(() => {
  const saved = localStorage.getItem('screen-time-sound-enabled')
  return saved ? JSON.parse(saved) : true
})

const [breakLimitMinutes, setBreakLimitMinutes] = useState(() => {
  const saved = localStorage.getItem('screen-time-break-limit')
  return saved ? JSON.parse(saved) : DEFAULT_BREAK_LIMIT
})
  const [enteredParentPasscode, setEnteredParentPasscode] = useState('')
  const [parentUnlocked, setParentUnlocked] = useState(false)

  const [selectedKidId, setSelectedKidId] = useState('')
  const [pin, setPin] = useState('')
  const [loggedInKid, setLoggedInKid] = useState(null)

  const [newKidName, setNewKidName] = useState('')
  const [newKidPin, setNewKidPin] = useState('')
  const [selectedDate, setSelectedDate] = useState(todayString())

  const [tick, setTick] = useState(Date.now())

  async function fetchJson(path, options = {}) {
    const response = await fetch(path, {
      headers: {
        'Content-Type': 'application/json'
      },
      ...options
    })

    if (!response.ok) {
      let message = 'Request failed.'

      try {
        const data = await response.json()
        if (data?.error) {
          message = data.error
        }
      } catch {
        // Ignore JSON parsing errors for empty or plain-text responses.
      }

      throw new Error(message)
    }

    if (response.status === 204) {
      return null
    }

    return response.json()
  }

  async function refreshBackendData(showOfflineError = false) {
    try {
      const [kidsData, sessionsData, settingsData] = await Promise.all([
        fetchJson('/api/kids'),
        fetchJson('/api/sessions?limit=1000'),
        fetchJson('/api/settings')
      ])

      setKids(kidsData)
      setSessions(sessionsData)
      setSchoolDays(settingsData.schoolDays ?? [1, 2, 3, 4, 5])
      setParentPasscode(settingsData.parentPasscode ?? DEFAULT_PARENT_PASSCODE)
      setSchoolLimitMinutes(settingsData.schoolLimitMinutes ?? DEFAULT_SCHOOL_LIMIT)
      setBreakLimitMinutes(settingsData.breakLimitMinutes ?? DEFAULT_BREAK_LIMIT)
      setSoundEnabled(settingsData.soundEnabled ?? true)
      setApiAvailable(true)
      return true
    } catch (error) {
      setApiAvailable(false)

      if (showOfflineError) {
        showInfoPopup(
          'Shared Backend Unavailable',
          'The shared backend is unavailable. The app is using local browser storage on this device.'
        )
      }

      return false
    } finally {
      setIsHydrated(true)
    }
  }

  useEffect(() => {
    refreshBackendData()
  }, [])

  useEffect(() => {
    localStorage.setItem('screen-time-kids', JSON.stringify(kids))
  }, [kids])

  useEffect(() => {
    localStorage.setItem('screen-time-sessions', JSON.stringify(sessions))
  }, [sessions])

  useEffect(() => {
    localStorage.setItem('screen-time-school-days', JSON.stringify(schoolDays))
  }, [schoolDays])

  useEffect(() => {
    localStorage.setItem('screen-time-parent-passcode', JSON.stringify(parentPasscode))
  }, [parentPasscode])

  useEffect(() => {
    const interval = setInterval(() => {
      setTick(Date.now())
    }, 30000)
    return () => clearInterval(interval)
  }, [])

useEffect(() => {
  localStorage.setItem('screen-time-school-limit', JSON.stringify(schoolLimitMinutes))
}, [schoolLimitMinutes])

useEffect(() => {
  localStorage.setItem('screen-time-break-limit', JSON.stringify(breakLimitMinutes))
}, [breakLimitMinutes])

useEffect(() => {
  localStorage.setItem('screen-time-sound-enabled', JSON.stringify(soundEnabled))
}, [soundEnabled])

  useEffect(() => {
    if (!apiAvailable) return undefined

    const interval = setInterval(() => {
      refreshBackendData()
    }, API_POLL_INTERVAL)

    return () => clearInterval(interval)
  }, [apiAvailable])

  useEffect(() => {
    if (!apiAvailable || !isHydrated) return

    fetchJson('/api/settings', {
      method: 'PUT',
      body: JSON.stringify({
        parentPasscode,
        schoolLimitMinutes,
        breakLimitMinutes,
        schoolDays,
        soundEnabled
      })
    }).catch(error => {
      console.error('Failed to sync settings:', error)
    })
  }, [
    apiAvailable,
    isHydrated,
    parentPasscode,
    schoolLimitMinutes,
    breakLimitMinutes,
    schoolDays,
    soundEnabled
  ])

  function getDayType(date = new Date()) {
    const day = date.getDay()
    return schoolDays.includes(day) ? 'school' : 'weekend'
  }

function getDailyLimit(date = new Date()) {
  return getDayType(date) === 'school'
    ? Number(schoolLimitMinutes)
    : Number(breakLimitMinutes)
}

  function getActiveSession(kidId) {
    return sessions.find(session => session.kidId === kidId && !session.endTime)
  }

  function getUsedMinutesToday(kidId) {
    return getUsedMinutesForDate(kidId, todayString())
  }

  function getUsedMinutesForDate(kidId, dateString) {
    const isToday = dateString === todayString()
    const now = new Date()

    return sessions
      .filter(session => session.kidId === kidId && session.date === dateString)
      .reduce((total, session) => {
        const start = new Date(session.startTime)
        const end = session.endTime
          ? new Date(session.endTime)
          : isToday
            ? now
            : start

        return total + Math.max(0, (end - start) / 60000)
      }, 0)
  }

  function getRemainingMinutes(kidId, date = new Date()) {
    return getDailyLimit(date) - getUsedMinutesToday(kidId)
  }

  function getRemainingMinutesForDate(kidId, dateString) {
    const date = dateFromString(dateString)
    return getDailyLimit(date) - getUsedMinutesForDate(kidId, dateString)
  }

  function playSound(kind = 'alert') {
    if (!soundEnabled) return

    const sources = SOUND_FILES[kind] ?? SOUND_FILES.alert

    const tryPlay = index => {
      const source = sources[index]
      if (!source) return

      const audio = new Audio(source)

      audio.addEventListener(
        'error',
        () => {
          tryPlay(index + 1)
        },
        { once: true }
      )

      audio.play().catch(error => {
        if (index < sources.length - 1) {
          tryPlay(index + 1)
          return
        }

        console.log(`Audio play was blocked by browser for ${kind}:`, error)
      })
    }

    tryPlay(0)
  }

function showPopup(type, title, message, options = {}) {
  const { sound = 'alert' } = options

  setPopup({
    show: true,
    type,
    title,
    message
  })

  if (sound) {
    playSound(sound)
  }
}

function showInfoPopup(title, message, options = {}) {
  showPopup('warning', title, message, options)
}

function closePopup() {
  setPopup({
    show: false,
    type: '',
    title: '',
    message: ''
  })
}

  async function stopActiveSessionForKid(kidId) {
    const activeSession = getActiveSession(kidId)
    if (!activeSession) return

    const stopTime = new Date().toISOString()

    if (apiAvailable) {
      try {
        await fetchJson(`/api/sessions/${activeSession.id}/stop`, {
          method: 'PATCH',
          body: JSON.stringify({ endTime: stopTime })
        })
        await refreshBackendData()
        return
      } catch (error) {
        console.error('Failed to stop shared session:', error)
      }
    }

    setSessions(prev =>
      prev.map(session =>
        session.kidId === kidId && !session.endTime
          ? { ...session, endTime: stopTime }
          : session
      )
    )
  }

  useEffect(() => {
    const activeSessions = sessions.filter(s => !s.endTime)

    activeSessions.forEach(session => {
      const kid = kids.find(k => k.id === session.kidId)
      if (!kid) return

      const remaining = getRemainingMinutes(kid.id)

      const warningKey = `warning-${kid.id}-${todayString()}`
      const finishedKey = `finished-${kid.id}-${todayString()}`

      if (remaining <= 0 && !sessionStorage.getItem(finishedKey)) {
        showPopup(
          'finished',
          'Time Is Up',
          `${kid.name} has reached the screen time limit.`
        )
        sessionStorage.setItem(finishedKey, 'shown')
        stopActiveSessionForKid(kid.id)
        return
      }

      if (remaining <= WARNING_MINUTES && !sessionStorage.getItem(warningKey)) {
        showPopup(
          'warning',
          'Almost Time Up',
          `${kid.name} has only ${formatMinutes(remaining)} left today.`
        )
        sessionStorage.setItem(warningKey, 'shown')
      }
    })
 }, [sessions, tick, kids, schoolDays, schoolLimitMinutes, breakLimitMinutes])

  function loginKid() {
    const kid = kids.find(k => k.id === selectedKidId && k.pin === pin)
    if (!kid) {
      showInfoPopup('Login Failed', 'Incorrect kid or PIN.')
      return
    }

    setLoggedInKid(kid)
    setPin('')
  }

  function logoutKid() {
    setLoggedInKid(null)
    setSelectedKidId('')
    setPin('')
  }

  function unlockParent() {
    if (enteredParentPasscode !== parentPasscode) {
      showInfoPopup('Access Denied', 'Incorrect parent passcode.')
      return
    }

    setParentUnlocked(true)
    setEnteredParentPasscode('')
  }

  function lockParent() {
    setParentUnlocked(false)
    setEnteredParentPasscode('')
  }

  async function startSession() {
    if (!loggedInKid) return

    if (getActiveSession(loggedInKid.id)) {
      showInfoPopup('Session Already Running', 'Screen time is already running for this kid.')
      return
    }

    const used = getUsedMinutesToday(loggedInKid.id)
    const limit = getDailyLimit()

    if (used >= limit) {
      showInfoPopup('Limit Reached', 'Today’s screen time limit is already finished.')
      return
    }

    const newSession = {
      id: generateId('session'),
      kidId: loggedInKid.id,
      startTime: new Date().toISOString(),
      endTime: null,
      date: todayString()
    }

    if (apiAvailable) {
      setSessions(prev => [...prev, newSession])

      try {
        await fetchJson('/api/sessions', {
          method: 'POST',
          body: JSON.stringify(newSession)
        })
        playSound('start')
        showInfoPopup('Session Started', `${loggedInKid.name}'s screen time session has started.`, {
          sound: false
        })
        await refreshBackendData()
        return
      } catch (error) {
        setSessions(prev => prev.filter(session => session.id !== newSession.id))
        showInfoPopup('Could Not Start Session', error.message)
        return
      }
    }

    setSessions(prev => [...prev, newSession])
    playSound('start')
    showInfoPopup('Session Started', `${loggedInKid.name}'s screen time session has started.`, {
      sound: false
    })
  }

  async function stopSession() {
    if (!loggedInKid) return

    const active = getActiveSession(loggedInKid.id)
    if (!active) {
      showInfoPopup('No Active Session', 'No active session found.')
      return
    }

    if (apiAvailable) {
      const stopTime = new Date().toISOString()

      setSessions(prev =>
        prev.map(session =>
          session.id === active.id
            ? { ...session, endTime: stopTime }
            : session
        )
      )

      try {
        await fetchJson(`/api/sessions/${active.id}/stop`, {
          method: 'PATCH',
          body: JSON.stringify({ endTime: stopTime })
        })
        playSound('stop')
        showInfoPopup('Session Stopped', `${loggedInKid.name}'s screen time session has stopped.`, {
          sound: false
        })
        await refreshBackendData()
        return
      } catch (error) {
        await refreshBackendData()
        showInfoPopup('Could Not Stop Session', error.message)
        return
      }
    }

    setSessions(prev =>
      prev.map(session =>
        session.id === active.id
          ? { ...session, endTime: new Date().toISOString() }
          : session
      )
    )
    playSound('stop')
    showInfoPopup('Session Stopped', `${loggedInKid.name}'s screen time session has stopped.`, {
      sound: false
    })
  }

  function toggleSchoolDay(dayNumber) {
    setSchoolDays(prev => {
      if (prev.includes(dayNumber)) {
        return prev.filter(day => day !== dayNumber).sort()
      }
      return [...prev, dayNumber].sort()
    })
  }

  async function addKid() {
    if (!newKidName.trim() || !newKidPin.trim()) {
      showInfoPopup('Missing Details', 'Enter kid name and PIN.')
      return
    }

    const newKid = {
      id: generateId('kid'),
      name: newKidName.trim(),
      pin: newKidPin.trim()
    }

    if (apiAvailable) {
      try {
        await fetchJson('/api/kids', {
          method: 'POST',
          body: JSON.stringify(newKid)
        })
        await refreshBackendData()
        setNewKidName('')
        setNewKidPin('')
        return
      } catch (error) {
        showInfoPopup('Could Not Add Kid', error.message)
        return
      }
    }

    setKids(prev => [...prev, newKid])
    setNewKidName('')
    setNewKidPin('')
  }

  async function deleteKid(kidId) {
    const active = getActiveSession(kidId)
    if (active) {
      showInfoPopup('Cannot Delete Kid', 'Stop the running session before deleting this kid.')
      return
    }

    if (apiAvailable) {
      try {
        await fetchJson(`/api/kids/${kidId}`, {
          method: 'DELETE'
        })
        await refreshBackendData()

        if (loggedInKid?.id === kidId) {
          logoutKid()
        }
        return
      } catch (error) {
        showInfoPopup('Could Not Delete Kid', error.message)
        return
      }
    }

    setKids(prev => prev.filter(kid => kid.id !== kidId))
    setSessions(prev => prev.filter(session => session.kidId !== kidId))

    if (loggedInKid?.id === kidId) {
      logoutKid()
    }
  }

  const dashboard = useMemo(() => {
    const limit = getDailyLimit()

    return kids.map(kid => {
      const used = getUsedMinutesToday(kid.id)
      const remaining = Math.max(0, limit - used)

      return {
        ...kid,
        used,
        remaining,
        active: !!getActiveSession(kid.id)
      }
    })
}, [kids, sessions, tick, schoolDays, schoolLimitMinutes, breakLimitMinutes])

  const selectedDateDashboard = useMemo(() => {
    const selectedDateObject = dateFromString(selectedDate)
    const limit = getDailyLimit(selectedDateObject)

    return kids.map(kid => {
      const used = getUsedMinutesForDate(kid.id, selectedDate)
      const remaining = Math.max(0, limit - used)
      const active = selectedDate === todayString() && !!getActiveSession(kid.id)

      return {
        ...kid,
        used,
        remaining,
        active
      }
    })
  }, [kids, selectedDate, sessions, tick, schoolDays, schoolLimitMinutes, breakLimitMinutes])

  const recentSessions = [...sessions]
    .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
    .slice(0, 10)
    .map(session => {
      const kid = kids.find(k => k.id === session.kidId)
      return {
        ...session,
        kidName: kid ? kid.name : 'Unknown'
      }
    })

  const selectedDateSessions = [...sessions]
    .filter(session => session.date === selectedDate)
    .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
    .map(session => {
      const kid = kids.find(k => k.id === session.kidId)
      return {
        ...session,
        kidName: kid ? kid.name : 'Unknown'
      }
    })

  const loggedInKidActiveSession = loggedInKid ? getActiveSession(loggedInKid.id) : null

  return (
    <div className="app">
      <h1>Kids Screen Time Tracker</h1>

    <p className="subtitle">
  {getDayType() === 'school'
    ? `School day limit: ${formatMinutes(schoolLimitMinutes)}`
    : `Break / non-school day limit: ${formatMinutes(breakLimitMinutes)}`}
</p>

      <p className={`sync-status ${apiAvailable ? 'online' : 'offline'}`}>
        {apiAvailable
          ? 'Shared mode is active. Devices on your network will see the same sessions and alerts while the app is open.'
          : 'Local-only mode. If the API is not running, alerts and data stay on this device only.'}
      </p>

      <div className="button-row">
        <button
          className={mode === 'kid' ? '' : 'secondary'}
          onClick={() => setMode('kid')}
        >
          Kid Login
        </button>

        <button
          className={mode === 'parent' ? '' : 'secondary'}
          onClick={() => setMode('parent')}
        >
          Parent View
        </button>
      </div>

      {mode === 'kid' && (
        <>
          {!loggedInKid ? (
            <div className="card">
              <h2>Kid Login</h2>

              <label>Select Kid</label>
              <select value={selectedKidId} onChange={e => setSelectedKidId(e.target.value)}>
                <option value="">Choose profile</option>
                {kids.map(kid => (
                  <option key={kid.id} value={kid.id}>
                    {kid.name}
                  </option>
                ))}
              </select>

              <label>PIN</label>
              <input
                type="password"
                value={pin}
                onChange={e => setPin(e.target.value)}
                placeholder="Enter PIN"
              />

              <button onClick={loginKid}>Login</button>
            </div>
          ) : (
            <div className="card">
              <h2>Welcome, {loggedInKid.name}</h2>
              <p>Used today: {formatMinutes(getUsedMinutesToday(loggedInKid.id))}</p>
              <p>Remaining today: {formatMinutes(Math.max(0, getRemainingMinutes(loggedInKid.id)))}</p>
              <p>Status: {loggedInKidActiveSession ? 'Running' : 'Idle'}</p>
              {loggedInKidActiveSession && (
                <p>Started at: {formatTime(loggedInKidActiveSession.startTime)}</p>
              )}

              <div className="button-row">
                <button onClick={startSession} disabled={!!loggedInKidActiveSession}>
                  {loggedInKidActiveSession ? 'Session Running' : 'Start Screen Time'}
                </button>
                <button onClick={stopSession} disabled={!loggedInKidActiveSession}>
                  Stop Screen Time
                </button>
                <button className="secondary" onClick={logoutKid}>Logout</button>
              </div>
            </div>
          )}
        </>
      )}

      {mode === 'parent' && (
        <>
          {!parentUnlocked ? (
            <div className="card">
              <h2>Parent Login</h2>

              <label>Parent Passcode</label>
              <input
                type="password"
                value={enteredParentPasscode}
                onChange={e => setEnteredParentPasscode(e.target.value)}
                placeholder="Enter parent passcode"
              />

              <button onClick={unlockParent}>Unlock</button>
            </div>
          ) : (
            <>
              <div className="card">
                <h2>Parent Dashboard</h2>
                <div className="button-row">
                  <button className="secondary" onClick={lockParent}>Lock Parent View</button>
                </div>

                <label>Change Parent Passcode</label>
                <input
                  type="text"
                  value={parentPasscode}
                  onChange={e => setParentPasscode(e.target.value)}
                />
                <label>School Day Limit (minutes)</label>
  <input
    type="number"
    min="0"
    value={schoolLimitMinutes}
    onChange={e => setSchoolLimitMinutes(Number(e.target.value))}
  />

  <label>Break / Non-School Day Limit (minutes)</label>
  <input
    type="number"
    min="0"
    value={breakLimitMinutes}
    onChange={e => setBreakLimitMinutes(Number(e.target.value))}
  />

  <p>Example: 120 = 2 hours, 180 = 3 hours, 240 = 4 hours</p>
              </div>

              <div className="card">
                <h2>School Days</h2>
              <p>Select which days should use the school-day limit. All other days will use the break / non-school-day limit.</p>

                <div className="button-row">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, index) => (
                    <button
                      key={label}
                      className={schoolDays.includes(index) ? '' : 'secondary'}
                      onClick={() => toggleSchoolDay(index)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="card">
                <h2>Add Kid</h2>

                <label>Kid Name</label>
                <input
                  type="text"
                  value={newKidName}
                  onChange={e => setNewKidName(e.target.value)}
                  placeholder="Enter kid name"
                />

                <label>Kid PIN</label>
                <input
                  type="text"
                  value={newKidPin}
                  onChange={e => setNewKidPin(e.target.value)}
                  placeholder="Enter kid PIN"
                />

                <button onClick={addKid}>Add Kid</button>
              </div>

              <div className="card">
                <h2>Manage Kids</h2>

                <div className="kids-grid">
                  {kids.map(kid => (
                    <div className="kid-box" key={kid.id}>
                      <h3>{kid.name}</h3>
                      <p>PIN: {kid.pin}</p>
                      <p>Used today: {formatMinutes(getUsedMinutesToday(kid.id))}</p>
                      <button className="secondary" onClick={() => deleteKid(kid.id)}>
                        Delete Kid
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}

      <div className="card">
        <h2>Today Dashboard</h2>
        <div className="kids-grid">
          {dashboard.map(kid => (
            <div className="kid-box" key={kid.id}>
              <h3>{kid.name}</h3>
              <p>Used: {formatMinutes(kid.used)}</p>
              <p>Remaining: {formatMinutes(kid.remaining)}</p>
              <p>Status: {kid.active ? 'Running' : 'Idle'}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Usage Calendar</h2>
        <p className="subtitle-text">
          Pick any date to review that day&apos;s screen usage and session history.
        </p>

        <label htmlFor="usage-date">Choose Date</label>
        <input
          id="usage-date"
          type="date"
          value={selectedDate}
          max={todayString()}
          onChange={e => setSelectedDate(e.target.value)}
        />

        <div className="date-summary">
          <p><strong>Date:</strong> {formatDateLabel(selectedDate)}</p>
          <p><strong>Day Type:</strong> {getDayType(dateFromString(selectedDate)) === 'school' ? 'School Day' : 'Break / Non-School Day'}</p>
          <p><strong>Limit:</strong> {formatMinutes(getDailyLimit(dateFromString(selectedDate)))}</p>
        </div>

        <div className="kids-grid">
          {selectedDateDashboard.map(kid => (
            <div className="kid-box" key={`${kid.id}-${selectedDate}`}>
              <h3>{kid.name}</h3>
              <p>Used: {formatMinutes(kid.used)}</p>
              <p>Remaining: {formatMinutes(kid.remaining)}</p>
              <p>Status: {kid.active ? 'Running' : 'Idle'}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Recent Sessions</h2>

        {recentSessions.length === 0 ? (
          <p>No screen time sessions yet.</p>
        ) : (
          <div className="kids-grid">
            {recentSessions.map(session => {
              const end = session.endTime ? new Date(session.endTime) : new Date()
              const duration = Math.max(0, (end - new Date(session.startTime)) / 60000)

              return (
                <div className="kid-box" key={session.id}>
                  <h3>{session.kidName}</h3>
                  <p>Start: {formatTime(session.startTime)}</p>
                  <p>End: {session.endTime ? formatTime(session.endTime) : 'Running'}</p>
                  <p>Duration: {formatMinutes(duration)}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Sessions For Selected Date</h2>

        {selectedDateSessions.length === 0 ? (
          <p>No sessions found for {formatDateLabel(selectedDate)}.</p>
        ) : (
          <div className="kids-grid">
            {selectedDateSessions.map(session => {
              const end = session.endTime ? new Date(session.endTime) : new Date(session.startTime)
              const duration = Math.max(0, (end - new Date(session.startTime)) / 60000)

              return (
                <div className="kid-box" key={`${session.id}-selected-date`}>
                  <h3>{session.kidName}</h3>
                  <p>Start: {formatTime(session.startTime)}</p>
                  <p>End: {session.endTime ? formatTime(session.endTime) : 'Running'}</p>
                  <p>Duration: {formatMinutes(duration)}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <PopupModal popup={popup} onClose={closePopup} />
      
    </div>
  )
}
