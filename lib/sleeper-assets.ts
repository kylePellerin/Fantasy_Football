// Pure, client-safe Sleeper asset URL helpers (no node/axios imports).

export function sleeperAvatar(avatar: string | null): string | undefined {
  return avatar ? `https://sleepercdn.com/avatars/thumbs/${avatar}` : undefined;
}

/** Player headshot from the Sleeper CDN (works for any valid player_id). */
export function sleeperHeadshot(playerId: string): string {
  return `https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`;
}

/** Team defense / logo image from the Sleeper CDN. */
export function sleeperTeamLogo(team: string): string {
  return `https://sleepercdn.com/images/team_logos/nfl/${team.toLowerCase()}.png`;
}
