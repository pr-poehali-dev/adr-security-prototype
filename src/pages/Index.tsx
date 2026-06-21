import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/components/ui/icon";

const LS_DRAFT = "sentinel_adr_draft";
const LS_UI = "sentinel_adr_ui";
const API_URL =
  import.meta.env.VITE_API_URL ??
  "https://functions.poehali.dev/d14ff88a-afc1-46b5-b2fd-0719a5ede002";

function loadDraft(): ADR | null {
  try {
    const raw = localStorage.getItem(LS_DRAFT);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    void e;
  }
  return null;
}

type Status = "Принято" | "Предложено" | "Устарело" | "Отклонено";
type Tab = "library" | "editor";
type SectionKey = "context" | "decision" | "consequences";

interface TextSection {
  id: string;
  type: "text";
  label: string;
  content: string;
}

interface TableSection {
  id: string;
  type: "table";
  label: string;
  columns: string[];
  rows: string[][];
}

interface LinkItem {
  id: string;
  title: string;
  url: string;
}

interface LinksSection {
  id: string;
  type: "links";
  label: string;
  links: LinkItem[];
}

type CustomSection = TextSection | TableSection | LinksSection;

type SectionColor =
  | "default"
  | "blue"
  | "green"
  | "amber"
  | "red"
  | "purple"
  | "pink";

type AnySection =
  | { kind: "fixed"; key: SectionKey; color?: SectionColor }
  | { kind: "custom"; data: CustomSection; color?: SectionColor };

const SECTION_COLORS: {
  id: SectionColor;
  label: string;
  border: string;
  bg: string;
  dot: string;
}[] = [
  {
    id: "default",
    label: "Нет",
    border: "border-border",
    bg: "bg-card",
    dot: "bg-muted-foreground",
  },
  {
    id: "blue",
    label: "Синий",
    border: "border-blue-500/40",
    bg: "bg-blue-500/5",
    dot: "bg-blue-500",
  },
  {
    id: "green",
    label: "Зелёный",
    border: "border-green-500/40",
    bg: "bg-green-500/5",
    dot: "bg-green-500",
  },
  {
    id: "amber",
    label: "Жёлтый",
    border: "border-amber-500/40",
    bg: "bg-amber-500/5",
    dot: "bg-amber-500",
  },
  {
    id: "red",
    label: "Красный",
    border: "border-red-500/40",
    bg: "bg-red-500/5",
    dot: "bg-red-500",
  },
  {
    id: "purple",
    label: "Фиолет.",
    border: "border-purple-500/40",
    bg: "bg-purple-500/5",
    dot: "bg-purple-500",
  },
  {
    id: "pink",
    label: "Розовый",
    border: "border-pink-500/40",
    bg: "bg-pink-500/5",
    dot: "bg-pink-500",
  },
];
type AppealType =
  | "Консультация"
  | "Консультация с согласованием"
  | "Выход в прод нового продукта"
  | "Выход в прод нового функционала"
  | "Согласование сетевого доступа"
  | "Другое";

const APPEAL_TYPES: AppealType[] = [
  "Консультация",
  "Консультация с согласованием",
  "Выход в прод нового продукта",
  "Выход в прод нового функционала",
  "Согласование сетевого доступа",
  "Другое",
];

const APPEAL_ICONS: Record<AppealType, string> = {
  Консультация: "MessageCircle",
  "Консультация с согласованием": "MessageCircleCheck",
  "Выход в прод нового продукта": "Rocket",
  "Выход в прод нового функционала": "GitMerge",
  "Согласование сетевого доступа": "Network",
  Другое: "CircleDot",
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
  jiraTicket: string;
  productName: string;
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
  {
    id: "t1",
    name: "Базовый ADR",
    desc: "Контекст · Решение · Последствия",
    icon: "FileText",
  },
  {
    id: "t2",
    name: "Threat Model",
    desc: "Активы · Угрозы · Контрмеры",
    icon: "ShieldAlert",
  },
  {
    id: "t3",
    name: "Access Control",
    desc: "Роли · Права · Политики",
    icon: "KeyRound",
  },
  {
    id: "t4",
    name: "Криптография",
    desc: "Алгоритмы · Ключи · Ротация",
    icon: "Lock",
  },
];

const STATUS_STYLES: Record<Status, string> = {
  Принято: "bg-accent/15 text-accent border-accent/30",
  Предложено: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  Устарело: "bg-muted text-muted-foreground border-border",
  Отклонено: "bg-destructive/10 text-destructive border-destructive/30",
};

const ALL_SECTIONS: SectionKey[] = ["context", "decision", "consequences"];

const DEFAULT_LAYOUT: AnySection[] = [
  { kind: "fixed", key: "context" },
  { kind: "fixed", key: "decision" },
  { kind: "fixed", key: "consequences" },
];

function makeLayout(order: SectionKey[]): AnySection[] {
  return order.map((key) => ({ kind: "fixed", key }));
}

function genId() {
  return `s${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

const SEED: ADR[] = [
  {
    id: "a1",
    number: 12,
    title: "Хранение секретов в HashiCorp Vault",
    status: "Принято",
    appealType: "Консультация с согласованием",
    date: "2026-05-30",
    author: "А. Соколова",
    tags: ["secrets", "infra"],
    context:
      "Секреты приложений хранятся в переменных окружения и .env-файлах. Это создаёт риск утечки при доступе к репозиторию и затрудняет ротацию ключей.",
    decision:
      "Внедрить HashiCorp Vault как централизованное хранилище секретов. Доступ выдаётся по short-lived токенам через AppRole. Ротация ключей — раз в 30 дней.",
    consequences:
      "Снижается риск утечки. Требуется поддержка Vault-кластера и обучение команды. Добавляется зависимость на доступность Vault при старте сервисов.",
    sectionOrder: ["context", "decision", "consequences"],
    sectionLayout: DEFAULT_LAYOUT,
    versions: [
      {
        rev: "v3",
        date: "2026-05-30",
        author: "А. Соколова",
        note: "Статус → Принято, утверждено AppSec",
      },
      {
        rev: "v2",
        date: "2026-05-22",
        author: "Д. Орлов",
        note: "Добавлена политика ротации 30 дней",
      },
      {
        rev: "v1",
        date: "2026-05-18",
        author: "А. Соколова",
        note: "Черновик решения",
      },
    ],
  },
  {
    id: "a2",
    number: 11,
    title: "mTLS между внутренними сервисами",
    status: "Предложено",
    appealType: "Согласование сетевого доступа",
    date: "2026-05-24",
    author: "Д. Орлов",
    tags: ["network", "zero-trust"],
    context:
      "Трафик между микросервисами идёт по обычному HTTP внутри кластера. Нет аутентификации сервисов и шифрования трафика east-west.",
    decision:
      "Включить mutual TLS через service mesh (Istio). Сертификаты выдаёт внутренний CA с автоматической ротацией каждые 24 часа.",
    consequences:
      "Шифрование и взаимная аутентификация всех сервисов. Рост накладных расходов на CPU ~5%. Усложняется отладка сетевого трафика.",
    sectionOrder: ["context", "decision", "consequences"],
    sectionLayout: DEFAULT_LAYOUT,
    versions: [
      {
        rev: "v2",
        date: "2026-05-24",
        author: "Д. Орлов",
        note: "Уточнён выбор Istio",
      },
      {
        rev: "v1",
        date: "2026-05-20",
        author: "Д. Орлов",
        note: "Первичное предложение",
      },
    ],
  },
  {
    id: "a3",
    number: 9,
    title: "Отказ от JWT в пользу opaque-токенов",
    status: "Устарело",
    appealType: "Консультация",
    date: "2026-03-11",
    author: "А. Соколова",
    tags: ["auth", "api"],
    context:
      "JWT-токены нельзя отозвать до истечения срока. Это создаёт окно компрометации при утечке токена.",
    decision:
      "Перейти на opaque-токены с проверкой через интроспекцию на стороне Auth-сервиса.",
    consequences:
      "Возможность мгновенного отзыва. Дополнительный round-trip на каждый запрос. Решение заменено ADR-014 о гибридной схеме.",
    sectionOrder: ["context", "decision", "consequences"],
    sectionLayout: DEFAULT_LAYOUT,
    versions: [
      {
        rev: "v1",
        date: "2026-03-11",
        author: "А. Соколова",
        note: "Принято, позже помечено устаревшим",
      },
    ],
  },
];

const EMPTY_DRAFT: ADR = {
  id: "",
  number: 0,
  title: "",
  status: "Предложено",
  jiraTicket: "",
  productName: "",
  appealType: "Консультация",
  date: new Date().toISOString().slice(0, 10),
  author: "—",
  tags: [],
  context: "",
  decision: "",
  consequences: "",
  sectionOrder: ["context", "decision", "consequences"],
  sectionLayout: DEFAULT_LAYOUT,
  versions: [],
};

function loadUI(): { tab: Tab; selectedId: string; editing: boolean } {
  try {
    const raw = localStorage.getItem(LS_UI);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    void e;
  }
  return { tab: "library", selectedId: "", editing: false };
}

const Index = () => {
  const savedUI = loadUI();
  const [tab, setTab] = useState<Tab>(savedUI.tab);
  const [records, setRecords] = useState<ADR[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string>(savedUI.selectedId);
  const [editing, setEditing] = useState(savedUI.editing);
  const [draft, setDraft] = useState<ADR>(() => loadDraft() ?? SEED[0]);
  const [showHistory, setShowHistory] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [markdownModal, setMarkdownModal] = useState<{ content: string; title: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [query, setQuery] = useState("");
  const [appealFilter, setAppealFilter] = useState<AppealType | null>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      const adrs: ADR[] = data.adrs ?? [];
      setRecords(adrs.length ? adrs : SEED);
      if (!selectedId && adrs.length) setSelectedId(adrs[0].id);
    } catch {
      setRecords(SEED);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    localStorage.setItem(LS_UI, JSON.stringify({ tab, selectedId, editing }));
  }, [tab, selectedId, editing]);

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
    setTab("editor");
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
    setSelectedId("");
    setTab("editor");
  };

  const saveDraft = async () => {
    const today = new Date().toISOString().slice(0, 10);
    let adr: ADR;
    if (draft.id) {
      const rev = `v${draft.versions.length + 1}`;
      adr = {
        ...draft,
        date: today,
        versions: [
          { rev, date: today, author: draft.author, note: "Отредактировано" },
          ...draft.versions,
        ],
      };
    } else {
      const id = `a${Date.now()}`;
      adr = {
        ...draft,
        id,
        date: today,
        versions: [
          { rev: "v1", date: today, author: draft.author, note: "Создано" },
        ],
      };
    }
    const layout: AnySection[] = adr.sectionLayout?.length
      ? adr.sectionLayout
      : makeLayout(adr.sectionOrder);
    const markdown = adrToMarkdown(adr, layout);
    const jira = adrToJiraMarkdown(adr, layout);
    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adr, markdown, jira }),
    });
    setSelectedId(adr.id);
    setEditing(false);
    localStorage.removeItem(LS_DRAFT);
    await fetchRecords();
  };

  const TABS = [
    { id: "library" as Tab, label: "Библиотека ADR", icon: "BookOpen" },
    { id: "editor" as Tab, label: "Редактор", icon: "FilePen" },
  ];

  return (
    <div className="min-h-screen grain bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/70">
        <div className="max-w-6xl mx-auto px-6 md:px-10 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Icon
                name="ShieldCheck"
                size={20}
                className="text-primary-foreground"
              />
            </div>
            <div className="leading-tight">
              <div className="font-display text-xl tracking-tight">
                Sentinel ADR
              </div>
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
                  ? "border-accent text-accent"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <Icon name={t.icon} size={15} />
              {t.label}
              {t.id === "library" && (
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {records.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 md:px-10 py-10">
        {loading && (
          <div className="flex items-center justify-center gap-3 py-24 text-muted-foreground">
            <Icon name="Loader" size={18} className="animate-spin" />
            <span className="text-sm">Загрузка записей…</span>
          </div>
        )}
        {/* ── Вкладка: Библиотека ── */}
        {!loading && tab === "library" && (
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
                    ? "border-accent/60 bg-accent/10 text-accent"
                    : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
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
                      ? "border-accent/60 bg-accent/10 text-accent"
                      : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <Icon name={APPEAL_ICONS[t]} size={12} />
                  {t}
                </button>
              ))}
            </div>

            {/* Table-style list */}
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="grid grid-cols-[1fr_140px_120px_180px_auto_140px_120px_60px_90px] text-[11px] uppercase tracking-[0.18em] text-muted-foreground bg-muted/40 border-b border-border divide-x divide-border">
                <span className="px-4 py-3">Название</span>
                <span className="px-4 py-3">Продукт</span>
                <span className="px-4 py-3">Jira</span>
                <span className="px-4 py-3">Тип обращения</span>
                <span className="px-4 py-3">Автор</span>
                <span className="px-4 py-3">Теги</span>
                <span className="px-4 py-3">Дата</span>
                <span className="px-4 py-3">Версия</span>
                <span className="px-4 py-3">Статус</span>
              </div>
              {filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Icon
                    name="FileSearch"
                    size={28}
                    className="mb-2 opacity-40"
                  />
                  <p className="text-sm">Ничего не найдено</p>
                </div>
              )}
              {filtered.map((r, i) => (
                <button
                  key={r.id}
                  onClick={() => openRecord(r)}
                  style={{ animationDelay: `${i * 30}ms` }}
                  className="animate-fade-up w-full text-left grid grid-cols-[1fr_140px_120px_180px_auto_140px_120px_60px_90px] items-center border-b border-border/60 last:border-0 hover:bg-card/80 transition-colors group divide-x divide-border/40"
                >
                  <div className="px-4 py-4">
                    <div className="text-sm font-medium group-hover:text-accent transition-colors leading-snug">
                      {r.title}
                    </div>
                    <div className="font-mono text-[11px] text-muted-foreground mt-0.5">
                      ADR-ARHSEC-{String(r.number).padStart(3, "0")}
                    </div>
                  </div>
                  <div className="px-4 py-4 text-xs text-muted-foreground truncate">
                    {r.productName || "—"}
                  </div>
                  <div className="px-4 py-4 font-mono text-[11px] text-muted-foreground truncate">
                    {r.jiraTicket || "—"}
                  </div>
                  <div className="px-4 py-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Icon
                      name={APPEAL_ICONS[r.appealType]}
                      size={13}
                      className="shrink-0"
                    />
                    <span className="leading-tight">{r.appealType}</span>
                  </div>
                  <div className="px-4 py-4 text-sm text-muted-foreground">
                    {r.author}
                  </div>
                  <div className="px-4 py-4 flex gap-1 flex-wrap">
                    {r.tags.map((t) => (
                      <span
                        key={t}
                        className="font-mono text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                  <div className="px-4 py-4 text-sm text-muted-foreground">
                    {r.date}
                  </div>
                  <div className="px-4 py-4 font-mono text-xs text-muted-foreground">
                    {r.versions.length > 0 ? r.versions[0].rev : "—"}
                  </div>
                  <div className="px-4 py-4">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_STYLES[r.status]}`}
                    >
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
                    <Icon
                      name={t.icon}
                      size={20}
                      className="text-accent mb-3"
                    />
                    <div className="text-sm font-medium leading-tight">
                      {t.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1 leading-tight">
                      {t.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Вкладка: Редактор ── */}
        {!loading && tab === "editor" && (
          <div className="animate-fade-up grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-10">
            {/* Mini-list */}
            <aside className="space-y-1.5">
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3 px-1">
                Записи
              </div>
              {records.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setSelectedId(r.id);
                    setEditing(false);
                    setShowHistory(false);
                  }}
                  className={`w-full text-left rounded-lg border p-3 transition-all ${
                    selectedId === r.id && !editing
                      ? "border-accent/50 bg-card shadow-sm"
                      : "border-transparent hover:border-border hover:bg-card/60"
                  }`}
                >
                  <div className="font-mono text-[10px] text-muted-foreground mb-1">
                    ADR-ARHSEC-{String(r.number).padStart(3, "0")}
                  </div>
                  <div className="text-xs font-medium leading-snug">
                    {r.title}
                  </div>
                </button>
              ))}
            </aside>

            {/* Detail / Editor */}
            <section className="min-h-[60vh]">
              {editing ? (
                <Editor
                  draft={draft}
                  setDraft={setDraft}
                  onSave={saveDraft}
                  onCancel={() => {
                    setEditing(false);
                    localStorage.removeItem(LS_DRAFT);
                    if (!draft.id) setSelectedId(records[0]?.id ?? "");
                  }}
                />
              ) : selected ? (
                <article key={selected.id} className="animate-fade-up">
                  <div className="flex items-start justify-between gap-4 mb-8">
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="font-mono text-sm text-muted-foreground">
                          ADR-ARHSEC-{String(selected.number).padStart(3, "0")}
                        </span>
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full border ${STATUS_STYLES[selected.status]}`}
                        >
                          {selected.status}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full border border-border bg-muted text-muted-foreground">
                          <Icon
                            name={APPEAL_ICONS[selected.appealType]}
                            size={12}
                          />
                          {selected.appealType}
                        </span>
                        {selected.jiraTicket && (
                          <span className="flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full border border-border bg-muted font-mono text-muted-foreground">
                            <Icon name="Ticket" size={12} />
                            {selected.jiraTicket}
                          </span>
                        )}
                        {selected.productName && (
                          <span className="flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full border border-border bg-muted text-muted-foreground">
                            <Icon name="Box" size={12} />
                            {selected.productName}
                          </span>
                        )}
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
                          <span key={t} className="font-mono text-xs">
                            #{t}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <IconBtn
                        icon="History"
                        label="История"
                        onClick={() => setShowHistory((v) => !v)}
                        active={showHistory}
                      />
                      <div className="relative">
                        <IconBtn
                          icon="Download"
                          label="Экспорт"
                          onClick={() => setExportOpen((v) => !v)}
                          active={exportOpen}
                        />
                        {exportOpen && selected && (
                          <div
                            className="absolute top-full right-0 mt-1 z-30 bg-card border border-border rounded-xl shadow-lg overflow-hidden min-w-[200px]"
                            onMouseLeave={() => setExportOpen(false)}
                          >
                            <button
                              onClick={() => {
                                const layout =
                                  selected.sectionLayout ??
                                  makeLayout(
                                    selected.sectionOrder ?? ALL_SECTIONS,
                                  );
                                const adrId = `ADR-ARHSEC-${String(selected.number).padStart(3, "0")}`;
                                const rev =
                                  selected.versions?.at(-1)?.rev ??
                                  `v${selected.versions?.length ?? 1}`;
                                const slug = selected.title
                                  .replace(/[^a-zA-Zа-яА-Я0-9]+/g, "_")
                                  .replace(/^_+|_+$/g, "")
                                  .slice(0, 40);
                                downloadText(
                                  adrToMarkdown(selected, layout),
                                  `${adrId}_${slug}_${rev}.md`,
                                );
                                setExportOpen(false);
                              }}
                              className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm hover:bg-secondary transition-colors"
                            >
                              <Icon name="FileText" size={15} /> Markdown (.md)
                            </button>
                            <button
                              onClick={() => {
                                const layout =
                                  selected.sectionLayout ??
                                  makeLayout(
                                    selected.sectionOrder ?? ALL_SECTIONS,
                                  );
                                const adrId = `ADR-ARHSEC-${String(selected.number).padStart(3, "0")}`;
                                const rev =
                                  selected.versions?.at(-1)?.rev ??
                                  `v${selected.versions?.length ?? 1}`;
                                const slug = selected.title
                                  .replace(/[^a-zA-Zа-яА-Я0-9]+/g, "_")
                                  .replace(/^_+|_+$/g, "")
                                  .slice(0, 40);
                                downloadText(
                                  adrToJiraMarkdown(selected, layout),
                                  `${adrId}_${slug}_${rev}-jira.txt`,
                                );
                                setExportOpen(false);
                              }}
                              className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm hover:bg-secondary transition-colors border-t border-border"
                            >
                              <Icon name="GitBranch" size={15} /> Jira Markdown
                              (.txt)
                            </button>
                            <div className="border-t border-border my-1" />
                            <button
                              onClick={() => {
                                const layout = selected.sectionLayout ?? makeLayout(selected.sectionOrder ?? ALL_SECTIONS);
                                setMarkdownModal({ content: adrToMarkdown(selected, layout), title: 'Markdown' });
                                setExportOpen(false);
                              }}
                              className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm hover:bg-secondary transition-colors"
                            >
                              <Icon name="Eye" size={15} /> Просмотр Markdown
                            </button>
                            <button
                              onClick={() => {
                                const layout = selected.sectionLayout ?? makeLayout(selected.sectionOrder ?? ALL_SECTIONS);
                                setMarkdownModal({ content: adrToJiraMarkdown(selected, layout), title: 'Jira Markdown' });
                                setExportOpen(false);
                              }}
                              className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm hover:bg-secondary transition-colors border-t border-border"
                            >
                              <Icon name="Eye" size={15} /> Просмотр Jira Markdown
                            </button>
                          </div>
                        )}
                      </div>
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
                          <li
                            key={v.rev}
                            className="flex gap-4 relative pb-5 last:pb-0"
                          >
                            <div className="flex flex-col items-center">
                              <div
                                className={`w-2.5 h-2.5 rounded-full mt-1.5 ${i === 0 ? "bg-accent" : "bg-border"}`}
                              />
                              {i < selected.versions.length - 1 && (
                                <div className="w-px flex-1 bg-border my-1" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm font-medium">
                                  {v.rev}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {v.date}
                                </span>
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
                    {(
                      selected.sectionLayout ??
                      makeLayout(selected.sectionOrder ?? ALL_SECTIONS)
                    ).map((item) => {
                      const colorMeta =
                        SECTION_COLORS.find(
                          (c) => c.id === (item.color ?? "default"),
                        ) ?? SECTION_COLORS[0];
                      const colorClass =
                        item.color && item.color !== "default"
                          ? `rounded-xl border p-5 ${colorMeta.border} ${colorMeta.bg}`
                          : "";

                      if (item.kind === "fixed") {
                        if (!selected[item.key]?.trim()) return null;
                        const fixedMeta: Record<
                          SectionKey,
                          { title: string; icon: string; accent?: boolean }
                        > = {
                          context: { title: "Контекст", icon: "Compass" },
                          decision: {
                            title: "Решение",
                            icon: "GitCommit",
                            accent: true,
                          },
                          consequences: {
                            title: "Последствия",
                            icon: "GitBranch",
                          },
                        };
                        const m = fixedMeta[item.key];
                        return (
                          <div key={item.key} className={colorClass}>
                            <Block
                              title={m.title}
                              icon={m.icon}
                              text={selected[item.key]}
                              accent={m.accent}
                            />
                          </div>
                        );
                      }
                      const d = item.data;
                      if (d.type === "text") {
                        if (!d.content?.trim()) return null;
                        return (
                          <div key={d.id} className={colorClass}>
                            <Block
                              title={d.label}
                              icon="AlignLeft"
                              text={d.content}
                            />
                          </div>
                        );
                      }
                      if (d.type === "links") {
                        if (!d.links.length) return null;
                        return (
                          <div key={d.id} className={colorClass}>
                            <div className="flex items-center gap-2 mb-3">
                              <Icon
                                name="Link"
                                size={16}
                                className="text-muted-foreground"
                              />
                              <h2 className="font-display text-lg tracking-tight">
                                {d.label}
                              </h2>
                            </div>
                            <div className="flex flex-col gap-2">
                              {d.links
                                .filter((l) => l.url)
                                .map((link) => (
                                  <a
                                    key={link.id}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2.5 text-[14px] text-accent hover:underline group"
                                  >
                                    <Icon
                                      name="ExternalLink"
                                      size={14}
                                      className="shrink-0 text-muted-foreground group-hover:text-accent transition-colors"
                                    />
                                    <span>{link.title || link.url}</span>
                                  </a>
                                ))}
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div key={d.id} className={colorClass}>
                          <div className="flex items-center gap-2 mb-3">
                            <Icon
                              name="Table"
                              size={16}
                              className="text-muted-foreground"
                            />
                            <h2 className="font-display text-lg tracking-tight">
                              {d.label}
                            </h2>
                          </div>
                          <div className="overflow-x-auto rounded-lg border border-border">
                            <table className="w-full text-sm">
                              <thead className="bg-muted/40">
                                <tr>
                                  {d.columns.map((col, ci) => (
                                    <th
                                      key={ci}
                                      className="text-left px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-medium border-b border-border"
                                    >
                                      {col}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {d.rows.map((row, ri) => (
                                  <tr
                                    key={ri}
                                    className="border-b border-border/50 last:border-0"
                                  >
                                    {row.map((cell, ci) => (
                                      <td
                                        key={ci}
                                        className="px-3 py-2 text-[14px] leading-snug align-top text-foreground/85"
                                      >
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

      {/* ── Модал просмотра Markdown ── */}
      {markdownModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => { setMarkdownModal(null); setCopied(false); }}
        >
          <div
            className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Icon name="FileCode" size={16} className="text-accent" />
                {markdownModal.title}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(markdownModal.content);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors"
                >
                  <Icon name={copied ? 'Check' : 'Copy'} size={13} />
                  {copied ? 'Скопировано!' : 'Копировать'}
                </button>
                <button
                  onClick={() => { setMarkdownModal(null); setCopied(false); }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
                >
                  <Icon name="X" size={15} />
                </button>
              </div>
            </div>
            {/* Content */}
            <pre className="overflow-auto p-5 text-[12px] leading-relaxed font-mono text-foreground/80 whitespace-pre-wrap break-words">
              {markdownModal.content}
            </pre>
          </div>
        </div>
      )}
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
      <Icon
        name={icon}
        size={16}
        className={accent ? "text-accent" : "text-muted-foreground"}
      />
      <h2 className="font-display text-lg tracking-tight">{title}</h2>
    </div>
    <p
      className={`text-[15px] leading-relaxed text-foreground/85 ${accent ? "border-l-2 border-accent pl-4" : ""}`}
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
      active
        ? "border-accent/50 bg-accent/10 text-accent"
        : "border-border bg-card hover:bg-secondary"
    }`}
  >
    <Icon name={icon} size={16} />
  </button>
);

const SECTION_META: Record<SectionKey, { label: string; placeholder: string }> =
  {
    context: {
      label: "Контекст",
      placeholder: "Какую проблему решаем? Что происходит сейчас?",
    },
    decision: {
      label: "Решение",
      placeholder: "Что именно решили сделать и почему?",
    },
    consequences: {
      label: "Последствия",
      placeholder: "Какие плюсы, минусы и риски у решения?",
    },
  };

const FIXED_SECTION_LABELS: Record<SectionKey, string> = {
  context: "Контекст",
  decision: "Решение",
  consequences: "Последствия",
};

const COLOR_HEX: Record<SectionColor, string> = {
  default: "",
  blue: "#3B82F6",
  green: "#22C55E",
  amber: "#F59E0B",
  red: "#EF4444",
  purple: "#A855F7",
  pink: "#EC4899",
};

const JIRA_COLOR_PANEL: Record<SectionColor, string> = {
  default: "",
  blue: "#3B82F6",
  green: "#22C55E",
  amber: "#F59E0B",
  red: "#EF4444",
  purple: "#A855F7",
  pink: "#EC4899",
};

function adrToMarkdown(adr: ADR, layout: AnySection[]): string {
  const id = `ADR-ARHSEC-${String(adr.number).padStart(3, "0")}`;
  const meta: string[] = [];
  meta.push(`# ${id} — ${adr.title}\n`);
  meta.push(`| Поле | Значение |`);
  meta.push(`|------|----------|`);
  meta.push(`| Статус | **${adr.status}** |`);
  meta.push(`| Тип обращения | ${adr.appealType} |`);
  if (adr.jiraTicket) meta.push(`| Jira | \`${adr.jiraTicket}\` |`);
  if (adr.productName) meta.push(`| Продукт | ${adr.productName} |`);
  meta.push(`| Автор | ${adr.author} |`);
  meta.push(`| Дата | ${adr.date} |`);
  if (adr.tags.length)
    meta.push(`| Теги | ${adr.tags.map((t) => `\`#${t}\``).join(", ")} |`);
  meta.push("");

  const wrapMdColor = (hex: string, text: string) =>
    hex ? `<span style="color:${hex}">${text}</span>` : text;

  const sections: string[] = [];
  for (const item of layout) {
    const color: SectionColor = item.color ?? "default";
    const hex = COLOR_HEX[color];

    if (item.kind === "fixed") {
      const text = adr[item.key]?.trim();
      if (!text) continue;
      const label = FIXED_SECTION_LABELS[item.key];
      sections.push(`## ${label}\n`);
      sections.push(hex ? wrapMdColor(hex, text) : text);
      sections.push("");
    } else {
      const d = item.data;
      if (d.type === "text") {
        if (!d.content?.trim()) continue;
        sections.push(`## ${d.label}\n`);
        sections.push(
          hex ? wrapMdColor(hex, d.content.trim()) : d.content.trim(),
        );
        sections.push("");
      } else if (d.type === "table") {
        sections.push(`## ${d.label}\n`);
        if (hex) sections.push(`<!-- color:${hex} -->`);
        sections.push(`| ${d.columns.join(" | ")} |`);
        sections.push(`| ${d.columns.map(() => "---").join(" | ")} |`);
        for (const row of d.rows) {
          sections.push(`| ${row.map((c) => c || " ").join(" | ")} |`);
        }
        sections.push("");
      } else if (d.type === "links") {
        if (!d.links.length) continue;
        sections.push(`## ${d.label}\n`);
        if (hex) sections.push(`<!-- color:${hex} -->`);
        for (const link of d.links.filter((l) => l.url)) {
          sections.push(`- [${link.title || link.url}](${link.url})`);
        }
        sections.push("");
      }
    }
  }

  return [...meta, ...sections].join("\n");
}

function adrToJiraMarkdown(adr: ADR, layout: AnySection[]): string {
  const id = `ADR-ARHSEC-${String(adr.number).padStart(3, "0")}`;
  const lines: string[] = [];
  lines.push(`h1. ${id} — ${adr.title}\n`);

  lines.push("|| Поле || Значение ||");
  lines.push(`| Статус | *${adr.status}* |`);
  lines.push(`| Тип обращения | ${adr.appealType} |`);
  if (adr.jiraTicket) lines.push(`| Jira | {{${adr.jiraTicket}}} |`);
  if (adr.productName) lines.push(`| Продукт | ${adr.productName} |`);
  lines.push(`| Автор | ${adr.author} |`);
  lines.push(`| Дата | ${adr.date} |`);
  if (adr.tags.length)
    lines.push(`| Теги | ${adr.tags.map((t) => `#${t}`).join(", ")} |`);
  lines.push("");

  for (const item of layout) {
    const color: SectionColor = item.color ?? "default";
    const panelColor = JIRA_COLOR_PANEL[color];

    const wrapPanel = (label: string, content: string, type: string) => {
      if (type === "true") {
        if (panelColor) {
          return `{panel:title=${label}|borderColor=${panelColor}|titleBGColor=${panelColor}|bgColor=white}\n{color:${panelColor}}${content}{color}\n{panel}`;
        }
        return `h2. ${label}\n\n${content}`;
      } else if (type === "false") {
        if (panelColor) {
          return `{panel:title=${label}|borderColor=${panelColor}|titleBGColor=${panelColor}|bgColor=white}\n${content}\n{panel}`;
        }
        return `h2. ${label}\n\n${content}`;
      }
    };

    if (item.kind === "fixed") {
      const text = adr[item.key]?.trim();
      if (!text) continue;
      lines.push(wrapPanel(FIXED_SECTION_LABELS[item.key], text, "true"));
      lines.push("");
    } else {
      const d = item.data;
      if (d.type === "text") {
        if (!d.content?.trim()) continue;
        lines.push(wrapPanel(d.label, d.content.trim(), "true"));
        lines.push("");
      } else if (d.type === "table") {
        const tableLines: string[] = [];
        tableLines.push(`|| ${d.columns.join(" || ")} ||`);
        for (const row of d.rows) {
          tableLines.push(`| ${row.map((c) => c || " ").join(" | ")} |`);
        }
        lines.push(wrapPanel(d.label, tableLines.join("\n"), "false"));
        lines.push("");
      } else if (d.type === "links") {
        if (!d.links.length) continue;
        const linkLines = d.links
          .filter((l) => l.url)
          .map((l) => `* [${l.title || l.url}|${l.url}]`);
        lines.push(wrapPanel(d.label, linkLines.join("\n"), "true"));
        lines.push("");
      }
    }
  }

  return lines.join("\n");
}

function downloadText(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const LinksSectionEditor = ({
  data,
  onChange,
}: {
  data: LinksSection;
  onChange: (d: LinksSection) => void;
}) => {
  const setLink = (id: string, field: "title" | "url", value: string) => {
    onChange({
      ...data,
      links: data.links.map((l) =>
        l.id === id ? { ...l, [field]: value } : l,
      ),
    });
  };
  const addLink = () => {
    onChange({
      ...data,
      links: [...data.links, { id: genId(), title: "", url: "" }],
    });
  };
  const removeLink = (id: string) => {
    onChange({ ...data, links: data.links.filter((l) => l.id !== id) });
  };

  return (
    <div className="space-y-2">
      {data.links.map((link) => (
        <div key={link.id} className="flex items-center gap-2 group/link">
          <div className="flex-1 grid grid-cols-2 gap-2">
            <input
              value={link.title}
              onChange={(e) => setLink(link.id, "title", e.target.value)}
              placeholder="Название"
              className="w-full bg-transparent border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-accent transition-colors"
            />
            <input
              value={link.url}
              onChange={(e) => setLink(link.id, "url", e.target.value)}
              placeholder="https://…"
              className="w-full bg-transparent border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-accent transition-colors font-mono"
            />
          </div>
          <button
            onClick={() => removeLink(link.id)}
            className="opacity-0 group-hover/link:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0"
          >
            <Icon name="X" size={14} />
          </button>
        </div>
      ))}
      <button
        onClick={addLink}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent transition-colors mt-1"
      >
        <Icon name="Plus" size={12} /> Добавить ссылку
      </button>
    </div>
  );
};

const TableSectionEditor = ({
  data,
  onChange,
}: {
  data: TableSection;
  onChange: (d: TableSection) => void;
}) => {
  const setCell = (r: number, c: number, v: string) => {
    const rows = data.rows.map((row, ri) =>
      row.map((cell, ci) => (ri === r && ci === c ? v : cell)),
    );
    onChange({ ...data, rows });
  };
  const setCol = (c: number, v: string) => {
    const columns = data.columns.map((col, ci) => (ci === c ? v : col));
    onChange({ ...data, columns });
  };
  const addCol = () => {
    const columns = [...data.columns, `Столбец ${data.columns.length + 1}`];
    const rows = data.rows.map((row) => [...row, ""]);
    onChange({ ...data, columns, rows });
  };
  const removeCol = (c: number) => {
    const columns = data.columns.filter((_, ci) => ci !== c);
    const rows = data.rows.map((row) => row.filter((_, ci) => ci !== c));
    onChange({ ...data, columns, rows });
  };
  const addRow = () => {
    const rows = [...data.rows, data.columns.map(() => "")];
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
            <tr
              key={r}
              className="group/row border-b border-border/50 last:border-0"
            >
              {row.map((cell, c) => (
                <td key={c} className="p-0 align-top">
                  <textarea
                    value={cell}
                    onChange={(e) => setCell(r, c, e.target.value)}
                    rows={1}
                    className="w-full bg-transparent px-2 py-2 text-[14px] leading-snug outline-none resize-none focus:bg-accent/5 transition-colors"
                    style={{ minHeight: "36px" }}
                    onInput={(e) => {
                      const t = e.currentTarget;
                      t.style.height = "auto";
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
  const statuses: Status[] = ["Предложено", "Принято", "Отклонено", "Устарело"];
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const field = (k: keyof ADR, v: string) =>
    setDraft({ ...draftRef.current, [k]: v });

  const [layout, setLayout] = useState<AnySection[]>(
    () => draft.sectionLayout ?? makeLayout(draft.sectionOrder ?? ALL_SECTIONS),
  );
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [colorPickerIdx, setColorPickerIdx] = useState<number | null>(null);

  const syncLayout = (next: AnySection[]) => {
    setLayout(next);
    const order = next
      .filter(
        (s): s is { kind: "fixed"; key: SectionKey } => s.kind === "fixed",
      )
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
    if (item.kind === "fixed") {
      const order = next
        .filter(
          (s): s is { kind: "fixed"; key: SectionKey } => s.kind === "fixed",
        )
        .map((s) => s.key);
      setDraft({
        ...draftRef.current,
        sectionLayout: next,
        sectionOrder: order,
        [item.key]: "",
      });
      setLayout(next);
    } else {
      syncLayout(next);
    }
  };

  const updateCustom = (idx: number, data: CustomSection) => {
    const next = layout.map((s, i) =>
      i === idx ? { kind: "custom" as const, data, color: s.color } : s,
    );
    syncLayout(next);
  };

  const setItemColor = (idx: number, color: SectionColor) => {
    const next = layout.map((s, i) => (i === idx ? { ...s, color } : s));
    syncLayout(next);
    setColorPickerIdx(null);
  };

  const addFixedSection = (key: SectionKey) => {
    syncLayout([...layout, { kind: "fixed", key }]);
    setAddMenuOpen(false);
  };

  const addCustomSection = (type: "text" | "table" | "links") => {
    const id = genId();
    const data: CustomSection =
      type === "text"
        ? { id, type: "text", label: "Новый раздел", content: "" }
        : type === "table"
          ? {
              id,
              type: "table",
              label: "Новая таблица",
              columns: ["Столбец 1", "Столбец 2"],
              rows: [
                ["", ""],
                ["", ""],
              ],
            }
          : {
              id,
              type: "links",
              label: "Ссылки",
              links: [{ id: genId(), title: "", url: "" }],
            };
    syncLayout([...layout, { kind: "custom", data }]);
    setAddMenuOpen(false);
  };

  const hiddenFixed = ALL_SECTIONS.filter(
    (key) => !layout.some((s) => s.kind === "fixed" && s.key === key),
  );

  return (
    <div className="animate-fade-up max-w-2xl">
      <div className="flex items-center justify-between mb-7">
        <div className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
          <Icon name="Pencil" size={15} />
          {draft.id ? "Редактирование" : "Новый ADR"} · ADR-ARHSEC-
          {String(draft.number).padStart(3, "0")}
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
            onChange={(e) => field("title", e.target.value)}
            placeholder="Например: Внедрение mTLS между сервисами"
            className="w-full bg-transparent border-b border-border focus:border-accent outline-none font-display text-2xl tracking-tight py-2 transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Jira-заявка</Label>
            <input
              value={draft.jiraTicket}
              onChange={(e) => field("jiraTicket", e.target.value)}
              placeholder="ARCH-1234"
              className="w-full bg-transparent border border-border rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-accent transition-colors"
            />
          </div>
          <div>
            <Label>Продукт</Label>
            <input
              value={draft.productName}
              onChange={(e) => field("productName", e.target.value)}
              placeholder="Название продукта"
              className="w-full bg-transparent border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent transition-colors"
            />
          </div>
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
                    ? "border-accent/60 bg-accent/10 text-accent"
                    : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
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
                  draft.status === s
                    ? STATUS_STYLES[s]
                    : "border-border text-muted-foreground hover:bg-secondary"
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
            const isOver =
              overIdx === idx && dragIdx !== null && dragIdx !== idx;
            const label =
              item.kind === "fixed"
                ? SECTION_META[item.key].label
                : item.data.label;

            const itemColor = item.color ?? "default";
            const colorMeta =
              SECTION_COLORS.find((c) => c.id === itemColor) ??
              SECTION_COLORS[0];

            return (
              <div
                key={item.kind === "fixed" ? item.key : item.data.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverIdx(idx);
                }}
                onDragLeave={() => setOverIdx(null)}
                onDrop={() => {
                  if (dragIdx !== null && dragIdx !== idx)
                    moveItem(dragIdx, idx);
                  setDragIdx(null);
                  setOverIdx(null);
                }}
                className={`rounded-xl border transition-all ${isOver ? "border-accent/60 bg-accent/5" : `${colorMeta.border} ${colorMeta.bg}`} ${dragIdx === idx ? "opacity-40" : ""}`}
              >
                {/* Section header */}
                <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-border/60">
                  <span
                    draggable
                    onDragStart={(e) => {
                      e.stopPropagation();
                      setDragIdx(idx);
                    }}
                    onDragEnd={() => {
                      setDragIdx(null);
                      setOverIdx(null);
                    }}
                    className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Icon name="GripVertical" size={15} />
                  </span>
                  {item.kind === "fixed" ? (
                    <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground flex-1">
                      {label}
                    </span>
                  ) : (
                    <input
                      value={item.data.label}
                      onChange={(e) =>
                        updateCustom(idx, {
                          ...item.data,
                          label: e.target.value,
                        })
                      }
                      className="flex-1 bg-transparent text-[11px] uppercase tracking-[0.18em] text-muted-foreground outline-none focus:text-foreground"
                    />
                  )}
                  {item.kind === "custom" && (
                    <span className="text-[10px] px-2 py-0.5 rounded border border-border text-muted-foreground">
                      {item.data.type === "text"
                        ? "Текст"
                        : item.data.type === "table"
                          ? "Таблица"
                          : "Ссылки"}
                    </span>
                  )}
                  {/* Color picker */}
                  <div className="relative">
                    <button
                      onClick={() =>
                        setColorPickerIdx(colorPickerIdx === idx ? null : idx)
                      }
                      title="Цвет раздела"
                      className="flex items-center justify-center w-5 h-5 rounded-full transition-opacity hover:opacity-70"
                    >
                      <span
                        className={`w-3 h-3 rounded-full ${colorMeta.dot}`}
                      />
                    </button>
                    {colorPickerIdx === idx && (
                      <div className="absolute top-full right-0 mt-1 z-30 bg-card border border-border rounded-xl shadow-lg p-2 flex gap-1.5">
                        {SECTION_COLORS.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => setItemColor(idx, c.id)}
                            title={c.label}
                            className={`w-5 h-5 rounded-full ${c.dot} transition-transform hover:scale-110 ${itemColor === c.id ? "ring-2 ring-offset-1 ring-foreground/30" : ""}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => removeItem(idx)}
                    title="Удалить раздел"
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Icon name="X" size={14} />
                  </button>
                </div>

                {/* Section body */}
                {item.kind === "fixed" ? (
                  <textarea
                    value={draft[item.key]}
                    onChange={(e) => field(item.key, e.target.value)}
                    placeholder={SECTION_META[item.key].placeholder}
                    rows={3}
                    className="w-full bg-transparent px-4 py-3 text-[15px] leading-relaxed outline-none resize-none"
                  />
                ) : item.data.type === "text" ? (
                  <textarea
                    value={item.data.content}
                    onChange={(e) =>
                      updateCustom(idx, {
                        ...item.data,
                        content: e.target.value,
                      })
                    }
                    placeholder="Введите текст…"
                    rows={3}
                    className="w-full bg-transparent px-4 py-3 text-[15px] leading-relaxed outline-none resize-none"
                  />
                ) : item.data.type === "table" ? (
                  <div className="px-4 py-3">
                    <TableSectionEditor
                      data={item.data}
                      onChange={(d) => updateCustom(idx, d)}
                    />
                  </div>
                ) : (
                  <div className="px-4 py-3">
                    <LinksSectionEditor
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
                    onClick={() => addCustomSection("text")}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm hover:bg-secondary transition-colors"
                  >
                    <Icon name="AlignLeft" size={15} /> Текстовый
                  </button>
                  <button
                    onClick={() => addCustomSection("table")}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm hover:bg-secondary transition-colors border-t border-border"
                  >
                    <Icon name="Table" size={15} /> Табличный
                  </button>
                  <button
                    onClick={() => addCustomSection("links")}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm hover:bg-secondary transition-colors border-t border-border"
                  >
                    <Icon name="Link" size={15} /> Ссылки
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
  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
    {children}
  </div>
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