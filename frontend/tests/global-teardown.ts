import { FullConfig } from "@playwright/test";
import { execSync } from "child_process";
import path from "path";

async function globalTeardown(config: FullConfig) {
  console.log("Running global teardown...");

  const backendProcess = global.__BACKEND_PROCESS__;

  if (backendProcess) {
    console.log("Stopping backend...");
    if (process.platform === "win32") {
      try {
        execSync(`taskkill /pid ${backendProcess.pid} /f /t`);
      } catch (error) {
        console.log("Backend already stopped");
      }
    } else {
      backendProcess.kill("SIGTERM");
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log("Backend stopped");
  }

  console.log("Keeping MongoDB container running for next test run");
}

export default globalTeardown;
