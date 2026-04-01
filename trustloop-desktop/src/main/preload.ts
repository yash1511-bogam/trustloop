import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("trustloop", {
  // Auth
  sendOtp: (email: string) => ipcRenderer.invoke("auth:send-otp", email),
  verifyOtp: (methodId: string, code: string) => ipcRenderer.invoke("auth:verify-otp", methodId, code),
  getSession: () => ipcRenderer.invoke("auth:session"),
  logout: () => ipcRenderer.invoke("auth:logout"),
  isDev: () => ipcRenderer.invoke("auth:is-dev"),
  oauthStart: (provider: "google" | "github", intent?: "login" | "register", workspaceName?: string) => ipcRenderer.invoke("auth:oauth-start", provider, intent, workspaceName),
  devLogin: () => ipcRenderer.invoke("auth:dev-login"),

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
  incidentDetail: (id: string) => ipcRenderer.invoke("incidents:detail", id),
  updateIncident: (id: string, data: any) => ipcRenderer.invoke("incidents:update", id, data),
  addIncidentEvent: (id: string, body: string, eventType?: string) => ipcRenderer.invoke("incidents:add-event", id, body, eventType),

  // Workspace
  workspaceInfo: () => ipcRenderer.invoke("workspace:info"),
  workspaceOverview: () => ipcRenderer.invoke("workspace:overview"),
  workspaceQuotas: () => ipcRenderer.invoke("workspace:quotas"),

  // Analytics
  analyticsSummary: () => ipcRenderer.invoke("analytics:summary"),

  // Profile
  getProfile: () => ipcRenderer.invoke("profile:get"),
  updateProfile: (data: { name?: string; phone?: string | null }) => ipcRenderer.invoke("profile:update", data),

  // Workspace settings
  workspaceGeneral: () => ipcRenderer.invoke("workspace:general"),
  workspaceUpdate: (data: { name?: string; complianceMode?: boolean }) => ipcRenderer.invoke("workspace:update", data),
  workspaceTeam: () => ipcRenderer.invoke("workspace:team"),
  workspaceBilling: () => ipcRenderer.invoke("workspace:billing"),

  // Integrations
  integrationsAi: () => ipcRenderer.invoke("integrations:ai"),
  integrationsWebhooks: () => ipcRenderer.invoke("integrations:webhooks"),
  integrationsOnCall: () => ipcRenderer.invoke("integrations:oncall"),

  // Security
  securityApiKeys: () => ipcRenderer.invoke("security:apikeys"),
  securityAudit: (opts?: { page?: number }) => ipcRenderer.invoke("security:audit", opts),
  securitySso: () => ipcRenderer.invoke("security:sso"),

  // Navigation from native menu
  onNavigate: (cb: (page: string) => void) => {
    ipcRenderer.on("navigate", (_e: any, page: string) => cb(page));
  },
  onOAuthCallback: (cb: (token: string, provider: string) => void) => {
    ipcRenderer.on("oauth-callback", (_e: any, token: string, provider: string) => cb(token, provider));
  },
});
