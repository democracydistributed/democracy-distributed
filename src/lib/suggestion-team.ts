// Rule-based guess at which Team (a Department record) a new Suggestion belongs to.
// Server-side only: used by app/api/suggestions/route.ts when a suggestion is created.
//
// Each team has weighted keyword patterns. The suggestion's subject, text and category are
// scored; a team is chosen only if it has a score of at least MIN_SCORE AND beats the runner-up.
// Anything unclear returns null, because a blank team is better than a wrong public label.
// To tune: edit RULES below. Keys are the team's Department_Name, matched case-insensitively.

type Rule = { re: RegExp; w: number };

const RULES: Record<string, Rule[]> = {
  'Data & Research': [
    { re: /\bfinancial data request\b/i, w: 10 },
    { re: /\b(data(set)?s?|statistics|stats|figures?|numbers?)\b/i, w: 2 },
    { re: /\b(budget|budgets|spending|revenue|expenses?|audit(ed)?|financial statements?|contracts?|tenders?|procurement|salar(y|ies)|sunshine list)\b/i, w: 2 },
    { re: /\b(missing|outdated|incorrect|wrong|inaccurate|add (the )?data|source|csv|open data|foi|mfippa)\b/i, w: 1 },
    { re: /\bresearch(ing)?\b/i, w: 1 },
  ],
  'Design & UX': [
    { re: /\b(design|layout|ui|ux|colou?rs?|font|typography|icon|button|dark mode|spacing|align(ed|ment)?|looks? (ugly|confusing|off|bad))\b/i, w: 2 },
    { re: /\b(mobile|responsive|navigation|menu|tab|confusing|hard to (find|read|see)|accessib\w+|contrast|screen reader)\b/i, w: 1 },
  ],
  Engineering: [
    { re: /\b(bug|crash(es|ed)?|error|broken|doesn'?t work|not working|fails?|failed|loading|slow|timeout|glitch|freez\w+|stuck|login|log in|sign ?in|password)\b/i, w: 2 },
    { re: /\b(api|database|server|performance|search|filter|export|integration|feature)\b/i, w: 1 },
  ],
  Documentation: [
    { re: /\b(docs?|documentation|guide|tutorial|how[- ]to|readme|explain(ed|ing)?|unclear|faq|instructions?|help (page|text|article))\b/i, w: 2 },
    { re: /\b(wiki|glossary|terminology|definition)\b/i, w: 1 },
  ],
  'Community & Onboarding': [
    { re: /\b(onboarding|welcome|new (members?|users?|contributors?)|getting started|volunteer(s|ing)?|join(ing)?|sign ?up|community|moderat\w+|reputation|badges?|invite)\b/i, w: 2 },
    { re: /\b(members?|contribut\w+|forum|discord|events?)\b/i, w: 1 },
  ],
  'Marketing & Communications': [
    { re: /\b(marketing|newsletter|social media|twitter|instagram|linkedin|press|media|brand(ing)?|logo|announce\w*|blog|campaign|outreach|promot\w+|spread the word)\b/i, w: 2 },
    { re: /\b(share|story|stories|video|podcast)\b/i, w: 1 },
  ],
  Partnerships: [
    { re: /\b(partner(s|ship|ships)?|collaborat\w+|sponsor(s|ship)?|funding|grants?|donat\w+|nonprofit|non-profit|ngo|university|universit(y|ies)|council member|city staff|work with)\b/i, w: 2 },
    { re: /\b(organi[sz]ations?|journalists?|newsrooms?|libraries|library)\b/i, w: 1 },
  ],
  'User Research': [
    { re: /\b(user research|interviews?|survey(s|ed)?|usability|user testing|feedback sessions?|focus groups?|pain points?|user needs?|personas?)\b/i, w: 3 },
    { re: /\b(users?|visitors?|people (want|need)|why (do|don'?t) (people|users))\b/i, w: 1 },
  ],
};

// A suggestion's category is a weak extra hint, not a decider.
const CATEGORY_HINTS: Record<string, Record<string, number>> = {
  'This data looks wrong': { 'Data & Research': 3 },
  "Something's broken": { Engineering: 2 },
};

const MIN_SCORE = 2;

/** The Department_Name of the best-matching team, or null when nothing is clear enough. */
export function guessTeamName(input: { subject?: string; text?: string; category?: string }): string | null {
  const haystack = `${input.subject ?? ''}\n${input.text ?? ''}`;
  const scores = new Map<string, number>();

  for (const [team, rules] of Object.entries(RULES)) {
    let score = CATEGORY_HINTS[input.category ?? '']?.[team] ?? 0;
    for (const { re, w } of rules) if (re.test(haystack)) score += w;
    if (score > 0) scores.set(team, score);
  }

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const [best, runnerUp] = ranked;
  if (!best || best[1] < MIN_SCORE) return null;
  if (runnerUp && runnerUp[1] === best[1]) return null; // tie: don't guess
  return best[0];
}
