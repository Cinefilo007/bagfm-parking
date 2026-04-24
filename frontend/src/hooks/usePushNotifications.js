import { useState, useCallback, useEffect } from 'react';
import api from '../services/api';

/**
 * Hook para gestionar suscripciones a Notificaciones Push VAPID.
 */
export function usePushNotifications() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [error, setError] = useState(null);

  const subscribeUser = useCallback(async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('Notificaciones Push no soportadas en este navegador');
      }

      const registration = await navigator.serviceWorker.ready;
      
      // Obtener clave pública VAPID del env
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        const errorMsg = 'Error Crítico: VITE_VAPID_PUBLIC_KEY no encontrada en el entorno de ejecución.';
        console.error(errorMsg);
        setError(errorMsg);
        return;
      }

      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });

      // Enviar al backend
      const p256dh = btoa(String.fromCharCode.apply(null, new Uint8Array(sub.getKey('p256dh'))));
      const auth = btoa(String.fromCharCode.apply(null, new Uint8Array(sub.getKey('auth'))));

      const payload = {
        endpoint: sub.endpoint,
        p256dh: p256dh,
        auth: auth,
        dispositivo: navigator.userAgent.substring(0, 100)
      };

      await api.post('/notificaciones/suscribir', payload);
      
      setSubscription(sub);
      setIsSubscribed(true);
      console.log('✅ Suscripción Push exitosa');
    } catch (err) {
      console.error('❌ Error suscribiendo a Push:', err);
      setError(err.message);
    }
  }, []);

  return { isSubscribed, subscription, error, subscribeUser };
}

// Helper para convertir la clave VAPID
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
