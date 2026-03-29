'use client'

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'batamart_notif_nudge'
const SNOOZE_HOURS = 24 // hours between passive nudges

interface NudgeState {
  snoozeUntil: number   // timestamp ms — 0 means not snoozed
  grantedAt:   number   // timestamp ms when user last granted — used to detect revocation
}

function loadState(): NudgeState {
  if (typeof window === 'undefined') return { snoozeUntil: 0, grantedAt: 0 }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { snoozeUntil: 0, grantedAt: 0 }
    return JSON.parse(raw)
  } catch {
    return { snoozeUntil: 0, grantedAt: 0 }
  }
}

function saveState(s: NudgeState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch {}
}

// ── Main hook ─────────────────────────────────────────────────────────────────
export function useNotificationNudge() {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [permission, setPermission]     = useState<NotificationPermission>('default')
  const [isSupported, setIsSupported]   = useState(false)
  const [nudgeState, setNudgeState]     = useState<NudgeState>({ snoozeUntil: 0, grantedAt: 0 })
  const [isLoggedIn, setIsLoggedIn]     = useState(false) // ✅ login gate

  // ── Initialise on mount ────────────────────────────────────────────────────
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('Notification' in window) ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window)
    ) return

    // ✅ Only proceed if user is logged in
    const token = localStorage.getItem('token')
    if (!token) return

    setIsLoggedIn(true)
    setIsSupported(true)
    setPermission(Notification.permission)
    setNudgeState(loadState())

    // Check actual push subscription state
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        setIsSubscribed(!!sub)
        if (sub) {
          // Record when we confirmed subscription (used to detect later revocation)
          const s = loadState()
          if (!s.grantedAt) {
            const updated = { ...s, grantedAt: Date.now() }
            saveState(updated)
            setNudgeState(updated)
          }
        }
      })
      .catch(() => {})
  }, [])

  // ── Detect if user revoked permission outside the app ─────────────────────
  //    (e.g. turned off in browser settings) — reset snooze so we nudge again
  useEffect(() => {
    if (!isSupported) return
    if (permission === 'granted' && !isSubscribed) {
      // Was subscribed, now isn't — clear any "dismissed forever" state
      const updated = { snoozeUntil: 0, grantedAt: 0 }
      saveState(updated)
      setNudgeState(updated)
    }
  }, [permission, isSubscribed, isSupported])

  // ── Snooze (user clicked "Not Now") ───────────────────────────────────────
  const snooze = useCallback(() => {
    const updated: NudgeState = {
      snoozeUntil: Date.now() + SNOOZE_HOURS * 60 * 60 * 1000,
      grantedAt: nudgeState.grantedAt,
    }
    saveState(updated)
    setNudgeState(updated)
  }, [nudgeState.grantedAt])

  // ── Mark as granted (call after successful subscribe) ─────────────────────
  const markGranted = useCallback(() => {
    const updated: NudgeState = { snoozeUntil: 0, grantedAt: Date.now() }
    saveState(updated)
    setNudgeState(updated)
    setIsSubscribed(true)
    setPermission('granted')
  }, [])

  // ── Should we show a passive (background) nudge? ──────────────────────────
  // ✅ Added isLoggedIn check — never show to logged-out users
  const shouldShowPassive = (
    isLoggedIn &&
    isSupported &&
    !isSubscribed &&
    permission !== 'denied' &&
    permission !== 'granted' &&
    Date.now() > nudgeState.snoozeUntil
  )

  // ── Should we show a contextual nudge (e.g. after order)? ─────────────────
  //    Same rules but we ignore the snooze — a fresh order is high motivation.
  //    The caller is responsible for only triggering this once per visit.
  const shouldShowContextual = (
    isLoggedIn &&
    isSupported &&
    !isSubscribed &&
    permission !== 'denied' &&
    permission !== 'granted'
  )

  return {
    isSubscribed,
    isSupported,
    permission,
    shouldShowPassive,
    shouldShowContextual,
    snooze,
    markGranted,
    nudgeState,
  }
}