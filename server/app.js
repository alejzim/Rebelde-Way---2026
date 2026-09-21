import { QUESTIONS, CHARACTER_IDS } from '../shared/quiz.js';
import { createRepository } from './repository.js';
import { COOKIE_NAME, HttpError, assertSameOrigin, clientRateKey, constantTimeEqual, createSession, isUuid,
  readJsonBody, readSession, scoreAnswers, serverSecret, sessionCookie, validateSubmission } from './security.js';

const PAGE_SIZE = 20;
function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}
function publicResult(row) { return { id: row.id, nombre: row.nombre, resultado: row.resultado, created_at: row.created_at }; }

export function createApiHandler({ env = process.env, repository, now = Date.now, choose, logger = console } = {}) {
  let database = repository;
  function getDatabase() {
    if (database) return database;
    if (!env.VITE_SUPABASE_URL || !env.SUPABASE_SECRET_KEY) throw new HttpError(503, 'Todavía estamos preparando el test. Volvé a intentarlo más tarde.');
    database = createRepository(env.VITE_SUPABASE_URL, env.SUPABASE_SECRET_KEY);
    return database;
  }
  function requireAuth(req) {
    const hasSessionCookie = String(req.headers.cookie || '').split(';').some((part) => {
      const cookie = part.trim();
      return cookie.startsWith(`${COOKIE_NAME}=`) && cookie.length > COOKIE_NAME.length + 1;
    });
    if (!hasSessionCookie) throw new HttpError(401, 'Iniciá sesión para acceder al panel.');
    const session = readSession(req.headers.cookie, serverSecret(env), now());
    if (!session) throw new HttpError(401, 'Iniciá sesión para acceder al panel.');
    return session;
  }
  function requireCsrf(req, session) {
    const csrf = req.headers['x-csrf-token'];
    if (typeof csrf !== 'string' || !constantTimeEqual(csrf, session.csrf)) throw new HttpError(403, 'Tu sesión cambió. Actualizá el panel e intentá nuevamente.');
  }
  async function throttle(req, res, scope, limit, windowSeconds) {
    const key = clientRateKey(req, scope, env);
    if (await getDatabase().consumeLimit(key, limit, windowSeconds) !== true) {
      res.setHeader('Retry-After', String(windowSeconds));
      throw new HttpError(429, 'Hubo demasiados intentos. Esperá unos minutos antes de volver a intentar.');
    }
  }
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    const method = req.method?.toUpperCase() || 'GET';
    try {
      const url = new URL(req.url, 'http://localhost');
      const path = url.pathname.replace(/\/$/, '');
      if (!['GET', 'POST', 'DELETE'].includes(method)) { res.setHeader('Allow', 'GET, POST, DELETE'); throw new HttpError(405, 'Método no permitido.'); }
      if (method !== 'GET') assertSameOrigin(req, env);

      if (path === '/api/quiz' && method === 'POST') {
        const submission = validateSubmission(await readJsonBody(req));
        await throttle(req, res, 'quiz', 30, 3600);
        const db = getDatabase();
        const existing = await db.findBySubmission(submission.submissionId);
        if (existing) {
          if (existing.request_hash !== submission.requestHash) throw new HttpError(409, 'Este test ya fue enviado con otras respuestas. Volvé a comenzar.');
          return send(res, 200, publicResult(existing));
        }
        const row = { submission_id: submission.submissionId, request_hash: submission.requestHash, nombre: submission.nombre,
          ...Object.fromEntries(QUESTIONS.map((question, index) => [`pregunta${index + 1}`, question.options[submission.answers[index] - 1]])),
          resultado: scoreAnswers(submission.answers, choose) };
        try { return send(res, 201, publicResult(await db.insertResponse(row))); }
        catch (error) {
          if (error.code !== '23505') throw error;
          // A concurrent retry may insert after our initial read. Return the winner's exact result.
          const winner = await db.findBySubmission(submission.submissionId);
          if (!winner || winner.request_hash !== submission.requestHash) throw new HttpError(409, 'Este test ya fue enviado con otras respuestas. Volvé a comenzar.');
          return send(res, 200, publicResult(winner));
        }
      }
      if (path === '/api/admin/login' && method === 'POST') {
        const secret = serverSecret(env);
        const body = await readJsonBody(req);
        await throttle(req, res, 'login', 10, 900);
        if (typeof body.password !== 'string' || body.password.length > 1024 || !constantTimeEqual(body.password, env.ADMIN_PASSWORD)) throw new HttpError(401, 'La contraseña no es correcta.');
        const session = createSession(secret, now());
        res.setHeader('Set-Cookie', sessionCookie(session.token, env.NODE_ENV === 'production' || env.VERCEL === '1'));
        return send(res, 200, { authenticated: true, csrfToken: session.csrfToken });
      }
      if (path.startsWith('/api/admin/')) {
        const session = requireAuth(req);
        if (path === '/api/admin/session' && method === 'GET') return send(res, 200, { authenticated: true, csrfToken: session.csrf });
        if (path === '/api/admin/logout' && method === 'POST') {
          requireCsrf(req, session);
          res.setHeader('Set-Cookie', sessionCookie('', env.NODE_ENV === 'production' || env.VERCEL === '1', true));
          return send(res, 200, { success: true });
        }
        if (path === '/api/admin/responses' && method === 'GET') {
          const query = (url.searchParams.get('q') || '').trim();
          const character = url.searchParams.get('character') || '';
          const pageText = url.searchParams.get('page') || '1';
          const page = Number(pageText);
          if (query.length > 60 || (character && !CHARACTER_IDS.includes(character)) || !/^\d+$/.test(pageText) || !Number.isSafeInteger(page) || page < 1 || page > 100000) throw new HttpError(400, 'Los filtros enviados no son válidos.');
          const db = getDatabase();
          const [list, stats] = await Promise.all([db.listResponses({ query, character, page, pageSize: PAGE_SIZE }), db.responseCounts()]);
          return send(res, 200, { ...list, totalAll: stats.totalAll, counts: stats.counts, page, pageSize: PAGE_SIZE });
        }
        const deletion = path.match(/^\/api\/admin\/responses\/([^/]+)$/);
        if (deletion && method === 'DELETE') {
          requireCsrf(req, session);
          if (!isUuid(deletion[1])) throw new HttpError(400, 'El identificador de la respuesta no es válido.');
          if (!await getDatabase().deleteResponse(deletion[1])) throw new HttpError(404, 'Esta respuesta ya no existe.');
          return send(res, 200, { success: true });
        }
      }
      throw new HttpError(404, 'Esta ruta no existe.');
    } catch (error) {
      if (error instanceof HttpError) return send(res, error.status, { error: error.message });
      logger.error('API request failed', { code: typeof error?.code === 'string' ? error.code : 'UNEXPECTED' });
      return send(res, 503, { error: 'No pudimos conectar con el servidor. Tus respuestas siguen acá; intentá nuevamente en un momento.' });
    }
  };
}
export default createApiHandler();
