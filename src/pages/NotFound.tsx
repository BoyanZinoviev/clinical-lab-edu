import { Icon } from '../components/ui/Icon';

export default function NotFound() {
  return (
    <div className="card fade-up mx-auto max-w-xl p-8 text-center">
      <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-warn/12 text-warn">
        <Icon name="alert" size={26} />
      </span>
      <h1 className="!m-0 text-[1.6rem] font-extrabold text-ink">Страницата не е намерена</h1>
      <p className="!mb-5 !mt-2 text-muted">Адресът не съответства на нито един урок. Върни се към началната страница.</p>
      <a href="#/" className="btn btn-primary">
        <Icon name="home" size={18} /> Към началото
      </a>
    </div>
  );
}
