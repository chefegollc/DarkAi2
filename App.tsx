import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { ProjectFile, BuildResult, PreviewMode } from './types.ts';
import { useDebounce } from './hooks/useDebounce.ts';
import { Editor } from './components/Editor.tsx';
import { FileExplorer } from './components/FileExplorer.tsx';
import { Preview } from './components/Preview.tsx';
import { AIAssistant, AIAssistantRef } from './components/AIAssistant.tsx';
import { Terminal } from './components/Terminal.tsx';
import { Toolbar } from './components/Toolbar.tsx';
import { Icon } from './components/Icon.tsx';
import { LiveDeploy } from './components/LiveDeploy.tsx';
import { PythonPanel } from './components/PythonPanel.tsx';
import { GitPanel, GitState } from './components/GitPanel.tsx';
import { ActivityBar } from './components/ActivityBar.tsx';
import { PreviewModeToggle } from './components/PreviewModeToggle.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { PanelHeader } from './components/PanelHeader.tsx';
import { exportToZip, importFromZip } from './services/zipService.ts';
import { bundler } from './services/bundlerService.ts';
import { getStackForPath, getMonacoLanguageForPath } from './utils/language.ts';


const PREVIEW_ORIGIN = `https://${crypto.randomUUID().slice(0, 12)}.vfs.local`;

type Theme = 'light' | 'dark' | 'auto';
type LeftPanelTab = 'files' | 'git';
type HighlightedPanel = 'explorer' | 'assistant' | 'preview' | 'terminal';

const initialFiles: ProjectFile[] = [
    {
        id: '1',
        path: '/index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React App</title>
    <style>
      /* Prevents flash of unstyled content (FOUC) on load */
      body { 
        margin: 0;
        background-color: #171717; /* dark:bg-neutral-900 */
      }
      .light body {
        background-color: #f3f4f6; /* light mode background from style.css */
      }
    </style>
    <script>
      // Mirrors the logic from the main app shell to prevent FOUC in the iframe
      if (localStorage.getItem('ai-studio-theme') === 'light') {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/index.tsx"></script>
  </body>
</html>`
    },
    {
        id: '2',
        path: '/App.tsx',
        language: 'typescript',
        content: `import React, { useState } from 'react';
import './style.css';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>Hello, AI Studio!</h1>
      <p>This is a real React application running in your browser.</p>
      <button onClick={() => setCount(count + 1)}>
        Count is {count}
      </button>
    </div>
  );
}`
    },
    {
        id: '3',
        path: '/index.tsx',
        language: 'typescript',
        content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`
    },
    {
       id: '4',
       path: '/style.css',
       language: 'css',
       content: `body {
    font-family: sans-serif;
    background-color: #f3f4f6;
    color: #1f2937;
    padding: 2rem;
}

h1 {
    color: #0ea5e9;
}

button {
    background-color: #4f46e5;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 0.25rem;
    cursor: pointer;
    margin-top: 1rem;
}

/* Add dark mode styles */
.dark body {
    background-color: #171717;
    color: #e5e5e5;
}

.dark h1 {
    color: #38bdf8;
}

.dark button {
    background-color: #6366f1;
}
`
    }
];

export default function App() {
    const [files, setFiles] = useState<ProjectFile[]>(initialFiles);
    const [activeFileId, setActiveFileId] = useState<string | null>('2');
    const [editorContent, setEditorContent] = useState<string>('');
    const [logs, setLogs] = useState<string[]>(["Welcome to AI Studio IDE's terminal."]);
    
    const [buildStatus, setBuildStatus] = useState<'idle' | 'building' | 'success' | 'error'>('idle');
    const [buildResult, setBuildResult] = useState<BuildResult | null>(null);
    const [previewRefreshKey, setPreviewRefreshKey] = useState(0);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [previewMode, setPreviewMode] = useState<PreviewMode>(PreviewMode.Sandbox);
    const [theme, setTheme] = useState<Theme>('dark');
    const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('dark');
    const filesRef = useRef(files);
    filesRef.current = files; // Keep ref updated for the service worker
    
    const buildResultRef = useRef(buildResult);
    buildResultRef.current = buildResult;

    const [projectName, setProjectName] = useState('My AI Studio Project');
    const [history, setHistory] = useState<ProjectFile[][]>([initialFiles]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [autoSave, setAutoSave] = useState(true);
    const [isAiHistoryVisible, setIsAiHistoryVisible] = useState(false);
    const [isChatSearchVisible, setIsChatSearchVisible] = useState(false);
    const [activeLeftTab, setActiveLeftTab] = useState<LeftPanelTab>('files');
    const [gitState, setGitState] = useState<GitState>({ status: null, history: [] });
    const [isActivityBarVisible, setIsActivityBarVisible] = useState(true);
    const [isLeftPanelVisible, setIsLeftPanelVisible] = useState(true);
    const [isPreviewOptionsVisible, setIsPreviewOptionsVisible] = useState(false);
    
    // New state for right panels
    const [isAssistantVisible, setIsAssistantVisible] = useState(true);
    const [isPreviewVisible, setIsPreviewVisible] = useState(true);
    const [isTerminalVisible, setIsTerminalVisible] = useState(false);

    // New state for panel highlighting and settings
    const [highlightedPanel, setHighlightedPanel] = useState<HighlightedPanel | null>(null);
    const [settingsModalFor, setSettingsModalFor] = useState<HighlightedPanel | null>(null);

    const aiAssistantRef = useRef<AIAssistantRef>(null);

    const addLog = useCallback((message: string) => {
        setLogs(prev => [...prev.slice(-200), `${new Date().toLocaleTimeString()}: ${message}`]);
    }, []);
    
    const handleToggleChatSearch = () => {
        setIsChatSearchVisible(isVisible => {
            const nextState = !isVisible;
            // When opening search, also ensure the history panel is visible.
            if (nextState) setIsAiHistoryVisible(true);
            return nextState;
        });
    };

    const debouncedFiles = useDebounce(files, 500);
    const debouncedProjectName = useDebounce(projectName, 500);
    const activeFile = useMemo(() => files.find(f => f.id === activeFileId), [files, activeFileId]);
    const isAnyRightPanelVisible = isAssistantVisible || isPreviewVisible || isTerminalVisible;

    // --- History Management ---
    const saveToHistory = useCallback((newFiles: ProjectFile[]) => {
        setHistory(currentHistory => {
            const newHistory = currentHistory.slice(0, historyIndex + 1);
            newHistory.push(newFiles);
            if (newHistory.length > 50) newHistory.shift();
            setHistoryIndex(newHistory.length - 1);
            return newHistory;
        });
    }, [historyIndex]);

    const undo = useCallback(() => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setFiles(history[newIndex]);
            addLog('[History] Undo applied.');
        }
    }, [history, historyIndex, addLog]);

    const redo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            setFiles(history[newIndex]);
            addLog('[History] Redo applied.');
        }
    }, [history, historyIndex, addLog]);

    // --- Persistence ---
    useEffect(() => {
        try {
            const savedProject = localStorage.getItem('ai-studio-project');
            if (savedProject) {
                const { name, files: savedFiles } = JSON.parse(savedProject);
                if (name && Array.isArray(savedFiles)) {
                    setProjectName(name);
                    setFiles(savedFiles);
                    setHistory([savedFiles]);
                    setHistoryIndex(0);
                    addLog('Loaded project from local storage.');
                }
            }
        } catch (e) {
            console.error('Failed to load project from local storage:', e);
            addLog('[Error] Could not load project from local storage.');
        }
    }, [addLog]);

    useEffect(() => {
        if (autoSave) {
            const savedProject = {
                name: debouncedProjectName,
                files: debouncedFiles,
            };
            try {
                localStorage.setItem('ai-studio-project', JSON.stringify(savedProject));
            } catch (e) {}
        }
    }, [debouncedFiles, debouncedProjectName, autoSave]);


    // --- Core App Logic ---

    useEffect(() => {
        const savedTheme = localStorage.getItem('ai-studio-theme') as Theme | null;
        if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
            setTheme(savedTheme);
        } else {
            // If no theme is saved, default to 'dark' regardless of OS preference.
            // This aligns with the default `class="dark"` on the <html> tag.
            setTheme('dark');
        }
    }, []);

    useEffect(() => {
        let intervalId: number | undefined;

        const updateTheme = () => {
            if (theme === 'auto') {
                const currentHour = new Date().getHours();
                const isDay = currentHour >= 6 && currentHour < 18;
                setEffectiveTheme(isDay ? 'light' : 'dark');
            } else {
                setEffectiveTheme(theme);
            }
        };

        updateTheme();
        localStorage.setItem('ai-studio-theme', theme);

        if (theme === 'auto') {
            intervalId = window.setInterval(updateTheme, 5 * 60 * 1000);
        }

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [theme]);

    useEffect(() => {
        if (effectiveTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [effectiveTheme]);


    useEffect(() => {
        const handleKeyboard = (e: KeyboardEvent) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            undo();
          }
          if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
            e.preventDefault();
            redo();
          }
          if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            if (isAssistantVisible) {
                e.preventDefault();
                setIsAiHistoryVisible(true);
                setIsChatSearchVisible(v => !v);
            }
          }
           if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
             if (isAssistantVisible) {
                e.preventDefault();
                aiAssistantRef.current?.newChat();
             }
           }
        };
        window.addEventListener('keydown', handleKeyboard);
        return () => window.removeEventListener('keydown', handleKeyboard);
    }, [undo, redo, isAssistantVisible]);

    const toggleTheme = () => {
        setTheme(prevTheme => {
            if (prevTheme === 'light') return 'dark';
            if (prevTheme === 'dark') return 'auto';
            return 'light';
        });
    };

    const handleFileContentUpdate = useCallback((fileId: string, newContent: string) => {
        const newFiles = files.map(file =>
            file.id === fileId ? { ...file, content: newContent } : file
        );
        setFiles(newFiles);
        saveToHistory(newFiles);

        if (fileId === activeFileId) {
            setEditorContent(newContent);
        }
        addLog(`[AI] File content updated for ${activeFile?.path}.`);
    }, [files, activeFileId, activeFile?.path, addLog, saveToHistory]);

    useEffect(() => {
        setEditorContent(activeFile?.content ?? '');
    }, [activeFile]);

    useEffect(() => {
        if (editorContent === (activeFile?.content ?? '')) return;

        const saveTimeout = setTimeout(() => {
            if (activeFileId) {
                const newFiles = files.map(file =>
                    file.id === activeFileId ? { ...file, content: editorContent } : file
                );
                setFiles(newFiles);
                saveToHistory(newFiles);
            }
        }, 1500);

        return () => clearTimeout(saveTimeout);
    }, [editorContent, activeFileId, activeFile?.content, files, saveToHistory]);

    useEffect(() => {
        const init = async () => {
             addLog("Initializing bundler (esbuild-wasm)...");
             await bundler.initialize();
             addLog("Bundler ready.");
        };
        init();
        
        const handleServiceWorkerMessage = (event: MessageEvent) => {
            const { type, path } = event.data;
            if (type === 'GET_FILE') {
                const requestedFile = filesRef.current.find(f => f.path === path);
                const isBundleRequest = path.startsWith('/bundle') && buildResultRef.current;
                
                if (isBundleRequest) {
                     event.ports[0].postMessage({
                        found: true,
                        content: path.endsWith('.map') ? buildResultRef.current!.sourceMap : buildResultRef.current!.code,
                        mimeType: path.endsWith('.map') ? 'application/json' : 'application/javascript'
                    });
                } else if (requestedFile) {
                    event.ports[0].postMessage({
                        found: true,
                        content: requestedFile.content,
                        mimeType: requestedFile.language === 'html' ? 'text/html' : 'text/plain',
                    });
                } else {
                    event.ports[0].postMessage({ found: false });
                }
            }
        };
        
        navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
        return () => navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
    }, [addLog]);

    const handleProjectGenerated = useCallback((newFiles: Omit<ProjectFile, 'id' | 'language'>[]) => {
        const projectFiles: ProjectFile[] = newFiles.map((file, index) => ({
            ...file,
            id: `proj-${Date.now()}-${index}`,
            path: file.path.startsWith('/') ? file.path : `/${file.path}`,
            language: getMonacoLanguageForPath(file.path)
        }));
        setFiles(projectFiles);
        saveToHistory(projectFiles);
        setActiveFileId(projectFiles.find(f => f.path.includes('App') || f.path.includes('app'))?.id || projectFiles[0]?.id || null);
        addLog("New project scaffolded by AI.");
    }, [addLog, saveToHistory]);
    
    useEffect(() => {
        const build = async () => {
            if (!bundler.isInitialized() || debouncedFiles.length === 0) return;
            setBuildStatus('building');
            addLog("Bundling project...");
            
            const result = await bundler.bundle(debouncedFiles, '/index.tsx');
            
            if (result.errors.length > 0) {
                setBuildStatus('error');
                result.errors.forEach((err: any) => addLog(`[Build Error] ${err.text}`));
            } else {
                setBuildStatus('success');
                setBuildResult(result);
                setPreviewRefreshKey(k => k + 1);
                addLog("Build successful.");
            }
        };
        build();
    }, [debouncedFiles, addLog]);
    
    // --- Git Logic ---
    const fetchGitStatus = useCallback(async () => {
        try {
            const res = await fetch('/api/git/status');
            const data = await res.json();
            if (data.ok) {
                setGitState({ status: data.status, history: data.history });
            } else {
                addLog(`[Git Error] ${data.error}`);
            }
        } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to fetch status";
            addLog(`[Git Error] ${message}`);
        }
    }, [addLog]);

    const fetchProjectFiles = useCallback(async () => {
        try {
            addLog('[Sync] Fetching latest files from server...');
            const res = await fetch('/api/project/files');
            if (!res.ok) {
                const data = await res.json().catch(() => ({error: 'Unknown fetch error'}));
                throw new Error(data.error || `Server responded with ${res.status}`);
            }
            const data = await res.json();
            if (data.ok) {
                const newFiles: ProjectFile[] = data.files.map((file: { path: string; content: string }, index: number) => ({
                    id: `file-${Date.now()}-${index}`,
                    path: file.path,
                    content: file.content,
                    language: getMonacoLanguageForPath(file.path),
                }));
                setFiles(newFiles);
                saveToHistory(newFiles);
                addLog('[Sync] Project files refreshed successfully.');

                const currentActiveFile = filesRef.current.find(f => f.id === activeFileId);
                if (currentActiveFile) {
                    const updatedActiveFile = newFiles.find(f => f.path === currentActiveFile.path);
                    if (updatedActiveFile) {
                        setActiveFileId(updatedActiveFile.id);
                        setEditorContent(updatedActiveFile.content);
                    } else {
                        setActiveFileId(null);
                        setEditorContent('');
                    }
                }
            } else {
                addLog(`[Sync Error] ${data.error}`);
            }
        } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            addLog(`[Sync Error] Failed to fetch project files: ${message}`);
        }
    }, [addLog, saveToHistory, activeFileId]);

    useEffect(() => {
        fetchGitStatus();
        const interval = setInterval(fetchGitStatus, 5000);
        return () => clearInterval(interval);
    }, [fetchGitStatus]);

    useEffect(() => {
        if(debouncedFiles.length > 0) {
            fetchGitStatus();
        }
    }, [debouncedFiles, fetchGitStatus]);

    const handleGitAction = useCallback(async (endpoint: string, body: object, actionName: string) => {
        try {
            addLog(`[Git] Running ${actionName}...`);
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.ok) {
                addLog(`[Git] ${actionName} successful.`);
                if (data.stdout) addLog(data.stdout);
                if (data.stderr) addLog(data.stderr);
                if (actionName === 'Pull') {
                    await fetchProjectFiles();
                }
            } else {
                addLog(`[Git Error] ${actionName} failed: ${data.error}`);
            }
        } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            addLog(`[Git Error] ${actionName} failed: ${message}`);
        } finally {
            fetchGitStatus();
        }
    }, [addLog, fetchGitStatus, fetchProjectFiles]);


    const handleAddFile = (path: string) => {
        const newFile: ProjectFile = {
            id: `file-${Date.now()}`,
            path: path.startsWith('/') ? path : `/${path}`,
            content: '',
            language: getMonacoLanguageForPath(path),
        };
        const newFiles = [...files, newFile];
        setFiles(newFiles);
        saveToHistory(newFiles);
        setActiveFileId(newFile.id);
        addLog(`File created: ${path}`);
    };
    
    const handleAddFolder = (path: string) => {
        const folderPath = path.startsWith('/') ? path : `/${path}`;
        const placeholderPath = folderPath.endsWith('/') ? `${folderPath}.gitkeep` : `${folderPath}/.gitkeep`;
         const newFile: ProjectFile = {
            id: `file-${Date.now()}`,
            path: placeholderPath,
            content: '',
            language: 'plaintext',
        };
        const newFiles = [...files, newFile];
        setFiles(newFiles);
        saveToHistory(newFiles);
        addLog(`Folder created: ${path}`);
    };

    const handleMoveItem = (sourcePath: string, targetFolderPath: string) => {
        if (sourcePath === targetFolderPath || (targetFolderPath.startsWith(sourcePath) && sourcePath !== '/')) {
            addLog(`[Error] Invalid move: cannot move a folder into itself.`);
            return;
        }

        const sourceName = sourcePath.split('/').pop() || '';
        const isSourceFolder = files.some(f => f.path !== sourcePath && f.path.startsWith(sourcePath + '/'));

        const getNewPath = (currentPath: string) => {
            let newParentPath = targetFolderPath === '' ? '/' : targetFolderPath;
            if (!newParentPath.endsWith('/')) newParentPath += '/';
            if (currentPath === sourcePath) return `${newParentPath}${sourceName}`;
            if (isSourceFolder && currentPath.startsWith(sourcePath + '/')) {
                const relativePath = currentPath.substring(sourcePath.length);
                return `${newParentPath}${sourceName}${relativePath}`;
            }
            return currentPath;
        };

        const newFiles = files.map(file => {
            const newPath = getNewPath(file.path);
            return newPath !== file.path ? { ...file, path: newPath } : file;
        });
        setFiles(newFiles);
        saveToHistory(newFiles);
        addLog(`Moved '${sourceName}' to '${targetFolderPath || "root"}'`);
    };

    const handleExportZip = async () => {
        try {
            addLog("Zipping project files...");
            const blob = await exportToZip(files);
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${projectName.replace(/\s/g, '_') || 'ai-studio-project'}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href);
            addLog("Project exported successfully.");
        } catch (error) {
            addLog(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    };
    
    const processZipAndSetState = useCallback(async (file: File) => {
        try {
            addLog(`[Import] Processing ${file.name}...`);
            const importedFiles = await importFromZip(file);
            setFiles(importedFiles);
            saveToHistory(importedFiles);
            setActiveFileId(importedFiles.find(f => f.path.includes('App') || f.path.includes('app'))?.id || importedFiles[0]?.id || null);
            addLog(`[Import] Successfully imported ${importedFiles.length} files.`);
        } catch (error) {
            addLog(`[Import] Failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }, [addLog, saveToHistory]);

    const handleImportZip = useCallback(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.zip';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                processZipAndSetState(file);
            }
        };
        input.click();
    }, [processZipAndSetState]);

    const handleImportFromGithub = useCallback(async () => {
        const repoUrl = prompt("Enter GitHub repository URL:", "https://github.com/google/aistudio");
        if (!repoUrl) return;

        const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
        if (!match) {
            addLog("[GitHub] Invalid URL. Please use a format like https://github.com/owner/repo");
            return;
        }

        const [, owner, repo] = match;
        addLog(`[GitHub] Fetching repository: ${owner}/${repo}...`);

        const fetchRepo = async (branch: string) => {
            const url = `https://github.com/${owner}/${repo}/archive/refs/heads/${branch}.zip`;
            addLog(`[GitHub] Trying branch '${branch}'...`);
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${branch} branch (status: ${response.status})`);
            }
            return response.blob();
        };

        try {
            let blob;
            try {
                blob = await fetchRepo('main');
            } catch (e) {
                addLog(`[GitHub] 'main' branch not found, trying 'master'...`);
                blob = await fetchRepo('master');
            }
            
            const zipFile = new File([blob], `${repo}.zip`, { type: 'application/zip' });
            await processZipAndSetState(zipFile);

        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            addLog(`[GitHub] Failed to import repository: ${message}`);
        }
    }, [addLog, processZipAndSetState]);

    const handleImportFromFilesystem = async () => {
        try {
            // @ts-ignore
            if (!window.showOpenFilePicker) {
                addLog('[Error] Your browser does not support the File System Access API for opening files.');
                return;
            }

            // @ts-ignore
            const fileHandles = await window.showOpenFilePicker({ multiple: true });
            
            addLog(`[Import] Loading ${fileHandles.length} file(s) from your local filesystem...`);
            
            const currentFiles = [...filesRef.current]; // Create a mutable copy from the ref
            let filesAdded = 0;
            let filesUpdated = 0;
            let lastAddedFileId: string | null = null;

            for (const handle of fileHandles) {
                const file = await handle.getFile();
                const content = await file.text();
                // Add files to the root of the project for simplicity
                const path = `/${file.name}`;

                const existingFileIndex = currentFiles.findIndex(f => f.path === path);

                if (existingFileIndex > -1) {
                    // Update existing file
                    const existingFile = currentFiles[existingFileIndex];
                    currentFiles[existingFileIndex] = { ...existingFile, content };
                    filesUpdated++;
                     if (existingFile.id === activeFileId) {
                        setEditorContent(content); // Ensure editor updates if active file is changed
                    }
                } else {
                    // Add new file
                    const newFile: ProjectFile = {
                        id: `fs-import-${Date.now()}-${file.name}`,
                        path,
                        content,
                        language: getMonacoLanguageForPath(path),
                    };
                    currentFiles.push(newFile);
                    filesAdded++;
                    lastAddedFileId = newFile.id;
                }
            }
            
            setFiles(currentFiles);
            saveToHistory(currentFiles);
            // Set the last added file as the active one to give immediate feedback
            if (lastAddedFileId) {
                setActiveFileId(lastAddedFileId);
            }
            addLog(`[Import] Complete. Added: ${filesAdded}, Updated: ${filesUpdated}.`);

        } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') {
                 addLog('[Import] File selection cancelled.');
            } else {
                 const message = err instanceof Error ? err.message : String(err);
                 addLog(`[Import] Failed to import from filesystem: ${message}`);
            }
        }
    };

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };
    
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);

        const droppedFiles = e.dataTransfer.files;
        if (droppedFiles && droppedFiles.length === 1 && droppedFiles[0].name.endsWith('.zip')) {
            processZipAndSetState(droppedFiles[0]);
        } else {
            addLog("Import failed: Please drop a single .zip file.");
        }
    }, [processZipAndSetState, addLog]);
    
     const handleZipFileDropped = useCallback(async (file: File) => {
        const newProjectName = file.name.replace(/\.zip$/i, '');
        setProjectName(newProjectName);
        addLog(`[Import] Unpacking ${file.name} and setting project name...`);
        await processZipAndSetState(file);
    }, [processZipAndSetState, addLog]);

    const handleScaffoldProject = useCallback(() => {
        const pathPrefix = prompt("Enter a base path for the new project:", "/new-project/");
        if (!pathPrefix) return;

        const cleanPrefix = pathPrefix.startsWith('/') ? pathPrefix : `/${pathPrefix}`;
        const finalPrefix = cleanPrefix.endsWith('/') ? cleanPrefix : `${cleanPrefix}/`;
        const projectName = finalPrefix.split('/').filter(Boolean).pop() || 'new-project';

        const scaffoldFiles: Omit<ProjectFile, 'id' | 'language'>[] = [
            { path: `${finalPrefix}index.html`, content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
  <link rel="stylesheet" href="src/style.css">
</head>
<body>
  <h1>Hello from ${projectName}!</h1>
  <div id="app"></div>
  <script type="module" src="src/main.js"></script>
</body>
</html>` },
            { path: `${finalPrefix}src/main.js`, content: `document.getElementById('app').textContent = 'This project was scaffolded in AI Studio.';` },
            { path: `${finalPrefix}src/style.css`, content: `body { font-family: sans-serif; padding: 2em; }` },
            { path: `${finalPrefix}package.json`, content: JSON.stringify({ name: projectName, private: true, version: "0.0.1" }, null, 2) },
        ];

        const newProjectFiles: ProjectFile[] = scaffoldFiles.map((file, index) => ({
            ...file,
            id: `scaffold-${Date.now()}-${index}`,
            language: getMonacoLanguageForPath(file.path)
        }));

        const updatedFiles = [...files, ...newProjectFiles];
        setFiles(updatedFiles);
        saveToHistory(updatedFiles);
        setActiveFileId(newProjectFiles[0]?.id || null);
        addLog(`[Scaffold] Created new project structure at ${finalPrefix}`);
    }, [files, addLog, saveToHistory]);
    
    const compileAndRunBackend = async (language: 'java' | 'cpp' | 'rust', file: ProjectFile) => {
        setIsTerminalVisible(true);
        addLog(`[${language}] Compiling and running ${file.path}...`);
        try {
            const res = await fetch('/api/compile-run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ language, path: file.path, code: file.content }),
            });
            const data = await res.json();
            
            if (data.logs) addLog(`[${language} logs]\n${data.logs}`);
            if (data.error) addLog(`[${language} Error] ${data.error}`);
            if (data.output) addLog(`[${language} output]\n${data.output}`);
            else if (!data.error) addLog(`[${language}] Execution finished with no output.`);

        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            addLog(`[${language} Failure] ${message}`);
        }
    };

    const handleRun = async () => {
        const stack = activeFile ? getStackForPath(activeFile.path) : 'other';

        switch (stack) {
            case 'react':
            case 'vanilla':
            case 'css':
            case 'tailwind':
            case 'html':
                setIsPreviewVisible(true);
                setPreviewMode(PreviewMode.Sandbox);
                addLog("[Sandbox] Preview activated. Hot-reloading is enabled on file changes.");
                break;
            case 'python':
                setIsPreviewVisible(true);
                setPreviewMode(PreviewMode.Python);
                addLog("[Python] Switched to Python runtime. Press 'Run Active File' in the Preview panel to execute.");
                break;
            case 'java':
            case 'cpp':
            case 'rust':
                if (activeFile) {
                    await compileAndRunBackend(stack, activeFile);
                } else {
                     addLog("[Error] No active file to run.");
                }
                break;
            default:
                 if (activeFile) {
                    addLog(`[Runner] No runtime available for file type: ${activeFile.path}`);
                 } else {
                    addLog("[Error] No active file to run.");
                 }
                setIsTerminalVisible(true);
        }
    };
    
    const handleSaveProject = useCallback(() => addLog('[App] Action: Save project snapshot.'), [addLog]);
    const handleCopyProject = useCallback(() => {
        addLog('[App] Action: Copying project as ZIP...');
        handleExportZip();
    }, [handleExportZip, addLog]);
    const handleDeployProject = useCallback(() => addLog('[App] Action: Deploy project.'), [addLog]);
    const handleShareProject = useCallback(() => addLog('[App] Action: Share project link.'), [addLog]);

    const handleHighlightPanel = useCallback((panel: HighlightedPanel) => {
        setHighlightedPanel(current => (current === panel ? null : panel));
    }, []);

    const handleSettingsClick = useCallback(() => {
        if (highlightedPanel) {
            setSettingsModalFor(highlightedPanel);
        } else {
            addLog('[App] Action: Manage API key (default settings).');
            // Placeholder for a global settings modal if needed
        }
    }, [highlightedPanel, addLog]);

    const toggleActivityBar = () => setIsActivityBarVisible(v => !v);
    const toggleLeftPanel = () => setIsLeftPanelVisible(v => !v);

    const handleLeftTabChange = (tab: LeftPanelTab) => {
        if (isLeftPanelVisible && activeLeftTab === tab) {
            setIsLeftPanelVisible(false);
        } else {
            setActiveLeftTab(tab);
            setIsLeftPanelVisible(true);
        }
    };

    const renderPreviewPanel = () => {
        switch (previewMode) {
            case PreviewMode.Sandbox:
                return <Preview previewUrl={`${PREVIEW_ORIGIN}/index.html`} refreshKey={previewRefreshKey} />;
            case PreviewMode.Host:
                return <LiveDeploy files={files} addLog={addLog} />;
            case PreviewMode.Python:
                return <PythonPanel activeFile={activeFile} projectFiles={files} />;
            default:
                return null;
        }
    }

    const panelNameMap: Record<HighlightedPanel, string> = {
        explorer: "File Explorer",
        assistant: "AI Assistant",
        preview: "Preview",
        terminal: "Terminal"
    };

    return (
        <div 
            className="h-screen w-screen flex flex-col bg-neutral-200 dark:bg-neutral-950 overflow-hidden relative"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {settingsModalFor && (
                <SettingsModal 
                    panelName={panelNameMap[settingsModalFor]} 
                    onClose={() => setSettingsModalFor(null)} 
                />
            )}
            <Toolbar 
                projectName={projectName}
                onProjectNameChange={setProjectName}
                onUndo={undo}
                onRedo={redo}
                canUndo={historyIndex > 0}
                canRedo={historyIndex < history.length - 1}
                buildStatus={buildStatus}
                theme={theme}
                onToggleTheme={toggleTheme}
                onToggleActivityBar={toggleActivityBar}
            />
            <div className="flex flex-grow min-h-0">
                {isActivityBarVisible && (
                    <ActivityBar
                        activeLeftTab={activeLeftTab}
                        onTabChange={handleLeftTabChange}
                        isAssistantVisible={isAssistantVisible}
                        onToggleAssistant={() => setIsAssistantVisible(v => !v)}
                        isPreviewVisible={isPreviewVisible}
                        onTogglePreview={() => setIsPreviewVisible(v => !v)}
                        isTerminalVisible={isTerminalVisible}
                        onToggleTerminal={() => setIsTerminalVisible(v => !v)}
                        onRun={handleRun}
                        onImportZip={handleImportZip}
                        onExportZip={handleExportZip}
                        onImportGithub={handleImportFromGithub}
                        onSaveProject={handleSaveProject}
                        onCopyProject={handleCopyProject}
                        onDeployProject={handleDeployProject}
                        onShareProject={handleShareProject}
                        onSettingsClick={handleSettingsClick}
                    />
                )}
                <PanelGroup direction="horizontal" className="flex-grow">
                    {isLeftPanelVisible && (
                        <>
                            <Panel defaultSize={20} minSize={15}>
                                <div className="flex-grow h-full min-w-0">
                                    {activeLeftTab === 'files' && (
                                        <FileExplorer
                                            files={files}
                                            activeFileId={activeFileId}
                                            onSelectFile={setActiveFileId}
                                            onAddFile={handleAddFile}
                                            onAddFolder={handleAddFolder}
                                            onMoveItem={handleMoveItem}
                                            onImportFromFilesystem={handleImportFromFilesystem}
                                            onToggleVisibility={toggleLeftPanel}
                                            isHighlighted={highlightedPanel === 'explorer'}
                                            onHighlight={() => handleHighlightPanel('explorer')}
                                        />
                                    )}
                                    {activeLeftTab === 'git' && (
                                        <GitPanel
                                            gitState={gitState}
                                            onStage={(files) => handleGitAction('/api/git/add', { files }, 'Stage')}
                                            onUnstage={(files) => handleGitAction('/api/git/unstage', { files }, 'Unstage')}
                                            onCommit={(message) => handleGitAction('/api/git/commit', { message }, 'Commit')}
                                            onPush={() => handleGitAction('/api/git/push', {}, 'Push')}
                                            onPull={() => handleGitAction('/api/git/pull', {}, 'Pull')}
                                        />
                                    )}
                                </div>
                            </Panel>
                            <PanelResizeHandle className="w-1 bg-neutral-200 dark:bg-neutral-800 hover:bg-indigo-600 dark:hover:bg-indigo-600 transition-colors duration-200 focus:outline-none focus:bg-indigo-600" />
                        </>
                    )}
                    <Panel defaultSize={50} minSize={30}>
                        <div className="relative h-full w-full dark:bg-neutral-900">
                            {activeFile ? (
                                <div className="absolute inset-0">
                                    <Editor
                                        key={activeFile.id}
                                        filePath={activeFile.path}
                                        language={activeFile.language}
                                        value={editorContent}
                                        onChange={setEditorContent}
                                        theme={effectiveTheme}
                                    />
                                </div>
                            ) : (
                                <div className="w-full h-full dark:bg-neutral-900 flex items-center justify-center text-neutral-500">
                                    Select a file to start coding
                                </div>
                            )}
                        </div>
                    </Panel>
                    {isAnyRightPanelVisible && (
                       <>
                        <PanelResizeHandle className="w-1 bg-neutral-200 dark:bg-neutral-800 hover:bg-indigo-600 dark:hover:bg-indigo-600 transition-colors duration-200 focus:outline-none focus:bg-indigo-600" />
                        <Panel defaultSize={30} minSize={20}>
                            <PanelGroup direction="vertical">
                                {isAssistantVisible && (
                                    <Panel minSize={20}>
                                        <div className="w-full h-full flex flex-col bg-neutral-100 dark:bg-neutral-950">
                                            <PanelHeader
                                                title="AI Assistant"
                                                icon="ai"
                                                isHighlighted={highlightedPanel === 'assistant'}
                                                onHighlight={() => handleHighlightPanel('assistant')}
                                                onClose={() => setIsAssistantVisible(false)}
                                                onDoubleClick={handleToggleChatSearch}
                                            />
                                            <div className="flex-grow min-h-0">
                                                <AIAssistant 
                                                    ref={aiAssistantRef}
                                                    projectFiles={files} 
                                                    activeFile={activeFile} 
                                                    onProjectGenerated={handleProjectGenerated} 
                                                    onFileContentUpdate={handleFileContentUpdate} 
                                                    onZipFileDropped={handleZipFileDropped} 
                                                    onScaffoldProject={handleScaffoldProject} 
                                                    addLog={addLog} 
                                                    onImportFromFilesystem={handleImportFromFilesystem}
                                                    isHistoryVisible={isAiHistoryVisible}
                                                    setIsHistoryVisible={setIsAiHistoryVisible}
                                                    isChatSearchVisible={isChatSearchVisible}
                                                    setIsChatSearchVisible={setIsChatSearchVisible}
                                                />
                                            </div>
                                        </div>
                                    </Panel>
                                )}
                                {isAssistantVisible && (isPreviewVisible || isTerminalVisible) && <PanelResizeHandle className="h-1 bg-neutral-200 dark:bg-neutral-800 hover:bg-indigo-600 dark:hover:bg-indigo-600 transition-colors duration-200 focus:outline-none focus:bg-indigo-600" />}
                                {isPreviewVisible && (
                                    <Panel minSize={20}>
                                        <div className="w-full h-full flex flex-col bg-neutral-100 dark:bg-neutral-950">
                                            <PanelHeader
                                                title="Preview"
                                                icon="preview"
                                                isHighlighted={highlightedPanel === 'preview'}
                                                onHighlight={() => handleHighlightPanel('preview')}
                                                onClose={() => setIsPreviewVisible(false)}
                                                onDoubleClick={() => setIsPreviewOptionsVisible(v => !v)}
                                            >
                                                {isPreviewOptionsVisible && (
                                                    <PreviewModeToggle mode={previewMode} onChange={setPreviewMode} />
                                                )}
                                            </PanelHeader>
                                            <div className="flex-grow min-h-0 bg-neutral-100 dark:bg-neutral-900">
                                               {renderPreviewPanel()}
                                            </div>
                                        </div>
                                    </Panel>
                                )}
                                {isPreviewVisible && isTerminalVisible && <PanelResizeHandle className="h-1 bg-neutral-200 dark:bg-neutral-800 hover:bg-indigo-600 dark:hover:bg-indigo-600 transition-colors duration-200 focus:outline-none focus:bg-indigo-600" />}
                                {isTerminalVisible && (
                                    <Panel minSize={15}>
                                         <div className="w-full h-full flex flex-col bg-neutral-100 dark:bg-neutral-950">
                                            <PanelHeader
                                                title="Terminal"
                                                icon="terminal"
                                                isHighlighted={highlightedPanel === 'terminal'}
                                                onHighlight={() => handleHighlightPanel('terminal')}
                                                onClose={() => setIsTerminalVisible(false)}
                                            />
                                            <div className="flex-grow min-h-0">
                                                <Terminal logs={logs} />
                                            </div>
                                        </div>
                                    </Panel>
                                )}
                            </PanelGroup>
                        </Panel>
                       </>
                    )}
                </PanelGroup>
            </div>
             {isDraggingOver && (
                <div className="absolute inset-0 bg-neutral-950 bg-opacity-75 flex items-center justify-center pointer-events-none z-50 transition-opacity">
                    <div className="w-11/12 h-5/6 border-4 border-dashed border-neutral-500 rounded-lg flex flex-col items-center justify-center text-white p-8 text-center">
                        <Icon icon="upload" className="w-20 h-20 mb-6 text-neutral-400" />
                        <h2 className="text-3xl font-bold">Drop your .zip file to import</h2>
                        <p className="text-lg mt-2 text-neutral-400">The current project will be replaced.</p>
                    </div>
                </div>
            )}
        </div>
    );
}