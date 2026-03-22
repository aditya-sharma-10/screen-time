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

export default function App() {
  const [mode, setMode] = useState('kid')

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

const [soundEnabled, setSoundEnabled] = useState(true)

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

  const [tick, setTick] = useState(Date.now())

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
    const today = todayString()
    const now = new Date()

    return sessions
      .filter(session => session.kidId === kidId && session.date === today)
      .reduce((total, session) => {
        const start = new Date(session.startTime)
        const end = session.endTime ? new Date(session.endTime) : now
        return total + Math.max(0, (end - start) / 60000)
      }, 0)
  }

  function getRemainingMinutes(kidId, date = new Date()) {
    return getDailyLimit(date) - getUsedMinutesToday(kidId)
  }

  function playAlertSound() {
  if (!soundEnabled) return

  const audio = new Audio('/alert.mp3')
  audio.play().catch(error => {
    console.log('Audio play was blocked by browser:', error)
  })
}

function showPopup(type, title, message) {
  setPopup({
    show: true,
    type,
    title,
    message
  })

  playAlertSound()
}

function closePopup() {
  setPopup({
    show: false,
    type: '',
    title: '',
    message: ''
  })
}

  function stopActiveSessionForKid(kidId) {
    const stopTime = new Date().toISOString()

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
      alert('Incorrect kid or PIN')
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
      alert('Incorrect parent passcode')
      return
    }

    setParentUnlocked(true)
    setEnteredParentPasscode('')
  }

  function lockParent() {
    setParentUnlocked(false)
    setEnteredParentPasscode('')
  }

  function startSession() {
    if (!loggedInKid) return

    if (getActiveSession(loggedInKid.id)) {
      alert('Session is already running.')
      return
    }

    const used = getUsedMinutesToday(loggedInKid.id)
    const limit = getDailyLimit()

    if (used >= limit) {
      alert('Today’s limit is already finished.')
      return
    }

    const newSession = {
      id: crypto.randomUUID(),
      kidId: loggedInKid.id,
      startTime: new Date().toISOString(),
      endTime: null,
      date: todayString()
    }

    setSessions(prev => [...prev, newSession])
  }

  function stopSession() {
    if (!loggedInKid) return

    const active = getActiveSession(loggedInKid.id)
    if (!active) {
      alert('No active session found.')
      return
    }

    setSessions(prev =>
      prev.map(session =>
        session.id === active.id
          ? { ...session, endTime: new Date().toISOString() }
          : session
      )
    )
  }

  function toggleSchoolDay(dayNumber) {
    setSchoolDays(prev => {
      if (prev.includes(dayNumber)) {
        return prev.filter(day => day !== dayNumber).sort()
      }
      return [...prev, dayNumber].sort()
    })
  }

  function addKid() {
    if (!newKidName.trim() || !newKidPin.trim()) {
      alert('Enter kid name and PIN')
      return
    }

    const newKid = {
      id: crypto.randomUUID(),
      name: newKidName.trim(),
      pin: newKidPin.trim()
    }

    setKids(prev => [...prev, newKid])
    setNewKidName('')
    setNewKidPin('')
  }

  function deleteKid(kidId) {
    const active = getActiveSession(kidId)
    if (active) {
      alert('Stop the running session before deleting this kid.')
      return
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

  return (
    <div className="app">
      <h1>Kids Screen Time Tracker</h1>

    <p className="subtitle">
  {getDayType() === 'school'
    ? `School day limit: ${formatMinutes(schoolLimitMinutes)}`
    : `Break / non-school day limit: ${formatMinutes(breakLimitMinutes)}`}
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

              <div className="button-row">
                <button onClick={startSession}>Start Screen Time</button>
                <button onClick={stopSession}>Stop Screen Time</button>
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
      <PopupModal popup={popup} onClose={closePopup} />
      
    </div>
  )
}
