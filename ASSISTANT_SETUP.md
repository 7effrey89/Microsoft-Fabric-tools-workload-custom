# AI Assistant Setup Guide

This guide explains how to configure and use the AI Assistant feature in the Microsoft Fabric workload with Azure OpenAI integration.

## Overview

The AI Assistant provides an intelligent coding companion for your Fabric notebooks. It helps you:
- Break down complex data analysis tasks into manageable steps
- Generate PySpark code for each step automatically
- Execute code in the notebook with Spark engine integration
- Evaluate results and iterate through multi-step workflows

## Architecture

The AI Assistant feature consists of three main components:

1. **AssistantPanel** (Right Sidebar): Displays the current plan, steps, and execution status
2. **NotebookEditor** (Center Panel): Interactive code cells with Spark execution
3. **AzureOpenAIClient**: Backend integration for plan and code generation

## Azure OpenAI Configuration

### Prerequisites

- An Azure subscription
- Access to Azure OpenAI Service
- A deployed GPT-4 or GPT-3.5-Turbo model

### Step 1: Create Azure OpenAI Resource

1. Navigate to the [Azure Portal](https://portal.azure.com)
2. Create a new **Azure OpenAI** resource
3. Wait for the deployment to complete
4. Note down the **Endpoint** and **API Key** from the resource's "Keys and Endpoint" page

### Step 2: Deploy a Model

1. In your Azure OpenAI resource, go to **Model deployments**
2. Click **Create new deployment**
3. Select a model (recommended: `gpt-4` or `gpt-35-turbo`)
4. Give it a deployment name (e.g., `gpt-4`)
5. Complete the deployment

### Step 3: Configure Environment Variables

Add the following variables to your `.env.dev` file:

```bash
# Azure OpenAI Configuration
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key-here
AZURE_OPENAI_DEPLOYMENT=gpt-4
AZURE_OPENAI_API_VERSION=2024-02-15-preview
```

**Important**: Replace the placeholder values with your actual Azure OpenAI credentials.

### Step 4: Restart the Development Server

After updating the environment variables:

```bash
cd Workload
npm run start:devServer
```

## Using the AI Assistant

### 1. Open the Notebook View

1. Create or open a HelloWorld item
2. Click the **Open Notebook** button in the ribbon
3. The three-panel layout will appear:
   - Left: Lakehouse selector
   - Center: Notebook editor
   - Right: AI Assistant

### 2. Select a Lakehouse

1. Click **Select Lakehouse** in the left panel
2. Choose the lakehouse containing your data
3. A Spark session will be initialized automatically

### 3. Create a Plan with AI Assistant

1. In the AI Assistant panel (right), enter your task description:
   - Example: "Analyze sales data and find top performing products"
   - Example: "Load customer data, calculate monthly revenue, and visualize trends"
2. Click **Generate Plan**
3. The AI will create a multi-step execution plan

### 4. Execute Steps

1. Review the generated plan steps
2. Click **Execute Step** to:
   - Generate PySpark code for the current step
   - Inject the code into a new notebook cell
   - Execute the cell on the Spark engine
3. Review the output in the notebook cell
4. Click **Next Step** to proceed to the next step
5. Continue until all steps are completed

### 5. Manual Code Editing

You can also:
- Manually add new cells with the **Add Cell** button
- Edit generated code before or after execution
- Run individual cells with the **Play** button
- Delete cells you don't need

## Features

### AI-Powered Plan Generation

The assistant breaks down your task into logical steps:
- Data loading from lakehouse
- Data exploration and schema analysis
- Transformations and aggregations
- Results display and storage

### Code Generation

For each step, the AI generates:
- Clean, well-commented PySpark code
- Appropriate DataFrame operations
- Error handling where needed
- Best practices for Spark optimization

### Spark Integration

- Automatic Spark session management
- Real-time code execution in notebook cells
- Cell output display with error handling
- Session state monitoring

### Iterative Workflow

- Execute steps one at a time
- Review and validate results at each stage
- Modify or regenerate code as needed
- Track progress through the plan

## Mock Mode (No Azure OpenAI)

If Azure OpenAI is not configured, the assistant runs in **mock mode**:
- Provides sample plans for common data analysis patterns
- Generates template PySpark code
- Allows you to test the UI and workflow
- Great for development and demos

To use mock mode, simply don't configure the Azure OpenAI environment variables.

## Troubleshooting

### Azure OpenAI Connection Issues

**Problem**: "Error generating plan" or "Error generating code"

**Solutions**:
1. Verify your `AZURE_OPENAI_ENDPOINT` is correct
2. Check that `AZURE_OPENAI_API_KEY` is valid
3. Ensure the `AZURE_OPENAI_DEPLOYMENT` name matches your deployment
4. Confirm your Azure OpenAI resource is active

### Spark Session Issues

**Problem**: "No active Spark session" or cells not executing

**Solutions**:
1. Select a lakehouse in the left panel
2. Wait for the session state to show "IDLE"
3. Check that your Fabric capacity has sufficient resources
4. Try selecting a different lakehouse

### Code Execution Timeouts

**Problem**: Cell execution times out

**Solutions**:
1. Simplify the code or break it into smaller steps
2. Check Spark cluster status in Fabric
3. Verify data sources are accessible
4. Review Spark logs for errors

## Best Practices

### Writing Effective Task Descriptions

Good task descriptions:
- ✅ "Load sales data from the Sales table, calculate total revenue by product category, and show the top 10 categories"
- ✅ "Analyze customer churn by joining customer and transaction tables, then visualize churn rate over time"

Vague task descriptions:
- ❌ "Analyze data"
- ❌ "Do some calculations"

### Using Generated Code

- **Review before executing**: AI-generated code may need adjustments for your specific schema
- **Test incrementally**: Run one step at a time to catch issues early
- **Customize as needed**: Edit the generated code to fit your exact requirements
- **Add comments**: Enhance the code with domain-specific context

### Managing Notebook State

- **Save regularly**: The notebook auto-saves, but manual saves ensure data persistence
- **Clear outputs**: Delete old cell outputs to keep the notebook clean
- **Organize cells**: Use the notebook editor to reorder cells logically
- **Document results**: Add markdown cells (future enhancement) to explain findings

## Security Considerations

### API Key Management

- **Never commit** Azure OpenAI keys to source control
- Use `.env` files (which are .gitignored) for local development
- Use Azure Key Vault or similar for production deployments
- Rotate keys regularly

### Data Privacy

- Be aware that data sent to Azure OpenAI for code generation may include:
  - Task descriptions
  - Table/column names
  - Sample data values
- Review your organization's data governance policies
- Consider using private endpoints for Azure OpenAI

### Access Control

- Restrict who can configure Azure OpenAI credentials
- Monitor Azure OpenAI usage and costs
- Implement appropriate Fabric workspace permissions

## Cost Considerations

Azure OpenAI charges based on:
- **Tokens processed**: Each API call consumes tokens based on input + output length
- **Model type**: GPT-4 costs more than GPT-3.5-Turbo

To optimize costs:
- Use GPT-3.5-Turbo for simpler tasks
- Keep task descriptions concise
- Cache common plans (future enhancement)
- Monitor usage in Azure Portal

## Future Enhancements

Potential improvements to the AI Assistant:

- **Markdown cells**: Add documentation cells in notebooks
- **Data visualization**: Auto-generate charts and graphs
- **Plan templates**: Pre-built plans for common scenarios
- **Multi-language support**: SQL, R, and Scala code generation
- **Error auto-correction**: AI suggests fixes for failed executions
- **Collaborative editing**: Multiple users working on the same notebook

## Support

For issues or questions:
- Check the [main README](../README.md) for general setup
- Review [PROJECT.md](../PROJECT.md) for architecture details
- Open an issue in the GitHub repository
- Contact your Fabric administrator for workspace access

## Additional Resources

- [Azure OpenAI Documentation](https://learn.microsoft.com/azure/ai-services/openai/)
- [Microsoft Fabric Notebooks](https://learn.microsoft.com/fabric/data-engineering/how-to-use-notebook)
- [PySpark Documentation](https://spark.apache.org/docs/latest/api/python/)
- [Microsoft Fabric Extensibility](https://learn.microsoft.com/fabric/extensibility-toolkit)
