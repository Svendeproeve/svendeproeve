import { chromium, FullConfig } from "@playwright/test";
import { execSync, spawn, ChildProcess } from "child_process";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";

let backendProcess: ChildProcess | null = null;

async function globalSetup(config: FullConfig) {
  const apiUrl = process.env.API_URL || "http://localhost:8000";
  const projectRoot = path.join(__dirname, "../..");
  const backendDir = path.join(projectRoot, "backend");
  const isCI = !!process.env.CI;

  const testDbName = `sortr_test_${randomUUID().replace(/-/g, "")}`;
  console.log("Starting global test setup...");
  console.log(`Test database: ${testDbName}`);
  console.log(`CI environment: ${isCI}`);

  if (!isCI) {
    console.log("Ensuring MongoDB test container is running...");

    const dockerComposeCmd = "docker-compose";

    try {
      const result = execSync("docker ps --filter name=sortr-mongodb-test --format {{.Names}}", {
        encoding: "utf-8",
      });

      if (!result.includes("sortr-mongodb-test")) {
        console.log("Starting MongoDB test container...");
        execSync(`${dockerComposeCmd} -f docker-compose.test.yml up -d`, {
          cwd: projectRoot,
          stdio: "inherit",
        });
        await new Promise((resolve) => setTimeout(resolve, 10000));
      } else {
        console.log("MongoDB container already running");
      }
    } catch (error) {
      console.log("Starting MongoDB test container...");
      execSync(`${dockerComposeCmd} -f docker-compose.test.yml up -d`, {
        cwd: projectRoot,
        stdio: "inherit",
      });
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }

    console.log(`Cleaning database: ${testDbName}...`);
    try {
      execSync(`docker exec sortr-mongodb-test mongosh --eval "db.getSiblingDB('${testDbName}').dropDatabase()"`, {
        encoding: "utf-8",
      });
      console.log("Database cleaned");
    } catch (error) {
      console.log("Database doesn't exist yet, will be created fresh");
    }
  } else {
    console.log("Skipping MongoDB container setup in CI (using GitHub Actions service)");
  }

  console.log("Starting backend with test database...");
  const pythonCmd = process.platform === "win32" ? "python" : "python3";
  const mongoUri = isCI ? "mongodb://localhost:27017" : "mongodb://localhost:27018";

  backendProcess = spawn(
    pythonCmd,
    ["-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"],
    {
      cwd: backendDir,
      stdio: "pipe",
      shell: true,
      env: {
        ...process.env,
        MONGODB_URI: mongoUri,
        MONGODB_DB: testDbName,
      },
    },
  );

  backendProcess.on("error", (error) => {
    console.error(`Failed to start backend: ${error.message}`);
  });

  if (backendProcess.stdout) {
    backendProcess.stdout.on("data", (data) => {
      console.log(`[Backend] ${data.toString().trim()}`);
    });
  }

  if (backendProcess.stderr) {
    backendProcess.stderr.on("data", (data) => {
      console.error(`[Backend] ${data.toString().trim()}`);
    });
  }

  await new Promise((resolve) => setTimeout(resolve, 3000));

  console.log("Checking backend health...");
  const browser = await chromium.launch();
  const page = await browser.newPage();

  let retries = 30;
  let isReady = false;

  while (retries > 0 && !isReady) {
    try {
      console.log(`   Attempt ${31 - retries}/30...`);
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
    console.error("Backend failed to start within 30 seconds");
    if (backendProcess) {
      backendProcess.kill();
    }
    if (!isCI) {
      execSync("docker-compose -f docker-compose.test.yml down -v", {
        cwd: projectRoot,
      });
    }
    throw new Error("Backend startup timeout");
  }

  global.__BACKEND_PROCESS__ = backendProcess;

  const dbInfoPath = path.join(__dirname, ".test-db-info.json");
  const mongoUri = isCI ? "mongodb://localhost:27017" : "mongodb://localhost:27018";
  fs.writeFileSync(
    dbInfoPath,
    JSON.stringify({
      mongoUri,
      dbName: testDbName,
    }),
  );

  console.log("Test environment ready!");
}

export default globalSetup;
