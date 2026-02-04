import { OpenAICompatibleProvider } from './OpenAICompatibleProvider';

export class OpenAIProvider extends OpenAICompatibleProvider {
    getBaseUrl(): string {
        return this.config.baseUrl || 'https://api.openai.com/v1';
    }

    getDefaultModel(): string {
        return 'gpt-4o';
    }
}
