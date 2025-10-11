import React, { useEffect, useRef, useState } from 'react';
import { PyRuntime } from '../python/PyRuntime.ts';
import { ProjectFile } from '../types.ts';
import { Icon } from './Icon.tsx';

interface PythonPanelProps {
    activeFile: ProjectFile | undefined;
    projectFiles: ProjectFile[];
}

export const PythonPanel: React.FC<PythonPanelProps> = ({ activeFile, projectFiles }) => {
  const [ready, setReady] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [pkgs, setPkgs] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const rtRef = useRef<PyRuntime | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rt = new PyRuntime(
      (line) => setLogs(prev => [...prev.slice(-500), line]),
      () => {
          setReady(true);
          setLogs(prev => [...prev, '[STATUS] Pyodide Ready.']);
      }
    );
    rtRef.current = rt;
    return () => { 
        rt.stop(); 
        rtRef.current = null; 
    };
  }, []);
  
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const run = async () => {
    if (!activeFile || !rtRef.current || activeFile.language !== 'python') return;
    
    setIsRunning(true);
    setLogs(prev => [...prev, `[RUN] Executing ${activeFile.path}...`]);

    const filesToSync = projectFiles.reduce((acc, file) => {
        // Path for pyodide should be relative, without leading '/'
        const pyodidePath = file.path.startsWith('/') ? file.path.substring(1) : file.path;
        acc[pyodidePath] = file.content;
        return acc;
    }, {} as Record<string, string>);

    await rtRef.current.run(activeFile.content, filesToSync);
    setIsRunning(false);
  };

  const install = async () => {
    const list = pkgs.split(/\s+/).map(s => s.trim()).filter(Boolean);
    if (list.length === 0 || !rtRef.current) return;
    setIsRunning(true);
    await rtRef.current.install(list);
    setIsRunning(false);
    setPkgs('');
  };

  const resetFS = async () => {
    if (!rtRef.current) return;
    await rtRef.current.resetFS();
  };

  const stop = () => {
    if (!rtRef.current) return;
    rtRef.current.stop();
    setIsRunning(false);
    setLogs(prev => [...prev, '[STOP] Termination signal sent.']);
  };

  const canRun = activeFile?.language === 'python';

  return (
    <div className="w-full h-full flex flex-col bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-300">
        <div className="flex flex-wrap items-center gap-2 p-2 bg-neutral-100 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
            {/* Run controls */}
            <button onClick={run} disabled={!ready || !canRun || isRunning} className="flex items-center space-x-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-neutral-500 dark:disabled:bg-neutral-600 disabled:cursor-not-allowed rounded-md transition-colors duration-200 text-sm font-semibold text-white">
                <Icon icon="play" className="w-4 h-4" /><span>Run Active File</span>
            </button>
            <button onClick={stop} disabled={!isRunning} className="flex items-center space-x-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-neutral-500 dark:disabled:bg-neutral-600 disabled:cursor-not-allowed rounded-md transition-colors duration-200 text-sm font-semibold text-white">
               <Icon icon="terminal" className="w-4 h-4 transform rotate-45"/><span>Stop</span>
            </button>
             <button onClick={resetFS} disabled={!ready || isRunning} className="flex items-center space-x-2 px-3 py-1.5 bg-neutral-300 dark:bg-neutral-700 hover:bg-neutral-400 dark:hover:bg-neutral-600 disabled:bg-neutral-500 dark:disabled:bg-neutral-600 rounded-md transition-colors duration-200 text-sm">
                <span>Reset FS</span>
            </button>
            <div className="flex-grow min-w-[200px] flex items-center space-x-2">
                 <input
                  placeholder="Packages to install, e.g. numpy pandas"
                  value={pkgs}
                  onChange={e => setPkgs(e.target.value)}
                  disabled={!ready || isRunning}
                  className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                />
                <button onClick={install} disabled={!ready || !pkgs.trim() || isRunning} className="flex items-center space-x-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-neutral-500 dark:disabled:bg-neutral-600 rounded-md transition-colors duration-200 text-sm font-semibold text-white">
                    <span>Install</span>
                </button>
            </div>
            <div className="text-xs font-mono text-neutral-500 dark:text-neutral-400 w-full text-right truncate">
                {ready ? (canRun ? `Target: ${activeFile?.path}` : 'Select a Python file') : 'Pyodide: loading…'}
            </div>
        </div>
        <div className="flex-grow bg-neutral-50 dark:bg-neutral-900 text-black dark:text-neutral-200 font-mono text-xs p-2 overflow-y-auto" style={{minHeight: 0}}>
           {logs.map((log, i) => <div key={i} className="whitespace-pre-wrap">{log}</div>)}
           <div ref={logsEndRef} />
        </div>
    </div>
  );
};