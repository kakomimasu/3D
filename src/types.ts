export type PlayerId = 0 | 1;
export interface Tile { type: 0 | 1; player: PlayerId | -1 | null }
export interface Agent { x: number; y: number }
export interface Player {
  id?: string;
  name?: string;
  agents: Agent[];
  point?: { wallPoint: number; areaPoint: number };
}
export interface Game {
  id: string;
  name?: string;
  turn?: number;
  status?: string;
  ending?: boolean;
  startedAtUnixTime?: number | null;
  field: { width: number; height: number; points: number[]; tiles: Tile[] };
  players: Player[];
  log?: { players: { actions?: { res: number; x: number; y: number }[] }[] }[];
}
export interface MatchSummary {
  id: string;
  name: string;
  players: string;
  status: string;
  startedAt: number | null;
  turn: number;
}
export type ViewMode = 'studio' | 'players' | 'angle' | 'top';
export type Vec3 = [number, number, number];
