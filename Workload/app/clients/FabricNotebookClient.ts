import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { FabricPlatformClient } from './FabricPlatformClient';
import { SCOPES } from './FabricPlatformScopes';

export interface NotebookCell {
  cell_type: 'code' | 'markdown';
  source: string[];
  metadata?: any;
  outputs?: any[];
  execution_count?: number | null;
}

export interface NotebookContent {
  cells: NotebookCell[];
  metadata: any;
  nbformat: number;
  nbformat_minor: number;
}

export interface NotebookDefinitionPart {
  path: string;
  payload: string; // Base64 encoded
  payloadType: 'InlineBase64';
}

export interface NotebookDefinition {
  format?: string;
  parts: NotebookDefinitionPart[];
}

export interface NotebookDefinitionResponse {
  definition: NotebookDefinition;
}

export class FabricNotebookClient extends FabricPlatformClient {
  constructor(workloadClient: WorkloadClientAPI) {
    super(workloadClient, {
      read: SCOPES.ITEM_READ,
      write: SCOPES.ITEM
    });
  }

  /**
   * Get the notebook definition (including cell content)
   * Note: This API can return 202 Accepted for async operations
   */
  async getNotebookDefinition(
    workspaceId: string,
    notebookId: string,
    format: 'ipynb' | 'fabricGitSource' = 'ipynb'
  ): Promise<NotebookDefinitionResponse> {
    const url = `/workspaces/${workspaceId}/notebooks/${notebookId}/getDefinition?format=${format}`;
    const response = await this.post<NotebookDefinitionResponse>(url);
    
    // The API might return a 202 with operation details
    // In that case, the response would have operationId instead of definition
    if (!(response as any).definition && (response as any).operationId) {
      console.warn('Notebook definition API returned 202 - async operation not yet supported');
      throw new Error('Notebook definition is being prepared. Please try again in a moment.');
    }
    
    return response;
  }

  /**
   * Update the notebook definition (overwrites entire content)
   */
  async updateNotebookDefinition(
    workspaceId: string,
    notebookId: string,
    definition: NotebookDefinition,
    updateMetadata: boolean = false
  ): Promise<void> {
    const url = `/workspaces/${workspaceId}/notebooks/${notebookId}/updateDefinition?updateMetadata=${updateMetadata}`;
    await this.post(url, { definition });
  }

  /**
   * Parse base64 encoded ipynb content
   */
  decodeNotebookContent(base64Content: string): NotebookContent {
    const jsonString = atob(base64Content);
    return JSON.parse(jsonString) as NotebookContent;
  }

  /**
   * Encode notebook content to base64
   */
  encodeNotebookContent(content: NotebookContent): string {
    const jsonString = JSON.stringify(content, null, 2);
    return btoa(jsonString);
  }

  /**
   * Add a code cell to the notebook
   */
  async addCodeCell(
    workspaceId: string,
    notebookId: string,
    code: string,
    language: 'python' | 'scala' | 'sql' | 'r' = 'python'
  ): Promise<void> {
    // Get current notebook definition
    const defResponse = await this.getNotebookDefinition(workspaceId, notebookId, 'ipynb');
    
    // Find the notebook content part
    const contentPart = defResponse.definition.parts.find(p => 
      p.path.endsWith('.ipynb')
    );
    
    if (!contentPart) {
      throw new Error('No notebook content found');
    }

    // Decode and parse the content
    const notebookContent = this.decodeNotebookContent(contentPart.payload);

    // Create new cell
    const newCell: NotebookCell = {
      cell_type: 'code',
      source: code.split('\n').map(line => line + '\n'),
      metadata: {
        language: language
      },
      outputs: [],
      execution_count: null
    };

    // Add cell to the end
    notebookContent.cells.push(newCell);

    // Encode updated content
    const updatedPayload = this.encodeNotebookContent(notebookContent);

    // Update the definition
    const updatedDefinition: NotebookDefinition = {
      format: 'ipynb',
      parts: defResponse.definition.parts.map(part => 
        part.path.endsWith('.ipynb')
          ? { ...part, payload: updatedPayload }
          : part
      )
    };

    await this.updateNotebookDefinition(workspaceId, notebookId, updatedDefinition);
  }

  /**
   * Add multiple cells to the notebook
   */
  async addCells(
    workspaceId: string,
    notebookId: string,
    cells: Array<{ type: 'code' | 'markdown', content: string, language?: 'python' | 'scala' | 'sql' | 'r' }>
  ): Promise<void> {
    // Get current notebook definition
    const defResponse = await this.getNotebookDefinition(workspaceId, notebookId, 'ipynb');
    
    console.log('Notebook definition response:', defResponse);
    
    if (!defResponse || !defResponse.definition) {
      throw new Error('Invalid notebook definition response');
    }
    
    if (!defResponse.definition.parts || !Array.isArray(defResponse.definition.parts)) {
      throw new Error('Notebook definition has no parts array');
    }
    
    // Find the notebook content part
    const contentPart = defResponse.definition.parts.find(p => 
      p.path.endsWith('.ipynb')
    );
    
    if (!contentPart) {
      throw new Error('No notebook content found in definition parts');
    }

    // Decode and parse the content
    const notebookContent = this.decodeNotebookContent(contentPart.payload);

    // Add all new cells
    for (const cell of cells) {
      const newCell: NotebookCell = {
        cell_type: cell.type,
        source: cell.content.split('\n').map(line => line + '\n'),
        metadata: cell.type === 'code' ? { language: cell.language || 'python' } : {},
        ...(cell.type === 'code' ? { outputs: [], execution_count: null } : {})
      };
      notebookContent.cells.push(newCell);
    }

    // Encode updated content
    const updatedPayload = this.encodeNotebookContent(notebookContent);

    // Update the definition
    const updatedDefinition: NotebookDefinition = {
      format: 'ipynb',
      parts: defResponse.definition.parts.map(part => 
        part.path.endsWith('.ipynb')
          ? { ...part, payload: updatedPayload }
          : part
      )
    };

    await this.updateNotebookDefinition(workspaceId, notebookId, updatedDefinition);
  }
}
