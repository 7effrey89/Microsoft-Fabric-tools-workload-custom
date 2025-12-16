# AI Assistant Notebook - Quick Start

This document provides a quick guide to test the new AI Assistant notebook experience.

## Overview

The notebook experience has been added to the HelloWorld item in this workload. It provides:

- **Three-panel layout**: Lakehouse selector (left), Notebook editor (center), AI Assistant (right)
- **AI-powered planning**: Break down tasks into executable steps
- **Spark integration**: Execute PySpark code with real-time output
- **Code generation**: Automatically generate code for each step

## Quick Test (Mock Mode)

You can test the UI without Azure OpenAI credentials by using mock mode:

1. **Start the development server:**
   ```bash
   cd Workload
   npm run start:devServer
   ```

2. **Create or open a HelloWorld item** in your Fabric workspace

3. **Switch to notebook view:**
   - Look for the "Open Notebook" button in the ribbon
   - Click it to open the three-panel notebook interface

4. **Test the features:**

   **Left Panel - Lakehouse:**
   - Click "Select Lakehouse" to choose a data source
   - The Spark session will initialize automatically

   **Center Panel - Notebook:**
   - Click "Add Cell" to create a new code cell
   - Write or paste PySpark code
   - Click the Play button to execute
   - View output below each cell

   **Right Panel - AI Assistant:**
   - Enter a task description (e.g., "Load and analyze sales data")
   - Click "Generate Plan"
   - The AI will create a multi-step plan (using mock data if no Azure OpenAI)
   - Click "Execute Step" to generate and run code
   - Review results and proceed to next step

## Mock Mode Features

Without Azure OpenAI configuration, the assistant provides:

- **Sample plans** for common data analysis patterns:
  - Step 1: Load data from lakehouse
  - Step 2: Explore data structure
  - Step 3: Perform transformations
  - Step 4: Display results

- **Template code** for each step type
- **Full UI functionality** to test the workflow

## Testing with Azure OpenAI

For full AI-powered code generation:

1. **Configure Azure OpenAI** (see [ASSISTANT_SETUP.md](./ASSISTANT_SETUP.md))

2. **Update `.env.dev`:**
   ```bash
   AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
   AZURE_OPENAI_API_KEY=your-api-key
   AZURE_OPENAI_DEPLOYMENT=gpt-4
   AZURE_OPENAI_API_VERSION=2024-02-15-preview
   ```

3. **Restart the development server**

4. **Test with real AI:**
   - Enter complex task descriptions
   - Get tailored PySpark code for your data
   - The AI adapts to your lakehouse schema

## UI Features to Test

### Panel Management
- Click the chevron buttons to hide/show left and right panels
- Test responsive layout with different panel combinations

### Notebook Editor
- Add multiple cells
- Edit generated code before execution
- Delete cells you don't need
- View execution output and errors

### AI Assistant
- Generate different types of plans
- Execute steps one at a time
- Track progress through the plan
- Start new tasks with "Start New Task" button

### Spark Integration
- Session initialization on lakehouse selection
- Session state monitoring (IDLE, RUNNING, etc.)
- Real-time code execution
- Output display with error handling

## Example Tasks to Try

**Data Loading:**
```
Load customer data from the Customers table and show the first 10 rows
```

**Analysis:**
```
Calculate total revenue by product category and show top 5 categories
```

**Aggregation:**
```
Group sales by month, calculate average order value, and sort by date
```

**Complex Workflow:**
```
Join customer and order tables, filter for last 6 months, calculate customer lifetime value
```

## Troubleshooting

**Issue: "Open Notebook" button doesn't appear**
- Ensure you're on a HelloWorld item editor
- Check the ribbon toolbar for the Code icon button

**Issue: Cells won't execute**
- Verify a lakehouse is selected in the left panel
- Check that the session state shows "IDLE"
- Ensure your Fabric capacity has available resources

**Issue: Mock plans are too generic**
- This is expected without Azure OpenAI configuration
- Edit the generated code manually to fit your needs
- Or configure Azure OpenAI for tailored code

**Issue: Build errors**
- Run `npm install` in the Workload directory
- Run `npm run build:test` to check for errors
- Check that all new files are properly imported

## Next Steps

- See [ASSISTANT_SETUP.md](./ASSISTANT_SETUP.md) for full Azure OpenAI setup
- Review [PROJECT.md](./PROJECT.md) for architecture details
- Explore the source code in `Workload/app/components/` and `Workload/app/items/HelloWorldItem/`

## File Structure

```
Workload/app/
├── clients/
│   └── AzureOpenAIClient.ts        # Azure OpenAI integration
├── components/
│   ├── AssistantPanel.tsx          # Right sidebar UI
│   └── NotebookEditor.tsx          # Center notebook UI
└── items/HelloWorldItem/
    ├── HelloWorldItemEditor.tsx              # Main editor with view switching
    ├── HelloWorldItemEditorNotebook.tsx      # Three-panel notebook view
    ├── HelloWorldItemModel.ts                # Data models with notebook state
    └── HelloWorldItemRibbon.tsx              # Ribbon with notebook button
```

## Feedback

This is a demo implementation showing how to integrate:
- AI-assisted coding in Fabric notebooks
- Multi-panel layouts for complex workflows
- Spark execution with real-time feedback
- Iterative task planning and execution

For production use, consider:
- Adding error recovery mechanisms
- Implementing plan templates
- Supporting multiple languages (SQL, R)
- Adding data visualization capabilities
- Implementing collaborative features
