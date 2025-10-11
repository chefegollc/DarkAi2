const { spawn } = require("child_process");
const path = require("path");

class DeployManager {
  constructor(){ 
    this.status="idle"; // idle | building | deploying | complete | error
    this.logs=[]; 
    this.url=null; 
    this.proc=null; 
    this.maxLogs=2000; 
    this.provider=null; 
    this.cwd=null; 
  }

  _push(line){ 
      const ts = new Date().toISOString();
      const row = `[${ts}] ${line}`;
      this.logs.push(row); 
      if(this.logs.length > this.maxLogs) {
        this.logs.splice(0, this.logs.length - this.maxLogs);
      }
  }

  _run(cmd, args, cwd, env={}) {
    return new Promise((resolve,reject)=>{
      const p = spawn(cmd, args, { cwd, env: {...process.env, ...env} });
      this.proc=p;
      p.stdout.on("data", d => this._push(String(d).trimEnd()));
      p.stderr.on("data", d => this._push(String(d).trimEnd()));
      p.on("close", c => c === 0 ? resolve() : reject(new Error(`${cmd} exited with code ${c}`)));
      p.on("error", err => reject(new Error(`Failed to spawn ${cmd}: ${err.message}`)));
    });
  }

  async start({ provider, cwd }) {
    if(this.proc) throw new Error("A deployment is already in progress.");
    this.status="building"; this.logs=[]; this.url=null; this.provider=provider; this.cwd=cwd;
    this._push(`Starting deployment to ${provider}...`);

    let scripts={};
    try { scripts = require(path.join(cwd, "package.json")).scripts || {}; } catch {}
    if (scripts.build) {
      this._push("Build script found. Running 'npm run build'...");
      await this._run(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build"], cwd);
      this._push("Build complete.");
    } else { 
        this._push("No 'build' script found. Deploying raw directory."); 
    }

    if (provider === "vercel") {
      this.status="deploying";
      const token = process.env.VERCEL_TOKEN;
      if (!token) throw new Error("VERCEL_TOKEN environment variable is not set.");
      const args = ["--prod", "--yes", "--confirm", "--token", token];
      await this._run(process.platform === "win32" ? "npx.cmd" : "npx", ["vercel", ...args], cwd);
      const line = [...this.logs].reverse().find(l => /https:\/\/.*\.vercel\.app/.test(l));
      if (!line) throw new Error("Could not determine Vercel deployment URL from logs.");
      this.url = line.match(/https:\/\/[^\s]+\.vercel\.app/)[0];

    } else if (provider === "netlify") {
      this.status="deploying";
      const token = process.env.NETLIFY_AUTH_TOKEN;
      if (!token) throw new Error("NETLIFY_AUTH_TOKEN environment variable is not set.");
      const fs = require("fs");
      const dir = fs.existsSync(path.join(cwd,"dist")) ? "dist" : fs.existsSync(path.join(cwd,"build")) ? "build" : ".";
      this._push(`Deploying directory '${dir}' to Netlify...`)
      const args = ["deploy", "--prod", "--auth", token, "--dir", dir, "--json"];
      await this._run(process.platform === "win32" ? "npx.cmd" : "npx",["netlify", ...args], cwd);
      const jsonLine = this.logs.find(l => l.trim().startsWith("{") && l.includes('"deploy_url"'));
      if (!jsonLine) throw new Error("Could not determine Netlify deployment URL from logs.");
      const info = JSON.parse(jsonLine.substring(jsonLine.indexOf('{')));
      this.url = info.deploy_url;

    } else {
      throw new Error(`Unknown deployment provider: ${provider}`);
    }

    this.status="complete";
    this.proc = null;
    this._push(`Deployment successful! URL: ${this.url}`);
    return { url: this.url, provider: this.provider };
  }

  async stop(){ 
      if(this.proc) { 
          this.proc.kill("SIGTERM"); 
      } 
      this.proc=null; 
      this.status="idle";
      this._push("Deployment stopped by user.");
  }
  
  getState(){ 
      return { 
          status: this.status, 
          provider: this.provider, 
          url: this.url, 
          logs: this.logs.slice(-500) 
        }; 
    }
}

module.exports = new DeployManager();