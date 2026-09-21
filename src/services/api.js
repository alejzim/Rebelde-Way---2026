export async function submitQuiz(payload) {
  const response = await fetch('/api/quiz', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(20000) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'No pudimos guardar tu test. Intentá de nuevo en un momento.');
  if (!data.resultado || !data.id) throw new Error('No pudimos confirmar tu resultado. Intentá de nuevo.');
  return data;
}
