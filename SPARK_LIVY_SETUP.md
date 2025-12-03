# Spark Livy API Setup Guide

This guide explains how to configure the HelloWorldItem (AI Notebook Playground) to execute Spark code using Microsoft Fabric's Livy API.

## Overview

The HelloWorldItem integrates with Fabric's Spark Livy API to:
1. Create interactive Spark sessions attached to a Lakehouse
2. Execute AI-generated PySpark code against Spark compute
3. Inject code cells into Fabric notebooks
4. Display execution results in the assistant panel

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    HelloWorldItem Workflow                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  1. User selects Lakehouse → Creates Spark Livy Session              │
│  2. User selects Notebook → Notebook selected for code injection     │
│  3. AI generates plan → Steps broken down for execution              │
│  4. For each step:                                                   │
│     a. Azure OpenAI generates PySpark code                           │
│     b. Code is injected into selected notebook (Notebook API)        │
│     c. Code is executed via Spark Livy API (optional)                │
│     d. Results displayed in assistant panel                          │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Prerequisites

### 1. Fabric Environment
- ✅ **Fabric Premium or Trial Capacity** with a Lakehouse
- ✅ **Tenant Admin Setting**: Enable "Livy API (preview)" in Fabric admin portal
  - Navigate to: Fabric Admin Portal → Tenant Settings → Spark Settings
  - Enable: "Apache Livy API (Preview)"
  
### 2. Azure Entra App Registration
Your workload already has an Entra app registered from the initial setup. You need to add Livy API permissions to it.

#### Required API Permissions (Delegated)

Add these permissions to your Entra app in Azure Portal:

**Minimum Permissions (Recommended):**
```
✅ Item.ReadWrite.All              (Already configured)
✅ Workspace.ReadWrite.All         (Already configured)
✅ Lakehouse.Execute.All           (NEW - Required for Livy)
✅ Lakehouse.ReadWrite.All         (NEW - Required for Livy)
✅ Notebook.ReadWrite.All          (Already added for notebook injection)
```

**Additional Permissions for Advanced Scenarios:**
```
Code.AccessStorage.All             (If accessing external storage)
Code.AccessAzureDataLake.All       (If accessing ADLS)
Code.AccessAzureKeyvault.All       (If accessing Key Vault)
Code.AccessFabric.All              (For Fabric service interactions)
SparkJobDefinition.ReadWrite.All   (If using Spark Job Definitions)
```

### 3. Workspace Configuration
- User must be a **Contributor** or **Admin** in the Fabric workspace
- Lakehouse must exist in the same workspace as the HelloWorldItem
- Notebook (if using injection) must exist in the same workspace

## Azure Configuration Steps

### Step 1: Add Livy API Permissions

1. **Navigate to Azure Portal**
   - Go to [Microsoft Entra Admin Center](https://entra.microsoft.com/)
   - Select "App registrations"
   - Find your app (created during workload setup)

2. **Add API Permissions**
   ```
   → API permissions → Add a permission
   → APIs my organization uses → Search "Power BI Service"
   → Delegated permissions → Check:
      ✅ Lakehouse.Execute.All
      ✅ Lakehouse.ReadWrite.All
   → Add permissions
   ```

3. **Grant Admin Consent** (if required)
   - Click "Grant admin consent for [Your Org]"
   - Confirm the consent

### Step 2: Verify Lakehouse Access

1. **Open your Fabric Workspace**
2. **Navigate to the Lakehouse**
3. **Click Settings → Properties**
4. **Copy the Lakehouse ID** (you'll need this for testing)
5. **Copy the Livy API endpoint URL**
   - Settings → Apache Livy API
   - Copy the "Session job connection string"
   - Format: `https://api.fabric.microsoft.com/v1/workspaces/{workspaceId}/lakehouses/{lakehouseId}/livyApi/versions/2023-12-01/sessions`

## Environment Configuration

### Update `.env.dev` File

Add or verify these environment variables in `Workload/.env.dev`:

```bash
# Azure OpenAI Configuration (Already configured)
AZURE_OPENAI_ENDPOINT=https://jlaaiservices.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_DEPLOYMENT=gpt-4.1
AZURE_OPENAI_API_VERSION=2024-12-01-preview

# Fabric Workload Configuration (Already configured)
WORKLOAD_NAME=Org.FabricTools
WORKLOAD_VERSION=1.0.0
FRONTEND_URL=http://localhost:60006/

# Spark Livy Configuration (Optional - for debugging)
SPARK_LIVY_VERSION=2023-12-01
SPARK_SESSION_TIMEOUT=1200000
SPARK_STATEMENT_TIMEOUT=300000
```

## How It Works

### Current Implementation Status

✅ **Implemented:**
1. ✅ Lakehouse selection and connection
2. ✅ Spark Livy session creation
3. ✅ Notebook selection via datahub
4. ✅ AI plan generation with Azure OpenAI
5. ✅ Code injection into Fabric notebooks
6. ✅ Notebook Definition API integration

⚠️ **Partial Implementation:**
- Session initialization (code present but needs debugging)
- Code execution via Livy (framework ready, not yet connected to workflow)

❌ **Not Yet Implemented:**
- Automatic code execution after injection
- Results display from Livy execution
- Error handling for execution failures

### Execution Flow Options

#### Option 1: Manual Execution (Current)
```
1. AI generates code
2. Code injected into notebook
3. User manually runs cells in Fabric notebook editor
```

#### Option 2: Hybrid Execution (Recommended Next Step)
```
1. AI generates code
2. Code injected into notebook (for persistence)
3. Code executed via Spark Livy API (for immediate results)
4. Results displayed in assistant panel
5. User can re-run cells later in notebook
```

#### Option 3: Livy-Only Execution
```
1. AI generates code
2. Code executed via Spark Livy API
3. Results displayed in assistant panel
4. No notebook injection (ephemeral)
```

## Implementation Code

### Current Files

**Spark Livy Client:**
- `Workload/app/clients/SparkLivyClient.ts` - Livy API wrapper
- Methods: `createSession()`, `getSession()`, `submitStatement()`, `deleteSession()`

**Notebook Integration:**
- `Workload/app/clients/FabricNotebookClient.ts` - Notebook Definition API wrapper
- Methods: `getNotebookDefinition()`, `updateNotebookDefinition()`, `addCells()`

**Main Editor:**
- `Workload/app/items/HelloWorldItem/HelloWorldItemEditorNotebook.tsx`
- Contains session management and code injection logic

### Key Code Snippets

#### Creating a Spark Session
```typescript
const sessionRequest: SessionRequest = {
  name: `HelloWorld-Session-${Date.now()}`,
  kind: 'pyspark',
  conf: {
    'spark.dynamicAllocation.enabled': 'true',
    'spark.dynamicAllocation.minExecutors': '1',
    'spark.dynamicAllocation.maxExecutors': '4'
  }
};

const session = await sparkClient.createSession(
  workspaceId,
  lakehouseId,
  sessionRequest
);
```

#### Executing Code via Livy
```typescript
const statementRequest: StatementRequest = {
  code: generatedCode,
  kind: 'pyspark'
};

const response = await sparkClient.submitStatement(
  workspaceId,
  lakehouseId,
  sessionId,
  statementRequest
);

// Poll for results
const result = await sparkClient.getStatement(
  workspaceId,
  lakehouseId,
  sessionId,
  response.id.toString()
);
```

#### Injecting Code into Notebook
```typescript
await notebookClient.addCells(workspaceId, notebookId, [
  {
    type: 'markdown',
    content: `## Step ${stepIndex + 1}: ${stepDescription}`
  },
  {
    type: 'code',
    content: generatedCode,
    language: 'python'
  }
]);
```

## Testing the Setup

### Step 1: Verify Livy API Access

Test the Livy API endpoint using the browser's developer console:

```javascript
// In Fabric workspace browser console
const workspaceId = "your-workspace-id";
const lakehouseId = "your-lakehouse-id";
const url = `https://api.fabric.microsoft.com/v1/workspaces/${workspaceId}/lakehouses/${lakehouseId}/livyApi/versions/2023-12-01/sessions`;

fetch(url, {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + accessToken // Get from workloadClient
  }
}).then(r => r.json()).then(console.log);
```

### Step 2: Test Session Creation

1. Open HelloWorldItem in Fabric workspace
2. Open browser DevTools (F12)
3. Select a lakehouse from the left panel
4. Check console for session initialization logs:
   ```
   Creating Spark session for lakehouse: {lakehouseId}
   Session created: {sessionId}
   Session state: starting
   Session state: idle (ready)
   ```

### Step 3: Test Code Injection

1. Select a notebook from the left panel
2. Enter a task in the AI assistant
3. Click "Generate Plan"
4. Click "Proceed" to execute first step
5. Verify success notification: "Code Added to Notebook"
6. Click "Open Notebook" to view injected code

## Troubleshooting

### Issue 1: "Session creation failed"

**Symptoms:** Session state stays null or error message displayed

**Solutions:**
1. Verify Lakehouse.Execute.All permission is granted
2. Check workspace has active capacity
3. Verify user is workspace Contributor/Admin
4. Check browser console for detailed error messages

### Issue 2: "Failed to add code to notebook"

**Symptoms:** Error notification when executing AI plan step

**Solutions:**
1. Verify Notebook.ReadWrite.All permission exists
2. Confirm notebook is in the same workspace
3. Check notebook isn't locked/encrypted
4. Verify workload authentication is valid

### Issue 3: "Livy API endpoint not found"

**Symptoms:** 404 errors when calling Livy API

**Solutions:**
1. Verify Livy API is enabled in tenant settings
2. Confirm lakehouse ID is correct
3. Check API version (currently: 2023-12-01)
4. Verify workspace has Premium/Trial capacity

### Issue 4: "Access token expired"

**Symptoms:** 401 Unauthorized errors

**Solutions:**
1. Refresh the Fabric page to get new token
2. Verify Entra app permissions are granted
3. Check token scopes include required permissions

## Monitoring and Debugging

### Fabric Monitoring Hub

View Livy API execution history:
1. Navigate to Fabric workspace
2. Click "Monitoring hub" in left sidebar
3. Filter by "Livy API" activity type
4. Click on sessions to view details:
   - Execution status
   - Spark version
   - Configuration
   - Logs and errors

### Browser Console Logs

Enable detailed logging:
```javascript
// In browser DevTools
localStorage.setItem('WORKLOAD_DEBUG', 'true');
```

Key log messages:
```
[SparkLivyClient] Creating session...
[SparkLivyClient] Session created: {sessionId}
[SparkLivyClient] Submitting statement...
[FabricNotebookClient] Getting notebook definition...
[FabricNotebookClient] Adding cells to notebook...
```

## Advanced Configuration

### Custom Spark Configuration

Modify session creation in `HelloWorldItemEditorNotebook.tsx`:

```typescript
const sessionRequest: SessionRequest = {
  name: `CustomSession-${Date.now()}`,
  kind: 'pyspark',
  conf: {
    'spark.executor.memory': '4g',
    'spark.executor.cores': '2',
    'spark.driver.memory': '2g',
    'spark.sql.shuffle.partitions': '200',
    'spark.dynamicAllocation.enabled': 'true',
    'spark.dynamicAllocation.minExecutors': '2',
    'spark.dynamicAllocation.maxExecutors': '8'
  }
};
```

### Using Fabric Environments

To use a custom Fabric Environment instead of starter pool:

```typescript
const sessionRequest: SessionRequest = {
  name: `EnvSession-${Date.now()}`,
  kind: 'pyspark',
  conf: {
    'spark.fabric.environmentDetails': `{"id": "${environmentId}"}`
  }
};
```

## Security Considerations

### Token Management
- Workload Client handles token refresh automatically
- Tokens are scoped per API request
- Never log or expose access tokens

### Permission Principle
- Grant minimum required permissions
- Use Lakehouse.Execute.All instead of broader permissions
- Regularly audit Entra app permissions

### Data Access
- Livy sessions inherit workspace security context
- Users can only access data they have permissions for
- Lakehouse security is enforced by Fabric

## Related Documentation

- [Fabric Livy API Overview](https://learn.microsoft.com/en-us/fabric/data-engineering/api-livy-overview)
- [Get Started with Livy API](https://learn.microsoft.com/en-us/fabric/data-engineering/get-started-api-livy)
- [Livy Session Jobs](https://learn.microsoft.com/en-us/fabric/data-engineering/get-started-api-livy-session)
- [Apache Livy REST API](https://livy.incubator.apache.org/docs/latest/rest-api.html)
- [Fabric Notebook Definition API](https://learn.microsoft.com/en-us/rest/api/fabric/notebook/items)

## Next Steps

To enable automatic code execution:

1. **Debug Session Initialization**
   - Check browser console for session creation errors
   - Verify Lakehouse.Execute.All permission
   - Test with minimal Spark configuration

2. **Implement Execution in Workflow**
   - Uncomment/enable execution code in `handleProceedToNextStep()`
   - Add result parsing logic
   - Display results in assistant panel

3. **Add Result Visualization**
   - Parse Spark output (text/plain, HTML, JSON)
   - Display DataFrames as tables
   - Show charts for visualizations

4. **Error Handling**
   - Add retry logic for transient failures
   - Improve error messages for users
   - Implement session recovery

## Support

For issues or questions:
- Check Fabric Monitoring Hub for execution details
- Review browser console logs
- Consult Microsoft Learn documentation
- File issues in the workload repository
