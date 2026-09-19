import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token') || localStorage.getItem('trustchain_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      localStorage.removeItem('trustchain_token');
      localStorage.removeItem('trustchain_user');
      window.dispatchEvent(new CustomEvent('beltal:session-expired'));
    }
    const data = error.response?.data;
    return Promise.reject({ ...error, uiMessage: data?.message || data?.error?.message || data?.error || error.message || 'An unexpected error occurred' });
  }
);

export const get = (url, config) => api.get(url, config);
export const post = (url, data, config) => api.post(url, data, config);
export const put = (url, data, config) => api.put(url, data, config);
export const patch = (url, data, config) => api.patch(url, data, config);
export const del = (url, config) => api.delete(url, config);

export const authApi = {
  getNonce: (walletAddress) => api.post('/auth/nonce', { walletAddress }).then((r) => r.data.data),
  verify: (walletAddress, signature) => api.post('/auth/verify', { walletAddress, signature }).then((r) => r.data.data),
};
export const adminApi = {
  getStats: () => api.get('/admin/stats').then((r) => r.data.data),
  listIdentities: (params = {}) => api.get('/admin/identities', { params }).then((r) => r.data.data),
  registerIdentity: (payload) => api.post('/admin/identities', payload).then((r) => r.data.data),
  updateRole: (id, payload) => api.patch(`/admin/identities/${id}/role`, payload).then((r) => r.data.data),
};
export const assetApi = {
  mint: (payload) => api.post('/assets', payload).then((r) => r.data.data),
  list: (params = {}) => api.get('/assets', { params }).then((r) => r.data.data),
  listMine: () => api.get('/assets/me').then((r) => r.data.data),
};
export const userApi = {
  listTransferRecipients: (params = {}) => api.get('/users/transfer-recipients', { params }).then((r) => r.data.data),
};
export const transferApi = {
  list: (params = {}) => api.get('/transfers', { params }).then((r) => r.data.data),
  create: (payload) => api.post('/transfers/request', payload).then((r) => r.data.data),
  approve: (id) => api.patch(`/transfers/${id}/approve`).then((r) => r.data.data),
  reject: (id, payload = {}) => api.patch(`/transfers/${id}/reject`, payload).then((r) => r.data.data),
};
export const auditApi = {
  list: (params = {}) => api.get('/audit', { params }).then((r) => r.data.data),
  getStats: (params = {}) => api.get('/audit/stats', { params }).then((r) => r.data.data),
  verify: (id) => api.get(`/audit/verify/${id}`).then((r) => r.data.data),
};

export default api;
