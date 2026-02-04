import { AIProvider, AIProviderConfig, AIResponse, AITask } from '../types';

export abstract class BaseProvider implements AIProvider {
    id: string;
    config: AIProviderConfig;

    constructor(config: AIProviderConfig) {
        this.id = config.id;
        this.config = config;
    }

    abstract generateContent(task: AITask): Promise<AIResponse>;
    abstract testConnection(): Promise<boolean>;

    addKey(key: string): void {
        if (!key || key.length < 5) return;
        // Check duplicate
        if (this.config.apiKeys.some(k => k.key === key)) return;

        this.config.apiKeys.push({
            key,
            isActive: true,
            usageCount: 0,
            errorCount: 0
        });
    }

    rotateKey(): string | null {
         const activeKeys = this.config.apiKeys.filter(k => k.isActive && !k.isExhausted);
         if (activeKeys.length === 0) return null;

         // Simple random distribution
         const randomIndex = Math.floor(Math.random() * activeKeys.length);
         const selected = activeKeys[randomIndex];

         // Update usage stats
         selected.lastUsed = new Date().toISOString();
         selected.usageCount++;

         return selected.key;
    }

    markKeyExhausted(key: string): void {
        const k = this.config.apiKeys.find(ak => ak.key === key);
        if (k) {
            k.isExhausted = true;
            console.warn(`[AIOS] Key marked exhausted for provider ${this.id}: ...${key.slice(-4)}`);
        }
    }

    markKeyError(key: string): void {
        const k = this.config.apiKeys.find(ak => ak.key === key);
        if (k) {
            k.errorCount++;
            if (k.errorCount > 10) {
                 this.markKeyExhausted(key); // Too many errors, kill it
            }
        }
    }

    getConfig(): AIProviderConfig {
        return this.config;
    }
}
