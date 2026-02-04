import { OpenAICompatibleProvider } from './OpenAICompatibleProvider';

export class DeepSeekProvider extends OpenAICompatibleProvider {
    getBaseUrl(): string {
        return this.config.baseUrl || 'https://api.deepseek.com';
    }

    getDefaultModel(): string {
        return 'deepseek-chat';
    }
}
