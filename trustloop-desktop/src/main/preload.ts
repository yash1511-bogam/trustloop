import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("trustloop", {
  // Auth
  sendOtp: (email: string) => ipcRenderer.invoke("auth:send-otp", email),
  verifyOtp: (methodId: string, code: string) => ipcRenderer.invoke("auth:verify-otp", methodId, code),
  getSession: () => ipcRenderer.invoke("auth:session"),
  logout: () => ipcRenderer.invoke("auth:logout"),
  oauthStart: (provider: "google" | "github", intent?: "login" | "register", workspaceName?: string) => ipcRenderer.invoke("auth:oauth-start", provider, intent, workspaceName),

  // Registration
  registerStart: (opts: { name: string; email: string; workspaceName: string }) =>
    ipcRenderer.invoke("auth:register-start", opts),
  registerVerify: (methodId: string, code: string) =>
    ipcRenderer.invoke("auth:register-verify", methodId, code),

  // Dashboard (same data as DashboardPageClient props)
  dashboardData: () => ipcRenderer.invoke("dashboard:data"),

  // Incidents
  incidentsCounts: () => ipcRenderer.invoke("incidents:counts"),
  listIncidents: (opts?: any) => ipcRenderer.invoke("incidents:list", opts),
  getIncident: (id: string) => ipcRenderer.invoke("incidents:get", id),
  updateIncidentStatus: (id: string, status: string) => ipcRenderer.invoke("incidents:update-status", id, status),
  createIncident: (data: any) => ipcRenderer.invoke("incidents:create", data),
  exportIncidentsCsv: () => ipcRenderer.invoke("incidents:export-csv"),
  incidentDetail: (id: string) => ipcRenderer.invoke("incidents:detail", id),
  updateIncident: (id: string, data: any) => ipcRenderer.invoke("incidents:update", id, data),
  publishStatusUpdate: (id: string, body: string) => ipcRenderer.invoke("incidents:publish-update", id, body),
  addIncidentEvent: (id: string, body: string, eventType?: string) => ipcRenderer.invoke("incidents:add-event", id, body, eventType),

  // Workspace
  workspaceInfo: () => ipcRenderer.invoke("workspace:info"),
  workspaceOverview: () => ipcRenderer.invoke("workspace:overview"),

  // Analytics
  analyticsSummary: () => ipcRenderer.invoke("analytics:summary"),

  // Profile
  getProfile: () => ipcRenderer.invoke("profile:get"),
  dismissOnboarding: () => ipcRenderer.invoke("onboarding:dismiss"),
  refreshReadModels: () => ipcRenderer.invoke("workspace:refresh-read-models"),
  updateProfile: (data: { name?: string; phone?: string | null }) => ipcRenderer.invoke("profile:update", data),

  // Workspace settings
  workspaceGeneral: () => ipcRenderer.invoke("workspace:general"),
  workspaceUpdate: (data: { name?: string; complianceMode?: boolean }) => ipcRenderer.invoke("workspace:update", data),
  workspaceTeam: () => ipcRenderer.invoke("workspace:team"),
  inviteTeamMember: (data: any) => ipcRenderer.invoke("team:invite", data),
  workspaceBilling: () => ipcRenderer.invoke("workspace:billing"),

  // Integrations
  integrationsAi: () => ipcRenderer.invoke("integrations:ai"),
  saveAiKey: (data: any) => ipcRenderer.invoke("ai-keys:save", data),
  testAiKey: (data: any) => ipcRenderer.invoke("ai-keys:test", data),
  saveWorkflow: (data: any) => ipcRenderer.invoke("workflows:save", data),
  integrationsWebhooks: () => ipcRenderer.invoke("integrations:webhooks"),
  saveWebhookSecret: (data: any) => ipcRenderer.invoke("webhooks:save-secret", data),
  rotateWebhookSecret: (type: string) => ipcRenderer.invoke("webhooks:rotate-secret", type),
  toggleWebhook: (data: any) => ipcRenderer.invoke("webhooks:toggle", data),
  integrationsOnCall: () => ipcRenderer.invoke("integrations:oncall"),

  // Security
  securityApiKeys: () => ipcRenderer.invoke("security:apikeys"),
  createApiKey: (data: any) => ipcRenderer.invoke("apikeys:create", data),
  revokeApiKey: (id: string) => ipcRenderer.invoke("apikeys:revoke", id),
  securityAudit: (opts?: { page?: number }) => ipcRenderer.invoke("security:audit", opts),
  securitySso: () => ipcRenderer.invoke("security:sso"),
  saveSso: (data: any) => ipcRenderer.invoke("security:sso-save", data),

  // Navigation from native menu
  onNavigate: (cb: (page: string) => void) => {
    ipcRenderer.on("navigate", (_e: any, page: string) => cb(page));
  },
  openExternal: (url: string) => ipcRenderer.invoke("open-external", url),
  onOAuthCallback: (cb: (token: string, provider: string) => void) => {
    ipcRenderer.on("oauth-callback", (_e: any, token: string, provider: string) => cb(token, provider));
  },
});
