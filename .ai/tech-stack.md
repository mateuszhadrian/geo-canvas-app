# Ostatecznie ustalony stack technologiczny — GeoCanvas

Data ustalenia: 2026-04-23

Ten dokument definiuje finalny stack technologiczny aplikacji GeoCanvas.

## Decyzja architektoniczna: Next.js

Wybór `Next.js` jest **świadomy** i pozostaje ostateczny, mimo że aplikacja jest SPA bez backendu.  
Celem jest nauka składni i wzorców `Next.js`, które będą potrzebne w kolejnych projektach rozszerzonych o backend.

## Rekomendowany package.json (dependencies)

```json
{
  "dependencies": {
    "next": "^16.2.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "konva": "^10.2.5",
    "react-konva": "^19.2.3",
    "zustand": "^5.0.12",
    "immer": "^10.1.1",
    "zundo": "^2.3.0",
    "tailwindcss": "^4.2.3",
    "@uiw/react-color": "^2.x"
  },
  "devDependencies": {
    "typescript": "^5.9.0",
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0",
    "@types/node": "^22.0.0",
    "jest": "^29.x",
    "jest-environment-jsdom": "^29.x",
    "jest-canvas-mock": "^2.x",
    "@testing-library/react": "^16.x",
    "@testing-library/user-event": "^14.x",
    "@testing-library/jest-dom": "^6.x",
    "@playwright/test": "^1.x"
  },
  "engines": {
    "node": ">=20.9.0"
  }
}
```

## Uwagi końcowe

- `react-colorful` zostaje zastąpiony przez `@uiw/react-color` ze względu na lepsze utrzymanie i kompatybilność z React 19.
- Stack jest traktowany jako finalny punkt startowy dla realizacji MVP.
