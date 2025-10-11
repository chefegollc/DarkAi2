export interface ProjectFile {
  id: string;
  path: string;
  content: string;
  language: string;
}

export interface ChatAction {
  text: string;
  actionId: 'confirm_project_build' | 'cancel_project_build' | 'confirm_spell_check' | 'cancel_spell_check';
}

export interface ChatMessage {
  id:string;
  role: 'user' | 'model' | 'system';
  content: string;
  isLoading?: boolean;
  actions?: ChatAction[];
}

export interface ChatSession {
  id: string;
  name: string;
  messages: ChatMessage[];
}

export enum PreviewMode {
    Sandbox = 'Sandbox',
    Host = 'Host',
    Python = 'Python',
}

export interface BuildResult {
    code: string;
    sourceMap: string;
    errors: any[];
}