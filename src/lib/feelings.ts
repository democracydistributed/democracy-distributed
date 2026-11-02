// The four reactions. `value` matches the Reaction module's Select options in
// Corteza exactly, so it can be sent as-is when saving.

export type FeelingValue = 'Reasonable' | 'Surprised' | 'Confused' | 'Concerned';

export interface Feeling {
  value: FeelingValue;
  mouth: string;
  color: string;
}

export const FEELINGS: Feeling[] = [
  { value: 'Reasonable', mouth: 'M15 29 Q24 38 33 29', color: 'var(--teal-text, var(--teal))' },
  { value: 'Surprised', mouth: 'M24 29 a3.6 4.6 0 1 0 0.01 0', color: 'var(--amber-text, var(--amber))' },
  { value: 'Confused', mouth: 'M15 32 Q21 27 33 31', color: 'var(--purple)' },
  { value: 'Concerned', mouth: 'M15 34 Q24 26 33 34', color: 'var(--red)' },
];

export const NEUTRAL_MOUTH = FEELINGS[0].mouth;
