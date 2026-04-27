# Dokument wymagań produktu (PRD) - GeoCanvas

## 1. Przegląd produktu

GeoCanvas to minimalistyczny, geometryczny edytor kształtów działający w przeglądarce, zbudowany jako projekt edukacyjno-portfolio. Aplikacja umożliwia tworzenie, edycję i organizację geometrycznych kształtów na interaktywnym canvasie, z możliwością zapisywania i eksportowania prac.

Stylistycznie projekt nawiązuje do narzędzi takich jak tldraw i Excalidraw — czysty, geometryczny, minimalistyczny interfejs. Aplikacja jest wyłącznie SPA (Single Page Application) bez backendu. Jedyną formą trwałości danych jest autosave do localStorage oraz lokalny eksport/import pliku JSON.

Stack technologiczny:

- Framework: Next.js (App Router)
- Canvas: Konva.js + react-konva
- Język: TypeScript 5+ (strict mode)
- Zarządzanie stanem: Zustand + Immer + zundo (temporal middleware)
- Stylowanie: TailwindCSS v4 (konfiguracja CSS-first)
- Color picker: @uiw/react-color
- Ikony: lucide-react
- Deploy: Vercel
- Wymagany runtime: Node.js >=20.9.0

Architektura kodu — zasada shape-centric modules:

Każdy typ figury żyje w swoim własnym katalogu `src/shapes/<nazwa>/` i zawiera 6 plików:

```
src/shapes/
├── _base/              # BaseShape interface, domyślne wartości bazowe, ShapeDefinition interface
├── rect/               # prostokąt — typy, defaults, factory, Renderer, PropertiesPanel, index
├── circle/             # koło
├── ellipse/            # elipsa
├── triangle/           # trójkąt
├── line/               # linia
├── custom/             # (przyszłość) figury złożone / grupy
├── index.ts            # unia Shape, re-eksporty typów
└── registry.ts         # SHAPE_REGISTRY + SHAPE_TYPES — jedyne miejsce wiedzy o wszystkich figurach
```

Store jest podzielony według rodzaju stanu, nie według figury:

```
src/store/
├── slices/
│   ├── shapes.ts       # interface ShapesSlice (shapes[], stickyDefaults, CRUD)
│   ├── selection.ts    # interface SelectionSlice (selectedShapeIds)
│   └── viewport.ts     # interface ViewportSlice (canvasScale, canvasPosition)
├── use-canvas-store.ts # łączy slices w jeden store (Zustand + Immer)
└── types.ts            # ShapeUpdate, CanvasState; re-eksportuje typy z @/shapes
```

Dlaczego taka struktura:

1. **Każda modyfikacja figury = jeden katalog.** Dodanie np. ukosowania krawędzi do prostokąta wymaga zmian wyłącznie w `src/shapes/rect/` — typy, defaults, renderer i panel właściwości w jednym miejscu. Żaden inny plik nie potrzebuje modyfikacji.

2. **Dodanie nowej figury = nowy katalog + jedna linijka w registry.** Po stworzeniu katalogu `src/shapes/polygon/` z 6 plikami wystarczy zarejestrować go w `registry.ts`. Toolbar, canvas i panel właściwości automatycznie go wykryją — zero zmiany w kodzie tych komponentów.

3. **Shape Registry jako jedyny punkt wiedzy.** Komponenty (`ShapeNode`, `CanvasApp`, przyszły toolbar) importują wyłącznie z `registry.ts`, nigdy bezpośrednio z modułów figur. To gwarantuje, że logika app-level pozostaje shape-agnostic niezależnie od liczby figur.

4. **Store podzielony według odpowiedzialności, nie figury.** Stan figur (`shapes[]`), zaznaczenia (`selectedShapeIds`) i widoku (`canvasScale`, `canvasPosition`) to trzy różne domeny. Podział na slices odzwierciedla te domeny i ułatwia dodawanie nowych fragmentów stanu (np. `history` slice dla undo/redo) bez naruszania istniejącego kodu.

5. **Przyszłe figury złożone.** Katalog `src/shapes/custom/` (lub `group/`) będzie obsługiwał połączone figury / grupy (MVP Extended, REQ-040) — ten sam interfejs `ShapeDefinition`, ten sam registry, ta sama integracja ze store.

Szczegółowa analiza architektury: `.ai/application-structure-analysis.md`

---

Layout aplikacji:

```
┌──────────┬───────────────────────────────┬────────────┐
│          │                               │            │
│ Toolbar  │       CANVAS (Konva Stage)    │  Sidebar   │
│ (lewy,   │   responsywny, ResizeObserver │  (prawy,   │
│ pionowy) │                               │  stały)    │
│          │                               │            │
└──────────┴───────────────────────────────┴────────────┘
```

Toolbar pionowy po lewej zawiera dwie sekcje oddzielone separatorem: narzędzia (kursor, dłoń, prostokąt, koło/elipsa, trójkąt, linia) oraz akcje globalne (New Scene, Export JSON, Import JSON, Export PNG). Sidebar po prawej jest zawsze widoczny — w stanie pustym prezentuje placeholder oraz listę skrótów klawiaturowych.

---

## 2. Problem użytkownika

Docelowi użytkownicy aplikacji to:

1. Autor projektu (frontend developer) — nauka Konva.js i react-konva jako nowej technologii canvas w środowisku React/Next.js; potrzeba praktycznego projektu demonstrującego zaawansowane wzorce architektoniczne (serializowalny stan, custom hooks, middleware).

2. Rekruterzy i osoby oceniające portfolio — potrzeba szybkiego zweryfikowania umiejętności kandydata w zakresie interaktywnych aplikacji graficznych, architektury stanu oraz jakości UX.

Problemy rozwiązywane przez aplikację:

- Brak prostego, lekkiego narzędzia do tworzenia i eksportowania prostych kompozycji geometrycznych działającego wyłącznie w przeglądarce, bez rejestracji ani backendu.
- Potrzeba demonstracyjnego projektu portfolio, który jest funkcjonalny, estetyczny i dokumentuje nietrywialną architekturę techniczną.
- Konieczność nauki i praktycznego opanowania Konva.js przez zbudowanie realnej, użytkowej aplikacji — zamiast izolowanych przykładów z dokumentacji.

---

## 3. Wymagania funkcjonalne

### 3.1 MVP Core (desktop only)

#### Tworzenie kształtów

- REQ-001: Użytkownik może wybrać narzędzie z paska: prostokąt, koło/elipsa, trójkąt, linia.
- REQ-002: Po kliknięciu narzędzia kształt pojawia się w centrum aktualnie widocznego canvasa z domyślnymi właściwościami dla danego typu.
- REQ-003: Kształt jest natychmiast dostępny do manipulacji (drag, resize, rotate) bez dodatkowych kroków.
- REQ-004: Prostokąt tworzony jest jako `Rect` z domyślnymi właściwościami: fill `#4A90D9`, stroke `#2C5F8A`, strokeWidth `2`, opacity `1`.
- REQ-005: Koło/elipsa tworzony jest jako `Circle`/`Ellipse` z domyślnymi właściwościami: fill `#E8A838`, stroke `#B07820`, strokeWidth `2`, opacity `1`.
- REQ-006: Trójkąt tworzony jest jako `RegularPolygon` z `sides=3` z domyślnymi właściwościami: fill `#5CB85C`, stroke `#3A7A3A`, strokeWidth `2`, opacity `1`.
- REQ-007: Linia tworzona jest jako prosty odcinek (click-drag) z domyślnymi właściwościami: stroke `#333333`, strokeWidth `2`, opacity `1`, styl solid.
- REQ-008: Właściwości domyślne są "sticky" per typ kształtu — nowy kształt tego samego typu dziedziczy ostatnio używane właściwości tego typu.

#### Manipulacja kształtami

- REQ-009: Każdy kształt obsługuje przeciąganie (`draggable`).
- REQ-010: Każdy kształt obsługuje resize i rotate przez własny system uchwytów (nie Konva Transformer). System uchwytów składa się z:
  - **4 uchwytów bocznych** — jeden na środku każdego boku bounding boxa kształtu (góra, prawo, dół, lewo); przeciąganie uchwytu na danym boku przesuwa tę krawędź bounding boxa, co zmienia długość obu boków figury sąsiadujących z tą krawędzią — efekt rozciągania/zwężania figury. Dla trójkąta — ze względu na brak równoległych boków — zmiana krawędzi bounding boxa skaluje całą figurę, przez co zmienia się również długość boku trójkąta odpowiadającego tej krawędzi,
  - **1 uchwytu rotacji** — umieszczonego w lewym górnym rogu bounding boxa; przeciąganie go obraca kształt/grupę wokół jej centrum.
- REQ-010a: Uchwyty są widoczne wyłącznie gdy **jednocześnie** spełnione są oba warunki: kształt jest zaznaczony **oraz** kursor myszy znajduje się nad kształtem (hover + selection).
- REQ-010b: Gdy kursor opuści obszar kształtu, uchwyty znikają — nawet jeśli kształt nadal pozostaje zaznaczony.
- REQ-010c: Samo najeżdżanie kursorem na niezaznaczony kształt (hover bez zaznaczenia) nie powoduje pojawienia się uchwytów.
- REQ-011: Zaznaczony kształt można usunąć klawiszem `Delete` lub `Backspace`.
- REQ-012: Zaznaczony kształt można zduplikować skrótem `Ctrl+D` — duplikat pojawia się z offsetem `+10px/+10px` względem oryginału.
- REQ-013: Naciśnięcie `Escape` usuwa zaznaczenie.

#### Nawigacja po scenie

- REQ-014: Dostępne są dwa tryby kursora: strzałka (zaznaczanie/manipulacja) i dłoń (pan sceny).
- REQ-015: Zoom sceny działa przez `Ctrl/Cmd + scroll`; scena skaluje się względem pozycji kursora.
- REQ-016: Pan sceny działa w trybie dłoni przez przeciąganie lewym przyciskiem myszy lub przez `Space + drag` w trybie strzałki.
- REQ-017: Scena jest responsywna — dynamicznie dopasowuje wymiary do dostępnej przestrzeni za pomocą `ResizeObserver`; canvas nie "rozpada się" przy resize okna przeglądarki.

#### Zaznaczanie kształtów

- REQ-018: Kliknięcie kształtu zaznacza go (zaznaczenie pojedyncze).
- REQ-019: Kliknięcie pustego obszaru canvasa w trybie strzałki odznacza wszystkie kształty.
- REQ-020: Przeciąganie na pustym obszarze canvasa w trybie strzałki tworzy marquee selection (zaznaczenie prostokątne).
- REQ-021: `Shift + klik` dodaje lub usuwa kształt z zaznaczenia (multi-select).
- REQ-022: Przy multi-select system uchwytów wyświetla wspólny bounding box dla wszystkich zaznaczonych kształtów; uchwyty boczne i uchwyt rotacji działają na całą grupę jednocześnie.
- REQ-023: `Shift + resize` w multi-select skaluje zaznaczone kształty proporcjonalnie.

#### Panel właściwości (sidebar)

- REQ-024: Sidebar jest zawsze widoczny po prawej stronie.
- REQ-025: Gdy żaden kształt nie jest zaznaczony, sidebar wyświetla placeholder "Select a shape to edit its properties" oraz listę kluczowych skrótów klawiaturowych.
- REQ-026: Gdy kształt jest zaznaczony, sidebar wyświetla jego właściwości: pozycja X/Y, szerokość, wysokość, fill (color picker), stroke (color picker), strokeWidth, opacity.
- REQ-027: Color picker dla fill i stroke jest zaimplementowany z użyciem biblioteki `@uiw/react-color`.
- REQ-028: Zmiana wartości w sidebarze natychmiastowo aktualizuje właściwości zaznaczonego kształtu.

#### Trwałość danych

- REQ-029: Stan sceny jest automatycznie zapisywany do `localStorage` po każdej zmianie (autosave).
- REQ-030: Przy starcie aplikacja automatycznie ładuje ostatni stan z `localStorage` (autoload), jeśli zapis istnieje.
- REQ-031: Przycisk "New Scene" otwiera modal potwierdzenia; po potwierdzeniu scena jest czyszczona i usuwana z localStorage.
- REQ-032: Przy nieudanym zapisie do `localStorage` wyświetlany jest toast/snackbar z komunikatem błędu; aplikacja działa normalnie w trybie incognito (bez autosave, bez błędu krytycznego).

#### Zarządzanie stanem

- REQ-033: Stan aplikacji zarządzany jest przez Zustand z Immer.

#### Skróty klawiaturowe (Core)

- REQ-034: `Delete` / `Backspace` — usuwa zaznaczony kształt.
- REQ-035: `Escape` — odznacza zaznaczenie.
- REQ-036: `Ctrl+D` — duplikuje zaznaczony kształt z offsetem +10px/+10px.

---

### 3.2 MVP Extended

#### Rozszerzone właściwości w sidebarze

- REQ-037: Sidebar dla prostokąta udostępnia pole `cornerRadius` (zaokrąglenie rogów).
- REQ-038: Sidebar wyświetla aktualny kąt obrotu zaznaczonego kształtu w stopniach (pole edytowalne).
- REQ-039: Sidebar dla linii udostępnia przełącznik stylu: solid / dashed (np. dropdown lub toggle).

#### Organizacja kształtów

- REQ-040: Zaznaczone kształty (min. dwa) można zgrupować akcją "Grupuj" (`Ctrl+G`) — tworzą Konva `Group`.
- REQ-041: Zaznaczoną grupę można rozgrupować akcją "Rozgrupuj" (`Ctrl+Shift+G`).
- REQ-042: Zaznaczony kształt można przenieść na wierzch warstwy (`]`) lub na spód warstwy (`[`).

#### Eksport i import JSON

- REQ-043: Akcja "Export JSON" serializuje całą scenę do natywnego formatu Konva (`node.toJSON()`) i pobiera plik `.json` na dysk lokalny.
- REQ-044: Akcja "Import JSON" otwiera dialog wyboru pliku; po wyborze plik `.json` jest wczytywany i zastępuje aktualną scenę.
- REQ-045: Przy próbie wczytania uszkodzonego lub niekompatybilnego pliku JSON wyświetlany jest toast/snackbar z komunikatem błędu; scena pozostaje niezmieniona.

#### Eksport PNG

- REQ-046: Akcja "Export PNG" otwiera modal dwukrokowy.
- REQ-047: Krok 1 modalu: pole tekstowe "Padding (px)" — jednakowy padding ze wszystkich stron (wartość obowiązkowa).
- REQ-048: Krok 2 modalu: pole "Wysokość (px)" — edytowalne, domyślna wartość = rzeczywista wysokość sceny w zoom 100% + padding; pole "Szerokość (px)" — wyłączone (disabled), automatycznie obliczone proporcjonalnie.
- REQ-049: Eksportowany obraz PNG ma białe tło `#ffffff`.
- REQ-050: Po potwierdzeniu plik PNG jest pobierany na dysk lokalny.

#### Historia zmian (Undo/Redo)

- REQ-051: Wszystkie mutacje stanu sceny są objęte historią zmian.
- REQ-052: `Ctrl+Z` cofa ostatnią zmianę; `Ctrl+Y` lub `Ctrl+Shift+Z` ponawia cofniętą zmianę.
- REQ-053: Historia zmian jest zarządzana przez `zundo` (temporal middleware dla Zustand).
- REQ-054: Limit historii wynosi 50 kroków.

#### Obsługa touch/mobile

- REQ-055: Aplikacja obsługuje gesty dotykowe na urządzeniach mobilnych: pinch-to-zoom, przeciąganie kształtów, pan sceny.

#### Skróty klawiaturowe (Extended)

- REQ-056: `Ctrl+Z` — cofnij (undo).
- REQ-057: `Ctrl+Y` — ponów (redo).
- REQ-058: `Ctrl+G` — grupuj zaznaczone kształty.
- REQ-059: `Ctrl+Shift+G` — rozgrupuj zaznaczoną grupę.
- REQ-060: `]` — przenieś zaznaczony kształt na wierzch.
- REQ-061: `[` — przenieś zaznaczony kształt na spód.

---

### 3.3 Branding i jakość

- REQ-062: Nazwa aplikacji to "GeoCanvas"; UI jest wyłącznie w języku angielskim.
- REQ-063: Aplikacja posiada favicon w formacie SVG z motywem geometrycznym.
- REQ-064: Aplikacja posiada poprawne meta tagi (title, description) w HTML.
- REQ-065: Brak błędów w konsoli przeglądarki w środowisku produkcyjnym (Vercel).
- REQ-066: README projektu dokumentuje decyzje architektoniczne.

---

## 4. Granice produktu

### W zakresie MVP Core

- Tworzenie kształtów: prostokąt, koło/elipsa, trójkąt (RegularPolygon), linia (prosty odcinek).
- Manipulacja: drag, resize przez uchwyty boczne, rotate przez uchwyt rotacji (własny system uchwytów, nie Konva Transformer).
- Nawigacja: zoom, pan, tryb strzałki i dłoni.
- Zaznaczanie: pojedyncze, multi-select (marquee + Shift+klik).
- Sidebar: właściwości podstawowe (X/Y, szerokość, wysokość, fill, stroke, strokeWidth, opacity).
- Trwałość: autosave/autoload localStorage.
- Zarządzanie stanem: Zustand + Immer.
- Skróty: Delete, Escape, Ctrl+D.
- Wyłącznie desktop.

### W zakresie MVP Extended

- Rozszerzone właściwości: cornerRadius, obrót w stopniach, styl linii (solid/dashed).
- Grupowanie i rozgrupowywanie kształtów.
- Zarządzanie kolejnością warstw.
- Eksport/import JSON.
- Eksport PNG z modalem konfiguracji.
- Undo/Redo przez zundo (50 kroków).
- Obsługa touch/mobile.
- Rozszerzone skróty klawiaturowe.

### Poza zakresem projektu (Planned Extensions)

- Eksport do formatu JPG.
- Symulowany obrót 2.5D (efekt perspektywiczny przez scaleY).
- Połączenia między kształtami (linie/strzałki jako connectory).
- Mind map / diagram mode z węzłami i relacjami.
- Własna schema JSON z metadanymi (wersja, timestamp, nazwa sceny).
- Tooltip inline z pozycją X/Y podczas przeciągania.
- Edycja wierzchołków trójkąta (poza RegularPolygon).
- Strzałki i polyline jako rozszerzenie narzędzia linia.
- Backend, konta użytkowników, synchronizacja w chmurze.
- Współpraca wieloosobowa (real-time).
- Uwierzytelnianie — aplikacja nie wymaga logowania ani identyfikacji użytkownika.

---

## 5. Historyjki użytkowników

### Tworzenie kształtów

---

US-001
Tytuł: Tworzenie prostokąta

Opis: Jako użytkownik chcę kliknąć narzędzie "Prostokąt" w toolbarze, aby natychmiast pojawił się nowy prostokąt na canvasie gotowy do edycji.

Kryteria akceptacji:
- Po kliknięciu ikony prostokąta w toolbarze na canvasie pojawia się nowy prostokąt w centrum aktualnie widocznego obszaru canvasa.
- Prostokąt ma domyślne właściwości: fill `#4A90D9`, stroke `#2C5F8A`, strokeWidth `2`, opacity `1`.
- Prostokąt jest natychmiast zaznaczony; uchwyty (4 boczne + rotacji) są widoczne gdy kursor znajduje się nad kształtem.
- Prostokąt można natychmiast przeciągać, resizować przez uchwyty boczne i obracać przez uchwyt rotacji.
- Właściwości prostokąta są widoczne w sidebarze po prawej stronie.

---

US-002
Tytuł: Tworzenie koła/elipsy

Opis: Jako użytkownik chcę kliknąć narzędzie "Koło/Elipsa" w toolbarze, aby pojawił się nowy kształt na canvasie.

Kryteria akceptacji:
- Po kliknięciu ikony koła/elipsy nowy kształt pojawia się w centrum widocznego canvasa.
- Kształt ma domyślne właściwości: fill `#E8A838`, stroke `#B07820`, strokeWidth `2`, opacity `1`.
- Kształt jest natychmiast zaznaczony; uchwyty (4 boczne + rotacji) są widoczne gdy kursor znajduje się nad kształtem.
- Przeciąganie lewego/prawego uchwytu bocznego skaluje oś X, przeciąganie górnego/dolnego skaluje oś Y — pozwala to uzyskać elipsę.
- Właściwości kształtu są widoczne w sidebarze.

---

US-003
Tytuł: Tworzenie trójkąta

Opis: Jako użytkownik chcę kliknąć narzędzie "Trójkąt" w toolbarze, aby pojawił się nowy trójkąt na canvasie.

Kryteria akceptacji:
- Po kliknięciu ikony trójkąta nowy kształt (RegularPolygon z sides=3) pojawia się w centrum widocznego canvasa.
- Trójkąt ma domyślne właściwości: fill `#5CB85C`, stroke `#3A7A3A`, strokeWidth `2`, opacity `1`.
- Kształt jest natychmiast zaznaczony; uchwyty (4 boczne + rotacji) są widoczne gdy kursor znajduje się nad kształtem.
- Uchwyty boczne i rotacji działają spójnie dla trójkąta tak samo jak dla pozostałych typów kształtów.

---

US-004
Tytuł: Tworzenie linii

Opis: Jako użytkownik chcę kliknąć narzędzie "Linia" i przeciągnąć po canvasie, aby narysować prosty odcinek.

Kryteria akceptacji:
- Po wybraniu narzędzia linia i kliknięciu na canvasie przeciąganie tworzy odcinek od punktu A do punktu B.
- Linia ma domyślne właściwości: stroke `#333333`, strokeWidth `2`, opacity `1`, styl solid.
- Po puszczeniu myszy linia jest zaznaczona i widoczna w sidebarze.
- Linia obsługuje drag; uchwyty boczne pozwalają na zmianę długości i proporcji linii, uchwyt rotacji w lewym górnym rogu bounding boxa obraca linię.

---

US-005
Tytuł: Sticky properties per typ kształtu

Opis: Jako użytkownik chcę, aby nowy kształt danego typu dziedziczył właściwości ostatnio utworzonego/edytowanego kształtu tego samego typu, zamiast zawsze używać twardych wartości domyślnych.

Kryteria akceptacji:
- Jeśli użytkownik zmienił kolor prostokąta na `#FF0000`, kolejny nowy prostokąt pojawia się z kolorem `#FF0000`.
- Sticky properties są niezależne per typ kształtu — zmiana koloru prostokąta nie wpływa na domyślny kolor koła.
- Przy pierwszym uruchomieniu aplikacji używane są twarde wartości domyślne zdefiniowane w PRD.

---

### Manipulacja kształtami

---

US-006
Tytuł: Przeciąganie kształtu

Opis: Jako użytkownik chcę móc przeciągać kształt po canvasie, zmieniając jego pozycję.

Kryteria akceptacji:
- Kliknięcie i przeciągnięcie zaznaczonego kształtu zmienia jego pozycję na canvasie.
- Pozycja X/Y w sidebarze aktualizuje się w czasie rzeczywistym podczas przeciągania.
- Kształt nie wychodzi poza logiczne granice sceny w nieoczekiwany sposób.
- Działanie jest płynne przy 200 kształtach na scenie.

---

US-006b
Tytuł: Widoczność uchwytów — wyłącznie przy zaznaczeniu i hoveru jednocześnie

Opis: Jako użytkownik chcę widzieć uchwyty manipulacji tylko gdy jestem kursorem nad zaznaczonym kształtem, aby canvas był czysty gdy kursor jest gdzieś indziej.

Kryteria akceptacji:
- Uchwyty (4 boczne + 1 rotacji) są widoczne wyłącznie gdy kształt jest zaznaczony ORAZ kursor myszy znajduje się nad kształtem — oba warunki muszą być spełnione jednocześnie.
- Gdy kursor opuszcza obszar zaznaczonego kształtu, uchwyty znikają (mimo że kształt nadal jest zaznaczony).
- Najeżdżanie kursorem na niezaznaczony kształt nie powoduje pojawienia się uchwytów.
- Na pustym obszarze canvasa (brak kształtu pod kursorem) żadne uchwyty nie są wyświetlane.

---

US-007
Tytuł: Resize kształtu przez uchwyty boczne

Opis: Jako użytkownik chcę zmieniać rozmiar kształtu za pomocą uchwytów bocznych pojawiających się przy zaznaczeniu lub najechaniu kursorem.

Kryteria akceptacji:
- Gdy kształt jest zaznaczony ORAZ kursor jest nad kształtem, na środku każdego boku jego bounding boxa pojawia się uchwyt boczny (łącznie 4 uchwyty).
- Przeciąganie uchwytu na danym boku przesuwa tę krawędź bounding boxa, zmieniając długość obu boków figury sąsiadujących z tą krawędzią (efekt rozciągania). Dla trójkąta zmiana krawędzi skaluje całą figurę — zmienia się również długość boku trójkąta odpowiadającego przesuniętej krawędzi.
- Gdy kursor opuści obszar kształtu, uchwyty boczne znikają — nawet gdy kształt jest zaznaczony.
- Szerokość i wysokość w sidebarze aktualizują się w czasie rzeczywistym podczas przeciągania uchwytu.
- Uchwyty boczne działają spójnie dla wszystkich typów kształtów (Rect, Circle/Ellipse, RegularPolygon, Line).

---

US-008
Tytuł: Rotacja kształtu przez uchwyt rotacji

Opis: Jako użytkownik chcę obracać kształt za pomocą uchwytu rotacji pojawiającego się w lewym górnym rogu kształtu.

Kryteria akceptacji:
- Gdy kształt jest zaznaczony ORAZ kursor jest nad kształtem, w lewym górnym rogu jego bounding boxa pojawia się uchwyt rotacji.
- Przeciąganie uchwytu rotacji obraca kształt wokół jego centrum geometrycznego.
- Gdy kursor opuści obszar kształtu, uchwyt rotacji znika — nawet gdy kształt jest zaznaczony.
- Kąt obrotu wyświetlany jest w sidebarze (MVP Extended).
- Rotacja działa dla wszystkich typów kształtów.

---

US-009
Tytuł: Usuwanie kształtu

Opis: Jako użytkownik chcę móc usunąć zaznaczony kształt klawiszem Delete lub Backspace.

Kryteria akceptacji:
- Naciśnięcie `Delete` lub `Backspace` przy zaznaczonym kształcie usuwa go z canvasa.
- Po usunięciu sidebar przechodzi do stanu pustego (placeholder).
- Operacja jest uwzględniana w historii zmian (MVP Extended — undo/redo).
- Jeśli żaden kształt nie jest zaznaczony, naciśnięcie Delete/Backspace nie powoduje żadnego efektu.

---

US-010
Tytuł: Duplikowanie kształtu

Opis: Jako użytkownik chcę zduplikować zaznaczony kształt skrótem Ctrl+D, aby szybko tworzyć kopie.

Kryteria akceptacji:
- `Ctrl+D` przy zaznaczonym kształcie tworzy jego kopię z identycznymi właściwościami.
- Duplikat pojawia się z offsetem +10px w osi X i +10px w osi Y względem oryginału.
- Duplikat jest natychmiast zaznaczony po utworzeniu.
- Oryginał pozostaje na swoim miejscu.

---

US-011
Tytuł: Odznaczanie kształtu klawiszem Escape

Opis: Jako użytkownik chcę nacisnąć Escape, aby anulować zaznaczenie i wrócić do stanu "nic niezaznaczone".

Kryteria akceptacji:
- Naciśnięcie `Escape` przy zaznaczonym kształcie lub grupie usuwa zaznaczenie.
- Uchwyty (boczne i rotacji) znikają z canvasa (chyba że kursor nadal znajduje się nad kształtem — wtedy pozostają widoczne w trybie hover).
- Sidebar przechodzi do stanu pustego (placeholder + skróty).

---

### Nawigacja po scenie

---

US-012
Tytuł: Zoom sceny przez Ctrl+Scroll

Opis: Jako użytkownik chcę powiększać i pomniejszać scenę skrótem Ctrl+Scroll, aby wygodnie pracować z detalami lub całościowym widokiem.

Kryteria akceptacji:
- `Ctrl + scroll w górę` powiększa scenę; `Ctrl + scroll w dół` pomniejsza.
- Zoom odbywa się względem aktualnej pozycji kursora myszy.
- Kształty na scenie nie zmieniają swoich proporcji ani pozycji względem siebie.
- Zoom działa płynnie (bez skokowego przeskakiwania).

---

US-013
Tytuł: Pan sceny narzędziem Dłoń

Opis: Jako użytkownik chcę przełączyć się na narzędzie "Dłoń" i przeciągać scenę, aby poruszać się po canvasie.

Kryteria akceptacji:
- Kliknięcie ikony dłoni w toolbarze przełącza kursor na tryb pan.
- W trybie dłoni przeciąganie lewym przyciskiem myszy przesuwa całą scenę.
- Kształty nie są zaznaczane podczas panu.
- Po przełączeniu z powrotem na strzałkę tryb zaznaczania wraca do normy.

---

US-014
Tytuł: Pan sceny skrótem Space+Drag

Opis: Jako użytkownik chcę tymczasowo aktywować pan przez przytrzymanie spacji i przeciągnięcie, bez konieczności przełączania narzędzia.

Kryteria akceptacji:
- Przytrzymanie `Space` zmienia kursor na ikonę dłoni tymczasowo.
- Przeciąganie przy przytrzymanej spacji przesuwa scenę.
- Po puszczeniu spacji kursor wraca do trybu strzałki.
- Kształty nie są zaznaczane podczas tego gestu.

---

US-015
Tytuł: Responsywność canvasa przy resize okna

Opis: Jako użytkownik chcę, aby canvas automatycznie dopasowywał się do rozmiaru okna przeglądarki, bez utraty zawartości sceny.

Kryteria akceptacji:
- Zmiana rozmiaru okna przeglądarki (ręczna lub przez snap systemu operacyjnego) powoduje automatyczne dopasowanie canvasa.
- Kształty na scenie pozostają na swoich miejscach.
- Canvas nie "rozpada się" ani nie przycina kształtów.
- Dopasowanie działa za pomocą `ResizeObserver`.

---

### Zaznaczanie kształtów

---

US-016
Tytuł: Zaznaczanie pojedynczego kształtu

Opis: Jako użytkownik chcę kliknąć kształt, aby go zaznaczyć i zobaczyć jego właściwości w sidebarze.

Kryteria akceptacji:
- Kliknięcie kształtu zaznacza go — pojawia się Transformer.
- Sidebar wyświetla właściwości zaznaczonego kształtu.
- Kliknięcie innego kształtu przenosi zaznaczenie.
- Kliknięcie pustego obszaru canvasa (w trybie strzałki) odznacza zaznaczony kształt.

---

US-017
Tytuł: Multi-select przez marquee selection

Opis: Jako użytkownik chcę narysować prostokąt zaznaczenia na pustym obszarze canvasa, aby zaznaczyć wiele kształtów naraz.

Kryteria akceptacji:
- W trybie strzałki przeciąganie na pustym obszarze canvasa rysuje prostokąt marquee.
- Po puszczeniu myszy wszystkie kształty przecięte lub zawarte w prostokącie są zaznaczone.
- System uchwytów wyświetla wspólny bounding box dla zaznaczonych kształtów z uchwytami bocznymi i uchwytem rotacji.
- Sidebar przechodzi w tryb właściwości multi-select (lub pokazuje wspólne pola).

---

US-018
Tytuł: Multi-select przez Shift+klik

Opis: Jako użytkownik chcę przytrzymać Shift i klikać kształty, aby dodawać je do lub usuwać z aktualnego zaznaczenia.

Kryteria akceptacji:
- `Shift + klik` na niezaznaczonym kształcie dodaje go do zaznaczenia.
- `Shift + klik` na już zaznaczonym kształcie usuwa go z zaznaczenia.
- Transformer aktualizuje wspólny bounding box po każdej zmianie zaznaczenia.

---

US-019
Tytuł: Skalowanie proporcjonalne w multi-select

Opis: Jako użytkownik chcę, aby przy resizowaniu grupy zaznaczonych kształtów z wciśniętym Shift skalowanie było proporcjonalne.

Kryteria akceptacji:
- Resize wspólnego bounding boxa przy wciśniętym `Shift` zachowuje proporcje wszystkich kształtów.
- Relative pozycje kształtów względem siebie są zachowane podczas skalowania.

---

### Panel właściwości

---

US-020
Tytuł: Wyświetlanie pustego stanu sidebara

Opis: Jako użytkownik (rekruter), gdy nic nie jest zaznaczone, chcę zobaczyć informację o tym, co zrobić, oraz listę skrótów klawiaturowych.

Kryteria akceptacji:
- Gdy żaden kształt nie jest zaznaczony, sidebar wyświetla tekst "Select a shape to edit its properties".
- Sidebar wyświetla listę kluczowych skrótów klawiaturowych aplikacji.
- Lista skrótów jest czytelna i zawiera co najmniej: Delete, Escape, Ctrl+D.

---

US-021
Tytuł: Edycja pozycji kształtu przez sidebar

Opis: Jako użytkownik chcę zmienić pozycję zaznaczonego kształtu wpisując wartości X/Y w sidebarze.

Kryteria akceptacji:
- Sidebar wyświetla pola X i Y z aktualną pozycją zaznaczonego kształtu.
- Zmiana wartości w polu X lub Y i zatwierdzenie (Enter lub blur) przesuwa kształt na canvasie.
- Pola X/Y aktualizują się w czasie rzeczywistym podczas przeciągania kształtu.

---

US-022
Tytuł: Edycja rozmiaru kształtu przez sidebar

Opis: Jako użytkownik chcę zmienić szerokość i wysokość zaznaczonego kształtu wpisując wartości w sidebarze.

Kryteria akceptacji:
- Sidebar wyświetla pola Szerokość (W) i Wysokość (H) z aktualnymi wymiarami.
- Zmiana wartości i zatwierdzenie aktualizuje rozmiar kształtu na canvasie.
- Pola W/H aktualizują się w czasie rzeczywistym podczas resize przez Transformer.

---

US-023
Tytuł: Edycja koloru wypełnienia (fill)

Opis: Jako użytkownik chcę zmienić kolor wypełnienia zaznaczonego kształtu przez color picker w sidebarze.

Kryteria akceptacji:
- Sidebar wyświetla próbkę koloru fill i umożliwia otwarcie color pickera (`@uiw/react-color`).
- Zmiana koloru w pickerze natychmiast aktualizuje fill kształtu na canvasie.
- Zmieniony kolor staje się nowym sticky default dla danego typu kształtu.

---

US-024
Tytuł: Edycja koloru obramowania (stroke)

Opis: Jako użytkownik chcę zmienić kolor obramowania zaznaczonego kształtu przez color picker w sidebarze.

Kryteria akceptacji:
- Sidebar wyświetla próbkę koloru stroke i umożliwia otwarcie color pickera (`@uiw/react-color`).
- Zmiana koloru natychmiast aktualizuje stroke kształtu na canvasie.
- Zmieniony kolor staje się nowym sticky default dla danego typu kształtu.

---

US-025
Tytuł: Edycja grubości linii (strokeWidth)

Opis: Jako użytkownik chcę zmienić grubość obramowania zaznaczonego kształtu przez pole liczbowe w sidebarze.

Kryteria akceptacji:
- Sidebar wyświetla pole liczbowe strokeWidth z aktualną wartością.
- Zmiana wartości aktualizuje strokeWidth kształtu na canvasie.
- Pole akceptuje tylko wartości liczbowe większe od 0.

---

US-026
Tytuł: Edycja przezroczystości (opacity)

Opis: Jako użytkownik chcę zmienić przezroczystość zaznaczonego kształtu przez suwak lub pole w sidebarze.

Kryteria akceptacji:
- Sidebar wyświetla kontrolkę opacity (suwak lub pole liczbowe, zakres 0–1 lub 0–100%).
- Zmiana wartości aktualizuje opacity kształtu na canvasie w czasie rzeczywistym.

---

US-027
Tytuł: Edycja cornerRadius prostokąta (Extended)

Opis: Jako użytkownik chcę zaokrąglać rogi prostokąta przez pole cornerRadius w sidebarze.

Kryteria akceptacji:
- Gdy zaznaczony jest prostokąt, sidebar wyświetla pole `cornerRadius`.
- Zmiana wartości cornerRadius zaokrągla rogi prostokąta na canvasie.
- Pole przyjmuje tylko nieujemne wartości liczbowe.
- Dla innych typów kształtów pole cornerRadius nie jest wyświetlane.

---

US-028
Tytuł: Edycja kąta obrotu przez sidebar (Extended)

Opis: Jako użytkownik chcę zobaczyć i edytować dokładny kąt obrotu zaznaczonego kształtu przez pole liczbowe w sidebarze.

Kryteria akceptacji:
- Sidebar wyświetla pole "Rotation" z aktualnym kątem obrotu w stopniach (0–360).
- Zmiana wartości i zatwierdzenie obraca kształt do podanego kąta.
- Pole aktualizuje się w czasie rzeczywistym podczas rotacji przez Transformer.

---

US-029
Tytuł: Edycja stylu linii solid/dashed (Extended)

Opis: Jako użytkownik chcę przełączyć styl linii między solid a dashed w sidebarze.

Kryteria akceptacji:
- Gdy zaznaczona jest linia, sidebar wyświetla kontrolkę przełącznika stylu (np. dropdown lub toggle: "Solid" / "Dashed").
- Przełączenie na "Dashed" zmienia wygląd linii na przerywany.
- Przełączenie na "Solid" przywraca ciągłą linię.
- Dla innych typów kształtów kontrolka nie jest wyświetlana.

---

### Trwałość danych

---

US-030
Tytuł: Autosave do localStorage

Opis: Jako użytkownik chcę, aby moja praca była automatycznie zapisywana, bez konieczności ręcznego zapisywania.

Kryteria akceptacji:
- Każda zmiana na scenie (dodanie, usunięcie, edycja kształtu, zmiana właściwości) wyzwala autosave do localStorage.
- Autosave jest asynchroniczny i nie blokuje UI.
- Przy nieudanym zapisie wyświetlany jest toast/snackbar z informacją o błędzie.
- W trybie incognito (brak dostępu do localStorage) aplikacja działa normalnie bez autosave i bez błędu krytycznego.

---

US-031
Tytuł: Autoload przy starcie aplikacji

Opis: Jako użytkownik chcę, aby aplikacja automatycznie odtworzyła moją ostatnią sesję po ponownym otwarciu.

Kryteria akceptacji:
- Przy otwarciu aplikacji sprawdzana jest obecność zapisu w localStorage.
- Jeśli zapis istnieje, scena jest automatycznie wczytana.
- Jeśli zapisu nie ma, aplikacja startuje z pustą sceną.
- Wczytana scena jest w pełni interaktywna.

---

US-032
Tytuł: Tworzenie nowej sceny z potwierdzeniem

Opis: Jako użytkownik chcę mieć możliwość wyczyścić scenę i zacząć od nowa, z zabezpieczeniem przed przypadkowym usunięciem pracy.

Kryteria akceptacji:
- Kliknięcie przycisku "New Scene" w toolbarze otwiera modal z pytaniem o potwierdzenie.
- Po potwierdzeniu scena jest czyszczona, a zapis w localStorage usuwany.
- Po anulowaniu modala scena pozostaje niezmieniona.
- Modal zawiera wyraźne przyciski "Confirm" / "Cancel".

---

### Eksport i import (Extended)

---

US-033
Tytuł: Eksport sceny do pliku JSON

Opis: Jako użytkownik chcę wyeksportować całą scenę do pliku JSON, aby zachować kopię pracy na dysku.

Kryteria akceptacji:
- Kliknięcie "Export JSON" w toolbarze generuje plik `.json` w natywnym formacie Konva (`node.toJSON()`).
- Plik jest automatycznie pobierany przez przeglądarkę.
- Nazwa pliku zawiera identyfikator (np. `geocanvas-scene.json`).
- Eksport działa dla sceny z co najmniej 1 kształtem.

---

US-034
Tytuł: Import sceny z pliku JSON

Opis: Jako użytkownik chcę wczytać scenę z pliku JSON, który wcześniej wyeksportowałem.

Kryteria akceptacji:
- Kliknięcie "Import JSON" otwiera systemowy dialog wyboru pliku (akceptowane tylko `.json`).
- Po wyborze poprawnego pliku scena jest wczytana i zastępuje aktualną zawartość canvasa.
- Przy próbie wczytania niepoprawnego lub uszkodzonego pliku wyświetlany jest toast/snackbar z komunikatem błędu; scena pozostaje niezmieniona.
- Po pomyślnym imporcie scena jest aktywna i gotowa do edycji.

---

US-035
Tytuł: Eksport sceny do PNG

Opis: Jako użytkownik chcę wyeksportować scenę jako plik PNG z białym tłem, aby udostępnić obraz pracy.

Kryteria akceptacji:
- Kliknięcie "Export PNG" otwiera modal dwukrokowy.
- Krok 1: użytkownik podaje wartość paddingu w px (pole obowiązkowe, liczba całkowita >= 0).
- Krok 2: wyświetlana jest edytowalna wysokość w px (domyślna = rzeczywista wysokość sceny w 100% zoom + padding) oraz nieedytowalna szerokość (obliczona proporcjonalnie).
- Eksportowany plik PNG ma białe tło `#ffffff`.
- Po zatwierdzeniu plik PNG jest pobierany przez przeglądarkę.
- Możliwe jest cofnięcie się do kroku 1 w celu zmiany paddingu.

---

### Historia zmian (Extended)

---

US-036
Tytuł: Cofanie ostatniej zmiany (Undo)

Opis: Jako użytkownik chcę cofnąć ostatnią zmianę na scenie skrótem Ctrl+Z.

Kryteria akceptacji:
- `Ctrl+Z` cofa ostatnią mutację stanu sceny.
- Undo jest dostępne dla wszystkich operacji: dodanie, usunięcie, edycja właściwości, przesunięcie, resize, rotate.
- Historia przechowuje do 50 kroków; przy przekroczeniu limitu najstarsza zmiana jest usuwana.
- Gdy historia jest pusta, `Ctrl+Z` nie powoduje żadnego efektu.

---

US-037
Tytuł: Ponawianie cofniętej zmiany (Redo)

Opis: Jako użytkownik chcę ponowić cofniętą zmianę skrótem Ctrl+Y.

Kryteria akceptacji:
- `Ctrl+Y` przywraca cofniętą zmianę.
- Redo jest dostępne dopóki nie zostanie wykonana nowa akcja po Undo (nowa akcja czyści stos redo).
- Gdy stos redo jest pusty, `Ctrl+Y` nie powoduje żadnego efektu.

---

### Grupowanie i warstwy (Extended)

---

US-038
Tytuł: Grupowanie kształtów

Opis: Jako użytkownik chcę zgrupować kilka zaznaczonych kształtów, aby manipulować nimi jako całością.

Kryteria akceptacji:
- Zaznaczenie co najmniej dwóch kształtów i naciśnięcie `Ctrl+G` tworzy Konva Group.
- Grupa zachowuje się jak pojedynczy obiekt: drag, resize, rotate działają na całą grupę.
- Grupy są uwzględniane w autosave i eksporcie JSON.
- Skrót `Ctrl+G` przy zaznaczeniu mniej niż dwóch kształtów nie wywołuje żadnego efektu.

---

US-039
Tytuł: Rozgrupowywanie kształtów

Opis: Jako użytkownik chcę rozgrupować zaznaczoną grupę, aby edytować jej elementy niezależnie.

Kryteria akceptacji:
- Zaznaczenie grupy i naciśnięcie `Ctrl+Shift+G` rozgrupowuje ją — kształty powracają jako niezależne obiekty.
- Po rozgrupowaniu kształty pozostają na swoich pozycjach.
- `Ctrl+Shift+G` przy zaznaczeniu niegrupowego obiektu nie wywołuje żadnego efektu.

---

US-040
Tytuł: Przeniesienie kształtu na wierzch warstwy

Opis: Jako użytkownik chcę przenieść zaznaczony kształt na wierzch wszystkich innych kształtów.

Kryteria akceptacji:
- Naciśnięcie `]` przy zaznaczonym kształcie przenosi go na wierzch warstwy (zIndex = najwyższy).
- Kształt jest widoczny ponad wszystkimi innymi kształtami na scenie.
- Operacja jest uwzględniana w historii zmian.

---

US-041
Tytuł: Przeniesienie kształtu na spód warstwy

Opis: Jako użytkownik chcę przenieść zaznaczony kształt na spód wszystkich innych kształtów.

Kryteria akceptacji:
- Naciśnięcie `[` przy zaznaczonym kształcie przenosi go na spód warstwy (zIndex = najniższy).
- Kształt jest zasłaniany przez wszystkie inne kształty na scenie.
- Operacja jest uwzględniana w historii zmian.

---

### Obsługa błędów i komunikaty

---

US-042
Tytuł: Komunikat o błędzie zapisu localStorage

Opis: Jako użytkownik chcę zostać poinformowany, gdy autosave nie powiedzie się, aby mieć świadomość utraty trwałości danych.

Kryteria akceptacji:
- Gdy zapis do localStorage nie powiedzie się, wyświetlany jest toast/snackbar z czytelnym komunikatem błędu.
- Komunikat jest widoczny przez co najmniej 3 sekundy.
- Aplikacja działa normalnie po błędzie zapisu.
- Toast nie blokuje interakcji z canvasem.

---

US-043
Tytuł: Komunikat o błędzie importu JSON

Opis: Jako użytkownik chcę zostać poinformowany, gdy import pliku JSON nie powiedzie się.

Kryteria akceptacji:
- Przy próbie wczytania uszkodzonego lub niekompatybilnego pliku JSON wyświetlany jest toast/snackbar z komunikatem błędu.
- Scena pozostaje niezmieniona po nieudanym imporcie.
- Komunikat błędu jest zrozumiały dla użytkownika (nie techniczny stack trace).

---

### Jakość i wydajność

---

US-044
Tytuł: Płynność działania przy 200 kształtach

Opis: Jako użytkownik chcę, aby aplikacja działała płynnie nawet przy dużej liczbie kształtów na scenie.

Kryteria akceptacji:
- Scena z 200 kształtami renderuje się w 60 fps na przeciętnym laptopie.
- Drag, resize i rotate przy 200 kształtach nie powodują zauważalnych lagów (> 16ms per frame).
- Zoom i pan przy 200 kształtach są płynne.

---

US-045
Tytuł: Brak błędów w konsoli przeglądarki w środowisku produkcyjnym

Opis: Jako rekruter przeglądający portfolio chcę zobaczyć aplikację działającą bez błędów konsoli, potwierdzających jakość kodu.

Kryteria akceptacji:
- Aplikacja uruchomiona na Vercel nie generuje żadnych błędów ani ostrzeżeń w konsoli przeglądarki przy normalnym użytkowaniu.
- Brak nieobsłużonych wyjątków JavaScript.
- Brak błędów sieciowych niezwiązanych z aktywnością użytkownika.

---

### Branding

---

US-046
Tytuł: Favicon i meta tagi

Opis: Jako użytkownik (i jako rekruter oceniający projekt) chcę, aby aplikacja miała poprawne meta informacje i rozpoznawalną ikonę.

Kryteria akceptacji:
- Aplikacja wyświetla favicon w formacie SVG z motywem geometrycznym.
- Tytuł karty przeglądarki to "GeoCanvas".
- Strona posiada meta tag description opisujący aplikację.
- Cały tekst UI jest w języku angielskim.

---

## 6. Metryki sukcesu

### Metryki wydajnościowe

| Metryka | Docelowa wartość |
|---|---|
| Framerate przy 200 kształtach | >= 60 fps na przeciętnym laptopie |
| Czas ładowania aplikacji (LCP) | < 3 sekundy |
| Błędy w konsoli produkcyjnej | 0 |

### Metryki jakości kodu i architektury

| Metryka | Docelowa wartość |
|---|---|
| Zarządzanie stanem | Zustand + Immer + zundo (temporal middleware) |
| Wzorce architektoniczne | Co najmniej 3 custom hooks (np. useCanvas, useKeyboard, useAutoSave) |
| Serializowalność stanu | Pełen eksport/import sceny do/z JSON |
| Historia zmian | Undo/Redo z limitem 50 kroków przez zundo |

### Metryki portfolio

| Metryka | Docelowa wartość |
|---|---|
| Dostępność live | Aplikacja działa bez błędów na Vercel |
| Dokumentacja | README zawiera opis decyzji architektonicznych |
| Zakres funkcjonalny | MVP Core ukończone jako milestone 1; MVP Extended jako milestone 2 |

### Definicja "gotowe" per milestone

MVP Core — aplikacja pozwala na tworzenie i edycję 4 typów kształtów, nawigację po scenie, edycję podstawowych właściwości w sidebarze oraz autosave/autoload z localStorage. Manipulacja kształtami odbywa się wyłącznie przez własny system uchwytów (4 uchwyty boczne + uchwyt rotacji w lewym górnym rogu) widocznych przy zaznaczeniu i przy hoveru. Działa wyłącznie na desktopie. Brak błędów konsoli.

MVP Extended — aplikacja posiada Undo/Redo, grupowanie, zarządzanie warstwami, eksport/import JSON oraz eksport PNG. Działa na urządzeniach dotykowych. Wszystkie skróty klawiaturowe działają poprawnie.
