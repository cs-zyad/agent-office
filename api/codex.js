import { put, get } from '@vercel/blob';
import { timingSafeEqual } from 'node:crypto';

const FILE = 'codex-bridge/live.json';
const AGENTS = new Set(['design','frontend','backend','qa','security','devops','review','social']);
const STATES = new Set(['working','done','error','idle']);
const respond = (res, code, body) => res.status(code).json(body);
const limitText = (value, limit) => typeof value === 'string' ? value.trim().slice(0, limit) : '';

function checkToken(authorization) {
  const expected = process.env.CODEX_OFFICE_TOKEN;
  if (!expected || !authorization?.startsWith('Bearer ')) return false;
  const actual = authorization.slice('Bearer '.length);
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(actual, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET' && req.method !== 'POST') return respond(res, 405, { error: 'Method not allowed' });
  if (!checkToken(req.headers.authorization)) return respond(res, 401, { error: 'Unauthorized' });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return respond(res, 503, { error: 'Storage not connected' });

  try {
    if (req.method === 'GET') {
      const result = await get(FILE, { access: 'private' });
      if (!result?.stream || result.statusCode !== 200) {
        return respond(res, 200, { connected: false, updatedAt: null, agents: {} });
      }
      const body = await new Response(result.stream).text();
      return respond(res, 200, { connected: true, ...JSON.parse(body) });
    }

    const incoming = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
      return respond(res, 400, { error: 'Invalid payload' });
    }
    const rawAgents = incoming.agents;
    if (!rawAgents || typeof rawAgents !== 'object' || Array.isArray(rawAgents)) {
      return respond(res, 400, { error: 'agents required' });
    }
    const agents = {};
    for (const [id, entry] of Object.entries(rawAgents)) {
      if (!AGENTS.has(id) || !entry || typeof entry !== 'object') continue;
      const state = STATES.has(entry.state) ? entry.state : 'idle';
      agents[id] = {
        state,
        activity: limitText(entry.activity, 90) || (state === 'working' ? 'ينفذ مهمة في Codex' : 'بانتظار مهمة'),
        updatedAt: Number.isFinite(entry.updatedAt) ? Math.min(Date.now(), Math.max(0, entry.updatedAt)) : Date.now(),
      };
    }
    const payload = {
      version: 1,
      source: 'local-codex-session-bridge',
      project: limitText(incoming.project, 50) || 'مشروع Codex',
      updatedAt: Date.now(),
      agents,
    };
    await put(FILE, JSON.stringify(payload), {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
    });
    return respond(res, 200, { ok: true, updatedAt: payload.updatedAt, agents: Object.keys(agents).length });
  } catch (error) {
    console.error('Codex bridge API error:', error?.name || 'error');
    return respond(res, 500, { error: 'Codex bridge unavailable' });
  }
}
