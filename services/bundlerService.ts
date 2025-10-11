import * as esbuild from 'esbuild-wasm';
import { ProjectFile, BuildResult } from '../types.ts';

let esbuildInitialized = false;

const initialize = async () => {
    if (esbuildInitialized) return;
    await esbuild.initialize({
        wasmURL: 'https://cdn.jsdelivr.net/npm/esbuild-wasm@0.21.3/esbuild.wasm',
        worker: true,
    });
    esbuildInitialized = true;
};

const isInitialized = () => esbuildInitialized;

const bundle = async (files: ProjectFile[], entryPoint: string): Promise<BuildResult> => {
    if (!esbuildInitialized) {
        throw new Error('esbuild is not initialized.');
    }

    const inMemoryPlugin = {
        name: 'in-memory-plugin',
        setup(build: any) {
            // Intercept file paths to load them from our virtual file system
            build.onResolve({ filter: /.*/ }, (args: any) => {
                if (args.path === entryPoint) {
                    return { path: args.path, namespace: 'vfs' };
                }
                
                // Resolve relative paths
                const path = new URL(args.path, `file://${args.importer}`).pathname;
                
                // Check for extensionless imports like `import App from './App'`
                const extensions = ['.ts', '.tsx', '.js', '.jsx', '.css', '.json'];
                const file = files.find(f => f.path === path || extensions.some(ext => f.path === `${path}${ext}`));

                if (file) {
                    return { path: file.path, namespace: 'vfs' };
                }

                return { path: args.path, namespace: 'vfs' }; // Let on-load handle it
            });

            // Load files from our virtual file system
            build.onLoad({ filter: /.*/, namespace: 'vfs' }, (args: any) => {
                const file = files.find(f => f.path === args.path);
                if (!file) {
                    return { errors: [{ text: `File not found: ${args.path}` }] };
                }
                
                const extension = file.path.split('.').pop()?.toLowerCase() || 'js';
                const loader = ['js', 'jsx', 'ts', 'tsx'].includes(extension) ? 'tsx' : 'css';

                return {
                    contents: file.content,
                    loader: loader,
                    resolveDir: file.path.substring(0, file.path.lastIndexOf('/')),
                };
            });
        },
    };

    try {
        const result = await esbuild.build({
            entryPoints: [entryPoint],
            bundle: true,
            write: false,
            format: 'esm',
            sourcemap: 'inline',
            outfile: 'bundle.js',
            plugins: [inMemoryPlugin],
            define: { 'process.env.NODE_ENV': '"production"' }, // For React
        });
        
        return {
            code: result.outputFiles[0].text,
            sourceMap: '', // Source map is inlined
            errors: [],
        };
    } catch (e: any) {
        return { code: '', sourceMap: '', errors: e.errors || [{text: e.message}] };
    }
};

export const bundler = { initialize, isInitialized, bundle };