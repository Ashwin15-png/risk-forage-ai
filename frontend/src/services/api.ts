import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request interceptor: attach stored JWT ─────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: auto-login as demo CISO on 401 ───────────────────
let _autoLoginPromise: Promise<void> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    // Auto-login once if we get a 401 and have no token
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !localStorage.getItem('token')
    ) {
      originalRequest._retry = true;

      if (!_autoLoginPromise) {
        _autoLoginPromise = (async () => {
          try {
            const loginRes = await axios.post('/api/v1/auth/login', {
              email: 'ciso@demofinancial.com',
              password: 'DemoPassword2026!',
            });
            const { access_token, user } = loginRes.data;
            localStorage.setItem('token', access_token);
            localStorage.setItem('user', JSON.stringify(user));
            console.info('[RiskForge] Auto-authenticated as demo CISO');
          } catch (e) {
            console.warn('[RiskForge] Auto-login failed', e);
          } finally {
            _autoLoginPromise = null;
          }
        })();
      }

      await _autoLoginPromise;

      // Retry original request with fresh token
      const newToken = localStorage.getItem('token');
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);

export const authApi = {
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

export const riskApi = {
  getOverview: () => api.get('/risks/overview'),
  getLandscape: (params?: { service_id?: string; criticality?: string; exposure?: string }) => 
    api.get('/risks/landscape', { params }),
  getHistory: (entityId: string) => api.get(`/risks/history/${entityId}`),
};

export const assetApi = {
  list: (params?: { search?: string; criticality?: string; exposure?: string; service_id?: string }) => 
    api.get('/assets', { params }),
  getDetail: (id: string) => api.get(`/assets/${id}`),
};

export const serviceApi = {
  list: () => api.get('/services'),
  getDetail: (id: string) => api.get(`/services/${id}`),
};

export const vulnApi = {
  list: (params?: { search?: string; severity?: string; status?: string; asset_id?: string }) => 
    api.get('/vulnerabilities', { params }),
  updateStatus: (id: string, status: string) => 
    api.patch(`/vulnerabilities/${id}/status`, { status }),
};

export const controlApi = {
  list: (params?: { category?: string }) => api.get('/controls', { params }),
  getDetail: (id: string) => api.get(`/controls/${id}`),
};

export const evidenceApi = {
  getSources: () => api.get('/evidence/sources'),
  getRecords: (params?: { source_id?: string; validation_status?: string; limit?: number }) => 
    api.get('/evidence/records', { params }),
  ingestBatch: (data: { source_name: string; record_type: string; records: any[] }) => 
    api.post('/evidence/batch', data),
  refreshSource: (id: string) => api.post(`/evidence/sources/${id}/refresh`),
};

export const scenarioApi = {
  list: () => api.get('/scenarios'),
  getDetail: (id: string) => api.get(`/scenarios/${id}`),
  run: (data: { name: string; description?: string; changes: any[] }) => 
    api.post('/scenarios', data),
};

export const investmentApi = {
  list: (params?: { category?: string }) => api.get('/investments', { params }),
  create: (data: any) => api.post('/investments', data),
};

export const optimizationApi = {
  run: (data: { total_budget: number; objective?: string; candidate_initiative_codes?: string[] }) => 
    api.post('/optimizations', data),
  getDetail: (id: string) => api.get(`/optimizations/${id}`),
  compare: (budget?: number) => api.get('/optimizations/compare', { params: { budget } }),
  recordDecision: (data: { optimization_run_id: string; investment_code: string; status: string; comments?: string }) => 
    api.post('/optimizations/decisions', data),
};

export const aiApi = {
  getInsights: () => api.get('/ai/insights'),
  query: (query: string) => api.post('/ai/query', { query }),
};

export const complianceApi = {
  getOverview: (frameworkId?: string) => api.get('/compliance', { params: { framework_id: frameworkId } }),
};

export const reportApi = {
  preview: (reportType?: string) => api.get('/reports/preview', { params: { report_type: reportType } }),
  downloadPdfUrl: '/api/v1/reports/download-pdf',
  exportCsvUrl: '/api/v1/reports/export-csv',
};

export const modelApi = {
  list: () => api.get('/models'),
};

export const auditApi = {
  list: (params?: { action?: string; entity_type?: string; limit?: number }) => 
    api.get('/audit', { params }),
};

export const searchApi = {
  search: (q: string) => api.get('/search', { params: { q } }),
};

export const sourcesApi = {
  getStatus: () => api.get('/sources/status'),
  syncNvd: (data?: { cve_ids?: string[]; target_asset_id?: string }) => api.post('/sources/nvd/sync', data),
  syncKev: () => api.post('/sources/kev/sync'),
  syncEpss: () => api.post('/sources/epss/sync'),
  uploadAssets: (formData: FormData) => api.post('/sources/assets/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  uploadAssetsJson: (payload: any[]) => api.post('/sources/assets/upload', payload),
  uploadSoftware: (formData: FormData) => api.post('/sources/software/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  uploadSoftwareJson: (payload: any[]) => api.post('/sources/software/upload', payload),
  getSoftware: (params?: { asset_id?: string; correlation_status?: string; limit?: number }) =>
    api.get('/sources/software', { params }),
};

export const demoApi = {
  injectVulnerability: () => api.post('/demo/inject-vulnerability'),
  simulateMitigation: () => api.post('/demo/simulate-mitigation'),
  resetBaseline: () => api.post('/demo/reset-baseline'),
};

export default api;
