import type { Topic } from '../types';

/**
 * Каталог на уроците. Съдържанието е дефинирано само тук и в src/data/content/.
 * Нови теми се добавят единствено от разработчика (чрез промяна на кода) – приложението няма интерфейс за редакция.
 */
export const topics: Topic[] = [
  {
    id: 'turbidimetriya',
    path: '/metodi/turbidimetriya',
    title: 'Турбидиметрия – определяне на HbA1c',
    shortTitle: 'Турбидиметрия – HbA1c',
    category: 'Имунохимичен метод',
    group: 'metodi',
    icon: 'droplet',
    description:
      'Как образуването на имунни комплекси води до мътност, която се измерва оптично – и как това се използва за гликирания хемоглобин.',
    keywords: ['hba1c', 'гликиран хемоглобин', 'турбидиметрия', 'имунен комплекс', 'антиген', 'антитяло', 'аглутинация', 'мътност', 'latex', 'tinia'],
  },
  {
    id: 'magnezii',
    path: '/metodi/magnezii',
    title: 'Магнезий – колориметричен метод с Xylidyl Blue',
    shortTitle: 'Магнезий – Xylidyl Blue',
    category: 'Колориметричен метод',
    group: 'metodi',
    icon: 'flask',
    description:
      'Оцветен комплекс на Mg²⁺ с багрилото xylidyl blue, закон на Beer-Lambert и определяне на концентрацията чрез абсорбция.',
    keywords: ['магнезий', 'mg', 'xylidyl blue', 'колориметрия', 'абсорбция', 'beer-lambert', 'egta', 'фотометрия', 'калибратор'],
  },
  {
    id: 'fosfor',
    path: '/metodi/fosfor',
    title: 'Фосфор – реакция с молибденова киселина',
    shortTitle: 'Фосфор – молибдатен метод',
    category: 'Спектрофотометричен метод',
    group: 'metodi',
    icon: 'atom',
    description:
      'Неорганичен фосфат, реакция с молибдат в кисела среда, фосфомолибдатен комплекс, директно UV измерване при около 340 nm и молибденово синьо.',
    keywords: ['фосфор', 'фосфат', 'неорганичен фосфат', 'pi', 'молибденова киселина', 'молибдат', 'амониев молибдат', 'фосфомолибдат', 'молибденово синьо', '340 nm', 'fiske', 'subbarow', 'daly', 'хетерополикиселина', 'keggin', 'хиперфосфатемия', 'хипофосфатемия', 'uv метод'],
  },
  {
    id: 'glyukoza',
    path: '/metodi/glyukoza',
    title: 'Глюкоза – метод GOD-POD (глюкозооксидаза – пероксидаза)',
    shortTitle: 'Глюкоза – GOD-POD',
    category: 'Ензимен колориметричен метод',
    group: 'metodi',
    icon: 'flask',
    description:
      'Ензимно определяне на глюкоза: глюкозооксидаза образува водороден пероксид, пероксидазата оцветява хромогена (реакция на Trinder); калибрация, гликолиза и интерференции.',
    keywords: ['глюкоза', 'захар', 'кръвна захар', 'god-pod', 'god pod', 'god-pap', 'глюкозооксидаза', 'пероксидаза', 'trinder', 'триндер', '4-аминоантипирин', 'хромоген', 'хинонеимин', 'гликолиза', 'гладно', 'хексокиназа', 'плазмена глюкоза', 'mmol/l', 'диабет'],
  },
  {
    id: 'kreatinin',
    path: '/metodi/kreatinin',
    title: 'Креатинин – метод на Jaffé (алкален пикрат)',
    shortTitle: 'Креатинин – Jaffé',
    category: 'Колориметричен метод',
    group: 'metodi',
    icon: 'beaker',
    description:
      'Реакция на креатинина с пикрат в алкална среда, образуване на червено-оранжев комплекс, кинетично измерване, псевдохромогени, компенсиран метод и сравнение с ензимния метод.',
    keywords: ['креатинин', 'creatinine', 'jaffe', 'jaffé', 'яфе', 'пикрат', 'пикринова киселина', 'алкален пикрат', 'кинетичен метод', 'псевдохромогени', 'компенсация', 'idms', 'egfr', 'гфр', 'бъбречна функция', 'ckd-epi', 'janovsky', 'µmol/l', 'ензимен метод'],
  },
  {
    id: 'ise',
    path: '/metodi/ise',
    title: 'Калий, натрий и хлорид – йонселективен метод (ISE)',
    shortTitle: 'Електролити – ISE',
    category: 'Потенциометричен метод',
    group: 'metodi',
    icon: 'zap',
    description:
      'Йонселективни мембрани, електричен потенциал, референтен електрод и уравнението на Nernst; директен и индиректен ISE.',
    keywords: ['ise', 'йонселективен електрод', 'натрий', 'калий', 'хлорид', 'na', 'k', 'cl', 'nernst', 'мембрана', 'валиномицин', 'потенциометрия', 'директен', 'индиректен'],
  },
  {
    id: 'kravno-gazov',
    path: '/metodi/kravno-gazov-analiz',
    title: 'Кръвно-газов анализ (ABG)',
    shortTitle: 'Кръвно-газов анализ',
    category: 'Потенциометрия и амперометрия',
    group: 'metodi',
    icon: 'wind',
    description:
      'pH, pCO₂ и pO₂ – електроди на Severinghaus и Clark, изчисляване на HCO₃⁻, BE и sO₂ и киселинно-алкално равновесие.',
    keywords: ['abg', 'кръвни газове', 'ph', 'pco2', 'po2', 'severinghaus', 'clark', 'bicarbonate', 'hco3', 'be', 'so2', 'ацидоза', 'алкалоза', 'henderson-hasselbalch'],
  },
  {
    id: 'hplc',
    path: '/metodi/hplc',
    title: 'HPLC – високоефективна течна хроматография',
    shortTitle: 'HPLC – Течна хроматография',
    category: 'Хроматографски метод',
    group: 'metodi',
    icon: 'layers',
    description:
      'Подвижна и стационарна фаза, помпа, инжектор, колона, детектор, хроматограма, време на задържане и площ на пика.',
    keywords: ['hplc', 'хроматография', 'колона', 'retention time', 'време на задържане', 'площ на пика', 'детектор', 'хроматограма', 'мобилна фаза', 'стационарна фаза'],
  },
  {
    id: 'kalibraciya',
    path: '/kalibraciya',
    title: 'Калибрация с калибратори',
    shortTitle: 'Калибрация',
    category: 'Калибрация',
    group: 'kalibraciya',
    icon: 'ruler',
    description:
      'Ръчна и апаратна калибрация, калибрационна крива, едноточкова и многостепенна калибрация, валидност на калибрацията.',
    keywords: ['калибрация', 'калибратор', 'калибрационна крива', 'едноточкова', 'многостепенна', 'регресия', 'контролен материал', 'стандарт', 'фактор'],
  },
  {
    id: 'kachestven-kontrol',
    path: '/kachestven-kontrol',
    title: 'Вътрешнолабораторен качествен контрол (IQC)',
    shortTitle: 'Качествен контрол (IQC)',
    category: 'Качествен контрол',
    group: 'kontrol',
    icon: 'shieldCheck',
    description:
      'Контролен материал, средна стойност, SD и CV%, графика на Levey-Jennings и правила на Westgard; случайни и систематични грешки.',
    keywords: ['iqc', 'качествен контрол', 'levey-jennings', 'westgard', 'sd', 'cv', 'контролен материал', 'случайна грешка', 'систематична грешка', 'прецизност', 'точност', '1-3s', '2-2s', 'r-4s', '4-1s', '10x'],
  },
];

export const topicById = (id: string): Topic => {
  const t = topics.find((x) => x.id === id);
  if (!t) throw new Error(`Непозната тема: ${id}`);
  return t;
};

export const topicByPath = (path: string): Topic | undefined => topics.find((t) => t.path === path);

export const methodTopics = topics.filter((t) => t.group === 'metodi');

/** Фиксираните десет раздела на всеки урок. */
export const sections = [
  { id: 'vavedenie', title: 'Въведение' },
  { id: 'printsip', title: 'Принцип на метода' },
  { id: 'komponenti', title: 'Необходими компоненти' },
  { id: 'vizualizaciya', title: 'Графична визуализация' },
  { id: 'proces', title: 'Процес на измерване' },
  { id: 'interpretaciya', title: 'Интерпретация на резултатите' },
  { id: 'predimstva', title: 'Предимства и ограничения' },
  { id: 'izpit', title: 'Важно за изпита' },
  { id: 'terminologiya', title: 'Терминология' },
  { id: 'iztochnici', title: 'Източници' },
] as const;

export type SectionId = (typeof sections)[number]['id'];

/** Секция „Какво ще научиш“ на началната страница. */
export const learnPillars = [
  {
    icon: 'atom' as const,
    title: 'Научният принцип',
    text: 'Защо и как работи всеки метод – какво се случва на молекулно и електрохимично ниво, преди апаратът да покаже число.',
  },
  {
    icon: 'activity' as const,
    title: 'Визуализация на процеса',
    text: 'Анимирани диаграми, които можеш да спираш, връщаш и променяш: имунни комплекси, цветна реакция, мембранен потенциал, хроматографско разделяне.',
  },
  {
    icon: 'ruler' as const,
    title: 'От сигнал към резултат',
    text: 'Как оптичният или електричният сигнал се превръща в концентрация – чрез калибрация, закона на Beer-Lambert и уравнението на Nernst.',
  },
  {
    icon: 'shieldCheck' as const,
    title: 'Качество на резултата',
    text: 'Калибрация, контролни материали, графика на Levey-Jennings и правила на Westgard – как лабораторията доказва, че резултатът е надежден.',
  },
];
