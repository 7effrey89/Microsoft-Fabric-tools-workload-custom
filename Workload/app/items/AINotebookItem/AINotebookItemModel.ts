import { NotebookCell } from '../../components/NotebookEditor';
import { AssistantPlan } from '../../clients/AzureOpenAIClient';

/**
 * AI Notebook Item Definition
 * Stores the notebook cells, assistant plan, and lakehouse connection
 */
export interface AINotebookItemDefinition {
  state?: string;
  notebookCells?: NotebookCell[];
  assistantPlan?: AssistantPlan;
  lakehouseId?: string;
  lakehouseName?: string;
}

export const VIEW_TYPES = {
  EMPTY: 'empty',
  NOTEBOOK: 'notebook'
} as const;

export type CurrentView = typeof VIEW_TYPES[keyof typeof VIEW_TYPES];
