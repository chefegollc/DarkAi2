const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const project = require('./projectState');
const host = require('./hostManager');
const deploy = require('./deployManager');
const nodeExecutor = require('./nodeExecutor.js');
const git = require('./gitManager.js'); // Import the new git manager
require('dotenv').config();

const { spawn } = require("child_process");
const treeKill = require("tree-kill");
const os = require("os");
const path = require("path");
const fs = require("fs");
const fsp = require("fs/promises");

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get('/api/project/files', async (req, res) => {
    try {
        if (!project.hasProject()) {
            return res.status(404).json({ ok: false, error: 'No project has been synced yet.' });
        }
        const files = await project.getAllFiles();
        res.json({ ok: true, files });
    } catch (e) {
        console.error("Get All Files Error:", e);
        res.status(500).json({ ok: false, error: String(e.message || e) });
    }
});

app.post('/api/project/sync', async (req, res) => {
    try {
        const { files } = req.body;
        if (!files || !Array.isArray(files)) {
            return res.status(400).json({ error: 'Invalid project files data.' });
        }
        await project.sync(files);
        res.json({ ok: true, message: 'Project synced successfully.' });
    } catch (e) {
        console.error("Sync Error:", e);
        res.status(500).json({ error: String(e.message || e) });
    }
});

let hostProxy = null;

app.use('/_host', (req, res, next) => {
    if (hostProxy) {
        return hostProxy(req, res, next);
    }
    res.status(503).send('Host not running. Click "Start Host" to begin.');
});

app.post('/api/host/start', async (req, res) => {
  try {
    if (!project.hasProject()) return res.status(400).json({ error: "No project loaded to host." });
    
    await host.stop();
    const info = await host.start(project.rootDir);
    
    hostProxy = createProxyMiddleware({
      target: `http://localhost:${info.port}`,
      changeOrigin: true,
      ws: true,
      pathRewrite: { "^/_host": "" },
      onError(err, req, res) {
        console.error('Proxy error:', err);
        if (res && !res.headersSent) {
            res.writeHead(502);
        }
        if (res) {
            res.end("Proxy Error: Could not connect to the hosted service. It may be starting up or have crashed.");
        }
      }
    });

    res.json({ ok: true, port: info.port, url: "/_host/" });
  } catch (e) { 
      console.error("Host Start Error:", e);
      res.status(500).json({ error: String(e.message || e) }); 
  }
});

app.post('/api/host/stop', async (req, res) => {
  try { 
    await host.stop();
    hostProxy = null;
    res.json({ ok: true }); 
  }
  catch (e) { 
      console.error("Host Stop Error:", e);
      res.status(500).json({ error: String(e.message || e) }); 
  }
});

app.get('/api/host/status', (req, res) => {
  res.json(host.state());
});

app.get('/api/host/logs', (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  
  const send = () => {
    const state = host.state();
    res.write(`event: tick\ndata: ${JSON.stringify(state)}\n\n`);
  };
  send();

  const iv = setInterval(send, 1000);
  req.on("close", () => clearInterval(iv));
});

// --- Git Routes ---
app.get('/api/git/status', async (req, res) => {
    try {
        if (!project.hasProject()) return res.status(400).json({ error: "No project loaded." });
        const status = await git.status(project.rootDir);
        const history = await git.getHistory(project.rootDir);
        res.json({ ok: true, status, history });
    } catch (e) {
        res.status(500).json({ error: String(e.message || e) });
    }
});

app.post('/api/git/add', async (req, res) => {
    try {
        const { files } = req.body;
        if (!files || !Array.isArray(files)) return res.status(400).json({ error: 'Files array is required.' });
        const result = await git.add(project.rootDir, files);
        res.json({ ok: true, ...result });
    } catch (e) {
        res.status(500).json({ error: String(e.message || e) });
    }
});

app.post('/api/git/unstage', async (req, res) => {
    try {
        const { files } = req.body;
        if (!files || !Array.isArray(files)) return res.status(400).json({ error: 'Files array is required.' });
        const result = await git.unstage(project.rootDir, files);
        res.json({ ok: true, ...result });
    } catch (e) {
        res.status(500).json({ error: String(e.message || e) });
    }
});

app.post('/api/git/commit', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: 'Commit message is required.' });
        const result = await git.commit(project.rootDir, message);
        res.json({ ok: true, ...result });
    } catch (e) {
        res.status(500).json({ error: String(e.message || e) });
    }
});

app.post('/api/git/pull', async (req, res) => {
    try {
        const result = await git.pull(project.rootDir);
        res.json({ ok: true, ...result });
    } catch (e) {
        res.status(500).json({ error: String(e.message || e) });
    }
});

app.post('/api/git/push', async (req, res) => {
    try {
        const result = await git.push(project.rootDir);
        res.json({ ok: true, ...result });
    } catch (e) {
        res.status(500).json({ error: String(e.message || e) });
    }
});


// --- Cloud Deploy Routes ---

app.post("/api/deploy/start", async (req,res)=>{
  try{
    if(!project.hasProject()) return res.status(400).json({error:"No project loaded to deploy."});
    const { provider } = req.body || {};
    if(!provider) return res.status(400).json({error:"A 'provider' (vercel or netlify) is required."});
    const info = await deploy.start({ provider, cwd: project.rootDir });
    res.json({ ok:true, ...info });
  }catch(e){ 
      console.error("Deploy Start Error:", e);
      res.status(500).json({error:String(e.message||e)}); 
  }
});

app.get("/api/deploy/status", (req,res)=> {
    res.json(deploy.getState());
});

app.get("/api/deploy/logs", (req,res)=>{
  res.setHeader("Content-Type","text/event-stream"); 
  res.setHeader("Cache-Control","no-cache"); 
  res.setHeader("Connection","keep-alive");
  
  const send = () => {
      res.write(`event: tick\ndata: ${JSON.stringify(deploy.getState())}\n\n`);
  };
  send();

  const iv=setInterval(send,1000); 
  req.on("close",()=>clearInterval(iv));
});

// --- Node.js Runner Route ---
app.post('/api/node/run', async (req, res) => {
    try {
        if (!project.hasProject()) {
            return res.status(400).json({ error: "No project loaded to run." });
        }
        const { path } = req.body;
        if (!path) {
            return res.status(400).json({ error: "File path is required." });
        }

        // Path from client is absolute (e.g., '/src/index.js'), convert to relative for executor
        const relativePath = path.startsWith('/') ? path.substring(1) : path;
        
        const result = await nodeExecutor.run(relativePath, project.rootDir);
        res.json(result);

    } catch (e) {
        console.error("Node Run Error:", e);
        res.status(500).json({ error: String(e.message || e), stdout: '', stderr: String(e.message || e) });
    }
});

// --- Backend Compiler Bridge ---

const REFUSAL = {
  java:  [/\bjava\.net\./, /\bjava\.nio\.channels\.SocketChannel\b/, /\bProcessBuilder\b/],
  cpp:   [/<sys\/socket\.h>/, /<winsock2\.h>/, /\bsystem\s*\(/, /\bpopen\s*\(/, /\bfork\s*\(/],
  rust:  [/\btokio::net\b/, /\bstd::net\b/, /\bstd::process::Command\b/],
};

function scanRefusal(language, code) {
  const rules = REFUSAL[language] || [];
  for (const rx of rules) if (rx.test(code)) return `Blocked by policy: ${rx}`;
  return null;
}

async function writeTemp(dir, rel, content) {
  const abs = path.join(dir, rel);
  await fsp.mkdir(path.dirname(abs), { recursive: true });
  await fsp.writeFile(abs, content);
  return abs;
}

function runCmd(cmd, args, cwd, timeoutMs=8000) {
  return new Promise((resolve) => {
    const logs = [];
    const p = spawn(cmd, args, { cwd, env: process.env, shell: process.platform === 'win32' });
    const killTimer = setTimeout(() => {
      logs.push(`[TIMEOUT] exceeded ${timeoutMs}ms → killing`);
      try { treeKill(p.pid, "SIGKILL"); } catch {}
    }, timeoutMs);
    p.stdout.on("data", d => logs.push(String(d)));
    p.stderr.on("data", d => logs.push(String(d)));
    p.on("close", code => { clearTimeout(killTimer); resolve({ code, logs: logs.join("") }); });
  });
}

async function compileRunJava(tmp, mainPath) {
  const { logs: cLogs, code: cCode } = await runCmd("javac", [mainPath], tmp, 12000);
  if (cCode !== 0) return { output:"", logs:cLogs, error:"Compilation failed." };
  // Guess main class by filename
  const mainClass = path.basename(mainPath).replace(/\.java$/, "");
  const { logs: rLogs, code: rCode } = await runCmd("java", [mainClass], tmp, 8000);
  return { output: rLogs, logs:cLogs + "\n" + rLogs, error: rCode===0 ? null : "Execution failed." };
}

async function compileRunCpp(tmp, mainPath) {
  const out = path.join(tmp, "a.out" + (process.platform === 'win32' ? '.exe' : ''));
  const { logs: cLogs, code: cCode } = await runCmd("g++", ["-O2", "-std=c++17", mainPath, "-o", out], tmp, 15000);
  if (cCode !== 0) return { output:"", logs:cLogs, error:"Compilation failed." };
  const { logs: rLogs, code: rCode } = await runCmd(out, [], tmp, 8000);
  return { output: rLogs, logs:cLogs + "\n" + rLogs, error: rCode===0 ? null : "Execution failed." };
}

async function compileRunRust(tmp, mainPath) {
  // Create minimal Cargo project on the fly
  const cargoDir = path.join(tmp, "rustproj");
  await fsp.mkdir(path.join(cargoDir, "src"), { recursive: true });
  await fsp.writeFile(path.join(cargoDir, "Cargo.toml"), `[package]\nname = "rproj"\nversion = "0.1.0"\nedition = "2021"\n`);
  // Use a fixed name for the main file to avoid cargo issues with file paths
  await fsp.copyFile(mainPath, path.join(cargoDir, "src", "main.rs"));
  const { logs: bLogs, code: bCode } = await runCmd("cargo", ["run", "--quiet", "--release"], cargoDir, 20000);
  return { output: bLogs, logs: bLogs, error: bCode===0 ? null : "Execution failed." };
}

function appendTrace(language, srcPath, code, result) {
  const line = JSON.stringify({
    ts: new Date().toISOString(), language, src: srcPath,
    error: result.error || null, bytes: code.length, logBytes: (result.logs||"").length
  }) + "\n";
  try { fs.appendFileSync(path.join(os.tmpdir(), "aistudio-trace.jsonl"), line); } catch {}
}

app.post("/api/compile-run", async (req, res) => {
  try {
    const { language, path: rel, code } = req.body || {};
    if (!language || !code) return res.status(400).json({ error:"Missing language or code" });

    const refused = scanRefusal(language, code);
    if (refused) return res.json({ error:"Refused", logs: refused, output:"" });

    const tmp = await fsp.mkdtemp(path.join(os.tmpdir(), "aistudio-run-"));
    let result = { output:"", logs:"", error:null };

    if (language === "java") {
      const p = await writeTemp(tmp, rel || "Main.java", code);
      result = await compileRunJava(tmp, p);
    } else if (language === "cpp") {
      const p = await writeTemp(tmp, rel || "main.cpp", code);
      result = await compileRunCpp(tmp, p);
    } else if (language === "rust") {
      const p = await writeTemp(tmp, rel || "main.rs", code);
      result = await compileRunRust(tmp, p);
    } else {
      return res.status(400).json({ error:"Unsupported language" });
    }

    appendTrace(language, rel, code, result);
    res.json(result);
    // Cleanup in background
    setTimeout(() => fsp.rm(tmp, { recursive: true, force: true }), 500);

  } catch (e) {
    console.error(`[compile-run] Error:`, e);
    res.status(500).json({ error:String(e.message||e), logs: String(e.stack || '') });
  }
});

app.listen(port, () => {
  console.log(`AI Studio backend server listening on http://localhost:${port}`);
});