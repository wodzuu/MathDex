/**
 * Gate for every trainer-requiring route. Until the player has created their
 * first trainer (or if the active one is somehow missing), redirect to the
 * New Trainer screen so the rest of the app never renders without a trainer.
 */

import { Navigate, Outlet } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';

export default function TrainerGuard() {
  const hasTrainer = useGameStore((s) => s.trainers.some((t) => t.id === s.activeTrainerId));
  if (!hasTrainer) return <Navigate to="/new-trainer" replace />;
  return <Outlet />;
}
