# Sentinel ADR — Руководство по развёртыванию

## Структура проекта

```
├── src/                    # React-фронтенд (Vite + TypeScript)
├── backend/
│   └── adr-api/
│       ├── index.py        # Cloud Function handler (poehali.dev)
│       ├── server.py       # Flask-обёртка для локального запуска
│       └── requirements.txt
├── docker/
│   ├── nginx.conf          # Конфигурация nginx для фронтенда
│   ├── Dockerfile.backend  # Docker-образ backend
│   └── init.sql            # Инициализация локальной БД
├── db_migrations/          # SQL-миграции (production)
├── Dockerfile              # Docker-образ фронтенда (multi-stage)
├── docker-compose.yml      # Полный стек: DB + Backend + Frontend
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
```

### 2. Настройка окружения

```bash
cp .env.example .env
```

Отредактируйте `.env`:

```env
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/sentinel_adr
VITE_API_URL=http://localhost:8000
DB_SCHEMA=public
```

### 3. Инициализация БД

```bash
psql -U USER -d sentinel_adr -f docker/init.sql
```

### 4. Запуск backend

```bash
DATABASE_URL=postgresql://... DB_SCHEMA=public python backend/adr-api/server.py
```

Backend будет доступен на `http://localhost:8000`.

### 5. Запуск фронтенда

```bash
VITE_API_URL=http://localhost:8000 npm run dev
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

| Сервис     | Адрес                 |
|------------|-----------------------|
| Frontend   | http://localhost      |
| Backend    | http://localhost:8000 |
| PostgreSQL | localhost:5432        |

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
| `VITE_API_URL`      | `http://localhost:8000` | URL backend (подставляется в Vite при сборке) |

---

## Production-деплой (poehali.dev)

При деплое на платформу poehali.dev переменные среды задаются автоматически:

- `VITE_API_URL` не задаётся — фронтенд использует URL cloud function по умолчанию
- `DATABASE_URL` берётся из секретов платформы
- `DB_SCHEMA` = `t_p98037960_adr_security_prototy` (задаётся в backend)
