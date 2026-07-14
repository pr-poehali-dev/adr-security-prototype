# Sentinel ADR — Руководство по развёртыванию

## Структура проекта

```
├── src/                    # React-фронтенд (Vite + TypeScript)
├── backend/
│   ├── adr-api/
│   │   ├── index.py        # Cloud Function handler (poehali.dev)
│   │   ├── server.py       # Flask-обёртка для локального запуска
│   │   └── requirements.txt
│   └── adr-templates/
│       ├── index.py        # Cloud Function handler — пользовательские шаблоны
│       ├── server.py       # Flask-обёртка для локального запуска
│       └── requirements.txt
├── docker/
│   ├── nginx.conf            # Конфигурация nginx для фронтенда
│   ├── Dockerfile.backend    # Docker-образ backend (ADR API)
│   ├── Dockerfile.templates  # Docker-образ backend (шаблоны)
│   └── init.sql               # Инициализация локальной БД
├── db_migrations/          # SQL-миграции (production)
├── Dockerfile              # Docker-образ фронтенда (multi-stage)
├── docker-compose.yml      # Полный стек: DB + 2×Backend + Frontend
└── .env.example            # Шаблон переменных окружения
```

---

## Локальный запуск (без Docker)

### Требования

- Node.js 20+
- Python 3.11+
- PostgreSQL 14+

### 1. Установка зависимостей

```bash
# Фронтенд
npm install

# Backend
pip install -r backend/adr-api/requirements.txt
pip install -r backend/adr-templates/requirements.txt
```

### 2. Настройка окружения

```bash
cp .env.example .env
```

Отредактируйте `.env`:

```env
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/sentinel_adr
VITE_API_URL=http://localhost:8000
VITE_TEMPLATES_API_URL=http://localhost:8001
DB_SCHEMA=public
```

### 3. Инициализация БД

```bash
psql -U USER -d sentinel_adr -f docker/init.sql
```

### 4. Запуск backend

Нужно запустить оба сервиса — ADR API и API шаблонов — в отдельных терминалах:

```bash
# Терминал 1 — ADR API (порт 8000)
DATABASE_URL=postgresql://... DB_SCHEMA=public PORT=8000 python backend/adr-api/server.py

# Терминал 2 — API шаблонов (порт 8001)
DATABASE_URL=postgresql://... DB_SCHEMA=public PORT=8001 python backend/adr-templates/server.py
```

ADR API будет доступен на `http://localhost:8000`, API шаблонов — на `http://localhost:8001`.

### 5. Запуск фронтенда

```bash
VITE_API_URL=http://localhost:8000 VITE_TEMPLATES_API_URL=http://localhost:8001 npm run dev
```

Фронтенд будет доступен на `http://localhost:5173`.

---

## Запуск в Docker

### Требования

- Docker 24+
- Docker Compose v2

### 1. Настройка окружения

```bash
cp .env.example .env
```

Значения по умолчанию в `.env` подходят для Docker без изменений.

### 2. Сборка и запуск

```bash
docker compose up --build
```

После запуска:

| Сервис             | Адрес                 |
|--------------------|-----------------------|
| Frontend           | http://localhost      |
| Backend (ADR API)  | http://localhost:8000 |
| Backend (шаблоны)  | http://localhost:8001 |
| PostgreSQL         | localhost:5432        |

### 3. Остановка

```bash
docker compose down
```

Данные PostgreSQL сохраняются в Docker volume `pg_data`.  
Для полного сброса включая данные:

```bash
docker compose down -v
```

---

## Переменные окружения

| Переменная          | По умолчанию        | Описание                                          |
|---------------------|---------------------|---------------------------------------------------|
| `POSTGRES_USER`     | `sentinel`          | Пользователь PostgreSQL                           |
| `POSTGRES_PASSWORD` | `sentinel_secret`   | Пароль PostgreSQL                                 |
| `POSTGRES_DB`       | `sentinel_adr`      | Имя базы данных                                   |
| `POSTGRES_PORT`     | `5432`              | Порт PostgreSQL на хосте                          |
| `DATABASE_URL`      | *(из compose)*      | DSN подключения backend к БД                      |
| `DB_SCHEMA`         | `public`            | Схема PostgreSQL (`public` для Docker)            |
| `VITE_API_URL`      | `http://localhost:8000` | URL ADR API (подставляется в Vite при сборке) |
| `VITE_TEMPLATES_API_URL` | `http://localhost:8001` | URL API шаблонов (подставляется в Vite при сборке) |

---

## Production-деплой (poehali.dev)

При деплое на платформу poehali.dev переменные среды задаются автоматически:

- `VITE_API_URL` и `VITE_TEMPLATES_API_URL` не задаются — фронтенд использует URL cloud functions по умолчанию (см. `backend/func2url.json`)
- `DATABASE_URL` берётся из секретов платформы
- `DB_SCHEMA` = `t_p98037960_adr_security_prototy` (задаётся в backend)
- Обе cloud-функции (`adr-api` и `adr-templates`) деплоятся и обновляются независимо