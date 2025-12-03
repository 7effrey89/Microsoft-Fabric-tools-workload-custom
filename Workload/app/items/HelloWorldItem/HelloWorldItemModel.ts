import { NotebookCell } from '../../components/NotebookEditor';
import { AssistantPlan } from '../../clients/AzureOpenAIClient';

export interface HelloWorldItemDefinition  {
  state?: string;
  notebookCells?: NotebookCell[];
  assistantPlan?: AssistantPlan;
  lakehouseId?: string;
  lakehouseName?: string;
  notebookId?: string;
  notebookName?: string;
}

export const VIEW_TYPES = {
  EMPTY: 'empty',
  GETTING_STARTED: 'getting-started',
  NOTEBOOK: 'notebook'
} as const;

export type CurrentView = typeof VIEW_TYPES[keyof typeof VIEW_TYPES];