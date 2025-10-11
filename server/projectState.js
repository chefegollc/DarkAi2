const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const fg = require('fast-glob');

class ProjectState {
    constructor() {
        this.rootDir = path.join(os.tmpdir(), `ai-studio-project-${Date.now()}`);
        this.files = [];
        this.initialized = false;
    }

    async _ensureRootDir() {
        if (!this.initialized) {
            await fs.mkdir(this.rootDir, { recursive: true });
            this.initialized = true;
        }
    }

    hasProject() {
        return this.files.length > 0;
    }

    async sync(files) {
        await this._ensureRootDir();
        this.files = files;
        
        // This is a comprehensive sync. It will write all files from the client.
        for (const file of this.files) {
            // Sanitize file.path to prevent path traversal
            if (file.path.includes('..')) {
                console.warn(`Skipping potentially malicious path: ${file.path}`);
                continue;
            }
            const filePath = path.join(this.rootDir, file.path);
            const dirName = path.dirname(filePath);
            await fs.mkdir(dirName, { recursive: true });
            await fs.writeFile(filePath, file.content);
        }
        
        // After syncing, ensure the project is a Git repository
        const gitDir = path.join(this.rootDir, '.git');
        if (!fsSync.existsSync(gitDir)) {
            console.log('No .git directory found. Initializing new Git repository...');
            const gitInit = spawn('git', ['init'], { cwd: this.rootDir });
            gitInit.stderr.on('data', (data) => {
                console.error(`git init stderr: ${data}`);
            });
            gitInit.on('close', (code) => {
                if (code === 0) {
                    console.log('Git repository initialized successfully.');
                } else {
                    console.error(`git init process exited with code ${code}`);
                }
            });
        }
    }
    
    async getAllFiles() {
        if (!this.initialized) return [];
        
        const filePaths = await fg('**/*', { 
            cwd: this.rootDir, 
            dot: true, 
            onlyFiles: true,
            ignore: ['.git/**'] 
        });

        const files = await Promise.all(
            filePaths.map(async (p) => {
                try {
                    const content = await fs.readFile(path.join(this.rootDir, p), 'utf-8');
                    return { path: `/${p}`, content };
                } catch (e) {
                    console.warn(`Could not read file ${p}: ${e.message}`);
                    return null;
                }
            })
        );
        
        return files.filter(Boolean);
    }
}

module.exports = new ProjectState();