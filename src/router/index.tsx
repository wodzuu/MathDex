import { createHashRouter, RouterProvider } from 'react-router-dom';
import TownScreen from '../screens/TownScreen';
import DungeonScreen from '../screens/Dungeon';
import BattleScreen from '../screens/BattleScreen';
import IdentifyScreen from '../screens/IdentifyScreen';
import EquipScreen from '../screens/EquipScreen';
import PCScreen from '../screens/PCScreen';
import MartScreen from '../screens/MartScreen';
import PokedexScreen from '../screens/Pokedex';
import ResetScreen from '../screens/ResetScreen';

/**
 * Application routes.
 *
 * Route layout mirrors the two-location game structure (Town / Dungeon).
 * Battle, Identify, and Equip are separate routes even though they can be
 * reached from both locations — this makes the back-button / navigation
 * history work naturally on mobile. Spec §2.
 */
const router = createHashRouter([
  { path: '/',          element: <TownScreen /> },
  { path: '/dungeon',   element: <DungeonScreen /> },
  { path: '/battle',    element: <BattleScreen /> },
  { path: '/identify',  element: <IdentifyScreen /> },
  { path: '/equip',     element: <EquipScreen /> },
  { path: '/pc',        element: <PCScreen /> },
  { path: '/mart',      element: <MartScreen /> },
  { path: '/pokedex',   element: <PokedexScreen /> },
  { path: '/reset',     element: <ResetScreen /> },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
