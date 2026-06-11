export function getCache<T = unknown>(key: string): T | undefined;
export function setCache<T = unknown>(key: string, data: T, ttlSec?: number): void;
