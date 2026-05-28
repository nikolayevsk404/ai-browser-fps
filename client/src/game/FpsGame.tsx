import { useEffect, useMemo, useState } from "react";
import type { GameState, TeamId } from "@ai-browser-fps/shared";
import { PROTOCOL_VERSION, TDM_SCORE_LIMIT } from "@ai-browser-fps/shared";
import { setMasterVolume } from "../audio/soundEngine";
import { FpsScene } from "../three/FpsScene";
import { colliders, mapBounds, zones } from "../three/gameMap";
import type { ConnectionStatus } from "../network/useGameSocket";

type Screen = "menu" | "team" | "playing" | "settings";

type FpsGameProps = {
  clientId: string | null;
  gameState: GameState | null;
  lastPongAt: string | null;
  onEquipWeapon: (weapon: import("@ai-browser-fps/shared").WeaponId) => void;
  onPlayerPosition: (position: GameState["players"][number]["position"]) => void;
  onRestartMatch: () => void;
  onSelectTeam: (team: TeamId) => void;
  onShoot: (
    origin: GameState["players"][number]["position"],
    direction: GameState["players"][number]["position"],
    weapon: import("@ai-browser-fps/shared").WeaponId
  ) => void;
  serverMessage: string;
  status: ConnectionStatus;
  statusLabel: string;
};

export function FpsGame({
  clientId,
  gameState,
  lastPongAt,
  onEquipWeapon,
  onPlayerPosition,
  onRestartMatch,
  onSelectTeam,
  onShoot,
  serverMessage,
  status,
  statusLabel
}: FpsGameProps) {
  const [screen, setScreen] = useState<Screen>("menu");
  const [returnScreen, setReturnScreen] = useState<Screen>("menu");
  const [scoreboardOpen, setScoreboardOpen] = useState(false);
  const [tacticalMapOpen, setTacticalMapOpen] = useState(false);
  const [sensitivity, setSensitivity] = useState(0.55);
  const [volume, setVolume] = useState(0.45);
  const [pendingTeam, setPendingTeam] = useState<{ team: TeamId; requestedAt: number } | null>(null);
  const player = gameState?.players.find((candidate) => candidate.id === "player");
  const matchRemainingMs = getMatchRemainingMs(gameState);
  const respawnMs = getRespawnRemainingMs(gameState, player);
  const uiLocked = screen !== "playing" || scoreboardOpen || tacticalMapOpen;
  const sceneOverviewMode = screen === "menu" || screen === "team" || (screen === "settings" && returnScreen !== "playing");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "F5") {
        event.preventDefault();
        setScoreboardOpen(false);
        setTacticalMapOpen(false);
        onRestartMatch();
      }
      if (event.code === "KeyM") {
        setTacticalMapOpen((value) => !value);
      }
      if (event.code === "KeyP") {
        setScoreboardOpen((value) => !value);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onRestartMatch]);

  const matchStats = useMemo(
    () => ({
      ctAlive: countAlive(gameState, "CT"),
      trAlive: countAlive(gameState, "TR")
    }),
    [gameState]
  );

  useEffect(() => {
    if (!pendingTeam || screen !== "team" || !gameState) {
      return;
    }

    const teamConfirmed = gameState.match.selectedTeam === pendingTeam.team;
    const matchStartedAfterSelection = gameState.match.startedAt >= pendingTeam.requestedAt - 1000;

    if (gameState.match.phase === "running" && teamConfirmed && matchStartedAfterSelection) {
      setPendingTeam(null);
      setScreen("playing");
    }
  }, [gameState, pendingTeam, screen]);

  return (
    <main className="game-shell">
      <FpsScene
        gameState={gameState}
        onEquipWeapon={onEquipWeapon}
        onPlayerPosition={onPlayerPosition}
        onShoot={onShoot}
        overviewMode={sceneOverviewMode}
        sensitivity={sensitivity}
        uiLocked={uiLocked}
        volume={volume}
      />
      {screen === "playing" && !uiLocked ? <div className="crosshair" aria-hidden="true" /> : null}

      <HeaderHud
        gameState={gameState}
        matchRemainingMs={matchRemainingMs}
        ctAlive={matchStats.ctAlive}
        trAlive={matchStats.trAlive}
        onSettings={() => {
          setReturnScreen("playing");
          setScreen("settings");
        }}
      />

      {screen === "playing" ? <PlayerHud player={player} respawnMs={respawnMs} /> : null}

      {screen === "playing" && player && !player.alive ? <DeathOverlay respawnMs={respawnMs} /> : null}

      {scoreboardOpen ? <Scoreboard state={gameState} onClose={() => setScoreboardOpen(false)} /> : null}
      {tacticalMapOpen ? <TacticalMap state={gameState} onClose={() => setTacticalMapOpen(false)} /> : null}

      {gameState?.match.phase === "ended" ? <EndMatchOverlay state={gameState} onRestart={onRestartMatch} /> : null}

      {screen === "menu" ? (
        <MainMenu
          clientId={clientId}
          lastPongAt={lastPongAt}
          serverMessage={serverMessage}
          status={status}
          statusLabel={statusLabel}
          onPlay={() => {
            setPendingTeam(null);
            setScreen("team");
          }}
          onSettings={() => {
            setReturnScreen("menu");
            setScreen("settings");
          }}
        />
      ) : null}

      {screen === "team" ? (
        <TeamSelect
          pendingTeam={pendingTeam?.team ?? null}
          selectedTeam={gameState?.match.selectedTeam ?? "CT"}
          onSelect={(team) => {
            setPendingTeam({ team, requestedAt: Date.now() });
            onSelectTeam(team);
          }}
        />
      ) : null}

      {screen === "settings" ? (
        <SettingsPanel
          sensitivity={sensitivity}
          volume={volume}
          onBack={() => setScreen(returnScreen)}
          onSensitivity={setSensitivity}
          onVolume={(value) => {
            setVolume(value);
            setMasterVolume(value);
          }}
        />
      ) : null}
    </main>
  );
}

function HeaderHud({
  ctAlive,
  gameState,
  matchRemainingMs,
  onSettings,
  trAlive
}: {
  ctAlive: number;
  gameState: GameState | null;
  matchRemainingMs: number;
  onSettings: () => void;
  trAlive: number;
}) {
  const scoreLimit = gameState?.match.scoreLimit ?? TDM_SCORE_LIMIT;

  return (
    <section className="hud hud-top final-top" aria-label="Partida">
      <ScoreBlock label="CT" score={gameState?.match.teams.CT.score ?? 0} alive={ctAlive} limit={scoreLimit} />
      <div className="round-pill">
        <span>Abandoned City</span>
        <strong>{formatTime(matchRemainingMs)}</strong>
        <small>first to {scoreLimit}</small>
      </div>
      <ScoreBlock label="TR" score={gameState?.match.teams.TR.score ?? 0} alive={trAlive} limit={scoreLimit} />
      <button type="button" className="icon-btn" onClick={onSettings} aria-label="Configurações">
        CFG
      </button>
    </section>
  );
}

function PlayerHud({
  player,
  respawnMs
}: {
  player: GameState["players"][number] | undefined;
  respawnMs: number;
}) {
  return (
    <section className="hud player-status" aria-label="Jogador">
      <div>
        <span>HP</span>
        <strong>{player?.health ?? 100}</strong>
      </div>
      <div>
        <span>K/D</span>
        <strong>
          {player?.stats.kills ?? 0}/{player?.stats.deaths ?? 0}
        </strong>
      </div>
      <div>
        <span>Weapon</span>
        <strong>{player?.weapon ?? "pistol"}</strong>
      </div>
      {respawnMs > 0 ? (
        <div>
          <span>Respawn</span>
          <strong>{(respawnMs / 1000).toFixed(1)}s</strong>
        </div>
      ) : null}
    </section>
  );
}

function DeathOverlay({ respawnMs }: { respawnMs: number }) {
  return (
    <section className="death-panel" aria-live="polite">
      <span>Eliminated</span>
      <strong>{respawnMs > 0 ? `Respawn em ${(respawnMs / 1000).toFixed(1)}s` : "Respawning..."}</strong>
    </section>
  );
}

function Scoreboard({ onClose, state }: { onClose: () => void; state: GameState | null }) {
  const players = state?.players ?? [];

  return (
    <section className="modal-panel scoreboard-panel" aria-label="Scoreboard">
      <header>
        <h2>Scoreboard</h2>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar">
          X
        </button>
      </header>
      <div className="scoreboard-grid">
        {(["CT", "TR"] as TeamId[]).map((team) => (
          <div key={team}>
            <h3>
              {team} <strong>{state?.match.teams[team].score ?? 0}</strong>
            </h3>
            <ul>
              {players
                .filter((player) => player.team === team)
                .map((player) => (
                  <li key={player.id} className={player.alive ? "" : "dead"}>
                    <span>{player.name}</span>
                    <span>{player.alive ? "alive" : "dead"}</span>
                    <span>{player.weapon}</span>
                    <strong>
                      {player.stats.kills}/{player.stats.deaths}
                    </strong>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function TacticalMap({ onClose, state }: { onClose: () => void; state: GameState | null }) {
  const player = state?.players.find((candidate) => candidate.id === "player");
  const allies = state?.players.filter((candidate) => candidate.team === player?.team && candidate.alive) ?? [];

  return (
    <section className="tactical-map" aria-label="Mapa tático">
      <header>
        <div>
          <span>GPS Tactical</span>
          <strong>Abandoned City</strong>
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar mapa">
          M
        </button>
      </header>
      <div className="map-board">
        {zones.map((zone) => (
          <div
            key={zone.id}
            className="map-zone"
            style={{
              left: `${toMapX(zone.center.x - zone.size.x / 2)}%`,
              top: `${toMapZ(zone.center.z - zone.size.z / 2)}%`,
              width: `${toMapWidth(zone.size.x)}%`,
              height: `${toMapHeight(zone.size.z)}%`,
              borderColor: `#${zone.color.toString(16).padStart(6, "0")}`
            }}
          />
        ))}
        {colliders.map((collider) => (
          <div
            key={collider.id}
            className={`map-wall map-wall-${collider.kind}`}
            style={{
              left: `${toMapX(collider.minX)}%`,
              top: `${toMapZ(collider.minZ)}%`,
              width: `${toMapWidth(collider.maxX - collider.minX)}%`,
              height: `${toMapHeight(collider.maxZ - collider.minZ)}%`
            }}
          />
        ))}
        {allies.map((ally) => (
          <div
            key={ally.id}
            className={`map-player ${ally.id === "player" ? "self" : ""}`}
            style={{
              left: `${toMapX(ally.position.x)}%`,
              top: `${toMapZ(ally.position.z)}%`
            }}
            title={ally.name}
          >
            {ally.id === "player" ? "YOU" : ally.name.slice(0, 2).toUpperCase()}
          </div>
        ))}
      </div>
    </section>
  );
}

function MainMenu({
  clientId,
  lastPongAt,
  onPlay,
  onSettings,
  serverMessage,
  status,
  statusLabel
}: {
  clientId: string | null;
  lastPongAt: string | null;
  onPlay: () => void;
  onSettings: () => void;
  serverMessage: string;
  status: ConnectionStatus;
  statusLabel: string;
}) {
  return (
    <section className="modal-panel main-menu" aria-label="Menu principal">
      <p className="eyebrow">Team Deathmatch</p>
      <h1>Abandoned City</h1>
      <p className="menu-tagline">Night fight through a ruined city reclaimed by forest.</p>
      <div className="menu-actions">
        <button type="button" onClick={onPlay}>
          Play
        </button>
        <button type="button" onClick={onSettings}>
          Settings
        </button>
      </div>
      <dl className="compact-list">
        <div>
          <dt>WebSocket</dt>
          <dd className={`status status-${status}`}>{statusLabel}</dd>
        </div>
        <div>
          <dt>Server</dt>
          <dd>{serverMessage}</dd>
        </div>
        <div>
          <dt>Client</dt>
          <dd>{clientId ?? "sync"}</dd>
        </div>
        <div>
          <dt>Pong</dt>
          <dd>{lastPongAt ?? "sync"}</dd>
        </div>
        <div>
          <dt>Protocol</dt>
          <dd>{PROTOCOL_VERSION}</dd>
        </div>
      </dl>
    </section>
  );
}

function TeamSelect({
  onSelect,
  pendingTeam,
  selectedTeam
}: {
  onSelect: (team: TeamId) => void;
  pendingTeam: TeamId | null;
  selectedTeam: TeamId;
}) {
  const waiting = pendingTeam !== null;

  return (
    <section className="modal-panel team-panel" aria-label="Seleção de time">
      <h2>Select Team</h2>
      <div className="team-options">
        <button type="button" className={selectedTeam === "CT" ? "active" : ""} disabled={waiting} onClick={() => onSelect("CT")}>
          {pendingTeam === "CT" ? "Entering CT..." : "Counter-Terrorists"}
        </button>
        <button type="button" className={selectedTeam === "TR" ? "active" : ""} disabled={waiting} onClick={() => onSelect("TR")}>
          {pendingTeam === "TR" ? "Entering TR..." : "Terrorists"}
        </button>
      </div>
    </section>
  );
}

function SettingsPanel({
  onBack,
  onSensitivity,
  onVolume,
  sensitivity,
  volume
}: {
  onBack: () => void;
  onSensitivity: (value: number) => void;
  onVolume: (value: number) => void;
  sensitivity: number;
  volume: number;
}) {
  return (
    <section className="modal-panel settings-panel" aria-label="Configurações">
      <header>
        <h2>Settings</h2>
        <button type="button" className="icon-btn" onClick={onBack} aria-label="Voltar">
          X
        </button>
      </header>
      <label>
        <span>Sensitivity</span>
        <input min="0" max="1" step="0.01" type="range" value={sensitivity} onChange={(event) => onSensitivity(Number(event.target.value))} />
      </label>
      <label>
        <span>Volume</span>
        <input min="0" max="1" step="0.01" type="range" value={volume} onChange={(event) => onVolume(Number(event.target.value))} />
      </label>
      <p className="settings-hint">1/2/3 — Weapons · L — AI Logs · P — Scoreboard</p>
    </section>
  );
}

function EndMatchOverlay({ onRestart, state }: { onRestart: () => void; state: GameState }) {
  return (
    <section className="modal-panel end-panel" aria-label="Fim de partida">
      <p className="eyebrow">Match Complete</p>
      <h2>{state.match.winner === "draw" ? "Draw" : `${state.match.winner} wins`}</h2>
      <button type="button" onClick={onRestart}>
        New Match
      </button>
    </section>
  );
}

function ScoreBlock({ alive, label, limit, score }: { label: TeamId; score: number; alive: number; limit: number }) {
  return (
    <div className="score-mini">
      <span>{label}</span>
      <strong>
        {score}/{limit}
      </strong>
      <small>{alive} alive</small>
    </div>
  );
}

function countAlive(state: GameState | null, team: TeamId): number {
  return state?.players.filter((player) => player.team === team && player.alive).length ?? 0;
}

function getMatchRemainingMs(state: GameState | null): number {
  if (!state || state.match.phase === "ended") return 0;
  if (state.match.phase === "lobby") return state.match.matchDurationMs;
  return Math.max(0, state.match.endsAt - state.serverTime);
}

function getRespawnRemainingMs(state: GameState | null, player: GameState["players"][number] | undefined): number {
  if (!state || !player || player.alive || !player.respawnAt) return 0;
  return Math.max(0, player.respawnAt - state.serverTime);
}

function formatTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function toMapX(x: number): number {
  return ((x - mapBounds.minX) / (mapBounds.maxX - mapBounds.minX)) * 100;
}

function toMapZ(z: number): number {
  return ((z - mapBounds.minZ) / (mapBounds.maxZ - mapBounds.minZ)) * 100;
}

function toMapWidth(width: number): number {
  return (width / (mapBounds.maxX - mapBounds.minX)) * 100;
}

function toMapHeight(height: number): number {
  return (height / (mapBounds.maxZ - mapBounds.minZ)) * 100;
}
