import type { ApiHealthRow } from '@/api/types';
import {
  buildHealthSections,
  HEALTH_SECTIONS,
  healthSectionCopy,
  healthShareNote,
  supportsStatus,
  type HealthSection,
} from '@/lib/health';

const row = (section: HealthSection, label: string): ApiHealthRow & { section: HealthSection } => ({
  id: label,
  section,
  label,
  value: '',
});

describe('health sections', () => {
  it('always renders all three, empty ones included', () => {
    const sections = buildHealthSections([row('injuries', 'Left shoulder')]);

    expect(sections.map((section) => section.id)).toEqual([...HEALTH_SECTIONS]);
    // "Nothing recorded" is information a coach reading this needs. A section
    // that disappears when empty says nothing at all.
    expect(sections.find((section) => section.id === 'conditions')?.rows).toEqual([]);
  });

  it('files each entry under its own heading', () => {
    const sections = buildHealthSections([
      row('injuries', 'Left shoulder'),
      row('medication', 'Salbutamol'),
      row('injuries', 'Lower back'),
    ]);

    expect(sections[0].rows.map((entry) => entry.label)).toEqual([
      'Left shoulder',
      'Lower back',
    ]);
    expect(sections[2].rows.map((entry) => entry.label)).toEqual(['Salbutamol']);
  });

  it('gives every section a heading and a note', () => {
    for (const section of HEALTH_SECTIONS) {
      expect(healthSectionCopy(section).title.length).toBeGreaterThan(0);
      expect(healthSectionCopy(section).note.length).toBeGreaterThan(0);
    }
  });

  it('offers a status on injuries and nowhere else', () => {
    expect(supportsStatus('injuries')).toBe(true);
    expect(supportsStatus('conditions')).toBe(false);
    expect(supportsStatus('medication')).toBe(false);
  });
});

describe('healthShareNote', () => {
  it('promises exactly what the database does — hidden, not deleted', () => {
    expect(healthShareNote('Sam Okafor', true)).toContain('nothing is deleted');
    expect(healthShareNote('Sam Okafor', true)).toContain('Sam');
  });

  it('says what turning it on would mean, and that it is reversible', () => {
    const note = healthShareNote('Sam Okafor', false);
    expect(note).toContain('cannot see');
    expect(note).toContain('until you turn it off again');
  });

  it('does not name a coach who is not there', () => {
    expect(healthShareNote(null, false)).toBe(
      'No coach attached. Nothing here is shared with anyone.',
    );
  });
});
