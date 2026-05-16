export const VISIBILITY = {
  INTERNAL: "internal",
  CLIENT: "client_visible",
  TEAM: "team_only",
  MANAGEMENT: "management",
} as const;

export type VisibilityValue = typeof VISIBILITY[keyof typeof VISIBILITY];
