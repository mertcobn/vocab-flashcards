# Vocab.

A minimal, keyboard-first flashcard app for learning English vocabulary — built with vanilla HTML, CSS, and JavaScript. No frameworks, no dependencies, no build step.

![screenshot](https://placehold.co/800x450/0e0f11/c9a55a?text=Vocab.)

## Features

- Flip cards to reveal meanings
- Mark words as **Known** or **Learning**
- Progress bar and live stats
- **Review weak words** — re-study only the ones you got wrong
- **Persistent progress** — localStorage saves your session across page refreshes
- Keyboard shortcuts for fast navigation
- Swipe gestures on mobile
- Fully responsive — works on phone, tablet, and desktop (including landscape)

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Flip card |
| `→` | Mark as Known |
| `←` | Mark as Learning |
| `Esc` | Reset session |
| `Enter` *(done screen)* | Restart |
| `R` *(done screen)* | Review weak words |

## Getting Started

Because the app fetches `words.json` via `fetch()`, it needs to be served over HTTP (not opened as a `file://` URL).

### Option 1 — Python (no install needed)

```bash
cd vocab-flashcards
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

### Option 2 — VS Code Live Server

Install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension, right-click `index.html`, and choose **Open with Live Server**.

### Option 3 — Node / npx

```bash
npx serve .
```

## Adding Words

Edit `words.json`. Each entry is a simple object:

```json
{ "word": "peculiar", "meaning": "Tuhaf, garip, kendine özgü" }
```

The app picks up changes automatically on the next page load. No build step required.

## Project Structure

```
vocab-flashcards/
├── index.html   # markup
├── style.css    # all styles (CSS custom properties, dark theme)
├── app.js       # flashcard engine (vanilla JS, no dependencies)
└── words.json   # word list
```

## License

MIT — see [LICENSE](LICENSE).
