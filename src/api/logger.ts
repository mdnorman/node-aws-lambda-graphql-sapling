import { createBaseDebugLogger } from '../utils/logger';

export const createApiDebugLogger = (name: string) => createBaseDebugLogger(`api:${name}`);
