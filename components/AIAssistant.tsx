import React, { useState, useRef, useEffect, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react';
import { ChatMessage, ProjectFile, ChatSession, ChatAction } from '../types.ts';
import { generateProjectFromPrompt, streamCodeAssistance, refactorCode, analyzeCodeForImprovements, generateFileDescription, spellCheckAndCorrect } from '../services/geminiService.ts';
import { Icon } from './Icon.tsx';
import { useSpeech } from '../hooks/useSpeech.ts';

const LoadingBubble: React.FC = () => (
    <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-neutral-500 dark:bg-neutral-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-neutral-500 dark:bg-neutral-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-neutral-500 dark:bg-neutral-400 rounded-full animate-pulse"></div>
    </div>
);

const HighlightedText: React.FC<{ text: string; highlight: string; }> = ({ text, highlight }) => {
    if (!highlight.trim()) {
        return <>{text}</>;
    }
    const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedHighlight})`, 'gi');
    const parts = text.split(regex);
    return (
        <>
            {parts.map((part, i) =>
                part.toLowerCase() === highlight.toLowerCase() ? (
                    <mark key={i} className="bg-yellow-400 text-black rounded px-0.5">
                        {part}
                    </mark>
                ) : (
                    part
                )
            )}
        </>
    );
};

const SessionHistoryItem: React.FC<{
  session: ChatSession;
  isActive: boolean;
  onSelect: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onExport: (session: ChatSession) => void;
  onCopy: (session: ChatSession) => void;
}> = ({ session, isActive, onSelect, onRename, onDelete, onExport, onCopy }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(session.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(session.name);
  }, [session.name]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleRename = () => {
    if (name.trim() && name.trim() !== session.name) {
      onRename(session.id, name.trim());
    } else {
      setName(session.name);
    }
    setIsEditing(false);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleRename();
    if (e.key === 'Escape') {
      setName(session.name);
      setIsEditing(false);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${session.name}"?`)) {
        onDelete(session.id);
    }
  };

  const handleExportClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onExport(session);
  };

  const handleCopyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCopy(session);
  };

  return (
    <div
      onClick={() => onSelect(session.id)}
      onDoubleClick={() => setIsEditing(true)}
      className={`group flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors ${isActive ? 'bg-indigo-600/30' : 'hover:bg-neutral-300 dark:hover:bg-neutral-800'}`}
    >
        {isEditing ? (
            <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleRename}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent border-b border-indigo-500 focus:outline-none"
            />
        ) : (
            <span className="truncate flex-grow">{session.name}</span>
        )}
        <div className="flex items-center ml-2 space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={handleExportClick} title="Export to JSONL" className="p-1 text-neutral-500 hover:text-indigo-400 transition-colors">
                <Icon icon="download" className="w-4 h-4" />
            </button>
            <button onClick={handleCopyClick} title="Copy Conversation" className="p-1 text-neutral-500 hover:text-green-400 transition-colors">
                <Icon icon="copy" className="w-4 h-4" />
            </button>
            <button onClick={handleDelete} title="Delete Chat" className="p-1 text-neutral-500 hover:text-red-500 transition-colors">
                <Icon icon="trash" className="w-4 h-4" />
            </button>
        </div>
    </div>
  );
};

export interface AIAssistantRef {
    newChat: () => void;
}

interface AIAssistantProps {
  projectFiles: ProjectFile[];
  activeFile: ProjectFile | undefined;
  onProjectGenerated: (files: Omit<ProjectFile, 'id' | 'language'>[]) => void;
  onFileContentUpdate: (fileId: string, newContent: string) => void;
  onZipFileDropped: (file: File) => void;
  onScaffoldProject: () => void;
  addLog: (message: string) => void;
  onImportFromFilesystem: () => void;
  isHistoryVisible: boolean;
  isChatSearchVisible: boolean;
  setIsChatSearchVisible: (visible: boolean | ((prevState: boolean) => boolean)) => void;
  setIsHistoryVisible: (visible: boolean | ((prevState: boolean) => boolean)) => void;
}

interface PendingMessage {
  original: string;
  corrected: string;
}

export const AIAssistant = forwardRef<AIAssistantRef, AIAssistantProps>(({ 
    projectFiles, activeFile, onProjectGenerated, onFileContentUpdate, onZipFileDropped, onScaffoldProject, addLog, onImportFromFilesystem,
    isHistoryVisible, isChatSearchVisible, setIsChatSearchVisible, setIsHistoryVisible
}, ref) => {
    const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [pendingProjectPrompt, setPendingProjectPrompt] = useState<string | null>(null);
    const [pendingUserMessage, setPendingUserMessage] = useState<PendingMessage | null>(null);

    // --- Search State ---
    const [searchMode, setSearchMode] = useState<'conversations' | 'messages'>('conversations');
    const [searchQuery, setSearchQuery] = useState('');
    const [messageSearchResults, setMessageSearchResults] = useState<string[]>([]);
    const [activeResultIndex, setActiveResultIndex] = useState(-1);

    const searchInputRef = useRef<HTMLInputElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messageRefs = useRef(new Map<string, HTMLDivElement>());
    const textBeforeListening = useRef('');
    const justSwitchedSession = useRef(false);
    
    const {
        isListening,
        startListening,
        stopListening,
        isTTSEnabled,
        toggleTTS,
        speak,
        isSupported: isSpeechSupported,
    } = useSpeech({
        onTranscript: (transcript) => {
            const separator = textBeforeListening.current ? ' ' : '';
            setInput(textBeforeListening.current + separator + transcript);
        }
    });

    const activeSession = useMemo(() => chatSessions.find(s => s.id === activeSessionId), [chatSessions, activeSessionId]);

    useEffect(() => {
        if (justSwitchedSession.current) {
            messagesContainerRef.current?.scrollTo({ top: 0, behavior: 'auto' });
            justSwitchedSession.current = false;
        } else {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [activeSession?.messages]);

    const createNewSession = useCallback((systemMessage: string): ChatSession => ({
        id: `session-${Date.now()}`,
        name: 'New Conversation',
        messages: [{ id: 'system-1', role: 'system', content: systemMessage }],
    }), []);

    useEffect(() => {
        let initialSessions: ChatSession[];
        try {
            const savedHistory = localStorage.getItem('ai-chat-history');
            const parsed = savedHistory ? JSON.parse(savedHistory) : null;
            if (Array.isArray(parsed) && parsed.length > 0) {
                initialSessions = parsed;
            } else {
                throw new Error("No valid saved history.");
            }
        } catch (e) {
            const systemMessage = 'Hello! How can I help?';
            initialSessions = [createNewSession(systemMessage)];
        }
        setChatSessions(initialSessions);
        setActiveSessionId(initialSessions[0].id);
    }, [createNewSession]);

    useEffect(() => {
        if (chatSessions.length > 0) {
            localStorage.setItem('ai-chat-history', JSON.stringify(chatSessions));
        }
    }, [chatSessions]);
    
    useEffect(() => {
        if (!isListening) {
            textBeforeListening.current = '';
        }
    }, [isListening]);

    // --- Search Logic ---
    useEffect(() => {
        if (isChatSearchVisible) {
            searchInputRef.current?.focus();
            setSearchMode('conversations'); // Reset to default mode when opening
        } else {
            setSearchQuery('');
        }
    }, [isChatSearchVisible]);
    
    useEffect(() => {
        setMessageSearchResults([]);
        setActiveResultIndex(-1);

        if (activeSession && searchQuery.trim() && searchMode === 'messages') {
            const lowerCaseQuery = searchQuery.toLowerCase();
            const results = activeSession.messages
                .filter(msg => msg.content.toLowerCase().includes(lowerCaseQuery))
                .map(msg => msg.id);
            setMessageSearchResults(results);
            setActiveResultIndex(results.length > 0 ? 0 : -1);
        }
    }, [searchQuery, activeSession, searchMode]);

    useEffect(() => {
        if (activeResultIndex !== -1 && messageSearchResults.length > 0) {
            const messageId = messageSearchResults[activeResultIndex];
            const element = messageRefs.current.get(messageId);
            element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [activeResultIndex, messageSearchResults]);

    const handleNewChat = useCallback(() => {
        const systemMessage = 'How can I assist you now?';
        const newSession = createNewSession(systemMessage);
        setChatSessions(prev => [newSession, ...prev]);
        setActiveSessionId(newSession.id);
    }, [createNewSession]);

    useImperativeHandle(ref, () => ({
        newChat: handleNewChat,
    }));
    
    const handleSelectChat = (id: string) => {
        justSwitchedSession.current = true;
        setActiveSessionId(id);
    };

    const handleDeleteChat = (id: string) => {
        const remainingSessions = chatSessions.filter(s => s.id !== id);
        if (remainingSessions.length === 0) {
            const newSession = createNewSession('Hello! How can I help?');
            setChatSessions([newSession]);
            setActiveSessionId(newSession.id);
        } else {
            setChatSessions(remainingSessions);
            if (activeSessionId === id) {
                setActiveSessionId(remainingSessions[0].id);
            }
        }
    };
    
    const handleRenameChat = (id: string, newName: string) => {
        setChatSessions(prev => prev.map(s => s.id === id ? { ...s, name: newName } : s));
    };

    const handleExportChat = (session: ChatSession) => {
        const exportableMessages = session.messages
          .filter(msg => msg.role !== 'system' && msg.content)
          .map(({ role, content }) => ({ role, content }));
        
        if (exportableMessages.length === 0) {
            addLog(`[Export] No messages to export for chat: "${session.name}"`);
            return;
        }
    
        const jsonlContent = exportableMessages.map(msg => JSON.stringify(msg)).join('\n');
        const blob = new Blob([jsonlContent], { type: 'application/jsonl' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const fileName = `${session.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'chat_export'}.jsonl`;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        addLog(`[Export] Chat history for "${session.name}" downloaded as ${fileName}.`);
    };

    const handleCopyChat = (session: ChatSession) => {
        const conversationText = session.messages
            .filter(msg => msg.role !== 'system' && msg.content)
            .map(msg => `${msg.role === 'user' ? 'User' : 'AI Assistant'}:\n${msg.content}`)
            .join('\n\n---\n\n');

        navigator.clipboard.writeText(conversationText)
            .then(() => {
                addLog(`[Copy] Conversation "${session.name}" copied to clipboard.`);
            })
            .catch(err => {
                addLog(`[Copy] Failed to copy conversation: ${err}`);
                console.error('Failed to copy text: ', err);
            });
    };

    const updateSessionMessages = (sessionId: string, updateFn: (messages: ChatMessage[]) => ChatMessage[]) => {
        setChatSessions(prev => prev.map(session => 
            session.id === sessionId ? { ...session, messages: updateFn(session.messages) } : session
        ));
    };
    
    const executeProjectGeneration = async () => {
        if (!pendingProjectPrompt || !activeSessionId) return;

        const promptToExecute = pendingProjectPrompt;
        setPendingProjectPrompt(null);
        setIsLoading(true);

        const modelResponseId = (Date.now() + 1).toString();
        const loadingModelMessage: ChatMessage = { id: modelResponseId, role: 'model', content: '', isLoading: true };
        updateSessionMessages(activeSessionId, messages => [...messages, loadingModelMessage]);

        try {
            addLog(`[AI] Generating project for prompt: "${promptToExecute}"`);
            const newFiles = await generateProjectFromPrompt(promptToExecute);
            onProjectGenerated(newFiles);
            const successMessage = `Project generated successfully! Check the file explorer.`;
            addLog(`[AI] ${successMessage}`);
            updateSessionMessages(activeSessionId, msgs => msgs.map(m => m.id === modelResponseId ? {...m, content: successMessage, isLoading: false} : m));
            if (isTTSEnabled) speak(successMessage);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            addLog(`[AI] Error: ${errorMessage}`);
            updateSessionMessages(activeSessionId, msgs => msgs.map(m => m.id === modelResponseId ? {...m, content: `Error: ${errorMessage}`, isLoading: false} : m));
            if (isTTSEnabled) speak(`An error occurred: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    const processMessage = useCallback(async (message: string) => {
        if (!activeSessionId) return;

        const newUserMessage: ChatMessage = { id: Date.now().toString(), role: 'user', content: message };
        
        // If this is the first message in a "New Conversation", rename the session
        if (activeSession?.name === 'New Conversation' && activeSession.messages.length <= 2) {
             const newName = message.substring(0, 40) + (message.length > 40 ? '...' : '');
             handleRenameChat(activeSessionId, newName);
        }

        updateSessionMessages(activeSessionId, messages => [...messages, newUserMessage]);

        const lowerInput = message.toLowerCase();
        const isProjectGen = lowerInput.startsWith('create') || lowerInput.startsWith('build') || lowerInput.startsWith('scaffold');
        const isRefactor = (lowerInput.includes('refactor') || lowerInput.includes('improve')) && (lowerInput.includes('code') || lowerInput.includes('file'));

        if (isProjectGen) {
            setPendingProjectPrompt(message);
            const confirmationMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                content: "It looks like you're asking me to create a new project. Shall I proceed?",
                actions: [
                    { text: 'Yes, build it', actionId: 'confirm_project_build' },
                    { text: 'No, cancel', actionId: 'cancel_project_build' }
                ]
            };
            updateSessionMessages(activeSessionId, messages => [...messages, confirmationMessage]);
            if (isTTSEnabled) speak(confirmationMessage.content);
            return;
        }

        setIsLoading(true);
        const modelResponseId = (Date.now() + 1).toString();
        const loadingModelMessage: ChatMessage = { id: modelResponseId, role: 'model', content: '', isLoading: true };
        updateSessionMessages(activeSessionId, messages => [...messages, loadingModelMessage]);

        try {
            if (isRefactor && activeFile) {
                addLog(`[AI] Refactoring ${activeFile.path}...`);
                const refactored = await refactorCode(activeFile.content, activeFile.language);
                onFileContentUpdate(activeFile.id, refactored);
                const successMessage = `Successfully refactored ${activeFile.path}. The editor has been updated with the new code.`;
                addLog(`[AI] ${successMessage}`);
                updateSessionMessages(activeSessionId, msgs => msgs.map(m => m.id === modelResponseId ? {...m, content: successMessage, isLoading: false} : m));
                if (isTTSEnabled) speak(successMessage);
            } else {
                addLog(`[AI] Assisting with prompt: "${message}"`);
                let fullResponse = "";
                streamCodeAssistance(message, projectFiles, (chunk) => {
                    fullResponse += chunk;
                    setChatSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: s.messages.map(m => m.id === modelResponseId ? {...m, content: m.content + chunk} : m) } : s));
                }).then(() => {
                    addLog(`[AI] Finished streaming response.`);
                    updateSessionMessages(activeSessionId, msgs => msgs.map(m => m.id === modelResponseId ? {...m, isLoading: false} : m));
                    if (isTTSEnabled) speak(fullResponse);
                });
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            addLog(`[AI] Error: ${errorMessage}`);
            updateSessionMessages(activeSessionId, msgs => msgs.map(m => m.id === modelResponseId ? {...m, content: `Error: ${errorMessage}`, isLoading: false} : m));
            if (isTTSEnabled) speak(`An error occurred: ${errorMessage}`);
        } finally {
            if (!message.toLowerCase().includes('stream')) {
               setIsLoading(false);
            }
        }
    }, [activeSessionId, activeSession?.name, activeSession?.messages.length, addLog, isTTSEnabled, speak, projectFiles, onFileContentUpdate, activeFile]);

    const submitMessage = useCallback(async (message: string) => {
        if (!message.trim() || isLoading || !activeSessionId) return;

        const correctedMessage = await spellCheckAndCorrect(message);
        
        // Only show confirmation if correction is significant (not just whitespace/casing)
        if (correctedMessage.toLowerCase().trim() !== message.toLowerCase().trim()) {
            setPendingUserMessage({ original: message, corrected: correctedMessage });
            const confirmationMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                content: `It looks like there might be a typo. Did you mean: **"${correctedMessage}"**?`,
                actions: [
                    { text: 'Yes, use this', actionId: 'confirm_spell_check' },
                    { text: 'No, use original', actionId: 'cancel_spell_check' }
                ]
            };
            
            // Add user's original message to history for context
            const newUserMessage: ChatMessage = { id: Date.now().toString(), role: 'user', content: message };
            updateSessionMessages(activeSessionId, msgs => [...msgs, newUserMessage, confirmationMessage]);

            if (isTTSEnabled) speak(`Did you mean: ${correctedMessage}?`);
            return; // Stop here and wait for user action
        }
        
        // If no correction, proceed as normal
        await processMessage(message);
    }, [isLoading, activeSessionId, isTTSEnabled, speak, processMessage]);

    const handleActionClick = (actionId: ChatAction['actionId']) => {
        if (!activeSessionId) return;
        
        updateSessionMessages(activeSessionId, msgs => msgs.map(m => ({ ...m, actions: undefined })));

        if (actionId === 'confirm_project_build') {
             const userConfirmationMessage: ChatMessage = { id: Date.now().toString(), role: 'user', content: 'Yes, build it.' };
             updateSessionMessages(activeSessionId, messages => [...messages, userConfirmationMessage]);
             executeProjectGeneration();
        } else if (actionId === 'cancel_project_build') { 
            const userCancellationMessage: ChatMessage = { id: Date.now().toString(), role: 'user', content: 'No, cancel.' };
            const modelResponseMessage: ChatMessage = { id: (Date.now()+1).toString(), role: 'model', content: 'Okay, I won\'t create the project. What would you like to do instead?' };
            updateSessionMessages(activeSessionId, messages => [...messages, userCancellationMessage, modelResponseMessage]);
            setPendingProjectPrompt(null);
            if(isTTSEnabled) speak(modelResponseMessage.content);
        } else if (actionId === 'confirm_spell_check') {
            if (pendingUserMessage) {
                // We don't add a new user message here, because we're just confirming the intent of the previous one.
                processMessage(pendingUserMessage.corrected);
                setPendingUserMessage(null);
            }
        } else if (actionId === 'cancel_spell_check') {
            if (pendingUserMessage) {
                processMessage(pendingUserMessage.original);
                setPendingUserMessage(null);
            }
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isListening) {
            stopListening();
        }
        const messageToSend = input;
        setInput('');
        submitMessage(messageToSend);
    };

    const handleMicButtonClick = () => {
        if (isListening) {
            stopListening();
        } else {
            textBeforeListening.current = input;
            startListening();
        }
    };
    
    const handleSmartAction = async (action: 'analyze' | 'docs') => {
        if (!activeFile || isLoading || !activeSessionId) return;
        setIsLoading(true);

        const actionText = action === 'analyze' ? 'Analyze' : 'Add docs to';
        const userMessage: ChatMessage = { id: Date.now().toString(), role: 'user', content: `${actionText} the current file: \`${activeFile.path}\`` };
        updateSessionMessages(activeSessionId, msgs => [...msgs, userMessage]);

        const modelResponseId = (Date.now() + 1).toString();
        const loadingModelMessage: ChatMessage = { id: modelResponseId, role: 'model', content: '', isLoading: true };
        updateSessionMessages(activeSessionId, msgs => [...msgs, loadingModelMessage]);

        try {
            let successMessage = '';
            if (action === 'analyze') {
                addLog(`[AI] Analyzing ${activeFile.path}...`);
                const suggestions = await analyzeCodeForImprovements(activeFile.content, activeFile.language);
                if (suggestions.length === 0) {
                    successMessage = `✅ No specific improvements found for \`${activeFile.path}\`. The code looks solid!`;
                } else {
                    successMessage = `Here are some suggestions for improving \`${activeFile.path}\`:\n\n` + suggestions.map(s => 
                        `- **${s.suggestion}**${s.line ? ` (around line ${s.line})` : ''}\n  *${s.explanation}*`
                    ).join('\n\n');
                }
                addLog(`[AI] Code analysis complete. Found ${suggestions.length} suggestions.`);
            } else { 
                addLog(`[AI] Generating documentation for ${activeFile.path}...`);
                const description = await generateFileDescription(activeFile.content, activeFile.language, activeFile.path);
                const newContent = `${description}\n\n${activeFile.content}`;
                onFileContentUpdate(activeFile.id, newContent);
                successMessage = `Added a descriptive comment to the top of \`${activeFile.path}\`. The editor has been updated.`;
                addLog(`[AI] ${successMessage}`);
            }
            updateSessionMessages(activeSessionId, msgs => msgs.map(m => m.id === modelResponseId ? { ...m, content: successMessage, isLoading: false } : m));
            if (isTTSEnabled) speak(successMessage);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : `An unknown error occurred during ${action}.`;
            addLog(`[AI] Error during ${action}: ${errorMessage}`);
            updateSessionMessages(activeSessionId, msgs => msgs.map(m => m.id === modelResponseId ? { ...m, content: `Error: ${errorMessage}`, isLoading: false } : m));
            if (isTTSEnabled) speak(`An error occurred: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    const goToNextResult = useCallback(() => {
        if (messageSearchResults.length === 0) return;
        setActiveResultIndex(prev => (prev + 1) % messageSearchResults.length);
    }, [messageSearchResults.length]);

    const goToPrevResult = useCallback(() => {
        if (messageSearchResults.length === 0) return;
        setActiveResultIndex(prev => (prev - 1 + messageSearchResults.length) % messageSearchResults.length);
    }, [messageSearchResults.length]);
    
    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') {
            setIsChatSearchVisible(false);
        }
        if (searchMode === 'messages' && messageSearchResults.length > 0) {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (e.shiftKey) {
                    goToPrevResult();
                } else {
                    goToNextResult();
                }
            }
        }
    };

    const filteredChatSessions = useMemo(() => {
        if (!searchQuery.trim() || searchMode !== 'conversations') {
            return chatSessions;
        }
        const lowerCaseQuery = searchQuery.toLowerCase();
        return chatSessions.filter(session => 
            session.name.toLowerCase().includes(lowerCaseQuery)
        );
    }, [chatSessions, searchQuery, searchMode]);

    const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(false); };
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation();
        setIsDraggingOver(false);
        const files = e.dataTransfer.files;
        if (files && files.length === 1 && files[0].name.endsWith('.zip')) {
            onZipFileDropped(files[0]);
        } else {
            addLog("AI Assistant drop zone only accepts single .zip files.");
        }
    };

    return (
        <div className="flex flex-col h-full bg-neutral-100 dark:bg-neutral-900">
            {isChatSearchVisible && (
                <div className="p-2 border-b border-neutral-700 flex items-center space-x-2 bg-neutral-950 flex-shrink-0 animate-fade-in">
                    <div className="relative flex-grow">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-2">
                            <button
                                onClick={() => setSearchMode(m => m === 'conversations' ? 'messages' : 'conversations')}
                                title="Toggle Search Mode"
                                className={`p-1 rounded-full transition-colors ${searchMode === 'messages' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:bg-neutral-700 hover:text-white'}`}
                            >
                                <Icon icon="search" className="w-4 h-4" />
                            </button>
                        </div>
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder={searchMode === 'conversations' ? 'Search conversations...' : 'Search messages...'}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleSearchKeyDown}
                            className="w-full bg-neutral-800 text-neutral-200 text-sm rounded-md py-1.5 pl-9 pr-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>
                    {searchMode === 'messages' && messageSearchResults.length > 0 && (
                        <div className="flex items-center space-x-1 text-xs text-neutral-400 font-mono">
                            <span>{activeResultIndex + 1}/{messageSearchResults.length}</span>
                            <button onClick={goToPrevResult} title="Previous (Shift+Enter)" className="p-1 hover:bg-neutral-700 rounded-md">▲</button>
                            <button onClick={goToNextResult} title="Next (Enter)" className="p-1 hover:bg-neutral-700 rounded-md">▼</button>
                        </div>
                    )}
                    <button onClick={() => { setIsChatSearchVisible(false); setIsHistoryVisible(false); }} title="Close Search and Hide History" className="p-1.5 text-neutral-400 hover:bg-neutral-700 rounded-md">
                        <Icon icon="close" className="w-4 h-4" />
                    </button>
                </div>
            )}
            <div className="flex flex-grow min-h-0">
                {isHistoryVisible && (
                    <div className="w-64 flex-shrink-0 bg-neutral-100 dark:bg-neutral-950 flex flex-col border-r border-neutral-200 dark:border-neutral-800">
                        <div className="flex-grow p-2 overflow-y-auto space-y-1">
                            {filteredChatSessions.map(session => (
                                <SessionHistoryItem
                                    key={session.id}
                                    session={session}
                                    isActive={session.id === activeSessionId}
                                    onSelect={handleSelectChat}
                                    onRename={handleRenameChat}
                                    onDelete={handleDeleteChat}
                                    onExport={handleExportChat}
                                    onCopy={handleCopyChat}
                                />
                            ))}
                        </div>
                    </div>
                )}
                <div 
                    className="flex flex-col flex-grow relative"
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                >
                    <div ref={messagesContainerRef} className="flex-grow p-4 overflow-y-auto space-y-4">
                        {activeSession?.messages.map(msg => {
                             const isCurrentSearchResult = searchMode === 'messages' && messageSearchResults[activeResultIndex] === msg.id;
                             return (
                                <div 
                                    key={msg.id} 
                                    ref={el => {
                                        if (el) {
                                            messageRefs.current.set(msg.id, el);
                                        } else {
                                            messageRefs.current.delete(msg.id);
                                        }
                                    }}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`p-3 rounded-lg max-w-lg transition-shadow ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-neutral-200 dark:bg-neutral-700'} ${isCurrentSearchResult ? 'ring-2 ring-yellow-400 shadow-lg' : ''}`}>
                                       {msg.isLoading && !msg.content ? <LoadingBubble /> : 
                                            <p className="text-sm whitespace-pre-wrap">
                                                <HighlightedText text={msg.content} highlight={isChatSearchVisible && searchMode === 'messages' ? searchQuery : ''} />
                                            </p>
                                       }
                                       {msg.actions && (
                                           <div className="mt-3 pt-3 border-t border-neutral-300 dark:border-neutral-600 flex items-center space-x-2">
                                               {msg.actions.map(action => (
                                                   <button
                                                      key={action.actionId}
                                                      onClick={() => handleActionClick(action.actionId)}
                                                      className="px-3 py-1 rounded-md text-sm font-medium transition-colors bg-indigo-600 text-white hover:bg-indigo-700"
                                                   >
                                                       {action.text}
                                                   </button>
                                               ))}
                                           </div>
                                       )}
                                    </div>
                                </div>
                             );
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                    
                    <div className="p-2 border-t border-neutral-200 dark:border-neutral-800">
                        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                            {isSpeechSupported && (
                                <button type="button" onClick={handleMicButtonClick} title={isListening ? "Stop dictation" : "Start dictation"} className={`p-2 rounded-md transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700'}`}>
                                    <Icon icon="microphone" className="w-5 h-5" />
                                </button>
                            )}
                            <input
                                type="text"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                placeholder={isListening ? "Listening..." : "e.g., Create a React + Vite landing page..."}
                                className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                                disabled={isLoading}
                            />
                            <button type="submit" disabled={isLoading || !input.trim()} title="Send Message" className="bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 rounded-md p-1 flex items-center justify-center transition-colors disabled:bg-neutral-500 dark:disabled:bg-neutral-600 disabled:cursor-not-allowed w-10 h-10">
                                <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" className="w-9 h-9">
                                    <defs>
                                        <linearGradient id="gearGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#737373" />
                                            <stop offset="100%" stopColor="#404040" />
                                        </linearGradient>
                                        
                                        <linearGradient id="innerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#a3a3a3" />
                                            <stop offset="100%" stopColor="#737373" />
                                        </linearGradient>
                                    </defs>
                                    
                                    <g id="outerGear" className={isLoading ? 'animate-spin-outer origin-center' : ''}>
                                        <g fill="url(#gearGradient)">
                                        <rect x="22" y="6" width="4" height="4" rx="0.5"/>
                                        <rect x="29" y="8" width="4" height="3" rx="0.5" transform="rotate(30 31 9.5)"/>
                                        <rect x="36" y="14" width="3" height="4" rx="0.5" transform="rotate(60 37.5 16)"/>
                                        <rect x="38" y="22" width="4" height="4" rx="0.5"/>
                                        <rect x="36" y="30" width="3" height="4" rx="0.5" transform="rotate(-60 37.5 32)"/>
                                        <rect x="22" y="38" width="4" height="4" rx="0.5"/>
                                        <rect x="15" y="37" width="4" height="3" rx="0.5" transform="rotate(-30 17 38.5)"/>
                                        <rect x="9" y="30" width="3" height="4" rx="0.5" transform="rotate(-60 10.5 32)"/>
                                        <rect x="6" y="22" width="4" height="4" rx="0.5"/>
                                        <rect x="9" y="14" width="3" height="4" rx="0.5" transform="rotate(60 10.5 16)"/>
                                        <rect x="15" y="8" width="4" height="3" rx="0.5" transform="rotate(-30 17 9.5)"/>
                                        </g>
                                        
                                        <circle cx="24" cy="24" r="13" fill="url(#gearGradient)" opacity="0.9"/>
                                    </g>
                                    
                                    <g id="innerGear" className={isLoading ? 'animate-spin-inner origin-center' : ''}>
                                        <circle cx="24" cy="24" r="9" fill="none" stroke="url(#innerGradient)" strokeWidth="2.5"/>
                                        
                                        <g stroke="url(#innerGradient)" strokeWidth="2.5" strokeLinecap="round">
                                        <line x1="24" y1="17" x2="24" y2="31"/>
                                        <line x1="28.8" y1="19.5" x2="19.2" y2="28.5" transform="rotate(30 24 24)"/>
                                        <line x1="28.8" y1="28.5" x2="19.2" y2="19.5" transform="rotate(30 24 24)"/>
                                        </g>
                                        
                                        <circle cx="24" cy="24" r="4" fill="#171717" stroke="#a3a3a3" strokeWidth="2"/>
                                        <circle cx="24" cy="24" r="2" fill="#737373"/>
                                    </g>
                                    
                                    <circle cx="24" cy="24" r="20" fill="none" stroke="#737373" strokeWidth="0.5" opacity="0.3">
                                        <animate attributeName="opacity" values="0.3;0.6;0.3" dur="2s" repeatCount="indefinite"/>
                                    </circle>
                                </svg>
                            </button>
                        </form>
                         <div className="pt-2 flex items-center justify-start gap-2">
                            <button onClick={handleNewChat} disabled={isLoading} title="New Chat" className="p-2 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                <Icon icon="plus" className="w-4 h-4 text-green-400" />
                            </button>
                            <button onClick={onImportFromFilesystem} disabled={isLoading} title="Import from Filesystem" className="p-2 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                <Icon icon="file" className="w-4 h-4 text-indigo-400" />
                            </button>
                            <button onClick={() => handleSmartAction('analyze')} disabled={!activeFile || isLoading} title={activeFile ? "Analyze Active File" : "Open a file to enable analysis"} className="p-2 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                              <Icon icon="search" className="w-4 h-4 text-teal-400" />
                            </button>
                            <button onClick={onScaffoldProject} title="Scaffold New Project" className="p-2 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                              <Icon icon="scaffold" className="w-4 h-4 text-indigo-400" />
                            </button>
                            <button onClick={() => handleSmartAction('docs')} disabled={!activeFile || isLoading} title={activeFile ? "Add File Docs" : "Open a file to add documentation"} className="p-2 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                              <Icon icon="documentSparkle" className="w-4 h-4 text-purple-400" />
                            </button>
                        </div>
                    </div>
                     {isDraggingOver && (
                        <div className="absolute inset-0 bg-neutral-950 bg-opacity-75 flex items-center justify-center pointer-events-none z-10 transition-opacity">
                            <div className="w-11/12 h-5/6 border-2 border-dashed border-neutral-500 rounded-lg flex flex-col items-center justify-center text-white p-4 text-center">
                                <Icon icon="upload" className="w-12 h-12 mb-4 text-neutral-400" />
                                <h2 className="text-xl font-bold">Drop a .zip file to unpack</h2>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});