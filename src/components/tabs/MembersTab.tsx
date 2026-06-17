const MEMBERS = [
  { initials: 'SC', name: 'Sarah Chen', role: 'Board Chair · Authority up to $50K', since: 'Jan 2023' },
  { initials: 'MW', name: 'Marcus Williams', role: 'Treasurer · Authority up to $10K', since: 'Jan 2023' },
  { initials: 'PN', name: 'Priya Nair', role: 'Parks Director (Staff) · Up to $5K', since: 'Jun 2022' },
  { initials: 'JO', name: 'James Okafor', role: 'Board Member · Voting', since: 'Jan 2023' },
  { initials: 'LM', name: 'Linda Marsh', role: 'Office Manager · Supplies under $1K', since: 'Mar 2021' },
];

export default function MembersTab() {
  return (
    <>
      <div className="sec-lbl">Members &amp; Positions</div>
      <div className="mem-list">
        {MEMBERS.map((m) => (
          <div className="mem-row" key={m.initials}>
            <div className="av">{m.initials}</div>
            <div>
              <div className="m-name">{m.name}</div>
              <div className="m-role">{m.role}</div>
            </div>
            <div className="m-since">{m.since}</div>
          </div>
        ))}
      </div>
    </>
  );
}
