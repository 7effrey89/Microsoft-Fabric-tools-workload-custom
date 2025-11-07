import React from 'react';
import {
  Button,
  Text,
  makeStyles,
  tokens,
  shorthands,
  Tooltip,
  Spinner,
} from '@fluentui/react-components';
import {
  Add24Regular,
  Play24Regular,
  Delete24Regular,
  Code24Regular,
} from '@fluentui/react-icons';
import Editor from '@monaco-editor/react';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.overflow('auto'),
  },
  header: {
    ...shorthands.padding('12px', '16px'),
    backgroundColor: tokens.colorNeutralBackground1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke1),
  },
  content: {
    flexGrow: 1,
    ...shorthands.padding('16px'),
    ...shorthands.overflow('auto'),
  },
  cellsContainer: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('16px'),
  },
  cellCard: {
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    ...shorthands.borderRadius('8px'),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.overflow('hidden'),
  },
  cellHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shorthands.padding('8px', '12px'),
    backgroundColor: tokens.colorNeutralBackground3,
  },
  cellActions: {
    display: 'flex',
    ...shorthands.gap('4px'),
  },
  cellEditor: {
    minHeight: '150px',
    ...shorthands.border('none'),
  },
  cellOutput: {
    ...shorthands.padding('12px'),
    backgroundColor: tokens.colorNeutralBackground2,
    fontFamily: 'monospace',
    fontSize: '12px',
    whiteSpace: 'pre-wrap',
    ...shorthands.borderTop('1px', 'solid', tokens.colorNeutralStroke1),
  },
  cellOutputError: {
    color: tokens.colorPaletteRedForeground1,
  },
  cellOutputSuccess: {
    color: tokens.colorNeutralForeground1,
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
});

export interface NotebookCell {
  id: string;
  code: string;
  output?: string;
  isExecuting?: boolean;
  hasError?: boolean;
}

export interface NotebookEditorProps {
  cells: NotebookCell[];
  onCellCodeChange?: (cellId: string, code: string) => void;
  onCellExecute?: (cellId: string) => void;
  onCellDelete?: (cellId: string) => void;
  onAddCell?: () => void;
  isExecuting?: boolean;
}

export const NotebookEditor: React.FC<NotebookEditorProps> = ({
  cells,
  onCellCodeChange,
  onCellExecute,
  onCellDelete,
  onAddCell,
  isExecuting,
}) => {
  const styles = useStyles();

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Code24Regular />
          <Text weight="semibold" size={400}>Notebook</Text>
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
            {cells.length} {cells.length === 1 ? 'cell' : 'cells'}
          </Text>
        </div>
        <Tooltip content="Add new cell" relationship="label">
          <Button
            appearance="primary"
            icon={<Add24Regular />}
            onClick={onAddCell}
            disabled={isExecuting}
          >
            Add Cell
          </Button>
        </Tooltip>
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
              onClick={onAddCell}
            >
              Add First Cell
            </Button>
          </div>
        ) : (
          <div className={styles.cellsContainer}>
            {cells.map((cell, index) => (
              <div key={cell.id} className={styles.cellCard}>
                {/* Cell Header */}
                <div className={styles.cellHeader}>
                  <Text size={200} weight="semibold">
                    Cell {index + 1}
                  </Text>
                  <div className={styles.cellActions}>
                    <Tooltip content="Run cell" relationship="label">
                      <Button
                        appearance="subtle"
                        icon={cell.isExecuting ? <Spinner size="tiny" /> : <Play24Regular />}
                        onClick={() => onCellExecute?.(cell.id)}
                        disabled={isExecuting || cell.isExecuting || !cell.code.trim()}
                      />
                    </Tooltip>
                    <Tooltip content="Delete cell" relationship="label">
                      <Button
                        appearance="subtle"
                        icon={<Delete24Regular />}
                        onClick={() => onCellDelete?.(cell.id)}
                        disabled={isExecuting || cell.isExecuting}
                      />
                    </Tooltip>
                  </div>
                </div>

                {/* Cell Editor */}
                <div className={styles.cellEditor}>
                  <Editor
                    height="150px"
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
                        <Text size={200} weight="semibold">
                          {cell.hasError ? 'Error:' : 'Output:'}
                        </Text>
                        <pre style={{ margin: '4px 0 0 0' }}>{cell.output}</pre>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
