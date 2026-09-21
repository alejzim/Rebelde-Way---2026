import { lazy, Suspense, useEffect, useState } from 'react';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Quiz from './pages/Quiz.jsx';
import Result from './pages/Result.jsx';
const Admin = lazy(() => import('./pages/Admin.jsx'));
export default function App() {
  const [path, setPath] = useState(window.location.pathname.replace(/\/$/, '') || '/');
  const [name, setName] = useState('');
  const [completed, setCompleted] = useState(null);
  function navigate(to, replace = false) { window.history[replace ? 'replaceState' : 'pushState']({}, '', to); setPath(to); window.scrollTo({ top: 0, behavior: 'instant' }); }
  useEffect(() => { const handlePop = () => setPath(window.location.pathname.replace(/\/$/, '') || '/'); window.addEventListener('popstate', handlePop); return () => window.removeEventListener('popstate', handlePop); }, []);
  useEffect(() => { if (path === '/test' && !name) navigate('/', true); document.title = path === '/admin' ? 'Administración · Erreway' : '¿Qué integrante de Erreway sos? · Rebelde Way'; }, [path, name]);
  const restart = () => { setName(''); setCompleted(null); navigate('/'); };
  if (path === '/admin') return <Suspense fallback={<div className="loading-screen">Abriendo el panel...</div>}><Admin /></Suspense>;
  let content;
  if (path === '/') content = <Home onStart={value => { setName(value); setCompleted(null); navigate('/test'); }} />;
  else if (path === '/test' && name) content = <Quiz key={name} name={name} onExit={() => navigate('/')} onComplete={result => { setCompleted(result); navigate(`/resultado/${result.resultado}`); }} />;
  else if (/^\/resultado\/(marizza|mia|pablo|manuel)$/.test(path)) content = <Result characterId={path.split('/')[2]} name={completed?.resultado === path.split('/')[2] ? completed.nombre : ''} onRestart={restart} />;
  else content = <section className="not-found"><span className="eyebrow">ESTA PÁGINA SE FUE DE GIRA</span><h1>No encontramos ese escenario.</h1><button className="button button-red" onClick={restart}>Volver al inicio</button></section>;
  return <Layout navigate={navigate}>{content}</Layout>;
}
