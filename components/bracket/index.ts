/**
 * Bracket — public entry points (ticket #179).
 */

export { Bracket } from "./bracket";
export type { BracketProps } from "./bracket";

export { BracketNode } from "./bracket-node";
export type { BracketNodeProps } from "./bracket-node";

export { BracketConnector } from "./bracket-lines";
export type { BracketConnectorProps } from "./bracket-lines";

export {
  buildBracketVMs,
  roundLabel,
} from "./types";
export type {
  BracketMatch,
  BracketNode as BracketNodeTrace,
  BracketNodeVM,
  BracketSideVM,
} from "./types";
