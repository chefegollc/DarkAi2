import React, { useState, useMemo } from 'react';
import { ProjectFile } from '../types.ts';
import { Icon } from './Icon.tsx';
import { getStackForPath, SupportedStack } from '../utils/language.ts';


const getFileIcon = (path: string): React.ReactElement => {
    const stack = getStackForPath(path);

    switch (stack) {
        case 'react':
            return <Icon icon="react" className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />;
        case 'vanilla':
            return <Icon icon="js" className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />;
        case 'tailwind':
            return <Icon icon="tailwind" className="w-4 h-4 text-teal-500 dark:text-teal-400" />;
        case 'css':
            return <Icon icon="css" className="w-4 h-4 text-blue-500 dark:text-blue-400" />;
        case 'python':
            return <Icon icon="python" className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />;
        case 'java':
            return <Icon icon="java" className="w-4 h-4 text-red-600 dark:text-red-500" />;
        case 'cpp':
            return <Icon icon="cpp" className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />;
        case 'rust':
            return <Icon icon="rust" className="w-4 h-4 text-orange-600 dark:text-orange-500" />;
        case 'html':
            return <Icon icon="html" className="w-4 h-4 text-orange-500 dark:text-orange-400" />;
        case 'json':
            return <Icon icon="json" className="w-4 h-4 text-green-600 dark:text-green-500" />;
        case 'markdown':
            return <Icon icon="md" className="w-4 h-4 text-purple-500 dark:text-purple-400" />;
        default:
            return <Icon icon="file" className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />;
    }
};

interface FileExplorerProps {
  files: ProjectFile[];
  activeFileId: string | null;
  onSelectFile: (id: string) => void;
  onAddFile: (path: string) => void;
  onAddFolder: (path: string) => void;
  onMoveItem: (sourcePath: string, targetFolderPath: string) => void;
  onImportFromFilesystem: () => void;
  onToggleVisibility: () => void;
  isHighlighted: boolean;
  onHighlight: () => void;
}

interface TreeNode {
  name: string;
  path: string;
  children: TreeNode[];
  file?: ProjectFile;
}

const FileTreeNode: React.FC<{
    node: TreeNode;
    activeFileId: string | null;
    onSelectFile: (id: string) => void;
    level: number;
    draggedItemPath: string | null;
    setDraggedItemPath: (path: string | null) => void;
    dragOverPath: string | null;
    setDragOverPath: (path: string | null) => void;
    onDrop: (targetNode: TreeNode) => void;
}> = ({ node, activeFileId, onSelectFile, level, draggedItemPath, setDraggedItemPath, dragOverPath, setDragOverPath, onDrop }) => {
    const isFolder = !node.file || node.children.length > 0;
    const [isOpen, setIsOpen] = useState(node.name !== 'node_modules');

    const handleToggle = () => {
        if (isFolder) {
            setIsOpen(!isOpen);
        } else if (node.file) {
            onSelectFile(node.file.id);
        }
    };
    
    if (node.name === '.gitkeep') return null;

    const handleDragStart = (e: React.DragEvent) => {
        e.stopPropagation();
        setDraggedItemPath(node.path);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', node.path); // Necessary for Firefox
    };

    const handleDragEnd = (e: React.DragEvent) => {
        e.stopPropagation();
        setDraggedItemPath(null);
        setDragOverPath(null);
    };

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (isFolder) {
            setDragOverPath(node.path);
        } else {
            setDragOverPath(null); // Can't drop on files
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (isFolder) {
            onDrop(node);
        }
        setDragOverPath(null);
    };

    const isBeingDragged = draggedItemPath === node.path;
    const isDropTarget = isFolder && dragOverPath === node.path && draggedItemPath !== node.path && !dragOverPath.startsWith(draggedItemPath + '/');
    const isActive = activeFileId === node.file?.id;

    return (
        <li 
            draggable="true"
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`${isBeingDragged ? 'opacity-40' : ''}`}
        >
            <button
                onClick={handleToggle}
                style={{ paddingLeft: `${level * 12 + 8}px` }}
                className={`w-full text-left py-1 flex items-center space-x-2 text-sm transition-all duration-150 rounded-sm ${
                    isDropTarget ? 'bg-indigo-500/50 dark:bg-indigo-600/50 ring-1 ring-indigo-500' : 
                    isActive ? 'bg-indigo-100 dark:bg-indigo-600/20 text-indigo-800 dark:text-indigo-300' : 'hover:bg-neutral-200 dark:hover:bg-neutral-800'
                }`}
            >
                {isFolder ? (
                    <>
                        <Icon icon="chevronRight" className={`w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 flex-shrink-0 transform transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`} />
                        <Icon icon="folder" className="w-4 h-4 text-yellow-700 dark:text-yellow-600 flex-shrink-0" />
                    </>
                ) : (
                    <>
                        <div className="w-3.5 h-3.5 flex-shrink-0"></div> 
                        {getFileIcon(node.path)}
                    </>
                )}
                <span className="truncate">{node.name}</span>
            </button>
            {isFolder && isOpen && (
                <ul className="list-none p-0 m-0">
                    {node.children.map(child => (
                        <FileTreeNode
                            key={child.path}
                            node={child}
                            activeFileId={activeFileId}
                            onSelectFile={onSelectFile}
                            level={level + 1}
                            draggedItemPath={draggedItemPath}
                            setDraggedItemPath={setDraggedItemPath}
                            dragOverPath={dragOverPath}
                            setDragOverPath={setDragOverPath}
                            onDrop={onDrop}
                        />
                    ))}
                </ul>
            )}
        </li>
    );
};

export const FileExplorer: React.FC<FileExplorerProps> = ({ files, activeFileId, onSelectFile, onAddFile, onAddFolder, onMoveItem, onImportFromFilesystem, onToggleVisibility, isHighlighted, onHighlight }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [draggedItemPath, setDraggedItemPath] = useState<string | null>(null);
    const [dragOverPath, setDragOverPath] = useState<string | null>(null);

    const fileTree = useMemo(() => {
        const root: TreeNode = { name: 'root', path: '', children: [] };

        files.forEach(file => {
            // Adjust path for root files
            const pathParts = file.path === '/' ? [''] : file.path.substring(1).split('/');
            let currentNode = root;

            pathParts.forEach((part, index) => {
                const isLastName = index === pathParts.length - 1;
                let childNode = currentNode.children.find(child => child.name === part);

                if (!childNode) {
                    const currentPath = '/' + pathParts.slice(0, index + 1).join('/');
                    childNode = {
                        name: part,
                        path: currentPath,
                        children: [],
                        file: isLastName ? file : undefined,
                    };
                    currentNode.children.push(childNode);
                } else if (isLastName) {
                    childNode.file = file; // Attach file info to existing folder node
                }

                currentNode = childNode;
            });
        });

        const sortNodes = (nodes: TreeNode[]) => {
            nodes.sort((a, b) => {
                const aIsFolder = !a.file || a.children.length > 0;
                const bIsFolder = !b.file || b.children.length > 0;
                if (aIsFolder && !bIsFolder) return -1;
                if (!aIsFolder && bIsFolder) return 1;
                return a.name.localeCompare(b.name);
            });
            nodes.forEach(node => sortNodes(node.children));
        };

        sortNodes(root.children);
        return root.children;
    }, [files]);

    const filteredFileTree = useMemo(() => {
        if (!searchQuery.trim()) {
            return fileTree;
        }

        const filterTree = (nodes: TreeNode[], query: string): TreeNode[] => {
            const lowerCaseQuery = query.toLowerCase();

            return nodes.reduce((acc, node) => {
                const isFolder = !node.file || node.children.length > 0;
                const nameMatches = node.name.toLowerCase().includes(lowerCaseQuery);
                
                if (isFolder) {
                    const filteredChildren = filterTree(node.children, query);
                    if (nameMatches || filteredChildren.length > 0) {
                        acc.push({ ...node, children: filteredChildren });
                    }
                } else { // It's a file
                    if (nameMatches) {
                        acc.push(node);
                    }
                }
                return acc;
            }, [] as TreeNode[]);
        };

        return filterTree(fileTree, searchQuery);
    }, [fileTree, searchQuery]);

    const handleAddFile = () => {
        const path = prompt("Enter new file path:", "src/new-file.js");
        if(path) onAddFile(path);
    }
    
    const handleAddFolder = () => {
        const path = prompt("Enter new folder path:", "src/new-folder/");
        if(path) onAddFolder(path);
    }
    
    const handleDrop = (targetNode: TreeNode) => {
        if (!draggedItemPath) return;
        onMoveItem(draggedItemPath, targetNode.path);
        setDraggedItemPath(null);
        setDragOverPath(null);
    };

    const handleRootDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (draggedItemPath) {
            onMoveItem(draggedItemPath, ''); // Empty path for root
        }
        setDragOverPath(null);
    };

    const handleRootDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverPath(''); // Set root as drop target
    };

    const highlightClasses = 'bg-neutral-200 dark:bg-neutral-800 ring-1 ring-indigo-500/50';
    
    return (
        <div className="w-full bg-neutral-100 dark:bg-neutral-900 flex flex-col h-full text-neutral-700 dark:text-neutral-300" onDragLeave={() => setDragOverPath(null)}>
            <div className="p-2 border-b border-neutral-200 dark:border-neutral-800 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <button onClick={onToggleVisibility} title="Toggle Explorer Panel" className="p-1 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors">
                            <Icon icon="file" className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
                        </button>
                        <button 
                            onClick={onHighlight}
                            onDoubleClick={onImportFromFilesystem}
                            className={`text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400 px-2 py-1 rounded-md transition-colors text-left ${isHighlighted ? highlightClasses : 'hover:bg-neutral-200 dark:hover:bg-neutral-800'}`}
                            title="Click to select for settings, double-click to import from filesystem"
                        >
                            Explorer
                        </button>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button onClick={handleAddFile} title="New File" className="text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors"><Icon icon="addFile" className="w-5 h-5" /></button>
                        <button onClick={handleAddFolder} title="New Folder" className="text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors"><Icon icon="addFolder" className="w-5 h-5" /></button>
                    </div>
                </div>
                 <div className="relative px-1 mt-2">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                        <Icon icon="search" className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search files..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md py-1 pl-8 pr-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-neutral-800 dark:text-neutral-200"
                    />
                </div>
            </div>
            <div 
                className="flex-grow overflow-y-auto p-1"
                onDrop={handleRootDrop}
                onDragOver={e => e.preventDefault()}
                onDragEnter={handleRootDragEnter}
            >
                <ul className="list-none p-0 m-0">
                    {filteredFileTree.map(node => (
                        <FileTreeNode
                            key={node.path}
                            node={node}
                            activeFileId={activeFileId}
                            onSelectFile={onSelectFile}
                            level={0}
                            draggedItemPath={draggedItemPath}
                            setDraggedItemPath={setDraggedItemPath}
                            dragOverPath={dragOverPath}
                            setDragOverPath={setDragOverPath}
                            onDrop={handleDrop}
                        />
                    ))}
                </ul>
            </div>
        </div>
    );
};