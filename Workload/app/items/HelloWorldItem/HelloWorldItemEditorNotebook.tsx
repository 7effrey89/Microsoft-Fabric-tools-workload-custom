import React, { useState, useEffect } from 'react';
import {
  Button,
  Text,
  makeStyles,
  tokens,
  shorthands,
  Tooltip,
} from '@fluentui/react-components';
import {
  Database24Regular,
  ChevronLeft24Regular,
  ChevronRight24Regular,
} from '@fluentui/react-icons';
import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { ItemWithDefinition } from "../../controller/ItemCRUDController";
import { HelloWorldItemDefinition } from "./HelloWorldItemModel";
import { NotebookEditor, NotebookCell } from '../../components/NotebookEditor';
import { AssistantPanel } from '../../components/AssistantPanel';
import { AzureOpenAIClient, AssistantPlan } from '../../clients/AzureOpenAIClient';
import { SparkLivyClient } from '../../clients/SparkLivyClient';
import { SessionRequest, SessionResponse, StatementRequest, SessionState } from '../../clients/FabricPlatformTypes';
import { callDatahubOpen } from '../../controller/DataHubController';
import { Item } from '../../clients/FabricPlatformTypes';
import { v4 as uuidv4 } from 'uuid';

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
  lakehousePanel: {
    ...shorthands.padding('16px'),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('12px'),
  },
  lakehouseHeader: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
  },
  lakehouseInfo: {
    ...shorthands.padding('12px'),
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.borderRadius('6px'),
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
  onSave?: (cells: NotebookCell[], plan?: AssistantPlan, lakehouseId?: string) => Promise<void>;
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

  // Notebook state
  const [cells, setCells] = useState<NotebookCell[]>(
    item?.definition?.notebookCells || []
  );

  // Assistant state
  const [plan, setPlan] = useState<AssistantPlan | undefined>(
    item?.definition?.assistantPlan
  );
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  // Lakehouse state
  const [selectedLakehouse, setSelectedLakehouse] = useState<Item | null>(null);
  const [lakehouseId, setLakehouseId] = useState<string | undefined>(
    item?.definition?.lakehouseId
  );

  // Spark session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionState, setSessionState] = useState<SessionState | null>(null);

  // Clients
  const aiClient = new AzureOpenAIClient();
  const sparkClient = new SparkLivyClient(workloadClient);

  // Initialize Spark session when lakehouse is selected
  useEffect(() => {
    if (lakehouseId && item.workspaceId && !sessionId) {
      initializeSparkSession();
    }
  }, [lakehouseId, item.workspaceId]);

  // Auto-save when cells or plan changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onSave && (cells.length > 0 || plan)) {
        onSave(cells, plan, lakehouseId);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [cells, plan, lakehouseId, onSave]);

  const initializeSparkSession = async () => {
    if (!item.workspaceId || !lakehouseId) return;

    try {
      console.log('Initializing Spark session...');
      const sessionRequest: SessionRequest = {
        name: `Notebook Session ${new Date().toISOString()}`,
        kind: 'pyspark',
        conf: {
          "spark.submit.deployMode": "cluster"
        }
      };

      const response: SessionResponse = await sparkClient.createSession(
        item.workspaceId,
        lakehouseId,
        sessionRequest
      );

      setSessionId(response.id);
      setSessionState(response.state as SessionState);
      console.log('Spark session created:', response.id);

      // Wait for session to be ready
      await waitForSessionReady(response.id);
    } catch (error) {
      console.error('Error initializing Spark session:', error);
    }
  };

  const waitForSessionReady = async (sid: string): Promise<boolean> => {
    let attempts = 0;
    const maxAttempts = 60;

    while (attempts < maxAttempts) {
      try {
        if (!item.workspaceId || !lakehouseId) return false;

        const sessionInfo = await sparkClient.getSession(item.workspaceId, lakehouseId, sid);
        setSessionState(sessionInfo.state as SessionState);

        if (sessionInfo.state === SessionState.IDLE) {
          console.log('Spark session is ready');
          return true;
        } else if (
          sessionInfo.state === SessionState.ERROR ||
          sessionInfo.state === SessionState.DEAD ||
          sessionInfo.state === SessionState.KILLED
        ) {
          console.error('Session failed to initialize:', sessionInfo.state);
          return false;
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
      } catch (error) {
        console.error('Error checking session status:', error);
        return false;
      }
    }

    return false;
  };

  const handleSelectLakehouse = async () => {
    const result = await callDatahubOpen(
      workloadClient,
      ["Lakehouse"],
      "Select a lakehouse for your notebook",
      false
    );

    if (result) {
      setSelectedLakehouse(result);
      setLakehouseId(result.id);
      // Reset session when lakehouse changes
      setSessionId(null);
      setSessionState(null);
    }
  };

  const handleAddCell = () => {
    const newCell: NotebookCell = {
      id: uuidv4(),
      code: '',
    };
    setCells([...cells, newCell]);
  };

  const handleCellCodeChange = (cellId: string, code: string) => {
    setCells(cells.map(cell =>
      cell.id === cellId ? { ...cell, code } : cell
    ));
  };

  const handleCellExecute = async (cellId: string) => {
    if (!sessionId || !item.workspaceId || !lakehouseId) {
      console.error('No active Spark session');
      return;
    }

    const cell = cells.find(c => c.id === cellId);
    if (!cell || !cell.code.trim()) return;

    // Mark cell as executing
    setCells(cells.map(c =>
      c.id === cellId ? { ...c, isExecuting: true, output: undefined, hasError: false } : c
    ));

    try {
      const statementRequest: StatementRequest = {
        code: cell.code,
        kind: 'pyspark',
      };

      const response = await sparkClient.submitStatement(
        item.workspaceId,
        lakehouseId,
        sessionId,
        statementRequest
      );

      // Wait for statement to complete
      const result = await waitForStatementResult(response.id);

      setCells(cells.map(c =>
        c.id === cellId
          ? { ...c, isExecuting: false, output: result.output, hasError: result.hasError }
          : c
      ));
    } catch (error: any) {
      setCells(cells.map(c =>
        c.id === cellId
          ? { ...c, isExecuting: false, output: error.message, hasError: true }
          : c
      ));
    }
  };

  const waitForStatementResult = async (statementId: number): Promise<{
    output: string;
    hasError: boolean;
  }> => {
    let attempts = 0;
    const maxAttempts = 60;

    while (attempts < maxAttempts) {
      try {
        if (!item.workspaceId || !lakehouseId || !sessionId) {
          throw new Error('Session not available');
        }

        const statementInfo = await sparkClient.getStatement(
          item.workspaceId,
          lakehouseId,
          sessionId,
          statementId.toString()
        );

        if (statementInfo.state === 'available') {
          let output = '';
          if (statementInfo.output && statementInfo.output.data) {
            if (statementInfo.output.data['text/plain']) {
              output = statementInfo.output.data['text/plain'];
            } else {
              output = JSON.stringify(statementInfo.output.data, null, 2);
            }
          }
          return { output: output || 'Command executed successfully', hasError: false };
        } else if (statementInfo.state === 'error') {
          let errorMessage = 'Statement execution failed';
          if (statementInfo.output && statementInfo.output.data && statementInfo.output.data['text/plain']) {
            errorMessage = statementInfo.output.data['text/plain'];
          }
          return { output: errorMessage, hasError: true };
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      } catch (error: any) {
        return { output: `Error: ${error.message}`, hasError: true };
      }
    }

    return { output: 'Execution timed out', hasError: true };
  };

  const handleCellDelete = (cellId: string) => {
    setCells(cells.filter(cell => cell.id !== cellId));
  };

  const handleGeneratePlan = async (task: string) => {
    setIsGeneratingPlan(true);
    try {
      const context = selectedLakehouse
        ? `Using lakehouse: ${selectedLakehouse.displayName}`
        : undefined;
      const newPlan = await aiClient.generatePlan(task, context);
      setPlan(newPlan);
    } catch (error) {
      console.error('Error generating plan:', error);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleProceedToNextStep = async () => {
    if (!plan) return;

    const currentStep = plan.steps[plan.currentStepIndex];

    if (currentStep.status === 'completed') {
      // Move to next step
      if (plan.currentStepIndex < plan.steps.length - 1) {
        setPlan({
          ...plan,
          currentStepIndex: plan.currentStepIndex + 1,
        });
      }
    } else {
      // Execute current step
      try {
        // Mark step as running
        const updatedSteps = [...plan.steps];
        updatedSteps[plan.currentStepIndex] = { ...currentStep, status: 'running' };
        setPlan({ ...plan, steps: updatedSteps });

        // Generate code for the step
        const code = await aiClient.generateCode(currentStep);

        // Create a new cell with the generated code
        const newCell: NotebookCell = {
          id: uuidv4(),
          code,
        };
        
        // Add the cell and execute it after state update
        setCells(prevCells => {
          const updatedCells = [...prevCells, newCell];
          // Execute the cell after a brief delay to ensure state is updated
          setTimeout(() => handleCellExecute(newCell.id), 100);
          return updatedCells;
        });

        // Mark step as completed
        updatedSteps[plan.currentStepIndex] = {
          ...currentStep,
          status: 'completed',
          code,
        };
        setPlan({ ...plan, steps: updatedSteps });
      } catch (error: unknown) {
        console.error('Error executing step:', error);
        const updatedSteps = [...plan.steps];
        updatedSteps[plan.currentStepIndex] = {
          ...currentStep,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
        setPlan({ ...plan, steps: updatedSteps });
      }
    }
  };

  const handleRegeneratePlan = () => {
    setPlan(undefined);
  };

  return (
    <div className={styles.container}>
      {/* Left Panel - Lakehouse */}
      <div className={`${styles.leftPanel} ${!isLeftPanelVisible ? styles.leftPanelCollapsed : ''}`}>
        <div className={styles.lakehousePanel}>
          <div className={styles.lakehouseHeader}>
            <Database24Regular />
            <Text weight="semibold">Lakehouse</Text>
          </div>
          {selectedLakehouse ? (
            <div className={styles.lakehouseInfo}>
              <Text size={200} weight="semibold">Connected:</Text>
              <Text size={300}>{selectedLakehouse.displayName}</Text>
              <Button
                appearance="subtle"
                onClick={handleSelectLakehouse}
                style={{ marginTop: '8px' }}
              >
                Change Lakehouse
              </Button>
            </div>
          ) : (
            <>
              <Text size={200}>Select a lakehouse to start working with data</Text>
              <Button appearance="primary" icon={<Database24Regular />} onClick={handleSelectLakehouse}>
                Select Lakehouse
              </Button>
            </>
          )}
          {sessionState && (
            <Text size={200} style={{ marginTop: '8px' }}>
              Session: {sessionState}
            </Text>
          )}
        </div>
      </div>

      {/* Toggle Button for Left Panel */}
      {!isLeftPanelVisible && (
        <Tooltip content="Show lakehouse panel" relationship="label">
          <Button
            appearance="subtle"
            icon={<ChevronRight24Regular />}
            onClick={() => setIsLeftPanelVisible(true)}
            className={`${styles.toggleButton} ${styles.toggleButtonLeft}`}
          />
        </Tooltip>
      )}
      {isLeftPanelVisible && (
        <Tooltip content="Hide lakehouse panel" relationship="label">
          <Button
            appearance="subtle"
            icon={<ChevronLeft24Regular />}
            onClick={() => setIsLeftPanelVisible(false)}
            style={{ position: 'absolute', left: '250px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}
          />
        </Tooltip>
      )}

      {/* Center Panel - Notebook */}
      <div className={styles.centerPanel}>
        <NotebookEditor
          cells={cells}
          onCellCodeChange={handleCellCodeChange}
          onCellExecute={handleCellExecute}
          onCellDelete={handleCellDelete}
          onAddCell={handleAddCell}
          isExecuting={sessionState !== SessionState.IDLE}
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
