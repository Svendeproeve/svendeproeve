import { ChildProcess } from 'child_process';

declare global {
  var __BACKEND_PROCESS__: ChildProcess | undefined;
}

export {};
