/// <reference types="vite/client" />

// ── Static asset type declarations ───────────────────────────
// Tells TypeScript that importing image/font/media files returns
// a string (the resolved public URL), resolving ts(2307):
// "Cannot find module '...' or its corresponding type declarations"

// Images
declare module '*.png'  { const src: string; export default src; }
declare module '*.jpg'  { const src: string; export default src; }
declare module '*.jpeg' { const src: string; export default src; }
declare module '*.gif'  { const src: string; export default src; }
declare module '*.webp' { const src: string; export default src; }
declare module '*.avif' { const src: string; export default src; }
declare module '*.ico'  { const src: string; export default src; }
declare module '*.bmp'  { const src: string; export default src; }

// SVG — as a URL string
declare module '*.svg'  { const src: string; export default src; }

// Fonts
declare module '*.woff'  { const src: string; export default src; }
declare module '*.woff2' { const src: string; export default src; }
declare module '*.ttf'   { const src: string; export default src; }
declare module '*.eot'   { const src: string; export default src; }
declare module '*.otf'   { const src: string; export default src; }

// Media
declare module '*.mp4'  { const src: string; export default src; }
declare module '*.webm' { const src: string; export default src; }
declare module '*.ogg'  { const src: string; export default src; }
declare module '*.mp3'  { const src: string; export default src; }
declare module '*.wav'  { const src: string; export default src; }
declare module '*.flac' { const src: string; export default src; }
declare module '*.aac'  { const src: string; export default src; }