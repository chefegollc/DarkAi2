const { spawn } = require("child_process");

const run = (filePath, cwd) => {
    return new Promise((resolve) => {
        let stdout = '';
        let stderr = '';
        
        const isTypeScript = filePath.endsWith('.ts') || filePath.endsWith('.tsx');
        
        // Use 'npx ts-node' for TypeScript files, otherwise use 'node'
        const command = isTypeScript 
            ? (process.platform === 'win32' ? 'npx.cmd' : 'npx')
            : (process.platform === 'win32' ? 'node.exe' : 'node');
            
        const args = isTypeScript ? ['ts-node', filePath] : [filePath];

        const proc = spawn(command, args, { cwd, shell: true });

        proc.stdout.on('data', (data) => stdout += data.toString());
        proc.stderr.on('data', (data) => stderr += data.toString());

        proc.on('close', (code) => {
            resolve({ stdout, stderr, exitCode: code });
        });
        
        proc.on('error', (err) => {
             // This catches errors like EPERM or command not found
            resolve({ stdout, stderr: stderr + `\nExecution Error: ${err.message}`, exitCode: 1 });
        });
    });
};

module.exports = { run };
