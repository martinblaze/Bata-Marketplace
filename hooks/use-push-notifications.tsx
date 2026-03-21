'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if ('Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!isSupported) {
      toast.error('Push notifications are not supported in this browser');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        toast.success('Notifications enabled!');
        return true;
      } else if (result === 'denied') {
        toast.error('Notification permission denied');
        return false;
      }
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Failed to request notification permission');
      return false;
    }
  };

  const sendNotification = (title: string, options?: NotificationOptions) => {
    if (!isSupported) {
      console.warn('Notifications not supported');
      return;
    }

    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    try {
      const notification = new Notification(title, {
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        ...options,
      } as NotificationOptions & { vibrate?: number[] });

      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }

      notification.onclick = () => {
        window.focus();
        notification.close();
        if (options?.data?.url) {
          window.location.href = options.data.url;
        }
      };

      return notification;
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  return {
    permission,
    isSupported,
    requestPermission,
    sendNotification,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// NotificationPrompt — shown to users who haven't granted/denied yet
// ─────────────────────────────────────────────────────────────────────────────
export function NotificationPrompt() {
  const { permission, isSupported, requestPermission } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const wasDismissed = localStorage.getItem('notificationPromptDismissed');
    if (wasDismissed) {
      setDismissed(true);
      return;
    }
    // Slight delay so it doesn't pop in immediately on page load
    const t = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(t);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => {
      setDismissed(true);
      localStorage.setItem('notificationPromptDismissed', 'true');
    }, 300);
  };

  const handleEnable = async () => {
    setLoading(true);
    const granted = await requestPermission();
    setLoading(false);
    if (granted) {
      setVisible(false);
      setTimeout(() => setDismissed(true), 300);
    }
  };

  if (!isSupported || permission === 'granted' || permission === 'denied' || dismissed) {
    return null;
  }

  return (
    <>
      <style>{`
        @keyframes notifSlideIn {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes notifSlideOut {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to   { opacity: 0; transform: translateY(16px) scale(0.97); }
        }
        .notif-prompt-enter { animation: notifSlideIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .notif-prompt-exit  { animation: notifSlideOut 0.25s ease forwards; }

        @keyframes bellRing {
          0%, 100% { transform: rotate(0); }
          15%       { transform: rotate(14deg); }
          30%       { transform: rotate(-10deg); }
          45%       { transform: rotate(8deg); }
          60%       { transform: rotate(-6deg); }
          75%       { transform: rotate(4deg); }
        }
        .bell-ring { animation: bellRing 1.6s ease 0.6s both; }
      `}</style>

      <div
        className={`fixed right-4 z-[9990] w-[calc(100vw-2rem)] max-w-[320px] ${
          visible ? 'notif-prompt-enter' : 'notif-prompt-exit'
        }`}
        // sits above bottom nav (64px) + a little gap
        style={{ bottom: 'calc(72px + max(env(safe-area-inset-bottom), 16px) + 12px)' }}
      >
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: '#fff',
            boxShadow: '0 8px 32px rgba(26,63,143,0.16), 0 2px 8px rgba(0,0,0,0.06)',
            border: '1px solid rgba(59,158,245,0.15)',
          }}
        >
          {/* Gradient top bar */}
          <div
            className="h-1"
            style={{ background: 'linear-gradient(90deg, #1a3f8f, #3b9ef5)' }}
          />

          <div className="p-4">
            {/* Header row */}
            <div className="flex items-start gap-3 mb-3">
              {/* Bell icon */}
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bell-ring"
                style={{
                  background: 'linear-gradient(135deg, #1a3f8f, #3b9ef5)',
                  boxShadow: '0 4px 12px rgba(26,63,143,0.3)',
                }}
              >
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-sm leading-tight">
                  Stay in the loop 🔔
                </p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Get notified about your orders, deliveries, and messages instantly.
                </p>
              </div>

              {/* Close */}
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors -mt-0.5 -mr-0.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Benefit pills */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {['Order updates', 'Delivery alerts', 'New messages'].map((label) => (
                <span
                  key={label}
                  className="text-[10px] font-medium px-2 py-1 rounded-full"
                  style={{ background: 'rgba(59,158,245,0.08)', color: '#1a3f8f' }}
                >
                  ✓ {label}
                </span>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleEnable}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl text-white text-xs font-bold transition-opacity"
                style={{
                  background: 'linear-gradient(135deg, #1a3f8f, #3b9ef5)',
                  boxShadow: '0 4px 12px rgba(26,63,143,0.3)',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Enabling…' : 'Enable Notifications'}
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-2.5 rounded-xl text-xs font-medium text-gray-500 transition-colors"
                style={{ background: '#f3f4f6' }}
              >
                Later
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Notification event helpers — unchanged
// ─────────────────────────────────────────────────────────────────────────────
export function useNotificationEvents() {
  const { sendNotification, permission } = usePushNotifications();

  const notifyNewOrder = (orderNumber: string) => {
    if (permission === 'granted') {
      sendNotification('New Order Received! 🎉', {
        body: `Order #${orderNumber} has been placed`,
        tag: 'new-order',
        data: { url: '/orders/sales' },
      });
    }
  };

  const notifyOrderUpdate = (orderNumber: string, status: string) => {
    if (permission === 'granted') {
      sendNotification('Order Update', {
        body: `Order #${orderNumber} is now ${status}`,
        tag: 'order-update',
        data: { url: `/orders/${orderNumber}` },
      });
    }
  };

  const notifyNewMessage = (from: string) => {
    if (permission === 'granted') {
      sendNotification('New Message 💬', {
        body: `You have a new message from ${from}`,
        tag: 'new-message',
      });
    }
  };

  const notifyDispute = (orderNumber: string) => {
    if (permission === 'granted') {
      sendNotification('Dispute Alert ⚠️', {
        body: `A dispute has been opened for order #${orderNumber}`,
        tag: 'dispute',
        data: { url: '/disputes' },
      });
    }
  };

  const notifyReview = (productName: string) => {
    if (permission === 'granted') {
      sendNotification('New Review ⭐', {
        body: `${productName} has received a new review`,
        tag: 'new-review',
      });
    }
  };

  return {
    notifyNewOrder,
    notifyOrderUpdate,
    notifyNewMessage,
    notifyDispute,
    notifyReview,
  };
}