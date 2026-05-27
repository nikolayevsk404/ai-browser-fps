import type { GameState, TeamId, Vector3, WeaponId } from "../types/game.js";
export type ClientMessage = HealthPingMessage | SelectTeamMessage | EquipWeaponMessage | PlayerShootMessage | RestartMatchMessage | PlayerPositionMessage;
export type ServerMessage = ConnectionAcceptedMessage | HealthPongMessage | GameStateMessage | ServerNoticeMessage;
export type HealthPingMessage = {
    type: "health/ping";
    payload: {
        sentAt: number;
    };
};
export type HealthPongMessage = {
    type: "health/pong";
    payload: {
        sentAt: number;
        serverTime: number;
    };
};
export type ConnectionAcceptedMessage = {
    type: "connection/accepted";
    payload: {
        clientId: string;
        protocolVersion: string;
        message: string;
    };
};
export type GameStateMessage = {
    type: "game/state";
    payload: GameState;
};
export type SelectTeamMessage = {
    type: "player/select-team";
    payload: {
        team: TeamId;
    };
};
export type EquipWeaponMessage = {
    type: "player/equip";
    payload: {
        weapon: WeaponId;
    };
};
export type PlayerShootMessage = {
    type: "player/shoot";
    payload: {
        origin: Vector3;
        direction: Vector3;
        weapon: WeaponId;
    };
};
export type RestartMatchMessage = {
    type: "match/restart";
};
export type PlayerPositionMessage = {
    type: "player/position";
    payload: {
        position: Vector3;
    };
};
export type ServerNoticeMessage = {
    type: "server/notice";
    payload: {
        message: string;
    };
};
//# sourceMappingURL=messages.d.ts.map