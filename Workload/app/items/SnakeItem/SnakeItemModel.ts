/**
 * Snake Item Model
 * Defines the data structure for the Snake game item
 */

export interface SnakeGameState {
  highScore?: number;
  totalCompetitorsEaten?: number;
}

export interface SnakeItemDefinition {
  state?: string;
  gameState?: SnakeGameState;
}

export const VIEW_TYPES = {
  GAME: 'game',
} as const;

export type CurrentView = typeof VIEW_TYPES[keyof typeof VIEW_TYPES];
