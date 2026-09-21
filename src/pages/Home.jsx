import { useState } from 'react';
import { ArrowRight, Clock3, Disc3, Headphones, Sparkles, Star } from 'lucide-react';
import { CHARACTERS, CHARACTER_IDS } from '../../shared/quiz.js';
import CharacterImage from '../components/CharacterImage.jsx';
export default function Home({ onStart }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  function start(event) {
    event.preventDefault();
    const cleaned = name.normalize('NFKC').trim().replace(/\s+/g, ' ');
    if ([...cleaned].length < 2 || [...cleaned].length > 30 || !/^[\p{L}\p{M}\p{N} .,'’_-]+$/u.test(cleaned)) { setError('Escribí de 2 a 30 caracteres. Usá letras, números, espacios o guiones.'); return; }
    onStart(cleaned);
  }
  return <><section className="home-hero page-enter" aria-labelledby="home-title"><div className="hero-copy">
    <div className="eyebrow"><span className="mini-star">✳</span> LA NOSTALGIA TIENE SU LADO REBELDE</div>
    <h1 id="home-title">¿Qué integrante<br />de <span className="erreway-word">Erreway<svg viewBox="0 0 360 15" aria-hidden="true"><path d="M3 10Q130 0 354 7M30 14Q170 5 332 12" /></svg></span> sos<span className="question-mark">?</span></h1>
    <p className="hero-description">Cuatro personalidades. Una misma rebeldía.<br />Respondé 5 preguntas y descubrí quién llevás adentro.</p>
    <form className="start-form" onSubmit={start} noValidate><label htmlFor="participant-name">Antes de subir al escenario, ¿cómo te llamás?</label><div className="name-field"><input id="participant-name" name="nombre" autoComplete="given-name" placeholder="Tu nombre o apodo" value={name} onChange={e => { setName(e.target.value); setError(''); }} maxLength={40} aria-invalid={!!error} aria-describedby={error ? 'name-error' : 'name-privacy'} /><span aria-hidden="true">✎</span></div>
    {error && <p className="form-error" id="name-error" role="alert">{error}</p>}<button className="button button-red start-button" type="submit">Comenzar test <ArrowRight size={21} /></button><div className="form-meta"><span><Clock3 size={14} /> 5 preguntas · 2 minutos</span><span><Sparkles size={14} /> 100% vos</span></div><p id="name-privacy" className="privacy-note">Al terminar guardamos tu nombre y tus respuestas al test.</p></form>
  </div><div className="hero-art" aria-label="Los cuatro integrantes: Marizza, Mía, Pablo y Manuel"><div className="art-note">Diferentes, pero juntos.</div><Star className="art-star" size={57} strokeWidth={1.2} aria-hidden="true" /><div className="portrait-grid">{CHARACTER_IDS.map((id, index) => <div className={`polaroid polaroid-${id}`} key={id}><span className="tape" /><div className="polaroid-photo"><CharacterImage character={CHARACTERS[id]} /><span className="photo-number">0{index + 1}</span></div><div className="polaroid-caption"><span>{CHARACTERS[id].shortName}</span><span>{['★', '♡', '✦', '↗'][index]}</span></div></div>)}</div><div className="music-sticker"><Headphones size={19} /><span>LA MÚSICA NOS UNE.<br /><strong>LA ACTITUD NOS DEFINE.</strong></span></div><div className="vinyl-disc" aria-hidden="true"><span><Disc3 size={25} /></span></div><div className="art-bottom-note">4 formas de ser. Ninguna de encajar. <span>↗</span></div></div></section>
  <section className="lineup-section" aria-label="Cuatro formas de ser rebelde"><div className="lineup-intro"><span className="eyebrow">EL MISMO ESCENARIO.</span><h2>Cuatro formas de<br />ser rebelde.</h2></div><div className="lineup-list">{CHARACTER_IDS.map((id, index) => <div className="lineup-member" key={id}><span className="lineup-index">0{index + 1}</span><div><strong>{CHARACTERS[id].shortName}</strong><span>{CHARACTERS[id].label}</span></div><span className={`member-symbol member-${id}`}>{['✳', '♡', '✦', '↗'][index]}</span></div>)}</div></section></>;
}
