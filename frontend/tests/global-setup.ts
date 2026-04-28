import { chromium, FullConfig } from "@playwright/test";
import { execSync, spawn, ChildProcess } from "child_process";
import path from "path";
import fs from "fs";

const TEST_DB_NAME = "sortr_test_playwright";

async function globalSetup(config: FullConfig) {
  const projectRoot = path.join(__dirname, "../..");
  const backendDir = path.join(projectRoot, "backend");
  const isCI = !!process.env.CI;
  const apiUrl = isCI ? "http://localhost:8000" : "http://localhost:8001";

  console.log("Starting global test setup...");
  console.log(`CI environment: ${isCI}`);

  if (isCI) {
    // CI: GitHub Actions provides MongoDB as a service; spawn uvicorn directly.
    const backendProcess: ChildProcess = spawn(
      "python3",
      ["-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"],
      {
        cwd: backendDir,
        stdio: "pipe",
        env: {
          ...process.env,
          MONGODB_URI: "mongodb://localhost:27017",
          MONGODB_DB: TEST_DB_NAME,
        },
      },
    );

    backendProcess.stdout?.on("data", (data) =>
      console.log(`[Backend] ${data.toString().trim()}`),
    );
    backendProcess.stderr?.on("data", (data) =>
      console.error(`[Backend] ${data.toString().trim()}`),
    );
    (global as any).__BACKEND_PROCESS__ = backendProcess;

    await new Promise((resolve) => setTimeout(resolve, 3000));
  } else {
    // Local: spin up the full test stack via docker-compose.
    console.log("Starting test containers...");
    execSync("docker-compose -f docker-compose.test.yml up -d", {
      cwd: projectRoot,
      stdio: "inherit",
    });

    // Wait for MongoDB to accept connections before cleaning the DB.
    console.log("Waiting for MongoDB to be ready...");
    let mongoReady = false;
    for (let i = 0; i < 30; i++) {
      try {
        execSync(
          `docker exec sortr-mongo-test mongosh --eval "db.adminCommand('ping')"`,
          {
            encoding: "utf-8",
            stdio: "pipe",
          },
        );
        mongoReady = true;
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    if (!mongoReady) {
      execSync("docker-compose -f docker-compose.test.yml down", {
        cwd: projectRoot,
      });
      throw new Error("MongoDB failed to become ready");
    }

    console.log(`Cleaning database: ${TEST_DB_NAME}...`);
    try {
      execSync(
        `docker exec sortr-mongo-test mongosh --eval "db.getSiblingDB('${TEST_DB_NAME}').dropDatabase()"`,
        { encoding: "utf-8" },
      );
      console.log("Database cleaned");
    } catch {
      console.log("Database doesn't exist yet, will be created fresh");
    }
  }

  console.log("Checking backend health...");
  const browser = await chromium.launch();
  const page = await browser.newPage();

  let retries = 60;
  let isReady = false;

  while (retries > 0 && !isReady) {
    try {
      console.log(`   Attempt ${61 - retries}/60...`);
      const response = await page.goto(`${apiUrl}/health`, {
        timeout: 2000,
        waitUntil: "domcontentloaded",
      });

      if (response && response.ok()) {
        const data = await response.json();
        if (data.status === "ok") {
          isReady = true;
          console.log("Backend is ready!");
        }
      } else {
        console.log(`Response status: ${response?.status() || "no response"}`);
      }
    } catch (error: any) {
      console.log(`Error: ${error.message}`);
      retries--;
      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  await browser.close();

  if (!isReady) {
    console.error("Backend failed to start within 60 seconds");
    if (isCI) {
      (global as any).__BACKEND_PROCESS__?.kill();
    } else {
      execSync("docker-compose -f docker-compose.test.yml down", {
        cwd: projectRoot,
      });
    }
    throw new Error("Backend startup timeout");
  }

  const dbInfoPath = path.join(__dirname, ".test-db-info.json");
  fs.writeFileSync(
    dbInfoPath,
    JSON.stringify({
      mongoUri: isCI
        ? "mongodb://localhost:27017"
        : "mongodb://localhost:27019",
      dbName: TEST_DB_NAME,
    }),
  );

  console.log("Test environment ready!");
}

export default globalSetup;
