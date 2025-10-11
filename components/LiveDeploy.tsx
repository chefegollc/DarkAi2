import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ProjectFile } from '../types.ts';
import { Icon } from './Icon.tsx';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

interface LiveDeployProps {
    files: ProjectFile[];
    addLog: (message: string) => void;
}

interface HostState {
    status: 'idle' | 'installing' | 'starting' | 'running' | 'error' | 'stopping';
    port: number | null;
    logs: string[];
    running: boolean;
}

export const LiveDeploy: React.FC<LiveDeployProps> = ({ files, addLog }) => {
    const [hostState, setHostState] = useState<HostState>({ status: 'idle', port: null, logs: [], running: false });
    const [iframeKey, setIframeKey] = useState(Date.now());
    const eventSourceRef = useRef<EventSource | null>(null);
    const logsEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    useEffect(scrollToBottom, [hostState.logs]);

    const handleApiResponse = async (res: Response, context: string) => {
        if (!res.ok) {
            const { error } = await res.json();
            throw new Error(`[${context}] Failed: ${error}`);
        }
        return res.json();
    };

    const disconnectLogs = () => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
    };

    const connectLogs = useCallback(() => {
        disconnectLogs();
        eventSourceRef.current = new EventSource('/api/host/logs');
        eventSourceRef.current.addEventListener('tick', (ev) => {
            const payload = JSON.parse(ev.data);
            setHostState(s => ({ ...s, ...payload }));
        });
        eventSourceRef.current.onerror = () => {
            console.error('SSE connection error. Retrying...');
        };
    }, []);

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await fetch('/api/host/status');
                const data = await handleApiResponse(res, 'Status Check');
                setHostState(data);
                if (data.running) connectLogs();
            } catch (error) { /* Ignore initial fetch error */ }
        };
        checkStatus();
        return disconnectLogs;
    }, [connectLogs]);

    const startHost = async () => {
        try {
            addLog('[Host] Syncing project files to server...');
            const syncRes = await fetch('/api/project/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ files }),
            });
            await handleApiResponse(syncRes, 'Project Sync');
            addLog('[Host] Starting host...');

            const startRes = await fetch('/api/host/start', { method: 'POST' });
            await handleApiResponse(startRes, 'Host Start');
            
            connectLogs();
            setIframeKey(Date.now());
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            addLog(`[Host Error] ${message}`);
            setHostState(s => ({ ...s, status: 'error' }));
        }
    };

    const stopHost = async () => {
        addLog('[Host] Stopping host...');
        disconnectLogs();
        try {
            const res = await fetch('/api/host/stop', { method: 'POST' });
            await handleApiResponse(res, 'Host Stop');
            setHostState({ status: 'idle', port: null, logs: [], running: false });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            addLog(`[Host Error] ${message}`);
        }
    };
    
    const isBusy = ['installing', 'starting', 'stopping'].includes(hostState.status);
    const isRunning = hostState.status === 'running';

    return (
        <div className="w-full h-full flex flex-col bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-300">
            <div className="flex items-center justify-between p-2 bg-neutral-100 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center space-x-3">
                    <button onClick={startHost} disabled={isRunning || isBusy} className="flex items-center space-x-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-neutral-500 dark:disabled:bg-neutral-600 disabled:cursor-not-allowed rounded-md transition-colors duration-200 text-sm font-semibold text-white">
                        <Icon icon="play" className="w-4 h-4" /><span>Start Host</span>
                    </button>
                    <button onClick={stopHost} disabled={!isRunning && !isBusy} className="flex items-center space-x-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-neutral-500 dark:disabled:bg-neutral-600 disabled:cursor-not-allowed rounded-md transition-colors duration-200 text-sm font-semibold text-white">
                        <Icon icon="terminal" className="w-4 h-4 transform rotate-45"/><span>Stop Host</span>
                    </button>
                </div>
                <div className="text-sm font-mono capitalize">
                    Status: <span className={isRunning ? 'text-green-500 dark:text-green-400' : 'text-yellow-500 dark:text-yellow-400'}>{hostState.status}</span>
                    {isRunning && hostState.port && ` on port ${hostState.port}`}
                </div>
            </div>
            <div className="flex-grow flex flex-col min-h-0">
                <PanelGroup direction="vertical">
                    <Panel defaultSize={60} minSize={20}>
                        <div className="w-full h-full bg-neutral-50 dark:bg-black">
                            {isRunning ? (
                               <iframe key={iframeKey} src="/_host/" title="Live Host Preview" className="w-full h-full border-none" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-900 text-neutral-500">
                                    Host is not running.
                                </div>
                            )}
                        </div>
                    </Panel>
                    <PanelResizeHandle className="h-1 bg-neutral-200 dark:bg-neutral-800 hover:bg-indigo-600 dark:hover:bg-indigo-600 transition-colors duration-200 focus:outline-none focus:bg-indigo-600" />
                    <Panel defaultSize={40} minSize={15} collapsible>
                        <div className="w-full h-full bg-neutral-50 dark:bg-neutral-900 text-black dark:text-neutral-200 font-mono text-xs p-2 overflow-y-auto">
                           {hostState.logs.slice(-500).map((log, i) => <div key={i} className="whitespace-pre-wrap">{log}</div>)}
                           <div ref={logsEndRef} />
                        </div>
                    </Panel>
                </PanelGroup>
            </div>
        </div>
    );
};