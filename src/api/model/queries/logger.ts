import { createApiDebugLogger } from '../../logger';

export const createQueryDebugLogger = (name: string) => createApiDebugLogger(`query:${name}`);
