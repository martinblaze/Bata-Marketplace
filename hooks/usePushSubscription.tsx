// hooks/usePushSubscription.tsx
// Replaces your old usePushNotifications.ts
// This one actually works when browser is closed

'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'

export function usePushSubscription() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const toast = useToast()

  useEffect(() => {
    // Check if browser supports everything we need
    if ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true)
      setPermission(Notification.permission)
    }

    // Check if user is already subscribed
    checkSubscription()
  }, [])

  const checkSubscription = async () => {
    try {
      if (!('serviceWorker' in navigator)) return

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      setIsSubscribed(!!subscription)
    } catch (error) {
      console.error('Check subscription error:', error)
    }
  }

  const subscribe = async () => {
    if (!isSupported) {
      toast.error('Push notifications not supported in this browser')
      return false
    }

    setIsLoading(true)

    try {
      // Step 1: Ask browser permission
      const result = await Notification.requestPermission()
      setPermission(result)

      if (result !== 'granted') {
        toast.error('Notification permission denied')
        return false
      }

      // Step 2: Register the service worker
      const registration = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      // Step 3: Subscribe to push with your VAPID public key
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true, // Required by browsers — all pushes must show a notification
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        )
      })

      // Step 4: Send subscription to your server to save in DB
      const token = localStorage.getItem('token')
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(subscription)
      })

      if (response.ok) {
        setIsSubscribed(true)
        toast.success("Notifications enabled! You'll get updates even when browser is closed.")
        return true
      }

      return false
    } catch (error) {
      console.error('Subscribe error:', error)
      toast.error('Failed to enable notifications')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const unsubscribe = async () => {
    setIsLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        // Remove from server DB first
        const token = localStorage.getItem('token')
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        })

        // Then unsubscribe from browser
        await subscription.unsubscribe()
      }

      setIsSubscribed(false)
      toast.success('Notifications disabled')
    } catch (error) {
      console.error('Unsubscribe error:', error)
      toast.error('Failed to disable notifications')
    } finally {
      setIsLoading(false)
    }
  }

  return {
    permission,
    isSupported,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
  }
}

// Helper: Convert VAPID key from base64 to Uint8Array (required by browser API)
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// -----------------------------------------------
// NotificationPrompt component
// Drop this anywhere in your layout to prompt users
// -----------------------------------------------
export function NotificationPrompt() {
  const { permission, isSupported, isSubscribed, isLoading, subscribe } = usePushSubscription()
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const wasDismissed = localStorage.getItem('pushPromptDismissed')
    if (wasDismissed) setDismissed(true)
  }, [])

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem('pushPromptDismissed', 'true')
  }

  // Don't show if: not supported, already subscribed, permission denied, or dismissed
  if (!isSupported || isSubscribed || permission === 'denied' || dismissed) {
    return null
  }

  return (
    <div className="fixed bottom-20 lg:bottom-4 right-4 max-w-sm bg-white rounded-lg shadow-2xl border border-gray-200 p-4 z-40 animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-xl">
          🔔
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 mb-1">Stay Updated</h4>
          <p className="text-sm text-gray-600 mb-3">
            Get order updates, payment alerts, and messages — even when your browser is closed.
          </p>
          <div className="flex gap-2">
            <button
              onClick={subscribe}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {isLoading ? 'Enabling...' : 'Enable'}
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 text-sm font-medium rounded-lg transition-colors"
            >
              Not Now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}