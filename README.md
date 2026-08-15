# TRACE//BURN DEMO

TRACE//BURN is a small browser-based cyberpunk typing game built with plain HTML, CSS, and JavaScript.

Type through a hostile network, build combos, manage your trace level, and push deeper through the system. If you complete the breach with trace to spare, the run continues into **DEEP ACCESS**, where the game shifts into short alphanumeric extraction and memory challenges.

Your remote handler, **NYX**, reacts to the state of the run while the interface changes as you descend through deeper network layers.

## Play

No build step or dependencies are required.

Clone or download the repository, then open `index.html` in a modern browser.

## Features

- Arcade-style typing gameplay
- Escalating network layers and difficulty
- Combo, accuracy, WPM, trace, and breach tracking
- Cybersecurity and espionage-themed word and phrase pool
- DEEP ACCESS extraction and recall challenges
- Persistent local high scores and run statistics
- Hacker-style run ratings from **C** through **GHOST**
- Reactive NYX operator comms
- CSS-driven cyberpunk visuals and animation
- Synthesized sound effects using the Web Audio API
- Fully static and self-contained

## Deployment

TRACE//BURN is designed to run as a static site. The project can be deployed directly to services such as GitHub Pages, Netlify, Cloudflare Pages, or any basic web host.

No server-side code, database, package manager, or build process is required.

## Controls

Use the keyboard to type the active target.

- Type the first letter of a visible node to lock onto it.
- Continue typing to clear the target.
- `Esc` pauses or resumes the game.
- Follow the on-screen instructions when DEEP ACCESS begins.

## Project Structure

```text
/
├── index.html
├── css/
├── js/
└── assets/
```

## Browser Support

A recent desktop browser is recommended. The game relies on modern CSS, JavaScript, local storage, and the Web Audio API.
