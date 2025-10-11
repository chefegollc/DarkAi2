import React, { useEffect, useRef, useState } from 'react';
import * as monaco from 'monaco-editor';
import { getAiCodeCompletion, findSpellingErrorsInCode, SpellingError } from '../services/geminiService.ts';
import { useDebounce } from '../hooks/useDebounce.ts';

interface EditorProps {
    filePath: string;
    value: string;
    language: string;
    onChange: (value: string) => void;
    theme: 'light' | 'dark';
}

export const Editor: React.FC<EditorProps> = ({ filePath, value, language, onChange, theme }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const monacoInstanceRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    const [spellingErrors, setSpellingErrors] = useState<SpellingError[]>([]);
    const debouncedValue = useDebounce(value, 1500); // 1.5 second delay for spell check
    const decorationsCollection = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);

    // Effect to fetch spelling errors
    useEffect(() => {
        const checkSpelling = async () => {
            if (!debouncedValue) {
                setSpellingErrors([]);
                return;
            }
            try {
                const errors = await findSpellingErrorsInCode(debouncedValue, language);
                setSpellingErrors(errors);
            } catch (e) {
                console.error("Spell check failed:", e);
                setSpellingErrors([]);
            }
        };
        checkSpelling();
    }, [debouncedValue, language]);

    // Effect to apply decorations from spelling errors
    useEffect(() => {
        const editor = monacoInstanceRef.current;
        if (!editor || !editor.getModel()) return;

        if (!decorationsCollection.current) {
            decorationsCollection.current = editor.createDecorationsCollection();
        }

        const newDecorations: monaco.editor.IModelDeltaDecoration[] = spellingErrors.map(error => ({
            range: new monaco.Range(error.line, error.column, error.line, error.column + error.word.length),
            options: {
                className: 'squiggly-spell-error',
                hoverMessage: { value: `Typo? Suggestions: ${error.suggestions.join(', ')}` },
                stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
            }
        }));

        decorationsCollection.current.set(newDecorations);
    }, [spellingErrors]);


    // Initialize editor (runs only once on mount)
    useEffect(() => {
        // Define custom themes to match the app's aesthetic
        const darkThemeColors = {
            'editor.background': '#171717', // neutral-900
            'editor.foreground': '#e5e5e5', // neutral-200
            'editorGutter.background': '#171717', // Match editor background
            'editorLineNumber.foreground': '#737373', // neutral-500
            'editor.selectionBackground': '#4338ca', // indigo-700
            'editorCursor.foreground': '#f5f5f5', // neutral-100
        };

        monaco.editor.defineTheme('ai-studio-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [],
            colors: darkThemeColors,
        });

        // Use the dark theme for the light mode editor as well, for a consistent coding experience.
        monaco.editor.defineTheme('ai-studio-light', {
            base: 'vs-dark', // Inherit from the dark base for proper syntax highlighting
            inherit: true,
            rules: [],
            colors: darkThemeColors,
        });

        // Add CSS for the spell-check squiggly line
        const style = document.createElement('style');
        style.innerHTML = `
            .squiggly-spell-error {
                background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><path fill="none" stroke="green" stroke-width="1" d="M0,3 C2,1 2,5 4,3"/></svg>');
                background-repeat: repeat-x;
                background-position: bottom;
            }
        `;
        document.head.appendChild(style);


        let completionProvider: monaco.IDisposable | null = null;
        let codeActionProvider: monaco.IDisposable | null = null;
        if (editorRef.current && !monacoInstanceRef.current) {
            monacoInstanceRef.current = monaco.editor.create(editorRef.current, {
                model: null, // Model will be set in the next effect
                theme: 'ai-studio-dark', // Initial theme
                automaticLayout: true,
                fontSize: 14,
                minimap: { enabled: false },
                'semanticHighlighting.enabled': true,
                tabSize: 2,
                insertSpaces: true,
            });

            monacoInstanceRef.current.onDidChangeModelContent(() => {
                const currentValue = monacoInstanceRef.current?.getValue();
                if (currentValue !== undefined) {
                    onChangeRef.current(currentValue);
                }
            });

             // --- AI Completion Registration (runs once) ---
            completionProvider = monaco.languages.registerCompletionItemProvider(['javascript', 'typescript', 'python', 'css', 'html', 'json', 'markdown', 'java', 'cpp', 'rust'], {
                triggerCharacters: ['.', '(', ' ', '=', '/', '<', "'", '"', ':', '[', '\n'],
                provideCompletionItems: async (model, position) => {
                    const currentFilePath = model.uri.path;
                    const codeBeforeCursor = model.getValueInRange({
                        startLineNumber: 1,
                        startColumn: 1,
                        endLineNumber: position.lineNumber,
                        endColumn: position.column
                    });

                    try {
                        const suggestionText = await getAiCodeCompletion(codeBeforeCursor, currentFilePath);
                        
                        if (!suggestionText) {
                            return { suggestions: [] };
                        }

                        const word = model.getWordUntilPosition(position);
                        const range = {
                            startLineNumber: position.lineNumber,
                            endLineNumber: position.lineNumber,
                            startColumn: word.startColumn,
                            endColumn: word.endColumn,
                        };
                        
                        const suggestionItem: monaco.languages.CompletionItem = {
                            label: {
                                label: `✨ ${suggestionText.split('\n')[0].trim()}`,
                                description: 'AI Suggestion'
                            },
                            kind: monaco.languages.CompletionItemKind.Snippet,
                            insertText: suggestionText,
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            range: range,
                            detail: "AI-powered code completion",
                            documentation: {
                                value: `\`\`\`${model.getLanguageId()}\n${suggestionText}\n\`\`\``,
                                isTrusted: true,
                            },
                            sortText: '0' // Boost to the top of the list
                        };

                        return { suggestions: [suggestionItem] };
                    } catch (error) {
                        console.error('Failed to provide AI completion items:', error);
                        return { suggestions: [] };
                    }
                }
            });

            // --- Spell Check Action Registration (runs once) ---
            codeActionProvider = monaco.languages.registerCodeActionProvider('*', {
                provideCodeActions: (model, range) => {
                    const actions: monaco.languages.CodeAction[] = [];
                    // Use a direct reference to the latest spelling errors
                    const currentErrors = spellingErrors;
                    
                    const relevantErrors = currentErrors.filter(err => 
                        err.line >= range.startLineNumber && err.line <= range.endLineNumber
                    );

                    relevantErrors.forEach(error => {
                        const errorRange = new monaco.Range(error.line, error.column, error.line, error.column + error.word.length);
                        // Check if the user's selection/cursor intersects with this error's range
                        if (monaco.Range.intersectRanges(errorRange, range)) {
                            error.suggestions.forEach(suggestion => {
                                actions.push({
                                    title: `Change to "${suggestion}"`,
                                    kind: 'quickfix',
                                    edit: {
                                        edits: [{
                                            resource: model.uri,
                                            edit: { range: errorRange, text: suggestion }
                                        }]
                                    },
                                    isPreferred: true,
                                });
                            });
                        }
                    });

                    return { actions, dispose: () => {} };
                }
            });
        }

        return () => {
            if (completionProvider) completionProvider.dispose();
            if (codeActionProvider) codeActionProvider.dispose();
            if (monacoInstanceRef.current) {
                monacoInstanceRef.current.dispose();
                monacoInstanceRef.current = null;
            }
            document.head.removeChild(style);
        };
    }, []); // Empty dependency array ensures this runs only once.

    // Update theme
    useEffect(() => {
        if (monacoInstanceRef.current) {
             monaco.editor.setTheme(theme === 'dark' ? 'ai-studio-dark' : 'ai-studio-light');
        }
    }, [theme]);

    // Manage models and content based on file path and value changes
    useEffect(() => {
        const editor = monacoInstanceRef.current;
        if (!editor) return;

        const modelUri = monaco.Uri.parse(filePath);
        let model = monaco.editor.getModel(modelUri);

        if (model) {
            // Model exists, update its content only if it's different from the prop
            if (model.getValue() !== value) {
                model.pushEditOperations([], [{
                    range: model.getFullModelRange(),
                    text: value,
                }], () => null);
            }
        } else {
            // Model does not exist, create a new one
            model = monaco.editor.createModel(value, language, modelUri);
        }
        
        // If the editor's current model is not the correct one, set it
        if (editor.getModel() !== model) {
            editor.setModel(model);
        }

    }, [filePath, value, language]);


    return <div ref={editorRef} className="w-full h-full overflow-hidden"></div>;
};