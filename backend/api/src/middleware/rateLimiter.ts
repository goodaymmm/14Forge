import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// General API rate limiter
export const rateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    // TODO: Future - log request details for rate limit monitoring
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many requests. Please wait before trying again.',
        statusCode: 429,
        retryAfter: res.getHeader('Retry-After')
      }
    });
  }
});

// Strict rate limiter for Riot API endpoints
export const riotApiLimiter = rateLimit({
  windowMs: 1000, // 1 second
  max: parseInt(process.env.RIOT_RATE_LIMIT_PER_SEC || '20'),
  message: 'Riot API rate limit exceeded',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (_req: Request, res: Response) => {
    // TODO: Future - implement user-specific rate limiting
    res.status(429).json({
      success: false,
      error: {
        message: 'Riot API rate limit exceeded. Please wait.',
        statusCode: 429,
        retryAfter: 1
      }
    });
  }
});

// Rate limiter for BrightData endpoints
export const brightDataLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // More restrictive for expensive operations
  message: 'BrightData rate limit exceeded',
  standardHeaders: true,
  legacyHeaders: false
});