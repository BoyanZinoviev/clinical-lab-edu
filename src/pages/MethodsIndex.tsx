import { TopicCard } from '../components/education/TopicCard';
import { methodTopics, topics } from '../data/topics';

export default function MethodsIndex() {
  return (
    <div className="fade-up space-y-6">
      <header className="card p-6 sm:p-8">
        <p className="eyebrow !m-0">Раздел</p>
        <h1 className="!mb-2 !mt-1 text-[1.9rem] font-extrabold text-ink">Аналитични методи</h1>
        <p className="!m-0 max-w-3xl text-[1rem] leading-relaxed text-muted">
          Осем принципа и метода, с които клиничната лаборатория превръща проба в число: имунохимично измерване на мътност, колориметрия
          с металохромно багрило, фотометрия на фосфат чрез молибдатна реакция, ензимно определяне на глюкоза, колориметрия на креатинин
          по Jaffé, йонселективни електроди, кръвно-газов анализ и течна хроматография. За всеки метод ще видиш какво реагира, какво се измерва и как апаратът стига до резултата.
        </p>
      </header>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {methodTopics.map((t) => (
          <TopicCard key={t.id} topic={t} index={topics.findIndex((x) => x.id === t.id) + 1} />
        ))}
      </div>
    </div>
  );
}
