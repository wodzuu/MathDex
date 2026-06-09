import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { usePwaStore } from '../store/pwaStore';

/**
 * Registers the service worker (prompt mode) and mirrors the "new version
 * available" state into the PWA store, so the Town hub can render its update
 * panel. Renders nothing itself.
 *
 * Mounted once at the app root.
 */
export default function PwaUpdater() {
  const setNeedRefresh = usePwaStore((s) => s.setNeedRefresh);
  const setUpdate      = usePwaStore((s) => s.setUpdate);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  // Surface whether an update is waiting.
  useEffect(() => {
    setNeedRefresh(needRefresh);
  }, [needRefresh, setNeedRefresh]);

  // Expose the "apply update + reload" action.
  useEffect(() => {
    setUpdate(() => updateServiceWorker(true));
  }, [updateServiceWorker, setUpdate]);

  return null;
}
