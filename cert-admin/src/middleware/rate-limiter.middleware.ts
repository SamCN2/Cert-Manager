/**
 * Copyright (c) 2025 ogt11.com, llc
 */

import {RequestContext} from '@loopback/rest';

interface RateLimitEntry {
  count: number;
  firstRequest: number;
}

// In-memory store for rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.firstRequest > 5 * 60 * 1000) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export async function rateLimiter(
  context: RequestContext,
  next: () => Promise<void>,
): Promise<void> {
  const {request} = context;
  const ip = request.ip;
  const path = request.path;
  const key = `${ip}:${path}`;
  const now = Date.now();

  // Rate limit configuration: 10 requests per 5 minutes
  const WINDOW_MS = 5 * 60 * 1000; // 5 minutes
  const MAX_REQUESTS = 10;

  let entry = rateLimitStore.get(key);
  if (!entry) {
    entry = { count: 1, firstRequest: now };
    rateLimitStore.set(key, entry);
  } else {
    // Reset count if window has passed
    if (now - entry.firstRequest > WINDOW_MS) {
      entry.count = 1;
      entry.firstRequest = now;
    } else {
      entry.count++;
      if (entry.count > MAX_REQUESTS) {
        const err: any = new Error('Too many requests');
        err.statusCode = 429;
        err.message = `Rate limit exceeded. Try again in ${Math.ceil((WINDOW_MS - (now - entry.firstRequest)) / 1000)} seconds`;
        throw err;
      }
    }
  }

  return next();
} 