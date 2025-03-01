import { useLocation } from 'react-router-dom';
import GridBackground from './GridBackground';
import StarsBackground from './StarsBackground';

// Paths where backgrounds should be disabled
const DISABLE_BACKGROUNDS_PATHS: string[] = [];

export default function BackgroundManager() {
  const pathname = useLocation().pathname;
  
  // Check if backgrounds should be disabled for current path
  const shouldDisableBackgrounds = DISABLE_BACKGROUNDS_PATHS.some(
    (path) => pathname === path
  );

  if (shouldDisableBackgrounds) {
    return null;
  }

  return (
    <>
      <GridBackground />
      <StarsBackground />
    </>
  );
} 