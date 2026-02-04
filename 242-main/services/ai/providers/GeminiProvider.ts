import { BaseProvider } from './BaseProvider';
import { AITask, AIResponse } from '../types';
import { GoogleGenerativeAI } from '@google/generative-ai';

export class GeminiProvider extends BaseProvider {

    private cleanJson(text: string) {
        return text.replace(/```json/g, '').replace(/```/g, '').trim();
    }

    async generateContent(task: AITask): Promise<AIResponse> {
        const key = this.rotateKey();
        if (!key) throw new Error(`No active keys for Gemini`);

        const ai = new GoogleGenerativeAI(key);
        // Default model or specific one. Use a sensible default if preference is missing.
        const modelName = task.modelPreference || 'gemini-1.5-flash';

        // Configuration options
        const generationConfig: any = {};
        if (task.temperature) generationConfig.temperature = task.temperature;
        if (task.type === 'JSON') {
             generationConfig.responseMimeType = "application/json";
        }

        const model = ai.getGenerativeModel({
            model: modelName,
            generationConfig
        });

        try {
            let prompt = task.prompt;

            // If System Instruction is provided, prepend it (Gemini supports systemInstruction param in newer SDKs,
            // but prepending is safer for compatibility across models)
            if (task.systemInstruction) {
                prompt = `${task.systemInstruction}\n\nTask: ${task.prompt}`;
            }

            const result = await model.generateContent(prompt);
            const response = result.response;
            let text = response.text();

            // Post-processing for JSON tasks (double safety)
            if (task.type === 'JSON') {
                text = this.cleanJson(text);
            }

            return {
                text: text,
                modelUsed: modelName,
                providerUsed: 'gemini',
                raw: result
            };
        } catch (error: any) {
             this.markKeyError(key);
             const msg = error.message || '';
             // Check for specific error codes (400, 429)
             if (msg.includes('API_KEY_INVALID') || error.status === 400) {
                 this.markKeyExhausted(key);
             }
             throw error;
        }
    }

    async testConnection(): Promise<boolean> {
        try {
            await this.generateContent({
                type: 'TEXT',
                prompt: 'Hello',
                modelPreference: 'gemini-1.5-flash'
            });
            return true;
        } catch (e) {
            console.error("Gemini Connection Test Failed:", e);
            return false;
        }
    }
}
