// Catégories préconfigurées (agenda, budget, livres, apprentissages).

export const EVENT_CATS = {
  travail: { name: 'Travail', color: '#2F6BDB', night: '#6C9BFF', tint: 'rgba(47,107,219,.14)', icon: 'work' },
  famille: { name: 'Famille', color: '#C9651F', night: '#F2A25B', tint: 'rgba(201,101,31,.14)', icon: 'family' },
  spirit: { name: 'Spirituel', color: '#7A4FD6', night: '#A98BFF', tint: 'rgba(122,79,214,.14)', icon: 'spirit' },
  sante: { name: 'Santé', color: '#14917C', night: '#3CC9AE', tint: 'rgba(20,145,124,.14)', icon: 'health' },
  perso: { name: 'Personnel', color: '#D2457A', night: '#F27BA6', tint: 'rgba(210,69,122,.14)', icon: 'perso' }
};

export const EXPENSE_CATS = [
  { id: 'logement', name: 'Logement', icon: 'home', color: '#4B3FD1' },
  { id: 'courses', name: 'Courses', icon: 'cart', color: '#0F7A68' },
  { id: 'transport', name: 'Transport', icon: 'car', color: '#2F6BDB' },
  { id: 'energie', name: 'Énergie', icon: 'bolt', color: '#9A6212' },
  { id: 'abos', name: 'Abonnements', icon: 'phone', color: '#7A4FD6' },
  { id: 'dons', name: 'Dîme & dons', icon: 'sprout', color: '#23744A' },
  { id: 'sante', name: 'Santé', icon: 'health', color: '#B0345F' },
  { id: 'loisirs', name: 'Loisirs', icon: 'sparkles', color: '#B8441F' },
  { id: 'resto', name: 'Restaurants', icon: 'utensils', color: '#C9651F' },
  { id: 'vetements', name: 'Vêtements', icon: 'shirt', color: '#5E5C73' },
  { id: 'cadeaux', name: 'Cadeaux', icon: 'gift', color: '#C23F72' },
  { id: 'education', name: 'Éducation', icon: 'education', color: '#0F6E86' }
];
export const expenseCat = (id) => EXPENSE_CATS.find((c) => c.id === id) || EXPENSE_CATS[0];

export const GOAL_STYLES = [
  { color: '#4B3FD1', icon: 'plane' },
  { color: '#B8441F', icon: 'shield' },
  { color: '#0F7A68', icon: 'laptop' },
  { color: '#9A6212', icon: 'target' },
  { color: '#B0345F', icon: 'gift' }
];

export const BOOK_CATS = {
  spi: { name: 'Spiritualité', color: '#7A4FD6' },
  dev: { name: 'Développement perso', color: '#0F7A68' },
  fin: { name: 'Finances', color: '#23744A' },
  roman: { name: 'Roman', color: '#B8441F' },
  bio: { name: 'Biographie', color: '#B0345F' },
  hist: { name: 'Histoire', color: '#9A6212' },
  pro: { name: 'Professionnel', color: '#2F6BDB' },
  autre: { name: 'Autre', color: '#5E5C73' }
};

export const PALETTE = ['#4B3FD1', '#B8441F', '#23744A', '#0F7A68', '#9A6212', '#B0345F', '#2F6BDB', '#7A4FD6'];

export const LEVELS = ['Découverte', 'Débutant', 'Apprenti', 'Intermédiaire', 'Confirmé', 'Avancé', 'Expert', 'Maître'];
/** Minutes de pratique nécessaires pour passer un niveau. */
export const LEVEL_MIN = 600;

export const SKILL_TEMPLATES = [
  { id: 'instrument', name: 'Instrument', icon: 'note', color: '#4B3FD1', unit: 'morceaux', example: 'Piano, guitare…',
    steps: ['Lire les notes', 'Gammes de base', 'Premier morceau simple', 'Coordination des deux mains', 'Morceau de niveau intermédiaire', 'Jouer devant quelqu’un'] },
  { id: 'langue', name: 'Langue', icon: 'lang', color: '#B8441F', unit: 'mots appris', example: 'Anglais, espagnol…',
    steps: ['A1 · Se présenter', 'A2 · Situations courantes', 'B1 · Se débrouiller en voyage', 'B2 · Conversation fluide', 'C1 · Aisance professionnelle', 'C2 · Maîtrise'] },
  { id: 'sport', name: 'Sport', icon: 'sport', color: '#2F6BDB', unit: 'séances', example: 'Course, natation…',
    steps: ['Première séance complète', '3 séances par semaine pendant 1 mois', 'Objectif intermédiaire', 'Objectif final'] },
  { id: 'pro', name: 'Compétence pro', icon: 'work', color: '#0F7A68', unit: 'modules', example: 'Excel, gestion de projet…',
    steps: ['Bases théoriques', 'Premier projet pratique', 'Validation ou certification', 'Utiliser au quotidien au travail'] },
  { id: 'art', name: 'Art & création', icon: 'palette', color: '#B0345F', unit: 'créations', example: 'Dessin, couture…',
    steps: ['Matériel et bases', 'Première création terminée', 'Trouver son style', 'Partager ou exposer'] },
  { id: 'autre', name: 'Autre', icon: 'sparkles', color: '#9A6212', unit: 'réussites', example: 'Prise de parole…',
    steps: ['Premier pas', 'À mi-chemin', 'Objectif atteint'] }
];
export const skillTemplate = (id) => SKILL_TEMPLATES.find((t) => t.id === id) || SKILL_TEMPLATES[5];
