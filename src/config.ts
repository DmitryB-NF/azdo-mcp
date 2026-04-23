export default {
  orgUrl: requireEnv('AZDO_ORG_URL'),
  pat: requireEnv('AZDO_PAT'),
  userEmail: process.env.AZDO_USER_EMAIL,
  defaultProject: process.env.AZDO_DEFAULT_PROJECT,
  defaultTeam: process.env.AZDO_DEFAULT_TEAM,
};

function requireEnv(key: string): string {
  if (!process.env[key]) throw new Error(`${key} is required`);
  return process.env[key];
}
