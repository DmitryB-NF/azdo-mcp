export default {
  api: 'https://dev.azure.com',
  extmgmtApi: 'https://extmgmt.dev.azure.com',
  extmgmtApiVersion: '7.1-preview.1',
  org: requireEnv(process.env.CLAUDE_PLUGIN_OPTION_AZDO_ORG || process.env.AZDO_ORG, 'AZDO_ORG'),
  pat: requireEnv(process.env.CLAUDE_PLUGIN_OPTION_AZDO_PAT || process.env.AZDO_PAT, 'AZDO_PAT'),
  userEmail: process.env.CLAUDE_PLUGIN_OPTION_AZDO_USER_EMAIL || process.env.AZDO_USER_EMAIL,
  defaultProject: process.env.CLAUDE_PLUGIN_OPTION_AZDO_DEFAULT_PROJECT || process.env.AZDO_DEFAULT_PROJECT,
  defaultTeam: process.env.CLAUDE_PLUGIN_OPTION_AZDO_DEFAULT_TEAM || process.env.AZDO_DEFAULT_TEAM,
};

function requireEnv (value: string | undefined, key: string): string {
  if (!value) throw new Error(`${key} is required`);
  return value;
}
