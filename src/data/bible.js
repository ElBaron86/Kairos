// Plans thématiques et liste des livres de la Bible (nombre de chapitres, Louis Segond).

const R = (ref, focus) => ({ ref, focus });

export const THEMES = [
  { id: 'foi', name: 'Foi', icon: 'flame', color: '#4B3FD1', key: 'Hébreux 11:1', desc: 'Apprendre à faire confiance à Dieu au quotidien.',
    days: [R('Hébreux 11:1-16', 'Les témoins de la foi'), R('Romains 10:8-17', 'La foi vient de ce qu’on entend'), R('Marc 11:20-25', 'Prier avec confiance'), R('Matthieu 17:14-21', 'Une foi comme un grain de moutarde'), R('Jacques 2:14-26', 'Une foi qui agit'), R('Éphésiens 2:1-10', 'Sauvés par grâce'), R('2 Corinthiens 5:1-10', 'Marcher par la foi')] },
  { id: 'courage', name: 'Courage', icon: 'shield', color: '#B8441F', key: 'Josué 1:9', desc: 'Avancer sans crainte, appuyé sur Sa présence.',
    days: [R('Deutéronome 31:1-8', 'Il ne t’abandonnera pas'), R('Psaume 27', 'L’Éternel est ma lumière'), R('Josué 1:1-9', 'Fortifie-toi'), R('Ésaïe 41:8-13', 'Je te soutiens'), R('Daniel 3', 'Debout dans la fournaise'), R('Daniel 6', 'Fidèle face aux lions'), R('2 Timothée 1:3-14', 'Un esprit de force')] },
  { id: 'finances', name: 'Finances', icon: 'sprout', color: '#23744A', key: 'Matthieu 6:33', desc: 'Gérer ses biens avec sagesse et générosité.',
    days: [R('Proverbes 3:1-10', 'Honorer Dieu de ses biens'), R('Matthieu 6:19-34', 'Le vrai trésor'), R('Luc 12:13-21', 'Le riche insensé'), R('Luc 14:25-33', 'Calculer la dépense'), R('Proverbes 22:1-9', 'Dette et générosité'), R('1 Timothée 6:6-19', 'Le contentement'), R('Philippiens 4:10-20', 'Dieu pourvoira')] },
  { id: 'paix', name: 'Paix', icon: 'wave', color: '#0F7A68', key: 'Philippiens 4:7', desc: 'Trouver le repos de l’âme au milieu de l’agitation.',
    days: [R('Psaume 23', 'Le bon berger'), R('Ésaïe 26:1-4', 'Une paix parfaite'), R('Jean 14:15-27', 'Je vous laisse la paix'), R('Matthieu 11:25-30', 'Venez à moi'), R('Philippiens 4:4-9', 'Ne vous inquiétez de rien'), R('Colossiens 3:12-17', 'Que la paix règne'), R('Romains 5:1-5', 'La paix avec Dieu')] },
  { id: 'sagesse', name: 'Sagesse', icon: 'bulb', color: '#9A6212', key: 'Jacques 1:5', desc: 'Demander la sagesse et apprendre à discerner.',
    days: [R('Proverbes 1:1-7', 'Le commencement de la sagesse'), R('Proverbes 2', 'Chercher comme un trésor'), R('Proverbes 3:13-26', 'Heureux qui trouve la sagesse'), R('Jacques 1:2-8', 'Demander avec foi'), R('Jacques 3:13-18', 'La sagesse d’en haut'), R('Ecclésiaste 3:1-15', 'Un temps pour tout'), R('Psaume 90', 'Compter nos jours')] },
  { id: 'pardon', name: 'Pardon', icon: 'health', color: '#B0345F', key: '1 Jean 1:9', desc: 'Recevoir le pardon et apprendre à pardonner.',
    days: [R('Psaume 51', 'Un cœur pur'), R('Psaume 103', 'Il pardonne toutes tes fautes'), R('Luc 15:11-32', 'Le fils prodigue'), R('Matthieu 18:21-35', 'Soixante-dix fois sept fois'), R('Éphésiens 4:25-32', 'Pardonnez-vous'), R('Colossiens 3:12-15', 'Comme le Seigneur vous a pardonné'), R('1 Jean 1:5-10', 'Marcher dans la lumière')] }
];
export const theme = (id) => THEMES.find((t) => t.id === id);

export const OT = [['Genèse', 50], ['Exode', 40], ['Lévitique', 27], ['Nombres', 36], ['Deutéronome', 34], ['Josué', 24], ['Juges', 21], ['Ruth', 4], ['1 Samuel', 31], ['2 Samuel', 24], ['1 Rois', 22], ['2 Rois', 25], ['1 Chroniques', 29], ['2 Chroniques', 36], ['Esdras', 10], ['Néhémie', 13], ['Esther', 10], ['Job', 42], ['Psaumes', 150], ['Proverbes', 31], ['Ecclésiaste', 12], ['Cantique des cantiques', 8], ['Ésaïe', 66], ['Jérémie', 52], ['Lamentations', 5], ['Ézéchiel', 48], ['Daniel', 12], ['Osée', 14], ['Joël', 3], ['Amos', 9], ['Abdias', 1], ['Jonas', 4], ['Michée', 7], ['Nahum', 3], ['Habacuc', 3], ['Sophonie', 3], ['Aggée', 2], ['Zacharie', 14], ['Malachie', 4]];
export const NT = [['Matthieu', 28], ['Marc', 16], ['Luc', 24], ['Jean', 21], ['Actes', 28], ['Romains', 16], ['1 Corinthiens', 16], ['2 Corinthiens', 13], ['Galates', 6], ['Éphésiens', 6], ['Philippiens', 4], ['Colossiens', 4], ['1 Thessaloniciens', 5], ['2 Thessaloniciens', 3], ['1 Timothée', 6], ['2 Timothée', 4], ['Tite', 3], ['Philémon', 1], ['Hébreux', 13], ['Jacques', 5], ['1 Pierre', 5], ['2 Pierre', 3], ['1 Jean', 5], ['2 Jean', 1], ['3 Jean', 1], ['Jude', 1], ['Apocalypse', 22]];
export const ALL_BOOKS = [...OT, ...NT];

/**
 * Découpe les livres choisis en lectures quotidiennes.
 * @param {string[]} books Livres choisis (dans n'importe quel ordre).
 * @param {number} pace Chapitres par lecture.
 * @returns {{ref: string, focus: string}[]}
 */
export const buildDays = (books, pace) => {
  const chapters = [];
  ALL_BOOKS.filter(([n]) => books.includes(n)).forEach(([n, c]) => {
    for (let i = 1; i <= c; i += 1) chapters.push([n, i]);
  });
  const days = [];
  for (let i = 0; i < chapters.length; i += pace) {
    const chunk = chapters.slice(i, i + pace);
    const [b0, c0] = chunk[0];
    const [b1, c1] = chunk[chunk.length - 1];
    const single = ALL_BOOKS.find(([n]) => n === b0)[1] === 1;
    let ref;
    if (b0 === b1) ref = c0 === c1 ? (single ? b0 : `${b0} ${c0}`) : `${b0} ${c0}-${c1}`;
    else ref = `${b0} ${c0} – ${b1} ${c1}`;
    days.push({ ref, focus: `${chunk.length} chapitre${chunk.length > 1 ? 's' : ''}` });
  }
  return days;
};
