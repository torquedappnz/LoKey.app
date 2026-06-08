import { UserProfile, Event } from './types';

export const PERSONALITY_TEST_QUESTIONS = [
  { id: 'q1', text: 'At a party, you...', a: 'Interact with many people including strangers', b: 'Interact with a few people you know well', dim: 'EI', aDir: 'E' },
  { id: 'q2', text: 'You are more...', a: 'Realistic than speculative', b: 'Speculative than realistic', dim: 'SN', aDir: 'S' },
  { id: 'q3', text: 'Is it worse to...', a: 'Have your head in the clouds', b: 'Be in a rut', dim: 'SN', aDir: 'S' },
  { id: 'q4', text: 'You are more impressed by...', a: 'Principles', b: 'Emotions', dim: 'TF', aDir: 'T' },
  { id: 'q5', text: 'You tend to have better rapport with...', a: 'The creative', b: 'The realists', dim: 'SN', aDir: 'N' },
  { id: 'q6', text: 'Which is a higher compliment: "very logical" or "very kind-hearted"?', a: 'Very logical', b: 'Very kind-hearted', dim: 'TF', aDir: 'T' },
  { id: 'q7', text: 'Do you prefer to work...', a: 'To deadlines', b: 'Just whenever the mood strikes you', dim: 'JP', aDir: 'J' },
  { id: 'q8', text: 'Do you tend to...', a: 'Think about several things at once', b: 'Fully focus on what you are doing', dim: 'EI', aDir: 'I' },
];

export function calculateMBTI(answers: Record<string, 'a' | 'b'>): string {
  const scores = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
  PERSONALITY_TEST_QUESTIONS.forEach(q => {
    const answer = answers[q.id];
    if (!answer) return;
    const chosen = answer === 'a' ? q.aDir : (q.aDir === 'E' ? 'I' : q.aDir === 'S' ? 'N' : q.aDir === 'T' ? 'F' : 'P');
    scores[chosen as keyof typeof scores]++;
  });
  return (scores.E >= scores.I ? 'E' : 'I') + (scores.S >= scores.N ? 'S' : 'N') + (scores.T >= scores.F ? 'T' : 'F') + (scores.J >= scores.P ? 'J' : 'P');
}

export const MOCK_EVENTS: Event[] = [
  {
    id: '1',
    title: 'LoKey Social Mixer',
    venue: 'Catacombs, Dunedin',
    date: '2026-03-15',
    time: '19:00',
    description: 'A low-pressure evening with curated conversation starters and pre-loaded drink credits in our underground lounge.',
    price: 20,
    creditValue: 15,
    imageUrl: 'https://picsum.photos/seed/catacombs-night/800/600',
    attendeesCount: 156
  },
  {
    id: '2',
    title: 'Vinyl & Vino',
    venue: 'Vault 21, Dunedin',
    date: '2026-03-22',
    time: '20:00',
    description: 'Deep cuts on the decks and deep conversations in the booths. Perfect for music lovers in a premium setting.',
    price: 20,
    creditValue: 15,
    imageUrl: 'https://picsum.photos/seed/vault-lounge/800/600',
    attendeesCount: 84
  },
  {
    id: '3',
    title: 'Sunday Roast & Board Games',
    venue: 'Cowboys, Queenstown',
    date: '2026-03-29',
    time: '14:00',
    description: 'A cozy Sunday afternoon with a rustic vibe for those who prefer games over loud music.',
    price: 25,
    creditValue: 15,
    imageUrl: 'https://picsum.photos/seed/cowboys-rustic/800/600',
    attendeesCount: 42
  }
];

export const ONBOARDING_QUESTIONS = [
  {
    id: 'values',
    question: 'What is your primary focus right now?',
    options: ['Career & Growth', 'Adventure & Travel', 'Stability & Home', 'Social Impact'],
    category: 'values'
  },
  {
    id: 'mbti',
    question: 'What is your 16Personalities type?',
    options: [
      'INTJ (Architect)', 'INTP (Logician)', 'ENTJ (Commander)', 'ENTP (Debater)',
      'INFJ (Advocate)', 'INFP (Mediator)', 'ENFJ (Protagonist)', 'ENFP (Campaigner)',
      'ISTJ (Logistician)', 'ISFJ (Defender)', 'ESTJ (Executive)', 'ESFJ (Consul)',
      'ISTP (Virtuoso)', 'ISFP (Adventurer)', 'ESTP (Entrepreneur)', 'ESFP (Entertainer)',
      "I'm Not Sure"
    ],
    category: 'mbti'
  },
  {
    id: 'hobbies',
    question: 'Pick your favorite weekend activity:',
    options: ['Hiking & Nature', 'Gaming & Tech', 'Art & Museums', 'Music & Gigs', 'Café Hopping'],
    category: 'hobbies'
  },
  {
    id: 'attachment',
    question: 'How do you typically handle intimacy?',
    options: ['Secure', 'Anxious', 'Avoidant', 'Disorganized'],
    category: 'attachmentStyle'
  }
];
