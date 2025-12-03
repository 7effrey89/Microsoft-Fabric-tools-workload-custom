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
import { HelloWorldItemDefinition } from "./HelloWorldItemModel";
import { NotebookEditor, NotebookCell } from '../../components/NotebookEditor';
import { AssistantPanel } from '../../components/AssistantPanel';
import { AzureOpenAIClient, AssistantPlan } from '../../clients/AzureOpenAIClient';
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

interface HelloWorldItemEditorNotebookProps {
  workloadClient: WorkloadClientAPI;
  item: ItemWithDefinition<HelloWorldItemDefinition>;
  onSave?: (plan?: AssistantPlan) => Promise<void>;
}

export const HelloWorldItemEditorNotebook: React.FC<HelloWorldItemEditorNotebookProps> = ({
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

  // Notebook cells state - for the interactive editor
  const [cells, setCells] = useState<NotebookCell[]>([
    {
      id: 'cell-1',
      code: '# Welcome to the AI Notebook Assistant\n# Write your PySpark code here and click Run to execute\n\nprint("Hello from Spark!")',
      output: undefined,
      isExecuting: false,
      hasError: false,
    }
  ]);
  const [isExecutingCell, setIsExecutingCell] = useState(false);

  // Clients
  const aiClient = new AzureOpenAIClient();
  const livyClientRef = useRef<SparkLivyClient | null>(null);

  // Initialize Livy client
  useEffect(() => {
    livyClientRef.current = new SparkLivyClient(workloadClient);
  }, [workloadClient]);

  // Auto-save when plan changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onSave && plan) {
        onSave(plan);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [plan, onSave]);

  // ============ LIVY CONNECTION MANAGEMENT ============

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

  const handleAddCell = () => {
    const newCell: NotebookCell = {
      id: `cell-${Date.now()}`,
      code: '# Write your PySpark code here\n',
      output: undefined,
      isExecuting: false,
      hasError: false,
    };
    setCells([...cells, newCell]);
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
      c.id === cellId ? { ...c, isExecuting: true, output: undefined, hasError: false } : c
    ));
    setIsExecutingCell(true);

    // Track if we're executing via Livy
    const isLivyExecution = sessionState === 'idle' && sessionId && workspaceId && lakehouseId && livyClientRef.current;

    try {
      let output: string;

      // Check if connected to Livy
      if (isLivyExecution) {
        // Execute against Livy
        console.log('[Livy] Submitting statement:', cell.code.substring(0, 100));
        setSessionState('busy');

        const statementResponse = await livyClientRef.current!.submitStatement(
          workspaceId!,
          lakehouseId!,
          sessionId!,
          { code: cell.code, kind: 'pyspark' }
        );

        // Wait for statement to complete
        output = await waitForStatementResult(
          workspaceId!,
          lakehouseId!,
          sessionId!,
          statementResponse.id!.toString()
        );

        setSessionState('idle');
      } else {
        // Simulate execution if not connected
        console.log('[Simulated] Executing cell:', cell.code.substring(0, 100));
        await new Promise(resolve => setTimeout(resolve, 1500));
        
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
        c.id === cellId ? { ...c, isExecuting: false, output, hasError: false } : c
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
          hasError: true 
        } : c
      ));
    } finally {
      setIsExecutingCell(false);
    }
  };

  const handleCellDelete = (cellId: string) => {
    setCells(cells.filter(c => c.id !== cellId));
  };

  const waitForStatementResult = async (
    wsId: string,
    lhId: string,
    sessId: string,
    stmtId: string
  ): Promise<string> => {
    const maxAttempts = 120; // 10 minutes max
    let attempts = 0;

    while (attempts < maxAttempts) {
      const statement = await livyClientRef.current!.getStatement(wsId, lhId, sessId, stmtId);
      console.log(`[Livy] Statement status (attempt ${attempts + 1}):`, JSON.stringify(statement, null, 2));
      
      const state = statement.state?.toLowerCase();

      if (state === 'available') {
        // Extract output from statement
        const output = statement.output;
        console.log(`[Livy] Statement output:`, JSON.stringify(output, null, 2));
        
        if (output?.status === 'ok') {
          const data = output.data;
          if (data && data['text/plain']) {
            return data['text/plain'];
          }
          return JSON.stringify(data, null, 2);
        } else if (output?.status === 'error') {
          // Check for error details in data
          const errorData = output.data;
          const errorMsg = errorData?.['text/plain'] || errorData?.['ename'] || errorData?.evalue || 'Execution error';
          const traceback = errorData?.traceback;
          console.error(`[Livy] Statement error:`, errorMsg, traceback);
          throw new Error(errorMsg);
        }
        return 'Execution completed';
      } else if (state === 'error' || state === 'cancelled') {
        console.error(`[Livy] Statement in ${state} state`);
        throw new Error(`Statement ${state}`);
      }

      // Still running
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    }

    throw new Error('Statement execution timed out');
  };

  // ============ AI ASSISTANT HANDLERS ============

  const handleGeneratePlan = async (task: string) => {
    setIsGeneratingPlan(true);
    try {
      const newPlan = await aiClient.generatePlan(task);
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
    if (!plan || plan.currentStepIndex >= plan.steps.length) return;

    const currentStep = plan.steps[plan.currentStepIndex];
    
    // Generate code for the current step
    try {
      const generatedCode = await aiClient.generateCode(currentStep);
      
      // Add a new cell with the generated code
      const newCell: NotebookCell = {
        id: `cell-${Date.now()}`,
        code: generatedCode,
        output: undefined,
        isExecuting: false,
        hasError: false,
      };
      setCells([...cells, newCell]);

      // Update step status
      const updatedSteps = [...plan.steps];
      updatedSteps[plan.currentStepIndex] = {
        ...currentStep,
        status: 'completed',
      };
      
      // Move to next step
      setPlan({
        ...plan,
        steps: updatedSteps,
        currentStepIndex: plan.currentStepIndex + 1,
      });

      await workloadClient.notification.open({
        notificationType: 'success' as any,
        title: 'Code Generated',
        message: `Generated code for step ${plan.currentStepIndex + 1}`,
        duration: 'short' as any,
      });

    } catch (error: any) {
      console.error('Error generating code:', error);
      await workloadClient.notification.open({
        notificationType: 'error' as any,
        title: 'Failed to Generate Code',
        message: error.message || 'Unknown error',
        duration: 'long' as any,
      });

      const updatedSteps = [...plan.steps];
      updatedSteps[plan.currentStepIndex] = {
        ...currentStep,
        status: 'failed',
        error: error.message,
      };
      setPlan({ ...plan, steps: updatedSteps });
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
          isExecuting={isExecutingCell}
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
          onGeneratePlan={handleGeneratePlan}
          onProceedToNextStep={handleProceedToNextStep}
          onRegeneratePlan={handleRegeneratePlan}
        />
      </div>
    </div>
  );
};
