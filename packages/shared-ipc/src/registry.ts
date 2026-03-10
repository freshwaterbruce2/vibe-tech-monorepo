import * as schemas from './schemas.js';

/**
 * IPC Schema Registry
 * Centralized access to all IPC message schemas for validation and documentation.
 */
export const IPCSchemaRegistry = {
  // Base
  base: schemas.baseMessageSchema,
  source: schemas.appSourceSchema,

  // Payloads
  payloads: {
    openFile: schemas.openFilePayloadSchema,
    openProject: schemas.openProjectPayloadSchema,
    gitStatus: schemas.gitStatusPayloadSchema,
    learningEvent: schemas.learningEventPayloadSchema,
    error: schemas.errorPayloadSchema,
    taskStarted: schemas.taskStartedPayloadSchema,
    taskStopped: schemas.taskStoppedPayloadSchema,
    taskProgress: schemas.taskProgressPayloadSchema,
    taskActivity: schemas.taskActivityPayloadSchema,
    taskInsights: schemas.taskInsightsPayloadSchema,
    contextUpdate: schemas.contextUpdatePayloadSchema,
    fileChanged: schemas.fileChangedPayloadSchema,
  },

  // Full Messages (if defined in schemas.ts)
  // Note: Full messages are often intersections of base + payload
};

/**
 * Helper to get schema by message type
 */
export function getSchemaForType(type: schemas.IPCMessageType) {
  switch (type) {
    case schemas.IPCMessageType.FILE_OPEN:
      return schemas.openFilePayloadSchema;
    case schemas.IPCMessageType.PROJECT_OPEN:
      return schemas.openProjectPayloadSchema;
    case schemas.IPCMessageType.LEARNING_EVENT:
      return schemas.learningEventPayloadSchema;
    case schemas.IPCMessageType.ERROR:
      return schemas.errorPayloadSchema;
    case schemas.IPCMessageType.TASK_STARTED:
      return schemas.taskStartedPayloadSchema;
    case schemas.IPCMessageType.TASK_STOPPED:
      return schemas.taskStoppedPayloadSchema;
    case schemas.IPCMessageType.TASK_PROGRESS:
      return schemas.taskProgressPayloadSchema;
    case schemas.IPCMessageType.TASK_ACTIVITY:
      return schemas.taskActivityPayloadSchema;
    case schemas.IPCMessageType.TASK_INSIGHTS:
      return schemas.taskInsightsPayloadSchema;
    case schemas.IPCMessageType.CONTEXT_UPDATE:
      return schemas.contextUpdatePayloadSchema;
    case schemas.IPCMessageType.FILE_CHANGED:
      return schemas.fileChangedPayloadSchema;
    default:
      return null;
  }
}
