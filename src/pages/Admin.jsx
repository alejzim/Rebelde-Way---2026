import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, Eye, EyeOff, LoaderCircle, LockKeyhole, LogOut, RefreshCw, Search, ShieldCheck, Trash2, Users, X } from 'lucide-react';
import '../styles/admin.css';

const CHARACTERS = [
  { id: 'marizza', name: 'Marizza' },
  { id: 'mia', name: 'Mía' },
  { id: 'pablo', name: 'Pablo' },
  { id: 'manuel', name: 'Manuel' },
];
const INITIAL_DATA = { rows: [], total: 0, totalAll: 0, counts: {}, page: 1, pageSize: 20 };

async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) {
    const error = new Error(payload?.error || 'No pudimos completar la solicitud. Intentá de nuevo.');
    error.status = response.status;
    throw error;
  }
  return payload;
}

function Spinner() {
  return <LoaderCircle className="admin-spinner" size={18} aria-hidden="true" />;
}

function Brand() {
  return <a className="admin-brand" href="/" aria-label="Rebelde Way, volver al inicio">
    <span className="admin-brand-mark" aria-hidden="true">rw<span>★</span></span>
    <span>REBELDE<br />WAY<span className="admin-brand-year">EL ESPÍRITU SIGUE.</span></span>
  </a>;
}

function Alert({ children, id }) {
  return <div className="admin-alert" role="alert" id={id}><AlertCircle size={18} aria-hidden="true" /><p>{children}</p></div>;
}

function Login({ status, error, busy, onSubmit, onRetry }) {
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const passwordRef = useRef(null);
  useEffect(() => { if (status === 'guest') passwordRef.current?.focus(); }, [status]);

  async function submit(event) {
    event.preventDefault();
    if (busy || !password) return;
    if (await onSubmit(password)) setPassword('');
  }

  return <main className="admin-login">
    <section className="admin-login-story" aria-label="Panel de administración">
      <Brand />
      <div className="admin-login-story-copy">
        <span className="admin-eyebrow">DETRÁS DEL ESCENARIO</span>
        <h1>Todo lo que<br />nos hace<br /><em>rebeldes.</em></h1>
        <p>Las historias, las respuestas y esa actitud que nunca se pierde.</p>
        <div className="admin-login-stamp" aria-hidden="true">SOLO PARA<br />EL EQUIPO <span>↗</span></div>
      </div>
      <span className="admin-login-edition">ARCHIVO REBELDE / EDICIÓN 2026</span>
    </section>
    <section className="admin-login-form-panel">
      <a href="/" className="admin-back-link"><ArrowLeft size={16} aria-hidden="true" /> Volver al inicio</a>
      <div className="admin-login-form-wrap">
        <span className="admin-lock-icon"><LockKeyhole size={25} aria-hidden="true" /></span>
        <span className="admin-eyebrow">ACCESO PRIVADO</span>
        <h2>Entrá al backstage.</h2>
        <p className="admin-muted">Ingresá tu contraseña para administrar las respuestas del test.</p>
        {status === 'checking' ? <div className="admin-session-status" role="status"><Spinner /> Verificando tu sesión…</div>
          : status === 'unavailable' ? <div className="admin-session-unavailable"><Alert>{error}</Alert><button type="button" className="admin-button admin-button--primary" onClick={onRetry}><RefreshCw size={17} aria-hidden="true" /> Volver a intentar</button></div>
            : <form onSubmit={submit} className="admin-login-form">
              <label htmlFor="admin-password">Contraseña</label>
              <div className="admin-password-field">
                <input ref={passwordRef} id="admin-password" type={visible ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" placeholder="Tu contraseña de administrador" required disabled={busy} aria-describedby={error ? 'admin-login-error' : undefined} aria-invalid={Boolean(error)} />
                <button type="button" className="admin-icon-button" onClick={() => setVisible(value => !value)} aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={visible}>{visible ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}</button>
              </div>
              {error && <Alert id="admin-login-error">{error}</Alert>}
              <button className="admin-button admin-button--primary admin-login-submit" type="submit" disabled={busy || !password}>{busy ? <><Spinner /> Ingresando…</> : <>Ingresar al panel <ArrowRight size={18} aria-hidden="true" /></>}</button>
            </form>}
        <p className="admin-login-security"><ShieldCheck size={15} aria-hidden="true" /> Acceso exclusivo para administradores.</p>
      </div>
      <span className="admin-login-footnote">REBELDE WAY · LA REBELDÍA NO PASA DE MODA.</span>
    </section>
  </main>;
}

function DeleteDialog({ row, busy, error, onCancel, onConfirm, fallbackRef }) {
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    cancelRef.current?.focus();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
      else fallbackRef.current?.focus();
    };
  }, [fallbackRef]);
  useEffect(() => { if (busy) dialogRef.current?.focus(); }, [busy]);

  return <dialog ref={dialogRef} className="admin-dialog" aria-labelledby="admin-delete-title" aria-describedby="admin-delete-description" aria-busy={busy} tabIndex={-1} onCancel={event => { event.preventDefault(); if (!busy) onCancel(); }}>
    <div className="admin-dialog-icon"><Trash2 size={24} aria-hidden="true" /></div>
    <span className="admin-eyebrow">ELIMINAR RESPUESTA</span>
    <h2 id="admin-delete-title">¿La eliminamos?</h2>
    <p id="admin-delete-description">Vas a eliminar la respuesta de <strong>{row.nombre}</strong>. Esta acción es permanente y no se puede deshacer.</p>
    {error && <Alert>{error}</Alert>}
    <div className="admin-dialog-actions">
      <button ref={cancelRef} type="button" className="admin-button admin-button--secondary" onClick={onCancel} disabled={busy}>Cancelar</button>
      <button type="button" className="admin-button admin-button--primary" onClick={onConfirm} disabled={busy}>{busy ? <><Spinner /> Eliminando…</> : <><Trash2 size={16} aria-hidden="true" /> Sí, eliminar</>}</button>
    </div>
  </dialog>;
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Fecha no disponible' : new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
}

export default function Admin() {
  const [authStatus, setAuthStatus] = useState('checking');
  const [csrfToken, setCsrfToken] = useState('');
  const [loginError, setLoginError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [sessionAttempt, setSessionAttempt] = useState(0);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [character, setCharacter] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(INITIAL_DATA);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [actionError, setActionError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [notice, setNotice] = useState('');
  const searchRef = useRef(null);
  const mutationRef = useRef(null);

  const expireSession = useCallback(() => {
    setAuthStatus('guest');
    setCsrfToken('');
    setData(INITIAL_DATA);
    setHasLoaded(false);
    setDeleting(null);
    setNotice('');
    setLoginError('Tu sesión venció. Ingresá de nuevo para continuar.');
  }, []);

  useEffect(() => () => mutationRef.current?.abort(), []);

  useEffect(() => {
    const controller = new AbortController();
    setAuthStatus('checking');
    setLoginError('');
    request('/api/admin/session', { signal: controller.signal }).then(payload => {
      if (controller.signal.aborted) return;
      if (payload.authenticated && payload.csrfToken) {
        setCsrfToken(payload.csrfToken);
        setAuthStatus('authenticated');
      } else setAuthStatus('guest');
    }).catch(error => {
      if (controller.signal.aborted) return;
      if (error.status === 401) setAuthStatus('guest');
      else { setLoginError(error.message); setAuthStatus('unavailable'); }
    });
    return () => controller.abort();
  }, [sessionAttempt]);

  useEffect(() => {
    const timer = window.setTimeout(() => { setQuery(search.trim()); setPage(1); }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    const controller = new AbortController();
    setLoading(true);
    setListError('');
    const params = new URLSearchParams({ q: query, character, page: String(page) });
    request(`/api/admin/responses?${params}`, { signal: controller.signal }).then(payload => {
      if (controller.signal.aborted) return;
      const pageSize = Number(payload.pageSize) || 20;
      const lastPage = Math.max(1, Math.ceil(Number(payload.total) / pageSize));
      if (page > lastPage) { setPage(lastPage); return; }
      setData({ ...INITIAL_DATA, ...payload, pageSize });
      setHasLoaded(true);
    }).catch(error => {
      if (controller.signal.aborted) return;
      if (error.status === 401) expireSession();
      else setListError(error.message);
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [authStatus, query, character, page, refresh, expireSession]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  async function login(password) {
    if (authBusy) return false;
    const controller = new AbortController();
    mutationRef.current = controller;
    setAuthBusy(true);
    setLoginError('');
    try {
      const payload = await request('/api/admin/login', { method: 'POST', body: JSON.stringify({ password }), signal: controller.signal });
      if (controller.signal.aborted) return false;
      if (!payload.authenticated || !payload.csrfToken) throw new Error('No pudimos iniciar la sesión. Intentá de nuevo.');
      setCsrfToken(payload.csrfToken);
      setPage(1);
      setActionError('');
      setAuthStatus('authenticated');
      return true;
    } catch (error) {
      if (!controller.signal.aborted) setLoginError(error.message);
      return false;
    } finally { if (!controller.signal.aborted) setAuthBusy(false); }
  }

  async function logout() {
    if (authBusy || deleteBusy) return;
    const controller = new AbortController();
    mutationRef.current = controller;
    setAuthBusy(true);
    setActionError('');
    try {
      await request('/api/admin/logout', { method: 'POST', headers: { 'X-CSRF-Token': csrfToken }, signal: controller.signal });
      if (controller.signal.aborted) return;
      setAuthStatus('guest'); setCsrfToken(''); setData(INITIAL_DATA); setHasLoaded(false);
      setLoginError(''); setSearch(''); setQuery(''); setCharacter(''); setPage(1); setNotice('');
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error.status === 401) expireSession(); else setActionError(error.message);
    } finally { if (!controller.signal.aborted) setAuthBusy(false); }
  }

  async function confirmDelete() {
    if (!deleting || deleteBusy) return;
    const controller = new AbortController();
    mutationRef.current = controller;
    setDeleteBusy(true);
    setDeleteError('');
    try {
      await request(`/api/admin/responses/${encodeURIComponent(deleting.id)}`, { method: 'DELETE', headers: { 'X-CSRF-Token': csrfToken }, signal: controller.signal });
      if (controller.signal.aborted) return;
      setDeleting(null);
      setNotice('La respuesta se eliminó correctamente.');
      setRefresh(value => value + 1);
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error.status === 401) expireSession(); else setDeleteError(error.message);
    } finally { if (!controller.signal.aborted) setDeleteBusy(false); }
  }

  if (authStatus !== 'authenticated') return <Login status={authStatus} error={loginError} onSubmit={login} busy={authBusy} onRetry={() => setSessionAttempt(value => value + 1)} />;

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const filtersActive = Boolean(query || character);
  const tableBusy = loading || search.trim() !== query;

  return <>
    <div className="admin-shell">
      <a className="admin-skip-link" href="#admin-content">Saltar al contenido</a>
      <aside className="admin-sidebar">
        <Brand />
        <div className="admin-sidebar-menu"><span className="admin-eyebrow">BACKSTAGE</span><span className="admin-nav-active"><Users size={18} aria-hidden="true" /> Respuestas <span aria-hidden="true">↗</span></span></div>
        <div className="admin-sidebar-bottom">
          <span className="admin-session-badge"><span /> Sesión de administrador</span>
          <button className="admin-logout" onClick={logout} disabled={authBusy || deleteBusy}>{authBusy ? <Spinner /> : <LogOut size={17} aria-hidden="true" />}{authBusy ? 'Cerrando sesión…' : 'Cerrar sesión'}</button>
          <a href="/" className="admin-back-link"><ArrowLeft size={15} aria-hidden="true" /> Volver al sitio</a>
        </div>
      </aside>
      <main id="admin-content" className="admin-content" tabIndex={-1}>
        <header className="admin-page-header">
          <div><span className="admin-eyebrow">EL ARCHIVO REBELDE</span><h1>Una banda.<br className="admin-mobile-break" /> Muchas historias<span>.</span></h1><p className="admin-muted">Todas las respuestas del test, en un solo lugar.</p></div>
          <span className="admin-private-tag"><LockKeyhole size={13} aria-hidden="true" /> PANEL PRIVADO</span>
        </header>
        {actionError && <Alert>{actionError}</Alert>}
        <div className="admin-notice-region" role="status" aria-live="polite">{notice && <div className="admin-notice"><Check size={17} aria-hidden="true" />{notice}</div>}</div>
        <section className="admin-stats" aria-label="Estadísticas de todas las respuestas">
          <div className="admin-stat-total"><div><span>RESPUESTAS TOTALES</span><Users size={19} aria-hidden="true" /></div><strong>{hasLoaded ? data.totalAll.toLocaleString('es-AR') : '—'}</strong><p>La comunidad va creciendo.</p></div>
          {CHARACTERS.map(item => {
            const count = Number(data.counts?.[item.id]) || 0;
            const percentage = data.totalAll ? Math.round(count / data.totalAll * 100) : 0;
            return <article key={item.id} className={`admin-stat admin-stat--${item.id}`}><div><h2>{item.name}</h2><span className="admin-stat-dot" aria-hidden="true" /></div><strong>{hasLoaded ? count.toLocaleString('es-AR') : '—'}</strong><div className="admin-stat-bar" role="img" aria-label={`${item.name}: ${percentage}% de todas las respuestas`}><span style={{ width: `${percentage}%` }} /></div><p>{hasLoaded ? `${percentage}% de la banda` : 'Cargando estadísticas…'}</p></article>;
          })}
        </section>
        <section className="admin-responses" aria-labelledby="admin-responses-title">
          <div className="admin-section-header">
            <div><span className="admin-eyebrow">LO QUE DIJERON</span><h2 id="admin-responses-title">Respuestas del test <span>{hasLoaded ? data.total.toLocaleString('es-AR') : '—'}</span></h2></div>
            <button type="button" className="admin-button admin-button--secondary admin-refresh" onClick={() => setRefresh(value => value + 1)} disabled={tableBusy || deleteBusy} aria-label="Actualizar respuestas">{loading ? <Spinner /> : <RefreshCw size={16} aria-hidden="true" />}<span>Actualizar</span></button>
          </div>
          <div className="admin-filters">
            <div className="admin-search"><Search size={18} aria-hidden="true" /><label className="admin-sr-only" htmlFor="admin-search">Buscar respuestas por nombre</label><input ref={searchRef} id="admin-search" type="search" placeholder="Buscá por nombre…" value={search} onChange={event => setSearch(event.target.value)} autoComplete="off" />{search && <button className="admin-icon-button" type="button" onClick={() => { setSearch(''); searchRef.current?.focus(); }} aria-label="Borrar búsqueda"><X size={16} aria-hidden="true" /></button>}</div>
            <div className="admin-character-filter"><label htmlFor="admin-character">Personaje</label><select id="admin-character" value={character} onChange={event => { setCharacter(event.target.value); setPage(1); }}><option value="">Todos los personajes</option>{CHARACTERS.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
            <span className="admin-sort-label">Más recientes primero</span>
          </div>
          <div className="admin-table-status" role="status" aria-live="polite">{tableBusy ? <><Spinner /> Cargando respuestas…</> : !listError ? `${data.total.toLocaleString('es-AR')} ${data.total === 1 ? 'respuesta encontrada' : 'respuestas encontradas'}` : ''}</div>
          {listError ? <div className="admin-table-empty"><AlertCircle size={30} aria-hidden="true" /><h3>No pudimos cargar las respuestas.</h3><p role="alert">{listError}</p><button className="admin-button admin-button--secondary" type="button" onClick={() => setRefresh(value => value + 1)}><RefreshCw size={16} aria-hidden="true" /> Reintentar</button></div>
            : !tableBusy && data.rows.length === 0 ? <div className="admin-table-empty"><Users size={32} aria-hidden="true" /><h3>{filtersActive ? 'No hay coincidencias.' : 'La primera historia está por llegar.'}</h3><p>{filtersActive ? 'Probá con otro nombre o elegí un personaje diferente.' : 'Las respuestas van a aparecer acá cuando alguien complete el test.'}</p>{filtersActive && <button type="button" className="admin-button admin-button--secondary" onClick={() => { setSearch(''); setQuery(''); setCharacter(''); setPage(1); }}>Limpiar filtros</button>}</div>
              : <div className={`admin-table-scroll ${tableBusy ? 'admin-table-scroll--loading' : ''}`} role="region" aria-label="Tabla de respuestas; desplazate horizontalmente para ver todas las preguntas" tabIndex={0} aria-busy={tableBusy}>
                <table className="admin-table">
                  <caption className="admin-sr-only">Respuestas ordenadas de más reciente a más antigua. P1 a P5 contienen las cinco respuestas.</caption>
                  <thead><tr><th scope="col">Nombre</th>{[1, 2, 3, 4, 5].map(number => <th scope="col" key={number}><span>P{number}</span><span className="admin-th-description">Pregunta {number}</span></th>)}<th scope="col">Resultado</th><th scope="col">Fecha</th><th scope="col"><span className="admin-sr-only">Acciones</span></th></tr></thead>
                  <tbody>{data.rows.map(row => {
                    const result = CHARACTERS.find(item => item.id === row.resultado);
                    return <tr key={row.id}>
                      <th scope="row"><span className="admin-response-name">{row.nombre}</span></th>
                      {[1, 2, 3, 4, 5].map(number => <td key={number}>{row[`pregunta${number}`] || '—'}</td>)}
                      <td><span className={`admin-character-chip admin-character-chip--${result?.id || 'unknown'}`}>{result?.name || row.resultado}</span></td>
                      <td className="admin-date"><time dateTime={row.created_at}>{formatDate(row.created_at)}</time></td>
                      <td><button type="button" className="admin-delete-button" disabled={tableBusy || authBusy} onClick={() => { setDeleting(row); setDeleteError(''); }} aria-label={`Eliminar respuesta de ${row.nombre}`} title={`Eliminar respuesta de ${row.nombre}`}><Trash2 size={17} aria-hidden="true" /></button></td>
                    </tr>;
                  })}</tbody>
                </table>
              </div>}
          <div className="admin-pagination">
            <p>{!hasLoaded || listError ? '20 respuestas por página' : data.total === 0 ? '0 respuestas' : <>Mostrando <strong>{(page - 1) * data.pageSize + 1}–{Math.min(page * data.pageSize, data.total)}</strong> de <strong>{data.total}</strong></>}</p>
            <nav aria-label="Páginas de respuestas"><button type="button" className="admin-page-button" disabled={tableBusy || Boolean(listError) || page <= 1} onClick={() => setPage(value => value - 1)} aria-label="Página anterior"><ChevronLeft size={18} aria-hidden="true" /></button><span>Página <strong>{page}</strong> de {totalPages}</span><button type="button" className="admin-page-button" disabled={tableBusy || Boolean(listError) || page >= totalPages} onClick={() => setPage(value => value + 1)} aria-label="Página siguiente"><ChevronRight size={18} aria-hidden="true" /></button></nav>
          </div>
        </section>
        <footer className="admin-page-footer"><span>REBELDE WAY · EDICIÓN 2026</span><span>El espíritu sigue intacto. <span aria-hidden="true">↗</span></span></footer>
      </main>
    </div>
    {deleting && <DeleteDialog row={deleting} busy={deleteBusy} error={deleteError} onCancel={() => { if (!deleteBusy) setDeleting(null); }} onConfirm={confirmDelete} fallbackRef={searchRef} />}
  </>;
}
