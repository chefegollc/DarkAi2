const { spawn } = require("child_process");

const runGit = (cwd, args) => {
    return new Promise((resolve, reject) => {
        const proc = spawn("git", args, { cwd });
        let stdout = "";
        let stderr = "";

        proc.stdout.on("data", (data) => (stdout += data.toString()));
        proc.stderr.on("data", (data) => (stderr += data.toString()));

        proc.on("close", (code) => {
            if (code === 0) {
                resolve({ stdout, stderr });
            } else {
                reject(new Error(`git ${args[0]} failed with code ${code}:\n${stderr}`));
            }
        });
        
        proc.on("error", (err) => {
            reject(new Error(`Failed to spawn git: ${err.message}`));
        });
    });
};

const parseStatus = (porcelainOutput) => {
    const lines = porcelainOutput.trim().split("\n");
    const branchLine = lines.shift() || "";
    const branchMatch = branchLine.match(/^## ([\w\/\.-]+)(?:\.\.\.([\w\/\.-]+))?(?: \[(.+)\])?/);
    
    const status = {
        branch: branchMatch ? branchMatch[1] : 'HEAD (no branch)',
        remote: branchMatch && branchMatch[2] ? branchMatch[2] : null,
        tracking: branchMatch && branchMatch[3] ? branchMatch[3] : null,
        staged: [],
        unstaged: [],
    };

    for (const line of lines) {
        if (!line) continue;
        const stagedChar = line[0];
        const unstagedChar = line[1];
        const path = line.substring(3);
        
        const file = { path, staged: stagedChar, unstaged: unstagedChar };
        
        if (stagedChar !== ' ' && stagedChar !== '?') {
            status.staged.push(file);
        }
        if (unstagedChar !== ' ') {
             status.unstaged.push(file);
        }
    }
    
    return status;
};

const status = async (cwd) => {
    const { stdout } = await runGit(cwd, ["status", "--porcelain", "-b"]);
    return parseStatus(stdout);
};

const getHistory = async (cwd) => {
    try {
        const { stdout } = await runGit(cwd, ["log", "--pretty=format:%h|%an|%ar|%s", "-n", "20"]);
        if (!stdout.trim()) return [];
        return stdout.trim().split("\n").map(line => {
            const [hash, author, date, message] = line.split("|");
            return { hash, author, date, message };
        });
    } catch (e) {
        // May fail if there are no commits yet
        return [];
    }
};

const add = (cwd, files) => runGit(cwd, ["add", ...files]);
const unstage = (cwd, files) => runGit(cwd, ["reset", "HEAD", "--", ...files]);
const commit = (cwd, message) => runGit(cwd, ["commit", "-m", message]);
const pull = (cwd) => runGit(cwd, ["pull"]);
const push = (cwd) => runGit(cwd, ["push"]);

module.exports = {
    status,
    getHistory,
    add,
    unstage,
    commit,
    pull,
    push,
};