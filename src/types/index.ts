/**
 * Типове за образователното съдържание.
 * Съдържанието е изцяло статично и се дефинира в src/data/ – няма интерфейс за добавяне или редакция.
 */

export type IconName =
  | 'home' | 'search' | 'menu' | 'x' | 'sun' | 'moon'
  | 'chevronRight' | 'chevronDown' | 'chevronLeft' | 'chevronUp'
  | 'play' | 'pause' | 'restart' | 'skipBack' | 'skipForward'
  | 'droplet' | 'flask' | 'testTube' | 'activity' | 'zap' | 'wind'
  | 'layers' | 'sliders' | 'lineChart' | 'shieldCheck' | 'info' | 'book'
  | 'check' | 'alert' | 'target' | 'atom' | 'gauge' | 'compare' | 'clock'
  | 'graduation' | 'lock' | 'cpu' | 'beaker' | 'ruler' | 'arrowRight'
  | 'eye' | 'link' | 'list';

export type CalloutTone = 'info' | 'warning' | 'verify' | 'exam' | 'illustrative';

/** Блокове, от които се изгражда текстът на урока. */
export type Block =
  | { type: 'p'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'callout'; tone: CalloutTone; title?: string; text: string }
  | { type: 'qa'; n?: number; q: string; a: Block[] }
  | { type: 'formula'; expr: string; caption?: string }
  | { type: 'table'; headers: string[]; rows: string[][]; caption?: string };

export interface ComponentGroup {
  title: string;
  icon: IconName;
  items: { name: string; text: string }[];
}

export interface ProcessStep {
  title: string;
  text: string;
}

export interface Term {
  /** Терминът (на български или международен). */
  term: string;
  /** Международно наименование / съкращение, ако се различава. */
  latin?: string;
  def: string;
}

export interface ModuleContent {
  intro: Block[];
  principle: Block[];
  components: ComponentGroup[];
  vizIntro: Block[];
  process: ProcessStep[];
  processNotes?: Block[];
  interpretation: Block[];
  pros: string[];
  cons: string[];
  prosConsNotes?: Block[];
  exam: string[];
  terms: Term[];
  /** Идентификатори от src/data/references.ts */
  references: string[];
}

export type TopicGroup = 'metodi' | 'kalibraciya' | 'kontrol';

export interface Topic {
  id: string;
  path: string;
  title: string;
  shortTitle: string;
  category: string;
  group: TopicGroup;
  icon: IconName;
  description: string;
  keywords: string[];
}

export interface Reference {
  id: string;
  kind: 'textbook' | 'article' | 'standard' | 'guideline' | 'manufacturer' | 'laboratory';
  citation: string;
  note?: string;
}
