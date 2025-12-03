import React, { useState } from 'react';
import {
  Button,
  Text,
  Input,
  Divider,
  Badge,
  ProgressBar,
  makeStyles,
  tokens,
  shorthands,
  Tooltip,
  Spinner,
  Switch,
} from '@fluentui/react-components';
import {
  Sparkle24Regular,
  Play24Regular,
  CheckmarkCircle24Filled,
  ErrorCircle24Filled,
  Clock24Regular,
} from '@fluentui/react-icons';
import { AssistantPlan, AssistantStep } from '../clients/AzureOpenAIClient';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderLeft('1px', 'solid', tokens.colorNeutralStroke1),
  },
  header: {
    ...shorthands.padding('16px'),
    backgroundColor: tokens.colorNeutralBackground3,
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
  },
  content: {
    flexGrow: 1,
    ...shorthands.padding('16px'),
    ...shorthands.overflow('auto'),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('16px'),
  },
  goalSection: {
    ...shorthands.padding('12px'),
    backgroundColor: tokens.colorBrandBackground2,
    ...shorthands.borderRadius('8px'),
  },
  inputSection: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px'),
  },
  stepsSection: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('12px'),
  },
  stepCard: {
    ...shorthands.padding('12px'),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    ...shorthands.borderRadius('6px'),
  },
  stepCardCurrent: {
    ...shorthands.border('2px', 'solid', tokens.colorBrandStroke1),
    backgroundColor: tokens.colorBrandBackground2Hover,
  },
  stepCardCompleted: {
    backgroundColor: tokens.colorNeutralBackground2,
  },
  stepHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  stepStatus: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('6px'),
  },
  stepDescription: {
    marginBottom: '8px',
  },
  stepResult: {
    ...shorthands.padding('8px'),
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.borderRadius('4px'),
    fontSize: '12px',
    fontFamily: 'monospace',
    marginTop: '8px',
  },
  stepError: {
    ...shorthands.padding('8px'),
    backgroundColor: tokens.colorPaletteRedBackground1,
    ...shorthands.borderRadius('4px'),
    marginTop: '8px',
  },
  footer: {
    ...shorthands.padding('16px'),
    ...shorthands.borderTop('1px', 'solid', tokens.colorNeutralStroke1),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px'),
  },
  progressSection: {
    marginBottom: '8px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    ...shorthands.padding('32px'),
    textAlign: 'center',
    ...shorthands.gap('12px'),
  },
});

export interface AssistantPanelProps {
  plan?: AssistantPlan;
  isGeneratingPlan?: boolean;
  onGeneratePlan?: (task: string) => void;
  onProceedToNextStep?: () => void;
  onRegeneratePlan?: () => void;
  agentMode?: boolean;
  onAgentModeChange?: (enabled: boolean) => void;
}

export const AssistantPanel: React.FC<AssistantPanelProps> = ({
  plan,
  isGeneratingPlan,
  onGeneratePlan,
  onProceedToNextStep,
  onRegeneratePlan,
  agentMode,
  onAgentModeChange,
}) => {
  const styles = useStyles();
  const [taskInput, setTaskInput] = useState('');

  const getStepIcon = (status: AssistantStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckmarkCircle24Filled style={{ color: tokens.colorPaletteGreenForeground1 }} />;
      case 'failed':
        return <ErrorCircle24Filled style={{ color: tokens.colorPaletteRedForeground1 }} />;
      case 'running':
        return <Spinner size="tiny" />;
      case 'pending':
      default:
        return <Clock24Regular style={{ color: tokens.colorNeutralForeground3 }} />;
    }
  };

  const getStepBadge = (status: AssistantStep['status']) => {
    const colorMap = {
      completed: 'success' as const,
      failed: 'danger' as const,
      running: 'important' as const,
      pending: 'subtle' as const,
    };
    return <Badge appearance="filled" color={colorMap[status]}>{status}</Badge>;
  };

  const handleGeneratePlan = () => {
    if (taskInput.trim() && onGeneratePlan) {
      onGeneratePlan(taskInput.trim());
    }
  };

  const currentStep = plan?.steps[plan.currentStepIndex];
  const completedSteps = plan?.steps.filter(s => s.status === 'completed').length || 0;
  const totalSteps = plan?.steps.length || 0;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <Sparkle24Regular />
        <Text weight="semibold" size={400}>AI Assistant</Text>
      </div>

      <Divider />

      {/* Content */}
      <div className={styles.content}>
        {!plan && !isGeneratingPlan && (
          <div className={styles.emptyState}>
            <Sparkle24Regular style={{ fontSize: '48px', color: tokens.colorBrandForeground1 }} />
            <Text size={500} weight="semibold">
              Welcome to the AI Assistant
            </Text>
            <Text size={300}>
              Describe your data analysis task, and I'll break it down into executable steps with PySpark code.
            </Text>
          </div>
        )}

        {/* Task Input Section */}
        {!plan && (
          <div className={styles.inputSection}>
            <Text weight="semibold">What would you like to analyze?</Text>
            <Input
              placeholder="e.g., Analyze sales data and find top performing products"
              value={taskInput}
              onChange={(e, data) => setTaskInput(data.value)}
              disabled={isGeneratingPlan}
            />
            <Button
              appearance="primary"
              icon={<Sparkle24Regular />}
              onClick={handleGeneratePlan}
              disabled={!taskInput.trim() || isGeneratingPlan}
            >
              {isGeneratingPlan ? 'Generating Plan...' : 'Generate Plan'}
            </Button>
          </div>
        )}

        {/* Plan Display */}
        {plan && (
          <>
            {/* Goal Section */}
            <div className={styles.goalSection}>
              <Text weight="semibold" size={300}>Goal:</Text>
              <Text>{plan.goal}</Text>
            </div>

            {/* Progress Section */}
            <div className={styles.progressSection}>
              <Text size={200}>
                Progress: {completedSteps} of {totalSteps} steps completed
              </Text>
              <ProgressBar value={progress} max={100} />
            </div>

            {/* Steps Section */}
            <div className={styles.stepsSection}>
              <Text weight="semibold">Execution Plan:</Text>
              {plan.steps.map((step, index) => {
                const isCurrent = index === plan.currentStepIndex;
                const cardClass = isCurrent
                  ? `${styles.stepCard} ${styles.stepCardCurrent}`
                  : step.status === 'completed'
                  ? `${styles.stepCard} ${styles.stepCardCompleted}`
                  : styles.stepCard;

                return (
                  <div key={step.id} className={cardClass}>
                    <div className={styles.stepHeader}>
                      <div className={styles.stepStatus}>
                        {getStepIcon(step.status)}
                        <Text weight="semibold" size={300}>
                          Step {index + 1}
                        </Text>
                        {isCurrent && <Badge appearance="filled" color="brand">Current</Badge>}
                      </div>
                      {getStepBadge(step.status)}
                    </div>
                    <div className={styles.stepDescription}>
                      <Text>{step.description}</Text>
                    </div>
                    {step.code && (
                      <div className={styles.stepResult}>
                        <Text size={200} weight="semibold">Generated Code:</Text>
                        <pre style={{ margin: '4px 0 0 0', whiteSpace: 'pre-wrap' }}>
                          {step.code.substring(0, 100)}
                          {step.code.length > 100 && '...'}
                        </pre>
                      </div>
                    )}
                    {step.result && (
                      <div className={styles.stepResult}>
                        <Text size={200} weight="semibold">Result:</Text>
                        <Text size={200}>{step.result}</Text>
                      </div>
                    )}
                    {step.error && (
                      <div className={styles.stepError}>
                        <Text size={200} weight="semibold">Error:</Text>
                        <Text size={200}>{step.error}</Text>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      {plan && (
        <div className={styles.footer}>
          {currentStep && currentStep.status !== 'running' && (
            <Tooltip
              content={
                currentStep.status === 'completed'
                  ? 'Move to the next step'
                  : 'Execute the current step'
              }
              relationship="label"
            >
              <Button
                appearance="primary"
                icon={<Play24Regular />}
                onClick={onProceedToNextStep}
                disabled={!onProceedToNextStep}
              >
                {currentStep.status === 'completed' ? 'Next Step' : 'Execute Step'}
              </Button>
            </Tooltip>
          )}
          {currentStep && currentStep.status === 'running' && (
            <Button appearance="primary" disabled>
              <Spinner size="tiny" style={{ marginRight: '8px' }} />
              Executing...
            </Button>
          )}
          {completedSteps === totalSteps && (
            <Text size={300} style={{ color: tokens.colorPaletteGreenForeground1 }}>
              ✓ All steps completed!
            </Text>
          )}
          <Divider style={{ margin: '8px 0' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Tooltip 
              content="When enabled, automatically executes the next step after each successful execution"
              relationship="description"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Switch 
                  checked={agentMode || false}
                  onChange={(_, data) => onAgentModeChange?.(data.checked)}
                />
                <Text size={200} weight="semibold">Agent Mode</Text>
              </div>
            </Tooltip>
          </div>
          <Button appearance="subtle" onClick={onRegeneratePlan} disabled={isGeneratingPlan}>
            Start New Task
          </Button>
        </div>
      )}
    </div>
  );
};
