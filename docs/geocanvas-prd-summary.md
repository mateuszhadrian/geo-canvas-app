# GeoCanvas — Podsumowanie planowania PRD

---

## Decyzje

1. **Zakres MVP** podzielony na dwa poziomy:
   - **MVP Core:** tworzenie kształtów (prostokąt, koło/elipsa, trójkąt, linia), drag, resize, rotate, zapis do localStorage, autosave + autoload
   - **MVP Extended:** grupowanie/rozgrupowywanie, zarządzanie warstwami, eksport/import JSON, Undo/Redo, skróty klawiaturowe rozszerzone

2. **Architektura:** wyłącznie SPA bez backendu, brak kont użytkowników — jedyna trwałość danych to localStorage (autosave) oraz eksport/import pliku `.json` na dysk lokalny

3. **Cel projektu:** edukacyjny (nauka Konva.js) + portfolio dla rekruterów — aplikacja musi wyglądać profesjonalnie i działać płynnie

4. **Panel właściwości:** wyłącznie prawy sidebar (tooltip inline odłożony do przyszłej wersji)
   - Właściwości MVP Core: pozycja X/Y, szerokość, wysokość, kolor wypełnienia, kolor obramowania, grubość linii, opacity
   - Właściwości MVP Extended: cornerRadius (prostokąt), obrót w stopniach

5. **Domyślne właściwości narzędzi (sticky per type):**
   - Prostokąt: fill `#4A90D9`, stroke `#2C5F8A`, strokeWidth `2`, opacity `1`
   - Koło/Elipsa: fill `#E8A838`, stroke `#B07820`, strokeWidth `2`, opacity `1`
   - Trójkąt: fill `#5CB85C`, stroke `#3A7A3A`, strokeWidth `2`, opacity `1`
   - Linia: stroke `#333333`, strokeWidth `2`, opacity `1`

6. **Tworzenie kształtu:** klik na narzędzie → kształt pojawia się w centrum widocznego canvasa z domyślnymi właściwościami → natychmiastowa manipulacja

7. **Trójkąt:** zaimplementowany jako `RegularPolygon` z `sides=3` — edycja wierzchołków odłożona do planned extensions

8. **Linia:** prosty odcinek (click-drag), właściwości: kolor, grubość, styl solid/dashed — strzałki i polyline w planned extensions

9. **Model interakcji ze sceną (wzorowany na Excalidraw):**
   - **Kursor/strzałka:** zaznaczanie pojedyncze (klik) i marquee selection (drag na pustym obszarze); po najechaniu na zaznaczony region — kursor zmienia się w kursor przesunięcia
   - **Dłoń:** pan sceny przez przeciąganie
   - Zoom: Ctrl/Cmd + scroll

10. **Obsługa urządzeń dotykowych:**
    - MVP Core: wyłącznie desktop
    - MVP Extended: mobile/touch

11. **Wydajność:** 200 kształtów @ 60fps na przeciętnym laptopie jako kryterium akceptacji

12. **Eksport do PNG/JPG:**
    - Białe tło `#ffffff`
    - Flow eksportu: modal krok 1 → padding (mandatory, jednakowy ze wszystkich stron) → krok 2 → wysokość (edytowalna, domyślna = rzeczywista wysokość sceny w zoom 100% + padding) + szerokość (disabled, automatyczna, proporcjonalna)

13. **Zarządzanie stanem:** Zustand + Immer; Undo/Redo przez bibliotekę `zundo` (middleware temporal), limit 50 kroków historii, pełen zakres (wszystkie mutacje stanu sceny)

14. **Format zapisu JSON:** natywny format Konva (`node.toJSON()`) — celowa decyzja edukacyjna; własna schema z metadanymi rozważana jako kolejny krok

15. **Autosave/autoload:** przy starcie aplikacja automatycznie ładuje ostatni stan z localStorage; przycisk "New Scene" z modalem potwierdzenia

16. **Obsługa błędów localStorage:** toast/snackbar przy nieudanym zapisie; aplikacja działa normalnie w trybie incognito (bez autosave)

17. **Toolbar:** pionowy, po lewej stronie
    - Sekcja narzędzi: kursor, dłoń, prostokąt, koło/elipsa, trójkąt, linia
    - Separator
    - Akcje globalne: New Scene, Export JSON, Import JSON, Export PNG

18. **Multi-select i Transformer:** wspólny bounding box przez Konva Transformer, skalowanie proporcjonalne przez Shift+resize

19. **Skróty klawiaturowe MVP Core:** `Delete/Backspace` (usuń), `Escape` (odznacz), `Ctrl+D` (duplikuj)  
    **MVP Extended:** `Ctrl+Z/Y` (undo/redo), `Ctrl+G` (grupuj), `Ctrl+Shift+G` (rozgrupuj), `[`/`]` (kolejność warstw)

20. **Branding i język:** nazwa "GeoCanvas", favicon SVG geometryczny, meta tagi, cały UI po angielsku

21. **Pusty stan sidebara:** placeholder "Select a shape to edit its properties" + lista kluczowych skrótów klawiaturowych

22. **Kryteria sukcesu portfolio:** (a) aplikacja działa live na Vercel bez błędów konsoli; (b) kod zawiera zaawansowane wzorce (custom hooks, serializacja stanu); (c) README dokumentuje decyzje architektoniczne

---

## Dopasowane rekomendacje

1. Podział na MVP Core i MVP Extended jako dwa osobne kamienie milowe — zapobiega scope creep i wyznacza konkretny punkt "gotowe"
2. Sticky properties per shape type — nowy kształt dziedziczy ostatnio używane właściwości tego samego typu; wpływa na strukturę store'a Zustand
3. Model interakcji Pan vs Marquee: lewy przycisk na pustym obszarze = marquee; dłoń (lub Space+drag) = pan — eliminuje największe ryzyko UX konfliktu gestów
4. Konva Transformer z wspólnym bounding boxem dla multi-select; Shift+resize = skalowanie proporcjonalne
5. `RegularPolygon(sides=3)` dla trójkąta w MVP — świadoma decyzja, edycja wierzchołków jako planned extension
6. Linia jako prosty odcinek z właściwościami: kolor, grubość, solid/dashed — strzałki do planned extensions
7. `react-colorful` jako color picker — lekki, estetyczny, spójny między przeglądarkami
8. Zustand + Immer + `zundo` (temporal middleware) dla Undo/Redo z limitem 50 kroków — decyzja architektoniczna podjęta przed napisaniem logiki sceny
9. Autosave + autoload z localStorage; "New Scene" z modalem potwierdzenia
10. Toast/snackbar przy błędzie zapisu localStorage; normalne działanie w trybie incognito
11. Natywny format Konva JSON jako świadoma decyzja edukacyjna z planowaną własną schemą w kolejnej iteracji
12. Export PNG flow: modal dwukrokowy (padding → wymiary) z białym tłem, wysokość edytowalna, szerokość proporcjonalna i disabled
13. Pionowy toolbar po lewej z separatorem między narzędziami a akcjami globalnymi
14. Placeholder sidebara + lista skrótów klawiaturowych jako onboarding dla rekruterów
15. Favicon SVG, meta tagi, nazwa "GeoCanvas", UI wyłącznie po angielsku

---

## Podsumowanie planowania PRD

### Cel i kontekst projektu

GeoCanvas to minimalistyczny edytor geometrycznych kształtów działający w przeglądarce, zbudowany jako projekt edukacyjno-portfolio. Głównym celem jest nauka biblioteki Konva.js w środowisku React/Next.js. Aplikacja ma służyć jako pozycja portfolio prezentowana rekruterom — musi działać stabilnie, wyglądać profesjonalnie i demonstrować zaawansowane wzorce architektoniczne.

Projekt jest wyłącznie SPA bez backendu. Trwałość danych opiera się na localStorage (autosave) i lokalnym eksporcie/imporcie pliku JSON.

---

### Główne wymagania funkcjonalne

#### MVP Core (desktop only)

**Tworzenie kształtów:**
- Narzędzia: prostokąt, koło/elipsa, trójkąt (`RegularPolygon sides=3`), linia (prosty odcinek)
- Klik na narzędzie → kształt pojawia się w centrum widocznego canvasa z domyślnymi właściwościami
- Natychmiastowa manipulacja: drag, resize (Konva Transformer), rotate

**Nawigacja po scenie:**
- Dwa tryby kursora: strzałka (zaznaczanie) i dłoń (pan)
- Zoom: Ctrl/Cmd + scroll; Pan: narzędzie dłoni lub Space+drag
- Scena responsywna przez ResizeObserver — stabilna przy zmianie rozmiaru okna

**Panel właściwości (prawy sidebar):**
- Zawsze widoczny; pusty stan: placeholder + lista skrótów klawiaturowych
- Właściwości: pozycja X/Y, szerokość, wysokość, fill (react-colorful), stroke (react-colorful), strokeWidth, opacity
- Sticky defaults per shape type

**Trwałość danych:**
- Autosave do localStorage po każdej zmianie
- Autoload przy starcie (jeśli istnieje zapis)
- "New Scene" z modalem potwierdzenia
- Toast/snackbar przy błędzie zapisu

**Zarządzanie stanem:**
- Zustand + Immer

**Skróty klawiaturowe Core:** `Delete/Backspace`, `Escape`, `Ctrl+D`

---

#### MVP Extended

**Właściwości rozszerzone w sidebarze:**
- cornerRadius (prostokąt)
- Obrót w stopniach

**Organizacja kształtów:**
- Grupowanie / rozgrupowywanie
- Zarządzanie kolejnością warstw (bring to front / send to back)

**Eksport/Import JSON:**
- Natywny format Konva (`node.toJSON()`)
- Eksport do pliku `.json` na dysk
- Import z pliku `.json`

**Eksport PNG:**
- Białe tło `#ffffff`
- Modal dwukrokowy: (1) padding w px — jednakowy ze wszystkich stron; (2) wysokość w px (edytowalna, domyślna = rzeczywista wysokość sceny w zoom 100% + padding) + szerokość (disabled, proporcjonalna)

**Historia zmian:**
- Undo/Redo (`Ctrl+Z` / `Ctrl+Y`) przez `zundo` (temporal middleware)
- Pełen zakres: wszystkie mutacje stanu sceny
- Limit: 50 kroków

**Obsługa touch/mobile**

**Skróty klawiaturowe Extended:** `Ctrl+Z/Y`, `Ctrl+G`, `Ctrl+Shift+G`, `[`/`]`

---

### Kluczowe ścieżki użytkownika

1. **Tworzenie i edycja:** wybór narzędzia → kształt na środku canvasa → resize/rotate przez Transformer → edycja właściwości w sidebarze
2. **Nawigacja:** przełączenie na dłoń → pan sceny; Ctrl+scroll → zoom; powrót do strzałki → zaznaczanie
3. **Multi-select:** przeciąganie marquee na pustym obszarze → wspólny bounding box → skalowanie / przesunięcie grupy
4. **Zapis sesji:** autosave w tle → przy kolejnym wejściu autoload ostatniego stanu → "New Scene" z potwierdzeniem
5. **Eksport PNG:** toolbar → Export PNG → modal padding → modal wymiary → pobranie pliku

---

### Kryteria sukcesu

| Kryterium | Miara |
|---|---|
| Wydajność | 200 kształtów @ 60fps na przeciętnym laptopie |
| Stabilność | Brak błędów w konsoli przeglądarki na Vercel |
| Architektura | Custom hooks, serializowalny stan, Zustand + Immer + zundo |
| Portfolio | README dokumentuje decyzje architektoniczne |

---

### Stack technologiczny

| Warstwa | Technologia |
|---|---|
| Framework | Next.js (App Router) |
| Canvas | Konva.js + react-konva |
| Język | TypeScript |
| Stan | Zustand + Immer + zundo |
| Stylowanie | TailwindCSS |
| Color picker | react-colorful |
| Deploy | Vercel |

---

### Layout aplikacji

```
┌──────────┬───────────────────────────────┬────────────┐
│          │                               │            │
│ Toolbar  │       CANVAS (Konva Stage)    │  Sidebar   │
│ (lewy,   │   responsywny, ResizeObserver │  (prawy,   │
│ pionowy) │                               │  stały)    │
│          │                               │            │
└──────────┴───────────────────────────────┴────────────┘
```

---

### Planned Extensions (poza MVP)

- Symulowany obrót 2.5D (efekt perspektywiczny przez `scaleY`)
- Połączenia między kształtami (linie/strzałki jako connectory)
- Mind map / diagram mode
- Eksport JPG
- Własna schema JSON z metadanymi (wersja, timestamp, nazwa sceny)
- Tooltip inline z pozycją X/Y podczas przeciągania

---

## Nierozwiązane kwestie

1. **Styl linii dashed** — zdefiniowano, że linia obsługuje styl solid/dashed, ale nie określono, jak użytkownik przełącza między nimi w sidebarze (dropdown, toggle?) ani jakie są wartości `dashArray` dla stylu dashed
2. **Zachowanie Transformera przy rotacji trójkąta** — `RegularPolygon` w Konva może mieć specyficzne zachowanie przy rotate + resize; warto zweryfikować czy Transformer działa spójnie z tym kształtem tak samo jak z `Rect` i `Circle`
3. **Duplikacja kształtu (`Ctrl+D`)** — nie określono, gdzie pojawia się duplikat (w miejscu oryginału z offsetem, np. +10px/+10px, czy w centrum canvasa)
4. **Zachowanie przy imporcie JSON z inną wersją Konva** — ponieważ format to natywny `node.toJSON()`, nie zdefiniowano obsługi błędów przy próbie wczytania uszkodzonego lub niekompatybilnego pliku JSON
