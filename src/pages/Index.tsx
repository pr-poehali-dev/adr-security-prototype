import { useMemo, useState } from 'react';
import Icon from '@/components/ui/icon';

type Status = 'Принято' | 'Предложено' | 'Устарело' | 'Отклонено';

interface Version {
  rev: string;
  date: string;
  author: string;
  note: string;
}

interface ADR {
  id: string;
  number: number;
  title: string;
  status: Status;
  date: string;
  author: string;
  tags: string[];
  context: string;
  decision: string;
  consequences: string;
  versions: Version[];
}

const TEMPLATES = [
  { id: 't1', name: 'Базовый ADR', desc: 'Контекст · Решение · Последствия', icon: 'FileText' },
  { id: 't2', name: 'Threat Model', desc: 'Активы · Угрозы · Контрмеры', icon: 'ShieldAlert' },
  { id: 't3', name: 'Access Control', desc: 'Роли · Права · Политики', icon: 'KeyRound' },
  { id: 't4', name: 'Криптография', desc: 'Алгоритмы · Ключи · Ротация', icon: 'Lock' },
];

const STATUS_STYLES: Record<Status, string> = {
  'Принято': 'bg-accent/15 text-accent border-accent/30',
  'Предложено': 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  'Устарело': 'bg-muted text-muted-foreground border-border',
  'Отклонено': 'bg-destructive/10 text-destructive border-destructive/30',
};

const SEED: ADR[] = [
  {
    id: 'a1',
    number: 12,
    title: 'Хранение секретов в HashiCorp Vault',
    status: 'Принято',
    date: '2026-05-30',
    author: 'А. Соколова',
    tags: ['secrets', 'infra'],
    context:
      'Секреты приложений хранятся в переменных окружения и .env-файлах. Это создаёт риск утечки при доступе к репозиторию и затрудняет ротацию ключей.',
    decision:
      'Внедрить HashiCorp Vault как централизованное хранилище секретов. Доступ выдаётся по short-lived токенам через AppRole. Ротация ключей — раз в 30 дней.',
    consequences:
      'Снижается риск утечки. Требуется поддержка Vault-кластера и обучение команды. Добавляется зависимость на доступность Vault при старте сервисов.',
    versions: [
      { rev: 'v3', date: '2026-05-30', author: 'А. Соколова', note: 'Статус → Принято, утверждено AppSec' },
      { rev: 'v2', date: '2026-05-22', author: 'Д. Орлов', note: 'Добавлена политика ротации 30 дней' },
      { rev: 'v1', date: '2026-05-18', author: 'А. Соколова', note: 'Черновик решения' },
    ],
  },
  {
    id: 'a2',
    number: 11,
    title: 'mTLS между внутренними сервисами',
    status: 'Предложено',
    date: '2026-05-24',
    author: 'Д. Орлов',
    tags: ['network', 'zero-trust'],
    context:
      'Трафик между микросервисами идёт по обычному HTTP внутри кластера. Нет аутентификации сервисов и шифрования трафика east-west.',
    decision:
      'Включить mutual TLS через service mesh (Istio). Сертификаты выдаёт внутренний CA с автоматической ротацией каждые 24 часа.',
    consequences:
      'Шифрование и взаимная аутентификация всех сервисов. Рост накладных расходов на CPU ~5%. Усложняется отладка сетевого трафика.',
    versions: [
      { rev: 'v2', date: '2026-05-24', author: 'Д. Орлов', note: 'Уточнён выбор Istio' },
      { rev: 'v1', date: '2026-05-20', author: 'Д. Орлов', note: 'Первичное предложение' },
    ],
  },
  {
    id: 'a3',
    number: 9,
    title: 'Отказ от JWT в пользу opaque-токенов',
    status: 'Устарело',
    date: '2026-03-11',
    author: 'А. Соколова',
    tags: ['auth', 'api'],
    context:
      'JWT-токены нельзя отозвать до истечения срока. Это создаёт окно компрометации при утечке токена.',
    decision:
      'Перейти на opaque-токены с проверкой через интроспекцию на стороне Auth-сервиса.',
    consequences:
      'Возможность мгновенного отзыва. Дополнительный round-trip на каждый запрос. Решение заменено ADR-014 о гибридной схеме.',
    versions: [
      { rev: 'v1', date: '2026-03-11', author: 'А. Соколова', note: 'Принято, позже помечено устаревшим' },
    ],
  },
];

const EMPTY_DRAFT: ADR = {
  id: '',
  number: 0,
  title: '',
  status: 'Предложено',
  date: new Date().toISOString().slice(0, 10),
  author: '—',
  tags: [],
  context: '',
  decision: '',
  consequences: '',
  versions: [],
};

const Index = () => {
  const [records, setRecords] = useState<ADR[]>(SEED);
  const [selectedId, setSelectedId] = useState<string>(SEED[0].id);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ADR>(SEED[0]);
  const [showHistory, setShowHistory] = useState(false);
  const [query, setQuery] = useState('');

  const selected = records.find((r) => r.id === selectedId);

  const filtered = useMemo(
    () =>
      records.filter(
        (r) =>
          r.title.toLowerCase().includes(query.toLowerCase()) ||
          r.tags.some((t) => t.includes(query.toLowerCase())),
      ),
    [records, query],
  );

  const openRecord = (r: ADR) => {
    setSelectedId(r.id);
    setEditing(false);
    setShowHistory(false);
  };

  const startEdit = () => {
    if (!selected) return;
    setDraft(selected);
    setEditing(true);
  };

  const startNew = () => {
    const nextNum = Math.max(0, ...records.map((r) => r.number)) + 1;
    setDraft({ ...EMPTY_DRAFT, number: nextNum });
    setEditing(true);
    setSelectedId('');
  };

  const saveDraft = () => {
    const today = new Date().toISOString().slice(0, 10);
    if (draft.id) {
      const rev = `v${draft.versions.length + 1}`;
      const updated: ADR = {
        ...draft,
        date: today,
        versions: [
          { rev, date: today, author: draft.author, note: 'Отредактировано' },
          ...draft.versions,
        ],
      };
      setRecords((prev) => prev.map((r) => (r.id === draft.id ? updated : r)));
      setSelectedId(draft.id);
    } else {
      const id = `a${Date.now()}`;
      const created: ADR = {
        ...draft,
        id,
        date: today,
        versions: [{ rev: 'v1', date: today, author: draft.author, note: 'Создано' }],
      };
      setRecords((prev) => [created, ...prev]);
      setSelectedId(id);
    }
    setEditing(false);
  };

  return (
    <div className="min-h-screen grain bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/70">
        <div className="max-w-6xl mx-auto px-6 md:px-10 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Icon name="ShieldCheck" size={20} className="text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <div className="font-display text-xl tracking-tight">Sentinel ADR</div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Security Architecture
              </div>
            </div>
          </div>
          <button
            onClick={startNew}
            className="group flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-all"
          >
            <Icon name="Plus" size={16} />
            Новый ADR
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 md:px-10 py-10 grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-10">
        {/* Sidebar: list + templates */}
        <aside className="space-y-8">
          <div>
            <div className="relative mb-4">
              <Icon
                name="Search"
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск по записям…"
                className="w-full bg-card border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:border-accent transition-colors"
              />
            </div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3 px-1">
              Решения · {filtered.length}
            </div>
            <div className="space-y-1.5">
              {filtered.map((r, i) => (
                <button
                  key={r.id}
                  onClick={() => openRecord(r)}
                  style={{ animationDelay: `${i * 40}ms` }}
                  className={`animate-fade-up w-full text-left rounded-lg border p-3.5 transition-all ${
                    selectedId === r.id
                      ? 'border-accent/50 bg-card shadow-sm'
                      : 'border-transparent hover:border-border hover:bg-card/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs text-muted-foreground">
                      ADR-{String(r.number).padStart(3, '0')}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_STYLES[r.status]}`}
                    >
                      {r.status}
                    </span>
                  </div>
                  <div className="text-sm font-medium leading-snug">{r.title}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3 px-1">
              Шаблоны
            </div>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={startNew}
                  className="text-left rounded-lg border border-border bg-card p-3 hover:border-accent/50 hover:-translate-y-0.5 transition-all"
                >
                  <Icon name={t.icon} size={18} className="text-accent mb-2" />
                  <div className="text-xs font-medium leading-tight">{t.name}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                    {t.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Detail / Editor */}
        <section className="min-h-[60vh]">
          {editing ? (
            <Editor draft={draft} setDraft={setDraft} onSave={saveDraft} onCancel={() => setEditing(false)} />
          ) : selected ? (
            <article key={selected.id} className="animate-fade-up">
              <div className="flex items-start justify-between gap-4 mb-8">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="font-mono text-sm text-muted-foreground">
                      ADR-{String(selected.number).padStart(3, '0')}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full border ${STATUS_STYLES[selected.status]}`}
                    >
                      {selected.status}
                    </span>
                  </div>
                  <h1 className="font-display text-3xl md:text-4xl tracking-tight leading-[1.1] max-w-2xl">
                    {selected.title}
                  </h1>
                  <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Icon name="User" size={14} /> {selected.author}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Icon name="Calendar" size={14} /> {selected.date}
                    </span>
                    {selected.tags.map((t) => (
                      <span key={t} className="font-mono text-xs">#{t}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <IconBtn icon="History" label="История" onClick={() => setShowHistory((v) => !v)} active={showHistory} />
                  <IconBtn icon="Download" label="Экспорт" onClick={() => {}} />
                  <button
                    onClick={startEdit}
                    className="flex items-center gap-2 bg-secondary text-secondary-foreground px-3.5 py-2 rounded-lg text-sm font-medium hover:bg-secondary/70 transition-colors"
                  >
                    <Icon name="Pencil" size={15} /> Редактировать
                  </button>
                </div>
              </div>

              {showHistory && (
                <div className="animate-fade-up mb-8 rounded-xl border border-border bg-card p-5">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-4">
                    История версий
                  </div>
                  <ol className="space-y-0">
                    {selected.versions.map((v, i) => (
                      <li key={v.rev} className="flex gap-4 relative pb-5 last:pb-0">
                        <div className="flex flex-col items-center">
                          <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${i === 0 ? 'bg-accent' : 'bg-border'}`} />
                          {i < selected.versions.length - 1 && (
                            <div className="w-px flex-1 bg-border my-1" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-medium">{v.rev}</span>
                            <span className="text-xs text-muted-foreground">{v.date}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {v.note} · {v.author}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <div className="space-y-9 max-w-2xl">
                <Block title="Контекст" icon="Compass" text={selected.context} />
                <Block title="Решение" icon="GitCommit" text={selected.decision} accent />
                <Block title="Последствия" icon="GitBranch" text={selected.consequences} />
              </div>
            </article>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <Icon name="FileText" size={32} className="mb-3 opacity-40" />
              <p className="text-sm">Выберите запись или создайте новую</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

const Block = ({
  title,
  icon,
  text,
  accent,
}: {
  title: string;
  icon: string;
  text: string;
  accent?: boolean;
}) => (
  <div>
    <div className="flex items-center gap-2 mb-3">
      <Icon name={icon} size={16} className={accent ? 'text-accent' : 'text-muted-foreground'} />
      <h2 className="font-display text-lg tracking-tight">{title}</h2>
    </div>
    <p
      className={`text-[15px] leading-relaxed text-foreground/85 ${
        accent ? 'border-l-2 border-accent pl-4' : ''
      }`}
    >
      {text}
    </p>
  </div>
);

const IconBtn = ({
  icon,
  label,
  onClick,
  active,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  active?: boolean;
}) => (
  <button
    onClick={onClick}
    title={label}
    className={`flex items-center justify-center w-9 h-9 rounded-lg border transition-colors ${
      active ? 'border-accent/50 bg-accent/10 text-accent' : 'border-border bg-card hover:bg-secondary'
    }`}
  >
    <Icon name={icon} size={16} />
  </button>
);

const Editor = ({
  draft,
  setDraft,
  onSave,
  onCancel,
}: {
  draft: ADR;
  setDraft: (a: ADR) => void;
  onSave: () => void;
  onCancel: () => void;
}) => {
  const statuses: Status[] = ['Предложено', 'Принято', 'Отклонено', 'Устарело'];
  const field = (k: keyof ADR, v: string) => setDraft({ ...draft, [k]: v });

  return (
    <div className="animate-fade-up max-w-2xl">
      <div className="flex items-center justify-between mb-7">
        <div className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
          <Icon name="Pencil" size={15} />
          {draft.id ? 'Редактирование' : 'Новый ADR'} · ADR-{String(draft.number).padStart(3, '0')}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="px-3.5 py-2 rounded-lg text-sm border border-border hover:bg-secondary transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={onSave}
            disabled={!draft.title.trim()}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-all"
          >
            <Icon name="Check" size={15} /> Сохранить
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <Label>Заголовок решения</Label>
          <input
            value={draft.title}
            onChange={(e) => field('title', e.target.value)}
            placeholder="Например: Внедрение mTLS между сервисами"
            className="w-full bg-transparent border-b border-border focus:border-accent outline-none font-display text-2xl tracking-tight py-2 transition-colors"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setDraft({ ...draft, status: s })}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                draft.status === s ? STATUS_STYLES[s] : 'border-border text-muted-foreground hover:bg-secondary'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <EditBlock label="Контекст" placeholder="Какую проблему решаем? Что происходит сейчас?" value={draft.context} onChange={(v) => field('context', v)} />
        <EditBlock label="Решение" placeholder="Что именно решили сделать и почему?" value={draft.decision} onChange={(v) => field('decision', v)} />
        <EditBlock label="Последствия" placeholder="Какие плюсы, минусы и риски у решения?" value={draft.consequences} onChange={(v) => field('consequences', v)} />
      </div>
    </div>
  );
};

const Label = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">{children}</div>
);

const EditBlock = ({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) => (
  <div>
    <Label>{label}</Label>
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      className="w-full bg-card border border-border rounded-lg p-3.5 text-[15px] leading-relaxed outline-none focus:border-accent transition-colors resize-none"
    />
  </div>
);

export default Index;
