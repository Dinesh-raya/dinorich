// Hindu mythology inspired default player names
const PLAYER_NAME_POOL = [
  'Shiva', 'Vishnu', 'Hanuman', 'Krishna', 'Rama', 'Ganesha',
  'Kartikeya', 'Narayana', 'Rudra', 'Mahadev', 'Parashurama',
  'Indra', 'Surya', 'Agni', 'Varuna', 'Vayu', 'Yama',
  'Lakshmi', 'Saraswati', 'Durga',
];
export const getRandomName = () => PLAYER_NAME_POOL[Math.floor(Math.random() * PLAYER_NAME_POOL.length)];
