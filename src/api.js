// src/api.js — LogiOp backend (api.ksinghtrades.com) se native app ka rishta
import * as SecureStore from 'expo-secure-store';

const BASE = 'https://api.ksinghtrades.com';
let _token = null;

export async function loadToken() {
  try { _token = await SecureStore.getItemAsync('logiop_jwt'); } catch (e) { _token = null; }
  return _token;
}

export async function login(username, password) {
  const r = await fetch(BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const d = await r.json().catch(() => null);
  if (!r.ok) throw new Error((d && d.detail) || 'Login fail (' + r.status + ')');
  const t = d && (d.access_token || d.token);
  if (!t) throw new Error('Token nahi mila');
  _token = t;
  try { await SecureStore.setItemAsync('logiop_jwt', t); } catch (e) {}
  return t;
}

export async function logout() {
  _token = null;
  try { await SecureStore.deleteItemAsync('logiop_jwt'); } catch (e) {}
}

export async function api(path, opts = {}) {
  const r = await fetch(BASE + path, {
    method: opts.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(_token ? { Authorization: 'Bearer ' + _token } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (r.status === 401) { const e = new Error('auth'); e.auth = true; throw e; }
  const d = await r.json().catch(() => null);
  if (!r.ok) throw new Error((d && d.detail) || 'API ' + r.status);
  return (d && d.data !== undefined) ? d.data : d;
}
