// Hardcoded content for the redesigned category drawer (hackathon demo).
// Insights and engagement aren't backed by any data source yet: the copy below
// is written by hand from the 2024 FIR figures, and the reactions/comments are
// sample content. Nothing a visitor does in the Engagement tab is saved.
// Keyed by the drawer frame's label; a category without an entry here keeps
// the standard drawer.

export type FeelingKey = 'reasonable' | 'surprised' | 'confused' | 'concerned';

export interface DemoComment {
  feeling: FeelingKey;
  who: string;
  when: string;
  text: string;
  votes: number;
}

export interface DrawerDemo {
  insights: { label: string; text: string }[];
  source: string;
  reactions: Record<FeelingKey, number>;
  commentCount: number;
  comments: DemoComment[];
}

export const DRAWER_DEMOS: Record<string, DrawerDemo> = {
  'Toronto Transit Commission': {
    insights: [
      { label: 'Salaries and Benefits', text: 'Just over half of TTC spending, $1.8B (53%), went to salaries and benefits for the people who run and maintain the system.' },
      { label: 'Amortization', text: '$768.3M (22%) is amortization: the yearly share of what vehicles, track and stations cost, spread over their working life. No cash changes hands for it this year.' },
      { label: 'Contracted Services', text: '$395.7M (11%) went to outside contractors, more than the TTC spent on materials.' },
      { label: 'Materials', text: '$271.0M (8%) went to materials and supplies used to keep vehicles and stations running.' },
      { label: 'Interest on Long Term Debt', text: '$163.4M (5%) went to interest on long-term debt, about $1 in every $21 the TTC spent.' },
      { label: 'External Transfers', text: 'External Transfers come out at −$8.4M, a net credit: more came back in this column than went out.' },
    ],
    source: '2024 actual · FIR Schedule 40, Transit – Conventional',
    reactions: { reasonable: 591, surprised: 257, confused: 154, concerned: 282 },
    commentCount: 38,
    comments: [
      { feeling: 'concerned', who: 'Anonymous', when: '2 hours ago', text: 'Amortization is almost a quarter of the total. How old is the fleet, and when does the next big replacement land?', votes: 41 },
      { feeling: 'confused', who: 'Resident, Ward 13', when: 'yesterday', text: 'What counts as Contracted Services here? Is that maintenance, construction, or something else?', votes: 27 },
      { feeling: 'surprised', who: 'Anonymous', when: '2 days ago', text: 'I expected fuel and parts to be a bigger share. Materials is under 10%.', votes: 19 },
      { feeling: 'reasonable', who: 'Resident, Ward 4', when: '4 days ago', text: 'Half going to staff seems about right for a service that runs 20 hours a day.', votes: 8 },
    ],
  },
};
