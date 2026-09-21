import { useState } from 'react';
export default function CharacterImage({ character, className = '', ...props }) {
  const [fallback, setFallback] = useState(false);
  return <img className={className} src={fallback ? character.fallback : character.image} alt={fallback ? `Ilustración de referencia de ${character.shortName}` : character.name} onError={() => setFallback(true)} width="480" height="600" {...props} />;
}
