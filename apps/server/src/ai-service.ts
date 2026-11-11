import {
  generateDeterministicEmbedding,
  type AiChatRequest,
  type AiChatResponse,
  type SearchResultItem,
} from '@mind-hub/shared';
import type { PageRepository } from './repository.js';

interface GeminiEmbeddingResponse {
  embedding?: {
    values?: number[];
  };
}

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

interface NvidiaNimChatResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

export class AiService {
  private readonly defaultApiKey: string | undefined;
  private readonly defaultNvidiaKey: string | undefined;

  constructor(defaultApiKey?: string, defaultNvidiaKey?: string) {
    this.defaultApiKey = defaultApiKey;
    this.defaultNvidiaKey = defaultNvidiaKey ?? process.env.NVIDIA_API_KEY;
  }

  async generateEmbedding(text: string, customApiKey?: string): Promise<number[]> {
    const apiKey = (customApiKey ?? this.defaultApiKey)?.trim();
    if (!apiKey) {
      return generateDeterministicEmbedding(text, 64);
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: { parts: [{ text }] },
            outputDimensionality: 64,
          }),
        },
      );

      if (!response.ok) {
        return generateDeterministicEmbedding(text, 64);
      }

      const data = (await response.json()) as GeminiEmbeddingResponse;
      const values = data.embedding?.values;
      if (!values || values.length === 0) {
        return generateDeterministicEmbedding(text, 64);
      }

      return this.normalizeVector(values);
    } catch {
      return generateDeterministicEmbedding(text, 64);
    }
  }

  async answerQuestion(
    repo: PageRepository,
    req: AiChatRequest,
  ): Promise<AiChatResponse> {
    const geminiKey = (req.apiKey ?? this.defaultApiKey)?.trim();
    const nvidiaKey = (req.nvidiaApiKey ?? this.defaultNvidiaKey)?.trim();
    const queryEmbedding = await this.generateEmbedding(req.question, geminiKey);

    const searchResults = await repo.searchPages(
      {
        query: req.question,
        mode: 'hybrid',
        limit: 4,
      },
      queryEmbedding,
    );

    const referencedPages = searchResults.map((r) => ({
      id: r.page.id,
      title: r.page.title,
      score: r.score,
    }));

    // 1. Try NVIDIA NIM if preferred or provided
    if (
      nvidiaKey &&
      (req.preferredProvider === 'nvidia-nim' || !geminiKey)
    ) {
      try {
        const answer = await this.callNvidiaNimChat(nvidiaKey, req.question, searchResults);
        return {
          answer,
          referencedPages,
          provider: 'nvidia-nim',
        };
      } catch {
        // Fallback to Gemini or Local RAG
      }
    }

    // 2. Try Google Gemini BYOK
    if (geminiKey && req.preferredProvider !== 'local-rag') {
      try {
        const answer = await this.callGeminiChat(geminiKey, req.question, searchResults);
        return {
          answer,
          referencedPages,
          provider: 'gemini-byok',
        };
      } catch {
        // Fallback to local RAG if key is invalid or offline
      }
    }

    // 3. Deterministic Local RAG fallback
    return {
      answer: this.synthesizeLocalRagAnswer(req.question, searchResults),
      referencedPages,
      provider: 'local-rag',
    };
  }

  private async callNvidiaNimChat(
    nvidiaApiKey: string,
    question: string,
    results: ReadonlyArray<SearchResultItem>,
  ): Promise<string> {
    const contextBlocks = results
      .map(
        (r, i) =>
          `[Fonte ${i + 1}: ${r.page.title}]\n${r.page.contentMarkdown.slice(0, 1200)}`,
      )
      .join('\n\n---\n\n');

    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${nvidiaApiKey}`,
      },
      body: JSON.stringify({
        model: 'mistralai/mistral-large-2-instruct',
        messages: [
          {
            role: 'system',
            content:
              'Você é o arquiteto e copiloto técnico oficial do Mind Hub (Second Brain). Responda em português claro, preciso e direto.',
          },
          {
            role: 'user',
            content: `Contexto do Second Brain:\n${contextBlocks || 'Nenhuma página específica encontrada.'}\n\nPergunta: ${question}`,
          },
        ],
        temperature: 0.2,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      throw new Error(`NVIDIA NIM API returned ${response.status}`);
    }

    const data = (await response.json()) as NvidiaNimChatResponse;
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) {
      throw new Error('Empty NVIDIA NIM response');
    }
    return text;
  }

  private async callGeminiChat(
    apiKey: string,
    question: string,
    results: ReadonlyArray<SearchResultItem>,
  ): Promise<string> {
    const contextBlocks = results
      .map(
        (r, i) =>
          `[Fonte ${i + 1}: ${r.page.title}]\n${r.page.contentMarkdown.slice(0, 1200)}`,
      )
      .join('\n\n---\n\n');

    const prompt = [
      'Você é o assistente técnico oficial do Mind Hub (Second Brain).',
      'Responda à pergunta do usuário com base no contexto das páginas abaixo, em português claro e direto.',
      '',
      'Contexto:',
      contextBlocks || 'Nenhuma página específica encontrada.',
      '',
      `Pergunta: ${question}`,
    ].join('\n');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1024,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Gemini API returned ${response.status}`);
    }

    const data = (await response.json()) as GeminiGenerateContentResponse;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) {
      throw new Error('Empty Gemini response');
    }
    return text;
  }

  private synthesizeLocalRagAnswer(
    question: string,
    results: ReadonlyArray<SearchResultItem>,
  ): string {
    if (results.length === 0) {
      return `Não foram encontradas páginas correspondentes para **"${question}"**. Experimente criar uma nova nota ou usar outros termos.`;
    }

    const lines: string[] = [
      `### Síntese Semântica Local (RAG) para: *"${question}"*`,
      '',
      'Com base nas notas indexadas no **Mind Hub**, os trechos de maior relevância são:',
      '',
    ];

    for (const [idx, item] of results.entries()) {
      lines.push(
        `${idx + 1}. **${item.page.icon} ${item.page.title}** *(score: ${item.score.toFixed(2)})*`,
      );
      lines.push(`   > ${item.snippet}`);
      lines.push('');
    }

    lines.push(
      '*Dica: Informe sua chave Google Gemini ou NVIDIA NIM (BYOK) no painel de IA para habilitar geração neural completa.*',
    );

    return lines.join('\n');
  }

  private normalizeVector(vec: ReadonlyArray<number>): number[] {
    let norm = 0;
    for (const v of vec) {
      norm += v * v;
    }
    norm = Math.sqrt(norm);
    if (norm === 0) return [...vec];
    return vec.map((v) => Number((v / norm).toFixed(6)));
  }
}
