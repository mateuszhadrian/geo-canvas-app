# Ostatecznie ustalony stack technologiczny — GeoCanvas

Data ustalenia: 2026-04-23  
Ostatnia aktualizacja: 2026-04-29

Ten dokument definiuje finalny stack technologiczny aplikacji GeoCanvas.

## Decyzja architektoniczna: Next.js oraz Supabase

Wybór `Next.js` jest **świadomy** i przygotowuje fundament pod rozbudowę aplikacji o backend. Docelowo backend będzie oparty na **Supabase**, co zapewni autentykację użytkowników oraz relacyjną bazę danych **PostgreSQL** do synchronizacji i przechowywania danych w chmurze (zgodnie z założeniami z PRD).

## Decyzja architektoniczna: Undo/Redo — własny Command Pattern (bez `zundo`)

`zundo` (snapshot-based middleware) został **odrzucony** na rzecz własnego history slice opartego na Command Pattern (`src/store/slices/history.ts`). Powody:

- Snapshoty nie mają semantyki — brak audit trail i OT-readiness dla przyszłej kolaboracji.
- Command Pattern (`HistoryCommand` z `before`/`after`) jest JSON-serializowalny i gotowy na Supabase.
- Implementacja to ~80 linii — zewnętrzna zależność jest zbędna.

Szczegółowa analiza: `.ai/undo-redo-mechanism-analysis.md`

## Aktualny package.json (dependencies)

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
    "tailwindcss": "^4.2.3",
    "@uiw/react-color": "^2.3.0",
    "lucide-react": "^1.11.0"
  },
  "devDependencies": {
    "typescript": "^5.9.0",
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0",
    "@types/node": "^22.0.0",
    "@types/jest": "^29.5.14",
    "@tailwindcss/postcss": "^4.2.3",
    "eslint": "^9.0.0",
    "eslint-config-next": "^16.2.0",
    "prettier": "^3.5.3",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0",
    "jest-canvas-mock": "^2.5.2",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "@testing-library/jest-dom": "^6.6.3",
    "@playwright/test": "^1.52.0"
  },
  "engines": {
    "node": ">=20.9.0"
  }
}
```

## CI/CD i Hosting

- **CI/CD**: GitHub Actions — pipeline obejmuje lint, typecheck, testy jednostkowe (Jest) oraz testy e2e (Playwright).
- **Hosting**: Vercel — deployments automatycznie wyzwalane przez push do `main` (produkcja) i PR (preview).

## Uwagi końcowe

- `react-colorful` zostaje zastąpiony przez `@uiw/react-color` ze względu na lepsze utrzymanie i kompatybilność z React 19.
- `zundo` zostało usunięte — undo/redo zaimplementowane jako własny Command Pattern history slice.
- `@tailwindcss/postcss` jest wymagane przez Tailwind CSS v4 (CSS-first config).
