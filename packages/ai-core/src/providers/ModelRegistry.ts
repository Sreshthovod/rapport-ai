export interface ModelSpec {
  id: string;
  name: string;
  providerId: 'openai' | 'claude' | 'gemini' | 'groq' | 'fake-provider';
  maxContextTokens: number;
  description: string;
  isDefault?: boolean;
}

export class ModelRegistry {
  private static instance: ModelRegistry | null = null;

  private readonly models: Map<string, ModelSpec> = new Map();

  constructor() {
    this.registerDefaultModels();
  }

  public static getInstance(): ModelRegistry {
    if (!ModelRegistry.instance) {
      ModelRegistry.instance = new ModelRegistry();
    }
    return ModelRegistry.instance;
  }

  private registerDefaultModels(): void {
    // OpenAI Models
    this.register({
      id: 'gpt-4o',
      name: 'GPT-5 / GPT-4o Flagship',
      providerId: 'openai',
      maxContextTokens: 128000,
      description: 'Most intelligent & capable model for high-nuance conversations.',
    });
    this.register({
      id: 'gpt-4o-mini',
      name: 'GPT-5 Mini / GPT-4o Mini',
      providerId: 'openai',
      maxContextTokens: 128000,
      description: 'Ultra-fast, lightweight model ideal for quick instant suggestions.',
      isDefault: true,
    });
    this.register({
      id: 'o3-mini',
      name: 'OpenAI o3-mini (Reasoning)',
      providerId: 'openai',
      maxContextTokens: 200000,
      description: 'Reasoning model for complex interpersonal negotiations & conflict resolution.',
    });

    // Anthropic Claude Models
    this.register({
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      providerId: 'claude',
      maxContextTokens: 200000,
      description: 'Highest empathy & natural conversational nuance.',
    });
    this.register({
      id: 'claude-3-5-haiku-20241022',
      name: 'Claude 3.5 Haiku',
      providerId: 'claude',
      maxContextTokens: 200000,
      description: 'Lightning-fast responses with great style matching.',
      isDefault: true,
    });
    this.register({
      id: 'claude-3-opus-20240229',
      name: 'Claude 3 Opus',
      providerId: 'claude',
      maxContextTokens: 200000,
      description: 'Deep narrative analysis & long thread intelligence.',
    });

    // Google Gemini Models
    this.register({
      id: 'gemini-2.5-pro',
      name: 'Gemini 2.5 Pro',
      providerId: 'gemini',
      maxContextTokens: 1000000,
      description: 'Multimodal 1M context window model for deep relationship context.',
    });
    this.register({
      id: 'gemini-2.5-flash',
      name: 'Gemini 2.5 Flash',
      providerId: 'gemini',
      maxContextTokens: 1000000,
      description: 'Sub-second latency model for real-time typing assistance.',
      isDefault: true,
    });
    this.register({
      id: 'gemini-1.5-flash',
      name: 'Gemini 1.5 Flash',
      providerId: 'gemini',
      maxContextTokens: 1000000,
      description: 'Proven fast flash model for daily WhatsApp messaging.',
    });

    // Groq Models
    this.register({
      id: 'llama-3.3-70b-versatile',
      name: 'LLaMA 3.3 70B Versatile',
      providerId: 'groq',
      maxContextTokens: 32768,
      description: 'Groq flagship model. Best for fast reasoning and instant reply options.',
      isDefault: true,
    });
    this.register({
      id: 'llama-3.1-8b-instant',
      name: 'LLaMA 3.1 8B Instant',
      providerId: 'groq',
      maxContextTokens: 8192,
      description: 'Ultra low-latency LLaMA model for speed-critical tasks.',
    });
    this.register({
      id: 'mixtral-8x7b-32768',
      name: 'Mixtral 8x7B Instruct',
      providerId: 'groq',
      maxContextTokens: 32768,
      description: 'High-quality mixture of experts model for long contexts.',
    });
    this.register({
      id: 'gemma2-9b-it',
      name: 'Gemma 2 9B IT',
      providerId: 'groq',
      maxContextTokens: 8192,
      description: 'Google Gemma instruction tuned model optimized for conversational logic.',
    });

    // Fake Provider Model
    this.register({
      id: 'fake-deterministic',
      name: 'Offline Deterministic Engine',
      providerId: 'fake-provider',
      maxContextTokens: 4096,
      description: 'Zero-latency local rule engine (No API Key required).',
      isDefault: true,
    });
  }

  public register(model: ModelSpec): void {
    this.models.set(model.id, model);
  }

  public getModel(modelId: string): ModelSpec | undefined {
    return this.models.get(modelId);
  }

  public getModelsForProvider(providerId: string): ModelSpec[] {
    return Array.from(this.models.values()).filter((m) => m.providerId === providerId);
  }

  public getDefaultModelForProvider(providerId: string): ModelSpec {
    const models = this.getModelsForProvider(providerId);
    return models.find((m) => m.isDefault) || models[0] || {
      id: 'default',
      name: 'Default Model',
      providerId: providerId as any,
      maxContextTokens: 4096,
      description: 'Default model fallback.',
    };
  }

  public getAllModels(): ModelSpec[] {
    return Array.from(this.models.values());
  }
}
