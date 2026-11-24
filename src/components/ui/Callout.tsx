import type { CalloutTone } from '../../types';
import { Icon } from './Icon';
import { RichText } from './RichText';
import type { IconName } from '../../types';

const tones: Record<CalloutTone, { icon: IconName; title: string; box: string; iconCls: string }> = {
  info: {
    icon: 'info',
    title: 'Добре е да се знае',
    box: 'border-info/30 bg-info/8',
    iconCls: 'text-info',
  },
  warning: {
    icon: 'alert',
    title: 'Внимание',
    box: 'border-warn/35 bg-warn/8',
    iconCls: 'text-warn',
  },
  verify: {
    icon: 'eye',
    title: 'Зависи от метода – изисква проверка',
    box: 'border-warn/35 bg-warn/8',
    iconCls: 'text-warn',
  },
  exam: {
    icon: 'graduation',
    title: 'Запомни',
    box: 'border-accent/35 bg-accent/8',
    iconCls: 'text-accent',
  },
  illustrative: {
    icon: 'info',
    title: 'Образователни данни',
    box: 'border-line bg-surface2',
    iconCls: 'text-muted',
  },
};

export function Callout({ tone, title, text }: { tone: CalloutTone; title?: string; text: string }) {
  const t = tones[tone];
  return (
    <aside className={`my-4 flex gap-3 rounded-xl border p-4 ${t.box}`} role="note">
      <Icon name={t.icon} size={20} className={`mt-0.5 shrink-0 ${t.iconCls}`} />
      <div className="min-w-0 text-[0.94rem] leading-relaxed">
        <p className="!my-0 font-semibold text-ink">{title ?? t.title}</p>
        <p className="!mb-0 !mt-1 text-muted [&_strong]:text-ink">
          <RichText text={text} />
        </p>
      </div>
    </aside>
  );
}
