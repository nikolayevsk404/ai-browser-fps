import { FpsGame } from "../game/FpsGame";
import { useGameSocket } from "../network/useGameSocket";

export function App() {
  const socket = useGameSocket();

  return (
    <FpsGame
      clientId={socket.clientId}
      gameState={socket.gameState}
      lastPongAt={socket.lastPongAt}
      onEquipWeapon={socket.equipWeapon}
      onSelectTeam={socket.selectTeam}
      onPlayerPosition={socket.sendPlayerPosition}
      onRestartMatch={socket.restartMatch}
      onShoot={socket.shoot}
      serverMessage={socket.serverMessage}
      status={socket.status}
      statusLabel={socket.statusLabel}
    />
  );
}
