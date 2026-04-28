import { FullConfig } from "@playwright/test";
import { execSync } from "child_process";

async function globalTeardown(config: FullConfig) {
  console.log("Running global teardown...");

  const isCI = !!process.env.CI;

  if (isCI) {
    const backendProcess = (global as any).__BACKEND_PROCESS__;
    if (backendProcess) {
      console.log("Stopping backend...");
      try {
        execSync(`taskkill /pid ${backendProcess.pid} /f /t`);
      } catch {
        backendProcess.kill("SIGTERM");
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
      console.log("Backend stopped");
    }
  } else {
    console.log("Keeping test containers running for next test run");
  }
}

export default globalTeardown;
