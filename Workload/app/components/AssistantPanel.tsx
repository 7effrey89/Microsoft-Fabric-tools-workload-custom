import React, { useState, useRef, useEffect } from 'react';
import {
  Button,
  Text,
  Textarea,
  Badge,
  makeStyles,
  tokens,
  shorthands,
  Tooltip,
  Spinner,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Field,
  Dropdown,
  Option,
} from '@fluentui/react-components';
import {
  Sparkle20Regular,
  Sparkle20Filled,
  Send20Regular,
  Stop20Regular,
  Play16Regular,
  Checkmark16Regular,
  Dismiss16Regular,
  Person20Regular,
  Code20Regular,
  ArrowClockwise16Regular,
  Settings20Regular,
  DocumentBulletList20Regular,
} from '@fluentui/react-icons';
import { AssistantPlan, AssistantStep, AVAILABLE_MODELS, ModelId } from '../clients/AzureOpenAIClient';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderLeft('1px', 'solid', tokens.colorNeutralStroke1),
  },
  header: {
    ...shorthands.padding('12px', '16px'),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
  },
  copilotIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    ...shorthands.borderRadius('6px'),
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
  },
  messagesContainer: {
    flexGrow: 1,
    ...shorthands.overflow('auto'),
    ...shorthands.padding('16px'),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('16px'),
  },
  welcomeContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    ...shorthands.padding('24px'),
    textAlign: 'center',
  },
  welcomeIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48px',
    height: '48px',
    ...shorthands.borderRadius('12px'),
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    marginBottom: '16px',
  },
  welcomeTitle: {
    marginBottom: '8px',
  },
  welcomeSubtitle: {
    color: tokens.colorNeutralForeground3,
    marginBottom: '24px',
  },
  suggestionChips: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px'),
    width: '100%',
  },
  suggestionChip: {
    textAlign: 'left',
    justifyContent: 'flex-start',
  },
  messageRow: {
    display: 'flex',
    ...shorthands.gap('12px'),
  },
  messageRowUser: {
    flexDirection: 'row-reverse',
  },
  avatar: {
    width: '28px',
    height: '28px',
    ...shorthands.borderRadius('50%'),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarAssistant: {
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
  },
  avatarUser: {
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground1,
  },
  messageBubble: {
    maxWidth: '85%',
    ...shorthands.padding('10px', '14px'),
    ...shorthands.borderRadius('12px'),
  },
  messageBubbleAssistant: {
    backgroundColor: tokens.colorNeutralBackground3,
    borderTopLeftRadius: '4px',
  },
  messageBubbleUser: {
    backgroundColor: tokens.colorBrandBackground2,
    borderTopRightRadius: '4px',
  },
  messageContent: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px'),
  },
  stepCard: {
    ...shorthands.padding('12px'),
    ...shorthands.borderRadius('8px'),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    marginTop: '8px',
  },
  stepCardActive: {
    ...shorthands.border('1px', 'solid', tokens.colorBrandStroke1),
    backgroundColor: tokens.colorBrandBackground2,
  },
  stepCardCompleted: {
    ...shorthands.border('1px', 'solid', tokens.colorPaletteGreenBorder1),
    backgroundColor: tokens.colorPaletteGreenBackground1,
  },
  stepCardFailed: {
    ...shorthands.border('1px', 'solid', tokens.colorPaletteRedBorder1),
    backgroundColor: tokens.colorPaletteRedBackground1,
  },
  stepHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '6px',
  },
  stepTitle: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('6px'),
  },
  stepNumber: {
    width: '20px',
    height: '20px',
    ...shorthands.borderRadius('50%'),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 600,
  },
  stepNumberPending: {
    backgroundColor: tokens.colorNeutralBackground5,
    color: tokens.colorNeutralForeground2,
  },
  stepNumberActive: {
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
  },
  stepNumberCompleted: {
    backgroundColor: tokens.colorPaletteGreenBackground3,
    color: tokens.colorPaletteGreenForeground1,
  },
  stepNumberFailed: {
    backgroundColor: tokens.colorPaletteRedBackground3,
    color: tokens.colorPaletteRedForeground1,
  },
  codeBlock: {
    backgroundColor: tokens.colorNeutralBackground4,
    ...shorthands.borderRadius('6px'),
    ...shorthands.padding('10px', '12px'),
    marginTop: '8px',
    position: 'relative',
    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
    fontSize: '12px',
    ...shorthands.overflow('auto'),
    maxHeight: '150px',
  },
  codeHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  codeLabel: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('4px'),
    color: tokens.colorNeutralForeground3,
  },
  resultBlock: {
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRadius('6px'),
    ...shorthands.padding('8px', '12px'),
    marginTop: '8px',
    fontSize: '12px',
  },
  executingIndicator: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
    color: tokens.colorBrandForeground1,
    marginTop: '8px',
  },
  actionButtons: {
    display: 'flex',
    ...shorthands.gap('8px'),
    marginTop: '8px',
  },
  progressRow: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
    ...shorthands.padding('8px', '12px'),
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRadius('8px'),
  },
  inputContainer: {
    ...shorthands.padding('12px', '16px'),
    ...shorthands.borderTop('1px', 'solid', tokens.colorNeutralStroke2),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px'),
  },
  inputRow: {
    display: 'flex',
    ...shorthands.gap('8px'),
    alignItems: 'flex-end',
  },
  textareaWrapper: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  textarea: {
    minHeight: '40px',
    maxHeight: '120px',
    resize: 'none',
  },
  footerControls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  agentModeToggle: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
  },
  headerButtons: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('4px'),
  },
  instructionsTextarea: {
    minHeight: '150px',
  },
  modelDropdown: {
    minWidth: '140px',
  },
  modelSection: {
    marginTop: '16px',
  },
  modelBadge: {
    fontSize: '11px',
    marginLeft: '4px',
  },
  footerLeft: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('12px'),
  },
  footerDropdown: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('4px'),
    cursor: 'pointer',
    ...shorthands.padding('2px', '6px'),
    ...shorthands.borderRadius('4px'),
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground3,
    },
  },
  footerDropdownText: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground2,
  },
});

export interface AssistantPanelProps {
  plan?: AssistantPlan;
  isGeneratingPlan?: boolean;
  isExecuting?: boolean;
  onGeneratePlan?: (task: string) => void;
  onProceedToNextStep?: () => void;
  onRegeneratePlan?: () => void;
  onStop?: () => void;
  agentMode?: boolean;
  onAgentModeChange?: (enabled: boolean) => void;
  agentInstructions?: string;
  onAgentInstructionsChange?: (instructions: string) => void;
  selectedModel?: ModelId;
  onModelChange?: (model: ModelId) => void;
}

export const AssistantPanel: React.FC<AssistantPanelProps> = ({
  plan,
  isGeneratingPlan,
  isExecuting,
  onGeneratePlan,
  onProceedToNextStep,
  onRegeneratePlan,
  onStop,
  agentMode,
  onAgentModeChange,
  agentInstructions,
  onAgentInstructionsChange,
  selectedModel,
  onModelChange,
}) => {
  const styles = useStyles();
  const [taskInput, setTaskInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isInstructionsDialogOpen, setIsInstructionsDialogOpen] = useState(false);
  const [instructionsInput, setInstructionsInput] = useState(agentInstructions || '');

  // Sync instructions input when prop changes
  useEffect(() => {
    setInstructionsInput(agentInstructions || '');
  }, [agentInstructions]);

  // Auto-scroll to bottom when plan updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [plan]);

  const handleSubmit = () => {
    if (taskInput.trim() && onGeneratePlan) {
      onGeneratePlan(taskInput.trim());
      setTaskInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSaveInstructions = () => {
    onAgentInstructionsChange?.(instructionsInput);
    setIsInstructionsDialogOpen(false);
  };

  const suggestions = [
    "Analyze sales data and find trends",
    "Create a summary of the dataset",
    "Find top 10 records by value",
  ];

  const currentStep = plan?.steps[plan.currentStepIndex];
  const completedSteps = plan?.steps.filter(s => s.status === 'completed').length || 0;
  const totalSteps = plan?.steps.length || 0;
  const allCompleted = completedSteps === totalSteps && totalSteps > 0;

  const getStepCardClass = (step: AssistantStep, isCurrent: boolean) => {
    if (step.status === 'failed') return `${styles.stepCard} ${styles.stepCardFailed}`;
    if (step.status === 'completed') return `${styles.stepCard} ${styles.stepCardCompleted}`;
    if (isCurrent || step.status === 'running') return `${styles.stepCard} ${styles.stepCardActive}`;
    return styles.stepCard;
  };

  const getStepNumberClass = (step: AssistantStep, isCurrent: boolean) => {
    if (step.status === 'failed') return `${styles.stepNumber} ${styles.stepNumberFailed}`;
    if (step.status === 'completed') return `${styles.stepNumber} ${styles.stepNumberCompleted}`;
    if (isCurrent || step.status === 'running') return `${styles.stepNumber} ${styles.stepNumberActive}`;
    return `${styles.stepNumber} ${styles.stepNumberPending}`;
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.copilotIcon}>
            <Sparkle20Filled />
          </div>
          <Text weight="semibold" size={400}>Copilot</Text>
        </div>
        <div className={styles.headerButtons}>
          {plan && (
            <Tooltip content="Start new conversation" relationship="label">
              <Button
                appearance="subtle"
                size="small"
                icon={<ArrowClockwise16Regular />}
                onClick={onRegeneratePlan}
              />
            </Tooltip>
          )}
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <Tooltip content="Settings" relationship="label">
                <Button
                  appearance="subtle"
                  size="small"
                  icon={<Settings20Regular />}
                />
              </Tooltip>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem
                  icon={<DocumentBulletList20Regular />}
                  onClick={() => setIsInstructionsDialogOpen(true)}
                >
                  Agent Instructions
                </MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
        </div>
      </div>

      {/* Agent Instructions Dialog */}
      <Dialog
        open={isInstructionsDialogOpen}
        onOpenChange={(_, data) => setIsInstructionsDialogOpen(data.open)}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Agent Settings</DialogTitle>
            <DialogContent>
              <Field
                label="Model"
                hint="Select the AI model to use for generating plans and code."
              >
                <Dropdown
                  className={styles.modelDropdown}
                  value={AVAILABLE_MODELS.find(m => m.id === selectedModel)?.name || 'GPT-4o'}
                  selectedOptions={selectedModel ? [selectedModel] : ['gpt-4o']}
                  onOptionSelect={(_, data) => {
                    if (data.optionValue && onModelChange) {
                      onModelChange(data.optionValue as ModelId);
                    }
                  }}
                >
                  {AVAILABLE_MODELS.map((model) => (
                    <Option key={model.id} value={model.id}>
                      {model.name}
                    </Option>
                  ))}
                </Dropdown>
              </Field>
              <div className={styles.modelSection}>
                <Field
                  label="Custom system message"
                  hint="These instructions will guide the AI assistant's behavior when generating plans and code."
                >
                  <Textarea
                    className={styles.instructionsTextarea}
                    placeholder="e.g., Always use descriptive variable names. Prefer using PySpark DataFrame API over SQL. Include error handling in all code blocks..."
                    value={instructionsInput}
                    onChange={(_, data) => setInstructionsInput(data.value)}
                    resize="vertical"
                  />
                </Field>
              </div>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setIsInstructionsDialogOpen(false)}>
                Cancel
              </Button>
              <Button appearance="primary" onClick={handleSaveInstructions}>
                Save
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* Messages Area */}
      <div className={styles.messagesContainer}>
        {!plan && !isGeneratingPlan ? (
          <div className={styles.welcomeContainer}>
            <div className={styles.welcomeIcon}>
              <Sparkle20Filled />
            </div>
            <Text size={500} weight="semibold" className={styles.welcomeTitle}>
              How can I help you today?
            </Text>
            <Text size={300} className={styles.welcomeSubtitle}>
              I can help you analyze data with PySpark. Describe what you'd like to do.
            </Text>
            <div className={styles.suggestionChips}>
              {suggestions.map((suggestion, idx) => (
                <Button
                  key={idx}
                  appearance="outline"
                  size="small"
                  className={styles.suggestionChip}
                  onClick={() => setTaskInput(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* User's task message */}
            {plan && (
              <div className={`${styles.messageRow} ${styles.messageRowUser}`}>
                <div className={`${styles.avatar} ${styles.avatarUser}`}>
                  <Person20Regular />
                </div>
                <div className={`${styles.messageBubble} ${styles.messageBubbleUser}`}>
                  <Text>{plan.goal}</Text>
                </div>
              </div>
            )}

            {/* Generating indicator */}
            {isGeneratingPlan && (
              <div className={styles.messageRow}>
                <div className={`${styles.avatar} ${styles.avatarAssistant}`}>
                  <Sparkle20Regular />
                </div>
                <div className={`${styles.messageBubble} ${styles.messageBubbleAssistant}`}>
                  <div className={styles.executingIndicator}>
                    <Spinner size="tiny" />
                    <Text size={300}>Creating your plan...</Text>
                  </div>
                </div>
              </div>
            )}

            {/* Assistant's plan response */}
            {plan && (
              <div className={styles.messageRow}>
                <div className={`${styles.avatar} ${styles.avatarAssistant}`}>
                  <Sparkle20Regular />
                </div>
                <div className={`${styles.messageBubble} ${styles.messageBubbleAssistant}`}>
                  <div className={styles.messageContent}>
                    <Text>
                      I've created a plan with {totalSteps} steps to help you. 
                      {allCompleted 
                        ? " All steps are complete! ✨" 
                        : " Let me know when you're ready to proceed."}
                    </Text>

                    {/* Progress indicator */}
                    {totalSteps > 0 && (
                      <div className={styles.progressRow}>
                        <Text size={200} weight="medium">
                          Progress: {completedSteps}/{totalSteps}
                        </Text>
                        <div style={{ 
                          flexGrow: 1, 
                          height: '4px', 
                          backgroundColor: tokens.colorNeutralBackground5,
                          borderRadius: '2px',
                          overflow: 'hidden'
                        }}>
                          <div style={{ 
                            width: `${(completedSteps / totalSteps) * 100}%`, 
                            height: '100%', 
                            backgroundColor: tokens.colorBrandBackground,
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                      </div>
                    )}

                    {/* Step cards */}
                    {plan.steps.map((step, index) => {
                      const isCurrent = index === plan.currentStepIndex;
                      return (
                        <div
                          key={step.id}
                          className={getStepCardClass(step, isCurrent)}
                        >
                          <div className={styles.stepHeader}>
                            <div className={styles.stepTitle}>
                              <div className={getStepNumberClass(step, isCurrent)}>
                                {step.status === 'completed' ? (
                                  <Checkmark16Regular />
                                ) : step.status === 'failed' ? (
                                  <Dismiss16Regular />
                                ) : (
                                  index + 1
                                )}
                              </div>
                              <Text size={200} weight="semibold">
                                Step {index + 1}
                              </Text>
                            </div>
                            <Badge
                              appearance="tint"
                              size="small"
                              color={
                                step.status === 'completed' ? 'success' :
                                step.status === 'failed' ? 'danger' :
                                step.status === 'running' ? 'important' : 'subtle'
                              }
                            >
                              {step.status}
                            </Badge>
                          </div>
                          <Text size={200}>{step.description}</Text>

                          {/* Code preview */}
                          {step.code && (
                            <div className={styles.codeBlock}>
                              <div className={styles.codeHeader}>
                                <div className={styles.codeLabel}>
                                  <Code20Regular />
                                  <Text size={100}>PySpark</Text>
                                </div>
                              </div>
                              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {step.code.length > 200 
                                  ? step.code.substring(0, 200) + '...' 
                                  : step.code}
                              </pre>
                            </div>
                          )}

                          {/* Result */}
                          {step.result && (
                            <div className={styles.resultBlock}>
                              <Text size={200} weight="medium" style={{ color: tokens.colorPaletteGreenForeground1 }}>
                                ✓ {step.result.substring(0, 150)}{step.result.length > 150 ? '...' : ''}
                              </Text>
                            </div>
                          )}

                          {/* Error */}
                          {step.error && (
                            <div className={styles.resultBlock} style={{ backgroundColor: tokens.colorPaletteRedBackground1 }}>
                              <Text size={200} style={{ color: tokens.colorPaletteRedForeground1 }}>
                                ✕ {step.error.substring(0, 150)}{step.error.length > 150 ? '...' : ''}
                              </Text>
                            </div>
                          )}

                          {/* Executing indicator */}
                          {step.status === 'running' && (
                            <div className={styles.executingIndicator}>
                              <Spinner size="tiny" />
                              <Text size={200}>Executing...</Text>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Action buttons */}
                    {!allCompleted && currentStep && currentStep.status !== 'running' && (
                      <div className={styles.actionButtons}>
                        <Button
                          appearance="primary"
                          size="small"
                          icon={<Play16Regular />}
                          onClick={onProceedToNextStep}
                        >
                          {currentStep.status === 'pending' ? 'Run Step' : 'Next Step'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className={styles.inputContainer}>
        <div className={styles.inputRow}>
          <div className={styles.textareaWrapper}>
            <Textarea
              className={styles.textarea}
              placeholder="Ask Copilot to analyze your data..."
              value={taskInput}
              onChange={(e, data) => setTaskInput(data.value)}
              onKeyDown={handleKeyDown}
              disabled={isGeneratingPlan}
              resize="vertical"
            />
          </div>
          {isGeneratingPlan || isExecuting ? (
            <Tooltip content="Stop" relationship="label">
              <Button
                appearance="primary"
                icon={<Stop20Regular />}
                onClick={onStop}
                style={{ backgroundColor: tokens.colorPaletteRedBackground3 }}
              />
            </Tooltip>
          ) : (
            <Tooltip content="Send message" relationship="label">
              <Button
                appearance="primary"
                icon={<Send20Regular />}
                onClick={handleSubmit}
                disabled={!taskInput.trim()}
              />
            </Tooltip>
          )}
        </div>
        <div className={styles.footerControls}>
          <div className={styles.footerLeft}>
            {/* Agent Mode dropdown */}
            <Menu>
              <MenuTrigger disableButtonEnhancement>
                <div className={styles.footerDropdown}>
                  <Text className={styles.footerDropdownText}>
                    {agentMode ? 'Agent' : 'Chat'} ▾
                  </Text>
                </div>
              </MenuTrigger>
              <MenuPopover>
                <MenuList>
                  <MenuItem onClick={() => onAgentModeChange?.(false)}>
                    {!agentMode ? '✓ ' : '   '}Chat
                  </MenuItem>
                  <MenuItem onClick={() => onAgentModeChange?.(true)}>
                    {agentMode ? '✓ ' : '   '}Agent
                  </MenuItem>
                </MenuList>
              </MenuPopover>
            </Menu>

            {/* Model dropdown */}
            <Menu>
              <MenuTrigger disableButtonEnhancement>
                <div className={styles.footerDropdown}>
                  <Text className={styles.footerDropdownText}>
                    {AVAILABLE_MODELS.find(m => m.id === selectedModel)?.name || 'GPT-4o'} ▾
                  </Text>
                </div>
              </MenuTrigger>
              <MenuPopover>
                <MenuList>
                  {AVAILABLE_MODELS.map((model) => (
                    <MenuItem
                      key={model.id}
                      onClick={() => onModelChange?.(model.id)}
                    >
                      {selectedModel === model.id ? '✓ ' : '   '}{model.name}
                    </MenuItem>
                  ))}
                </MenuList>
              </MenuPopover>
            </Menu>
          </div>
          <Text size={100} style={{ color: tokens.colorNeutralForeground4 }}>
            Shift + Enter for new line
          </Text>
        </div>
      </div>
    </div>
  );
};
