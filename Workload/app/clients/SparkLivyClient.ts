import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { FabricPlatformClient } from "./FabricPlatformClient";
import { SCOPE_PAIRS } from "./FabricPlatformScopes";
import { BatchRequest, BatchResponse, BatchState, SessionRequest, SessionResponse, StatementRequest, StatementResponse } from "./FabricPlatformTypes";

// Livy API version
const LIVY_API_VERSION = "2024-07-30";

/**
 * API wrapper for Spark Livy operations in Fabric
 * Provides methods for managing Spark batch jobs and interactive sessions
 * 
 * Based on the official Fabric REST API:
 * https://learn.microsoft.com/en-us/rest/api/fabric/spark/spark-livy
 * 
 * Uses method-based scope selection:
 * - GET operations use read-only scopes
 * - POST/PUT/PATCH/DELETE operations use read-write scopes
 */
export class SparkLivyClient extends FabricPlatformClient {
  
  constructor(workloadClient: WorkloadClientAPI) {
    // Use scope pairs for method-based scope selection
    super(workloadClient, SCOPE_PAIRS.SPARK_LIVY);
  }

  // ============================
  // Batch Job Management
  // ============================

  /**
   * Create a new batch job in a Fabric lakehouse
   * @param workspaceId The workspace ID
   * @param lakehouseId The lakehouse ID
   * @param batchRequest The batch request parameters
   * @returns A promise resolving to the batch response
   */
  async createBatch(
    workspaceId: string,
    lakehouseId: string,
    batchRequest: BatchRequest
  ): Promise<BatchResponse> {
    try {
      const endpoint = `/workspaces/${workspaceId}/lakehouses/${lakehouseId}/livyApi/versions/${LIVY_API_VERSION}/batches`;
      return this.post<BatchResponse>(endpoint, batchRequest);
    } catch (error: any) {
      console.error(`Error creating batch job: ${error.message}`);
      throw error;
    }
  }

  /**
   * List all batch jobs in a Fabric lakehouse
   * @param workspaceId The workspace ID
   * @param lakehouseId The lakehouse ID
   * @returns A promise resolving to an array of batch responses
   */
  async listBatches(
    workspaceId: string,
    lakehouseId: string
  ): Promise<BatchResponse[]> {
    try {
      const endpoint = `/workspaces/${workspaceId}/lakehouses/${lakehouseId}/livyApi/versions/${LIVY_API_VERSION}/batches`;
      return this.get<BatchResponse[]>(endpoint);
    } catch (error: any) {
      console.error(`Error listing batch jobs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get a specific batch job by ID
   * @param workspaceId The workspace ID
   * @param lakehouseId The lakehouse ID
   * @param batchId The batch job ID
   * @returns A promise resolving to the batch response
   */
  async getBatch(
    workspaceId: string,
    lakehouseId: string,
    batchId: string
  ): Promise<BatchResponse> {
    try {
      const endpoint = `/workspaces/${workspaceId}/lakehouses/${lakehouseId}/livyApi/versions/${LIVY_API_VERSION}/batches/${batchId}`;
      return this.get<BatchResponse>(endpoint);
    } catch (error: any) {
      console.error(`Error getting batch job ${batchId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a specific batch job by ID
   * @param workspaceId The workspace ID
   * @param lakehouseId The lakehouse ID
   * @param batchId The batch job ID
   * @returns A promise resolving when the batch job is deleted
   */
  async deleteBatch(
    workspaceId: string,
    lakehouseId: string,
    batchId: string
  ): Promise<void> {
    try {
      const endpoint = `/workspaces/${workspaceId}/lakehouses/${lakehouseId}/livyApi/versions/${LIVY_API_VERSION}/batches/${batchId}`;
      await this.delete<void>(endpoint);
    } catch (error: any) {
      console.error(`Error deleting batch job ${batchId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cancel a specific batch job by ID
   * @param workspaceId The workspace ID
   * @param lakehouseId The lakehouse ID
   * @param batchId The batch job ID
   * @returns A promise resolving to the batch response
   */
  async cancelBatch(
    workspaceId: string,
    lakehouseId: string,
    batchId: string
  ): Promise<BatchResponse> {
    try {
      const endpoint = `/workspaces/${workspaceId}/lakehouses/${lakehouseId}/livyApi/versions/${LIVY_API_VERSION}/batches/${batchId}/state`;
      return this.delete<BatchResponse>(endpoint);
    } catch (error: any) {
      console.error(`Error cancelling batch job ${batchId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get the logs for a specific batch job
   * @param workspaceId The workspace ID
   * @param lakehouseId The lakehouse ID
   * @param batchId The batch job ID
   * @param from Optional starting line for logs
   * @param size Optional number of lines to retrieve
   * @returns A promise resolving to an object containing log lines
   */
  async getBatchLogs(
    workspaceId: string,
    lakehouseId: string,
    batchId: string,
    from?: number,
    size?: number
  ): Promise<{ id: string, log: string[] }> {
    try {
      let endpoint = `/workspaces/${workspaceId}/lakehouses/${lakehouseId}/livyApi/versions/${LIVY_API_VERSION}/batches/${batchId}/log`;
      
      // Add optional query parameters if provided
      const params = new URLSearchParams();
      if (from !== undefined) params.append("from", from.toString());
      if (size !== undefined) params.append("size", size.toString());
      
      if (params.toString()) {
        endpoint += `?${params.toString()}`;
      }
      
      return this.get<{ id: string, log: string[] }>(endpoint);
    } catch (error: any) {
      console.error(`Error getting logs for batch job ${batchId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get the state of a specific batch job
   * @param workspaceId The workspace ID
   * @param lakehouseId The lakehouse ID
   * @param batchId The batch job ID
   * @returns A promise resolving to the batch state
   */
  async getBatchState(
    workspaceId: string,
    lakehouseId: string,
    batchId: string
  ): Promise<{ id: string, state: BatchState }> {
    try {
      const endpoint = `/workspaces/${workspaceId}/lakehouses/${lakehouseId}/livyApi/versions/${LIVY_API_VERSION}/batches/${batchId}/state`;
      return this.get<{ id: string, state: BatchState }>(endpoint);
    } catch (error: any) {
      console.error(`Error getting state for batch job ${batchId}: ${error.message}`);
      throw error;
    }
  }

  // ============================
  // Session Management
  // ============================

  /**
   * Create a new Livy session
   * Note: Fabric Livy API uses async pattern - POST returns operationId, 
   * then we need to list sessions to find the created session
   * @param workspaceId The workspace ID
   * @param lakehouseId The lakehouse ID
   * @param sessionRequest The session request parameters
   * @returns A promise resolving to the session response with id
   */
  async createSession(
    workspaceId: string,
    lakehouseId: string,
    sessionRequest: SessionRequest
  ): Promise<SessionResponse> {
    try {
      const endpoint = `/workspaces/${workspaceId}/lakehouses/${lakehouseId}/livyApi/versions/${LIVY_API_VERSION}/sessions`;
      // console.log(`[SparkLivyClient] Creating session at endpoint: ${endpoint}`);
      // console.log(`[SparkLivyClient] Request body:`, JSON.stringify(sessionRequest, null, 2));
      
      const response = await this.post<any>(endpoint, sessionRequest);
      // console.log(`[SparkLivyClient] Session creation raw response:`, JSON.stringify(response, null, 2));
      // console.log(`[SparkLivyClient] Response keys:`, Object.keys(response || {}));
      
      // If we get a direct session ID, return it
      if (response.id) {
        // console.log(`[SparkLivyClient] Got direct session ID: ${response.id}`);
        return response as SessionResponse;
      }
      
      // If we get an operationId, we need to poll for the session
      if (response.operationId) {
        // console.log(`[SparkLivyClient] Got operationId: ${response.operationId}, polling for session...`);
        
        // Poll for the session to appear in the sessions list
        const maxAttempts = 60; // 2 minutes max
        const pollInterval = 2000; // 2 seconds
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          // console.log(`[SparkLivyClient] Polling attempt ${attempt}/${maxAttempts}...`);
          await this.sleep(pollInterval);
          
          try {
            const sessions = await this.listSessions(workspaceId, lakehouseId);
            // console.log(`[SparkLivyClient] Found ${sessions.length} sessions`);
            
            if (sessions.length > 0) {
              // Log all sessions for debugging
              // sessions.forEach((s: any, i: number) => {
              //   console.log(`[SparkLivyClient] Session ${i}: id=${s.id}, livyState=${s.livyState}, state=${s.state}`);
              // });
              
              // Look for a session that's in an active state
              const activeSession = sessions.find((s: any) => {
                const state = (s.livyState || s.state || '').toLowerCase();
                return state === 'starting' || state === 'idle' || state === 'busy' || state === 'not_started';
              });
              
              if (activeSession && activeSession.id) {
                // console.log(`[SparkLivyClient] Found active session: ${activeSession.id} (livyState: ${(activeSession as any).livyState})`);
                return activeSession;
              }
              
              // If no active session found but we have sessions, return the first one with an ID
              const sessionWithId = sessions.find((s: any) => s.id);
              if (sessionWithId) {
                // console.log(`[SparkLivyClient] Found session with ID: ${sessionWithId.id} (livyState: ${(sessionWithId as any).livyState})`);
                return sessionWithId;
              }
            }
          } catch (listError) {
            // console.warn(`[SparkLivyClient] Error listing sessions during poll:`, listError);
          }
        }
        
        throw new Error(`Session creation timed out after ${maxAttempts * pollInterval / 1000} seconds`);
      }
      
      throw new Error('No session ID or operationId returned from Livy');
    } catch (error: any) {
      console.error(`[SparkLivyClient] Error creating session:`, error);
      throw error;
    }
  }

  /**
   * Helper to sleep for a given duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * List all Livy sessions
   * @param workspaceId The workspace ID
   * @param lakehouseId The lakehouse ID
   * @returns A promise resolving to an array of session responses
   */
  async listSessions(
    workspaceId: string,
    lakehouseId: string
  ): Promise<SessionResponse[]> {
    try {
      const endpoint = `/workspaces/${workspaceId}/lakehouses/${lakehouseId}/livyApi/versions/${LIVY_API_VERSION}/sessions`;
      const response = await this.get<any>(endpoint);
      // console.log(`[SparkLivyClient] listSessions raw response:`, JSON.stringify(response, null, 2));
      
      // Handle various response formats
      if (Array.isArray(response)) {
        return response;
      }
      if (response.value && Array.isArray(response.value)) {
        return response.value;
      }
      if (response.sessions && Array.isArray(response.sessions)) {
        return response.sessions;
      }
      if (response.id) {
        return [response];
      }
      // console.warn(`[SparkLivyClient] Unexpected listSessions response format`);
      return [];
    } catch (error: any) {
      // console.error(`Error listing sessions: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get a specific session by ID
   * @param workspaceId The workspace ID
   * @param lakehouseId The lakehouse ID
   * @param sessionId The session ID
   * @returns A promise resolving to the session response
   */
  async getSession(
    workspaceId: string,
    lakehouseId: string,
    sessionId: string
  ): Promise<SessionResponse> {
    try {
      const endpoint = `/workspaces/${workspaceId}/lakehouses/${lakehouseId}/livyApi/versions/${LIVY_API_VERSION}/sessions/${sessionId}`;
      return this.get<SessionResponse>(endpoint);
    } catch (error: any) {
      console.error(`Error getting session ${sessionId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a specific session by ID
   * @param workspaceId The workspace ID
   * @param lakehouseId The lakehouse ID
   * @param sessionId The session ID
   * @returns A promise resolving when the session is deleted
   */
  async deleteSession(
    workspaceId: string,
    lakehouseId: string,
    sessionId: string
  ): Promise<void> {
    try {
      const endpoint = `/workspaces/${workspaceId}/lakehouses/${lakehouseId}/livyApi/versions/${LIVY_API_VERSION}/sessions/${sessionId}`;
      await this.delete<void>(endpoint);
    } catch (error: any) {
      console.error(`Error deleting session ${sessionId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cancel a session by ID
   * @param workspaceId The workspace ID
   * @param lakehouseId The lakehouse ID
   * @param sessionId The session ID
   * @returns A promise resolving to the session response
   */
  async cancelSession(
    workspaceId: string,
    lakehouseId: string,
    sessionId: string
  ): Promise<SessionResponse> {
    try {
      const endpoint = `/workspaces/${workspaceId}/lakehouses/${lakehouseId}/livyApi/versions/${LIVY_API_VERSION}/sessions/${sessionId}/state`;
      return this.delete<SessionResponse>(endpoint);
    } catch (error: any) {
      console.error(`Error cancelling session ${sessionId}: ${error.message}`);
      throw error;
    }
  }

  // ============================
  // Statement Management
  // ============================

  /**
   * Submit a statement to a specific session
   * @param workspaceId The workspace ID
   * @param lakehouseId The lakehouse ID
   * @param sessionId The session ID
   * @param statementRequest The statement request containing code to execute
   * @returns A promise resolving to the statement response
   */
  async submitStatement(
    workspaceId: string,
    lakehouseId: string,
    sessionId: string,
    statementRequest: StatementRequest
  ): Promise<StatementResponse> {
    try {
      const endpoint = `/workspaces/${workspaceId}/lakehouses/${lakehouseId}/livyApi/versions/${LIVY_API_VERSION}/sessions/${sessionId}/statements`;
      // console.log(`[SparkLivyClient] Submitting statement to: ${endpoint}`);
      // console.log(`[SparkLivyClient] Statement request:`, JSON.stringify(statementRequest, null, 2));
      const response = await this.post<StatementResponse>(endpoint, statementRequest);
      // console.log(`[SparkLivyClient] Statement response:`, JSON.stringify(response, null, 2));
      return response;
    } catch (error: any) {
      // console.error(`Error submitting statement to session ${sessionId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get a specific statement by ID within a session
   * @param workspaceId The workspace ID
   * @param lakehouseId The lakehouse ID
   * @param sessionId The session ID
   * @param statementId The statement ID
   * @returns A promise resolving to the statement response
   */
  async getStatement(
    workspaceId: string,
    lakehouseId: string,
    sessionId: string,
    statementId: string
  ): Promise<StatementResponse> {
    try {
      const endpoint = `/workspaces/${workspaceId}/lakehouses/${lakehouseId}/livyApi/versions/${LIVY_API_VERSION}/sessions/${sessionId}/statements/${statementId}`;
      return this.get<StatementResponse>(endpoint);
    } catch (error: any) {
      console.error(`Error getting statement ${statementId} in session ${sessionId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * List all statements in a specific session
   * @param workspaceId The workspace ID
   * @param lakehouseId The lakehouse ID
   * @param sessionId The session ID
   * @returns A promise resolving to an array of statement responses
   */
  async listStatements(
    workspaceId: string,
    lakehouseId: string,
    sessionId: string
  ): Promise<StatementResponse[]> {
    try {
      const endpoint = `/workspaces/${workspaceId}/lakehouses/${lakehouseId}/livyApi/versions/${LIVY_API_VERSION}/sessions/${sessionId}/statements`;
      return this.get<StatementResponse[]>(endpoint);
    } catch (error: any) {
      console.error(`Error listing statements in session ${sessionId}: ${error.message}`);
      throw error;
    }
  }
}
