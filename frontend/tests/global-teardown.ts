import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🔧 Running global teardown...');

  const backendProcess = global.__BACKEND_PROCESS__;

  if (backendProcess) {
    console.log('🛑 Stopping backend...');

    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', backendProcess.pid!.toString(), '/f', '/t']);
    } else {
      backendProcess.kill('SIGTERM');
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('✅ Backend stopped');
  }
}

function spawn(command: string, args: string[]) {
  const { spawn: nodeSpawn } = require('child_process');
  return nodeSpawn(command, args, { shell: true });
}

export default globalTeardown;
