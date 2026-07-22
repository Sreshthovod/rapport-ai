import { CanonicalMessage } from '@rapport/shared';

export const MAKING_PLANS_FIXTURE: CanonicalMessage[] = [
  { id: 'm1', sender: 'Alice', timestamp: Date.now() - 3600000, text: 'Hey, are we still free for lunch tomorrow at 1pm?', direction: 'incoming', type: 'text', attachments: [], reactions: [] },
  { id: 'm2', sender: 'User', timestamp: Date.now() - 3500000, text: 'Yes! I will send you the restaurant address in a bit.', direction: 'outgoing', type: 'text', attachments: [], reactions: [] },
];

export const BIRTHDAY_FIXTURE: CanonicalMessage[] = [
  { id: 'b1', sender: 'Bob', timestamp: Date.now() - 86400000, text: 'My birthday is coming up on October 24th! 🎉', direction: 'incoming', type: 'text', attachments: [], reactions: [] },
];

export const FAVOURITE_FOOD_FIXTURE: CanonicalMessage[] = [
  { id: 'f1', sender: 'Charlie', timestamp: Date.now() - 7200000, text: 'I am totally obsessed with authentic Japanese sushi and ramen 🍣', direction: 'incoming', type: 'text', attachments: [], reactions: [] },
];

export const MOVIE_FIXTURE: CanonicalMessage[] = [
  { id: 'v1', sender: 'Dana', timestamp: Date.now() - 5000000, text: 'I really love sci-fi movies like Interstellar on Netflix.', direction: 'incoming', type: 'text', attachments: [], reactions: [] },
];

export const TRAVEL_FIXTURE: CanonicalMessage[] = [
  { id: 't1', sender: 'Eve', timestamp: Date.now() - 4000000, text: 'I am traveling to Tokyo for a vacation next month!', direction: 'incoming', type: 'text', attachments: [], reactions: [] },
];
