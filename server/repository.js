import { createClient } from '@supabase/supabase-js';

const COLUMNS = 'id,nombre,pregunta1,pregunta2,pregunta3,pregunta4,pregunta5,resultado,created_at';
function unwrap(result) { if (result.error) throw result.error; return result.data; }

export function createRepository(url, key, { client } = {}) {
  const db = client || createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  return {
    async consumeLimit(key, limit, windowSeconds) {
      return unwrap(await db.rpc('consume_rate_limit', { p_key: key, p_limit: limit, p_window_seconds: windowSeconds }));
    },
    async findBySubmission(id) {
      return unwrap(await db.from('respuestas').select(`${COLUMNS},request_hash`).eq('submission_id', id).maybeSingle());
    },
    async insertResponse(row) {
      return unwrap(await db.from('respuestas').insert(row).select(`${COLUMNS},request_hash`).single());
    },
    async listResponses({ query, character, page, pageSize }) {
      function filteredRequest(options) {
        let request = db.from('respuestas').select(COLUMNS, options);
        if (query) request = request.ilike('nombre', `%${query.replace(/[\\%_]/g, '\\$&')}%`);
        if (character) request = request.eq('resultado', character);
        return request;
      }
      const result = await filteredRequest({ count: 'exact' }).order('created_at', { ascending: false }).order('id', { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
      if (result.error?.code === 'PGRST103') {
        // Concurrent deletions can make a formerly valid page exceed the filtered total.
        // Fetch an unbounded HEAD count so the panel can move back to the last page.
        const countResult = await filteredRequest({ count: 'exact', head: true });
        unwrap(countResult);
        return { rows: [], total: countResult.count || 0 };
      }
      return { rows: unwrap(result), total: result.count || 0 };
    },
    async responseCounts() { return unwrap(await db.rpc('response_counts')); },
    async deleteResponse(id) { return unwrap(await db.from('respuestas').delete().eq('id', id).select('id').maybeSingle()); },
  };
}
