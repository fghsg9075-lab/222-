import { BaseProvider } from './BaseProvider';
import { AITask, AIResponse } from '../types';

export abstract class OpenAICompatibleProvider extends BaseProvider {
    abstract getBaseUrl(): string;
    abstract getDefaultModel(): string;

    async generateContent(task: AITask): Promise<AIResponse> {
        const key = this.rotateKey();
        if (!key) throw new Error(`No active keys for ${this.id}`);

        // Handle Base URL (some APIs need /v1, some don't, usually normalized by subclass)
        const url = `${this.getBaseUrl()}/chat/completions`;
        const model = task.modelPreference || this.getDefaultModel();

        const messages = [];
        if (task.systemInstruction) {
            messages.push({ role: 'system', content: task.systemInstruction });
        }
        messages.push({ role: 'user', content: task.prompt });

        const body: any = {
            model: model,
            messages: messages,
            temperature: task.temperature ?? 0.7
        };

        if (task.type === 'JSON') {
            body.response_format = { type: "json_object" };
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${key}`
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`API Error ${response.status}: ${err}`);
            }

            const data = await response.json();
            const content = data.choices[0]?.message?.content || "";

            return {
                text: content,
                modelUsed: model,
                providerUsed: this.id,
                raw: data
            };
        } catch (error: any) {
             this.markKeyError(key);
             if (error.message?.includes('401') || error.message?.includes('invalid_api_key')) {
                 this.markKeyExhausted(key);
             }
             throw error;
        }
    }

    async testConnection(): Promise<boolean> {
         try {
            // Minimal test
            await this.generateContent({ type: 'TEXT', prompt: 'Hi', modelPreference: this.getDefaultModel() });
            return true;
         } catch(e) {
             console.error(`${this.id} Test Failed:`, e);
             return false;
        }
    }
}
