# Testing Guide

E2E tests with Playwright. Backend starts automatically.

## Prerequisites

- Node.js 20+
- Python 3.11+ with dependencies: `cd backend && pip install -r requirements.txt`
- MongoDB (Docker or local install)

## Quick Start

```bash
cd frontend

# Start MongoDB
npm run test:setup          # (Docker) or run `mongod` locally

# Run tests
npm test                    # Headless
npm run test:headed         # With visible browser
npm run test:ui             # Interactive mode
npm run test:debug          # Step-by-step debugging

# Stop MongoDB
npm run test:teardown       # (Docker only)
```

## What Happens Automatically

- Backend starts on port 8000
- Frontend dev server starts on port 3000
- Tests run
- Backend stops after tests

## Writing Tests

Place tests in `tests/e2e/`:

```typescript
import { test, expect } from '@playwright/test';

test('example test', async ({ page }) => {
  await page.goto('/login');
  await expect(page).toHaveURL('/login');
});
```

## Troubleshooting

- **Backend fails**: Check MongoDB is running, port 8000 is free
- **Tests timeout**: Ensure Python dependencies installed
- **Docker error**: Start Docker Desktop or use local MongoDB
