
export interface AIModel {
    id: string; // e.g., 'gpt-4o', 'llama-3.1-70b-versatile'
    name: string; // Display Name
    providerId: string;
    costPer1kToken?: number;
    contextWindow?: number;
    enabled: boolean;
    isImageCapable?: boolean;
}

export interface APIKeyConfig {
    key: string;
    isActive: boolean;
    usageCount: number; // Total calls
    errorCount: number;
    lastUsed?: string; // ISO Date
    isExhausted?: boolean; // If 429 received repeatedly
    label?: string; // "Personal Key", "Org Key"
}

export interface AIProviderConfig {
    id: string; // 'openai', 'gemini', 'groq', 'deepseek'
    name: string;
    enabled: boolean;
    baseUrl?: string; // Override for things like LocalAI or OpenRouter
    models: AIModel[];
    apiKeys: APIKeyConfig[];
    icon?: string; // lucide icon name
}

export interface AITask {
    type: 'TEXT' | 'JSON' | 'IMAGE_TO_TEXT';
    prompt: string;
    systemInstruction?: string;
    temperature?: number;
    modelPreference?: string; // Specific model ID or Canonical ID (e.g. 'NOTES_ENGINE')
    jsonSchema?: any; // For structured output
    imageUrl?: string; // For vision tasks
}

export interface AIResponse {
    text: string;
    modelUsed: string;
    providerUsed: string;
    inputTokens?: number;
    outputTokens?: number;
    cost?: number;
    raw?: any;
}

// Interface that every Provider Class must implement
export interface AIProvider {
    id: string;
    config: AIProviderConfig;

    // Core Methods
    generateContent(task: AITask): Promise<AIResponse>;
    testConnection(): Promise<boolean>;

    // Management
    addKey(key: string): void;
    rotateKey(): string | null;
    markKeyExhausted(key: string): void;
}

export interface AIOSConfig {
    defaultProviderId: string;
    fallbackOrder: string[]; // ['groq', 'gemini', 'openai']
    canonicalMapping: Record<string, { providerId: string, modelId: string }>;
    // e.g. 'NOTES_ENGINE': { providerId: 'groq', modelId: 'llama-3.1-70b-versatile' }
}
