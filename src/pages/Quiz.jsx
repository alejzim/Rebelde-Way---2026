import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Disc3, Music2 } from 'lucide-react';
import { QUESTIONS } from '../../shared/quiz.js';
import { submitQuiz } from '../services/api.js';
export default function Quiz({ name, onComplete, onExit }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState(Array(5).fill(null));
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const id = useRef(crypto.randomUUID());
  const locked = useRef(false);
  const heading = useRef(null);
  const started = useRef(false);
  useEffect(() => { if (started.current) heading.current?.focus(); started.current = true; }, [index]);
  async function next(event) {
    event.preventDefault();
    if (answers[index] === null || locked.current) return;
    setError('');
    if (index < QUESTIONS.length - 1) { setIndex(index + 1); return; }
    locked.current = true; setStatus('submitting');
    try {
      const [result] = await Promise.all([submitQuiz({ nombre: name, answers, submissionId: id.current }), new Promise(resolve => setTimeout(resolve, 1200))]);
      onComplete(result);
    } catch (e) { setError(e.name === 'TimeoutError' || e.name === 'TypeError' ? 'No pudimos conectarnos. Tus respuestas siguen acá; volvé a intentarlo.' : e.message); setStatus('idle'); }
    finally { locked.current = false; }
  }
  function choose(value) {
    if (status === 'submitting') return;
    if (answers[index] !== value) id.current = crypto.randomUUID();
    setAnswers(current => current.map((answer, i) => i === index ? value : answer)); setError('');
  }
  if (status === 'submitting') return <section className="loading-screen page-enter" aria-live="polite" role="status"><div className="loading-record"><Disc3 size={85} strokeWidth={1} /></div><span className="eyebrow">SUBÍ EL VOLUMEN A TU PERSONALIDAD</span><h1>Descubriendo qué integrante<br />de Erreway sos...</h1><p>Tu lado rebelde está por salir al escenario.</p><div className="sound-bars" aria-hidden="true">{Array.from({ length: 7 }, (_, i) => <i key={i} />)}</div></section>;
  const question = QUESTIONS[index];
  return <section className="quiz-page page-enter"><div className="quiz-topline"><button className="text-button" onClick={onExit}><ArrowLeft size={16} /> Volver al inicio</button><span><Music2 size={15} /> TU LADO REBELDE, {name.toLocaleUpperCase('es')}</span></div><div className="quiz-layout"><aside className="quiz-aside"><span className="eyebrow">EL TEST</span><h2>No hay respuestas<br />correctas.<br /><span>Hay respuestas<br />muy tuyas.</span></h2><div className="aside-star">✳</div><p>Elegí la opción que más te represente.<br />Dejá que tu personalidad hable.</p><span className="quiz-track">TRACK 0{index + 1} / 05</span></aside><div className="question-sheet"><div className="question-progress"><span>Pregunta {index + 1} de 5</span><span>{(index + 1) * 20}%</span></div><div className="progress-track" role="progressbar" aria-label="Progreso del test" aria-valuenow={index + 1} aria-valuemin={0} aria-valuemax={5}><span style={{ width: `${(index + 1) * 20}%` }} /></div><form onSubmit={next}><fieldset className="question-content page-enter" key={index}><legend><span className="question-number">0{index + 1}.</span><h1 ref={heading} tabIndex={-1}>{question.title}</h1></legend><div className="answer-list">{question.options.map((option, answerIndex) => <label className={`answer-option ${answers[index] === answerIndex + 1 ? 'selected' : ''}`} key={answerIndex}><input type="radio" name={`question-${index}`} value={answerIndex + 1} checked={answers[index] === answerIndex + 1} onChange={() => choose(answerIndex + 1)} /><span className="answer-letter">{answers[index] === answerIndex + 1 ? <Check size={16} /> : String.fromCharCode(65 + answerIndex)}</span><span>{option}</span></label>)}</div></fieldset>{error && <p className="form-error submit-error" role="alert">{error}</p>}<div className="question-actions"><button type="button" className="text-button" disabled={index === 0} onClick={() => { setError(''); setIndex(index - 1); }}><ArrowLeft size={17} /> Anterior</button><button className="button button-red" type="submit" disabled={answers[index] === null}>{index === 4 ? (error ? 'Volver a intentar' : 'Descubrir mi resultado') : 'Siguiente'}<ArrowRight size={18} /></button></div></form></div></div></section>;
}
