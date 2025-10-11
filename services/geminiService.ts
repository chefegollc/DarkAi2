import { GoogleGenAI, Type }from '@google/genai';
import { ProjectFile } from '../types.ts';

// Per coding guidelines, the API key is assumed to be available in process.env.API_KEY.
// The execution environment is responsible for providing this variable.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const projectGenerationSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      path: {
        type: Type.STRING,
        description: 'The full path of the file, including directories and extension. e.g., "src/components/Button.tsx".',
      },
      content: {
        type: Type.STRING,
        description: 'The complete source code or content for this file.',
      },
    },
    required: ['path', 'content'],
  },
};

const codeAnalysisSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      suggestion: { 
        type: Type.STRING,
        description: 'A brief, actionable suggestion for improvement.'
      },
      explanation: { 
        type: Type.STRING,
        description: 'A clear, concise explanation of why this change is recommended.'
      },
      line: { 
        type: Type.INTEGER,
        description: 'The approximate line number where the suggested change should be applied.'
      }
    },
    required: ['suggestion', 'explanation']
  }
};

const spellingErrorSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      word: { 
        type: Type.STRING,
        description: 'The misspelled word.'
      },
      line: { 
        type: Type.INTEGER,
        description: 'The line number where the error occurs.'
      },
      column: {
        type: Type.INTEGER,
        description: 'The starting column number of the misspelled word.'
      },
      suggestions: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING,
        },
        description: 'An array of correction suggestions.'
      }
    },
    required: ['word', 'line', 'column', 'suggestions']
  }
};


export const generateProjectFromPrompt = async (prompt: string): Promise<Omit<ProjectFile, 'id' | 'language'>[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Scaffold a complete, runnable web application based on the following prompt. Ensure all necessary files like index.html, package.json (if needed), scripts, and styles are included. The user prompt is: "${prompt}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: projectGenerationSchema,
        systemInstruction: "You are an expert software architect. Your task is to generate a complete file structure and content for a web project based on a user's prompt. The output must be a valid JSON array of file objects. The file paths should be structured as if in a real project directory.",
      },
    });

    const jsonString = response.text.trim();
    const generatedFiles = JSON.parse(jsonString) as { path: string, content: string }[];
    
    if (!Array.isArray(generatedFiles) || generatedFiles.length === 0) {
        throw new Error("AI did not return a valid project structure.");
    }

    return generatedFiles;
  } catch (error) {
    console.error("Error generating project with Gemini:", error);
    throw new Error(`Failed to generate project. Please check your API key and prompt. Details: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const streamCodeAssistance = async (
    prompt: string, 
    projectContext: ProjectFile[],
    onChunk: (text: string) => void
) => {
    try {
        const contextString = projectContext.map(f => `// File: ${f.path}\n\n${f.content}`).join('\n\n---\n\n');
        
        const fullPrompt = `
You are an expert AI pair programmer. Based on the user's request and the provided project files, generate a helpful response. This could be code, an explanation, or a refactoring suggestion.

User Request: "${prompt}"

---
Project Context:
${contextString}
---
        `;

        const responseStream = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: fullPrompt,
        });

        for await (const chunk of responseStream) {
            onChunk(chunk.text);
        }
    } catch (error) {
        console.error("Error with code assistance stream:", error);
        onChunk(`An error occurred: ${error instanceof Error ? error.message : String(error)}`);
    }
};

export const refactorCode = async (code: string, language: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Refactor the following ${language} code for clarity, efficiency, and best practices. Return only the complete, refactored code. Do not include explanations, comments about what you changed, or markdown formatting.

\`\`\`${language}
${code}
\`\`\`
`,
      config: {
        systemInstruction: `You are an expert programmer specializing in code refactoring. Your task is to rewrite the given code snippet to improve it. You MUST return only the raw, updated code, without any surrounding text or markdown code fences. The output should be immediately usable as a replacement for the original file content.`,
        temperature: 0.2,
      },
    });

    const refactoredCode = response.text.trim();
    
    // Clean up potential markdown fences if the model ignores the instruction
    const cleanedCode = refactoredCode.replace(/```[\w]*\n/g, '').replace(/```\n/g, '').replace(/```/g, '').trim();

    return cleanedCode;
  } catch (error) {
    console.error("Error refactoring code with Gemini:", error);
    throw new Error(`Failed to refactor code. Details: ${error instanceof Error ? error.message : String(error)}`);
  }
};


export const getAiCodeCompletion = async (codeBeforeCursor: string, filePath: string): Promise<string> => {
    const lastChar = codeBeforeCursor.trim().slice(-1);
    // Only trigger on specific characters or if there's enough context, to avoid being too noisy
    if (codeBeforeCursor.trim().length < 10 && !['.', '(', '{', '[', ':', '\n'].includes(lastChar)) {
        return '';
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are an expert code completion AI. Provide a relevant code completion based on the context.
- Analyze the code and file path to understand the language, framework, and logic.
- Return ONLY the raw code snippet to be inserted.
- Do NOT include explanations, markdown, or the original code.
- Keep the completion concise and directly following the user's cursor.

File Path: ${filePath}

--- CODE BEFORE CURSOR ---
${codeBeforeCursor}
--- END CODE ---`,
            config: {
                temperature: 0.2,
                stopSequences: ['\n```', '\n//', '\n}'],
                maxOutputTokens: 128,
                thinkingConfig: { thinkingBudget: 0 } // Low latency is critical
            },
        });

        const completion = response.text; // Don't trim leading whitespace for indentation
        return completion;
    } catch (error) {
        console.error("Error getting AI code completion:", error);
        return ''; // Return empty on error to not disrupt user flow
    }
};

export const analyzeCodeForImprovements = async (code: string, language: string): Promise<{ suggestion: string, explanation: string, line?: number }[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze the following ${language} code for potential improvements regarding clarity, efficiency, and best practices. Provide a list of suggestions. If there are no obvious improvements, return an empty array.

\`\`\`${language}
${code}
\`\`\`
`,
      config: {
        responseMimeType: "application/json",
        responseSchema: codeAnalysisSchema,
        systemInstruction: "You are an expert code reviewer. Your task is to analyze code and provide actionable suggestions for improvement in a structured JSON format.",
      },
    });

    const jsonString = response.text.trim();
    return JSON.parse(jsonString) as { suggestion: string, explanation: string, line?: number }[];
  } catch (error) {
    console.error("Error analyzing code with Gemini:", error);
    throw new Error(`Failed to analyze code. Details: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const generateFileDescription = async (code: string, language: string, path: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a concise, language-appropriate comment block describing the purpose and functionality of the following file. The comment should be suitable for placing at the top of the file. Return ONLY the complete comment block, without any other text or markdown fences.

File Path: ${path}
Language: ${language}
\`\`\`${language}
${code}
\`\`\`
`,
      config: {
        systemInstruction: "You are an expert programmer who writes clear, helpful documentation. Your task is to generate a file-level doc comment.",
        temperature: 0.3,
      },
    });

    return response.text.trim();
  } catch (error) {
    console.error("Error generating file description with Gemini:", error);
    throw new Error(`Failed to generate description. Details: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const spellCheckAndCorrect = async (text: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Correct any spelling and grammatical mistakes in the following text. Only return the corrected text, without any preamble or explanation. If the text is already correct, return it unchanged. Text: "${text}"`,
      config: {
        temperature: 0,
        thinkingConfig: { thinkingBudget: 0 } // Low latency
      },
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error during spell check:", error);
    return text; // Return original text on error
  }
};

export interface SpellingError {
  word: string;
  line: number;
  column: number;
  suggestions: string[];
}

export const findSpellingErrorsInCode = async (code: string, language: string): Promise<SpellingError[]> => {
  if (code.trim().length < 10) return []; // Don't run on very short snippets
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze the following ${language} code and identify any spelling errors within comments and string literals only. Do not check code syntax or variable names. For each error, provide the misspelled word, its line and column number, and a few correction suggestions.

\`\`\`${language}
${code}
\`\`\`
`,
      config: {
        responseMimeType: "application/json",
        responseSchema: spellingErrorSchema,
        systemInstruction: "You are a helpful code assistant that finds spelling errors in comments and strings. You return the errors in a structured JSON format.",
      },
    });

    const jsonString = response.text.trim();
    return JSON.parse(jsonString) as SpellingError[];
  } catch (error) {
    console.error("Error finding spelling errors in code:", error);
    return []; // Return empty on error to not disrupt user flow
  }
};