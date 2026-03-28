import { chromium, FullConfig } from "@playwright/test";
import { spawn, ChildProcess } from "child_process";
import path from "path";
import fs from "fs";

let backendProcess: ChildProcess | null = null;

async function globalSetup(config: FullConfig) {
  const apiUrl = process.env.API_URL || "http://localhost:8000";
  const backendDir = path.join(__dirname, "../../backend");

  console.log("Starting global test setup...");

  if (!fs.existsSync(backendDir)) {
    console.log("Backend directory not found, skipping backend startup");
    return;
  }

  const envFile = path.join(backendDir, ".env");
  const envTestFile = path.join(backendDir, ".env.test");

  if (!fs.existsSync(envFile) && fs.existsSync(envTestFile)) {
    console.log("Copying .env.test to .env");
    fs.copyFileSync(envTestFile, envFile);
  }

  console.log("Checking Python installation...");
  const pythonCmd = process.platform === "win32" ? "python" : "python3";

  try {
    const { execSync } = require("child_process");
    const pythonVersion = execSync(`${pythonCmd} --version`, {
      encoding: "utf-8",
    });
    console.log(`   Found: ${pythonVersion.trim()}`);
  } catch (error) {
    console.error("Python not found! Please install Python 3.11+");
    throw new Error("Python not available");
  }

  console.log("Starting FastAPI backend...");
  console.log(`Working directory: ${backendDir}`);
  console.log(
    `Command: ${pythonCmd} -m uvicorn app.main:app --host 0.0.0.0 --port 8000`,
  );

  backendProcess = spawn(
    pythonCmd,
    ["-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"],
    {
      cwd: backendDir,
      stdio: "pipe",
      shell: true,
      env: { ...process.env },
    },
  );

  backendProcess.on("error", (error) => {
    console.error(`Failed to start backend process: ${error.message}`);
  });

  backendProcess.on("exit", (code, signal) => {
    if (code !== null && code !== 0) {
      console.error(`Backend process exited with code ${code}`);
    }
  });

  if (backendProcess.stdout) {
    backendProcess.stdout.on("data", (data) => {
      const output = data.toString().trim();
      console.log(`[Backend] ${output}`);
    });
  }

  if (backendProcess.stderr) {
    backendProcess.stderr.on("data", (data) => {
      const output = data.toString().trim();
      console.error(`[Backend Error] ${output}`);
    });
  }

  console.log("Waiting for backend to be ready...");
  console.log(`Checking health at: ${apiUrl}/health`);

  await new Promise((resolve) => setTimeout(resolve, 3000));

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
    throw new Error("Backend startup timeout");
  }

  global.__BACKEND_PROCESS__ = backendProcess;
}

export default globalSetup;
