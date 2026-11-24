import { Icon } from '../components/ui/Icon';
import { Callout } from '../components/ui/Callout';
import type { IconName } from '../types';

const facts: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'graduation',
    title: 'За кого е предназначен',
    text: 'Помагало за студент по медицина – за разбиране на аналитичните методи в клиничната лаборатория, техните научни принципи, калибрацията и вътрешнолабораторния качествен контрол.',
  },
  {
    icon: 'book',
    title: 'Научна коректност',
    text: 'Съдържанието се основава на учебници, насоки и стандарти. Когато даден детайл зависи от производителя или метода, това е изрично посочено. Непотвърдени подробности не се представят като установени факти.',
  },
];

export default function About() {
  return (
    <div className="fade-up space-y-6">
      <header className="card p-6 sm:p-8">
        <p className="eyebrow !m-0">Информация</p>
        <h1 className="!mb-2 !mt-1 text-[1.9rem] font-extrabold text-ink">За проекта</h1>
        <p className="!m-0 max-w-3xl text-[1rem] leading-relaxed text-muted">
          „Клинична лаборатория – Интерактивно обучение“ е образователен проект, който обяснява как работят основните лабораторни методи –
          чрез текст, схеми и интерактивни модели, които може да се управляват стъпка по стъпка.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {facts.map((f) => (
          <div key={f.title} className="card p-5">
            <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <Icon name={f.icon} size={21} />
            </span>
            <h2 className="!m-0 text-[1.1rem] font-bold text-ink">{f.title}</h2>
            <p className="!mb-0 !mt-1.5 text-[0.95rem] leading-relaxed text-muted">{f.text}</p>
          </div>
        ))}
      </div>

      <div className="edu">
        <Callout
          tone="warning"
          title="Не е за клинична употреба"
          text="Платформата е образователна. Тя **не е** диагностичен инструмент и **не дава** решения за лечение или препоръки за конкретен пациент. Всички числови стойности в примерите и симулациите са **илюстративни** и не представляват реални резултати."
        />
        <Callout
          tone="info"
          title="Как са означени данните"
          text="Във всяка визуализация, която използва примерни числа, това е посочено изрично. Измерените и изчислените величини са разграничени (напр. в кръвно-газовия анализ). Реални аналитични параметри – дължини на вълната, състав на реактиви, интервали на приемливост – се определят от производителя на метода или анализатора и не са представени като универсални."
        />
      </div>

      <section className="card p-6">
        <h2 className="!m-0 text-[1.2rem] font-bold text-ink">Структура на уроците</h2>
        <p className="!mb-3 !mt-1 text-[0.95rem] text-muted">Всеки модул има еднакви десет раздела:</p>
        <ol className="grid list-decimal gap-x-8 gap-y-1 pl-5 text-[0.95rem] text-ink sm:grid-cols-2">
          {[
            'Въведение',
            'Принцип на метода',
            'Необходими компоненти',
            'Графична визуализация',
            'Процес на измерване',
            'Интерпретация на резултатите',
            'Предимства и ограничения',
            'Важно за изпита',
            'Терминология',
            'Източници',
          ].map((s) => (
            <li key={s} className="marker:font-bold marker:text-accent">
              {s}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
