// A simple, sandboxed Node.js runner simulation
export const nodeRunner = {
    run: async (code: string, onStdout: (msg: string) => void, onStderr: (msg: string) => void): Promise<void> => {
        // Store original console methods for debugging the IDE itself
        const originalLog = console.log;
        const originalError = console.error;
        
        // Create a custom console object to intercept logs from the sandboxed code
        const customConsole = {
            log: (...args: any[]) => {
                const message = args.map(arg => {
                    try {
                        return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
                    } catch (e) {
                        return '[Unserializable Object]';
                    }
                }).join(' ');
                onStdout(message);
            },
            error: (...args: any[]) => {
                const message = args.map(arg => {
                     try {
                        return arg instanceof Error ? arg.message : typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
                    } catch (e) {
                        return '[Unserializable Object]';
                    }
                }).join(' ');
                onStderr(message);
            }
        };

        try {
            // Use the Function constructor for safer execution than eval.
            // We pass our custom console into the function's scope.
            const sandboxedFunction = new Function('console', code);
            sandboxedFunction(customConsole);
        } catch (e) {
            if (e instanceof Error) {
                onStderr(e.message);
            } else {
                onStderr(String(e));
            }
        }
    }
};
