/* A link field: adds https:// when it is left off, checks the host, and sends
   null when empty, which is what the schema takes. */
import { cls, word } from './config.js';
import { h } from './dom.js';
import { fieldShell } from './fields.js';

/* { ok, value, reason }. reason is 'scheme', 'host' or 'allowed'. */
export function normalizeUrl(text, { hosts } = {}) {
  const raw = String(text ?? '').trim();
  if (!raw) return { ok: true, value: null };
  if (/\s/.test(raw)) return { ok: false, value: null, reason: 'host' };
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) && !/^[^/:]+:\d+(\/|$)/.test(raw);
  if (hasScheme && !/^https?:\/\//i.test(raw)) return { ok: false, value: null, reason: 'scheme' };
  const candidate = hasScheme ? raw : `https://${raw.replace(/^\/+/, '')}`;
  let url;
  try { url = new URL(candidate); } catch (err) { return { ok: false, value: null, reason: 'host' }; }
  const host = url.hostname.toLowerCase();
  if (!/^[a-z0-9.-]+$/.test(host) && !/^xn--/.test(host) && !/[^\u0000-\u007F]/.test(host)) return { ok: false, value: null, reason: 'host' };
  if (!host.includes('.') || host.startsWith('.') || host.endsWith('.')) return { ok: false, value: null, reason: 'host' };
  if (hosts && !hosts.includes(url.host.toLowerCase())) return { ok: false, value: null, reason: 'allowed' };
  return { ok: true, value: candidate };
}

/* onChange(value, valid). hostError is the sentence for a host not in hosts. */
export function urlField({ label, value = null, required = false, hosts, hostError, placeholder, onChange }) {
  const input = h('input', { class: cls('input'), type: 'url', inputmode: 'url', autocomplete: 'off', spellcheck: 'false', value: value || '', placeholder });
  const shell = fieldShell({ label, control: input });
  const read = () => {
    const r = normalizeUrl(input.value, { hosts });
    if (r.ok) return { value: r.value, error: '' };
    return { value: null, error: r.reason === 'allowed' ? (hostError || word('urlInvalid')) : word('urlInvalid') };
  };
  input.addEventListener('input', () => {
    const r = read();
    if (!r.error) shell.setError('');
    if (onChange) onChange(r.value, !r.error);
  });
  input.addEventListener('blur', () => {
    const r = read();
    shell.setError(r.error);
    if (!r.error && r.value) input.value = r.value;
  });
  return { el: shell.el, input, value: () => read().value, valid: () => !read().error, required, setError: shell.setError };
}
