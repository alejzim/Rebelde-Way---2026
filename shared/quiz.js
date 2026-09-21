export const CHARACTER_IDS = ['marizza', 'mia', 'pablo', 'manuel'];
export const CHARACTERS = {
  marizza: { id: 'marizza', name: 'Marizza Pía Spirito', shortName: 'Marizza', label: 'Actitud sin filtro', description: 'Rebelde, decidida y siempre dispuesta a defender lo que considerás justo. Tenés una energía que contagia y un corazón enorme, aunque a veces lo escondas detrás de tu actitud.', quote: 'Tu voz no pide permiso.', color: '#d93833', tags: ['Auténtica', 'Valiente', 'Incondicional'], image: '/personajes/marizza.jpg', fallback: '/personajes/marizza.svg' },
  mia: { id: 'mia', name: 'Mía Colucci', shortName: 'Mía', label: 'Nacida para brillar', description: 'Divertida, expresiva y con un estilo propio que no pasa desapercibido. Disfrutás brillar, pero lo que más te hace especial es la sensibilidad y el cariño que compartís con los tuyos.', quote: 'El mundo es tu escenario.', color: '#c45484', tags: ['Creativa', 'Magnética', 'Sensible'], image: '/personajes/mia.jpg', fallback: '/personajes/mia.svg' },
  pablo: { id: 'pablo', name: 'Pablo Bustamante', shortName: 'Pablo', label: 'Un camino propio', description: 'Carismático, apasionado y con ganas de escribir tu propia historia. La música es tu refugio y, aunque a veces te cueste ir contra lo que esperan de vos, siempre buscás tu libertad.', quote: 'Tu historia la escribís vos.', color: '#53694f', tags: ['Carismático', 'Apasionado', 'Libre'], image: '/personajes/pablo.jpg', fallback: '/personajes/pablo.svg' },
  manuel: { id: 'manuel', name: 'Manuel Aguirre', shortName: 'Manuel', label: 'Corazón y convicción', description: 'Leal, perseverante y con sentimientos profundos. Cuidás a las personas que querés y luchás por tus metas. Tu calma tiene fuerza: cuando algo te importa, das todo de vos.', quote: 'Sentir también es ser rebelde.', color: '#496a91', tags: ['Leal', 'Intenso', 'Perseverante'], image: '/personajes/manuel.jpg', fallback: '/personajes/manuel.svg' },
};
export const QUESTIONS = [
  { id: 1, title: 'Si tenés un problema con una regla que te parece injusta, ¿qué hacés?', options: [
    'Me enfrento a quien sea necesario y digo lo que pienso.',
    'Intento resolverlo sin perder mi estilo ni quedar mal.',
    'Primero pienso cómo puede afectarme a mí y a mi familia.',
    'Aguanto, observo y busco la mejor forma de solucionarlo.',
    'Ninguna de las anteriores.',
  ] },
  { id: 2, title: '¿Cómo te describirían tus amigos?', options: [
    'Rebelde, directo/a y muy defensor/a de los demás.',
    'Divertido/a, llamativo/a y siempre pendiente de cómo me veo.',
    'Carismático/a, popular y a veces algo orgulloso/a.',
    'Leal, tranquilo/a y muy comprometido/a con quienes quiero.',
    'Ninguna de las anteriores.',
  ] },
  { id: 3, title: 'Si tuvieras que participar en una banda, ¿qué elegirías?', options: [
    'Algo con mucha energía, actitud y rock.',
    'Ser quien más destaque en el escenario y en las coreografías.',
    'Tocar la guitarra y ayudar a componer canciones.',
    'Cantar canciones intensas y con mucha emoción.',
    'Ninguna de las anteriores.',
  ] },
  { id: 4, title: 'Tenés una tarde completamente libre. ¿Qué plan preferís?', options: [
    'Salir con amigos y hacer algo espontáneo, aunque termine en problemas.',
    'Ir de compras, cambiar mi look o preparar una salida.',
    'Juntarme con amigos, tocar música o hacer algún plan divertido.',
    'Pasar tiempo con la gente que quiero o concentrarme en algún objetivo personal.',
    'Ninguna de las anteriores.',
  ] },
  { id: 5, title: '¿Qué es lo más importante para vos?', options: [
    'Defender lo que creo correcto, aunque tenga que enfrentarme a otros.',
    'Ser yo mismo/a, destacar y disfrutar la vida.',
    'Poder elegir mi propio camino sin que otros decidan por mí.',
    'Cuidar a las personas que quiero y cumplir mis metas.',
    'Ninguna de las anteriores.',
  ] },
];
