import { ArchitectureSummary, NaturalLanguageQueryResult } from '@/types';
import { defaultAiProvider } from './ai-provider';

export class NaturalLanguageExplorer {
  /**
   * Answer natural language architectural queries grounded in repository evidence
   */
  public async queryArchitecture(
    query: string,
    summary: ArchitectureSummary,
    model?: string
  ): Promise<NaturalLanguageQueryResult> {
    return defaultAiProvider.answerArchitecturalQuestion(query, summary, model);
  }
}

export const defaultNaturalLanguageExplorer = new NaturalLanguageExplorer();
