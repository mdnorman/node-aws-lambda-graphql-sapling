import { createApiDebugLogger } from '../logger';

export const createMutationDebugLogger = (name: string) => createApiDebugLogger(`mutation:${name}`);
