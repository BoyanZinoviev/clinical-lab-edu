import { topics, sections } from './topics';
import { contentById } from './content';
import type { Block, ModuleContent } from '../types';

export interface SearchEntry {
  topicId: string;
  topicTitle: string;
  path: string;
  section?: string;
  sectionTitle?: string;
  label: string;
  snippet?: string;
  kind: 'topic' | 'section' | 'term' | 'question';
  haystack: string;
  boost: number;
}

const clean = (s: string): string =>
  s
    .replace(/\{\{([^}|]+)\|[^}]+\}\}/g, '$1')
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();

function blocksText(blocks: Block[]): string {
  return blocks
    .map((b) => {
      switch (b.type) {
        case 'p':
        case 'h3':
          return clean(b.text);
        case 'ul':
        case 'ol':
          return b.items.map(clean).join(' ');
        case 'callout':
          return clean(`${b.title ?? ''} ${b.text}`);
        case 'qa':
          return `${clean(b.q)} ${blocksText(b.a)}`;
        case 'formula':
          return clean(`${b.expr} ${b.caption ?? ''}`);
        case 'table':
          return [...b.headers, ...b.rows.flat()].map(clean).join(' ');
      }
    })
    .join(' ');
}

function collectQuestions(blocks: Block[]): { q: string; text: string }[] {
  const out: { q: string; text: string }[] = [];
  for (const b of blocks) if (b.type === 'qa') out.push({ q: clean(b.q), text: blocksText(b.a) });
  return out;
}

const sectionBlocks = (c: ModuleContent): Record<string, Block[]> => ({
  vavedenie: c.intro,
  printsip: c.principle,
  vizualizaciya: c.vizIntro,
  interpretaciya: c.interpretation,
  predimstva: c.prosConsNotes ?? [],
});

let cache: SearchEntry[] | null = null;

export function getSearchIndex(): SearchEntry[] {
  if (cache) return cache;
  const out: SearchEntry[] = [];
  for (const t of topics) {
    const c = contentById[t.id];
    out.push({
      topicId: t.id,
      topicTitle: t.title,
      path: t.path,
      label: t.title,
      snippet: t.description,
      kind: 'topic',
      haystack: `${t.title} ${t.shortTitle} ${t.category} ${t.description} ${t.keywords.join(' ')}`.toLowerCase(),
      boost: 5,
    });
    if (!c) continue;

    for (const s of sections) {
      const own = sectionBlocks(c)[s.id];
      const text =
        s.id === 'komponenti'
          ? c.components.map((g) => `${g.title} ${g.items.map((i) => `${i.name} ${i.text}`).join(' ')}`).join(' ')
          : s.id === 'proces'
            ? c.process.map((p) => `${p.title} ${p.text}`).join(' ')
            : s.id === 'izpit'
              ? c.exam.map(clean).join(' ')
              : s.id === 'predimstva'
                ? [...c.pros, ...c.cons].map(clean).join(' ') + ' ' + (own ? blocksText(own) : '')
                : own
                  ? blocksText(own)
                  : '';
      out.push({
        topicId: t.id,
        topicTitle: t.shortTitle,
        path: t.path,
        section: s.id,
        sectionTitle: s.title,
        label: `${t.shortTitle} › ${s.title}`,
        snippet: text.slice(0, 140),
        kind: 'section',
        haystack: `${s.title} ${text}`.toLowerCase(),
        boost: 1,
      });
    }

    for (const term of c.terms) {
      out.push({
        topicId: t.id,
        topicTitle: t.shortTitle,
        path: t.path,
        section: 'terminologiya',
        sectionTitle: 'Терминология',
        label: term.latin ? `${term.term} (${term.latin})` : term.term,
        snippet: clean(term.def).slice(0, 140),
        kind: 'term',
        haystack: `${term.term} ${term.latin ?? ''} ${term.def}`.toLowerCase(),
        boost: 3,
      });
    }

    for (const [secId, blocks] of Object.entries(sectionBlocks(c))) {
      const sec = sections.find((x) => x.id === secId);
      for (const qa of collectQuestions(blocks)) {
        out.push({
          topicId: t.id,
          topicTitle: t.shortTitle,
          path: t.path,
          section: secId,
          sectionTitle: sec?.title,
          label: qa.q,
          snippet: qa.text.slice(0, 140),
          kind: 'question',
          haystack: `${qa.q} ${qa.text}`.toLowerCase(),
          boost: 4,
        });
      }
    }
  }
  cache = out;
  return out;
}

export function searchTopics(query: string, limit = 24): SearchEntry[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const tokens = q.split(/\s+/).filter(Boolean);
  const scored: { e: SearchEntry; score: number }[] = [];
  for (const e of getSearchIndex()) {
    if (!tokens.every((tok) => e.haystack.includes(tok))) continue;
    const label = e.label.toLowerCase();
    let score = e.boost;
    for (const tok of tokens) if (label.includes(tok)) score += 6;
    if (label.startsWith(q)) score += 4;
    scored.push({ e, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.e);
}
