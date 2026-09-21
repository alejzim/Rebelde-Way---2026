import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { CHARACTER_IDS, QUESTIONS } from '../shared/quiz.js';

export const COOKIE_NAME = 'erreway_admin';
export const SESSION_SECONDS = 8 * 60 * 60;
export const MAX_BODY_BYTES = 4096;

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function constantTimeEqual(left, right) {
  const hash = (value) => createHash('sha256').update(String(value)).digest();
  return timingSafeEqual(hash(left), hash(right));
}

export function serverSecret(env, purpose = 'admin-session') {
  if (typeof env.ADMIN_PASSWORD !== 'string' || env.ADMIN_PASSWORD.length < 12) {
    throw new HttpError(503, 'El servicio todavía no está configurado. Intentá más tarde.');
  }
  // Purpose separation keeps session signing and anonymous rate-limit keys independent.
  // Changing ADMIN_PASSWORD immediately invalidates all existing sessions.
  return createHash('sha256').update(`erreway/${purpose}/v1\0${env.ADMIN_PASSWORD}`).digest('hex');
}

export function normalizeName(value) {
  if (typeof value !== 'string' || value.length > 150) throw new HttpError(400, 'Escribí un nombre de entre 2 y 30 caracteres.');
  const name = value.normalize('NFKC').trim().replace(/\s+/gu, ' ');
  if (Array.from(name).length < 2 || Array.from(name).length > 30) throw new HttpError(400, 'Tu nombre debe tener entre 2 y 30 caracteres.');
  if (!/^[\p{L}\p{M}\p{N} .,'’_-]+$/u.test(name)) throw new HttpError(400, 'Usá letras, números, espacios o guiones para tu nombre.');
  return name;
}

export function isUuid(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function validateSubmission(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'El envío no tiene un formato válido.');
  const nombre = normalizeName(body.nombre);
  if (!Array.isArray(body.answers) || body.answers.length !== QUESTIONS.length ||
      body.answers.some((answer) => !Number.isInteger(answer) || answer < 1 || answer > 5)) {
    throw new HttpError(400, 'Elegí una respuesta válida para cada una de las 5 preguntas.');
  }
  if (!isUuid(body.submissionId)) throw new HttpError(400, 'El identificador del test no es válido. Volvé a comenzar.');
  const answers = [...body.answers];
  return { nombre, answers, submissionId: body.submissionId.toLowerCase(),
    requestHash: createHash('sha256').update(JSON.stringify({ nombre, answers })).digest('hex') };
}

export function scoreAnswers(answers, choose = randomInt) {
  const scores = CHARACTER_IDS.map(() => 0);
  for (const answer of answers) if (answer >= 1 && answer <= 4) scores[answer - 1] += 1;
  const maximum = Math.max(...scores);
  const candidates = CHARACTER_IDS.filter((_, index) => scores[index] === maximum);
  return candidates[choose(candidates.length)];
}

export function createSession(secret, now = Date.now()) {
  const payload = { exp: Math.floor(now / 1000) + SESSION_SECONDS, csrf: randomBytes(32).toString('hex') };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', secret).update(encoded).digest('base64url');
  return { token: `${encoded}.${signature}`, csrfToken: payload.csrf };
}

export function readSession(cookieHeader, secret, now = Date.now()) {
  const cookie = String(cookieHeader || '').split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`));
  if (!cookie || cookie.length > 1024) return null;
  const [encoded, signature, extra] = cookie.slice(COOKIE_NAME.length + 1).split('.');
  if (!encoded || !signature || extra !== undefined) return null;
  if (!constantTimeEqual(signature, createHmac('sha256', secret).update(encoded).digest('base64url'))) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (!Number.isInteger(payload.exp) || payload.exp <= Math.floor(now / 1000) ||
        payload.exp > Math.floor(now / 1000) + SESSION_SECONDS ||
        typeof payload.csrf !== 'string' || !/^[0-9a-f]{64}$/.test(payload.csrf)) return null;
    return payload;
  } catch { return null; }
}

export function sessionCookie(token, production, clear = false) {
  return `${COOKIE_NAME}=${clear ? '' : token}; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : SESSION_SECONDS}${production ? '; Secure' : ''}`;
}

export function assertSameOrigin(req, env) {
  try {
    // Vercel sets these forwarding headers itself. Local requests cannot override Host.
    const host = env.VERCEL === '1' ? req.headers['x-forwarded-host'] || req.headers.host : req.headers.host;
    const protocol = env.VERCEL === '1' ? req.headers['x-forwarded-proto'] || 'https' :
      env.NODE_ENV === 'production' || req.socket?.encrypted ? 'https' : 'http';
    if (typeof host !== 'string' || !host || /[\s,/@\\]/u.test(host) || !['http', 'https'].includes(protocol)) throw new Error('host');
    const expected = new URL(`${protocol}://${host}`).origin;
    if (typeof req.headers.origin !== 'string' || req.headers.origin !== expected ||
        (req.headers['sec-fetch-site'] && !['same-origin', 'none'].includes(req.headers['sec-fetch-site']))) throw new Error('origin');
  } catch { throw new HttpError(403, 'Esta solicitud no está permitida desde este origen.'); }
}

export function clientRateKey(req, scope, env) {
  const forwarded = env.VERCEL === '1' && (req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for']);
  const address = forwarded ? String(forwarded).split(',')[0].trim() : req.socket?.remoteAddress || 'unknown';
  return createHmac('sha256', serverSecret(env, 'rate-limit')).update(`${scope}:${address}`).digest('hex');
}

export async function readJsonBody(req) {
  if (!/^application\/json(?:\s*;|$)/i.test(String(req.headers['content-type'] || ''))) throw new HttpError(415, 'La solicitud debe enviarse en formato JSON.');
  if (Number(req.headers['content-length']) > MAX_BODY_BYTES) throw new HttpError(413, 'La solicitud es demasiado grande.');
  let text;
  let incoming;
  try {
    // Vercel may parse JSON lazily when this property is first read.
    incoming = req.body;
  } catch (error) {
    if (error instanceof SyntaxError) throw new HttpError(400, 'La solicitud no contiene un JSON válido.');
    throw error;
  }
  if (incoming !== undefined) {
    text = Buffer.isBuffer(incoming) ? incoming.toString('utf8') : typeof incoming === 'string' ? incoming : JSON.stringify(incoming);
  } else {
    const chunks = [];
    let size = 0;
    const input = typeof req.iterator === 'function' ? req.iterator({ destroyOnReturn: false }) : req;
    for await (const chunk of input) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += bytes.length;
      if (size > MAX_BODY_BYTES) { req.resume?.(); throw new HttpError(413, 'La solicitud es demasiado grande.'); }
      chunks.push(bytes);
    }
    text = Buffer.concat(chunks).toString('utf8');
  }
  if (!text || Buffer.byteLength(text) > MAX_BODY_BYTES) throw new HttpError(text ? 413 : 400, text ? 'La solicitud es demasiado grande.' : 'La solicitud está vacía.');
  try {
    const body = JSON.parse(text);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('body');
    return body;
  } catch { throw new HttpError(400, 'La solicitud no contiene un JSON válido.'); }
}
