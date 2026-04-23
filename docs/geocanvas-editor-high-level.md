# GeoCanvas Editor — Wysokopoziomowy opis aplikacji

## Cel projektu

GeoCanvas Editor to minimalistyczny, geometryczny edytor kształtów działający w przeglądarce, zbudowany jako projekt ćwiczeniowy z wykorzystaniem **Konva.js**, **React** i **Next.js**. Projekt ma służyć jako nauka pracy z canvas API przez bibliotekę react-konva, a po rozbudowie — jako pozycja portfolio prezentująca umiejętności budowania interaktywnych aplikacji graficznych.

Stylistycznie aplikacja nawiązuje do narzędzi takich jak **tldraw** i **Excalidraw** — czysty, geometryczny, minimalistyczny interfejs.

---

## Stack technologiczny

- **Framework:** Next.js (App Router)
- **UI:** React
- **Canvas:** Konva.js + react-konva
- **Język:** TypeScript
- **Stylowanie:** TailwindCSS (prosty, funkcjonalny layout)

---

## Główne założenia funkcjonalne

### Tworzenie i edycja kształtów
- Użytkownik wybiera narzędzie z paska (prostokąt, koło/elipsa, trójkąt, linia)
- Po wybraniu narzędzia kształt pojawia się na scenie i można nim natychmiast manipulować
- Każdy kształt obsługuje: zmianę rozmiaru, proporcji, obrót, przeciąganie
- Prostokąt obsługuje zaokrąglanie rogów (cornerRadius)
- Koło można przekształcić w elipsę (niezależna zmiana osi X i Y)

### Nawigacja po scenie
- Zoom sceny (scroll kółkiem myszy lub pinch na touchpadzie)
- Pan sceny (przeciąganie tła / środkowy przycisk myszy)
- Scena stabilnie dopasowuje się do rozmiaru okna przeglądarki (ResizeObserver) — canvas nie "rozpada się" przy resize

### Zaznaczanie i organizacja
- Zaznaczanie pojedynczego kształtu kliknięciem
- Zaznaczanie wielu kształtów (marquee selection lub Shift+klik)
- Grupowanie zaznaczonych kształtów i rozgrupowywanie
- Zarządzanie kolejnością warstw (bring to front / send to back)
- Usuwanie i kopiowanie kształtów

### Trwałość danych
- Serializacja całej sceny do formatu JSON
- Zapis stanu do `localStorage` (autosave)
- Eksport sceny do pliku `.json`
- Wczytanie sceny z pliku `.json`

---

## Planowane rozszerzenia (poza MVP)

| Funkcja | Opis |
|---|---|
| Eksport do PNG/JPG | Wykorzystanie `stage.toDataURL()` z Konva.js |
| Historia zmian | Cofanie/ponawianie akcji (Ctrl+Z / Ctrl+Y) przez stos stanów |
| Symulowany obrót 2.5D | Efekt perspektywicznego obrotu kształtu wokół osi Z (co 45°, realizowany przez transformację `scaleY`) — nie prawdziwe 3D, ale wizualnie satysfakcjonujący efekt |
| Połączenia między kształtami | Linie/strzałki łączące kształty (jak w diagramach) |
| Mind map / diagram mode | Węzły z etykietami połączone relacjami |

---

## Layout aplikacji

```
┌─────────────────────────────────────────────────┐
│  Toolbar (góra lub bok) — narzędzia i akcje     │
├─────────────────────────────────────────────────┤
│                                                 │
│              CANVAS (Konva Stage)               │
│         (zajmuje pozostałą przestrzeń,          │
│          responsywny względem okna)             │
│                                                 │
└─────────────────────────────────────────────────┘
```

- Toolbar jest statyczny — nie musi być responsywny
- Canvas dynamicznie dopasowuje wymiary do dostępnej przestrzeni
- Panel właściwości zaznaczonego kształtu (opcjonalnie: prawy sidebar lub tooltip inline)

---

## Kluczowe koncepty Konva.js do opanowania

1. `Stage` i `Layer` — struktura sceny
2. Podstawowe kształty: `Rect`, `Circle`, `Ellipse`, `Line`, `RegularPolygon`
3. `Transformer` — interaktywny resize i rotate
4. `draggable` — przeciąganie elementów
5. Zoom i pan przez `stage.scale()` i `stage.position()`
6. `stage.on()` — obsługa eventów myszy i klawiatury
7. `node.toJSON()` / `Konva.Node.create()` — serializacja i deserializacja sceny
8. `stage.toDataURL()` — eksport do obrazu
9. `useEffect` + `ResizeObserver` — stabilność przy zmianie rozmiaru okna

---

## Cel portfolio

Po zrealizowaniu MVP i kluczowych rozszerzeń projekt ma prezentować:
- Umiejętność pracy z interaktywnym canvas API w środowisku React/Next.js
- Dbałość o UX (płynna nawigacja, stabilność UI)
- Architekturę opartą na stanie (serializowalny stan sceny → JSON)
- Estetyczne, profesjonalne wykonanie UI
