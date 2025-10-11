const { spawn } = require("child_process");
const getPort = require("get-port");
const treeKill = require("tree-kill");
const path = require("path");

class HostManager {
  constructor(){ this.proc=null; this.port=null; this.cwd=null; this.status="idle"; this.logs=[]; this.max=2000; }
  _log(s){ const row=`[${new Date().toISOString()}] ${s}`; this.logs.push(row); if(this.logs.length>this.max) this.logs.splice(0,this.logs.length-this.max); }

  async start(cwd){
    if(this.proc) throw new Error("Host already running");
    this.cwd=cwd; this.status="installing"; this.logs=[];
    this._log("Running npm install…");

    await new Promise((ok,fail)=>{
      const cmd=process.platform==="win32"?"npm.cmd":"npm";
      const p=spawn(cmd,["install"],{cwd,env:process.env});
      p.stdout.on("data",d=>this._log(String(d).trimEnd()));
      p.stderr.on("data",d=>this._log(String(d).trimEnd()));
      p.on("close",c=>c===0?ok():fail(new Error(`npm install failed (exit code: ${c})`)));
    });

    this.port = await getPort({ port: getPort.makeRange(5173, 5999) });
    const env={...process.env, PORT:String(this.port)};
    this.status="starting";

    // pick script
    let scripts={};
    try { scripts=require(path.join(cwd,"package.json")).scripts||{}; } catch {}
    const cmd=process.platform==="win32"?"npm.cmd":"npm";
    const args = scripts.dev?["run","dev"] : scripts.start?["run","start"] : null;

    const proc = args
      ? spawn(cmd,args,{cwd,env})
      : spawn(process.platform==="win32"?"node.exe":"node",["server.js"],{cwd,env});

    this.proc=proc;

    proc.stdout.on("data",d=>this._log(String(d).trimEnd()));
    proc.stderr.on("data",d=>this._log(String(d).trimEnd()));
    proc.on("close",c=>{ this._log(`exit ${c}`); this.proc=null; this.status=c===0||c===null?"idle":"error"; });

    await new Promise(r=>setTimeout(r,8000)); // warmup
    if(this.proc) {
        this.status="running"; this._log(`Hosting at http://localhost:${this.port}`);
    } else {
        this.status="error"; this._log(`Process failed to start or exited prematurely.`);
    }
    return { port:this.port };
  }

  async stop(){
    if(!this.proc) return;
    this.status="stopping";
    await new Promise(res=>treeKill(this.proc.pid,"SIGTERM",()=>res()));
    this.proc=null; this.status="idle"; this._log("Host stopped.");
  }

  state(){ return { status:this.status, port:this.port, running:!!this.proc, logs:this.logs.slice(-500), cwd:this.cwd }; }
}
module.exports = new HostManager();