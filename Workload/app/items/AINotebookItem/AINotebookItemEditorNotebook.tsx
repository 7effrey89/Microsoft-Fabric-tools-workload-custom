import React, { useState, useEffect, useRef } from 'react';
import {
  Button,
  Text,
  tokens,
  makeStyles,
  shorthands,
  Tooltip,
  Spinner,
  Badge,
} from '@fluentui/react-components';
import {
  ChevronLeft24Regular,
  ChevronRight24Regular,
  Code24Regular,
  PlugConnected24Regular,
  PlugDisconnected24Regular,
} from '@fluentui/react-icons';
import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { ItemWithDefinition } from "../../controller/ItemCRUDController";
import { AINotebookItemDefinition } from "./AINotebookItemModel";
import { NotebookEditor, NotebookCell, CellType } from '../../components/NotebookEditor';
import { AssistantPanel } from '../../components/AssistantPanel';
import { AzureOpenAIClient, AssistantPlan, ModelId, DEFAULT_MODEL } from '../../clients/AzureOpenAIClient';
import { SparkLivyClient } from '../../clients/SparkLivyClient';
import { callDatahubOpen } from '../../controller/DataHubController';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    height: '100vh',
    backgroundColor: tokens.colorNeutralBackground2,
  },
  leftPanel: {
    width: '250px',
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke1),
    display: 'flex',
    flexDirection: 'column',
    transition: 'margin-left 0.3s ease',
  },
  leftPanelCollapsed: {
    marginLeft: '-250px',
  },
  centerPanel: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.overflow('hidden'),
  },
  rightPanel: {
    width: '350px',
    transition: 'margin-right 0.3s ease',
  },
  rightPanelCollapsed: {
    marginRight: '-350px',
  },
  infoPanel: {
    ...shorthands.padding('16px'),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('12px'),
  },
  infoHeader: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
  },
  infoCard: {
    ...shorthands.padding('12px'),
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.borderRadius('6px'),
  },
  connectionCard: {
    ...shorthands.padding('12px'),
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.borderRadius('6px'),
    marginBottom: '12px',
  },
  connectionInfo: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px'),
    marginTop: '12px',
  },
  connectionRow: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('2px'),
  },
  connectionLabel: {
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
  },
  connectionValue: {
    fontSize: '12px',
    fontFamily: 'monospace',
    wordBreak: 'break-all',
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
    marginTop: '8px',
  },
  toggleButton: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 10,
  },
  toggleButtonLeft: {
    left: '0px',
  },
  toggleButtonRight: {
    right: '0px',
  },
});

interface AINotebookItemEditorNotebookProps {
  workloadClient: WorkloadClientAPI;
  item: ItemWithDefinition<AINotebookItemDefinition>;
  onSave?: (plan?: AssistantPlan, cells?: NotebookCell[]) => Promise<void>;
}

export const AINotebookItemEditorNotebook: React.FC<AINotebookItemEditorNotebookProps> = ({
  workloadClient,
  item,
  onSave,
}) => {
  const styles = useStyles();

  // Panel visibility state
  const [isLeftPanelVisible, setIsLeftPanelVisible] = useState(true);
  const [isRightPanelVisible, setIsRightPanelVisible] = useState(true);

  // Livy connection state
  const [workspaceId, setWorkspaceId] = useState<string | undefined>();
  const [lakehouseId, setLakehouseId] = useState<string | undefined>();
  const [lakehouseName, setLakehouseName] = useState<string | undefined>();
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [sessionState, setSessionState] = useState<'disconnected' | 'connecting' | 'idle' | 'busy' | 'error'>('disconnected');
  const [connectionError, setConnectionError] = useState<string | undefined>();

  // Assistant state
  const [plan, setPlan] = useState<AssistantPlan | undefined>(
    item?.definition?.assistantPlan
  );
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [agentMode, setAgentMode] = useState(false);  // Agent Mode auto-executes next steps
  const [agentInstructions, setAgentInstructions] = useState<string>('');  // Custom system message for AI
  const [selectedModel, setSelectedModel] = useState<ModelId>(DEFAULT_MODEL);  // Selected AI model
  
  // Ref to track latest plan for use in async callbacks (avoids stale closure issues)
  const planRef = useRef<AssistantPlan | undefined>(plan);
  useEffect(() => {
    planRef.current = plan;
  }, [plan]);

  // Abort controller for stopping AI execution
  const abortControllerRef = useRef<AbortController | null>(null);
  const stoppedRef = useRef(false);  // Track if execution was stopped by user

  // Notebook cells state - for the interactive editor
  const [cells, setCells] = useState<NotebookCell[]>(
    item?.definition?.notebookCells && item.definition.notebookCells.length > 0
      ? item.definition.notebookCells
      : [{
          id: 'cell-1',
          code: '# Welcome to the AI Notebook Assistant\n# Write your PySpark code here and click Run to execute\n\nprint("Hello from Spark!")',
          cellType: 'code',
          output: undefined,
          isExecuting: false,
          hasError: false,
        }]
  );
  const [isExecutingCell, setIsExecutingCell] = useState(false);
  const [selectedCellId, setSelectedCellId] = useState<string | undefined>();

  // Clients
  const aiClient = new AzureOpenAIClient();
  const livyClientRef = useRef<SparkLivyClient | null>(null);

  // Initialize Livy client
  useEffect(() => {
    livyClientRef.current = new SparkLivyClient(workloadClient);
  }, [workloadClient]);

  // Auto-save when plan or cells change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onSave) {
        onSave(plan, cells);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [plan, cells, onSave]);

  // ============ LIVY CONNECTION MANAGEMENT ============

  // Auto-start Livy session when lakehouse is selected
  useEffect(() => {
    if (workspaceId && lakehouseId && livyClientRef.current && sessionState === 'disconnected') {
      // Automatically start the Livy session after lakehouse selection
      handleConnectLivy();
    }
  }, [workspaceId, lakehouseId]);

  const handleSelectLakehouse = async () => {
    try {
      const result = await callDatahubOpen(
        workloadClient,
        ["Lakehouse"],
        'Select a Lakehouse to connect to the Livy endpoint',
        false,
        true
      );

      if (result) {
        setWorkspaceId(result.workspaceId);
        setLakehouseId(result.id);
        setLakehouseName(result.displayName);
        setConnectionError(undefined);
      }
    } catch (error: any) {
      console.error('Error selecting lakehouse:', error);
    }
  };

  const handleConnectLivy = async () => {
    if (!workspaceId || !lakehouseId || !livyClientRef.current) {
      await workloadClient.notification.open({
        notificationType: 'warning' as any,
        title: 'Select Lakehouse First',
        message: 'Please select a lakehouse before connecting to Livy.',
        duration: 'short' as any,
      });
      return;
    }

    setSessionState('connecting');
    setConnectionError(undefined);

    try {
      // Create a new Livy session (send empty body like the Python sample)
      const sessionResponse = await livyClientRef.current.createSession(
        workspaceId,
        lakehouseId,
        {} as any  // Empty body - Fabric Livy API accepts this
      );

      const newSessionId = sessionResponse.id?.toString();
      if (!newSessionId) {
        throw new Error('No session ID returned from Livy');
      }

      setSessionId(newSessionId);
      
      // Wait for session to be ready
      await waitForSessionReady(workspaceId, lakehouseId, newSessionId);

      await workloadClient.notification.open({
        notificationType: 'success' as any,
        title: 'Connected to Livy',
        message: 'Spark session is ready. You can now execute cells.',
        duration: 'short' as any,
      });

    } catch (error: any) {
      console.error('Error connecting to Livy:', error);
      setSessionState('error');
      setConnectionError(error.message || 'Failed to connect');
      await workloadClient.notification.open({
        notificationType: 'error' as any,
        title: 'Connection Failed',
        message: error.message || 'Failed to connect to Livy endpoint',
        duration: 'long' as any,
      });
    }
  };

  const waitForSessionReady = async (wsId: string, lhId: string, sessId: string): Promise<void> => {
    const maxAttempts = 60; // 5 minutes max
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const session = await livyClientRef.current!.getSession(wsId, lhId, sessId);
        const state = session.state?.toLowerCase();

        if (state === 'idle') {
          setSessionState('idle');
          return;
        } else if (state === 'dead' || state === 'killed' || state === 'error') {
          throw new Error(`Session entered ${state} state`);
        }

        // Still starting
        setSessionState('connecting');
        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;
      } catch (error: any) {
        throw new Error(`Failed to get session status: ${error.message}`);
      }
    }

    throw new Error('Session initialization timed out after 5 minutes');
  };

  const handleDisconnectLivy = async () => {
    if (!workspaceId || !lakehouseId || !sessionId || !livyClientRef.current) {
      setSessionState('disconnected');
      setSessionId(undefined);
      return;
    }

    try {
      await livyClientRef.current.deleteSession(workspaceId, lakehouseId, sessionId);
      await workloadClient.notification.open({
        notificationType: 'success' as any,
        title: 'Disconnected',
        message: 'Spark session has been terminated.',
        duration: 'short' as any,
      });
    } catch (error: any) {
      console.error('Error disconnecting:', error);
    } finally {
      setSessionState('disconnected');
      setSessionId(undefined);
      setConnectionError(undefined);
    }
  };

  const getLivyEndpoint = () => {
    if (!workspaceId || !lakehouseId) return 'Not configured';
    return `https://api.fabric.microsoft.com/v1/workspaces/${workspaceId}/lakehouses/${lakehouseId}/livyapi/versions/2023-12-01/sessions`;
  };

  // ============ NOTEBOOK CELL MANAGEMENT ============

  const handleAddCell = (afterCellId?: string, cellType: CellType = 'code') => {
    const newCell: NotebookCell = {
      id: `cell-${Date.now()}`,
      code: cellType === 'code' 
        ? '# Write your PySpark code here\n'
        : '# Markdown Cell\n\nDouble-click to edit this markdown cell.',
      cellType,
      output: undefined,
      isExecuting: false,
      hasError: false,
      isEditing: cellType === 'markdown', // Start markdown cells in edit mode
    };
    
    if (afterCellId) {
      // Insert after the specified cell
      const index = cells.findIndex(c => c.id === afterCellId);
      if (index !== -1) {
        const newCells = [...cells];
        newCells.splice(index + 1, 0, newCell);
        setCells(newCells);
      } else {
        setCells([...cells, newCell]);
      }
    } else {
      // Add at the beginning if no afterCellId (for "add above" first cell)
      if (cells.length === 0) {
        setCells([newCell]);
      } else {
        setCells([newCell, ...cells]);
      }
    }
    setSelectedCellId(newCell.id);
  };

  const handleCellTypeChange = (cellId: string, cellType: CellType) => {
    setCells(cells.map(c => 
      c.id === cellId ? { ...c, cellType, isEditing: cellType === 'markdown' } : c
    ));
  };

  const handleCellEditingChange = (cellId: string, isEditing: boolean) => {
    setCells(cells.map(c => 
      c.id === cellId ? { ...c, isEditing } : c
    ));
  };

  const handleCellCodeChange = (cellId: string, code: string) => {
    setCells(cells.map(cell => 
      cell.id === cellId ? { ...cell, code } : cell
    ));
  };

  const handleCellExecute = async (cellId: string) => {
    const cellIndex = cells.findIndex(c => c.id === cellId);
    if (cellIndex === -1) return;

    const cell = cells[cellIndex];

    // Mark cell as executing
    setCells(cells.map(c => 
      c.id === cellId ? { ...c, isExecuting: true, output: undefined, hasError: false, executionTime: undefined } : c
    ));
    setIsExecutingCell(true);

    // Track if we're executing via Livy
    const isLivyExecution = sessionState === 'idle' && sessionId && workspaceId && lakehouseId && livyClientRef.current;

    try {
      let output: string;
      let executionTime: number | undefined;

      // Check if connected to Livy
      if (isLivyExecution) {
        // console.log('[Livy] Submitting statement:', cell.code.substring(0, 100));
        setSessionState('busy');

        const statementResponse = await livyClientRef.current!.submitStatement(
          workspaceId!,
          lakehouseId!,
          sessionId!,
          { code: cell.code, kind: 'pyspark' }
        );

        // Wait for statement to complete
        const result = await waitForStatementResult(
          workspaceId!,
          lakehouseId!,
          sessionId!,
          statementResponse.id!.toString()
        );

        output = result.output;
        executionTime = result.executionTime;

        setSessionState('idle');
      } else {
        // Simulate execution if not connected
        // console.log('[Simulated] Executing cell:', cell.code.substring(0, 100));
        const startTime = Date.now();
        await new Promise(resolve => setTimeout(resolve, 1500));
        executionTime = Date.now() - startTime;
        
        // Simulate output based on code content
        output = '[Not connected to Livy - simulated output]\n';
        if (cell.code.includes('print(')) {
          const printMatch = cell.code.match(/print\(['"](.*)['"]/);
          if (printMatch) {
            output += printMatch[1];
          }
        } else if (cell.code.includes('spark.')) {
          output += 'DataFrame operations executed.';
        } else {
          output += 'Cell executed (connect to Livy for actual execution)';
        }
      }

      // Update cell with output
      setCells(cells.map(c => 
        c.id === cellId ? { ...c, isExecuting: false, output, hasError: false, executionTime } : c
      ));

    } catch (error: any) {
      console.error('Cell execution error:', error);
      // Always reset session state to idle if we were executing via Livy
      if (isLivyExecution) {
        setSessionState('idle');
      }
      setCells(cells.map(c => 
        c.id === cellId ? { 
          ...c, 
          isExecuting: false, 
          output: `Error: ${error.message || 'Execution failed'}`, 
          hasError: true,
          executionTime: error.executionTime // Include execution time even for errors
        } : c
      ));
    } finally {
      setIsExecutingCell(false);
    }
  };

  const handleCellDelete = (cellId: string) => {
    setCells(cells.filter(c => c.id !== cellId));
  };

  const handleMoveCell = (cellId: string, direction: 'up' | 'down') => {
    const index = cells.findIndex(c => c.id === cellId);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= cells.length) return;
    
    const newCells = [...cells];
    [newCells[index], newCells[newIndex]] = [newCells[newIndex], newCells[index]];
    setCells(newCells);
  };

  const handleRunAllCells = async () => {
    for (const cell of cells) {
      if (stoppedRef.current) break;
      // Only run code cells, skip markdown cells
      if (cell.cellType === 'code' && cell.code.trim()) {
        await handleCellExecute(cell.id);
      }
    }
  };

  const handleRunCellsBelow = async (fromCellId: string, includeCurrent: boolean) => {
    const startIndex = cells.findIndex(c => c.id === fromCellId);
    if (startIndex === -1) return;
    
    const cellsToRun = includeCurrent ? cells.slice(startIndex) : cells.slice(startIndex + 1);
    
    for (const cell of cellsToRun) {
      if (stoppedRef.current) break;
      // Only run code cells, skip markdown cells
      if (cell.cellType === 'code' && cell.code.trim()) {
        await handleCellExecute(cell.id);
      }
    }
  };

  const handleClearAllOutputs = () => {
    setCells(cells.map((c): NotebookCell => ({ ...c, output: undefined, hasError: false, executionTime: undefined })));
  };

  // Handle importing notebook cells
  const handleImportNotebook = (importedCells: NotebookCell[]) => {
    setCells(importedCells);
    setSelectedCellId(importedCells.length > 0 ? importedCells[0].id : undefined);
    
    workloadClient.notification.open({
      notificationType: 'success' as any,
      title: 'Notebook Imported',
      message: `Successfully imported ${importedCells.length} cell(s).`,
      duration: 'short' as any,
    });
  };

  // Handle exporting notebook as .ipynb
  const handleExportNotebook = async () => {
    // Build .ipynb structure
    const notebook = {
      nbformat: 4,
      nbformat_minor: 5,
      metadata: {
        kernelspec: {
          display_name: 'Python 3',
          language: 'python',
          name: 'python3'
        },
        language_info: {
          name: 'python',
          version: '3.10.0'
        }
      },
      cells: cells.map((cell, index) => {
        // Handle markdown cells
        if (cell.cellType === 'markdown') {
          return {
            cell_type: 'markdown',
            metadata: {},
            source: cell.code.split('\n').map((line, i, arr) => 
              i < arr.length - 1 ? line + '\n' : line
            )
          };
        }

        // Handle code cells
        const ipynbCell: any = {
          cell_type: 'code',
          execution_count: index + 1,
          metadata: {},
          source: cell.code.split('\n').map((line, i, arr) => 
            i < arr.length - 1 ? line + '\n' : line
          ),
          outputs: []
        };

        // Add output if present
        if (cell.output) {
          if (cell.hasError) {
            // Error output
            const errorLines = cell.output.split('\n');
            const ename = errorLines[0]?.split(':')[0] || 'Error';
            const evalue = errorLines[0]?.split(':').slice(1).join(':').trim() || cell.output;
            
            ipynbCell.outputs.push({
              output_type: 'error',
              ename: ename,
              evalue: evalue,
              traceback: errorLines
            });
          } else {
            // Normal output
            ipynbCell.outputs.push({
              output_type: 'stream',
              name: 'stdout',
              text: cell.output.split('\n').map((line, i, arr) => 
                i < arr.length - 1 ? line + '\n' : line
              )
            });
          }
        }

        return ipynbCell;
      })
    };

    // Create notebook JSON
    const notebookJson = JSON.stringify(notebook, null, 2);
    const fileName = `${item?.displayName || 'notebook'}.ipynb`;
    
    // In Fabric sandboxed iframes, we can only use clipboard
    // The navigation.openBrowserTab API doesn't allow data URLs
    try {
      await navigator.clipboard.writeText(notebookJson);
      
      workloadClient.notification.open({
        notificationType: 'success' as any,
        title: 'Notebook Copied to Clipboard',
        message: `Copied ${cells.length} cell(s). Create a new file, paste the content, and save as "${fileName}"`,
        duration: 'long' as any,
      });
    } catch (clipboardError) {
      console.error('Clipboard write failed:', clipboardError);
      
      // If clipboard fails, log the content to console so user can copy from there
      console.log('=== NOTEBOOK EXPORT ===');
      console.log(`Save the following content as: ${fileName}`);
      console.log(notebookJson);
      console.log('=== END NOTEBOOK EXPORT ===');
      
      workloadClient.notification.open({
        notificationType: 'warning' as any,
        title: 'Clipboard Access Denied',
        message: `Notebook content logged to browser console (F12). Copy from there and save as "${fileName}"`,
        duration: 'long' as any,
      });
    }
  };

  // Result type for statement execution
  interface StatementResult {
    output: string;
    executionTime?: number; // in milliseconds
  }

  const waitForStatementResult = async (
    wsId: string,
    lhId: string,
    sessId: string,
    stmtId: string
  ): Promise<StatementResult> => {
    const maxAttempts = 120; // 10 minutes max
    let attempts = 0;

    while (attempts < maxAttempts) {
      const statement = await livyClientRef.current!.getStatement(wsId, lhId, sessId, stmtId);
      // console.log(`[Livy] Statement status (attempt ${attempts + 1}):`, JSON.stringify(statement, null, 2));
      
      const state = statement.state?.toLowerCase();

      // Calculate execution time if available
      const executionTime = (statement.started && statement.completed) 
        ? statement.completed - statement.started 
        : undefined;

      if (state === 'available') {
        const output = statement.output;
        // console.log(`[Livy] Statement output:`, JSON.stringify(output, null, 2));
        
        if (output?.status === 'ok') {
          const data = output.data;
          if (data && data['text/plain']) {
            return { output: data['text/plain'], executionTime };
          }
          return { output: JSON.stringify(data, null, 2), executionTime };
        } else if (output?.status === 'error') {
          // Extract detailed error information from Livy response
          // Error fields can be at output level or nested in output.data
          const ename = output.ename || output.data?.ename || 'Error';
          const evalue = output.evalue || output.data?.evalue || '';
          const traceback = output.traceback || output.data?.traceback || [];
          
          // Build a detailed error message similar to Python/Fabric notebook errors
          let errorMessage = `${ename}: ${evalue}`;
          
          // Add traceback if available
          if (traceback && traceback.length > 0) {
            errorMessage += '\n\nTraceback:\n' + traceback.join('\n');
          }
          
          // Fallback to text/plain if no structured error info
          if (!evalue && output.data?.['text/plain']) {
            errorMessage = output.data['text/plain'];
          }
          
          const error = new Error(errorMessage) as any;
          error.executionTime = executionTime;
          throw error;
        }
        return { output: 'Execution completed', executionTime };
      } else if (state === 'error' || state === 'cancelled') {
        // Check if there's output with error details even in error state
        const output = statement.output;
        if (output) {
          const ename = output.ename || output.data?.ename || 'Error';
          const evalue = output.evalue || output.data?.evalue || `Statement ${state}`;
          const traceback = output.traceback || output.data?.traceback || [];
          
          let errorMessage = `${ename}: ${evalue}`;
          if (traceback && traceback.length > 0) {
            errorMessage += '\n\nTraceback:\n' + traceback.join('\n');
          }
          const error = new Error(errorMessage) as any;
          error.executionTime = executionTime;
          throw error;
        }
        throw new Error(`Statement ${state}`);
      }

      // Still running
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    }

    throw new Error('Statement execution timed out');
  };

  // ============ AI ASSISTANT HANDLERS ============

  const handleStop = () => {
    // Signal to stop execution
    stoppedRef.current = true;
    abortControllerRef.current?.abort();
    
    // Reset execution states
    setIsGeneratingPlan(false);
    setIsExecutingCell(false);
    setSessionState(prev => prev === 'busy' ? 'idle' : prev);
    
    // Mark any running cells as stopped
    setCells(prev => prev.map(c => 
      c.isExecuting ? { ...c, isExecuting: false, output: '[Execution stopped by user]', hasError: true } : c
    ));
    
    // Mark current running step as failed
    setPlan(prev => {
      if (!prev) return prev;
      const steps = prev.steps.map(s => 
        s.status === 'running' ? { ...s, status: 'failed' as const, result: 'Stopped by user' } : s
      );
      return { ...prev, steps };
    });

    workloadClient.notification.open({
      notificationType: 'informational' as any,
      title: 'Execution Stopped',
      message: 'The AI assistant execution was stopped.',
      duration: 'short' as any,
    });
  };

  const handleGeneratePlan = async (task: string) => {
    setIsGeneratingPlan(true);
    try {
      const newPlan = await aiClient.generatePlan(task, undefined, agentInstructions, selectedModel);
      setPlan(newPlan);
    } catch (error) {
      console.error('Error generating plan:', error);
      await workloadClient.notification.open({
        notificationType: 'error' as any,
        title: 'Failed to Generate Plan',
        message: error instanceof Error ? error.message : 'Unknown error',
        duration: 'long' as any,
      });
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleProceedToNextStep = async () => {
    // Reset stopped flag when starting new execution
    stoppedRef.current = false;
    
    // Use ref to get latest plan state (avoids stale closure issues in setTimeout callbacks)
    const currentPlan = planRef.current;
    if (!currentPlan || currentPlan.currentStepIndex >= currentPlan.steps.length) return;

    const currentStep = currentPlan.steps[currentPlan.currentStepIndex];
    const currentStepIndex = currentPlan.currentStepIndex;
    
    // Generate code for the current step
    try {
      const generatedCode = await aiClient.generateCode(currentStep, undefined, agentInstructions, selectedModel);
      
      // Create a new cell with the generated code - mark as executing immediately
      const newCellId = `cell-${Date.now()}`;
      const newCell: NotebookCell = {
        id: newCellId,
        code: generatedCode,
        cellType: 'code',
        output: undefined,
        isExecuting: true, // Start executing immediately
        hasError: false,
      };
      
      // Add the cell to the notebook - use functional update to avoid stale closure
      setCells(prevCells => [...prevCells, newCell]);
      setIsExecutingCell(true);

      // Update step status to running
      const updatedSteps = [...currentPlan.steps];
      updatedSteps[currentStepIndex] = {
        ...currentStep,
        status: 'running',
      };
      setPlan({ ...currentPlan, steps: updatedSteps });

      // Execute the cell
      const isLivyExecution = sessionState === 'idle' && sessionId && workspaceId && lakehouseId && livyClientRef.current;
      
      try {
        let output: string;
        let executionTime: number | undefined;

        if (isLivyExecution) {
          setSessionState('busy');

          const statementResponse = await livyClientRef.current!.submitStatement(
            workspaceId!,
            lakehouseId!,
            sessionId!,
            { code: generatedCode, kind: 'pyspark' }
          );

          const result = await waitForStatementResult(
            workspaceId!,
            lakehouseId!,
            sessionId!,
            statementResponse.id!.toString()
          );

          output = result.output;
          executionTime = result.executionTime;
          setSessionState('idle');
        } else {
          // Simulate execution if not connected
          const startTime = Date.now();
          await new Promise(resolve => setTimeout(resolve, 1500));
          executionTime = Date.now() - startTime;
          
          output = '[Not connected to Livy - simulated output]\n';
          if (generatedCode.includes('print(')) {
            const printMatch = generatedCode.match(/print\(['"](.*)['"]/);
            if (printMatch) {
              output += printMatch[1];
            }
          } else if (generatedCode.includes('spark.')) {
            output += 'DataFrame operations executed.';
          } else {
            output += 'Cell executed (connect to Livy for actual execution)';
          }
        }

        // Update cell with output - success
        setCells(prev => prev.map(c => 
          c.id === newCellId ? { ...c, isExecuting: false, output, hasError: false, executionTime } : c
        ));

        // Store the result in the step for context
        const stepWithResult = { ...currentStep, status: 'completed' as const, result: output, code: generatedCode };

        // Review the execution result and decide how to proceed
        const review = await aiClient.reviewAndRevise(currentPlan, stepWithResult, output, false, agentInstructions, selectedModel);
        
        // Check if plan needs revision based on the output
        if (review.needsRevision && review.revisedSteps && review.revisedSteps.length > 0) {
          // Update plan with revised remaining steps
          setPlan(prev => {
            if (!prev) return prev;
            const completedSteps = prev.steps.slice(0, currentStepIndex + 1);
            completedSteps[currentStepIndex] = stepWithResult;
            return {
              ...prev,
              steps: [...completedSteps, ...review.revisedSteps!],
              currentStepIndex: currentStepIndex + 1
            };
          });

          await workloadClient.notification.open({
            notificationType: 'warning' as any,
            title: 'Plan Revised',
            message: `Based on the output, the remaining steps have been adjusted: ${review.analysis.substring(0, 100)}...`,
            duration: 'long' as any,
          });
        } else {
          // No revision needed, just mark as completed and move to next
          const nextStepIndex = currentStepIndex + 1;
          
          setPlan(prev => {
            if (!prev) return prev;
            const steps = [...prev.steps];
            steps[currentStepIndex] = stepWithResult;
            return { ...prev, steps, currentStepIndex: nextStepIndex };
          });

          await workloadClient.notification.open({
            notificationType: 'success' as any,
            title: 'Step Completed',
            message: `${review.analysis.substring(0, 100)}${review.analysis.length > 100 ? '...' : ''}`,
            duration: 'short' as any,
          });
        }

        // Agent Mode: automatically proceed to next step if enabled
        // Calculate the new step index that will be set
        const newStepIndex = currentStepIndex + 1;
        const totalSteps = (review.needsRevision && review.revisedSteps) 
          ? currentStepIndex + 1 + review.revisedSteps.length  // completed steps + revised remaining
          : currentPlan.steps.length;
        const hasMoreSteps = newStepIndex < totalSteps;
          
        if (agentMode && hasMoreSteps && !stoppedRef.current) {
          // Wait for state to update, then use ref to get fresh plan
          setTimeout(() => {
            if (!stoppedRef.current) {  // Double-check before proceeding
              handleProceedToNextStep();
            }
          }, 500);
        }

      } catch (execError: any) {
        console.error('Cell execution error:', execError);
        
        if (isLivyExecution) {
          setSessionState('idle');
        }

        const errorOutput = execError.message || 'Execution failed';

        // Update cell with error
        setCells(prev => prev.map(c => 
          c.id === newCellId ? { 
            ...c, 
            isExecuting: false, 
            output: `Error: ${errorOutput}`, 
            hasError: true,
            executionTime: execError.executionTime
          } : c
        ));

        // Review the error and try to get correction code
        const stepWithError = { ...currentStep, code: generatedCode, error: errorOutput };
        const review = await aiClient.reviewAndRevise(currentPlan, stepWithError, errorOutput, true, agentInstructions, selectedModel);

        if (review.correctionCode && agentMode && !stoppedRef.current) {
          // Agent Mode: automatically try to fix the error
          await workloadClient.notification.open({
            notificationType: 'warning' as any,
            title: 'Error Detected - Attempting Fix',
            message: review.analysis.substring(0, 100),
            duration: 'short' as any,
          });

          // Create a new cell with the correction code
          const correctionCellId = `cell-${Date.now()}`;
          const correctionCell: NotebookCell = {
            id: correctionCellId,
            code: review.correctionCode,
            cellType: 'code',
            output: undefined,
            isExecuting: true,
            hasError: false,
          };
          setCells(prev => [...prev, correctionCell]);

          // Execute the correction code
          try {
            let correctionOutput: string;
            let correctionTime: number | undefined;

            if (isLivyExecution) {
              setSessionState('busy');
              const statementResponse = await livyClientRef.current!.submitStatement(
                workspaceId!,
                lakehouseId!,
                sessionId!,
                { code: review.correctionCode, kind: 'pyspark' }
              );
              const result = await waitForStatementResult(
                workspaceId!,
                lakehouseId!,
                sessionId!,
                statementResponse.id!.toString()
              );
              correctionOutput = result.output;
              correctionTime = result.executionTime;
              setSessionState('idle');
            } else {
              const startTime = Date.now();
              await new Promise(resolve => setTimeout(resolve, 1000));
              correctionTime = Date.now() - startTime;
              correctionOutput = '[Simulated correction output]';
            }

            // Update correction cell with success
            setCells(prev => prev.map(c => 
              c.id === correctionCellId ? { ...c, isExecuting: false, output: correctionOutput, hasError: false, executionTime: correctionTime } : c
            ));

            // Mark step as completed after successful correction
            const nextStepIndex = currentStepIndex + 1;
            const hasMoreSteps = nextStepIndex < currentPlan.steps.length;
            
            setPlan(prev => {
              if (!prev) return prev;
              const steps = [...prev.steps];
              steps[currentStepIndex] = { ...currentStep, status: 'completed', result: correctionOutput };
              return { ...prev, steps, currentStepIndex: nextStepIndex };
            });

            await workloadClient.notification.open({
              notificationType: 'success' as any,
              title: 'Error Fixed',
              message: 'The correction was successful. Continuing with the plan.',
              duration: 'short' as any,
            });

            // Continue to next step - use ref for fresh state
            if (agentMode && hasMoreSteps && !stoppedRef.current) {
              setTimeout(() => {
                if (!stoppedRef.current) {
                  handleProceedToNextStep();
                }
              }, 500);
            }

          } catch (correctionError: any) {
            // Correction also failed
            setCells(prev => prev.map(c => 
              c.id === correctionCellId ? { 
                ...c, 
                isExecuting: false, 
                output: `Correction failed: ${correctionError.message}`, 
                hasError: true 
              } : c
            ));

            setPlan(prev => {
              if (!prev) return prev;
              const steps = [...prev.steps];
              steps[currentStepIndex] = { ...currentStep, status: 'failed', error: 'Correction attempt also failed' };
              return { ...prev, steps };
            });
          }
        } else {
          // No correction available or agent mode disabled, just mark as failed
          setPlan(prev => {
            if (!prev) return prev;
            const steps = [...prev.steps];
            steps[currentStepIndex] = { ...currentStep, status: 'failed', error: errorOutput };
            return { ...prev, steps };
          });
        }
      } finally {
        setIsExecutingCell(false);
      }

    } catch (error: any) {
      console.error('Error generating code:', error);
      await workloadClient.notification.open({
        notificationType: 'error' as any,
        title: 'Failed to Generate Code',
        message: error.message || 'Unknown error',
        duration: 'long' as any,
      });

      const updatedSteps = [...currentPlan.steps];
      updatedSteps[currentStepIndex] = {
        ...currentStep,
        status: 'failed',
        error: error.message,
      };
      setPlan({ ...currentPlan, steps: updatedSteps });
    }
  };

  const handleRegeneratePlan = () => {
    setPlan(undefined);
  };

  return (
    <div className={styles.container}>
      {/* Left Panel - Notebook Info */}
      <div className={`${styles.leftPanel} ${!isLeftPanelVisible ? styles.leftPanelCollapsed : ''}`}>
        <div className={styles.infoPanel}>
          <div className={styles.infoHeader}>
            <Code24Regular />
            <Text weight="semibold">Notebook</Text>
          </div>

          {/* Connection Card */}
          <div className={styles.connectionCard}>
            <Text size={200} weight="semibold">Livy Connection</Text>
            
            <div className={styles.statusBadge}>
              {sessionState === 'disconnected' && (
                <Badge appearance="outline" color="warning">Disconnected</Badge>
              )}
              {sessionState === 'connecting' && (
                <><Spinner size="tiny" /><Text size={200}>Connecting...</Text></>
              )}
              {sessionState === 'idle' && (
                <Badge appearance="filled" color="success">Connected</Badge>
              )}
              {sessionState === 'busy' && (
                <><Spinner size="tiny" /><Badge appearance="filled" color="informative">Busy</Badge></>
              )}
              {sessionState === 'error' && (
                <Badge appearance="filled" color="danger">Error</Badge>
              )}
            </div>

            {/* Lakehouse Selection */}
            <div style={{ marginTop: '12px' }}>
              <Button
                appearance="secondary"
                size="small"
                onClick={handleSelectLakehouse}
                disabled={sessionState !== 'disconnected'}
              >
                {lakehouseName ? `Lakehouse: ${lakehouseName}` : 'Select Lakehouse'}
              </Button>
            </div>

            {/* Connect/Disconnect Button */}
            <div style={{ marginTop: '8px' }}>
              {sessionState === 'disconnected' || sessionState === 'error' ? (
                <Button
                  appearance="primary"
                  size="small"
                  icon={<PlugConnected24Regular />}
                  onClick={handleConnectLivy}
                  disabled={!lakehouseId}
                >
                  Start Livy Session
                </Button>
              ) : sessionState === 'connecting' ? (
                <Button
                  appearance="secondary"
                  size="small"
                  disabled
                >
                  Connecting...
                </Button>
              ) : (
                <Button
                  appearance="secondary"
                  size="small"
                  icon={<PlugDisconnected24Regular />}
                  onClick={handleDisconnectLivy}
                >
                  End Session
                </Button>
              )}
            </div>

            {connectionError && (
              <Text size={100} style={{ color: tokens.colorPaletteRedForeground1, marginTop: '8px', display: 'block' }}>
                {connectionError}
              </Text>
            )}

            {/* Connection Details */}
            {lakehouseId && (
              <div className={styles.connectionInfo}>
                <div className={styles.connectionRow}>
                  <Text className={styles.connectionLabel}>Workspace ID:</Text>
                  <Text className={styles.connectionValue}>{workspaceId || 'Not set'}</Text>
                </div>
                <div className={styles.connectionRow}>
                  <Text className={styles.connectionLabel}>Lakehouse ID:</Text>
                  <Text className={styles.connectionValue}>{lakehouseId}</Text>
                </div>
                {sessionId && (
                  <div className={styles.connectionRow}>
                    <Text className={styles.connectionLabel}>Session ID:</Text>
                    <Text className={styles.connectionValue}>{sessionId}</Text>
                  </div>
                )}
                <div className={styles.connectionRow}>
                  <Text className={styles.connectionLabel}>Livy Endpoint:</Text>
                  <Text className={styles.connectionValue} style={{ fontSize: '10px' }}>
                    {getLivyEndpoint()}
                  </Text>
                </div>
              </div>
            )}
          </div>

          {/* Cells Info Card */}
          <div className={styles.infoCard}>
            <Text size={200} weight="semibold">Cells:</Text>
            <Text size={300} style={{ marginLeft: '8px' }}>{cells.length}</Text>
            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: `1px solid ${tokens.colorNeutralStroke2}` }}>
              <Text size={200} weight="semibold" style={{ marginBottom: '8px', display: 'block' }}>
                Tips:
              </Text>
              <Text size={200} style={{ color: tokens.colorNeutralForeground3, display: 'block', marginBottom: '4px' }}>
                • Use the AI Assistant to generate code
              </Text>
              <Text size={200} style={{ color: tokens.colorNeutralForeground3, display: 'block', marginBottom: '4px' }}>
                • Click + to add new cells
              </Text>
              <Text size={200} style={{ color: tokens.colorNeutralForeground3, display: 'block' }}>
                • Click ▶ to run a cell
              </Text>
            </div>
          </div>
        </div>
      </div>

      {/* Toggle Button for Left Panel */}
      {!isLeftPanelVisible && (
        <Tooltip content="Show panel" relationship="label">
          <Button
            appearance="subtle"
            icon={<ChevronRight24Regular />}
            onClick={() => setIsLeftPanelVisible(true)}
            className={`${styles.toggleButton} ${styles.toggleButtonLeft}`}
          />
        </Tooltip>
      )}
      {isLeftPanelVisible && (
        <Tooltip content="Hide panel" relationship="label">
          <Button
            appearance="subtle"
            icon={<ChevronLeft24Regular />}
            onClick={() => setIsLeftPanelVisible(false)}
            style={{ position: 'absolute', left: '250px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}
          />
        </Tooltip>
      )}

      {/* Center Panel - Interactive Notebook Editor */}
      <div className={styles.centerPanel}>
        <NotebookEditor
          cells={cells}
          onCellCodeChange={handleCellCodeChange}
          onCellExecute={handleCellExecute}
          onCellDelete={handleCellDelete}
          onAddCell={handleAddCell}
          onCellTypeChange={handleCellTypeChange}
          onCellEditingChange={handleCellEditingChange}
          onMoveCell={handleMoveCell}
          onRunAllCells={handleRunAllCells}
          onRunCellsBelow={handleRunCellsBelow}
          onClearAllOutputs={handleClearAllOutputs}
          onImportNotebook={handleImportNotebook}
          onExportNotebook={handleExportNotebook}
          isExecuting={isExecutingCell}
          selectedCellId={selectedCellId}
          onSelectCell={setSelectedCellId}
        />
      </div>

      {/* Toggle Button for Right Panel */}
      {!isRightPanelVisible && (
        <Tooltip content="Show assistant panel" relationship="label">
          <Button
            appearance="subtle"
            icon={<ChevronLeft24Regular />}
            onClick={() => setIsRightPanelVisible(true)}
            style={{ position: 'absolute', right: '0px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}
          />
        </Tooltip>
      )}
      {isRightPanelVisible && (
        <Tooltip content="Hide assistant panel" relationship="label">
          <Button
            appearance="subtle"
            icon={<ChevronRight24Regular />}
            onClick={() => setIsRightPanelVisible(false)}
            style={{ position: 'absolute', right: '350px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}
          />
        </Tooltip>
      )}

      {/* Right Panel - AI Assistant */}
      <div className={`${styles.rightPanel} ${!isRightPanelVisible ? styles.rightPanelCollapsed : ''}`}>
        <AssistantPanel
          plan={plan}
          isGeneratingPlan={isGeneratingPlan}
          isExecuting={isExecutingCell}
          onGeneratePlan={handleGeneratePlan}
          onProceedToNextStep={handleProceedToNextStep}
          onRegeneratePlan={handleRegeneratePlan}
          onStop={handleStop}
          agentMode={agentMode}
          onAgentModeChange={setAgentMode}
          agentInstructions={agentInstructions}
          onAgentInstructionsChange={setAgentInstructions}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
        />
      </div>
    </div>
  );
};
