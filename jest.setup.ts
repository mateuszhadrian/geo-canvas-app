import 'jest-canvas-mock'
import '@testing-library/jest-dom'
import { webcrypto } from 'crypto'

if (!globalThis.crypto?.randomUUID) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    writable: false,
  })
}
