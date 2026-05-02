const nextJest = require('next/jest')
const createJestConfig = nextJest({ dir: './' })

module.exports = createJestConfig({
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['<rootDir>/tests/unit/**/*.test.ts', '<rootDir>/tests/unit/**/*.test.tsx'],
  passWithNoTests: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/app/layout.tsx',
    // Konva rendering components — tested via E2E (test plan fazy 2-3), nie unit-testowalne w jsdom
    '!src/components/canvas/CanvasApp.tsx',
    '!src/components/canvas/CanvasAppClient.tsx',
    '!src/components/canvas/GridBackground.tsx',
    '!src/components/canvas/SelectionMarquee.tsx',
    '!src/components/canvas/ShapeHandles.tsx',
    '!src/components/canvas/MultiShapeHandles.tsx',
    '!src/components/canvas/MultiLineHandles.tsx',
    '!src/components/canvas/ShapeNode.tsx',
    '!src/components/canvas/AnchorPoints.tsx',
    // Shape Renderer komponenty — Konva, testowane przez E2E
    '!src/shapes/*/Renderer.tsx',
    // Re-eksporty (index.ts per shape) — brak logiki wykonywalnej
    '!src/shapes/*/index.ts',
    '!src/shapes/index.ts',
  ],
  coverageThreshold: {
    global: {
      statements: 60,
      branches: 48,
      functions: 60,
      lines: 60,
    },
    './src/lib/': {
      statements: 85,
      branches: 80,
      functions: 85,
      lines: 85,
    },
    './src/store/': {
      statements: 80,
      branches: 65,
      functions: 75,
      lines: 80,
    },
  },
})
