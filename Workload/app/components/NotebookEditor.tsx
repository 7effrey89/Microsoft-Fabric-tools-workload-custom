import React, { useRef, useEffect, useState } from 'react';
import {
  Button,
  Text,
  makeStyles,
  mergeClasses,
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
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
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
  ArrowDownload24Regular,
  ArrowUpload24Regular,
  Code16Regular,
  TextDescription16Regular,
  Warning24Regular,
  Edit16Regular,
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
  // Markdown cell in read mode - blends with background like Fabric notebook
  cellCardMarkdownRead: {
    ...shorthands.border('1px', 'solid', 'transparent'),
    ...shorthands.borderLeft('3px', 'solid', tokens.colorNeutralStroke2),
    backgroundColor: 'transparent',
    ...shorthands.borderRadius('0'),
    ':hover': {
      ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
      ...shorthands.borderLeft('3px', 'solid', tokens.colorBrandStroke1),
      backgroundColor: tokens.colorNeutralBackground1,
      ...shorthands.borderRadius('8px'),
    },
  },
  // Markdown cell when selected but not editing
  cellCardMarkdownSelected: {
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    ...shorthands.borderLeft('3px', 'solid', tokens.colorBrandStroke1),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRadius('8px'),
  },
  // Markdown cell header hidden in read mode
  cellHeaderMarkdownRead: {
    display: 'none',
  },
  // Markdown cell header shown on hover/selection
  cellHeaderMarkdownHover: {
    display: 'flex',
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
  // Floating action bar for markdown cells (appears top-right on hover)
  markdownFloatingActions: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    display: 'flex',
    ...shorthands.gap('2px'),
    ...shorthands.padding('4px'),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRadius('4px'),
    boxShadow: tokens.shadow4,
    opacity: 0,
    transition: 'opacity 0.15s ease',
    zIndex: 10,
  },
  markdownFloatingActionsVisible: {
    opacity: 1,
  },
  // Container for markdown cell content with relative positioning
  markdownCellContainer: {
    position: 'relative',
  },
  cellActions: {
    display: 'flex',
    ...shorthands.gap('2px'),
  },
  cellEditor: {
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
  markdownPreview: {
    ...shorthands.padding('16px', '16px'),
    minHeight: '40px',
    cursor: 'pointer',
    '& h1': {
      fontSize: '24px',
      fontWeight: 600,
      marginTop: 0,
      marginBottom: '12px',
      color: tokens.colorNeutralForeground1,
    },
    '& h2': {
      fontSize: '20px',
      fontWeight: 600,
      marginTop: 0,
      marginBottom: '10px',
      color: tokens.colorNeutralForeground1,
    },
    '& h3': {
      fontSize: '16px',
      fontWeight: 600,
      marginTop: 0,
      marginBottom: '8px',
      color: tokens.colorNeutralForeground1,
    },
    '& p': {
      marginTop: 0,
      marginBottom: '8px',
      lineHeight: '1.5',
    },
    '& ul, & ol': {
      marginTop: 0,
      marginBottom: '8px',
      paddingLeft: '24px',
    },
    '& li': {
      marginBottom: '4px',
    },
    '& code': {
      fontFamily: 'Consolas, Monaco, "Courier New", monospace',
      backgroundColor: tokens.colorNeutralBackground4,
      ...shorthands.padding('2px', '6px'),
      ...shorthands.borderRadius('4px'),
      fontSize: '13px',
    },
    '& pre': {
      backgroundColor: tokens.colorNeutralBackground4,
      ...shorthands.padding('12px'),
      ...shorthands.borderRadius('6px'),
      overflowX: 'auto',
      marginTop: 0,
      marginBottom: '8px',
    },
    '& pre code': {
      backgroundColor: 'transparent',
      ...shorthands.padding('0'),
    },
    '& blockquote': {
      ...shorthands.margin('0', '0', '8px', '0'),
      ...shorthands.padding('8px', '16px'),
      ...shorthands.borderLeft('4px', 'solid', tokens.colorBrandStroke1),
      backgroundColor: tokens.colorNeutralBackground3,
      fontStyle: 'italic',
    },
    '& a': {
      color: tokens.colorBrandForeground1,
      textDecoration: 'none',
      ':hover': {
        textDecoration: 'underline',
      },
    },
    '& strong': {
      fontWeight: 600,
    },
    '& em': {
      fontStyle: 'italic',
    },
    '& hr': {
      ...shorthands.border('none'),
      ...shorthands.borderTop('1px', 'solid', tokens.colorNeutralStroke2),
      marginTop: '16px',
      marginBottom: '16px',
    },
  },
  markdownPlaceholder: {
    color: tokens.colorNeutralForeground3,
    fontStyle: 'italic',
  },
  cellTypeBadge: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('4px'),
    ...shorthands.padding('2px', '8px'),
    ...shorthands.borderRadius('4px'),
    fontSize: '11px',
    fontWeight: 500,
  },
  cellTypeBadgeCode: {
    backgroundColor: tokens.colorPaletteBlueBorderActive,
    color: 'white',
  },
  cellTypeBadgeMarkdown: {
    backgroundColor: tokens.colorPaletteGreenBackground2,
    color: tokens.colorPaletteGreenForeground1,
  },
});

export type CellType = 'code' | 'markdown';

export interface NotebookCell {
  id: string;
  code: string;
  cellType: CellType;
  output?: string;
  isExecuting?: boolean;
  hasError?: boolean;
  executionTime?: number; // Execution time in milliseconds
  isEditing?: boolean; // For markdown cells - whether in edit mode
}

export interface NotebookEditorProps {
  cells: NotebookCell[];
  onCellCodeChange?: (cellId: string, code: string) => void;
  onCellExecute?: (cellId: string) => void;
  onCellDelete?: (cellId: string) => void;
  onAddCell?: (afterCellId?: string, cellType?: CellType) => void;
  onCellTypeChange?: (cellId: string, cellType: CellType) => void;
  onCellEditingChange?: (cellId: string, isEditing: boolean) => void;
  onMoveCell?: (cellId: string, direction: 'up' | 'down') => void;
  onRunAllCells?: () => void;
  onRunCellsBelow?: (fromCellId: string, includeCurrent: boolean) => void;
  onClearAllOutputs?: () => void;
  onImportNotebook?: (cells: NotebookCell[]) => void;
  onExportNotebook?: () => void;
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
  onCellTypeChange,
  onCellEditingChange,
  onMoveCell,
  onRunAllCells,
  onRunCellsBelow,
  onClearAllOutputs,
  onImportNotebook,
  onExportNotebook,
  isExecuting,
  selectedCellId,
  onSelectCell,
}) => {
  const styles = useStyles();
  const cellsEndRef = useRef<HTMLDivElement>(null);
  const prevCellsLengthRef = useRef(cells.length);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dialog state for import confirmation
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importDialogMessage, setImportDialogMessage] = useState('');
  const [pendingImportCells, setPendingImportCells] = useState<NotebookCell[] | null>(null);
  
  // Dialog state for error messages
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorDialogMessage, setErrorDialogMessage] = useState('');

  // Auto-scroll to bottom when a new cell is added
  useEffect(() => {
    if (cells.length > prevCellsLengthRef.current) {
      cellsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevCellsLengthRef.current = cells.length;
  }, [cells.length]);

  const hasAnyOutput = cells.some(c => c.output);
  const hasAnyContent = cells.some(c => c.code && c.code.trim() !== '' && c.code.trim() !== '# Write your PySpark code here');
  
  // Show error dialog helper
  const showError = (message: string) => {
    setErrorDialogMessage(message);
    setErrorDialogOpen(true);
  };
  
  // Confirm import and actually do it
  const confirmImport = () => {
    if (pendingImportCells) {
      onImportNotebook?.(pendingImportCells);
    }
    setImportDialogOpen(false);
    setPendingImportCells(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Cancel import - used in dialog onOpenChange and Cancel button
  const handleCancelImport = () => {
    setImportDialogOpen(false);
    setPendingImportCells(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Simple markdown to HTML renderer
  const renderMarkdown = (text: string): string => {
    if (!text.trim()) return '';
    
    let html = text
      // Escape HTML entities
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Headers
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      // Bold and italic
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/___(.+?)___/g, '<strong><em>$1</em></strong>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      .replace(/_(.+?)_/g, '<em>$1</em>')
      // Code blocks (multi-line)
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Blockquotes
      .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
      // Unordered lists
      .replace(/^[\*\-] (.+)$/gm, '<li>$1</li>')
      // Ordered lists
      .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      // Horizontal rules
      .replace(/^---+$/gm, '<hr/>')
      // Line breaks (double newline = paragraph)
      .replace(/\n\n/g, '</p><p>')
      // Single line breaks
      .replace(/\n/g, '<br/>');
    
    // Wrap in paragraph if not already wrapped
    if (!html.startsWith('<h') && !html.startsWith('<pre') && !html.startsWith('<blockquote') && !html.startsWith('<li')) {
      html = '<p>' + html + '</p>';
    }
    
    // Wrap consecutive li elements in ul
    html = html.replace(/(<li>.*?<\/li>)+/g, '<ul>$&</ul>');
    
    return html;
  };

  // Handle file import
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file extension
    if (!file.name.toLowerCase().endsWith('.ipynb')) {
      showError('Invalid file type. Please select a .ipynb (Jupyter Notebook) file.');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      showError('Failed to read the file. Please try again.');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        
        // Validate JSON structure
        let notebook: any;
        try {
          notebook = JSON.parse(content);
        } catch (parseError) {
          showError('Invalid JSON format. The file does not appear to be a valid Jupyter notebook.');
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          return;
        }
        
        // Validate notebook structure
        if (!notebook || typeof notebook !== 'object') {
          showError('Invalid notebook format. The file structure is not recognized.');
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          return;
        }

        // Check for required notebook properties
        if (!notebook.cells || !Array.isArray(notebook.cells)) {
          showError('Invalid notebook format. No cells array found in the notebook.');
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          return;
        }

        // Note: Skip nbformat version warning for old notebooks - just import anyway
        
        // Parse .ipynb format - support both code and markdown cells
        const importedCells: NotebookCell[] = [];
        let markdownCount = 0;
        let codeCount = 0;
        let skippedCount = 0;

        notebook.cells.forEach((cell: any, index: number) => {
          // Get source - can be string or array of strings
          const source = Array.isArray(cell.source) 
            ? cell.source.join('') 
            : (cell.source || '');

          if (cell.cell_type === 'code') {
            codeCount++;
            
            // Get output for code cells
            let output: string | undefined;
            let hasError = false;
            
            if (cell.outputs && Array.isArray(cell.outputs) && cell.outputs.length > 0) {
              const outputParts: string[] = [];
              cell.outputs.forEach((out: any) => {
                if (out.output_type === 'error') {
                  hasError = true;
                  // Format error output
                  const errorName = out.ename || 'Error';
                  const errorValue = out.evalue || '';
                  const traceback = out.traceback ? out.traceback.join('\n') : '';
                  outputParts.push(`${errorName}: ${errorValue}\n${traceback}`);
                } else if (out.text) {
                  outputParts.push(Array.isArray(out.text) ? out.text.join('') : out.text);
                } else if (out.data) {
                  // Handle different output types
                  if (out.data['text/plain']) {
                    const text = out.data['text/plain'];
                    outputParts.push(Array.isArray(text) ? text.join('') : text);
                  } else if (out.data['text/html']) {
                    // For HTML output, just indicate it exists (can't render full HTML)
                    outputParts.push('[HTML Output - view in Jupyter to see full content]');
                  } else if (out.data['image/png'] || out.data['image/jpeg']) {
                    outputParts.push('[Image Output - view in Jupyter to see full content]');
                  }
                }
              });
              if (outputParts.length > 0) {
                output = outputParts.join('\n');
              }
            }
            
            importedCells.push({
              id: `cell-${Date.now()}-${index}`,
              code: source,
              cellType: 'code',
              output,
              isExecuting: false,
              hasError,
            });
          } else if (cell.cell_type === 'markdown') {
            markdownCount++;
            
            // Import as a proper markdown cell
            importedCells.push({
              id: `cell-${Date.now()}-${index}`,
              code: source,
              cellType: 'markdown',
              output: undefined,
              isExecuting: false,
              hasError: false,
              isEditing: false,
            });
          } else if (cell.cell_type === 'raw') {
            // Skip raw cells but count them
            skippedCount++;
          } else {
            // Unknown cell type
            skippedCount++;
          }
        });
        
        if (importedCells.length === 0) {
          showError('No code or markdown cells found in the notebook file.');
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          return;
        }

        // Build import summary message
        let summaryParts: string[] = [];
        if (codeCount > 0) summaryParts.push(`${codeCount} code cell(s)`);
        if (markdownCount > 0) summaryParts.push(`${markdownCount} markdown cell(s)`);
        if (skippedCount > 0) summaryParts.push(`${skippedCount} cell(s) skipped`);
        const summary = summaryParts.join(', ');

        // Check if current notebook has content - show confirmation dialog
        if (hasAnyContent) {
          setImportDialogMessage(
            `Importing this notebook will replace your current ${cells.length} cell(s).\n\n` +
            `Import summary: ${summary}`
          );
          setPendingImportCells(importedCells);
          setImportDialogOpen(true);
          // Don't reset file input here - wait for dialog result
        } else {
          // No existing content, import directly
          onImportNotebook?.(importedCells);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      } catch (error) {
        console.error('Error parsing notebook:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        showError(`Failed to parse notebook file: ${errorMessage}\n\nPlease ensure it is a valid .ipynb file.`);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className={styles.container}>
      {/* Hidden file input for import */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept=".ipynb"
        onChange={handleFileImport}
      />

      {/* Ribbon Toolbar */}
      <div className={styles.ribbon}>
        {/* File Operations Group */}
        <div className={styles.ribbonGroup}>
          <Tooltip content="Import notebook (.ipynb)" relationship="label">
            <Button
              appearance="subtle"
              size="small"
              icon={<ArrowUpload24Regular />}
              onClick={() => fileInputRef.current?.click()}
              disabled={isExecuting}
            >
              Import
            </Button>
          </Tooltip>
          <Tooltip content="Export as .ipynb" relationship="label">
            <Button
              appearance="subtle"
              size="small"
              icon={<ArrowDownload24Regular />}
              onClick={onExportNotebook}
              disabled={isExecuting || cells.length === 0}
            >
              Export
            </Button>
          </Tooltip>
        </div>

        <Divider vertical className={styles.ribbonDivider} />

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
              icon={<Code16Regular />}
              onClick={() => {
                // Add after selected cell, or at the end if none selected
                if (selectedCellId) {
                  onAddCell?.(selectedCellId, 'code');
                } else if (cells.length > 0) {
                  onAddCell?.(cells[cells.length - 1].id, 'code');
                } else {
                  onAddCell?.(undefined, 'code');
                }
              }}
              disabled={isExecuting}
            >
              Code
            </Button>
          </Tooltip>
          <Tooltip content="Add markdown cell" relationship="label">
            <Button
              appearance="subtle"
              size="small"
              icon={<TextDescription16Regular />}
              onClick={() => {
                // Add after selected cell, or at the end if none selected
                if (selectedCellId) {
                  onAddCell?.(selectedCellId, 'markdown');
                } else if (cells.length > 0) {
                  onAddCell?.(cells[cells.length - 1].id, 'markdown');
                } else {
                  onAddCell?.(undefined, 'markdown');
                }
              }}
              disabled={isExecuting}
            >
              Markdown
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
          {cells.filter(c => c.cellType === 'code').length} code, {cells.filter(c => c.cellType === 'markdown').length} markdown
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
                  className={mergeClasses(
                    styles.cellCard, 
                    // Code cells use standard selection
                    cell.cellType === 'code' && selectedCellId === cell.id && styles.cellCardSelected,
                    // Markdown cells in read mode blend with background (not selected, not editing)
                    cell.cellType === 'markdown' && !cell.isEditing && selectedCellId !== cell.id && styles.cellCardMarkdownRead,
                    // Markdown cells when selected (but not editing) show subtle border
                    cell.cellType === 'markdown' && !cell.isEditing && selectedCellId === cell.id && styles.cellCardMarkdownSelected,
                    // Markdown cells in edit mode show standard selection border
                    cell.cellType === 'markdown' && cell.isEditing && styles.cellCardSelected
                  )}
                  onClick={() => onSelectCell?.(cell.id)}
                >
                  {/* Cell Header - hidden for markdown cells in read mode when not selected */}
                  <div className={mergeClasses(
                    styles.cellHeader,
                    cell.cellType === 'markdown' && !cell.isEditing && selectedCellId !== cell.id && styles.cellHeaderMarkdownRead
                  )}>
                    <div className={styles.cellHeaderLeft}>
                      <Text className={styles.cellNumber}>
                        [{index + 1}]
                      </Text>
                      <Tooltip content={`Click to convert to ${cell.cellType === 'code' ? 'markdown' : 'code'}`} relationship="label">
                        <Button
                          appearance="subtle"
                          size="small"
                          className={mergeClasses(styles.cellTypeBadge, cell.cellType === 'code' ? styles.cellTypeBadgeCode : styles.cellTypeBadgeMarkdown)}
                          icon={cell.cellType === 'code' ? <Code16Regular /> : <TextDescription16Regular />}
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            onCellTypeChange?.(cell.id, cell.cellType === 'code' ? 'markdown' : 'code');
                          }}
                          disabled={isExecuting || cell.isExecuting}
                        >
                          {cell.cellType === 'code' ? 'Code' : 'Markdown'}
                        </Button>
                      </Tooltip>
                      {cell.isExecuting && (
                        <Spinner size="tiny" />
                      )}
                    </div>
                    <div className={styles.cellActions}>
                      {/* Run button - only for code cells */}
                      {cell.cellType === 'code' && (
                        <Tooltip content="Run cell" relationship="label">
                          <Button
                            appearance="subtle"
                            size="small"
                            icon={<Play16Regular />}
                            onClick={(e: React.MouseEvent) => { e.stopPropagation(); onCellExecute?.(cell.id); }}
                            disabled={isExecuting || cell.isExecuting || !cell.code.trim()}
                          />
                        </Tooltip>
                      )}
                      {/* Edit button - only for markdown cells in preview mode */}
                      {cell.cellType === 'markdown' && !cell.isEditing && (
                        <Tooltip content="Edit markdown" relationship="label">
                          <Button
                            appearance="subtle"
                            size="small"
                            icon={<TextDescription16Regular />}
                            onClick={(e: React.MouseEvent) => { 
                              e.stopPropagation(); 
                              onCellEditingChange?.(cell.id, true);
                            }}
                          />
                        </Tooltip>
                      )}
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
                            {cell.cellType === 'code' && (
                              <>
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
                              </>
                            )}
                            <MenuItem
                              icon={cell.cellType === 'code' ? <TextDescription16Regular /> : <Code16Regular />}
                              onClick={() => onCellTypeChange?.(cell.id, cell.cellType === 'code' ? 'markdown' : 'code')}
                              disabled={isExecuting || cell.isExecuting}
                            >
                              Convert to {cell.cellType === 'code' ? 'Markdown' : 'Code'}
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

                  {/* Cell Content - Code Editor or Markdown */}
                  {cell.cellType === 'code' ? (
                    // Code Cell Editor - auto-sizes based on content
                    <div className={styles.cellEditor}>
                      <Editor
                        height={Math.max(60, Math.min(600, (cell.code.split('\n').length + 1) * 19)) + 'px'}
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
                          automaticLayout: true,
                        }}
                      />
                    </div>
                  ) : cell.isEditing ? (
                    // Markdown Cell in Edit Mode - auto-sizes based on content
                    <div 
                      className={styles.cellEditor}
                      onBlur={(e) => {
                        // Check if the new focus target is outside this cell
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                          onCellEditingChange?.(cell.id, false);
                        }
                      }}
                    >
                      <Editor
                        height={Math.max(60, Math.min(600, (cell.code.split('\n').length + 1) * 19)) + 'px'}
                        defaultLanguage="markdown"
                        value={cell.code}
                        onChange={(value) => onCellCodeChange?.(cell.id, value || '')}
                        theme="vs-light"
                        options={{
                          minimap: { enabled: false },
                          scrollBeyondLastLine: false,
                          fontSize: 13,
                          lineNumbers: 'off',
                          renderLineHighlight: 'none',
                          wordWrap: 'on',
                          folding: false,
                          lineNumbersMinChars: 3,
                          glyphMargin: false,
                          automaticLayout: true,
                        }}
                        onMount={(editor) => {
                          // Focus the editor when entering edit mode
                          editor.focus();
                          // Exit edit mode when editor loses focus
                          editor.onDidBlurEditorWidget(() => {
                            // Small delay to allow click events to process first
                            setTimeout(() => {
                              if (!editor.hasWidgetFocus()) {
                                onCellEditingChange?.(cell.id, false);
                              }
                            }, 100);
                          });
                        }}
                      />
                    </div>
                  ) : (
                    // Markdown Cell in Preview Mode
                    <div className={styles.markdownCellContainer}>
                      {/* Floating action bar for markdown cells */}
                      <div 
                        className={mergeClasses(
                          styles.markdownFloatingActions,
                          (selectedCellId === cell.id) && styles.markdownFloatingActionsVisible
                        )}
                      >
                        <Tooltip content="Edit" relationship="label">
                          <Button
                            appearance="subtle"
                            size="small"
                            icon={<Edit16Regular />}
                            onClick={(e: React.MouseEvent) => { 
                              e.stopPropagation(); 
                              onCellEditingChange?.(cell.id, true);
                            }}
                          />
                        </Tooltip>
                        <Tooltip content="Convert to code" relationship="label">
                          <Button
                            appearance="subtle"
                            size="small"
                            icon={<Code16Regular />}
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              onCellTypeChange?.(cell.id, 'code');
                            }}
                          />
                        </Tooltip>
                        <Menu>
                          <MenuTrigger disableButtonEnhancement>
                            <Button
                              appearance="subtle"
                              size="small"
                              icon={<MoreHorizontal16Regular />}
                            />
                          </MenuTrigger>
                          <MenuPopover>
                            <MenuList>
                              <MenuItem 
                                icon={<ArrowUp16Regular />}
                                onClick={() => onMoveCell?.(cell.id, 'up')}
                                disabled={cells.findIndex(c => c.id === cell.id) === 0}
                              >
                                Move up
                              </MenuItem>
                              <MenuItem 
                                icon={<ArrowDown16Regular />}
                                onClick={() => onMoveCell?.(cell.id, 'down')}
                                disabled={cells.findIndex(c => c.id === cell.id) === cells.length - 1}
                              >
                                Move down
                              </MenuItem>
                              <MenuItem 
                                icon={<Delete16Regular />}
                                onClick={() => onCellDelete?.(cell.id)}
                              >
                                Delete cell
                              </MenuItem>
                            </MenuList>
                          </MenuPopover>
                        </Menu>
                        <Tooltip content="Delete" relationship="label">
                          <Button
                            appearance="subtle"
                            size="small"
                            icon={<Delete16Regular />}
                            onClick={(e: React.MouseEvent) => { 
                              e.stopPropagation(); 
                              onCellDelete?.(cell.id);
                            }}
                          />
                        </Tooltip>
                      </div>
                      
                      <div 
                        className={styles.markdownPreview}
                        onClick={(e) => {
                          e.stopPropagation();
                          onCellEditingChange?.(cell.id, true);
                        }}
                      >
                        {cell.code.trim() ? (
                          <div dangerouslySetInnerHTML={{ __html: renderMarkdown(cell.code) }} />
                        ) : (
                          <Text className={styles.markdownPlaceholder}>
                            Click to add markdown content...
                          </Text>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Cell Output - only for code cells */}
                  {cell.cellType === 'code' && (cell.output || cell.isExecuting) && (
                    <div
                      className={mergeClasses(styles.cellOutput, cell.hasError ? styles.cellOutputError : styles.cellOutputSuccess)}
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
                <div className={mergeClasses(styles.addCellButton, styles.addCellButtonVisible)}>
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

      {/* Import Confirmation Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={(_, data) => !data.open && handleCancelImport()}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Warning24Regular style={{ color: tokens.colorPaletteYellowForeground1 }} />
                Confirm Import
              </div>
            </DialogTitle>
            <DialogContent>
              <Text style={{ whiteSpace: 'pre-wrap' }}>{importDialogMessage}</Text>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={handleCancelImport}>Cancel</Button>
              <Button appearance="primary" onClick={confirmImport}>Import</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* Error Dialog */}
      <Dialog open={errorDialogOpen} onOpenChange={(_, data) => setErrorDialogOpen(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Warning24Regular style={{ color: tokens.colorPaletteRedForeground1 }} />
                Error
              </div>
            </DialogTitle>
            <DialogContent>
              <Text style={{ whiteSpace: 'pre-wrap' }}>{errorDialogMessage}</Text>
            </DialogContent>
            <DialogActions>
              <Button appearance="primary" onClick={() => setErrorDialogOpen(false)}>OK</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
};
