/**
 * Updates the PWA App Icon Badge count.
 * Uses the Web App Badging API (navigator.setAppBadge) when supported.
 */

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') return true;
      if (Notification.permission !== 'denied') {
        const res = await Notification.requestPermission();
        return res === 'granted';
      }
    }
  } catch (err) {
    console.warn('Notification permission request failed:', err);
  }
  return false;
}

export async function updateAppBadge(count: number): Promise<void> {
  try {
    if ('setAppBadge' in navigator) {
      if (count > 0) {
        await navigator.setAppBadge(count);
      } else {
        await navigator.clearAppBadge();
      }
    }
  } catch (error) {
    console.warn('App Badge API update failed:', error);
  }

  // Update document title fallback for web browser tab
  const baseTitle = 'Cue Notes';
  if (count > 0) {
    document.title = `(${count}) ${baseTitle}`;
  } else {
    document.title = baseTitle;
  }
}
