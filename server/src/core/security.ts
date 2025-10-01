import type { Request, Response, NextFunction } from 'express';
import type { Logger } from './types';

export type ApiKeyMiddlewareOptions = {
    headerName?: string;
    queryParamName?: string;
    allowedPaths?: RegExp[];
    apiKey?: string;
    logger: Logger;
};

export function createApiKeyMiddleware(options: ApiKeyMiddlewareOptions) {
    const {
        headerName = 'x-api-key',
        queryParamName = 'api_key',
        allowedPaths = [],
        apiKey,
        logger
    } = options;

    if (!apiKey) {
        logger.info('API key middleware disabled (no API_KEY provided)');
        return (_req: Request, _res: Response, next: NextFunction) => next();
    }

    const header = headerName.toLowerCase();

    return (req: Request, res: Response, next: NextFunction) => {
        if (req.method === 'OPTIONS') {
            return next();
        }

        const requestPath = req.path;

        if (allowedPaths.some((pattern) => pattern.test(requestPath))) {
            return next();
        }

        const headerValue = req.header(headerName) ?? req.headers[header];
        const queryValue = req.query[queryParamName];
        const providedKey = Array.isArray(queryValue)
            ? queryValue[0]
            : (queryValue as string | undefined) ?? (headerValue as string | undefined);

        if (providedKey && providedKey === apiKey) {
            return next();
        }

        logger.warn('API key authentication failed', {
            path: requestPath,
            method: req.method,
            hasHeader: !!headerValue,
            hasQuery: !!queryValue
        });

        return res.status(401).json({ error: 'Unauthorized' });
    };
}

