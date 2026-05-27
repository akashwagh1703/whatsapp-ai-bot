/** Flow engine types — database-driven workflows */

export type FlowStepType =
  | "message"
  | "buttons"
  | "list"
  | "input"
  | "condition"
  | "api"
  | "end";

export type FlowSessionStatus = "active" | "completed" | "expired" | "cancelled";

export interface FlowButtonOption {
  id: string;
  label: string;
  nextStepId?: string;
}

export interface FlowListOption {
  id: string;
  title: string;
  description?: string;
  nextStepId?: string;
}

export interface FlowConditionRule {
  /** context key or "message" */
  field: string;
  op: "equals" | "contains" | "exists";
  value?: string;
  nextStepId: string;
}

export interface FlowStep {
  id: string;
  type: FlowStepType;
  text?: string;
  buttons?: FlowButtonOption[];
  listOptions?: FlowListOption[];
  /** input step: prompt on first visit */
  prompt?: string;
  /** input step: key in session.context.data */
  collectKey?: string;
  nextStepId?: string;
  defaultNextStepId?: string;
  conditions?: FlowConditionRule[];
  /** api step placeholder for future queue/workers */
  apiUrl?: string;
}

export interface FlowDefinition {
  steps: FlowStep[];
  version?: number;
}

export interface FlowRecord {
  id: string;
  business_id: string;
  slug: string;
  name: string;
  enabled: boolean;
  priority: number;
  triggers: string[];
  definition: FlowDefinition;
  created_at?: string;
  updated_at?: string;
}

export interface FlowSessionRecord {
  id: string;
  business_id: string;
  conversation_id: string;
  contact_id: string;
  flow_id: string;
  current_step_id: string;
  status: FlowSessionStatus;
  context: FlowSessionContext;
  last_interaction_at: string;
}

export interface FlowSessionContext {
  data: Record<string, string>;
  awaiting?: "button" | "input" | "list" | null;
  flowSlug?: string;
}

export interface FlowExecutionResult {
  replyTexts: string[];
  nextStepId: string | null;
  endSession: boolean;
  contextPatch?: Partial<FlowSessionContext>;
  flowId: string;
  flowSlug: string;
  stepId: string;
  stepType: FlowStepType;
}

export type MessageRouteAction =
  | { action: "continue_flow"; session: FlowSessionRecord; flow: FlowRecord }
  | { action: "start_flow"; flow: FlowRecord }
  | { action: "legacy" };
