// renderer/python/PyRuntime.ts
type LogHandler = (line: string) => void;
type ReadyHandler = () => void;

export class PyRuntime {
  private worker: Worker | null = null;
  private onLog: LogHandler;
  private onReady: ReadyHandler;
  private ready = false;

  constructor(onLog: LogHandler, onReady: ReadyHandler) {
    this.onLog = onLog;
    this.onReady = onReady;
    this.boot();
  }

  private boot() {
    // Replaced `new URL(...)` with a direct path to the worker script.
    // This is more robust for environments like Babel Standalone where `import.meta.url`
    // may not be reliable. The path must be absolute from the server root.
    this.worker = new Worker('/python/pythonWorker.js', { type: 'module' });
    this.worker.onmessage = (ev: MessageEvent) => {
      const msg = ev.data || {};
      if (msg.type === 'log') this.onLog(msg.payload);
      else if (msg.type === 'ready') { this.ready = true; this.onReady(); }
      else if (msg.type === 'error') this.onLog(`[ERROR] ${msg.payload}`);
      else if (msg.type === 'result') this.onLog(String(msg.payload ?? ''));
      else if (msg.type === 'status') this.onLog(`[STATUS] ${msg.payload}`);
    };
    this.worker.postMessage({ type: 'init' });
  }

  isReady() { return this.ready; }

  async run(code: string, files?: Record<string, string>) {
    if (!this.worker) throw new Error('Worker not running');
    this.worker.postMessage({ type: 'run', code, files: files || {} });
  }

  async install(pkgs: string[]) {
    if (!this.worker) throw new Error('Worker not running');
    this.worker.postMessage({ type: 'install', pkgs });
  }

  async resetFS() {
    if (!this.worker) throw new Error('Worker not running');
    this.worker.postMessage({ type: 'resetfs' });
  }

  stop() {
    if (this.worker) {
      this.worker.postMessage({ type: 'stop' }); // cooperative stop
      // hard stop fallback after 250ms
      setTimeout(() => { try { this.worker && this.worker.terminate(); } catch {} this.worker = null; }, 250);
    }
  }
}