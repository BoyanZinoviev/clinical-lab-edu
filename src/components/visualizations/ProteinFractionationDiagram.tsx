import { useId, useState } from 'react';
import { VizFrame, ExplainPanel, ValuePill } from '../ui/VizFrame';
import { StepControls, Slider, Segmented, Toggle } from '../ui/Controls';
import { RichText } from '../ui/RichText';
import { useStepper } from '../../hooks/useStepper';
import { useTween } from '../../hooks/useTween';
import { Jig, Txt } from './shared';
import { clamp, fmt, mulberry32 } from '../../lib/stats';

type Mode = 'ep' | 'ch';
type Support = 'paper' | 'agar' | 'agarose';
type Tech = 'iex' | 'aff';
type Exch = 'an' | 'cat';
type Ligand = 'blue' | 'prota';

/* ═════════════════════════ Електрофореза – модел ═════════════════════════ */

interface Frac {
  short: string;
  name: string;
  pI: number;
  /** относителна вътрешна подвижност (размер/заряд на единица маса) – илюстративно */
  m: number;
  color: string;
  amt: number;
  amtM: number;
}

/** Фракции на серумните белтъци (условни параметри). Последната е условен моноклонален белтък. */
const FR: Frac[] = [
  { short: 'Alb', name: 'Албумин', pI: 4.7, m: 1.0, color: 'var(--v-moblue)', amt: 58, amtM: 52 },
  { short: 'α₁', name: 'α₁-глобулини', pI: 4.2, m: 0.8, color: 'var(--v-cl)', amt: 4, amtM: 4 },
  { short: 'α₂', name: 'α₂-глобулини', pI: 5.0, m: 0.64, color: 'var(--v-na)', amt: 9, amtM: 8 },
  { short: 'β', name: 'β-глобулини', pI: 5.8, m: 0.46, color: 'var(--v-k)', amt: 13, amtM: 12 },
  { short: 'γ', name: 'γ-глобулини', pI: 7.6, m: 0.12, color: 'var(--v-quino)', amt: 16, amtM: 12 },
  { short: 'M', name: 'Моноклонален белтък', pI: 7.0, m: 0.2, color: 'var(--v-ink)', amt: 0, amtM: 12 },
];
const NF = FR.length;
const amountsOf = (mono: boolean) => FR.map((f) => (mono ? f.amtM : f.amt));

const EEO: Record<Support, number> = { paper: 0.02, agar: 0.2, agarose: 0.07 };
const SIG: Record<Support, number> = { paper: 15, agar: 10, agarose: 6.5 };
const TAIL = 20;
const SUP_NAME: Record<Support, string> = { paper: 'филтърна хартия', agar: 'агарен гел', agarose: 'агарозен гел' };

const X0 = 468; // старт (px)
const LSC = 300; // px на единица подвижност
const GX0 = 150;
const GX1 = 640;

/** Качествен нетен заряд (−1…+1): положителен при pH < pI. */
const charge = (pI: number, pH: number, w: number) => clamp((pI - pH) / w, -1, 1);
/** Подвижност към анода (+) минус електроендосмоза. */
const mu = (f: Frac, pH: number, s: Support) => -f.m * charge(f.pI, pH, 2) - EEO[s];
const centerOf = (f: Frac, pH: number, s: Support) => X0 - mu(f, pH, s) * LSC;
const sigmaOf = (i: number, s: Support) => SIG[s] * (i === NF - 1 ? 0.7 : 1);

const SQ2PI = Math.sqrt(2 * Math.PI);
const pdf = (x: number, c: number, s: number) => Math.exp(-0.5 * ((x - c) / s) ** 2) / (s * SQ2PI);

/** Профил на денситограмата – илюстративен модел на зоните. */
function dens(x: number, cents: number[], amts: number[], s: Support) {
  let v = 0;
  for (let i = 0; i < NF; i++) {
    const a = amts[i];
    if (a <= 0) continue;
    const sg = sigmaOf(i, s);
    if (s === 'paper') {
      const dir = Math.sign(X0 - cents[i]) || 1;
      v += 0.7 * a * pdf(x, cents[i], sg) + 0.3 * a * pdf(x, cents[i] + dir * 18, sg * 1.4);
    } else v += a * pdf(x, cents[i], sg);
  }
  return v;
}

function densCurve(cents: number[], amts: number[], s: Support) {
  const xs: number[] = [];
  const vs: number[] = [];
  for (let x = GX0; x <= GX1; x += 2) {
    xs.push(x);
    vs.push(dens(x, cents, amts, s));
  }
  return { xs, vs, mx: Math.max(...vs, 1e-6) };
}

/* Точки (белтъци) в гела */
const ND = [7, 7, 7, 7, 7, 5];
const D_OFF: number[] = [];
let nDots = 0;
ND.forEach((n) => {
  D_OFF.push(nDots);
  nDots += n;
});
const rEp = mulberry32(77);
const DZ = Array.from({ length: nDots }, () => rEp() * 2 - 1);
const DY = Array.from({ length: nDots }, () => 150 + rEp() * 34);
const DR = Array.from({ length: nDots }, () => rEp());
const DS = Array.from({ length: nDots }, () => (rEp() * 2 - 1) * 3);

/** Индекси в масива на анимираните стойности (електрофореза). */
const I = { x: 0, fo: nDots, dot: nDots + NF, band: nDots + NF + 1, cent: nDots + 2 * NF + 1, scan: nDots + 3 * NF + 1, fix: nDots + 3 * NF + 2, len: nDots + 3 * NF + 3 };

function epTargets(stage: number, pH: number, sup: Support, mono: boolean): number[] {
  const t = new Array<number>(I.len).fill(0);
  const amts = amountsOf(mono);
  FR.forEach((f, i) => {
    const c = centerOf(f, pH, sup);
    const sg = sigmaOf(i, sup);
    const dir = Math.sign(X0 - c) || 1;
    for (let j = 0; j < ND[i]; j++) {
      const k = D_OFF[i] + j;
      const fin = c + DZ[k] * sg * 1.3 + (sup === 'paper' ? dir * DR[k] * DR[k] * TAIL : 0);
      t[I.x + k] = stage <= 1 ? X0 + DS[k] : stage === 2 ? X0 + 0.32 * (c - X0) + DS[k] * 2 : fin;
    }
    t[I.fo + i] = amts[i] > 0 ? 1 : 0;
    t[I.band + i] = stage >= 5 && amts[i] > 0 ? clamp(0.25 + Math.sqrt(amts[i] / 60) * 0.7, 0, 0.95) : 0;
    t[I.cent + i] = c;
  });
  t[I.dot] = stage === 0 ? 0 : stage <= 4 ? 1 : stage === 5 ? 0.18 : 0.1;
  t[I.scan] = stage >= 6 ? GX1 - GX0 : 0;
  t[I.fix] = stage === 4 ? 0.2 : 0;
  return t;
}

/* ═════════════════════════ Хроматография – модел ═════════════════════════ */

interface Prot {
  short: string;
  label: string;
  pI: number;
  color: string;
  amt: number;
  n: number;
}

const IEX_PROTS: Prot[] = [
  { short: 'албумин', label: 'Албумин (pI ≈ 4,7)', pI: 4.7, color: 'var(--v-moblue)', amt: 55, n: 7 },
  { short: 'трансферин', label: 'Трансферин (pI ≈ 5,9)', pI: 5.9, color: 'var(--v-k)', amt: 15, n: 4 },
  { short: 'белтък С', label: 'Белтък С (условно pI ≈ 8)', pI: 8.0, color: 'var(--v-cl)', amt: 30, n: 6 },
];
const AFF_PROTS: Prot[] = [
  { short: 'албумин', label: 'Албумин', pI: 4.7, color: 'var(--v-moblue)', amt: 55, n: 7 },
  { short: 'IgG', label: 'IgG', pI: 8.0, color: 'var(--v-quino)', amt: 15, n: 4 },
  { short: 'други белтъци', label: 'Други белтъци', pI: 6.0, color: 'var(--v-cl)', amt: 30, n: 6 },
];

interface PState {
  bound: boolean;
  /** положение на елуирането в градиента (0…1) */
  g: number;
  /** център на пика (усл. обем) */
  tp: number;
  sg: number;
  area: number;
  flow: number;
}
interface ChState {
  prots: Prot[];
  st: PState[];
  ov: number;
  step: boolean;
  wash: number;
}

function chState(tech: Tech, exch: Exch, ligand: Ligand, pH: number, load: number): ChState {
  const prots = tech === 'iex' ? IEX_PROTS : AFF_PROTS;
  const scale = load / 60;
  const ov = Math.max(0, (load - 100) / load);
  const st: PState[] = prots.map((p, i) => {
    let bound: boolean;
    let g: number;
    let tp: number;
    let sg: number;
    if (tech === 'iex') {
      const q = charge(p.pI, pH, 3.5);
      const b = exch === 'an' ? Math.max(0, -q) : Math.max(0, q);
      bound = b >= 0.12;
      g = clamp(0.15 + 0.75 * b, 0, 1);
      tp = 35 + 55 * g;
      sg = 3.0;
    } else {
      bound = (ligand === 'blue' && i === 0) || (ligand === 'prota' && i === 1);
      g = 0.3;
      tp = ligand === 'blue' ? 44 : 46;
      sg = 2.4;
    }
    return {
      bound,
      g,
      tp,
      sg,
      area: bound ? p.amt * scale * (1 - ov) : 0,
      flow: bound ? p.amt * scale * ov : p.amt * scale,
    };
  });
  return { prots, st, ov, step: tech === 'aff', wash: tech === 'iex' ? 35 : 40 };
}

interface Peak {
  t: number;
  sg: number;
  area: number;
  color: string;
  label: string;
}
function peaksOf(c: ChState): Peak[] {
  const ft = c.st.reduce((s, p) => s + p.flow, 0);
  let dom = -1;
  let best = 0;
  c.st.forEach((p, i) => {
    if (p.flow > best) {
      best = p.flow;
      dom = i;
    }
  });
  const list: Peak[] = [{ t: 18, sg: 3.4, area: ft, color: dom >= 0 ? c.prots[dom].color : 'var(--v-soft)', label: 'непосвързани' }];
  c.st.forEach((p, i) => {
    if (p.bound && p.area > 0) list.push({ t: p.tp, sg: p.sg, area: p.area, color: c.prots[i].color, label: c.prots[i].short });
  });
  return list;
}
const signalAt = (t: number, peaks: Peak[]) => peaks.reduce((s, p) => s + 6 * p.area * pdf(t, p.t, p.sg), 0);

const T_STAGE = [0, 0, 6, 20, 38, 72, 100, 100];
const F_ELU = (stage: number) => (stage === 5 ? 0.67 : 1.25);

const NCH = IEX_PROTS.reduce((s, p) => s + p.n, 0);
const rCh = mulberry32(53);
const CDX = Array.from({ length: NCH }, () => 200 + rCh() * 40);
const CDY = Array.from({ length: NCH }, () => rCh() * 26);
const CH_OP = NCH;
const CH_T = 2 * NCH;
const CH_LEN = 2 * NCH + 1;

function chTargets(stage: number, c: ChState): number[] {
  const t = new Array<number>(CH_LEN).fill(0);
  let k = 0;
  c.prots.forEach((p, pi) => {
    const s = c.st[pi];
    for (let j = 0; j < p.n; j++, k++) {
      const dy = CDY[k];
      const yb = 102 + dy * 0.5 + pi * 8;
      let y = 66;
      let op = 0;
      if (stage === 2) {
        y = 100 + dy;
        op = 1;
      } else if (stage === 3) {
        y = s.bound ? yb : 176 + dy;
        op = 1;
      } else if (stage === 4) {
        y = s.bound ? yb : 268;
        op = s.bound ? 1 : 0;
      } else if (stage >= 5) {
        if (s.bound) {
          const prog = clamp((F_ELU(stage) - s.g) / 0.3, 0, 1);
          y = yb + 150 * prog;
          op = prog < 0.97 ? 1 : 0;
        } else {
          y = 268;
          op = 0;
        }
      }
      t[k] = y;
      t[CH_OP + k] = op;
    }
  });
  t[CH_T] = T_STAGE[stage];
  return t;
}

/* ═════════════════════════ Етапи – текстове ═════════════════════════ */

const EP_LABELS = ['Гел', 'Проба', 'Ток', 'Разделяне', 'Фиксиране', 'Оцветяване', 'Денситометрия', 'Резултат'];
const CH_LABELS = ['Колона', 'Уравновесяване', 'Нанасяне', 'Свързване', 'Промиване', 'Елуиране', 'Детекция', 'Резултат'];

function epStage(i: number, o: { pH: number; sup: Support; mono: boolean }): { title: string; body: string[] } {
  const qAlb = charge(4.7, o.pH, 2);
  const dir =
    Math.abs(qAlb) < 0.08
      ? 'При това pH албуминът е близо до изоелектричната си точка – нетният му заряд е почти нула и той почти не се движи.'
      : qAlb < 0
        ? `При pH ${fmt(o.pH, 1)} албуминът е **отрицателно** зареден (pH > pI) и се движи към **анода (+)**.`
        : `При pH ${fmt(o.pH, 1)} албуминът е **положително** зареден (pH < pI) и се движи към **катода (−)**.`;
  const supTxt =
    o.sup === 'paper'
      ? 'Върху **филтърна хартия** белтъците се адсорбират към влакната: зоните са **широки**, с „опашки“, а α₁ и α₂ се застъпват – разделителната способност е ниска.'
      : o.sup === 'agar'
        ? 'В **агарен гел** сулфатните групи предизвикват **електроендосмоза**: всички зони се изместват към катода, а слабо заредените γ-глобулини могат да бъдат изтеглени отвъд старта.'
        : 'В **агарозен гел** електроендосмозата е слаба, а зоните са **остри** – разделят се около пет фракции (при високорезолюционен гел – шест и повече).';
  const monoTxt = o.mono ? 'Тъмната зона е условен **моноклонален белтък** – остър, ограничен пик (в γ областта).' : '';
  const list: { title: string; body: string[] }[] = [
    {
      title: `Гел и буфер (${SUP_NAME[o.sup]})`,
      body: [
        'Носителят е пропит с буфер; електродните съдове – **анод (+)** отляво и **катод (−)** отдясно – са пълни със същия буфер. Белтъците още не са нанесени.',
        'Избраният носител определя остротата на зоните и електроендосмозата. Сравни хартия, агар и агароза в панела под диаграмата.',
      ],
    },
    {
      title: 'Нанасяне на серума',
      body: [
        'Малък обем серум се нанася като **тясна лента** на старта. Цветните точки са групите белтъци: албумин, α₁, α₂, β и γ (преди оцветяването белтъците не се виждат).',
        ['Албуминът съставлява около две трети от серумните белтъци.', monoTxt].filter(Boolean).join(' '),
      ],
    },
    {
      title: 'Включване на постоянния ток',
      body: [
        'Между анода и катода се създава електрично поле. Белтъците започват да се движат – посоката зависи от **нетния им заряд**, а той – от pH на буфера спрямо изоелектричната точка на белтъка.',
        dir,
      ],
    },
    {
      title: 'Разделяне на зони по подвижност',
      body: [
        `Белтъците с различна подвижност образуват зони. Реда от анода е: **албумин → α₁ → α₂ → β → γ**. ${supTxt}`,
        o.mono ? monoTxt : 'Промени pH на буфера: при pH, равно на pI на албумина (≈ 4,7), албуминът почти не се движи; при по-ниско pH някои белтъци сменят посоката си.',
      ],
    },
    {
      title: 'Фиксиране',
      body: [
        'Смес от **метанол и оцетна киселина** денатурира белтъците и **предотвратява дифузията** им – зоните остават на мястото си.',
        'Гелът се изсушава и се подготвя за оцветяване.',
      ],
    },
    {
      title: 'Оцветяване',
      body: [
        'Багрило за белтъци (напр. Amido Black или Coomassie Brilliant Blue) свързва белтъците; излишъкът се измива. Всяка зона става **синя лента**.',
        'Интензитетът на оцветяването е мярка за **количеството белтък** в зоната.',
      ],
    },
    {
      title: 'Денситометрия – сканиране',
      body: [
        'Денситометърът сканира гела по дължина и записва интензитета на оцветяването във всяка точка – получава се **денситограма**, в която всяка фракция е пик.',
        'Площта на пика е пропорционална на количеството белтък във фракцията.',
      ],
    },
    {
      title: 'Резултат – фракции',
      body: [
        '**Фракция (%) = площ на фракцията / сума на площите × 100.** Умножена по общия белтък (измерван отделно), дава концентрация в g/L (вж. панела).',
        'Условните стойности са илюстративни. Моноклоналният белтък се потвърждава и типизира с **имунофиксация**; платформата не тълкува резултати на пациенти.',
      ],
    },
  ];
  return list[i];
}

function chStage(i: number, tech: Tech, o: { exch: Exch; ligand: Ligand; c: ChState; pH: number }): { title: string; body: string[] } {
  const { c } = o;
  const boundNames = c.prots.filter((_, pi) => c.st[pi].bound).map((p) => p.short);
  const freeNames = c.prots.filter((_, pi) => !c.st[pi].bound).map((p) => p.short);
  const exName = o.exch === 'an' ? '**анионообменник** (положително заредени групи, свързва отрицателни белтъци)' : '**катионообменник** (отрицателно заредени групи, свързва положителни белтъци)';
  const ligName = o.ligand === 'blue' ? '**Cibacron Blue** (свързва албумин)' : '**протеин A** (свързва IgG)';
  const bTxt = boundNames.length ? `Свързват се: **${boundNames.join(', ')}**.` : 'При това pH **нито един** белтък не се свързва – всичко преминава.';
  const fTxt = freeNames.length ? `Преминават: ${freeNames.join(', ')}.` : '';
  if (tech === 'iex') {
    return [
      {
        title: 'Колона със смола',
        body: [`Колоната е пълнена със **смола** с фиксирани заредени групи – ${exName}. Белтъците още не са нанесени.`, 'В центъра на колоната са смолните зърна; в горната част е резервоарът с буфер/проба.'],
      },
      {
        title: 'Уравновесяване с буфер А',
        body: [`Колоната се промива с **начален буфер (А)** при избраното pH (${fmt(o.pH, 1)}), докато pH и сигналът на детектора станат стабилни. Така белтъците ще имат определен заряд при нанасянето.`],
      },
      {
        title: 'Нанасяне на пробата',
        body: ['Пробата навлиза в колоната. Белтъците се движат с подвижната фаза и започват да взаимодействат със смолата.', 'Важно е **натоварването** да не надвишава капацитета на смолата (вж. панела).'],
      },
      {
        title: 'Свързване по заряд',
        body: [`Белтък, чийто заряд е **противоположен** на заряда на смолата, се свързва с нея; **незаредените** и с еднакъв знак преминават. ${bTxt} ${fTxt}`, 'Колкото по-голям е нетният заряд, толкова по-здраво е свързването.'],
      },
      {
        title: 'Промиване',
        body: ['С буфер А се измиват **непосвързаните** белтъци – те излизат първи и образуват **непосвързан пик** на хроматограмата.', 'Свързаните белтъци остават в горната част на колоната.'],
      },
      {
        title: 'Елуиране с градиент на сол',
        body: ['Концентрацията на сол (буфер Б) се повишава постепенно. Солевите йони **изместват** белтъците от смолата – първо тези със **слабо** свързване, после с по-силно.', 'Затова белтъците излизат в **различно време** – всеки образува свой пик.'],
      },
      {
        title: 'Детекция и хроматограма',
        body: ['Детекторът измерва поглъщането при **около 280 nm** (ароматните аминокиселини) – сигналът във времето е **хроматограмата**.', 'Пикът на всеки белтък е с площ, пропорционална на количеството му.'],
      },
      {
        title: 'Фракции и регенериране',
        body: ['Колекторът събира **непосвързаната** фракция и всеки **елуат** в отделни епруветки за последващо изследване.', 'Колоната се регенерира със силна сол и се уравновесява отново за следващ цикъл.'],
      },
    ][i];
  }
  return [
    {
      title: 'Колона с афинитетен лиганд',
      body: [`Върху смолата е закрепен **лиганд** – ${ligName}. Само белтъкът, който го разпознава специфично, ще се свърже.`, 'Малките триъгълници върху зърната са лигандите.'],
    },
    {
      title: 'Уравновесяване със свързващ буфер',
      body: ['Колоната се промива със **свързващия буфер** – pH и йонна сила, при които лигандът свързва най-силно.'],
    },
    {
      title: 'Нанасяне на пробата',
      body: ['Пробата (напр. серум или плазма) се нанася в свързващия буфер.', 'Натоварването не бива да надвишава капацитета на смолата – вж. панела.'],
    },
    {
      title: 'Специфично свързване',
      body: [`${bTxt} ${fTxt}`, 'Свързването е **специфично и обратимо** – белтъкът се свързва с лиганда като „ключ с ключалка“, без да се променя.'],
    },
    {
      title: 'Промиване',
      body: ['Излишният буфер измива **непосвързаните** белтъци – те излизат в непосвързан пик. Свързаният белтък остава на лиганда.'],
    },
    {
      title: 'Елуиране (стъпкално)',
      body: ['Прилага се **елуиращ буфер (Б)** – друго pH или йонна сила, или конкурентна молекула. Свързаният белтък се освобождава и излиза като **остър пик**.', 'Това е **стъпково** елуиране – за разлика от градиента при йонообмена.'],
    },
    {
      title: 'Детекция',
      body: ['Сигналът при около 280 nm се записва като хроматограма: първо непосвързаният пик, после елуатът.'],
    },
    {
      title: 'Фракции и регенериране',
      body: ['Непосвързаната фракция и елуатът се събират отделно – получава се **обеднена** (напр. от албумин) и **обогатена** фракция.', 'Колоната се регенерира и се уравновесява за следващ цикъл. Cibacron Blue свързва и някои други белтъци, затова специфичността се проверява.'],
    },
  ][i];
}

/* ═════════════════════════ Главен компонент ═════════════════════════ */

export function ProteinFractionationDiagram() {
  const uid = useId().replace(/:/g, '');
  const stepper = useStepper(8);
  const [mode, setMode] = useState<Mode>('ep');
  const [pH, setPH] = useState(8.6);
  const [sup, setSup] = useState<Support>('agarose');
  const [mono, setMono] = useState(false);
  const [tech, setTech] = useState<Tech>('iex');
  const [exch, setExch] = useState<Exch>('an');
  const [ligand, setLigand] = useState<Ligand>('blue');
  const [pHc, setPHc] = useState(8.0);
  const [load, setLoad] = useState(60);
  const [total, setTotal] = useState(70);
  const stage = stepper.step;

  const ch = chState(tech, exch, ligand, pHc, load);
  const tg = mode === 'ep' ? epTargets(stage, pH, sup, mono) : chTargets(stage, ch);
  const tw = useTween(tg, 2.6);
  // при превключване на метода масивът за миг има старата дължина – тогава се ползват директно целите стойности
  const cur = tw.length === tg.length ? tw : tg;

  const s = mode === 'ep' ? epStage(stage, { pH, sup, mono }) : chStage(stage, tech, { exch, ligand, c: ch, pH: pHc });
  const labels = mode === 'ep' ? EP_LABELS : CH_LABELS;
  const amts = amountsOf(mono);
  const cents = mode === 'ep' ? cur.slice(I.cent, I.cent + NF) : FR.map((f) => centerOf(f, pH, sup));

  const qAlb = charge(4.7, pH, 2);
  const qG = charge(7.6, pH, 2);
  const sign = (q: number) => (Math.abs(q) < 0.08 ? '≈ 0' : q < 0 ? 'отрицателен' : 'положителен');
  const flowPct = (ch.st.reduce((a, p) => a + p.flow, 0) / (ch.prots.reduce((a, p) => a + p.amt, 0) * (load / 60))) * 100;

  return (
    <VizFrame
      title="Фракциониране на белтъци"
      subtitle="Електрофореза (гел и денситограма) и хроматография (колона и хроматограма) – стъпка по стъпка."
      icon="activity"
      note="Схематична образователна илюстрация. Зарядите, положенията на зоните, пиковете, площите, процентите и концентрациите са илюстративни и не представляват реални данни. Буфери, напрежения, времена, колони и дължини на вълната се определят от производителя на системата."
    >
      <div className="space-y-4">
        <div className="overflow-hidden rounded-xl border border-line" style={{ background: 'var(--v-panel)' }}>
          {mode === 'ep' ? (
            <EpScene uid={uid} stage={stage} pH={pH} sup={sup} mono={mono} cur={cur} title={s.title} label={labels[stage]} />
          ) : (
            <ChScene stage={stage} tech={tech} exch={exch} ligand={ligand} c={ch} cur={cur} title={s.title} label={labels[stage]} />
          )}
        </div>

        <StepControls stepper={stepper} labels={labels} />

        <ExplainPanel eyebrow={`Етап ${stage + 1} от 8`} title={s.title}>
          {s.body.map((p, i) => (
            <p key={i} className="!m-0">
              <RichText text={p} />
            </p>
          ))}
        </ExplainPanel>

        <div className="space-y-4 rounded-xl border border-line bg-surface p-4">
          <Segmented<Mode>
            label="Метод"
            value={mode}
            onChange={(v) => {
              setMode(v);
              stepper.restart();
            }}
            options={[
              { value: 'ep', label: 'Електрофореза', sub: 'гел и денситограма' },
              { value: 'ch', label: 'Хроматография', sub: 'колона и хроматограма' },
            ]}
          />
          {mode === 'ep' ? (
            <>
              <Segmented<Support>
                label="Носител"
                value={sup}
                onChange={setSup}
                options={[
                  { value: 'paper', label: 'Хартия', sub: 'адсорбция, широки зони' },
                  { value: 'agar', label: 'Агар', sub: 'електроендосмоза' },
                  { value: 'agarose', label: 'Агароза', sub: 'остри зони' },
                ]}
              />
              <Slider
                id={`${uid}-ph`}
                label="pH на буфера"
                value={pH}
                min={4.5}
                max={10}
                step={0.1}
                display={`pH ${fmt(pH, 1)}`}
                hint="Серумната електрофореза е при около pH 8,5–8,6. Промени pH и виж как белтъците сменят посоката си (pH < pI → към катода)."
                onChange={setPH}
              />
              <Toggle id={`${uid}-mono`} label="Добави условен моноклонален белтък" checked={mono} onChange={setMono} />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <ValuePill label="pH на буфера" value={fmt(pH, 1)} kind="neutral" />
                <ValuePill label="Заряд на албумина" value={sign(qAlb)} kind="calculated" />
                <ValuePill label="Заряд на γ-глобулините" value={sign(qG)} kind="calculated" />
                <ValuePill label="Носител" value={SUP_NAME[sup]} kind="neutral" />
              </div>
            </>
          ) : (
            <>
              <Segmented<Tech>
                label="Хроматографски метод"
                value={tech}
                onChange={(v) => {
                  setTech(v);
                  stepper.restart();
                }}
                options={[
                  { value: 'iex', label: 'Йонообменна', sub: 'по заряд, градиент на сол' },
                  { value: 'aff', label: 'Афинитетна', sub: 'специфичен лиганд' },
                ]}
              />
              {tech === 'iex' ? (
                <>
                  <Segmented<Exch>
                    label="Смола"
                    value={exch}
                    onChange={setExch}
                    options={[
                      { value: 'an', label: 'Анионообменник', sub: 'DEAE / Q (положителна смола)' },
                      { value: 'cat', label: 'Катионообменник', sub: 'CM / S (отрицателна смола)' },
                    ]}
                  />
                  <Slider
                    id={`${uid}-phc`}
                    label="pH на буфера"
                    value={pHc}
                    min={4.5}
                    max={9.5}
                    step={0.1}
                    display={`pH ${fmt(pHc, 1)}`}
                    hint="Свързват се белтъците със заряд, противоположен на смолата. Белтък при pH ≈ pI няма заряд и преминава."
                    onChange={setPHc}
                  />
                </>
              ) : (
                <Segmented<Ligand>
                  label="Лиганд"
                  value={ligand}
                  onChange={setLigand}
                  options={[
                    { value: 'blue', label: 'Cibacron Blue', sub: 'свързва албумин' },
                    { value: 'prota', label: 'Протеин A', sub: 'свързва IgG' },
                  ]}
                />
              )}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {tech === 'iex' && <ValuePill label="pH на буфера" value={fmt(pHc, 1)} kind="neutral" />}
                <ValuePill label="Свързани белтъци" value={String(ch.st.filter((p) => p.bound).length)} unit={`от ${ch.prots.length}`} kind="calculated" />
                <ValuePill label="Непосвързано" value={fmt(flowPct, 0)} unit="%" kind="calculated" />
                <ValuePill label="Натоварване" value={fmt(load, 0)} unit="% от капацитета" kind="neutral" />
              </div>
            </>
          )}
        </div>

        <div className="grid gap-4 2xl:grid-cols-2">
          {mode === 'ep' ? (
            <>
              <ChargePanel
                items={FR.filter((_, i) => i < NF - 1 || mono).map((f) => ({ short: f.short, pI: f.pI, color: f.color }))}
                w={2}
                pH={pH}
                shade={null}
                title="Нетен заряд и pH – изоелектрична точка"
                note="Всяка линия пресича нулата при pI на белтъка. Над pI белтъкът е отрицателен и се движи към анода; под pI – положителен. Кривите са качествени."
              />
              <DensPanel uid={uid} cents={cents} amts={amts} sup={sup} total={total} onTotal={setTotal} mono={mono} />
            </>
          ) : (
            <>
              {tech === 'iex' ? (
                <ChargePanel
                  items={IEX_PROTS.map((p) => ({ short: p.short, pI: p.pI, color: p.color }))}
                  w={3.5}
                  pH={pHc}
                  shade={exch === 'an' ? 'neg' : 'pos'}
                  title="Заряд на белтъците и зона на свързване"
                  note={`Оцветената зона показва кои белтъци ${exch === 'an' ? 'с отрицателен заряд се свързват с анионообменника' : 'с положителен заряд се свързват с катионообменника'}. Кривите са качествени.`}
                />
              ) : (
                <LigandPanel ligand={ligand} />
              )}
              <BindingPanel c={ch} tech={tech} load={load} onLoad={setLoad} uid={uid} />
            </>
          )}
        </div>
      </div>
    </VizFrame>
  );
}

/* ═════════════════════════ Сцена: електрофореза ═════════════════════════ */

function EpScene({ uid, stage, pH, sup, mono, cur, title, label }: { uid: string; stage: number; pH: number; sup: Support; mono: boolean; cur: number[]; title: string; label: string }) {
  const cents = cur.slice(I.cent, I.cent + NF);
  const amts = amountsOf(mono);
  const curve = densCurve(cents, amts, sup);
  const base = 326;
  const hMax = 64;
  const pts = curve.xs.map((x, k) => `${x.toFixed(1)} ${(base - (curve.vs[k] / curve.mx) * hMax).toFixed(1)}`);
  const trace = `M${pts.join(' L')}`;
  const area = `M${GX0} ${base} L${pts.join(' L')} L${GX1} ${base} Z`;
  const scanW = cur[I.scan];
  const scanX = GX0 + scanW;
  const qAlb = charge(4.7, pH, 2);
  const direction =
    Math.abs(qAlb) < 0.08 ? 'албуминът е при pH ≈ pI – почти не се движи' : qAlb < 0 ? '← белтъците (pH > pI) се движат към анода (+)' : '→ белтъците (pH < pI) се движат към катода (−)';

  return (
    <svg viewBox="0 0 780 350" className="viz-svg block h-auto w-full" role="img" aria-label={`Схема на зонална електрофореза на серумни белтъци, носител: ${SUP_NAME[sup]}, етап ${stage + 1}: ${title}`}>
      <defs>
        <pattern id={`${uid}-fib`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(20)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--v-grid)" strokeWidth="1.4" />
        </pattern>
        <clipPath id={`${uid}-scan`}>
          <rect x={GX0} y={236} width={Math.max(0, scanW)} height={110} />
        </clipPath>
      </defs>
      <Txt x={20} y={34} size={15} weight={800}>
        {stage + 1} · {label}
      </Txt>
      <Txt x={20} y={54} size={12} color="var(--v-soft)">
        {title}
      </Txt>

      {/* Захранване и жици */}
      <rect x={330} y={66} width={120} height={34} rx={7} fill="var(--v-detector)" />
      <Txt x={390} y={87} anchor="middle" size={11} color="#ffffff" weight={600}>
        постоянен ток
      </Txt>
      <path d="M125 124 V83 H330 M665 124 V83 H450" fill="none" stroke="var(--v-metal)" strokeWidth={2.2} />
      {stage >= 2 && stage <= 3 && (
        <path d="M125 124 V83 H330 M665 124 V83 H450" fill="none" stroke="var(--v-light)" strokeWidth={2.2} className="flow-line" opacity={0.8} />
      )}

      {/* Съдове с буфер и гел */}
      <rect x={100} y={124} width={50} height={86} rx={6} fill="var(--v-liquid)" stroke="var(--v-glass)" strokeWidth={1.6} />
      <rect x={640} y={124} width={50} height={86} rx={6} fill="var(--v-liquid)" stroke="var(--v-glass)" strokeWidth={1.6} />
      <Txt x={125} y={116} anchor="middle" size={13} weight={800} color="var(--v-blood)">
        +
      </Txt>
      <Txt x={665} y={116} anchor="middle" size={13} weight={800} color="var(--v-dye-free)">
        −
      </Txt>
      <rect x={GX0} y={130} width={GX1 - GX0} height={74} rx={6} fill="var(--v-liquid)" stroke="var(--v-glass)" strokeWidth={1.6} />
      {sup === 'paper' && <rect x={GX0} y={130} width={GX1 - GX0} height={74} rx={6} fill={`url(#${uid}-fib)`} opacity={0.8} />}
      <rect x={GX0} y={130} width={GX1 - GX0} height={74} rx={6} fill="var(--v-hapten)" opacity={cur[I.fix]} />
      <Txt x={125} y={226} anchor="middle" size={11} color="var(--v-soft)" weight={600}>
        анод (+)
      </Txt>
      <Txt x={665} y={226} anchor="middle" size={11} color="var(--v-soft)" weight={600}>
        катод (−)
      </Txt>
      {stage >= 2 && stage <= 3 && (
        <Txt x={395} y={122} anchor="middle" size={11} color="var(--v-soft)" weight={600}>
          {direction}
        </Txt>
      )}
      {stage === 4 && (
        <Txt x={395} y={122} anchor="middle" size={11} color="var(--v-soft)" weight={600}>
          фиксатор: метанол / оцетна киселина
        </Txt>
      )}

      {/* Старт */}
      <polygon points={`${X0 - 5},124 ${X0 + 5},124 ${X0},131`} fill="var(--v-soft)" />
      <Txt x={X0} y={218} anchor="middle" size={10} color="var(--v-soft)" weight={600}>
        старт
      </Txt>

      {/* Оцветени ленти */}
      {FR.map((_, i) => {
        const w = Math.max(10, 2.6 * sigmaOf(i, sup) + 6);
        return <rect key={`b${i}`} x={cents[i] - w / 2} y={134} width={w} height={66} rx={2.5} fill="var(--v-moblue)" opacity={cur[I.band + i]} />;
      })}

      {/* Белтъци */}
      {FR.map((f, i) =>
        Array.from({ length: ND[i] }, (_, j) => {
          const k = D_OFF[i] + j;
          return (
            <Jig key={`d${k}`} x={cur[I.x + k]} y={DY[k]} opacity={cur[I.fo + i] * cur[I.dot]} delay={k * 0.21}>
              <circle r={3.4} fill={f.color} stroke="var(--v-ink)" strokeOpacity={0.3} strokeWidth={0.7} />
            </Jig>
          );
        }),
      )}

      {/* Етикети на фракциите */}
      {stage >= 3 &&
        FR.map((f, i) =>
          amts[i] > 0 ? (
            <Txt key={`l${i}`} x={cents[i]} y={i === NF - 1 ? 244 : 236} anchor="middle" size={11} weight={700} color={f.color === 'var(--v-ink)' ? 'var(--v-ink)' : f.color}>
              {f.short}
            </Txt>
          ) : null,
        )}

      {/* Денситограма */}
      {stage >= 6 && (
        <>
          <Txt x={20} y={base - 4} size={11} color="var(--v-soft)" weight={600}>
            денситограма
          </Txt>
          <line x1={GX0} x2={GX1} y1={base} y2={base} stroke="var(--v-soft)" strokeWidth={1.2} />
          <g clipPath={`url(#${uid}-scan)`}>
            <path d={area} fill="var(--accent)" opacity={0.16} />
            <path d={trace} fill="none" stroke="var(--accent)" strokeWidth={2.3} />
          </g>
          <line x1={scanX} x2={scanX} y1={126} y2={base} stroke="var(--accent)" strokeWidth={1.6} strokeDasharray="4 4" opacity={scanW > 2 && scanW < GX1 - GX0 - 2 ? 1 : 0} />
        </>
      )}

      {/* Резултат */}
      <g opacity={stage === 7 ? 1 : 0} style={{ transition: 'opacity 0.5s' }}>
        <rect x={466} y={10} width={298} height={66} rx={10} fill="var(--surface)" stroke="var(--accent)" strokeWidth={1.8} />
        <Txt x={480} y={29} size={11} color="var(--v-soft)" weight={700}>
          ФРАКЦИИ (условно, % от общия белтък)
        </Txt>
        <Txt x={480} y={48} size={12} weight={700} mono>
          Alb {fmt(amts[0], 0)} · α₁ {fmt(amts[1], 0)} · α₂ {fmt(amts[2], 0)}
        </Txt>
        <Txt x={480} y={66} size={12} weight={700} mono>
          β {fmt(amts[3], 0)} · γ {fmt(amts[4], 0)}
          {mono ? ` · M ${fmt(amts[5], 0)}` : ''}
        </Txt>
      </g>

      {/* Легенда */}
      <g transform="translate(20 343)">
        {FR.filter((_, i) => i < NF - 1 || mono).map((f, i) => (
          <g key={f.short} transform={`translate(${i * 92} 0)`}>
            <circle cx={5} cy={0} r={4} fill={f.color} stroke="var(--v-ink)" strokeOpacity={0.3} />
            <Txt x={14} y={4} size={11} color="var(--v-soft)">
              {i === 0 ? 'албумин' : i === NF - 1 ? 'М-белтък' : f.short}
            </Txt>
          </g>
        ))}
      </g>
    </svg>
  );
}

/* ═════════════════════════ Сцена: хроматография ═════════════════════════ */

function ChScene({ stage, tech, exch, ligand, c, cur, title, label }: { stage: number; tech: Tech; exch: Exch; ligand: Ligand; c: ChState; cur: number[]; title: string; label: string }) {
  const peaks = peaksOf(c);
  const tNow = clamp(cur[CH_T], 0, 100);
  const yMax = Math.max(20, ...peaks.map((p) => 6 * p.area * pdf(p.t, p.t, p.sg))) * 1.2;
  const PL = 415;
  const PR = 752;
  const PT = 96;
  const PB = 262;
  const px = (t: number) => PL + (t / 100) * (PR - PL);
  const py = (v: number) => PB - (clamp(v, 0, yMax) / yMax) * (PB - PT);
  let path = '';
  for (let t = 0; t <= tNow + 0.001; t += 0.5) path += `${path ? ' L' : 'M'}${px(t).toFixed(1)} ${py(signalAt(t, peaks)).toFixed(1)}`;
  const area = path ? `${path} L${px(tNow).toFixed(1)} ${PB} L${px(0)} ${PB} Z` : '';
  const saltAt = (t: number) => (c.step ? (t < 40 ? 0 : 1) : t < 35 ? 0 : t > 90 ? 1 : (t - 35) / 55);
  let saltPath = '';
  for (let t = 0; t <= tNow + 0.001; t += 0.5) saltPath += `${saltPath ? ' L' : 'M'}${px(t).toFixed(1)} ${(PB - saltAt(t) * (PB - PT)).toFixed(1)}`;

  // зърна на смолата
  const beads: [number, number][] = [];
  for (let r = 0; r < 19; r++) for (let q = 0; q < 6; q++) beads.push([198 + q * 8 + (r % 2) * 4, 100 + r * 8]);

  const fluid =
    stage === 1 || stage === 4 || stage === 7 ? 'var(--v-liquid)' : stage === 2 || stage === 3 ? 'var(--v-hb)' : stage >= 5 ? 'var(--v-na)' : 'transparent';
  const fluidOp = stage === 2 || stage === 3 ? 0.7 : stage >= 5 && stage !== 7 ? 0.5 : 1;
  const fluidName =
    stage === 1 ? (tech === 'aff' ? 'свързващ буфер' : 'буфер А') : stage === 2 || stage === 3 ? 'проба' : stage === 4 ? 'буфер А (промиване)' : stage === 5 || stage === 6 ? 'буфер Б (елуиране)' : stage === 7 ? 'буфер А (регенериране)' : '';

  // епруветки
  const sorted = c.prots
    .map((p, i) => ({ p, s: c.st[i] }))
    .filter((x) => x.s.bound && x.s.area > 0)
    .sort((a, b) => a.s.tp - b.s.tp);
  const ft = peaks[0];
  const tubes: { color: string; on: boolean }[] = [
    { color: ft.color, on: ft.area > 0.5 && tNow >= 20 },
    ...[0, 1, 2].map((k) => (sorted[k] ? { color: sorted[k].p.color, on: tNow >= sorted[k].s.tp } : { color: 'transparent', on: false })),
  ];
  const sig = clamp(signalAt(tNow, peaks) / yMax, 0, 1);

  return (
    <svg viewBox="0 0 780 350" className="viz-svg block h-auto w-full" role="img" aria-label={`Схема на ${tech === 'iex' ? 'йонообменна' : 'афинитетна'} хроматография на белтъци, етап ${stage + 1}: ${title}`}>
      <Txt x={20} y={34} size={15} weight={800}>
        {stage + 1} · {label}
      </Txt>
      <Txt x={20} y={54} size={12} color="var(--v-soft)">
        {title}
      </Txt>

      {/* Резервоар */}
      <rect x={190} y={64} width={60} height={16} rx={4} fill="var(--v-liquid)" stroke="var(--v-glass)" strokeWidth={1.4} />
      <rect x={191} y={65} width={58} height={14} rx={3} fill={fluid} opacity={fluidOp} />
      <line x1={220} x2={220} y1={80} y2={92} stroke="var(--v-glass)" strokeWidth={2} />
      {fluidName && (
        <Txt x={262} y={77} size={11} color="var(--v-soft)" weight={600}>
          {fluidName}
        </Txt>
      )}

      {/* Колона */}
      <rect x={190} y={92} width={60} height={160} rx={8} fill="var(--v-glass)" opacity={0.13} stroke="var(--v-glass)" strokeWidth={1.6} />
      {beads.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={3.1} fill="var(--v-metal)" opacity={0.55} />
          {tech === 'iex' ? (
            <path d={exch === 'an' ? `M${x - 1.5} ${y}H${x + 1.5}M${x} ${y - 1.5}V${y + 1.5}` : `M${x - 1.5} ${y}H${x + 1.5}`} stroke={exch === 'an' ? 'var(--v-blood)' : 'var(--v-dye-free)'} strokeWidth={1.1} fill="none" />
          ) : (
            <polygon points={`${x + 2.4},${y - 3.3} ${x + 5.4},${y - 3.3} ${x + 3.9},${y - 0.5}`} fill={ligand === 'blue' ? 'var(--v-dye-free)' : 'var(--v-hapten)'} />
          )}
        </g>
      ))}
      <Txt x={262} y={174} size={11} color="var(--v-soft)" weight={600}>
        колона със смола
      </Txt>
      <Txt x={262} y={190} size={10} color="var(--v-soft)">
        {tech === 'iex' ? (exch === 'an' ? 'фиксирани (+) групи' : 'фиксирани (−) групи') : ligand === 'blue' ? 'лиганд: Cibacron Blue' : 'лиганд: протеин A'}
      </Txt>

      {/* Белтъци в колоната */}
      {c.prots.map((p, pi) => {
        const off = c.prots.slice(0, pi).reduce((a, q) => a + q.n, 0);
        return Array.from({ length: p.n }, (_, j) => {
          const k = off + j;
          return (
            <Jig key={`p${k}`} x={CDX[k]} y={cur[k]} opacity={cur[CH_OP + k]} delay={k * 0.31}>
              <circle r={3.6} fill={p.color} stroke="var(--v-ink)" strokeOpacity={0.35} strokeWidth={0.8} />
            </Jig>
          );
        });
      })}

      {/* Детектор */}
      <rect x={190} y={258} width={60} height={22} rx={5} fill="var(--v-detector)" />
      <circle cx={200} cy={269} r={4} fill="var(--v-light)" opacity={0.3 + 0.7 * sig} />
      <Txt x={228} y={273} anchor="middle" size={10} color="#ffffff" weight={600}>
        UV 280
      </Txt>
      <line x1={220} x2={220} y1={252} y2={258} stroke="var(--v-glass)" strokeWidth={2} />

      {/* Колектор на фракции */}
      <Txt x={20} y={312} size={11} color="var(--v-soft)" weight={600}>
        колектор на фракции
      </Txt>
      {tubes.map((tb, i) => (
        <g key={`t${i}`}>
          <rect x={180 + i * 30} y={290} width={20} height={36} rx={5} fill="var(--v-liquid)" stroke="var(--v-glass)" strokeWidth={1.4} />
          <rect x={181.5 + i * 30} y={304} width={17} height={20} rx={3.5} fill={tb.color} opacity={tb.on ? 0.85 : 0} style={{ transition: 'opacity 0.5s' }} />
          <Txt x={190 + i * 30} y={339} anchor="middle" size={10} color="var(--v-soft)">
            {i + 1}
          </Txt>
        </g>
      ))}

      {/* Хроматограма */}
      <line x1={PL} x2={PR} y1={PB} y2={PB} stroke="var(--v-soft)" />
      <line x1={PL} x2={PL} y1={PT} y2={PB} stroke="var(--v-soft)" />
      <rect x={px(0)} y={PT} width={px(10) - px(0)} height={PB - PT} fill="var(--v-hb)" opacity={0.12} />
      <rect x={px(c.wash)} y={PT} width={px(90) - px(c.wash)} height={PB - PT} fill="var(--v-na)" opacity={0.1} />
      <Txt x={px(5)} y={PT - 6} anchor="middle" size={10} color="var(--v-soft)" weight={600}>
        проба
      </Txt>
      <Txt x={(px(10) + px(c.wash)) / 2} y={PT - 6} anchor="middle" size={10} color="var(--v-soft)" weight={600}>
        промиване
      </Txt>
      <Txt x={(px(c.wash) + px(90)) / 2} y={PT - 6} anchor="middle" size={10} color="var(--v-soft)" weight={600}>
        {c.step ? 'елуиране (стъпка)' : 'елуиране (градиент)'}
      </Txt>
      {[0, 20, 40, 60, 80, 100].map((t) => (
        <Txt key={t} x={px(t)} y={PB + 14} anchor="middle" size={10} color="var(--v-soft)">
          {t}
        </Txt>
      ))}
      <Txt x={(PL + PR) / 2} y={PB + 30} anchor="middle" size={11} color="var(--v-soft)" weight={600}>
        обем на елуиране (условно)
      </Txt>
      <g transform={`rotate(-90 ${PL - 14} ${(PT + PB) / 2})`}>
        <Txt x={PL - 14} y={(PT + PB) / 2} anchor="middle" size={11} color="var(--v-soft)" weight={600}>
          UV 280 nm (усл. ед.)
        </Txt>
      </g>
      {area && <path d={area} fill="var(--accent)" opacity={0.14} />}
      {saltPath && <path d={saltPath} fill="none" stroke="var(--v-na)" strokeWidth={1.8} strokeDasharray="5 4" />}
      {path && <path d={path} fill="none" stroke="var(--accent)" strokeWidth={2.4} />}
      {peaks.map((p, i) => {
        const h = 6 * p.area * pdf(p.t, p.t, p.sg);
        if (tNow < p.t || p.area <= 0.5) return null;
        return (
          <g key={`pk${i}`}>
            <circle cx={px(p.t)} cy={py(h)} r={4.8} fill={p.color} stroke="var(--surface)" strokeWidth={2} />
            <Txt x={px(p.t)} y={py(h) - 9} anchor="middle" size={10} weight={700} halo>
              {p.label}
            </Txt>
          </g>
        );
      })}
      {tNow > 0 && tNow < 99.5 && <line x1={px(tNow)} x2={px(tNow)} y1={PT} y2={PB} stroke="var(--v-soft)" strokeDasharray="3 4" />}
      <Txt x={px(c.wash) + 6} y={PT + 12} anchor="start" size={10} color="var(--v-na)" weight={700}>
        {c.step ? 'буфер Б (стъпка)' : 'сол (градиент)'}
      </Txt>

      {/* Легенда */}
      <g transform="translate(415 336)">
        {c.prots.map((p, i) => (
          <g key={p.short} transform={`translate(${i * 118} 0)`}>
            <circle cx={5} cy={0} r={4} fill={p.color} stroke="var(--v-ink)" strokeOpacity={0.3} />
            <Txt x={14} y={4} size={11} color="var(--v-soft)">
              {p.short}
            </Txt>
          </g>
        ))}
      </g>
    </svg>
  );
}

/* ═════════════════════════ Панел: заряд и pH ═════════════════════════ */

function ChargePanel({ items, w, pH, shade, title, note }: { items: { short: string; pI: number; color: string }[]; w: number; pH: number; shade: 'neg' | 'pos' | null; title: string; note: string }) {
  const W = 340;
  const H = 236;
  const L = 46;
  const R = 14;
  const Tp = 16;
  const B = 42;
  const px = (v: number) => L + ((v - 4) / 6) * (W - L - R);
  const py = (q: number) => Tp + (1 - (q + 1) / 2) * (H - Tp - B);
  const curve = (pI: number) => {
    let d = '';
    for (let v = 4; v <= 10.001; v += 0.25) d += `${d ? ' L' : 'M'}${px(v).toFixed(1)} ${py(charge(pI, v, w)).toFixed(1)}`;
    return d;
  };
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="!m-0 text-sm font-bold text-ink">{title}</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="viz-svg mx-auto mt-1 block h-auto w-full max-w-[440px]" role="img" aria-label="Качествена зависимост на нетния заряд на белтъците от pH с отбелязани изоелектрични точки и избраното pH">
        {shade && <rect x={L} y={shade === 'neg' ? py(0) : py(1)} width={W - L - R} height={py(0) - py(1)} fill="var(--accent)" opacity={0.1} />}
        {[-1, 0, 1].map((q) => (
          <g key={q}>
            <line x1={L} x2={W - R} y1={py(q)} y2={py(q)} stroke={q === 0 ? 'var(--v-soft)' : 'var(--v-grid)'} strokeDasharray={q === 0 ? '4 3' : undefined} />
            <Txt x={L - 6} y={py(q) + 4} anchor="end" size={10} color="var(--v-soft)">
              {q > 0 ? '+' : q < 0 ? '−' : '0'}
            </Txt>
          </g>
        ))}
        {[4, 5, 6, 7, 8, 9, 10].map((v) => (
          <Txt key={v} x={px(v)} y={H - B + 16} anchor="middle" size={10} color="var(--v-soft)">
            {v}
          </Txt>
        ))}
        <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke="var(--v-soft)" />
        <line x1={L} x2={L} y1={Tp} y2={H - B} stroke="var(--v-soft)" />
        {items.map((it) => (
          <path key={it.short} d={curve(it.pI)} fill="none" stroke={it.color} strokeWidth={2.2} />
        ))}
        {items.map((it) => (
          <circle key={`z${it.short}`} cx={px(clamp(it.pI, 4, 10))} cy={py(0)} r={3.4} fill="var(--surface)" stroke={it.color} strokeWidth={1.8} />
        ))}
        <line x1={px(pH)} x2={px(pH)} y1={Tp} y2={H - B} stroke="var(--accent)" strokeWidth={1.8} strokeDasharray="4 4" />
        {items.map((it) => (
          <circle key={`c${it.short}`} cx={px(pH)} cy={py(charge(it.pI, pH, w))} r={4.6} fill={it.color} stroke="var(--surface)" strokeWidth={1.8} />
        ))}
        <Txt x={px(pH) + (pH > 8.6 ? -6 : 6)} y={Tp + 10} anchor={pH > 8.6 ? 'end' : 'start'} size={10} color="var(--accent)" weight={700} halo>
          pH {fmt(pH, 1)}
        </Txt>
        <Txt x={(L + W - R) / 2} y={H - 8} anchor="middle" size={11} color="var(--v-soft)" weight={600}>
          pH на буфера
        </Txt>
        <g transform={`rotate(-90 12 ${(Tp + H - B) / 2})`}>
          <Txt x={12} y={(Tp + H - B) / 2} anchor="middle" size={11} color="var(--v-soft)" weight={600}>
            нетен заряд (качествено)
          </Txt>
        </g>
      </svg>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {items.map((it) => (
          <span key={it.short} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-5 rounded" style={{ background: it.color }} /> {it.short} (pI ≈ {fmt(it.pI, 1)})
          </span>
        ))}
      </div>
      <p className="!m-0 mt-2 text-xs text-muted">{note}</p>
    </div>
  );
}

/* ═════════════════════════ Панел: денситограма ═════════════════════════ */

function DensPanel({ uid, cents, amts, sup, total, onTotal, mono }: { uid: string; cents: number[]; amts: number[]; sup: Support; total: number; onTotal: (v: number) => void; mono: boolean }) {
  const W = 340;
  const H = 236;
  const L = 14;
  const R = 14;
  const Tp = 40;
  const B = 40;
  const curve = densCurve(cents, amts, sup);
  const px = (x: number) => L + ((x - GX0) / (GX1 - GX0)) * (W - L - R);
  const py = (v: number) => H - B - (v / curve.mx) * (H - Tp - B) * 0.92;
  const pts = curve.xs.map((x, k) => `${px(x).toFixed(1)} ${py(curve.vs[k]).toFixed(1)}`);
  const sum = amts.reduce((a, b) => a + b, 0);
  const visible = FR.map((f, i) => ({ f, i })).filter((x) => x.i < NF - 1 || mono);
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="!m-0 text-sm font-bold text-ink">Денситограма и количествено определяне</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="viz-svg mx-auto mt-1 block h-auto w-full max-w-[440px]" role="img" aria-label="Денситограма на серумните белтъци с дялове на фракциите в проценти">
        <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke="var(--v-soft)" />
        <path d={`M${px(GX0)} ${H - B} L${pts.join(' L')} L${px(GX1)} ${H - B} Z`} fill="var(--accent)" opacity={0.14} />
        <path d={`M${pts.join(' L')}`} fill="none" stroke="var(--accent)" strokeWidth={2.2} />
        {visible.map(({ f, i }, k) => (
          <g key={f.short}>
            <line x1={px(cents[i])} x2={px(cents[i])} y1={Tp - 4 + (k % 2) * 12} y2={H - B} stroke={f.color} strokeDasharray="2 4" opacity={0.7} />
            <Txt x={px(cents[i])} y={Tp - 8 + (k % 2) * 12} anchor="middle" size={10} weight={700} color={f.color} halo>
              {f.short} {fmt(amts[i], 0)} %
            </Txt>
          </g>
        ))}
        <Txt x={W - R} y={H - B + 16} anchor="end" size={10} color="var(--v-soft)">
          катод (−)
        </Txt>
        <Txt x={L} y={H - B + 16} size={10} color="var(--v-soft)">
          анод (+)
        </Txt>
        <Txt x={(L + W - R) / 2} y={H - 4} anchor="middle" size={11} color="var(--v-soft)" weight={600}>
          положение по гела → интензитет на оцветяването
        </Txt>
      </svg>
      <div className="mt-3 space-y-3">
        <Slider id={`${uid}-tp`} label="Общ белтък (отделно измерване)" value={total} min={50} max={90} step={1} display={`${fmt(total, 0)} g/L`} hint="Концентрацията на фракцията = дял на фракцията × общ белтък." onChange={onTotal} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {visible.map(({ f, i }) => (
            <ValuePill key={f.short} label={i === 0 ? 'Албумин' : i === NF - 1 ? 'М-белтък' : f.short} value={fmt((amts[i] / sum) * total, 1)} unit="g/L" kind="calculated" />
          ))}
        </div>
      </div>
      <p className="!m-0 mt-2 text-xs text-muted">
        {sup === 'paper' ? (
          <>
            Върху <strong>хартия</strong> пиковете са широки и застъпващи се – границите между фракциите са неясни и интегрирането е по-неточно.
          </>
        ) : sup === 'agar' ? (
          <>
            В <strong>агар</strong> електроендосмозата измества зоните към катода; γ-областта може да се размие.
          </>
        ) : (
          <>
            В <strong>агароза</strong> пиковете са остри и добре разделени; моноклоналният белтък е тесен пик.
          </>
        )}{' '}
        Процентите и концентрациите са <strong>условни</strong>.
      </p>
    </div>
  );
}

/* ═════════════════════════ Панел: афинитетен лиганд ═════════════════════════ */

function LigandPanel({ ligand }: { ligand: Ligand }) {
  const W = 340;
  const H = 170;
  const target = ligand === 'blue' ? 'var(--v-moblue)' : 'var(--v-quino)';
  const col = (cx: number, mode: 0 | 1 | 2) => (
    <g key={cx}>
      <circle cx={cx} cy={74} r={26} fill="var(--v-metal)" opacity={0.5} />
      <polygon points={`${cx + 18},${50} ${cx + 32},${50} ${cx + 25},${66}`} fill={ligand === 'blue' ? 'var(--v-dye-free)' : 'var(--v-hapten)'} />
      {mode < 2 && <circle cx={cx + 25} cy={44} r={7} fill={target} stroke="var(--v-ink)" strokeOpacity={0.35} />}
      {mode === 2 && <circle cx={cx + 52} cy={26} r={7} fill={target} stroke="var(--v-ink)" strokeOpacity={0.35} />}
      {mode === 1 && (
        <>
          <ellipse cx={cx - 34} cy={96} rx={7} ry={5} fill="var(--v-cl)" opacity={0.6} />
          <ellipse cx={cx - 18} cy={128} rx={7} ry={5} fill="var(--v-cl)" opacity={0.4} />
        </>
      )}
      {mode === 0 && (
        <>
          <ellipse cx={cx - 12} cy={20} rx={7} ry={5} fill="var(--v-cl)" opacity={0.6} />
          <circle cx={cx + 42} cy={8} r={7} fill={target} stroke="var(--v-ink)" strokeOpacity={0.35} opacity={0.5} />
        </>
      )}
    </g>
  );
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="!m-0 text-sm font-bold text-ink">Специфично свързване на лиганда</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="viz-svg mx-auto mt-1 block h-auto w-full max-w-[440px]" role="img" aria-label="Три етапа на афинитетното свързване: свързване, промиване и елуиране">
        {col(56, 0)}
        {col(170, 1)}
        {col(284, 2)}
        <Txt x={56} y={152} anchor="middle" size={11} weight={700}>
          1 Свързване
        </Txt>
        <Txt x={170} y={152} anchor="middle" size={11} weight={700}>
          2 Промиване
        </Txt>
        <Txt x={284} y={152} anchor="middle" size={11} weight={700}>
          3 Елуиране
        </Txt>
      </svg>
      <p className="!m-0 mt-2 text-xs text-muted">
        {ligand === 'blue' ? (
          <>
            <strong>Cibacron Blue</strong> свързва албумина електростатично и/или хидрофобно; свързва и някои други белтъци (напр. ензими с нуклеотиден кофактор, коагулационни фактори) – затова процедурата се валидира.
          </>
        ) : (
          <>
            <strong>Протеин A</strong> разпознава имуноглобулините IgG и се използва за пречистване и количествено определяне на антитела.
          </>
        )}{' '}
        След нанасяне непосвързаните белтъци се измиват, а целевият белтък се освобождава с елуиращ буфер (друго pH/йонна сила или конкурентна молекула).
      </p>
    </div>
  );
}

/* ═════════════════════════ Панел: свързване и капацитет ═════════════════════════ */

function BindingPanel({ c, tech, load, onLoad, uid }: { c: ChState; tech: Tech; load: number; onLoad: (v: number) => void; uid: string }) {
  const W = 340;
  const H = 62;
  const L = 12;
  const R = 12;
  const maxLoad = 150;
  const bx = (v: number) => L + (v / maxLoad) * (W - L - R);
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="!m-0 text-sm font-bold text-ink">Свързване и капацитет на колоната</p>
      <ul className="m-0 mt-2 list-none space-y-1.5 p-0 text-sm">
        {c.prots.map((p, i) => (
          <li key={p.short} className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: p.color }} />
              {p.label}
            </span>
            <span className={c.st[i].bound ? 'font-semibold text-accent' : 'text-muted'}>
              {c.st[i].bound ? (tech === 'iex' ? `свързва се · елуира при ≈ ${fmt(c.st[i].g * 100, 0)} % буфер Б` : 'свързва се · елуира със стъпка') : 'преминава (непосвързан)'}
            </span>
          </li>
        ))}
      </ul>
      <svg viewBox={`0 0 ${W} ${H}`} className="viz-svg mx-auto mt-3 block h-auto w-full max-w-[440px]" role="img" aria-label="Натоварване на колоната спрямо капацитета на смолата">
        <rect x={bx(0)} y={14} width={bx(100) - bx(0)} height={20} rx={4} fill="none" stroke="var(--v-soft)" strokeWidth={1.4} />
        <rect x={bx(0)} y={14} width={bx(Math.min(load, 100)) - bx(0)} height={20} rx={4} fill="var(--accent)" opacity={0.55} />
        {load > 100 && <rect x={bx(100)} y={14} width={bx(load) - bx(100)} height={20} rx={4} fill="var(--warn)" opacity={0.7} />}
        <line x1={bx(100)} x2={bx(100)} y1={8} y2={40} stroke="var(--v-ink)" strokeWidth={1.6} />
        <Txt x={bx(100)} y={54} anchor="middle" size={10} color="var(--v-soft)" weight={700}>
          капацитет 100 %
        </Txt>
        <Txt x={bx(0)} y={54} size={10} color="var(--v-soft)">
          0
        </Txt>
      </svg>
      <div className="mt-2 space-y-3">
        <Slider id={`${uid}-load`} label="Натоварване на колоната" value={load} min={20} max={150} step={5} display={`${fmt(load, 0)} % от капацитета`} hint="Над 100 % смолата не може да свърже повече белтък – част от него „пробива“ в непосвързаната фракция." onChange={onLoad} />
        <div className="grid grid-cols-2 gap-2">
          <ValuePill label="Загуба от претоварване" value={fmt(c.ov * 100, 0)} unit="%" kind="calculated" />
          <ValuePill label="Метод на елуиране" value={tech === 'iex' ? 'градиент на сол' : 'стъпково (буфер Б)'} kind="neutral" />
        </div>
      </div>
      <p className="!m-0 mt-2 text-xs text-muted">
        Колоната има ограничен <strong>капацитет</strong>. При претоварване част от белтъка преминава несвързан и се губи в непосвързания пик. Стойностите са <strong>условни</strong>.
      </p>
    </div>
  );
}
