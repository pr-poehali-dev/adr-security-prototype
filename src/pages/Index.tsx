import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '@/components/ui/icon';

const LS_RECORDS = 'sentinel_adr_records';
const LS_DRAFT = 'sentinel_adr_draft';

function loadRecords(): ADR[] {
  try {
    const raw = localStorage.getItem(LS_RECORDS);
    if (raw) return JSON.parse(raw);
  } catch (e) { void e; }
  return SEED;
}

function loadDraft(): ADR | null {
  try {
    const raw = localStorage.getItem(LS_DRAFT);
    if (raw) return JSON.parse(raw);
  } catch (e) { void e; }
  return null;
}

type Status = 'Принято' | 'Предложено' | 'Устарело' | 'Отклонено';
type Tab = 'library' | 'editor';
type SectionKey = 'context' | 'decision' | 'consequences';

interface TextSection {
  id: string;
  type: 'text';
  label: string;
  content: string;
}

interface TableSection {
  id: string;
  type: 'table';
  label: string;
  columns: string[];
  rows: string[][];
}

type CustomSection = TextSection | TableSection;

type AnySection = { kind: 'fixed'; key: SectionKey } | { kind: 'custom'; data: CustomSection };
type AppealType =
  | 'Консультация'
  | 'Консультация с согласованием'
  | 'Выход в прод нового продукта'
  | 'Выход в прод нового функционала'
  | 'Согласование сетевого доступа'
  | 'Другое';

const APPEAL_TYPES: AppealType[] = [
  'Консультация',
  'Консультация с согласованием',
  'Выход в прод нового продукта',
  'Выход в прод нового функционала',
  'Согласование сетевого доступа',
  'Другое',
];

const APPEAL_ICONS: Record<AppealType, string> = {
  'Консультация': 'MessageCircle',
  'Консультация с согласованием': 'MessageCircleCheck',
  'Выход в прод нового продукта': 'Rocket',
  'Выход в прод нового функционала': 'GitMerge',
  'Согласование сетевого доступа': 'Network',
  'Другое': 'CircleDot',
};

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
  appealType: AppealType;
  date: string;
  author: string;
  tags: string[];
  context: string;
  decision: string;
  consequences: string;
  sectionOrder: SectionKey[];
  sectionLayout: AnySection[];
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

const ALL_SECTIONS: SectionKey[] = ['context', 'decision', 'consequences'];

const DEFAULT_LAYOUT: AnySection[] = [
  { kind: 'fixed', key: 'context' },
  { kind: 'fixed', key: 'decision' },
  { kind: 'fixed', key: 'consequences' },
];

function makeLayout(order: SectionKey[]): AnySection[] {
  return order.map((key) => ({ kind: 'fixed', key }));
}

function genId() {
  return `s${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

const SEED: ADR[] = [
  {
    id: 'a1',
    number: 12,
    title: 'Хранение секретов в HashiCorp Vault',
    status: 'Принято',
    appealType: 'Консультация с согласованием',
    date: '2026-05-30',
    author: 'А. Соколова',
    tags: ['secrets', 'infra'],
    context:
      'Секреты приложений хранятся в переменных окружения и .env-файлах. Это создаёт риск утечки при доступе к репозиторию и затрудняет ротацию ключей.',
    decision:
      'Внедрить HashiCorp Vault как централизованное хранилище секретов. Доступ выдаётся по short-lived токенам через AppRole. Ротация ключей — раз в 30 дней.',
    consequences:
      'Снижается риск утечки. Требуется поддержка Vault-кластера и обучение команды. Добавляется зависимость на доступность Vault при старте сервисов.',
    sectionOrder: ['context', 'decision', 'consequences'],
    sectionLayout: DEFAULT_LAYOUT,
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
    appealType: 'Согласование сетевого доступа',
    date: '2026-05-24',
    author: 'Д. Орлов',
    tags: ['network', 'zero-trust'],
    context:
      'Трафик между микросервисами идёт по обычному HTTP внутри кластера. Нет аутентификации сервисов и шифрования трафика east-west.',
    decision:
      'Включить mutual TLS через service mesh (Istio). Сертификаты выдаёт внутренний CA с автоматической ротацией каждые 24 часа.',
    consequences:
      'Шифрование и взаимная аутентификация всех сервисов. Рост накладных расходов на CPU ~5%. Усложняется отладка сетевого трафика.',
    sectionOrder: ['context', 'decision', 'consequences'],
    sectionLayout: DEFAULT_LAYOUT,
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
    appealType: 'Консультация',
    date: '2026-03-11',
    author: 'А. Соколова',
    tags: ['auth', 'api'],
    context:
      'JWT-токены нельзя отозвать до истечения срока. Это создаёт окно компрометации при утечке токена.',
    decision:
      'Перейти на opaque-токены с проверкой через интроспекцию на стороне Auth-сервиса.',
    consequences:
      'Возможность мгновенного отзыва. Дополнительный round-trip на каждый запрос. Решение заменено ADR-014 о гибридной схеме.',
    sectionOrder: ['context', 'decision', 'consequences'],
    sectionLayout: DEFAULT_LAYOUT,
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
  appealType: 'Консультация',
  date: new Date().toISOString().slice(0, 10),
  author: '—',
  tags: [],
  context: '',
  decision: '',
  consequences: '',
  sectionOrder: ['context', 'decision', 'consequences'],
  sectionLayout: DEFAULT_LAYOUT,
  versions: [],
};

const Index = () => {
  const [tab, setTab] = useState<Tab>('library');
  const [records, setRecords] = useState<ADR[]>(() => loadRecords());
  const [selectedId, setSelectedId] = useState<string>(() => loadRecords()[0]?.id ?? '');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ADR>(() => loadDraft() ?? loadRecords()[0] ?? SEED[0]);
  const [showHistory, setShowHistory] = useState(false);
  const [query, setQuery] = useState('');
  const [appealFilter, setAppealFilter] = useState<AppealType | null>(null);

  useEffect(() => {
    localStorage.setItem(LS_RECORDS, JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    if (editing) {
      localStorage.setItem(LS_DRAFT, JSON.stringify(draft));
    }
  }, [draft, editing]);


  const selected = records.find((r) => r.id === selectedId);

  const filtered = useMemo(
    () =>
      records.filter(
        (r) =>
          (r.title.toLowerCase().includes(query.toLowerCase()) ||
            r.tags.some((t) => t.includes(query.toLowerCase()))) &&
          (appealFilter === null || r.appealType === appealFilter),
      ),
    [records, query, appealFilter],
  );

  const openRecord = (r: ADR) => {
    setSelectedId(r.id);
    setEditing(false);
    setShowHistory(false);
    setTab('editor');
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
    setTab('editor');
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
    localStorage.removeItem(LS_DRAFT);
  };

  const TABS = [
    { id: 'library' as Tab, label: 'Библиотека ADR', icon: 'BookOpen' },
    { id: 'editor' as Tab, label: 'Редактор', icon: 'FilePen' },
  ];

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
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-all"
          >
            <Icon name="Plus" size={16} />
            Новый ADR
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-6xl mx-auto px-6 md:px-10 flex gap-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-all ${
                tab === t.id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              <Icon name={t.icon} size={15} />
              {t.label}
              {t.id === 'library' && (
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {records.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 md:px-10 py-10">
        {/* ── Вкладка: Библиотека ── */}
        {tab === 'library' && (
          <div className="animate-fade-up">
            <div className="flex items-center justify-between mb-6">
              <div className="relative">
                <Icon
                  name="Search"
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Поиск по записям…"
                  className="w-72 bg-card border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:border-accent transition-colors"
                />
              </div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {filtered.length} решений
              </div>
            </div>

            {/* Appeal type filter */}
            <div className="flex gap-2 flex-wrap mb-4">
              <button
                onClick={() => setAppealFilter(null)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${
                  appealFilter === null
                    ? 'border-accent/60 bg-accent/10 text-accent'
                    : 'border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                Все типы
              </button>
              {APPEAL_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setAppealFilter(appealFilter === t ? null : t)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${
                    appealFilter === t
                      ? 'border-accent/60 bg-accent/10 text-accent'
                      : 'border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  <Icon name={APPEAL_ICONS[t]} size={12} />
                  {t}
                </button>
              ))}
            </div>

            {/* Table-style list */}
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="grid grid-cols-[1fr_180px_auto_140px_120px_60px_90px] text-[11px] uppercase tracking-[0.18em] text-muted-foreground bg-muted/40 px-5 py-3 border-b border-border">
                <span>Название</span>
                <span>Тип обращения</span>
                <span className="pr-8">Автор</span>
                <span>Теги</span>
                <span>Дата</span>
                <span>Версия</span>
                <span>Статус</span>
              </div>
              {filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Icon name="FileSearch" size={28} className="mb-2 opacity-40" />
                  <p className="text-sm">Ничего не найдено</p>
                </div>
              )}
              {filtered.map((r, i) => (
                <button
                  key={r.id}
                  onClick={() => openRecord(r)}
                  style={{ animationDelay: `${i * 30}ms` }}
                  className="animate-fade-up w-full text-left grid grid-cols-[1fr_180px_auto_140px_120px_60px_90px] items-center px-5 py-4 border-b border-border/60 last:border-0 hover:bg-card/80 transition-colors group"
                >
                  <div>
                    <div className="text-sm font-medium group-hover:text-accent transition-colors leading-snug">
                      {r.title}
                    </div>
                    <div className="font-mono text-[11px] text-muted-foreground mt-0.5">
                      ADR-ARHSEC-{String(r.number).padStart(3, '0')}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Icon name={APPEAL_ICONS[r.appealType]} size={13} className="shrink-0" />
                    <span className="leading-tight">{r.appealType}</span>
                  </div>
                  <div className="text-sm text-muted-foreground pr-8">{r.author}</div>
                  <div className="flex gap-1 flex-wrap">
                    {r.tags.map((t) => (
                      <span key={t} className="font-mono text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground">
                        #{t}
                      </span>
                    ))}
                  </div>
                  <div className="text-sm text-muted-foreground">{r.date}</div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {r.versions.length > 0 ? r.versions[0].rev : '—'}
                  </div>
                  <div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_STYLES[r.status]}`}>
                      {r.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Templates section */}
            <div className="mt-10">
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-4">
                Шаблоны
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={startNew}
                    className="text-left rounded-xl border border-border bg-card p-4 hover:border-accent/50 hover:-translate-y-0.5 transition-all"
                  >
                    <Icon name={t.icon} size={20} className="text-accent mb-3" />
                    <div className="text-sm font-medium leading-tight">{t.name}</div>
                    <div className="text-[11px] text-muted-foreground mt-1 leading-tight">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Вкладка: Редактор ── */}
        {tab === 'editor' && (
          <div className="animate-fade-up grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-10">
            {/* Mini-list */}
            <aside className="space-y-1.5">
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3 px-1">
                Записи
              </div>
              {records.map((r) => (
                <button
                  key={r.id}
                  onClick={() => { setSelectedId(r.id); setEditing(false); setShowHistory(false); }}
                  className={`w-full text-left rounded-lg border p-3 transition-all ${
                    selectedId === r.id && !editing
                      ? 'border-accent/50 bg-card shadow-sm'
                      : 'border-transparent hover:border-border hover:bg-card/60'
                  }`}
                >
                  <div className="font-mono text-[10px] text-muted-foreground mb-1">
                    ADR-ARHSEC-{String(r.number).padStart(3, '0')}
                  </div>
                  <div className="text-xs font-medium leading-snug">{r.title}</div>
                </button>
              ))}
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
                          ADR-ARHSEC-{String(selected.number).padStart(3, '0')}
                        </span>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full border ${STATUS_STYLES[selected.status]}`}>
                          {selected.status}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full border border-border bg-muted text-muted-foreground">
                          <Icon name={APPEAL_ICONS[selected.appealType]} size={12} />
                          {selected.appealType}
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
                    {(selected.sectionLayout ?? makeLayout(selected.sectionOrder ?? ALL_SECTIONS)).map((item) => {
                      if (item.kind === 'fixed') {
                        if (!selected[item.key]?.trim()) return null;
                        const fixedMeta: Record<SectionKey, { title: string; icon: string; accent?: boolean }> = {
                          context: { title: 'Контекст', icon: 'Compass' },
                          decision: { title: 'Решение', icon: 'GitCommit', accent: true },
                          consequences: { title: 'Последствия', icon: 'GitBranch' },
                        };
                        const m = fixedMeta[item.key];
                        return <Block key={item.key} title={m.title} icon={m.icon} text={selected[item.key]} accent={m.accent} />;
                      }
                      const d = item.data;
                      if (d.type === 'text') {
                        if (!d.content?.trim()) return null;
                        return <Block key={d.id} title={d.label} icon="AlignLeft" text={d.content} />;
                      }
                      return (
                        <div key={d.id}>
                          <div className="flex items-center gap-2 mb-3">
                            <Icon name="Table" size={16} className="text-muted-foreground" />
                            <h2 className="font-display text-lg tracking-tight">{d.label}</h2>
                          </div>
                          <div className="overflow-x-auto rounded-lg border border-border">
                            <table className="w-full text-sm">
                              <thead className="bg-muted/40">
                                <tr>
                                  {d.columns.map((col, ci) => (
                                    <th key={ci} className="text-left px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-medium border-b border-border">
                                      {col}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {d.rows.map((row, ri) => (
                                  <tr key={ri} className="border-b border-border/50 last:border-0">
                                    {row.map((cell, ci) => (
                                      <td key={ci} className="px-3 py-2 text-[14px] leading-snug align-top text-foreground/85">
                                        {cell}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-20">
                  <Icon name="FileText" size={32} className="mb-3 opacity-40" />
                  <p className="text-sm">Выберите запись или создайте новую</p>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
};

const Block = ({
  title, icon, text, accent,
}: {
  title: string; icon: string; text: string; accent?: boolean;
}) => (
  <div>
    <div className="flex items-center gap-2 mb-3">
      <Icon name={icon} size={16} className={accent ? 'text-accent' : 'text-muted-foreground'} />
      <h2 className="font-display text-lg tracking-tight">{title}</h2>
    </div>
    <p className={`text-[15px] leading-relaxed text-foreground/85 ${accent ? 'border-l-2 border-accent pl-4' : ''}`}>
      {text}
    </p>
  </div>
);

const IconBtn = ({
  icon, label, onClick, active,
}: {
  icon: string; label: string; onClick: () => void; active?: boolean;
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

const SECTION_META: Record<SectionKey, { label: string; placeholder: string }> = {
  context: { label: 'Контекст', placeholder: 'Какую проблему решаем? Что происходит сейчас?' },
  decision: { label: 'Решение', placeholder: 'Что именно решили сделать и почему?' },
  consequences: { label: 'Последствия', placeholder: 'Какие плюсы, минусы и риски у решения?' },
};

const TableSectionEditor = ({
  data, onChange,
}: {
  data: TableSection;
  onChange: (d: TableSection) => void;
}) => {
  const setCell = (r: number, c: number, v: string) => {
    const rows = data.rows.map((row, ri) => row.map((cell, ci) => ri === r && ci === c ? v : cell));
    onChange({ ...data, rows });
  };
  const setCol = (c: number, v: string) => {
    const columns = data.columns.map((col, ci) => ci === c ? v : col);
    onChange({ ...data, columns });
  };
  const addCol = () => {
    const columns = [...data.columns, `Столбец ${data.columns.length + 1}`];
    const rows = data.rows.map((row) => [...row, '']);
    onChange({ ...data, columns, rows });
  };
  const removeCol = (c: number) => {
    const columns = data.columns.filter((_, ci) => ci !== c);
    const rows = data.rows.map((row) => row.filter((_, ci) => ci !== c));
    onChange({ ...data, columns, rows });
  };
  const addRow = () => {
    const rows = [...data.rows, data.columns.map(() => '')];
    onChange({ ...data, rows });
  };
  const removeRow = (r: number) => {
    const rows = data.rows.filter((_, ri) => ri !== r);
    onChange({ ...data, rows });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            {data.columns.map((col, c) => (
              <th key={c} className="text-left p-0 border-b border-border">
                <div className="flex items-center gap-1 group/col">
                  <input
                    value={col}
                    onChange={(e) => setCol(c, e.target.value)}
                    className="w-full bg-transparent px-2 py-1.5 text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-medium outline-none focus:text-foreground"
                  />
                  {data.columns.length > 1 && (
                    <button
                      onClick={() => removeCol(c)}
                      className="opacity-0 group-hover/col:opacity-100 text-muted-foreground hover:text-destructive transition-all pr-1 shrink-0"
                    >
                      <Icon name="X" size={12} />
                    </button>
                  )}
                </div>
              </th>
            ))}
            <th className="w-8 border-b border-border">
              <button
                onClick={addCol}
                className="w-full flex items-center justify-center py-1.5 text-muted-foreground hover:text-accent transition-colors"
                title="Добавить столбец"
              >
                <Icon name="Plus" size={13} />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, r) => (
            <tr key={r} className="group/row border-b border-border/50 last:border-0">
              {row.map((cell, c) => (
                <td key={c} className="p-0 align-top">
                  <textarea
                    value={cell}
                    onChange={(e) => setCell(r, c, e.target.value)}
                    rows={1}
                    className="w-full bg-transparent px-2 py-2 text-[14px] leading-snug outline-none resize-none focus:bg-accent/5 transition-colors"
                    style={{ minHeight: '36px' }}
                    onInput={(e) => {
                      const t = e.currentTarget;
                      t.style.height = 'auto';
                      t.style.height = `${t.scrollHeight}px`;
                    }}
                  />
                </td>
              ))}
              <td className="w-8 align-middle">
                <button
                  onClick={() => removeRow(r)}
                  className="opacity-0 group-hover/row:opacity-100 flex items-center justify-center w-full h-full text-muted-foreground hover:text-destructive transition-all"
                >
                  <Icon name="X" size={12} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        onClick={addRow}
        className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent transition-colors"
      >
        <Icon name="Plus" size={12} /> Добавить строку
      </button>
    </div>
  );
};

const Editor = ({
  draft, setDraft, onSave, onCancel,
}: {
  draft: ADR; setDraft: (a: ADR) => void; onSave: () => void; onCancel: () => void;
}) => {
  const statuses: Status[] = ['Предложено', 'Принято', 'Отклонено', 'Устарело'];
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const field = (k: keyof ADR, v: string) => setDraft({ ...draftRef.current, [k]: v });

  const [layout, setLayout] = useState<AnySection[]>(
    () => draft.sectionLayout ?? makeLayout(draft.sectionOrder ?? ALL_SECTIONS),
  );
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  const syncLayout = (next: AnySection[]) => {
    setLayout(next);
    const order = next
      .filter((s): s is { kind: 'fixed'; key: SectionKey } => s.kind === 'fixed')
      .map((s) => s.key);
    setDraft({ ...draftRef.current, sectionLayout: next, sectionOrder: order });
  };

  const moveItem = (from: number, to: number) => {
    const next = [...layout];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    syncLayout(next);
  };

  const removeItem = (idx: number) => {
    const item = layout[idx];
    const next = layout.filter((_, i) => i !== idx);
    if (item.kind === 'fixed') {
      const order = next.filter((s): s is { kind: 'fixed'; key: SectionKey } => s.kind === 'fixed').map((s) => s.key);
      setDraft({ ...draftRef.current, sectionLayout: next, sectionOrder: order, [item.key]: '' });
      setLayout(next);
    } else {
      syncLayout(next);
    }
  };

  const updateCustom = (idx: number, data: CustomSection) => {
    const next = layout.map((s, i) => i === idx ? { kind: 'custom' as const, data } : s);
    syncLayout(next);
  };

  const addFixedSection = (key: SectionKey) => {
    syncLayout([...layout, { kind: 'fixed', key }]);
    setAddMenuOpen(false);
  };

  const addCustomSection = (type: 'text' | 'table') => {
    const id = genId();
    const data: CustomSection = type === 'text'
      ? { id, type: 'text', label: 'Новый раздел', content: '' }
      : { id, type: 'table', label: 'Новая таблица', columns: ['Столбец 1', 'Столбец 2'], rows: [['', ''], ['', '']] };
    syncLayout([...layout, { kind: 'custom', data }]);
    setAddMenuOpen(false);
  };

  const hiddenFixed = ALL_SECTIONS.filter(
    (key) => !layout.some((s) => s.kind === 'fixed' && s.key === key),
  );

  return (
    <div className="animate-fade-up max-w-2xl">
      <div className="flex items-center justify-between mb-7">
        <div className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
          <Icon name="Pencil" size={15} />
          {draft.id ? 'Редактирование' : 'Новый ADR'} · ADR-ARHSEC-{String(draft.number).padStart(3, '0')}
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="px-3.5 py-2 rounded-lg text-sm border border-border hover:bg-secondary transition-colors">
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

        <div>
          <Label>Тип обращения</Label>
          <div className="grid grid-cols-2 gap-2">
            {APPEAL_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setDraft({ ...draft, appealType: t })}
                className={`flex items-center gap-2.5 text-left px-3.5 py-2.5 rounded-lg border text-sm transition-all ${
                  draft.appealType === t
                    ? 'border-accent/60 bg-accent/10 text-accent'
                    : 'border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <Icon name={APPEAL_ICONS[t]} size={15} className="shrink-0" />
                <span className="leading-tight">{t}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>Статус</Label>
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
        </div>

        {/* Draggable section layout */}
        <div className="space-y-4">
          {layout.map((item, idx) => {
            const isOver = overIdx === idx && dragIdx !== null && dragIdx !== idx;
            const label = item.kind === 'fixed'
              ? SECTION_META[item.key].label
              : item.data.label;

            return (
              <div
                key={item.kind === 'fixed' ? item.key : item.data.id}
                onDragOver={(e) => { e.preventDefault(); setOverIdx(idx); }}
                onDragLeave={() => setOverIdx(null)}
                onDrop={() => {
                  if (dragIdx !== null && dragIdx !== idx) moveItem(dragIdx, idx);
                  setDragIdx(null);
                  setOverIdx(null);
                }}
                className={`rounded-xl border transition-all ${isOver ? 'border-accent/60 bg-accent/5' : 'border-border bg-card'} ${dragIdx === idx ? 'opacity-40' : ''}`}
              >
                {/* Section header */}
                <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-border/60">
                  <span
                    draggable
                    onDragStart={(e) => { e.stopPropagation(); setDragIdx(idx); }}
                    onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
                    className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Icon name="GripVertical" size={15} />
                  </span>
                  {item.kind === 'fixed' ? (
                    <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground flex-1">{label}</span>
                  ) : (
                    <input
                      value={item.data.label}
                      onChange={(e) => updateCustom(idx, { ...item.data, label: e.target.value })}
                      className="flex-1 bg-transparent text-[11px] uppercase tracking-[0.18em] text-muted-foreground outline-none focus:text-foreground"
                    />
                  )}
                  {item.kind === 'custom' && (
                    <span className="text-[10px] px-2 py-0.5 rounded border border-border text-muted-foreground mr-1">
                      {item.data.type === 'text' ? 'Текст' : 'Таблица'}
                    </span>
                  )}
                  <button onClick={() => removeItem(idx)} title="Удалить раздел" className="text-muted-foreground hover:text-destructive transition-colors">
                    <Icon name="X" size={14} />
                  </button>
                </div>

                {/* Section body */}
                {item.kind === 'fixed' ? (
                  <textarea
                    value={draft[item.key]}
                    onChange={(e) => field(item.key, e.target.value)}
                    placeholder={SECTION_META[item.key].placeholder}
                    rows={3}
                    className="w-full bg-transparent px-4 py-3 text-[15px] leading-relaxed outline-none resize-none"
                  />
                ) : item.data.type === 'text' ? (
                  <textarea
                    value={item.data.content}
                    onChange={(e) => updateCustom(idx, { ...item.data, content: e.target.value })}
                    placeholder="Введите текст…"
                    rows={3}
                    className="w-full bg-transparent px-4 py-3 text-[15px] leading-relaxed outline-none resize-none"
                  />
                ) : (
                  <div className="px-4 py-3">
                    <TableSectionEditor
                      data={item.data}
                      onChange={(d) => updateCustom(idx, d)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add section panel */}
        <div className="relative">
          <div className="flex items-center gap-2 flex-wrap">
            {hiddenFixed.map((key) => (
              <button
                key={key}
                onClick={() => addFixedSection(key)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-dashed border-border text-muted-foreground hover:border-accent hover:text-accent transition-all"
              >
                <Icon name="Plus" size={12} /> {SECTION_META[key].label}
              </button>
            ))}
            <div className="relative">
              <button
                onClick={() => setAddMenuOpen((v) => !v)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-dashed border-border text-muted-foreground hover:border-accent hover:text-accent transition-all"
              >
                <Icon name="Plus" size={12} /> Новый раздел
              </button>
              {addMenuOpen && (
                <div className="absolute top-full mt-1 left-0 z-20 bg-card border border-border rounded-xl shadow-lg overflow-hidden min-w-[180px]">
                  <button
                    onClick={() => addCustomSection('text')}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm hover:bg-secondary transition-colors"
                  >
                    <Icon name="AlignLeft" size={15} /> Текстовый
                  </button>
                  <button
                    onClick={() => addCustomSection('table')}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm hover:bg-secondary transition-colors border-t border-border"
                  >
                    <Icon name="Table" size={15} /> Табличный
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Label = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">{children}</div>
);

const EditBlock = ({
  label, placeholder, value, onChange,
}: {
  label: string; placeholder: string; value: string; onChange: (v: string) => void;
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