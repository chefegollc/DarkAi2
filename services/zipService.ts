import { ProjectFile } from '../types.ts';

// Declare JSZip for the global script loaded from CDN
declare const JSZip: any;

const getLanguageFromPath = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    switch (ext) {
        case 'js': return 'javascript';
        case 'ts': return 'typescript';
        case 'jsx': return 'javascript';
        case 'tsx': return 'typescript';
        case 'css': return 'css';
        case 'json': return 'json';
        case 'html': return 'html';
        case 'md': return 'markdown';
        case 'py': return 'python';
        default: return 'plaintext';
    }
};


export const exportToZip = async (files: ProjectFile[]): Promise<Blob> => {
    if (typeof JSZip === 'undefined') {
        throw new Error('JSZip library not loaded. Please check your internet connection.');
    }
    const zip = new JSZip();
    files.forEach(file => {
        // JSZip doesn't like leading slashes for top-level files
        const path = file.path.startsWith('/') ? file.path.substring(1) : file.path;
        zip.file(path, file.content);
    });
    return await zip.generateAsync({ type: 'blob' });
};

export const importFromZip = async (zipFile: File): Promise<ProjectFile[]> => {
     if (typeof JSZip === 'undefined') {
        throw new Error('JSZip library not loaded. Please check your internet connection.');
    }
    const zip = await JSZip.loadAsync(zipFile);
    const importedFiles: ProjectFile[] = [];
    const promises: Promise<void>[] = [];

    let rootDir = '';
    const fileKeys = Object.keys(zip.files);

    if (fileKeys.length > 0) {
        // Find the shallowest directory that contains all other files.
        // This is typically the first entry if it's a directory.
        const firstEntryName = zip.files[fileKeys[0]].name;
        const potentialRootDir = firstEntryName.split('/')[0] + '/';

        // Verify that all entries are inside this potential root directory
        const allFilesUnderRoot = fileKeys.every(key => zip.files[key].name.startsWith(potentialRootDir));
        
        if (allFilesUnderRoot) {
            rootDir = potentialRootDir;
        }
    }


    zip.forEach((relativePath: string, zipEntry: any) => {
        if (!zipEntry.dir) {
            const promise = zipEntry.async('string').then((content: string) => {
                const strippedPath = rootDir ? zipEntry.name.substring(rootDir.length) : zipEntry.name;
                
                if (!strippedPath) return; // Skip the root directory placeholder itself

                const path = `/${strippedPath}`;
                importedFiles.push({
                    id: `zip-${Date.now()}-${path}`,
                    path: path,
                    content: content,
                    language: getLanguageFromPath(path),
                });
            });
            promises.push(promise);
        }
    });
    
    await Promise.all(promises);
    return importedFiles;
};