// renderer/python/pythonWorker.js
// IMPORTANT: we load Pyodide from CDN. If you prefer offline, vendor the files locally.
const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js';

let pyodide = null;
let stopping = false;

function log(line) { postMessage({ type: 'log', payload: line }); }
function status(line) { postMessage({ type: 'status', payload: line }); }
function err(line) { postMessage({ type: 'error', payload: line }); }

async function init() {
  if (pyodide) return;
  status('Loading Pyodide…');
  importScripts(PYODIDE_URL);
  // @ts-ignore
  pyodide = await self.loadPyodide({ stdin: () => '', stdout: (s) => log(String(s)), stderr: (s) => log(String(s)) });
  status('Pyodide ready');
  // create a workspace dir
  await pyodide.FS.mkdir('/workspace').catch(() => {});
  await pyodide.FS.chdir('/workspace');
  postMessage({ type: 'ready' });
}

async function writeFiles(files = {}) {
  for (const [rel, content] of Object.entries(files)) {
    const path = rel.startsWith('/') ? rel : `/workspace/${rel}`;
    const dirs = path.split('/').slice(1,-1);
    let acc = '';
    for (const d of dirs) {
      acc += '/' + d;
      try { pyodide.FS.mkdir(acc); } catch {}
    }
    pyodide.FS.writeFile(path, content);
  }
}

async function installPackages(pkgs) {
  if (!pkgs || pkgs.length === 0) return;
  status(`Installing: ${pkgs.join(', ')}`);
  await pyodide.runPythonAsync(`
import micropip
await micropip.install(${JSON.stringify(pkgs)})
print("Installed: ${pkgs.join(', ')}")
  `);
}

async function runCode(code, files = {}) {
  stopping = false;
  try {
    await writeFiles(files);
    // Redirect prints reliably from Python side too
    const wrapped = `
import sys, io
from contextlib import redirect_stdout, redirect_stderr
_buf_out, _buf_err = io.StringIO(), io.StringIO()
with redirect_stdout(_buf_out), redirect_stderr(_buf_err):
    # --- USER CODE START ---
${code}
    # --- USER CODE END ---
out = _buf_out.getvalue()
err = _buf_err.getvalue()
(out, err)
`;
    const resultProxy = await pyodide.runPythonAsync(wrapped);
    const [out, errTxt] = resultProxy.toJs();
    resultProxy.destroy();

    if (out) postMessage({ type: 'result', payload: out });
    if (errTxt) postMessage({ type: 'error', payload: errTxt });
  } catch (e) {
    err(String(e?.message || e));
  }
}

self.onmessage = async (ev) => {
  const { type, code, files, pkgs } = ev.data || {};
  try {
    if (type === 'init') await init();
    else if (type === 'install') await installPackages(pkgs || []);
    else if (type === 'run') await runCode(code || '', files || {});
    else if (type === 'resetfs') {
      try {
        await pyodide.runPythonAsync(`
import os, shutil
workspace = '/workspace'
for item in os.listdir(workspace):
    item_path = os.path.join(workspace, item)
    if os.path.isdir(item_path):
        shutil.rmtree(item_path)
    else:
        os.unlink(item_path)
`);
      } catch (e) {
        err(String(e.message || e));
      }
      status('Workspace reset');
    } else if (type === 'stop') {
      stopping = true;
      status('Stopping…');
      // cooperative only; main thread will .terminate() if needed
    }
  } catch (e) {
    err(String(e?.message || e));
  }
};
