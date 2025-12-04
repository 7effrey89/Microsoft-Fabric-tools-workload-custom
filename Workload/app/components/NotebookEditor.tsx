import React, { useRef, useEffect } from 'react';
import {
  Button,
  Text,
  makeStyles,
  tokens,
  shorthands,
  Tooltip,
  Spinner,
  Divider,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
} from '@fluentui/react-components';
import {
  Add24Regular,
  Add16Regular,
  Play16Regular,
  Delete16Regular,
  Code24Regular,
  ArrowUp16Regular,
  ArrowDown16Regular,
  PlayMultiple16Regular,
  ArrowCircleDown20Regular,
  Clock16Regular,
  MoreHorizontal16Regular,
  Copy16Regular,
  Cut16Regular,
} from '@fluentui/react-icons';
import Editor from '@monaco-editor/react';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: tokens.colorNeutralBackground2,
  },
  ribbon: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
    ...shorthands.padding('8px', '16px'),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke1),
    flexWrap: 'wrap',
  },
  ribbonGroup: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('4px'),
  },
  ribbonDivider: {
    height: '24px',
    marginLeft: '8px',
    marginRight: '8px',
  },
  header: {
    ...shorthands.padding('8px', '16px'),
    backgroundColor: tokens.colorNeutralBackground1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
  },
  content: {
    flexGrow: 1,
    ...shorthands.padding('16px'),
    ...shorthands.overflow('auto'),
  },
  cellsContainer: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px'),
  },
  cellWrapper: {
    display: 'flex',
    flexDirection: 'column',
  },
  cellCard: {
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    ...shorthands.borderRadius('8px'),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.overflow('hidden'),
  },
  cellCardSelected: {
    ...shorthands.border('2px', 'solid', tokens.colorBrandStroke1),
  },
  cellHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shorthands.padding('6px', '12px'),
    backgroundColor: tokens.colorNeutralBackground3,
  },
  cellHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
  },
  cellActions: {
    display: 'flex',
    ...shorthands.gap('2px'),
  },
  cellEditor: {
    minHeight: '120px',
    ...shorthands.border('none'),
  },
  cellOutput: {
    ...shorthands.padding('12px'),
    backgroundColor: tokens.colorNeutralBackground2,
    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
    fontSize: '12px',
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    maxHeight: '400px',
    overflowY: 'auto',
    ...shorthands.borderTop('1px', 'solid', tokens.colorNeutralStroke1),
  },
  cellOutputError: {
    color: tokens.colorPaletteRedForeground1,
    backgroundColor: tokens.colorPaletteRedBackground1,
  },
  cellOutputSuccess: {
    color: tokens.colorNeutralForeground1,
  },
  executionTime: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('4px'),
    color: tokens.colorNeutralForeground3,
    marginBottom: '8px',
    paddingBottom: '8px',
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
  },
  addCellButton: {
    display: 'flex',
    justifyContent: 'center',
    ...shorthands.padding('4px', '0'),
    opacity: 0,
    transition: 'opacity 0.2s ease',
    ':hover': {
      opacity: 1,
    },
  },
  addCellButtonVisible: {
    opacity: 0.6,
    ':hover': {
      opacity: 1,
    },
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    ...shorthands.padding('48px'),
    textAlign: 'center',
    ...shorthands.gap('12px'),
  },
  cellNumber: {
    minWidth: '50px',
    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
  },
});

export interface NotebookCell {
  id: string;
  code: string;
  output?: string;
  isExecuting?: boolean;
  hasError?: boolean;
  executionTime?: number; // Execution time in milliseconds
}

export interface NotebookEditorProps {
  cells: NotebookCell[];
  onCellCodeChange?: (cellId: string, code: string) => void;
  onCellExecute?: (cellId: string) => void;
  onCellDelete?: (cellId: string) => void;
  onAddCell?: (afterCellId?: string) => void;
  onMoveCell?: (cellId: string, direction: 'up' | 'down') => void;
  onRunAllCells?: () => void;
  onRunCellsBelow?: (fromCellId: string, includeCurrent: boolean) => void;
  onClearAllOutputs?: () => void;
  isExecuting?: boolean;
  selectedCellId?: string;
  onSelectCell?: (cellId: string) => void;
}

const formatExecutionTime = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${Math.floor(ms / 60000)}m ${((ms % 60000) / 1000).toFixed(0)}s`;
};

export const NotebookEditor: React.FC<NotebookEditorProps> = ({
  cells,
  onCellCodeChange,
  onCellExecute,
  onCellDelete,
  onAddCell,
  onMoveCell,
  onRunAllCells,
  onRunCellsBelow,
  onClearAllOutputs,
  isExecuting,
  selectedCellId,
  onSelectCell,
}) => {
  const styles = useStyles();
  const cellsEndRef = useRef<HTMLDivElement>(null);
  const prevCellsLengthRef = useRef(cells.length);

  // Auto-scroll to bottom when a new cell is added
  useEffect(() => {
    if (cells.length > prevCellsLengthRef.current) {
      cellsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevCellsLengthRef.current = cells.length;
  }, [cells.length]);

  const hasAnyOutput = cells.some(c => c.output);

  return (
    <div className={styles.container}>
      {/* Ribbon Toolbar */}
      <div className={styles.ribbon}>
        {/* Run Group */}
        <div className={styles.ribbonGroup}>
          <Tooltip content="Run all cells" relationship="label">
            <Button
              appearance="subtle"
              size="small"
              icon={<PlayMultiple16Regular />}
              onClick={onRunAllCells}
              disabled={isExecuting || cells.length === 0}
            >
              Run All
            </Button>
          </Tooltip>
        </div>

        <Divider vertical className={styles.ribbonDivider} />

        {/* Cell Operations Group */}
        <div className={styles.ribbonGroup}>
          <Tooltip content="Add code cell" relationship="label">
            <Button
              appearance="subtle"
              size="small"
              icon={<Add24Regular />}
              onClick={() => onAddCell?.()}
              disabled={isExecuting}
            >
              Add Cell
            </Button>
          </Tooltip>
        </div>

        <Divider vertical className={styles.ribbonDivider} />

        {/* Clear Group */}
        <div className={styles.ribbonGroup}>
          <Tooltip content="Clear all outputs" relationship="label">
            <Button
              appearance="subtle"
              size="small"
              icon={<Delete16Regular />}
              onClick={onClearAllOutputs}
              disabled={isExecuting || !hasAnyOutput}
            >
              Clear Outputs
            </Button>
          </Tooltip>
        </div>

        {/* Spacer */}
        <div style={{ flexGrow: 1 }} />

        {/* Info */}
        <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
          {cells.length} {cells.length === 1 ? 'cell' : 'cells'}
        </Text>
      </div>

      {/* Header */}
      <div className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Code24Regular />
          <Text weight="semibold" size={400}>Notebook</Text>
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {cells.length === 0 ? (
          <div className={styles.emptyState}>
            <Code24Regular style={{ fontSize: '48px', color: tokens.colorNeutralForeground3 }} />
            <Text size={500} weight="semibold">
              No cells yet
            </Text>
            <Text size={300}>
              Add a cell to start writing your PySpark code
            </Text>
            <Button
              appearance="primary"
              icon={<Add24Regular />}
              onClick={() => onAddCell?.()}
            >
              Add First Cell
            </Button>
          </div>
        ) : (
          <div className={styles.cellsContainer}>
            {cells.map((cell, index) => (
              <div key={cell.id} className={styles.cellWrapper}>
                {/* Add Cell Button (between cells) */}
                {index === 0 && (
                  <div className={styles.addCellButton}>
                    <Tooltip content="Add cell above" relationship="label">
                      <Button
                        appearance="subtle"
                        size="small"
                        icon={<Add16Regular />}
                        onClick={() => onAddCell?.(undefined)}
                        disabled={isExecuting}
                      >
                        Add Cell
                      </Button>
                    </Tooltip>
                  </div>
                )}

                {/* Cell Card */}
                <div 
                  className={`${styles.cellCard} ${selectedCellId === cell.id ? styles.cellCardSelected : ''}`}
                  onClick={() => onSelectCell?.(cell.id)}
                >
                  {/* Cell Header */}
                  <div className={styles.cellHeader}>
                    <div className={styles.cellHeaderLeft}>
                      <Text className={styles.cellNumber}>
                        [{index + 1}]
                      </Text>
                      <Text size={200} weight="semibold">
                        Code
                      </Text>
                      {cell.isExecuting && (
                        <Spinner size="tiny" />
                      )}
                    </div>
                    <div className={styles.cellActions}>
                      <Tooltip content="Run cell" relationship="label">
                        <Button
                          appearance="subtle"
                          size="small"
                          icon={<Play16Regular />}
                          onClick={(e: React.MouseEvent) => { e.stopPropagation(); onCellExecute?.(cell.id); }}
                          disabled={isExecuting || cell.isExecuting || !cell.code.trim()}
                        />
                      </Tooltip>
                      <Tooltip content="Move up" relationship="label">
                        <Button
                          appearance="subtle"
                          size="small"
                          icon={<ArrowUp16Regular />}
                          onClick={(e: React.MouseEvent) => { e.stopPropagation(); onMoveCell?.(cell.id, 'up'); }}
                          disabled={isExecuting || index === 0}
                        />
                      </Tooltip>
                      <Tooltip content="Move down" relationship="label">
                        <Button
                          appearance="subtle"
                          size="small"
                          icon={<ArrowDown16Regular />}
                          onClick={(e: React.MouseEvent) => { e.stopPropagation(); onMoveCell?.(cell.id, 'down'); }}
                          disabled={isExecuting || index === cells.length - 1}
                        />
                      </Tooltip>
                      <Menu>
                        <MenuTrigger disableButtonEnhancement>
                          <Button
                            appearance="subtle"
                            size="small"
                            icon={<MoreHorizontal16Regular />}
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                          />
                        </MenuTrigger>
                        <MenuPopover>
                          <MenuList>
                            <MenuItem
                              icon={<ArrowCircleDown20Regular />}
                              onClick={() => onRunCellsBelow?.(cell.id, true)}
                              disabled={isExecuting}
                            >
                              Run cell and below
                            </MenuItem>
                            <MenuItem
                              icon={<ArrowCircleDown20Regular />}
                              onClick={() => onRunCellsBelow?.(cell.id, false)}
                              disabled={isExecuting || index === cells.length - 1}
                            >
                              Run cells below
                            </MenuItem>
                            <MenuItem
                              icon={<Copy16Regular />}
                              disabled={true}
                            >
                              Duplicate cell
                            </MenuItem>
                            <MenuItem
                              icon={<Cut16Regular />}
                              disabled={true}
                            >
                              Cut cell
                            </MenuItem>
                            <MenuItem
                              icon={<Delete16Regular />}
                              onClick={() => onCellDelete?.(cell.id)}
                              disabled={isExecuting || cell.isExecuting}
                            >
                              Delete cell
                            </MenuItem>
                          </MenuList>
                        </MenuPopover>
                      </Menu>
                    </div>
                  </div>

                  {/* Cell Editor */}
                  <div className={styles.cellEditor}>
                    <Editor
                      height="120px"
                      defaultLanguage="python"
                      value={cell.code}
                      onChange={(value) => onCellCodeChange?.(cell.id, value || '')}
                      theme="vs-light"
                      options={{
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        fontSize: 13,
                        lineNumbers: 'on',
                        renderLineHighlight: 'all',
                        readOnly: cell.isExecuting,
                        folding: true,
                        lineNumbersMinChars: 3,
                        glyphMargin: false,
                      }}
                    />
                  </div>

                  {/* Cell Output */}
                  {(cell.output || cell.isExecuting) && (
                    <div
                      className={`${styles.cellOutput} ${
                        cell.hasError ? styles.cellOutputError : styles.cellOutputSuccess
                      }`}
                    >
                      {cell.isExecuting ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Spinner size="tiny" />
                          <Text size={200}>Executing...</Text>
                        </div>
                      ) : (
                        <>
                          {/* Execution Time - First line of output */}
                          {cell.executionTime !== undefined && (
                            <div className={styles.executionTime}>
                              <Clock16Regular />
                              <Text size={200}>
                                Execution time: {formatExecutionTime(cell.executionTime)}
                              </Text>
                            </div>
                          )}
                          <Text size={200} weight="semibold" style={{ marginBottom: '4px', display: 'block' }}>
                            {cell.hasError ? 'Error:' : 'Output:'}
                          </Text>
                          <pre style={{ margin: '0' }}>{cell.output}</pre>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Add Cell Button (after each cell) */}
                <div className={`${styles.addCellButton} ${styles.addCellButtonVisible}`}>
                  <Tooltip content="Add cell below" relationship="label">
                    <Button
                      appearance="subtle"
                      size="small"
                      icon={<Add16Regular />}
                      onClick={() => onAddCell?.(cell.id)}
                      disabled={isExecuting}
                    />
                  </Tooltip>
                </div>
              </div>
            ))}
            {/* Scroll anchor */}
            <div ref={cellsEndRef} />
          </div>
        )}
      </div>
    </div>
  );
};
