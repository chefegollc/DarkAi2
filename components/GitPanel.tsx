import React, { useState } from 'react';
import { Icon } from './Icon.tsx';

interface GitStatusFile {
    path: string;
    staged: string;
    unstaged: string;
}

interface GitStatus {
    branch: string;
    remote: string | null;
    tracking: string | null;
    staged: GitStatusFile[];
    unstaged: GitStatusFile[];
}

interface GitCommit {
    hash: string;
    author: string;
    date: string;
    message: string;
}

export interface GitState {
    status: GitStatus | null;
    history: GitCommit[];
}

interface GitPanelProps {
    gitState: GitState;
    onStage: (files: string[]) => void;
    onUnstage: (files: string[]) => void;
    onCommit: (message: string) => void;
    onPush: () => void;
    onPull: () => void;
}

const GitFileStatus: React.FC<{ file: GitStatusFile, onStage?: () => void, onUnstage?: () => void }> = ({ file, onStage, onUnstage }) => {
    const statusMap: { [key: string]: { text: string, color: string } } = {
        'M': { text: 'M', color: 'text-yellow-400' },
        'A': { text: 'A', color: 'text-green-400' },
        'D': { text: 'D', color: 'text-red-400' },
        'R': { text: 'R', color: 'text-blue-400' },
        'C': { text: 'C', color: 'text-purple-400' },
        '?': { text: 'U', color: 'text-cyan-400' },
    };
    
    const getStatus = (char: string) => statusMap[char] || { text: char, color: 'text-neutral-400' };
    const displayStatus = getStatus(onStage ? file.unstaged.trim() : file.staged.trim());

    return (
        <div className="flex items-center justify-between text-sm px-2 py-1.5 rounded-md hover:bg-neutral-800/50 group">
            <span className="truncate">{file.path}</span>
            <div className="flex items-center space-x-2">
                 <span className={`font-mono text-xs font-bold w-4 h-4 flex items-center justify-center rounded-sm ${displayStatus.color}`}>{displayStatus.text}</span>
                 {onStage && <button onClick={onStage} title="Stage Changes" className="opacity-0 group-hover:opacity-100 transition-opacity"><Icon icon="plus" className="w-4 h-4" /></button>}
                 {onUnstage && <button onClick={onUnstage} title="Unstage Changes" className="opacity-0 group-hover:opacity-100 transition-opacity"><Icon icon="undo" className="w-4 h-4 transform scale-x-[-1]" /></button>}
            </div>
        </div>
    );
};


export const GitPanel: React.FC<GitPanelProps> = ({ gitState, onStage, onUnstage, onCommit, onPush, onPull }) => {
    const [commitMessage, setCommitMessage] = useState('');

    const handleCommit = () => {
        if (!commitMessage.trim() || !gitState.status?.staged.length) return;
        onCommit(commitMessage);
        setCommitMessage('');
    };

    const stageAll = () => {
        if (gitState.status?.unstaged.length) {
            onStage(gitState.status.unstaged.map(f => f.path));
        }
    };
    
    const unstageAll = () => {
        if (gitState.status?.staged.length) {
            onUnstage(gitState.status.staged.map(f => f.path));
        }
    };


    if (!gitState.status) {
        return (
            <div className="w-full h-full bg-neutral-100 dark:bg-neutral-900 text-neutral-500 flex items-center justify-center p-4">
                Loading Git status...
            </div>
        );
    }
    
    const { status, history } = gitState;

    return (
        <div className="w-full h-full bg-neutral-100 dark:bg-neutral-900 flex flex-col text-neutral-300">
            <div className="p-2 border-b border-neutral-800 flex-shrink-0">
                <div className="px-2 pb-2 text-xs font-medium uppercase tracking-wider text-neutral-400">Source Control</div>
                <div className="flex items-center justify-between text-sm p-2 bg-neutral-800/50 rounded-md">
                   <div className="flex items-center space-x-2">
                        <Icon icon="git" className="w-4 h-4" />
                        <span className="font-semibold">{status.branch}</span>
                        {status.tracking && <span className="text-xs text-neutral-400">{status.tracking}</span>}
                   </div>
                   <div className="flex items-center space-x-2">
                        <button onClick={onPull} title="Pull"><Icon icon="download" className="w-5 h-5" /></button>
                        <button onClick={onPush} title="Push"><Icon icon="upload" className="w-5 h-5" /></button>
                   </div>
                </div>
            </div>

            <div className="flex-grow overflow-y-auto p-2 text-sm">
                {/* Commit Section */}
                <div className="mb-4">
                    <textarea
                        value={commitMessage}
                        onChange={(e) => setCommitMessage(e.target.value)}
                        placeholder="Commit message"
                        rows={3}
                        className="w-full bg-neutral-800 border border-neutral-700 rounded-md p-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-neutral-200"
                    />
                    <button 
                        onClick={handleCommit} 
                        disabled={!commitMessage.trim() || status.staged.length === 0}
                        className="w-full mt-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-neutral-600 disabled:cursor-not-allowed rounded-md transition-colors text-sm font-semibold text-white"
                    >
                        Commit
                    </button>
                </div>

                {/* Staged Changes */}
                {status.staged.length > 0 && (
                    <div className="mb-4">
                        <div className="flex justify-between items-center px-2 mb-1">
                            <h3 className="font-semibold text-xs uppercase tracking-wider">Staged Changes</h3>
                            <button onClick={unstageAll} title="Unstage All Changes"><Icon icon="undo" className="w-4 h-4 transform scale-x-[-1]" /></button>
                        </div>
                        {status.staged.map(file => (
                            <GitFileStatus key={file.path} file={file} onUnstage={() => onUnstage([file.path])} />
                        ))}
                    </div>
                )}

                {/* Unstaged Changes */}
                {status.unstaged.length > 0 && (
                     <div>
                        <div className="flex justify-between items-center px-2 mb-1">
                            <h3 className="font-semibold text-xs uppercase tracking-wider">Changes</h3>
                            <button onClick={stageAll} title="Stage All Changes"><Icon icon="plus" className="w-4 h-4" /></button>
                        </div>
                        {status.unstaged.map(file => (
                            <GitFileStatus key={file.path} file={file} onStage={() => onStage([file.path])} />
                        ))}
                    </div>
                )}
                
                 {/* History Log */}
                {history.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-neutral-800">
                        <h3 className="font-semibold text-xs uppercase tracking-wider px-2 mb-2">History</h3>
                        <div className="space-y-2">
                           {history.map(commit => (
                                <div key={commit.hash} className="px-2 py-1.5 text-xs">
                                    <div className="flex justify-between items-baseline">
                                        <p className="font-semibold text-neutral-200 truncate pr-2" title={commit.message}>{commit.message}</p>
                                        <p className="font-mono text-neutral-500 flex-shrink-0">{commit.hash}</p>
                                    </div>
                                    <div className="flex justify-between text-neutral-400">
                                        <p>{commit.author}</p>
                                        <p>{commit.date}</p>
                                    </div>
                                </div>
                           ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};