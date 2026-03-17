const BASE = '/api';

function token() {
  return localStorage.getItem('lc_token');
}

function headers(extra = {}) {
  const h = { 'Content-Type': 'application/json', ...extra };
  const t = token();
  if (t) h['Authorization'] = `Bearer ${t}`;
  return h;
}

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  register: (body) => req('POST', '/register', body),
  login: (body) => req('POST', '/login', body),
  me: () => req('GET', '/me'),
  updateProfile: (body) => req('PUT', '/me', body),
  partners: () => req('GET', '/partners'),
};
