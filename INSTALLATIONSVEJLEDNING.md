# Installationsvejledning

## Indholdsfortegnelse

1. [Systemkrav](#systemkrav)
2. [Installation trin for trin](#installation-trin-for-trin)
3. [Opsætning af backend](#opsætning-af-backend)
4. [Opsætning af frontend](#opsætning-af-frontend)
5. [Kørsel af applikationen](#kørsel-af-applikationen)
6. [Test](#test)
7. [Fejlfinding](#fejlfinding)

---

## Systemkrav

Før installation skal følgende software være installeret på din computer:

### Påkrævede programmer

- **Python 3.12+** - [Download her](https://www.python.org/downloads/)
- **Node.js 18+** - [Download her](https://nodejs.org/)
- **Docker Desktop** - [Download her](https://www.docker.com/products/docker-desktop/)
- **Git** - [Download her](https://git-scm.com/downloads)
- **MongoDB Compass** hvis du vil se data i databasen.

### Verificer installationer

Åbn en terminal og kør følgende kommandoer for at verificere:

```bash
python --version   # Skal vise Python 3.12 eller nyere
node --version     # Skal vise v18.0.0 eller nyere
npm --version      # Skal vise npm version
docker --version   # Skal vise Docker version
git --version      # Skal vise Git version
```

---

## Installation trin for trin

### 1. Klon repository

Åbn en terminal og kør:

```bash
git clone https://github.com/Svendeproeve/svendeproeve
cd svendeproeve
```

Hvis du allerede har projektet downloadet, naviger til projektmappen:

```bash
cd svendeproeve
```

---

## Opsætning af backend

### 1. Naviger til backend-mappen

```bash
cd backend
```

### 2. Opret Python virtual environment

**Windows:**

```bash
python -m venv venv
venv\Scripts\activate
```

**Mac/Linux:**

```bash
python -m venv venv
source venv/bin/activate
```

Du skulle nu se `(venv)` i din terminal.

### 3. Installer Python-dependencies

```bash
pip install -r requirements.txt
```

### 4. Konfigurer miljøvariabler

Kopiér eksempel-filen til en ny `.env` fil:

**Windows:**

```bash
copy .env.example .env
```

**Mac/Linux:**

```bash
cp .env.example .env
```

Rediger `.env` filen og tilpas værdierne efter behov:

```env
MONGODB_URI=mongodb://localhost:27018
MONGODB_DB=sortr
JWT_SECRET=change-me-to-a-secure-random-string
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=60
```

**VIGTIGT:** Skift `JWT_SECRET` til en sikker, tilfældig i produktion.

### 5. Start MongoDB via Docker

Kør følgende kommando for at starte MongoDB-databasen:

```bash
docker-compose up -d mongo
```

Dette starter MongoDB på port 27018 (for at undgå konflikter med eventuelle lokale MongoDB-installationer).

Verificer at MongoDB kører:

```bash
docker ps
```

Du skulle se en container ved navn `sortr-mongo` køre.

---

## Opsætning af frontend

### 1. Åbn en ny terminal

Lad backend-terminalen være åben, og åbn en ny terminal.

### 2. Naviger til frontend-mappen

```bash
cd frontend
```

(Hvis du er i backend-mappen: `cd ../frontend`)

### 3. Installer npm-dependencies

```bash
npm install
```

Dette kan tage et par minutter afhængigt af din internetforbindelse.

---

## Kørsel af applikationen

### Metode 1: Docker (Anbefalet)

Dette er den nemmeste metode, da Docker håndterer både backend, database og IMAP-poller. Husk at lav en .env.local med creds.

**Fra backend-mappen:**

```bash
cd backend
docker-compose up --build
```

Dette starter:

- MongoDB database (port 27018)
- Backend API (port 8000)
- IMAP poller service

**Frontend** skal stadig startes separat:

```bash
cd frontend
npm run dev
```

Frontend kører nu på: http://localhost:3000

API dokumentation er tilgængelig på: http://localhost:8000/docs

### Metode 2: Manuel kørsel (Udvikling)

Hvis du ønsker mere kontrol eller debugger, kan du køre services manuelt.

#### Start MongoDB

```bash
cd backend
docker-compose up -d mongo
```

#### Start backend API

Fra backend-mappen med aktiveret virtual environment:

```bash
uvicorn app.main:app --reload
```

Backend kører nu på: http://localhost:8000

#### Start frontend

Fra frontend-mappen:

```bash
npm run dev
```

Frontend kører nu på: http://localhost:3000

---

## Test

Systemet inkluderer end-to-end tests med Playwright.

### Forudsætninger

- Docker skal køre
- Backend dependencies skal være installeret (`pip install -r requirements.txt`)

### Kør tests

**Fra frontend-mappen:**

```bash
# Start test-database og API
npm run test:setup

# Kør tests (headless mode)
npm test

# Stop test-database
npm run test:teardown
```

### Alternative test-modes

```bash
npm run test:headed    # Kør med synlig browser
npm run test:ui        # Interaktiv test UI
npm run test:debug     # Debug mode
```

Se `frontend/TESTING.md` for mere information om tests.

---

## Ekstra konfiguration (valgfrit)

### "Forgot password"

Dette er så systemet kan sende system mails til brugeren.

```env
# Kopiér fra .env.example og tilføj:
SMTP_HOST=mail.playmatesports.com
SMTP_PORT=587
SMTP_USERNAME=no-reply@playmatesports.com
SMTP_PASSWORD=12345678
SMTP_FROM_EMAIL=no-reply@playmatesports.com
SMTP_FROM_NAME=Sortr
```

### OpenAI Integration

For at aktivere AI-kategorisering skal du:

1. Opret en OpenAI API-nøgle på https://platform.openai.com/api-keys
2. Tilføj nøglen til `.env.local`:
   ```env
   OPENAI_API_KEY=sk-...
   OPENAI_AUTOCATEGORIZE=1
   ```

---
