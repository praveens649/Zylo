import { afterEach, describe, expect, it } from 'vitest';
import { returnBase } from './tv-checkout.service.js';

const saved = { ...process.env };
afterEach(() => {
  process.env = { ...saved };
});

describe('Stripe return URL base', () => {
  it('follows the browser origin on a different localhost port in development', () => {
    process.env.NODE_ENV = 'development';
    process.env.FRONTEND_URL = 'http://localhost:3000';
    expect(returnBase('http://localhost:3001')).toBe('http://localhost:3001');
  });

  it('falls back to the configured URL when there is no usable origin', () => {
    process.env.FRONTEND_URL = 'http://localhost:3000/';
    expect(returnBase(undefined)).toBe('http://localhost:3000');
    expect(returnBase('not a url')).toBe('http://localhost:3000');
  });

  it('never redirects to an unknown host in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.FRONTEND_URL = 'https://tv.zylo.example';
    expect(returnBase('https://evil.example')).toBe('https://tv.zylo.example');
    expect(returnBase('http://localhost:3001')).toBe('https://tv.zylo.example');
    expect(returnBase('https://tv.zylo.example')).toBe('https://tv.zylo.example');
  });
});
