# AI-baseret Mailhåndteringssystem (SaaS)

Et intelligent, multi-tenant mailhåndteringssystem designet til at automatisere og strukturere virksomheders indgående e-mails ved hjælp af IMAP-integration og AI-baseret klassificering.

---

## 📌 Projektbeskrivelse

Dette projekt omhandler udviklingen af en fullstack SaaS-applikation, der automatisk modtager, analyserer og organiserer indgående e-mails fra flere separate mailkonti (fx support@, info@ og kontakt@).

Systemet:

* Modtager mails via individuelle IMAP-forbindelser
* Anvender UID-tracking for sikker behandling af nye mails
* Parser headers og body
* Håndterer tråde via Message-ID, In-Reply-To og References
* Klassificerer mails via AI (kategori + prioritet)
* Understøtter rollebaseret adgang
* Er designet som en skalerbar multi-tenant løsning

Formålet er at reducere manuel behandling, øge overblikket og forbedre arbejdsgange i virksomheder.

---

## 🏗 Systemarkitektur

Systemet består af følgende hovedkomponenter:

* Backend API (FastAPI)
* IMAP Mail Service (asynkron worker)
* AI-klassificeringsmodul
* MongoDB database
* Frontend Webapplikation (Next.js + Material UI)

Arkitekturen er designet som en SaaS-platform, hvor hver tenant isoleres logisk i databasen.

---

## 🔑 Funktioner

### Mailhåndtering

* Individuelle IMAP-integrationer pr. mailkonto
* UID-tracking
* Parsing af multipart-mails og vedhæftede filer
* Trådhåndtering via mail-headers

### AI

* Automatisk kategorisering
* Automatisk prioritering
* Automatisk fordeling til indbakker

### Brugerfunktioner

* Rollebaseret adgang (Superbruger, Administrator, Medarbejder)
* Trådvisning
* Filtrering og søgning
* Statusændring
* Interne noter
* Besvarelse af mails via SMTP

### Multi-tenant

* Logisk data-isolation
* Separat konfiguration pr. virksomhed
* Individuel IMAP/SMTP-opsætning

---

## 🛠 Teknologier

| Komponent       | Teknologi        |
| --------------- | ---------------- |
| Backend         | Python + FastAPI |
| Database        | MongoDB          |
| Frontend        | Next.js (React)  |
| UI              | Material UI      |
| Mailprotokoller | IMAP + SMTP      |
| Versionsstyring | GitHub           |

---

## 🚀 Lokal opsætning (Udvikling)

### Backend

```bash
python -m venv venv
source venv/bin/activate  # Mac/Linux
venv\\Scripts\\activate     # Windows

pip install -r requirements.txt

uvicorn app.main:app --reload
```

API kører som standard på:

[http://localhost:8000](http://localhost:8000)

---

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend kører som standard på:

[http://localhost:3000](http://localhost:3000)

---

## 🔐 Sikkerhed

* TLS-krypteret kommunikation med IMAP/SMTP
* Rollebaseret adgangskontrol
* Multi-tenant dataseparation
* Validering og sanitering af mailindhold
* Beskyttelse mod uautoriseret API-adgang

---

## 📊 Projektstruktur (Eksempel)

```
backend/
  ├── app/
  │   ├── api/
  │   ├── services/
  │   ├── models/
  │   └── main.py
  └── requirements.txt

frontend/
  ├── pages/
  ├── components/
  ├── services/
  └── package.json
```

---

## 🧪 Test

Playwright E2E tests. Backend starts automatically.

**Prerequisites:** Docker, Python deps (`cd backend && pip install -r requirements.txt`)

```bash
cd frontend
npm run test:setup    # Start MongoDB
npm test              # Run tests
npm run test:teardown # Stop MongoDB
```

**Modes:** `npm test` (headless), `npm run test:headed` (visible), `npm run test:ui` (interactive)

See `frontend/TESTING.md` for details. Tests run on PRs via GitHub Actions.

---

## 📈 Fremtidige udvidelser

* AI-genererede svarforslag
* Statistik og rapportering
* CRM-integration
* Mobiloptimeret UI

---

## 👥 Team

Projektet udvikles af tre udviklere med følgende fokusområder:

* Backend, IMAP, AI og sikkerhed
* Frontend og UX/UI
* Fælles ansvar for arkitektur, dokumentation og test

---

## 🎯 Projektmål

At udvikle en funktionsdygtig MVP, der opfylder alle definerede Must Have-krav og demonstrerer:

* Driftssikker IMAP-integration
* Korrekt trådhåndtering
* AI-baseret klassificering
* Multi-tenant isolation
* Rollebaseret adgang

---

## 📄 Licens

Dette projekt er udviklet som en del af svendeprøve / uddannelsesprojekt.
