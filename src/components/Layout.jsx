import { ArrowUpRight, Disc3, Heart } from 'lucide-react';
export default function Layout({ children, navigate }) {
  return <div className="site-shell"><a className="skip-link" href="#main-content">Saltar al contenido</a><header className="site-header">
    <a className="brand" href="/" onClick={e => { e.preventDefault(); navigate('/'); }} aria-label="Rebelde Way, inicio"><span className="brand-icon">R<span>★</span></span><span className="brand-name">REBELDE<span>WAY.</span></span></a>
    <div className="header-edition"><span className="status-dot" />EL ESPÍRITU SIGUE VIVO<span className="edition-year">/ 2026</span></div><div className="header-stamp"><Disc3 size={16} /> EL TEST <ArrowUpRight size={15} /></div>
  </header><main id="main-content">{children}</main><footer className="site-footer"><span>HECHO CON <Heart size={12} fill="currentColor" /> Y UN POCO DE REBELDÍA.</span><span>Un homenaje de fans. Sin afiliación oficial.</span><span className="footer-year">EST. 2002 — PARA SIEMPRE</span></footer></div>;
}
