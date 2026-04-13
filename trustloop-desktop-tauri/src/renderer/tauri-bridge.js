// Tauri bridge — replaces Electron's preload.ts
// Maps window.trustloop.* API to Tauri invoke() calls
// Same API surface so app.js works unchanged

const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;

window.trustloop = {
  assetsPath: 'assets',

  // Auth
  sendOtp: (email) => invoke('auth_send_otp', { email }),
  verifyOtp: (methodId, code) => invoke('auth_verify_otp', { methodId, code }),
  getSession: () => invoke('auth_session'),
  logout: () => invoke('auth_logout'),
  oauthStart: (provider, intent, workspaceName) => invoke('auth_oauth_start', { provider, intent, workspaceName }),

  // Registration
  registerStart: (opts) => invoke('auth_register_start', { opts }),
  registerVerify: (methodId, code) => invoke('auth_register_verify', { methodId, code }),

  // Dashboard
  dashboardData: () => invoke('dashboard_data'),

  // Incidents
  incidentsCounts: () => invoke('incidents_counts'),
  listIncidents: (opts) => invoke('incidents_list', { opts }),
  getIncident: (id) => invoke('incidents_get', { id }),
  updateIncidentStatus: (id, status) => invoke('incidents_update_status', { id, status }),
  createIncident: (data) => invoke('incidents_create', { data }),
  exportIncidentsCsv: () => invoke('incidents_export_csv'),
  incidentDetail: (id) => invoke('incidents_detail', { id }),
  updateIncident: (id, data) => invoke('incidents_update', { id, data }),
  publishStatusUpdate: (id, body) => invoke('incidents_publish_update', { id, body }),
  addIncidentEvent: (id, body, eventType) => invoke('incidents_add_event', { id, body, eventType }),

  // Workspace
  workspaceInfo: () => invoke('workspace_info'),
  workspaceOverview: () => invoke('workspace_overview'),

  // Analytics
  analyticsSummary: () => invoke('analytics_summary'),

  // Profile
  getProfile: () => invoke('profile_get'),
  dismissOnboarding: () => invoke('onboarding_dismiss'),
  refreshReadModels: () => invoke('workspace_refresh_read_models'),
  updateProfile: (data) => invoke('profile_update', { data }),

  // Workspace settings
  workspaceGeneral: () => invoke('workspace_general'),
  workspaceUpdate: (data) => invoke('workspace_update', { data }),
  workspaceTeam: () => invoke('workspace_team'),
  inviteTeamMember: (data) => invoke('team_invite', { data }),
  workspaceBilling: () => invoke('workspace_billing'),

  // Integrations
  integrationsAi: () => invoke('integrations_ai'),
  saveAiKey: (data) => invoke('ai_keys_save', { data }),
  testAiKey: (data) => invoke('ai_keys_test', { data }),
  saveWorkflow: (data) => invoke('workflows_save', { data }),
  integrationsWebhooks: () => invoke('integrations_webhooks'),
  saveWebhookSecret: (data) => invoke('webhooks_save_secret', { data }),
  rotateWebhookSecret: (type_) => invoke('webhooks_rotate_secret', { type: type_ }),
  toggleWebhook: (data) => invoke('webhooks_toggle', { data }),
  integrationsOnCall: () => invoke('integrations_oncall'),

  // Security
  securityApiKeys: () => invoke('security_apikeys'),
  createApiKey: (data) => invoke('apikeys_create', { data }),
  revokeApiKey: (id) => invoke('apikeys_revoke', { id }),
  securityAudit: (opts) => invoke('security_audit', { opts }),
  securitySso: () => invoke('security_sso'),
  saveSso: (data) => invoke('security_sso_save', { data }),

  // Navigation from native menu
  onNavigate: (cb) => { listen('navigate', (event) => cb(event.payload)); },
  openExternal: (url) => invoke('open_external', { url }),
  onOAuthCallback: (cb) => { listen('oauth-callback', (event) => cb(event.payload)); },

  // Updates
  onUpdateState: (cb) => { listen('update-state', (event) => cb(event.payload)); },
  updateDownload: () => invoke('update_download').catch(() => {}),
  updateInstall: () => invoke('update_install').catch(() => {}),
  updateDismiss: () => invoke('update_dismiss').catch(() => {}),
};
