import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const DEFAULT_KIDS = [
  { id: '1', name: 'Shaurya', pin: '1111' },
  { id: '2', name: 'Shivane', pin: '2222' }
]

const DEFAULT_SCHOOL_LIMIT = 120
const DEFAULT_BREAK_LIMIT = 180
const DEFAULT_REWARD_MINUTES = 10
const DEFAULT_PENALTY_MINUTES = 5
const WARNING_MINUTES = 15
const DEFAULT_PARENT_PASSCODE = '1234'
const API_POLL_INTERVAL = 5000
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
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

function formatSignedMinutes(minutes) {
  if (minutes < 0) {
    return `-${formatMinutes(Math.abs(minutes))}`
  }

  return formatMinutes(minutes)
}

function todayString() {
  return new Date().toISOString().slice(0, 10)
}

function currentMonthString() {
  return todayString().slice(0, 7)
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

function formatMonthLabel(monthString) {
  return dateFromString(`${monthString}-01`).toLocaleDateString([], {
    month: 'long',
    year: 'numeric'
  })
}

function getDaysInMonth(monthString) {
  const [year, month] = monthString.split('-').map(Number)
  const firstDay = new Date(year, month - 1, 1)
  const daysInMonth = new Date(year, month, 0).getDate()

  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1
    const dateString = `${monthString}-${String(day).padStart(2, '0')}`

    return {
      dateString,
      day,
      weekday: new Date(year, month - 1, day).getDay(),
      isToday: dateString === todayString()
    }
  }).map((entry, index) => ({
    ...entry,
    isFirstDay: index === 0,
    firstWeekday: index === 0 ? firstDay.getDay() : null
  }))
}

function generateId(prefix = 'id') {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function createSettingsDraft({
  parentPasscode = DEFAULT_PARENT_PASSCODE,
  parentPhoneNumber = '',
  schoolLimitMinutes = DEFAULT_SCHOOL_LIMIT,
  breakLimitMinutes = DEFAULT_BREAK_LIMIT,
  rewardMinutes = DEFAULT_REWARD_MINUTES,
  penaltyMinutes = DEFAULT_PENALTY_MINUTES,
  schoolDays = [1, 2, 3, 4, 5],
  soundEnabled = true,
  smsNotificationsEnabled = false,
  kidPhoneNumbers = {}
} = {}) {
  return {
    parentPasscode,
    parentPhoneNumber,
    schoolLimitMinutes,
    breakLimitMinutes,
    rewardMinutes,
    penaltyMinutes,
    schoolDays,
    soundEnabled,
    smsNotificationsEnabled,
    kidPhoneNumbers
  }
}

export default function App() {
  const [mode, setMode] = useState('kid')
  const [apiAvailable, setApiAvailable] = useState(false)

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
const [parentPhoneNumber, setParentPhoneNumber] = useState(() => {
  const saved = localStorage.getItem('screen-time-parent-phone-number')
  return saved ? JSON.parse(saved) : ''
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
const [smsNotificationsEnabled, setSmsNotificationsEnabled] = useState(() => {
  const saved = localStorage.getItem('screen-time-sms-notifications-enabled')
  return saved ? JSON.parse(saved) : false
})
const [kidPhoneNumbers, setKidPhoneNumbers] = useState(() => {
  const saved = localStorage.getItem('screen-time-kid-phone-numbers')
  return saved ? JSON.parse(saved) : {}
})

const [breakLimitMinutes, setBreakLimitMinutes] = useState(() => {
  const saved = localStorage.getItem('screen-time-break-limit')
  return saved ? JSON.parse(saved) : DEFAULT_BREAK_LIMIT
})
const [rewardMinutes, setRewardMinutes] = useState(() => {
  const saved = localStorage.getItem('screen-time-reward-minutes')
  return saved ? JSON.parse(saved) : DEFAULT_REWARD_MINUTES
})
const [penaltyMinutes, setPenaltyMinutes] = useState(() => {
  const saved = localStorage.getItem('screen-time-penalty-minutes')
  return saved ? JSON.parse(saved) : DEFAULT_PENALTY_MINUTES
})
const [timeAdjustments, setTimeAdjustments] = useState(() => {
  const saved = localStorage.getItem('screen-time-time-adjustments')
  return saved ? JSON.parse(saved) : []
})
  const [settingsDraft, setSettingsDraft] = useState(() =>
    createSettingsDraft({
      parentPasscode: localStorage.getItem('screen-time-parent-passcode')
        ? JSON.parse(localStorage.getItem('screen-time-parent-passcode'))
        : DEFAULT_PARENT_PASSCODE,
      parentPhoneNumber: localStorage.getItem('screen-time-parent-phone-number')
        ? JSON.parse(localStorage.getItem('screen-time-parent-phone-number'))
        : '',
      schoolLimitMinutes: localStorage.getItem('screen-time-school-limit')
        ? JSON.parse(localStorage.getItem('screen-time-school-limit'))
        : DEFAULT_SCHOOL_LIMIT,
      breakLimitMinutes: localStorage.getItem('screen-time-break-limit')
        ? JSON.parse(localStorage.getItem('screen-time-break-limit'))
        : DEFAULT_BREAK_LIMIT,
      rewardMinutes: localStorage.getItem('screen-time-reward-minutes')
        ? JSON.parse(localStorage.getItem('screen-time-reward-minutes'))
        : DEFAULT_REWARD_MINUTES,
      penaltyMinutes: localStorage.getItem('screen-time-penalty-minutes')
        ? JSON.parse(localStorage.getItem('screen-time-penalty-minutes'))
        : DEFAULT_PENALTY_MINUTES,
      schoolDays: localStorage.getItem('screen-time-school-days')
        ? JSON.parse(localStorage.getItem('screen-time-school-days'))
        : [1, 2, 3, 4, 5],
      soundEnabled: localStorage.getItem('screen-time-sound-enabled')
        ? JSON.parse(localStorage.getItem('screen-time-sound-enabled'))
        : true,
      smsNotificationsEnabled: localStorage.getItem('screen-time-sms-notifications-enabled')
        ? JSON.parse(localStorage.getItem('screen-time-sms-notifications-enabled'))
        : false,
      kidPhoneNumbers: localStorage.getItem('screen-time-kid-phone-numbers')
        ? JSON.parse(localStorage.getItem('screen-time-kid-phone-numbers'))
        : {}
    })
  )
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [isEditingSettings, setIsEditingSettings] = useState(false)
  const isEditingSettingsRef = useRef(false)
  const parentUnlockedRef = useRef(false)
  const [enteredParentPasscode, setEnteredParentPasscode] = useState('')
  const [parentUnlocked, setParentUnlocked] = useState(false)

  const [selectedKidId, setSelectedKidId] = useState('')
  const [pin, setPin] = useState('')
  const [loggedInKid, setLoggedInKid] = useState(null)

  const [newKidName, setNewKidName] = useState('')
  const [newKidPin, setNewKidPin] = useState('')
  const [selectedDate, setSelectedDate] = useState(todayString())
  const [calendarMonth, setCalendarMonth] = useState(currentMonthString())

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
      const nextSettings = createSettingsDraft({
        schoolDays: settingsData.schoolDays ?? [1, 2, 3, 4, 5],
        parentPasscode: settingsData.parentPasscode ?? DEFAULT_PARENT_PASSCODE,
        parentPhoneNumber: settingsData.parentPhoneNumber ?? '',
        schoolLimitMinutes: settingsData.schoolLimitMinutes ?? DEFAULT_SCHOOL_LIMIT,
        breakLimitMinutes: settingsData.breakLimitMinutes ?? DEFAULT_BREAK_LIMIT,
        rewardMinutes: settingsData.rewardMinutes ?? DEFAULT_REWARD_MINUTES,
        penaltyMinutes: settingsData.penaltyMinutes ?? DEFAULT_PENALTY_MINUTES,
        soundEnabled: settingsData.soundEnabled ?? true,
        smsNotificationsEnabled: settingsData.smsNotificationsEnabled ?? false,
        kidPhoneNumbers: settingsData.kidPhoneNumbers ?? {}
      })

      setSchoolDays(nextSettings.schoolDays)
      setParentPasscode(nextSettings.parentPasscode)
      setParentPhoneNumber(nextSettings.parentPhoneNumber)
      setSchoolLimitMinutes(nextSettings.schoolLimitMinutes)
      setBreakLimitMinutes(nextSettings.breakLimitMinutes)
      setRewardMinutes(nextSettings.rewardMinutes)
      setPenaltyMinutes(nextSettings.penaltyMinutes)
      setSoundEnabled(nextSettings.soundEnabled)
      setSmsNotificationsEnabled(nextSettings.smsNotificationsEnabled)
      setKidPhoneNumbers(nextSettings.kidPhoneNumbers)
      setTimeAdjustments([])
      if ((settingsData.timeAdjustments ?? []).length > 0) {
        fetchJson('/api/settings', {
          method: 'PUT',
          body: JSON.stringify({
            timeAdjustments: []
          })
        }).catch(error => {
          console.error('Failed to clear legacy time adjustments:', error)
        })
      }
      if (!parentUnlockedRef.current || !isEditingSettingsRef.current) {
        setSettingsDraft(nextSettings)
      }
      setApiAvailable(true)
      return true
    } catch {
      setApiAvailable(false)

      if (showOfflineError) {
        showInfoPopup(
          'Shared Backend Unavailable',
          'The shared backend is unavailable. The app is using local browser storage on this device.'
        )
      }

      return false
    }
  }

  useEffect(() => {
    refreshBackendData()
  }, [])

  useEffect(() => {
    parentUnlockedRef.current = parentUnlocked
  }, [parentUnlocked])

  useEffect(() => {
    isEditingSettingsRef.current = isEditingSettings
  }, [isEditingSettings])

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
    localStorage.setItem('screen-time-parent-phone-number', JSON.stringify(parentPhoneNumber))
  }, [parentPhoneNumber])

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
  localStorage.setItem('screen-time-reward-minutes', JSON.stringify(rewardMinutes))
}, [rewardMinutes])

useEffect(() => {
  localStorage.setItem('screen-time-penalty-minutes', JSON.stringify(penaltyMinutes))
}, [penaltyMinutes])

useEffect(() => {
  localStorage.setItem('screen-time-sound-enabled', JSON.stringify(soundEnabled))
}, [soundEnabled])

useEffect(() => {
  localStorage.setItem('screen-time-sms-notifications-enabled', JSON.stringify(smsNotificationsEnabled))
}, [smsNotificationsEnabled])

useEffect(() => {
  localStorage.setItem('screen-time-kid-phone-numbers', JSON.stringify(kidPhoneNumbers))
}, [kidPhoneNumbers])

useEffect(() => {
  localStorage.setItem('screen-time-time-adjustments', JSON.stringify(timeAdjustments))
}, [timeAdjustments])

  useEffect(() => {
    if (!apiAvailable) return undefined

    const interval = setInterval(() => {
      refreshBackendData()
    }, API_POLL_INTERVAL)

    return () => clearInterval(interval)
  }, [apiAvailable, parentUnlocked])

  useEffect(() => {
    if (!apiAvailable || !loggedInKid) return
    refreshBackendData()
  }, [apiAvailable, loggedInKid])

  function getDayType(date = new Date()) {
    const day = date.getDay()
    return schoolDays.includes(day) ? 'school' : 'weekend'
  }

  function getBaseDailyLimit(date = new Date()) {
    return getDayType(date) === 'school'
      ? Number(schoolLimitMinutes)
      : Number(breakLimitMinutes)
  }

  function getActiveSession(kidId) {
    return [...sessions]
      .filter(session => session.kidId === kidId && !session.endTime)
      .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))[0]
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
    const dateString = date.toISOString().slice(0, 10)
    return getRemainingMinutesForDate(kidId, dateString)
  }

  function getRemainingMinutesForDate(kidId, dateString) {
    return getEffectiveDailyLimitForDate(kidId, dateString) - getUsedMinutesForDate(kidId, dateString)
  }

  function getOvertimeMinutesForDate(kidId, dateString) {
    return Math.max(0, getUsedMinutesForDate(kidId, dateString) - getEffectiveDailyLimitForDate(kidId, dateString))
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

  async function sendScreenLimitNotification(kidId, type, details = {}) {
    if (!apiAvailable) return

    try {
      await fetchJson('/api/notifications/screen-limit', {
        method: 'POST',
        body: JSON.stringify({
          kidId,
          type,
          date: todayString(),
          ...details
        })
      })
    } catch (error) {
      console.error('Failed to send screen limit notification:', error)
    }
  }

function closePopup() {
  setPopup({
    show: false,
    type: '',
    title: '',
    message: ''
  })
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
          `${kid.name} has reached the screen time limit. Overtime is now being tracked.`
        )
        sendScreenLimitNotification(kid.id, 'limit-reached', {
          overtimeMinutes: getOvertimeMinutesForDate(kid.id, todayString())
        })
        sessionStorage.setItem(finishedKey, 'shown')
        return
      }

      if (remaining <= WARNING_MINUTES && !sessionStorage.getItem(warningKey)) {
        showPopup(
          'warning',
          'Wrap-Up Reminder',
          `${kid.name} has ${formatMinutes(remaining)} left today. Please start wrapping things up.`
        )
        sendScreenLimitNotification(kid.id, 'warning', {
          remainingMinutes: Math.max(0, remaining)
        })
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
    setIsEditingSettings(false)
    parentUnlockedRef.current = true
    isEditingSettingsRef.current = false
    setEnteredParentPasscode('')
  }

  function lockParent() {
    setParentUnlocked(false)
    setIsEditingSettings(false)
    parentUnlockedRef.current = false
    isEditingSettingsRef.current = false
    setEnteredParentPasscode('')
  }

  function updateSettingsDraft(updater) {
    isEditingSettingsRef.current = true
    setIsEditingSettings(true)
    setSettingsDraft(prev => updater(prev))
  }

  const dailyAdjustments = useMemo(() => {
    return kids.flatMap(kid => {
      const dates = [...new Set(
        sessions
          .filter(session => session.kidId === kid.id && session.date < todayString())
          .map(session => session.date)
      )].sort()

      let carryForward = 0

      return dates.reduce((adjustments, dateString) => {
        const baseLimit = getBaseDailyLimit(dateFromString(dateString))
        const effectiveLimit = Math.max(0, baseLimit + carryForward)
        const usedMinutes = sessions
          .filter(session => session.kidId === kid.id && session.date === dateString)
          .reduce((total, session) => {
            const start = new Date(session.startTime)
            const end = session.endTime ? new Date(session.endTime) : start
            return total + Math.max(0, (end - start) / 60000)
          }, 0)

        if (usedMinutes <= 0) {
          return adjustments
        }

        const overtimeMinutes = Math.max(0, usedMinutes - effectiveLimit)
        const minutesDelta = overtimeMinutes > 0
          ? -Number(penaltyMinutes)
          : Number(rewardMinutes)

        const adjustment = {
          id: `${kid.id}-${dateString}-${overtimeMinutes > 0 ? 'penalty' : 'reward'}`,
          kidId: kid.id,
          type: overtimeMinutes > 0 ? 'penalty' : 'reward',
          minutesDelta,
          overtimeMinutes,
          date: dateString,
          createdAt: `${dateString}T23:59:59.000Z`
        }

        carryForward += minutesDelta
        adjustments.push(adjustment)
        return adjustments
      }, [])
    })
  }, [kids, sessions, schoolDays, schoolLimitMinutes, breakLimitMinutes, rewardMinutes, penaltyMinutes])

  function getBalanceBeforeDate(kidId, dateString) {
    return dailyAdjustments
      .filter(adjustment => adjustment.kidId === kidId && adjustment.date < dateString)
      .reduce((total, adjustment) => total + Number(adjustment.minutesDelta || 0), 0)
  }

  function getCurrentRewardBalance(kidId) {
    return dailyAdjustments
      .filter(adjustment => adjustment.kidId === kidId)
      .reduce((total, adjustment) => total + Number(adjustment.minutesDelta || 0), 0)
  }

  function getEffectiveDailyLimitForDate(kidId, dateString) {
    const baseLimit = getBaseDailyLimit(dateFromString(dateString))
    const carryForward = getBalanceBeforeDate(kidId, dateString)

    return Math.max(0, baseLimit + carryForward)
  }

  async function startSession(mode = 'start') {
    if (!loggedInKid) return

    if (getActiveSession(loggedInKid.id)) {
      showInfoPopup('Session Already Running', 'Screen time is already running for this kid.')
      return
    }

    const used = getUsedMinutesToday(loggedInKid.id)
    const limit = getEffectiveDailyLimitForDate(loggedInKid.id, todayString())

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
        showInfoPopup(
          mode === 'restart' ? 'Session Restarted' : 'Session Started',
          `${loggedInKid.name}'s screen time session has ${mode === 'restart' ? 'restarted' : 'started'}.`,
          {
          sound: false
          }
        )
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
    showInfoPopup(
      mode === 'restart' ? 'Session Restarted' : 'Session Started',
      `${loggedInKid.name}'s screen time session has ${mode === 'restart' ? 'restarted' : 'started'}.`,
      {
        sound: false
      }
    )
  }

  async function pauseSession() {
    if (!loggedInKid) return

    const active = getActiveSession(loggedInKid.id)
    if (!active) {
      showInfoPopup('No Active Session', 'No active session found to pause.')
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
        await refreshBackendData()

        playSound('stop')
        showInfoPopup(
          'Session Paused',
          `${loggedInKid.name}'s screen time session has paused. Rewards or penalties will be calculated after the day is finished.`,
          {
            sound: false
          }
        )
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
    showInfoPopup(
      'Session Paused',
      `${loggedInKid.name}'s screen time session has paused. Rewards or penalties will be calculated after the day is finished.`,
      {
        sound: false
      }
    )
  }

  function toggleSchoolDay(dayNumber) {
    updateSettingsDraft(prev => {
      const nextSchoolDays = prev.schoolDays.includes(dayNumber)
        ? prev.schoolDays.filter(day => day !== dayNumber).sort()
        : [...prev.schoolDays, dayNumber].sort()

      return {
        ...prev,
        schoolDays: nextSchoolDays
      }
    })
  }

  async function saveParentSettings() {
    const nextSettings = createSettingsDraft({
      parentPasscode: settingsDraft.parentPasscode.trim(),
      parentPhoneNumber: settingsDraft.parentPhoneNumber.trim(),
      schoolLimitMinutes: Number(settingsDraft.schoolLimitMinutes),
      breakLimitMinutes: Number(settingsDraft.breakLimitMinutes),
      rewardMinutes: Number(settingsDraft.rewardMinutes),
      penaltyMinutes: Number(settingsDraft.penaltyMinutes),
      schoolDays: [...settingsDraft.schoolDays].sort(),
      soundEnabled: settingsDraft.soundEnabled,
      smsNotificationsEnabled: settingsDraft.smsNotificationsEnabled,
      kidPhoneNumbers: Object.fromEntries(
        Object.entries(settingsDraft.kidPhoneNumbers).map(([kidId, phoneNumber]) => [kidId, phoneNumber.trim()])
      )
    })

    if (!nextSettings.parentPasscode) {
      showInfoPopup('Missing Passcode', 'Enter a parent passcode before saving.')
      return
    }

    if (Number.isNaN(nextSettings.schoolLimitMinutes) || nextSettings.schoolLimitMinutes < 0) {
      showInfoPopup('Invalid School Limit', 'Enter a valid school day limit in minutes.')
      return
    }

    if (Number.isNaN(nextSettings.breakLimitMinutes) || nextSettings.breakLimitMinutes < 0) {
      showInfoPopup('Invalid Break Limit', 'Enter a valid break day limit in minutes.')
      return
    }

    if (Number.isNaN(nextSettings.rewardMinutes) || nextSettings.rewardMinutes < 0) {
      showInfoPopup('Invalid Reward', 'Enter a valid reward value in minutes.')
      return
    }

    if (Number.isNaN(nextSettings.penaltyMinutes) || nextSettings.penaltyMinutes < 0) {
      showInfoPopup('Invalid Penalty', 'Enter a valid penalty value in minutes.')
      return
    }

    setIsSavingSettings(true)

    try {
      if (apiAvailable) {
        const savedSettings = await fetchJson('/api/settings', {
          method: 'PUT',
          body: JSON.stringify(nextSettings)
        })

        const syncedSettings = createSettingsDraft({
          parentPasscode: savedSettings.parentPasscode ?? nextSettings.parentPasscode,
          parentPhoneNumber: savedSettings.parentPhoneNumber ?? nextSettings.parentPhoneNumber,
          schoolLimitMinutes: savedSettings.schoolLimitMinutes ?? nextSettings.schoolLimitMinutes,
          breakLimitMinutes: savedSettings.breakLimitMinutes ?? nextSettings.breakLimitMinutes,
          rewardMinutes: savedSettings.rewardMinutes ?? nextSettings.rewardMinutes,
          penaltyMinutes: savedSettings.penaltyMinutes ?? nextSettings.penaltyMinutes,
          schoolDays: savedSettings.schoolDays ?? nextSettings.schoolDays,
          soundEnabled: savedSettings.soundEnabled ?? nextSettings.soundEnabled,
          smsNotificationsEnabled:
            savedSettings.smsNotificationsEnabled ?? nextSettings.smsNotificationsEnabled,
          kidPhoneNumbers: savedSettings.kidPhoneNumbers ?? nextSettings.kidPhoneNumbers
        })

        setParentPasscode(syncedSettings.parentPasscode)
        setParentPhoneNumber(syncedSettings.parentPhoneNumber)
        setSchoolLimitMinutes(syncedSettings.schoolLimitMinutes)
        setBreakLimitMinutes(syncedSettings.breakLimitMinutes)
        setRewardMinutes(syncedSettings.rewardMinutes)
        setPenaltyMinutes(syncedSettings.penaltyMinutes)
        setSchoolDays(syncedSettings.schoolDays)
        setSoundEnabled(syncedSettings.soundEnabled)
        setSmsNotificationsEnabled(syncedSettings.smsNotificationsEnabled)
        setKidPhoneNumbers(syncedSettings.kidPhoneNumbers)
        setSettingsDraft(syncedSettings)
      } else {
        setParentPasscode(nextSettings.parentPasscode)
        setParentPhoneNumber(nextSettings.parentPhoneNumber)
        setSchoolLimitMinutes(nextSettings.schoolLimitMinutes)
        setBreakLimitMinutes(nextSettings.breakLimitMinutes)
        setRewardMinutes(nextSettings.rewardMinutes)
        setPenaltyMinutes(nextSettings.penaltyMinutes)
        setSchoolDays(nextSettings.schoolDays)
        setSoundEnabled(nextSettings.soundEnabled)
        setSmsNotificationsEnabled(nextSettings.smsNotificationsEnabled)
        setKidPhoneNumbers(nextSettings.kidPhoneNumbers)
        setSettingsDraft(nextSettings)
      }

      isEditingSettingsRef.current = false
      setIsEditingSettings(false)
      showInfoPopup('Settings Saved', 'Parent configuration has been saved successfully.', {
        sound: false
      })
    } catch (error) {
      showInfoPopup('Could Not Save Settings', error.message)
    } finally {
      setIsSavingSettings(false)
    }
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
    return kids.map(kid => {
      const used = getUsedMinutesToday(kid.id)
      const effectiveLimit = getEffectiveDailyLimitForDate(kid.id, todayString())
      const remaining = Math.max(0, effectiveLimit - used)
      const overtime = Math.max(0, used - effectiveLimit)

      return {
        ...kid,
        used,
        effectiveLimit,
        remaining,
        overtime,
        rewardBalance: getCurrentRewardBalance(kid.id),
        active: !!getActiveSession(kid.id)
      }
    })
}, [kids, sessions, tick, schoolDays, schoolLimitMinutes, breakLimitMinutes, dailyAdjustments])

  const selectedDateDashboard = useMemo(() => {
    return kids.map(kid => {
      const used = getUsedMinutesForDate(kid.id, selectedDate)
      const effectiveLimit = getEffectiveDailyLimitForDate(kid.id, selectedDate)
      const remaining = Math.max(0, effectiveLimit - used)
      const overtime = Math.max(0, used - effectiveLimit)
      const active = selectedDate === todayString() && !!getActiveSession(kid.id)

      return {
        ...kid,
        used,
        effectiveLimit,
        remaining,
        overtime,
        rewardBalance: getCurrentRewardBalance(kid.id),
        active
      }
    })
  }, [kids, selectedDate, sessions, tick, schoolDays, schoolLimitMinutes, breakLimitMinutes, dailyAdjustments])

  const visibleKids = useMemo(() => {
    if (mode === 'kid' && loggedInKid) {
      return kids.filter(kid => kid.id === loggedInKid.id)
    }

    return kids
  }, [kids, loggedInKid, mode])

  const usageByKidAndDate = useMemo(() => {
    return kids.reduce((lookup, kid) => {
      lookup[kid.id] = sessions.reduce((dateLookup, session) => {
        if (session.kidId !== kid.id) {
          return dateLookup
        }

        dateLookup[session.date] = getUsedMinutesForDate(kid.id, session.date)
        return dateLookup
      }, {})

      return lookup
    }, {})
  }, [kids, sessions, tick])

  const calendarDays = useMemo(() => {
    return getDaysInMonth(calendarMonth)
  }, [calendarMonth])

  const calendarLeadingBlanks = calendarDays[0]?.firstWeekday ?? 0

  const monthReportRows = useMemo(() => {
    return calendarDays.map(day => {
      const usage = visibleKids.reduce((row, kid) => {
        row[kid.id] = {
          used: usageByKidAndDate[kid.id]?.[day.dateString] ?? 0,
          overtime: getOvertimeMinutesForDate(kid.id, day.dateString)
        }
        return row
      }, {})

      return {
        ...day,
        usage
      }
    })
  }, [calendarDays, usageByKidAndDate, visibleKids, dailyAdjustments])

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

  const recentAdjustments = [...dailyAdjustments]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10)
    .map(adjustment => {
      const kid = kids.find(item => item.id === adjustment.kidId)
      return {
        ...adjustment,
        kidName: kid?.name ?? 'Unknown'
      }
    })

  const loggedInKidActiveSession = loggedInKid ? getActiveSession(loggedInKid.id) : null
  const loggedInKidUsedToday = loggedInKid ? getUsedMinutesToday(loggedInKid.id) : 0
  const settingsDirty = useMemo(() => {
    return (
      settingsDraft.parentPasscode !== parentPasscode ||
      settingsDraft.parentPhoneNumber !== parentPhoneNumber ||
      Number(settingsDraft.schoolLimitMinutes) !== Number(schoolLimitMinutes) ||
      Number(settingsDraft.breakLimitMinutes) !== Number(breakLimitMinutes) ||
      Number(settingsDraft.rewardMinutes) !== Number(rewardMinutes) ||
      Number(settingsDraft.penaltyMinutes) !== Number(penaltyMinutes) ||
      settingsDraft.soundEnabled !== soundEnabled ||
      settingsDraft.smsNotificationsEnabled !== smsNotificationsEnabled ||
      JSON.stringify(settingsDraft.kidPhoneNumbers) !== JSON.stringify(kidPhoneNumbers) ||
      JSON.stringify(settingsDraft.schoolDays) !== JSON.stringify(schoolDays)
    )
  }, [
    breakLimitMinutes,
    kidPhoneNumbers,
    penaltyMinutes,
    parentPasscode,
    parentPhoneNumber,
    rewardMinutes,
    schoolDays,
    schoolLimitMinutes,
    settingsDraft,
    smsNotificationsEnabled,
    soundEnabled
  ])

  function handleSelectedDateChange(nextDate) {
    setSelectedDate(nextDate)
    setCalendarMonth(nextDate.slice(0, 7))
  }

  function changeCalendarMonth(offset) {
    const [year, month] = calendarMonth.split('-').map(Number)
    const nextDate = new Date(year, month - 1 + offset, 1)
    const nextMonth = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`

    if (nextMonth > currentMonthString()) {
      return
    }

    setCalendarMonth(nextMonth)
  }

  return (
    <div className="app">
      <h1>Kids Screen Time Tracker</h1>

    <p className="subtitle">
  {getDayType() === 'school'
    ? `School day limit: ${formatMinutes(schoolLimitMinutes)}`
    : `Break / non-school day limit: ${formatMinutes(breakLimitMinutes)}`} • Reward: +{formatMinutes(rewardMinutes)} • Penalty: -{formatMinutes(penaltyMinutes)}
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
              <p>Today&apos;s limit: {formatMinutes(getEffectiveDailyLimitForDate(loggedInKid.id, todayString()))}</p>
              <p>Remaining today: {formatMinutes(Math.max(0, getRemainingMinutes(loggedInKid.id)))}</p>
              <p>Overtime today: {formatMinutes(getOvertimeMinutesForDate(loggedInKid.id, todayString()))}</p>
              <p>Reward bank for future days: {formatSignedMinutes(getCurrentRewardBalance(loggedInKid.id))}</p>
              <p>Status: {loggedInKidActiveSession ? 'Running' : 'Idle'}</p>
              {loggedInKidActiveSession && (
                <p>Started at: {formatTime(loggedInKidActiveSession.startTime)}</p>
              )}

              <div className="button-row">
                <button
                  onClick={() => startSession(loggedInKidUsedToday > 0 ? 'restart' : 'start')}
                  disabled={!!loggedInKidActiveSession}
                >
                  {loggedInKidActiveSession
                    ? 'Session Running'
                    : loggedInKidUsedToday > 0
                      ? 'Restart Screen Time'
                      : 'Start Screen Time'}
                </button>
                <button onClick={pauseSession} disabled={!loggedInKidActiveSession}>
                  Pause Screen Time
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

                <p className={`settings-status ${settingsDirty ? 'pending' : 'saved'}`}>
                  {settingsDirty
                    ? 'You have unsaved parent configuration changes.'
                    : 'Parent configuration is saved.'}
                </p>
                <label>Change Parent Passcode</label>
                <input
                  type="text"
                  value={settingsDraft.parentPasscode}
                  onChange={e =>
                    updateSettingsDraft(prev => ({
                      ...prev,
                      parentPasscode: e.target.value
                    }))
                  }
                />

                <label>School Day Limit (minutes)</label>
  <input
    type="number"
    min="0"
    value={settingsDraft.schoolLimitMinutes}
    onChange={e =>
      updateSettingsDraft(prev => ({
        ...prev,
        schoolLimitMinutes: e.target.value
      }))
    }
  />

  <label>Break / Non-School Day Limit (minutes)</label>
  <input
    type="number"
    min="0"
    value={settingsDraft.breakLimitMinutes}
    onChange={e =>
      updateSettingsDraft(prev => ({
        ...prev,
        breakLimitMinutes: e.target.value
      }))
    }
  />

  <p>Example: 120 = 2 hours, 180 = 3 hours, 240 = 4 hours</p>
                <label>Reward For Stopping Early (minutes)</label>
                <input
                  type="number"
                  min="0"
                  value={settingsDraft.rewardMinutes}
                  onChange={e =>
                    updateSettingsDraft(prev => ({
                      ...prev,
                      rewardMinutes: e.target.value
                    }))
                  }
                />

                <label>Penalty For Going Over Limit (minutes)</label>
                <input
                  type="number"
                  min="0"
                  value={settingsDraft.penaltyMinutes}
                  onChange={e =>
                    updateSettingsDraft(prev => ({
                      ...prev,
                      penaltyMinutes: e.target.value
                    }))
                  }
                />

	              </div>

              <div className="card">
                <h2>Notification Settings</h2>
                <p className="subtitle-text">
                  Add parent and kid mobile numbers here, then save to enable SMS alerts for wrap-up reminders and screen-limit messages.
                </p>

                <label>Parent Mobile Number</label>
                <input
                  type="tel"
                  value={settingsDraft.parentPhoneNumber}
                  onChange={e =>
                    updateSettingsDraft(prev => ({
                      ...prev,
                      parentPhoneNumber: e.target.value
                    }))
                  }
                  placeholder="+15551234567"
                />

                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={settingsDraft.smsNotificationsEnabled}
                    onChange={e =>
                      updateSettingsDraft(prev => ({
                        ...prev,
                        smsNotificationsEnabled: e.target.checked
                      }))
                    }
                  />
                  <span>Send SMS alerts for 15-minute warnings and limit reached messages</span>
                </label>

                <div className="kids-grid notification-grid">
                  {kids.map(kid => (
                    <div className="kid-box" key={`notification-${kid.id}`}>
                      <h3>{kid.name}</h3>
                      <label>Kid Mobile Number</label>
                      <input
                        type="tel"
                        value={settingsDraft.kidPhoneNumbers[kid.id] ?? ''}
                        onChange={e =>
                          updateSettingsDraft(prev => ({
                            ...prev,
                            kidPhoneNumbers: {
                              ...prev.kidPhoneNumbers,
                              [kid.id]: e.target.value
                            }
                          }))
                        }
                        placeholder="+15551234567"
                      />
                    </div>
                  ))}
                </div>

                <div className="button-row">
                  <button onClick={saveParentSettings} disabled={!settingsDirty || isSavingSettings}>
                    {isSavingSettings ? 'Saving...' : 'Save Parent And Notification Settings'}
                  </button>
                  <button
                    className="secondary"
                    onClick={() => {
                      isEditingSettingsRef.current = false
                      setIsEditingSettings(false)
                      setSettingsDraft(
                        createSettingsDraft({
                          parentPasscode,
                          parentPhoneNumber,
                          schoolLimitMinutes,
                          breakLimitMinutes,
                          rewardMinutes,
                          penaltyMinutes,
                          schoolDays,
                          soundEnabled,
                          smsNotificationsEnabled,
                          kidPhoneNumbers
                        })
                      )
                    }}
                    disabled={!settingsDirty || isSavingSettings}
                  >
                    Reset Changes
                  </button>
                </div>
              </div>

              <div className="card">
                <h2>School Days</h2>
              <p>Select which days should use the school-day limit. All other days will use the break / non-school-day limit.</p>

                <div className="button-row">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, index) => (
                    <button
                      key={label}
                      className={settingsDraft.schoolDays.includes(index) ? '' : 'secondary'}
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
                      <p>Overtime today: {formatMinutes(getOvertimeMinutesForDate(kid.id, todayString()))}</p>
                      <p>Reward bank: {formatSignedMinutes(getCurrentRewardBalance(kid.id))}</p>
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
              <p>Limit: {formatMinutes(kid.effectiveLimit)}</p>
              <p>Used: {formatMinutes(kid.used)}</p>
              <p>Remaining: {formatMinutes(kid.remaining)}</p>
              <p>Overtime: {formatMinutes(kid.overtime)}</p>
              <p>Reward bank: {formatSignedMinutes(kid.rewardBalance)}</p>
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
          onChange={e => handleSelectedDateChange(e.target.value)}
        />

        <div className="date-summary">
          <p><strong>Date:</strong> {formatDateLabel(selectedDate)}</p>
          <p><strong>Day Type:</strong> {getDayType(dateFromString(selectedDate)) === 'school' ? 'School Day' : 'Break / Non-School Day'}</p>
          <p><strong>Base Limit:</strong> {formatMinutes(getBaseDailyLimit(dateFromString(selectedDate)))}</p>
        </div>

        <div className="kids-grid">
          {selectedDateDashboard.map(kid => (
            <div className="kid-box" key={`${kid.id}-${selectedDate}`}>
              <h3>{kid.name}</h3>
              <p>Limit: {formatMinutes(kid.effectiveLimit)}</p>
              <p>Used: {formatMinutes(kid.used)}</p>
              <p>Remaining: {formatMinutes(kid.remaining)}</p>
              <p>Overtime: {formatMinutes(kid.overtime)}</p>
              <p>Reward bank: {formatSignedMinutes(kid.rewardBalance)}</p>
              <p>Status: {kid.active ? 'Running' : 'Idle'}</p>
            </div>
          ))}
        </div>

        <div className="calendar-toolbar">
          <div>
            <h3>{formatMonthLabel(calendarMonth)}</h3>
            <p className="subtitle-text">
              {mode === 'kid' && loggedInKid
                ? `Monthly usage calendar for ${loggedInKid.name}.`
                : 'Monthly usage calendar for all kids.'}
            </p>
          </div>

          <div className="button-row">
            <button className="secondary" onClick={() => changeCalendarMonth(-1)}>
              Previous Month
            </button>
            <button
              className="secondary"
              onClick={() => setCalendarMonth(currentMonthString())}
              disabled={calendarMonth === currentMonthString()}
            >
              Current Month
            </button>
            <button
              onClick={() => changeCalendarMonth(1)}
              disabled={calendarMonth === currentMonthString()}
            >
              Next Month
            </button>
          </div>
        </div>

        <div className="calendar-weekdays">
          {WEEKDAY_LABELS.map(label => (
            <div key={label} className="calendar-weekday">
              {label}
            </div>
          ))}
        </div>

        <div className="calendar-grid">
          {Array.from({ length: calendarLeadingBlanks }).map((_, index) => (
            <div key={`blank-${index}`} className="calendar-cell empty" />
          ))}

          {calendarDays.map(day => {
            const isSelected = day.dateString === selectedDate

            return (
              <button
                key={day.dateString}
                className={`calendar-cell ${isSelected ? 'selected' : ''} ${day.isToday ? 'today' : ''}`}
                onClick={() => handleSelectedDateChange(day.dateString)}
              >
                <span className="calendar-day-number">{day.day}</span>
                {visibleKids.map(kid => {
                  const minutes = usageByKidAndDate[kid.id]?.[day.dateString] ?? 0

                  return (
                    <span className="calendar-usage-line" key={`${day.dateString}-${kid.id}`}>
                      <strong>{kid.name}:</strong> {formatMinutes(minutes)}
                      {getOvertimeMinutesForDate(kid.id, day.dateString) > 0
                        ? ` • Over ${formatMinutes(getOvertimeMinutesForDate(kid.id, day.dateString))}`
                        : ''}
                    </span>
                  )
                })}
              </button>
            )
          })}
        </div>
      </div>

      <div className="card">
        <h2>Usage Report Grid</h2>
        <p className="subtitle-text">
          Date-wise screen usage for {mode === 'kid' && loggedInKid ? loggedInKid.name : 'both kids'} in {formatMonthLabel(calendarMonth)}.
        </p>

        <div className="report-grid-wrapper">
          <table className="report-grid">
            <thead>
              <tr>
                <th>Date</th>
                {visibleKids.map(kid => (
                  <th key={`header-${kid.id}`}>{kid.name}</th>
                ))}
                <th>Day Type</th>
              </tr>
            </thead>
            <tbody>
              {monthReportRows.map(row => (
                <tr
                  key={`report-${row.dateString}`}
                  className={row.dateString === selectedDate ? 'selected-row' : ''}
                >
                  <td>
                    <button
                      className="report-date-button"
                      onClick={() => handleSelectedDateChange(row.dateString)}
                    >
                      {formatDateLabel(row.dateString)}
                    </button>
                  </td>
                  {visibleKids.map(kid => (
                    <td key={`${row.dateString}-${kid.id}`}>
                      {formatMinutes(row.usage[kid.id]?.used ?? 0)}
                      {row.usage[kid.id]?.overtime > 0
                        ? ` (Over ${formatMinutes(row.usage[kid.id].overtime)})`
                        : ''}
                    </td>
                  ))}
                  <td>{getDayType(dateFromString(row.dateString)) === 'school' ? 'School Day' : 'Break / Non-School Day'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2>Rewards And Penalties</h2>

        {recentAdjustments.length === 0 ? (
          <p>No rewards or penalties recorded yet.</p>
        ) : (
          <div className="kids-grid">
            {recentAdjustments.map(adjustment => (
              <div className="kid-box" key={adjustment.id}>
                <h3>{adjustment.kidName}</h3>
                <p>Type: {adjustment.type === 'reward' ? 'Reward' : 'Penalty'}</p>
                <p>Change: {formatSignedMinutes(adjustment.minutesDelta)}</p>
                <p>Date: {formatDateLabel(adjustment.date)}</p>
                <p>Overtime: {formatMinutes(adjustment.overtimeMinutes ?? 0)}</p>
              </div>
            ))}
          </div>
        )}
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
