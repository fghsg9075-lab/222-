import { AIOSConfig, AIProvider, AITask, AIResponse, AIProviderConfig } from './types';
import { GeminiProvider } from './providers/GeminiProvider';
import { GroqProvider } from './providers/GroqProvider';
import { OpenAIProvider } from './providers/OpenAIProvider';
import { DeepSeekProvider } from './providers/DeepSeekProvider';

export class AIOperatingSystem {
    private static instance: AIOperatingSystem;
    private providers: Map<string, AIProvider> = new Map();
    private config: AIOSConfig = {
        defaultProviderId: 'gemini',
        fallbackOrder: ['gemini', 'groq', 'openai', 'deepseek'],
        canonicalMapping: {
            'NOTES_ENGINE': { providerId: 'gemini', modelId: 'gemini-1.5-flash' },
            'MCQ_ENGINE': { providerId: 'gemini', modelId: 'gemini-1.5-flash' },
            'CHAT_ENGINE': { providerId: 'gemini', modelId: 'gemini-1.5-flash' }
        }
    };

    private constructor() {
        this.loadSettings();
    }

    public static getInstance(): AIOperatingSystem {
        if (!AIOperatingSystem.instance) {
            AIOperatingSystem.instance = new AIOperatingSystem();
        }
        return AIOperatingSystem.instance;
    }

    public loadSettings() {
        if (typeof localStorage === 'undefined') return;

        try {
            const stored = localStorage.getItem('nst_system_settings');
            if (stored) {
                const settings = JSON.parse(stored);

                // 1. Initialize Providers
                if (settings.aiProviders && Array.isArray(settings.aiProviders)) {
                    this.initializeProviders(settings.aiProviders);
                } else {
                    this.initializeDefaults(settings);
                }

                // 2. Load Mapping
                if (settings.aiCanonicalMapping) {
                    this.config.canonicalMapping = settings.aiCanonicalMapping;
                }
            } else {
                this.initializeDefaults({});
            }
        } catch (e) {
            console.error("AIOS: Failed to load settings", e);
            this.initializeDefaults({});
        }
    }

    private initializeDefaults(currentSettings: any) {
        // Fallback for legacy keys
        const legacyKeys = currentSettings.apiKeys || [];

        // GEMINI (Default)
        this.providers.set('gemini', new GeminiProvider({
            id: 'gemini', name: 'Gemini', enabled: true,
            models: [
                { id: 'gemini-1.5-flash', name: 'Flash 1.5', providerId: 'gemini', enabled: true },
                { id: 'gemini-1.5-pro', name: 'Pro 1.5', providerId: 'gemini', enabled: true }
            ],
            apiKeys: legacyKeys.map((k: string) => ({ key: k, isActive: true, usageCount: 0, errorCount: 0 }))
        }));

        // GROQ
        this.providers.set('groq', new GroqProvider({
            id: 'groq', name: 'Groq', enabled: true,
            models: [
                { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B', providerId: 'groq', enabled: true },
                { id: 'llama3-8b-8192', name: 'Llama 3 8B', providerId: 'groq', enabled: true }
            ],
            apiKeys: []
        }));

        // OPENAI
        this.providers.set('openai', new OpenAIProvider({
            id: 'openai', name: 'OpenAI', enabled: true,
            models: [
                { id: 'gpt-4o', name: 'GPT-4o', providerId: 'openai', enabled: true },
                { id: 'gpt-4o-mini', name: 'GPT-4o Mini', providerId: 'openai', enabled: true }
            ],
            apiKeys: []
        }));

        // DEEPSEEK
        this.providers.set('deepseek', new DeepSeekProvider({
            id: 'deepseek', name: 'DeepSeek', enabled: true,
            models: [
                { id: 'deepseek-chat', name: 'DeepSeek V3', providerId: 'deepseek', enabled: true }
            ],
            apiKeys: []
        }));
    }

    private initializeProviders(configs: AIProviderConfig[]) {
        configs.forEach(conf => {
            let provider: AIProvider | null = null;
            if (conf.id === 'gemini') provider = new GeminiProvider(conf);
            else if (conf.id === 'groq') provider = new GroqProvider(conf);
            else if (conf.id === 'openai') provider = new OpenAIProvider(conf);
            else if (conf.id === 'deepseek') provider = new DeepSeekProvider(conf);

            if (provider) {
                this.providers.set(conf.id, provider);
            }
        });
    }

    public getProviders(): AIProvider[] {
        return Array.from(this.providers.values());
    }

    public getProvider(id: string): AIProvider | undefined {
        return this.providers.get(id);
    }

    public updateProviderConfig(config: AIProviderConfig) {
        const existing = this.providers.get(config.id);
        if (existing) {
             existing.config = config;
        } else {
             this.initializeProviders([config]);
        }
        this.persist();
    }

    public updateCanonicalMapping(mapping: Record<string, { providerId: string, modelId: string }>) {
        this.config.canonicalMapping = mapping;
        this.persist();
    }

    public getConfig() {
        return this.config;
    }

    private persist() {
        if (typeof localStorage === 'undefined') return;
        try {
            const stored = localStorage.getItem('nst_system_settings');
            const settings = stored ? JSON.parse(stored) : {};

            settings.aiProviders = Array.from(this.providers.values()).map(p => p.config);
            settings.aiCanonicalMapping = this.config.canonicalMapping;

            localStorage.setItem('nst_system_settings', JSON.stringify(settings));
        } catch(e) { console.error("AIOS: Save failed", e); }
    }

    public async execute(task: AITask): Promise<AIResponse> {
        // 1. Resolve Target
        let targetProviderId = this.config.defaultProviderId;
        let targetModelId = undefined;

        // Check Canonical Mapping first (e.g. NOTES_ENGINE)
        if (task.modelPreference && this.config.canonicalMapping[task.modelPreference]) {
            const resolved = this.config.canonicalMapping[task.modelPreference];
            targetProviderId = resolved.providerId;
            targetModelId = resolved.modelId;
        } else if (task.modelPreference && this.providers.has(task.modelPreference)) {
             // User passed a provider ID directly
             targetProviderId = task.modelPreference;
        } else if (task.modelPreference) {
            // User passed a model name, try to find who owns it?
            // For now, assume default if not canonical or provider ID
        }

        // 2. Build Execution Plan (Primary + Fallbacks)
        // Ensure unique list
        const plan = Array.from(new Set([targetProviderId, ...this.config.fallbackOrder]));

        let lastError = null;
        const errors: any[] = [];

        for (const providerId of plan) {
            const provider = this.providers.get(providerId);
            if (!provider || !provider.config.enabled) continue;

            // Check if provider has active keys
            if (!provider.config.apiKeys.some(k => k.isActive && !k.isExhausted)) {
                // Skip if no keys
                continue;
            }

            try {
                // If we are on the target provider, use the target model.
                // If we fell back, let the fallback provider decide (undefined modelPreference)
                // UNLESS the task explicitly asked for "NOTES_ENGINE" which maps to specific models on specific providers?
                // Actually fallback usually implies "just make it work".
                const useModel = (providerId === targetProviderId) ? targetModelId : undefined;

                const taskForProvider = { ...task, modelPreference: useModel };

                console.log(`[AIOS] Executing on ${providerId} (Model: ${useModel || 'Auto'})...`);
                const result = await provider.generateContent(taskForProvider);

                return result;

            } catch (error: any) {
                console.warn(`[AIOS] ${providerId} failed:`, error.message);
                lastError = error;
                errors.push({ provider: providerId, error: error.message });
            }
        }

        throw new Error(`AIOS Failure: All providers failed. Details: ${JSON.stringify(errors)}`);
    }
}
