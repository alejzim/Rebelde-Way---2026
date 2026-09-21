import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { createServer } from 'node:http';
import { createApiHandler } from '../server/app.js';
import { createRepository } from '../server/repository.js';
import { COOKIE_NAME, SESSION_SECONDS, assertSameOrigin, clientRateKey, createSession, normalizeName,
  readJsonBody, readSession, scoreAnswers, serverSecret, validateSubmission } from '../server/security.js';
import { QUESTIONS, CHARACTER_IDS } from '../shared/quiz.js';

const env = { ADMIN_PASSWORD: 'test-password-123' };
const submission = (changes = {}) => ({ nombre: '  María   Sol ', answers: [1, 1, 2, 5, 1], submissionId: randomUUID(), ...changes });
function fakeRepository() {
  const rows = new Map();
  const limits = new Map();
  return {
    rows, limits,
    async consumeLimit(key, limit) { const n = (limits.get(key) || 0) + 1; limits.set(key, n); return n <= limit; },
    async findBySubmission(id) { return rows.get(id) || null; },
    async insertResponse(row) {
      if (rows.has(row.submission_id)) throw { code: '23505' };
      const saved = { ...row, id: randomUUID(), created_at: '2026-09-20T12:00:00.000Z' };
      rows.set(row.submission_id, saved);
      return saved;
    },
    async listResponses({ query, character, page, pageSize }) {
      const filtered = [...rows.values()].filter((row) => row.nombre.toLowerCase().includes(query.toLowerCase()) && (!character || row.resultado === character));
      return { rows: filtered.slice((page - 1) * pageSize, page * pageSize), total: filtered.length };
    },
    async responseCounts() {
      return { totalAll: rows.size, counts: Object.fromEntries(CHARACTER_IDS.map((id) => [id, [...rows.values()].filter((row) => row.resultado === id).length])) };
    },
    async deleteResponse(id) {
      const entry = [...rows.entries()].find(([, row]) => row.id === id);
      if (!entry) return null;
      rows.delete(entry[0]);
      return { id };
    },
  };
}
async function request(handler, method, url, { body, headers = {}, cookie, csrf } = {}) {
  const req = { method, url, body, headers: { host: 'localhost:5173', origin: 'http://localhost:5173', 'content-type': 'application/json', ...headers }, socket: { remoteAddress: '127.0.0.1' } };
  if (cookie) req.headers.cookie = cookie;
  if (csrf) req.headers['x-csrf-token'] = csrf;
  const response = { headers: {} };
  const res = { setHeader(key, value) { response.headers[key.toLowerCase()] = value; }, end(value) { response.status = this.statusCode; response.body = JSON.parse(value); } };
  await handler(req, res);
  return response;
}
function setup(options = {}) {
  const repository = fakeRepository();
  return { repository, handler: createApiHandler({ env, repository, logger: { error() {} }, ...options }) };
}
async function login(handler) {
  const result = await request(handler, 'POST', '/api/admin/login', { body: { password: env.ADMIN_PASSWORD } });
  assert.equal(result.status, 200);
  return { cookie: result.headers['set-cookie'].split(';')[0], csrf: result.body.csrfToken };
}

test('all 3125 answer combinations return only a highest-scoring character', () => {
  for (let value = 0; value < 5 ** 5; value += 1) {
    const answers = Array.from({ length: 5 }, (_, index) => Math.floor(value / (5 ** index)) % 5 + 1);
    const scores = CHARACTER_IDS.map((_, index) => answers.filter((answer) => answer === index + 1).length);
    const expected = CHARACTER_IDS.filter((_, index) => scores[index] === Math.max(...scores));
    for (let choice = 0; choice < expected.length; choice += 1) {
      assert.equal(scoreAnswers(answers, (length) => { assert.equal(length, expected.length); return choice; }), expected[choice]);
    }
  }
});

test('names normalize and malformed/forged submissions fail', () => {
  assert.equal(normalizeName('  María   Sol '), 'María Sol');
  assert.equal(normalizeName('Ａｌｅ'), 'Ale');
  for (const name of ['a', ' '.repeat(40), 'a'.repeat(31), '<script>', 'Ana\u200b', null]) assert.throws(() => normalizeName(name), { status: 400 });
  for (const changes of [{ answers: [1, 2] }, { answers: [1, 2, 3, 4, 6] }, { answers: [1, 2, 3, 4, 1.5] }, { answers: ['1', 2, 3, 4, 5] }, { submissionId: 'invalid' }]) {
    assert.throws(() => validateSubmission(submission(changes)), { status: 400 });
  }
});

test('signed sessions expire, reject tampering and invalidate on admin password rotation', () => {
  const now = Date.UTC(2026, 8, 20);
  const secret = serverSecret(env);
  const session = createSession(secret, now);
  const cookie = `${COOKIE_NAME}=${session.token}`;
  assert.equal(readSession(cookie, secret, now).csrf, session.csrfToken);
  assert.equal(readSession(cookie, secret, now + SESSION_SECONDS * 1000), null);
  assert.equal(readSession(`${cookie}tampered`, secret, now), null);
  assert.equal(readSession(`${cookie}.extra`, secret, now), null);
  assert.equal(readSession(cookie, serverSecret({ ADMIN_PASSWORD: 'different-password' }), now), null);
  assert.notEqual(secret, serverSecret(env, 'rate-limit'));
  assert.throws(() => serverSecret({ ADMIN_PASSWORD: 'short' }), { status: 503 });
});

test('JSON parsing enforces content type, syntax and size for both request formats', async () => {
  const streamed = Readable.from([Buffer.from('{"ok":true}')]);
  streamed.headers = { 'content-type': 'application/json' };
  assert.deepEqual(await readJsonBody(streamed), { ok: true });
  for (const type of ['text/plain', 'application/json-unsupported']) await assert.rejects(readJsonBody({ headers: { 'content-type': type }, body: '{}' }), { status: 415 });
  await assert.rejects(readJsonBody({ headers: { 'content-type': 'application/json' }, body: 'not json' }), { status: 400 });
  await assert.rejects(readJsonBody({ headers: { 'content-type': 'application/json' }, body: { name: 'x'.repeat(5000) } }), { status: 413 });
  const oversized = Readable.from([Buffer.from('x'.repeat(5000))]);
  oversized.headers = { 'content-type': 'application/json' };
  await assert.rejects(readJsonBody(oversized), { status: 413 });
});

test('Vercel lazy body parsing is read once and malformed JSON returns a client error', async () => {
  let reads = 0;
  const headers = { 'content-type': 'application/json' };
  const valid = { headers, get body() { reads += 1; return { ok: true }; } };
  assert.deepEqual(await readJsonBody(valid), { ok: true });
  assert.equal(reads, 1);
  const malformed = { headers, get body() { throw new SyntaxError('Unexpected token'); } };
  await assert.rejects(readJsonBody(malformed), { status: 400 });

  const { handler } = setup();
  const req = { method: 'POST', url: '/api/quiz', headers: { ...headers, host: 'localhost:5173', origin: 'http://localhost:5173' } };
  Object.defineProperty(req, 'body', { get() { throw new SyntaxError('Unexpected token'); } });
  const response = { setHeader() {}, end(value) { this.body = JSON.parse(value); } };
  await handler(req, response);
  assert.equal(response.statusCode, 400);
  assert.match(response.body.error, /JSON válido/);
});

test('an out-of-range Supabase page returns a fresh filtered count for page recovery', async () => {
  const queries = [];
  const client = {
    from(table) {
      const query = { table, filters: [] };
      queries.push(query);
      return {
        select(columns, options) { query.columns = columns; query.options = options; return this; },
        ilike(column, value) { query.filters.push(['ilike', column, value]); return this; },
        eq(column, value) { query.filters.push(['eq', column, value]); return this; },
        order() { return this; },
        range(from, to) {
          query.range = [from, to];
          return Promise.resolve({ data: null, count: null, error: { code: 'PGRST103', message: 'Requested range not satisfiable' } });
        },
        then(resolve, reject) { return Promise.resolve({ data: null, count: 19, error: null }).then(resolve, reject); },
      };
    },
  };
  const repository = createRepository(undefined, undefined, { client });
  assert.deepEqual(await repository.listResponses({ query: 'María_', character: 'marizza', page: 2, pageSize: 20 }), { rows: [], total: 19 });
  assert.equal(queries.length, 2);
  assert.deepEqual(queries[0].range, [20, 39]);
  assert.equal(queries[1].range, undefined);
  assert.deepEqual(queries[1].options, { count: 'exact', head: true });
  assert.deepEqual(queries[1].filters, queries[0].filters);
  assert.deepEqual(queries[1].filters, [['ilike', 'nombre', '%María\\_%'], ['eq', 'resultado', 'marizza']]);
});

test('quiz persists full answer texts and authoritative result with stable retries', async () => {
  const { handler, repository } = setup();
  const body = submission({ resultado: 'manuel' });
  const result = await request(handler, 'POST', '/api/quiz', { body });
  assert.equal(result.status, 201);
  assert.equal(result.body.nombre, 'María Sol');
  assert.equal(result.body.resultado, 'marizza');
  assert.equal(result.body.request_hash, undefined);
  const saved = [...repository.rows.values()][0];
  assert.equal(saved.pregunta1, QUESTIONS[0].options[0]);
  assert.equal(saved.pregunta4, QUESTIONS[3].options[4]);
  const retry = await request(handler, 'POST', '/api/quiz', { body });
  assert.equal(retry.status, 200);
  assert.deepEqual(retry.body, result.body);
  assert.equal(repository.rows.size, 1);
  assert.equal((await request(handler, 'POST', '/api/quiz', { body: { ...body, answers: [4, 4, 4, 4, 4] } })).status, 409);
  assert.equal(repository.rows.size, 1);
});

test('concurrent duplicate retries share one stored random tie result', async () => {
  let calls = 0;
  const { handler, repository } = setup({ choose: (length) => calls++ % length });
  const body = submission({ answers: [5, 5, 5, 5, 5] });
  const results = await Promise.all([request(handler, 'POST', '/api/quiz', { body }), request(handler, 'POST', '/api/quiz', { body })]);
  assert.deepEqual(results.map((result) => result.status).sort(), [200, 201]);
  assert.deepEqual(results[0].body, results[1].body);
  assert.equal(repository.rows.size, 1);
});

test('admin routes require auth and production login returns a secure private cookie', async () => {
  const { handler } = setup();
  assert.equal((await request(handler, 'GET', '/api/admin/responses')).status, 401);
  assert.equal((await request(handler, 'DELETE', `/api/admin/responses/${randomUUID()}`)).status, 401);
  assert.equal((await request(handler, 'POST', '/api/admin/login', { body: { password: 'bad' } })).status, 401);
  const { handler: production } = setup({ env: { ...env, VERCEL: '1' } });
  const result = await request(production, 'POST', '/api/admin/login', { body: { password: env.ADMIN_PASSWORD }, headers: { host: 'site.vercel.app', origin: 'https://site.vercel.app' } });
  assert.equal(result.status, 200);
  assert.match(result.headers['set-cookie'], /HttpOnly; SameSite=Strict; Max-Age=28800; Secure$/);
  assert.equal(result.headers['cache-control'], 'no-store');
});

test('authenticated filters, global statistics and CSRF-protected deletion/logout work', async () => {
  const { handler } = setup();
  const added = await request(handler, 'POST', '/api/quiz', { body: submission() });
  await request(handler, 'POST', '/api/quiz', { body: submission({ nombre: 'Pablo', answers: [3, 3, 3, 3, 3] }) });
  const auth = await login(handler);
  assert.equal((await request(handler, 'GET', '/api/admin/session', auth)).body.csrfToken, auth.csrf);
  const list = await request(handler, 'GET', '/api/admin/responses?q=mar%C3%ADa&character=marizza&page=1', auth);
  assert.equal(list.status, 200);
  assert.equal(list.body.rows.length, 1);
  assert.equal(list.body.total, 1);
  assert.equal(list.body.totalAll, 2);
  assert.equal(list.body.counts.pablo, 1);
  assert.equal(list.body.pageSize, 20);
  assert.equal((await request(handler, 'GET', '/api/admin/responses?page=0', auth)).status, 400);
  assert.equal((await request(handler, 'GET', '/api/admin/responses?character=invalid', auth)).status, 400);
  assert.equal((await request(handler, 'DELETE', `/api/admin/responses/${added.body.id}`, { cookie: auth.cookie })).status, 403);
  assert.equal((await request(handler, 'DELETE', `/api/admin/responses/${added.body.id}`, auth)).status, 200);
  assert.equal((await request(handler, 'DELETE', `/api/admin/responses/${added.body.id}`, auth)).status, 404);
  const logout = await request(handler, 'POST', '/api/admin/logout', auth);
  assert.equal(logout.status, 200);
  assert.match(logout.headers['set-cookie'], /Max-Age=0/);
});

test('same-origin validation works for local/custom/Vercel hosts without configuration', async () => {
  assert.doesNotThrow(() => assertSameOrigin({ headers: { host: 'localhost:5173', origin: 'http://localhost:5173' } }, {}));
  assert.doesNotThrow(() => assertSameOrigin({ headers: { host: 'preview-123.vercel.app', origin: 'https://preview-123.vercel.app' } }, { VERCEL: '1' }));
  assert.doesNotThrow(() => assertSameOrigin({ headers: { host: 'proxy.internal', 'x-forwarded-host': 'erreway.example', 'x-forwarded-proto': 'https', origin: 'https://erreway.example' } }, { VERCEL: '1' }));
  assert.throws(() => assertSameOrigin({ headers: { host: 'localhost:5173', 'x-forwarded-host': 'evil.example', origin: 'http://evil.example' } }, {}), { status: 403 });
  const { handler } = setup();
  for (const headers of [{ origin: 'https://evil.example' }, { origin: undefined }, { 'sec-fetch-site': 'cross-site' }]) assert.equal((await request(handler, 'POST', '/api/quiz', { body: submission(), headers })).status, 403);
});

test('database-backed throttling hashes addresses and caps login attempts', async () => {
  const { handler, repository } = setup();
  for (let attempt = 0; attempt < 10; attempt += 1) assert.equal((await request(handler, 'POST', '/api/admin/login', { body: { password: 'wrong' } })).status, 401);
  const blocked = await request(handler, 'POST', '/api/admin/login', { body: { password: env.ADMIN_PASSWORD } });
  assert.equal(blocked.status, 429);
  assert.equal(blocked.headers['retry-after'], '900');
  assert.match([...repository.limits.keys()][0], /^[a-f0-9]{64}$/);
  const req = { headers: { 'x-forwarded-for': 'attacker-controlled' }, socket: { remoteAddress: '127.0.0.1' } };
  assert.notEqual(clientRateKey(req, 'login', env), clientRateKey(req, 'quiz', env));
  assert.equal(clientRateKey(req, 'login', env), clientRateKey({ ...req, headers: {} }, 'login', env));
});

test('missing configuration or failed persistence never fabricate success or expose secrets', async () => {
  const unconfigured = createApiHandler({ env, logger: { error() {} } });
  assert.equal((await request(unconfigured, 'POST', '/api/quiz', { body: submission() })).status, 503);
  const { handler, repository } = setup();
  repository.insertResponse = async () => { throw new Error('Secret database details'); };
  const result = await request(handler, 'POST', '/api/quiz', { body: submission() });
  assert.equal(result.status, 503);
  assert.equal(result.body.id, undefined);
  assert.doesNotMatch(result.body.error, /Secret database details/);
  assert.equal(repository.rows.size, 0);
});

test('real Node HTTP requests accept JSON and return 413 for oversized chunked bodies', async (t) => {
  const server = createServer(createApiHandler({ env, repository: fakeRepository(), logger: { error() {} } }));
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const created = await fetch(`${origin}/api/quiz`, { method: 'POST', headers: { 'content-type': 'application/json', origin }, body: JSON.stringify(submission()), signal: AbortSignal.timeout(5000) });
  assert.equal(created.status, 201);
  assert.equal((await created.json()).resultado, 'marizza');
  const oversized = await fetch(`${origin}/api/quiz`, { method: 'POST', headers: { 'content-type': 'application/json', origin }, body: Readable.from(['x'.repeat(5000)]), duplex: 'half', signal: AbortSignal.timeout(5000) });
  assert.equal(oversized.status, 413);
  assert.match((await oversized.json()).error, /demasiado grande/);
});
