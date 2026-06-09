import { useGlobalAnimations } from './styles/animations';
import { useGameInit }         from './hooks/useGameInit';
import AppRouter               from './router';
import PwaUpdater              from './components/PwaUpdater';
import { FONT_PIXEL }          from './styles/tokens';

/**
 * App root.
 *
 * Responsibilities:
 *   1. Inject global fonts + keyframe animations (once, idempotent).
 *   2. Initialise the game: load from Dexie or create a new save.
 *      While this is in flight (<100 ms on fast devices) render a splash.
 *   3. Once ready, mount the router — all screen logic lives inside AppRouter.
 */
export default function App() {
  useGlobalAnimations();
  const initStatus = useGameInit();

  if (initStatus === 'loading') {
    return (
      <div style={{
        background: '#0a1220',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
      }}>
        <div style={{ fontSize: 40 }}>⚡</div>
        <div style={{ fontFamily: FONT_PIXEL, fontSize: 8, color: '#FFCB05', letterSpacing: 2 }}>
          LOADING…
        </div>
      </div>
    );
  }

  if (initStatus === 'error') {
    return (
      <div style={{
        background: '#0a1220',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: 24,
      }}>
        <div style={{ fontFamily: FONT_PIXEL, fontSize: 8, color: '#CC0000', textAlign: 'center' }}>
          FAILED TO LOAD SAVE
        </div>
        <div style={{ fontSize: 12, color: '#8892b8', textAlign: 'center' }}>
          Check the browser console for details.
        </div>
      </div>
    );
  }

  return (
    <>
      <PwaUpdater />
      <AppRouter />
    </>
  );
}
