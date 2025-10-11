export type SupportedStack = 'react' | 'vanilla' | 'css' | 'tailwind' | 'python' | 'java' | 'cpp' | 'rust' | 'html' | 'json' | 'markdown' | 'other';

export function getStackForPath(path: string): SupportedStack {
    const name = path.toLowerCase();
    
    if (/(^|\/)tailwind\.config\.(js|cjs|ts)$/.test(name)) return "tailwind";
    if (name.endsWith(".css")) return "css";
    
    if (name.endsWith(".tsx") || name.endsWith(".jsx")) return "react";
    if (name.endsWith(".ts") || name.endsWith(".js") || name.endsWith(".mjs") || name.endsWith(".cjs")) return "vanilla";

    if (name.endsWith(".py")) return "python";
    if (name.endsWith(".java")) return "java";
    if (name.endsWith(".rs")) return "rust";
    if (name.endsWith(".cpp") || name.endsWith(".cc") || name.endsWith(".cxx") || name.endsWith(".hpp") || name.endsWith(".hh") || name.endsWith(".hxx") || name.endsWith(".h")) return "cpp";

    if (name.endsWith(".html")) return 'html';
    if (name.endsWith(".json")) return 'json';
    if (name.endsWith(".md")) return 'markdown';

    return 'other';
}

export function getMonacoLanguageForPath(path: string): string {
    const stack = getStackForPath(path);
    switch (stack) {
        case 'react': return 'typescript'; // Monaco uses 'typescript' for tsx
        case 'vanilla':
            const ext = path.split('.').pop()?.toLowerCase() || '';
            if (ext === 'ts') return 'typescript';
            return 'javascript';
        case 'css':
        case 'tailwind':
            return 'css';
        case 'python': return 'python';
        case 'java': return 'java';
        case 'cpp': return 'cpp';
        case 'rust': return 'rust';
        case 'html': return 'html';
        case 'json': return 'json';
        case 'markdown': return 'markdown';
        default: return 'plaintext';
    }
}