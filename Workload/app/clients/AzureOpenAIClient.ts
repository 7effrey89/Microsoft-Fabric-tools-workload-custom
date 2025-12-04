/**
 * Azure OpenAI Client for AI Assistant
 * Uses the OpenAI SDK with Azure configuration
 * Provides plan generation and code generation capabilities
 * 
 * Note: Requires Azure OpenAI credentials to be configured in environment variables
 * For setup instructions, see ASSISTANT_SETUP.md
 */

import OpenAI from 'openai';

export interface AssistantPlan {
  goal: string;
  steps: AssistantStep[];
  currentStepIndex: number;
}

export interface AssistantStep {
  id: string;
  description: string;
  code?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string;
  error?: string;
  expectedOutcome?: string;  // What we expect from this step
}

export interface StepReviewResult {
  success: boolean;
  analysis: string;
  needsRevision: boolean;
  revisedSteps?: AssistantStep[];  // Updated remaining steps if revision needed
  correctionCode?: string;  // Code to fix an error
  shouldRetry: boolean;
}

export interface AzureOpenAIConfig {
  endpoint: string;
  apiKey: string;
  deploymentName: string;
  apiVersion?: string;
}

// Available models in Azure OpenAI deployments
export const AVAILABLE_MODELS = [
  { id: 'gpt-4.1', name: 'GPT-4.1' },
  { id: 'gpt-5-chat', name: 'GPT-5 Chat' },
  { id: 'gpt-5.1-chat', name: 'GPT-5.1 Chat' },
  { id: 'gpt-5.1-codex-mini', name: 'GPT-5.1 Codex Mini' },
  { id: 'DeepSeek-V3.1', name: 'DeepSeek V3.1' },
  { id: 'model-router', name: 'Model Router' },
] as const;

export type ModelId = typeof AVAILABLE_MODELS[number]['id'];

export const DEFAULT_MODEL: ModelId = 'gpt-4.1';

/**
 * Azure OpenAI Client for generating plans and code
 * Uses the OpenAI SDK with Azure configuration
 */
export class AzureOpenAIClient {
  private config: AzureOpenAIConfig;
  private client: OpenAI | null = null;

  constructor(config?: AzureOpenAIConfig) {
    // Use provided config or fall back to environment variables
    this.config = config || {
      endpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
      apiKey: process.env.AZURE_OPENAI_API_KEY || '',
      deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o',
      apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview'
    };

    // Initialize OpenAI client if credentials are available
    if (this.config.endpoint && this.config.apiKey) {
      // For Azure OpenAI with OpenAI SDK, use the /openai/v1 endpoint
      const baseUrl = `${this.config.endpoint.replace(/\/$/, '')}/openai/v1`;
      
      this.client = new OpenAI({
        baseURL: baseUrl,
        apiKey: this.config.apiKey,
        dangerouslyAllowBrowser: true, // Required for browser usage
      });
      console.log('Azure OpenAI client initialized with base URL:', baseUrl);
    } else if (process.env.NODE_ENV === 'development') {
      console.warn('Azure OpenAI credentials not configured. Using mock responses. See ASSISTANT_SETUP.md for configuration.');
    }
  }

  /**
   * Generate a plan for a given task
   * Breaks down the task into executable steps
   */
  async generatePlan(task: string, context?: string, agentInstructions?: string, model?: ModelId): Promise<AssistantPlan> {
    // If credentials not configured, return mock plan for demo purposes
    if (!this.client) {
      return this.getMockPlan(task);
    }

    try {
      const prompt = this.buildPlanPrompt(task, context);
      const response = await this.callAzureOpenAI(prompt, agentInstructions, model);
      return this.parsePlanResponse(response, task);
    } catch (error) {
      console.error('Error generating plan:', error);
      // Fall back to mock plan on error
      return this.getMockPlan(task);
    }
  }

  /**
   * Generate code for a specific step in the plan
   */
  async generateCode(step: AssistantStep, context?: string, agentInstructions?: string, model?: ModelId): Promise<string> {
    // If credentials not configured, return mock code
    if (!this.client) {
      return this.getMockCode(step);
    }

    try {
      const prompt = this.buildCodePrompt(step, context);
      const response = await this.callAzureOpenAI(prompt, agentInstructions, model);
      return this.parseCodeResponse(response);
    } catch (error) {
      console.error('Error generating code:', error);
      // Fall back to mock code on error
      return this.getMockCode(step);
    }
  }

  /**
   * Review execution result and revise the plan if needed
   * This is the key method for adaptive execution
   */
  async reviewAndRevise(
    plan: AssistantPlan,
    executedStep: AssistantStep,
    output: string,
    wasError: boolean,
    agentInstructions?: string,
    model?: ModelId
  ): Promise<StepReviewResult> {
    // If credentials not configured, return mock review
    if (!this.client) {
      return this.getMockReview(wasError, output);
    }

    try {
      const prompt = this.buildReviewPrompt(plan, executedStep, output, wasError);
      const response = await this.callAzureOpenAI(prompt, agentInstructions, model);
      return this.parseReviewResponse(response, plan);
    } catch (error) {
      console.error('Error reviewing result:', error);
      return this.getMockReview(wasError, output);
    }
  }

  /**
   * Evaluate the result of a step execution
   */
  async evaluateResult(step: AssistantStep, output: string, model?: ModelId): Promise<{
    success: boolean;
    feedback: string;
    shouldRetry: boolean;
  }> {
    // If credentials not configured, return mock evaluation
    if (!this.client) {
      return {
        success: true,
        feedback: 'Step completed successfully (mock evaluation)',
        shouldRetry: false
      };
    }

    try {
      const prompt = this.buildEvaluationPrompt(step, output);
      const response = await this.callAzureOpenAI(prompt, undefined, model);
      return this.parseEvaluationResponse(response);
    } catch (error) {
      console.error('Error evaluating result:', error);
      return {
        success: false,
        feedback: 'Error evaluating result',
        shouldRetry: false
      };
    }
  }

  /**
   * Call Azure OpenAI API using the OpenAI SDK
   */
  private async callAzureOpenAI(prompt: string, customInstructions?: string, model?: ModelId): Promise<string> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    // Use provided model or fall back to default deployment
    // IMPORTANT: For Azure OpenAI, this must match the deployment name exactly
    const modelToUse = model || this.config.deploymentName;
    
    console.log(`Calling Azure OpenAI with deployment/model: ${modelToUse}`);

    // Build system message with optional custom instructions
    let systemMessage = 'You are an AI assistant that helps users write PySpark code for data analysis tasks in Microsoft Fabric notebooks.';
    if (customInstructions) {
      systemMessage += `\n\nAdditional Instructions:\n${customInstructions}`;
    }

    // Determine if this is a newer model that uses max_completion_tokens
    const isNewerModel = modelToUse.includes('gpt-5') || modelToUse.includes('o1') || modelToUse.includes('o3') || modelToUse.includes('o4');
    
    const response = await this.client.chat.completions.create({
      model: modelToUse,
      messages: [
        {
          role: 'system',
          content: systemMessage
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: isNewerModel ? undefined : 0.7, // Some newer models don't support temperature
      ...(isNewerModel ? { max_completion_tokens: 2000 } : { max_tokens: 2000 })
    });

    return response.choices[0]?.message?.content || '';
  }

  /**
   * Build prompt for plan generation
   */
  private buildPlanPrompt(task: string, context?: string): string {
    return `Given the following task, create a detailed step-by-step plan to accomplish it using PySpark in a Microsoft Fabric notebook.

Task: ${task}
${context ? `Context: ${context}` : ''}

Please provide a plan with 3-5 steps. For each step:
1. Provide a clear description of what needs to be done
2. The steps should be executable with PySpark code

Format your response as JSON with this structure:
{
  "steps": [
    {
      "description": "Step description"
    }
  ]
}`;
  }

  /**
   * Build prompt for code generation
   */
  private buildCodePrompt(step: AssistantStep, context?: string): string {
    return `Generate PySpark code for the following step:

Step: ${step.description}
${context ? `Context: ${context}` : ''}

Requirements:
- Write clean, well-commented PySpark code
- Use appropriate Spark DataFrame operations
- Include error handling where appropriate
- Return only the code, no explanations

Code:`;
  }

  /**
   * Build prompt for result evaluation
   */
  private buildEvaluationPrompt(step: AssistantStep, output: string): string {
    return `Evaluate if the following step was completed successfully:

Step: ${step.description}
Code executed: ${step.code || 'N/A'}
Output: ${output}

Respond with JSON:
{
  "success": true/false,
  "feedback": "Brief feedback on the result",
  "shouldRetry": true/false
}`;
  }

  /**
   * Build prompt for reviewing execution results and revising the plan
   */
  private buildReviewPrompt(
    plan: AssistantPlan,
    executedStep: AssistantStep,
    output: string,
    wasError: boolean
  ): string {
    const remainingSteps = plan.steps
      .slice(plan.currentStepIndex + 1)
      .map((s, i) => `${i + 1}. ${s.description}`)
      .join('\n');

    const completedSteps = plan.steps
      .slice(0, plan.currentStepIndex + 1)
      .map((s, i) => `${i + 1}. ${s.description} - ${s.status}${s.result ? ` (Result: ${s.result.substring(0, 200)}...)` : ''}`)
      .join('\n');

    return `You are an AI agent executing a data analysis plan step by step. Review the execution result and decide how to proceed.

GOAL: ${plan.goal}

COMPLETED STEPS:
${completedSteps}

JUST EXECUTED:
Step: ${executedStep.description}
Code: ${executedStep.code || 'N/A'}
${wasError ? 'ERROR OUTPUT' : 'OUTPUT'}: ${output.substring(0, 2000)}${output.length > 2000 ? '...(truncated)' : ''}

REMAINING STEPS:
${remainingSteps || 'None'}

INSTRUCTIONS:
1. Analyze the output - did the step accomplish what was intended?
2. If there was an error, determine if it can be fixed with corrective code
3. Based on the output (e.g., data schema, row counts, column names discovered), decide if the remaining steps need adjustment
4. Consider if additional steps are needed to achieve the goal

Respond with JSON:
{
  "success": ${wasError ? 'false' : 'true or false based on output analysis'},
  "analysis": "Brief analysis of what the output tells us and how it affects the plan",
  "needsRevision": true/false,
  "revisedSteps": [
    {"description": "Step description"}
  ],
  "correctionCode": "If there was an error, provide PySpark code to fix it. Otherwise null",
  "shouldRetry": true/false
}

IMPORTANT:
- If needsRevision is true, provide the COMPLETE list of remaining steps (revised)
- If the output reveals new information (column names, data types, etc.), use that in revised steps
- If correctionCode is provided, it should fix the error and achieve the original step's goal
- Keep the plan focused on the original goal`;
  }

  /**
   * Parse review response from Azure OpenAI
   */
  private parseReviewResponse(response: string, plan: AssistantPlan): StepReviewResult {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      let revisedSteps: AssistantStep[] | undefined;
      if (parsed.needsRevision && parsed.revisedSteps && Array.isArray(parsed.revisedSteps)) {
        revisedSteps = parsed.revisedSteps.map((step: any, index: number) => ({
          id: `step-${plan.currentStepIndex + 1 + index}`,
          description: step.description,
          status: 'pending' as const
        }));
      }

      return {
        success: parsed.success ?? true,
        analysis: parsed.analysis || 'Analysis completed',
        needsRevision: parsed.needsRevision ?? false,
        revisedSteps,
        correctionCode: parsed.correctionCode || undefined,
        shouldRetry: parsed.shouldRetry ?? false
      };
    } catch (error) {
      console.error('Error parsing review response:', error);
      return {
        success: true,
        analysis: 'Unable to parse review response',
        needsRevision: false,
        shouldRetry: false
      };
    }
  }

  /**
   * Get mock review for demo/testing purposes
   */
  private getMockReview(wasError: boolean, output: string): StepReviewResult {
    if (wasError) {
      return {
        success: false,
        analysis: 'An error occurred during execution. The agent will attempt to fix it.',
        needsRevision: false,
        correctionCode: `# Attempting to fix the error
# Original error: ${output.substring(0, 100)}...
try:
    # Retry with error handling
    print("Retrying with additional error handling...")
except Exception as e:
    print(f"Error: {e}")`,
        shouldRetry: true
      };
    }
    
    return {
      success: true,
      analysis: 'Step completed successfully. The output looks as expected.',
      needsRevision: false,
      shouldRetry: false
    };
  }

  /**
   * Parse plan response from Azure OpenAI
   */
  private parsePlanResponse(response: string, task: string): AssistantPlan {
    try {
      // Extract JSON from markdown code blocks if present (e.g., ```json ... ```)
      let jsonString = response;
      const jsonCodeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonCodeBlockMatch) {
        jsonString = jsonCodeBlockMatch[1].trim();
      }
      
      // Also try to extract just the JSON object if there's extra text
      const jsonObjectMatch = jsonString.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) {
        jsonString = jsonObjectMatch[0];
      }
      
      const parsed = JSON.parse(jsonString);
      const steps: AssistantStep[] = parsed.steps.map((step: any, index: number) => ({
        id: `step-${index}`,
        description: step.description,
        status: 'pending' as const
      }));

      return {
        goal: task,
        steps,
        currentStepIndex: 0
      };
    } catch (error) {
      console.error('Error parsing plan response:', error);
      return this.getMockPlan(task);
    }
  }

  /**
   * Parse code response from Azure OpenAI
   */
  private parseCodeResponse(response: string): string {
    // Extract code from markdown code blocks if present
    const codeBlockMatch = response.match(/```(?:python|pyspark)?\n([\s\S]*?)```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }
    return response.trim();
  }

  /**
   * Parse evaluation response from Azure OpenAI
   */
  private parseEvaluationResponse(response: string): {
    success: boolean;
    feedback: string;
    shouldRetry: boolean;
  } {
    try {
      return JSON.parse(response);
    } catch (error) {
      return {
        success: true,
        feedback: response,
        shouldRetry: false
      };
    }
  }

  /**
   * Get mock plan for demo/testing purposes
   */
  private getMockPlan(task: string): AssistantPlan {
    // Generate a simple mock plan based on common data analysis patterns
    const steps: AssistantStep[] = [
      {
        id: 'step-1',
        description: 'Load data from the lakehouse',
        status: 'pending'
      },
      {
        id: 'step-2',
        description: 'Explore and understand the data structure',
        status: 'pending'
      },
      {
        id: 'step-3',
        description: 'Perform data transformation or analysis',
        status: 'pending'
      },
      {
        id: 'step-4',
        description: 'Display or save the results',
        status: 'pending'
      }
    ];

    return {
      goal: task,
      steps,
      currentStepIndex: 0
    };
  }

  /**
   * Get mock code for demo/testing purposes
   */
  private getMockCode(step: AssistantStep): string {
    const stepNum = parseInt(step.id.split('-')[1]);
    
    const mockCodeTemplates = [
      `# Step 1: Load data from lakehouse
from pyspark.sql import SparkSession

# Read data from lakehouse table
df = spark.read.table("your_table_name")
print(f"Loaded {df.count()} rows")
df.show(5)`,
      
      `# Step 2: Explore data structure
# Display schema
df.printSchema()

# Show summary statistics
df.describe().show()

# Check for null values
from pyspark.sql.functions import col, count, when
df.select([count(when(col(c).isNull(), c)).alias(c) for c in df.columns]).show()`,
      
      `# Step 3: Data transformation
from pyspark.sql.functions import col, avg, sum

# Perform aggregation or transformation
result_df = df.groupBy("category_column") \\
    .agg(
        avg("numeric_column").alias("avg_value"),
        sum("numeric_column").alias("total_value")
    ) \\
    .orderBy("avg_value", ascending=False)

result_df.show()`,
      
      `# Step 4: Display and save results
# Display final results
result_df.show(20)

# Optionally save to lakehouse
# result_df.write.mode("overwrite").saveAsTable("result_table")
print("Analysis complete!")`
    ];

    return mockCodeTemplates[stepNum - 1] || `# ${step.description}\n# TODO: Implement this step`;
  }

  /**
   * Check if Azure OpenAI is configured
   */
  isConfigured(): boolean {
    return this.client !== null;
  }

  /**
   * Get the list of available models
   */
  getAvailableModels(): typeof AVAILABLE_MODELS {
    return AVAILABLE_MODELS;
  }
}
