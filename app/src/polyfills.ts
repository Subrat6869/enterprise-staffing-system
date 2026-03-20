import { Buffer } from 'buffer';

// Polyfill Buffer for mobile browsers (required for otplib and others)
if (typeof window !== 'undefined') {
  // @ts-expect-error - Some libraries check uppercase Buffer
  window.Buffer = window.Buffer || Buffer;
  // @ts-expect-error - Some libraries check lowercase buffer
  window.buffer = window.buffer || Buffer;
  // @ts-expect-error - Some libraries check global
  window.global = window.global || window;
}
