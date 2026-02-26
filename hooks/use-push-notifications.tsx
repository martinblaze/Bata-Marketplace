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

      // Add vibration separately if supported
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

export function NotificationPrompt() {
  const { permission, isSupported, requestPermission } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const wasDismissed = localStorage.getItem('notificationPromptDismissed');
    if (wasDismissed) {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('notificationPromptDismissed', 'true');
  };

  const handleEnable = async () => {
    const granted = await requestPermission();
    if (granted) {
      setDismissed(true);
    }
  };

  if (!isSupported || permission === 'granted' || permission === 'denied' || dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-20 lg:bottom-4 right-4 max-w-sm bg-white rounded-lg shadow-2xl border border-gray-200 p-4 z-40 animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
          🔔
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 mb-1">
            Stay Updated
          </h4>
          <p className="text-sm text-gray-600 mb-3">
            Enable notifications to get updates about your orders, messages, and more.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleEnable}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Enable
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
  );
}

// Utility to show notification for specific events
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