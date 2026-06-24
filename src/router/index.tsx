import { createHashRouter, RouterProvider } from 'react-router-dom';
import TownScreen from '../screens/TownScreen';
import DungeonScreen from '../screens/Dungeon';
import BattleScreen from '../screens/BattleScreen';
import SummaryScreen from '../screens/SummaryScreen';
import IdentifyScreen from '../screens/IdentifyScreen';
import EquipScreen from '../screens/EquipScreen';
import PCScreen from '../screens/PCScreen';
import MartScreen from '../screens/MartScreen';
import PokedexScreen from '../screens/Pokedex';
import PokemonDetailScreen from '../screens/PokemonDetail';
import TrainerDetailScreen from '../screens/TrainerDetail';
import NewTrainerScreen from '../screens/NewTrainerScreen';
import ResetScreen from '../screens/ResetScreen';
import TrainerGuard from '../components/TrainerGuard';

/**
 * Application routes.
 *
 * Route layout mirrors the two-location game structure (Town / Dungeon).
 * Battle, Identify, and Equip are separate routes even though they can be
 * reached from both locations — this makes the back-button / navigation
 * history work naturally on mobile. Spec §2.
 *
 * Every gameplay route lives under <TrainerGuard>, which redirects to
 * /new-trainer until the player has created their first trainer. /new-trainer
 * and /reset sit outside the guard.
 */
const router = createHashRouter([
  { path: '/new-trainer', element: <NewTrainerScreen /> },
  { path: '/reset',       element: <ResetScreen /> },
  {
    element: <TrainerGuard />,
    children: [
      { path: '/',          element: <TownScreen /> },
      { path: '/dungeon',   element: <DungeonScreen /> },
      { path: '/battle',    element: <BattleScreen /> },
      { path: '/summary',   element: <SummaryScreen /> },
      { path: '/identify',  element: <IdentifyScreen /> },
      { path: '/equip',     element: <EquipScreen /> },
      { path: '/pc',        element: <PCScreen /> },
      { path: '/mart',      element: <MartScreen /> },
      { path: '/pokedex',     element: <PokedexScreen /> },
      { path: '/pokemon/:id', element: <PokemonDetailScreen /> },
      { path: '/trainer',     element: <TrainerDetailScreen /> },
    ],
  },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
