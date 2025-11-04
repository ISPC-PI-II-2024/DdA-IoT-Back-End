// ==========================
// Wrapper de storage con namespace
// ==========================
const NS = "cproto";

export const storage = {
  set(k, v, ss = false) {
    const data = JSON.stringify(v);
    (ss ? sessionStorage : localStorage).setItem(`${NS}:${k}`, data);
  },
  get(k, def = null, ss = false) {
    const raw = (ss ? sessionStorage : localStorage).getItem(`${NS}:${k}`);
    try { return raw ? JSON.parse(raw) : def; } catch { return def; }
  },
  del(k, ss = false) {
    (ss ? sessionStorage : localStorage).removeItem(`${NS}:${k}`);
  },
  clearAll() {
    Object.keys(localStorage).forEach(k => k.startsWith(`${NS}:`) && localStorage.removeItem(k));
    Object.keys(sessionStorage).forEach(k => k.startsWith(`${NS}:`) && sessionStorage.removeItem(k));
  }
};
