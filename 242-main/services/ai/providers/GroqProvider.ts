import { OpenAICompatibleProvider } from './OpenAICompatibleProvider';

export class GroqProvider extends OpenAICompatibleProvider {
    getBaseUrl(): string {
        return this.config.baseUrl || 'https://api.groq.com/openai/v1';
    }

    getDefaultModel(): string {
        return 'llama-3.1-70b-versatile';
    }
}
