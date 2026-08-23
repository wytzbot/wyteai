// ---------------------------------------------------------------------------
// Minimal inline icon set (stroke-based, 24x24) used throughout the UI.
// ---------------------------------------------------------------------------
const wrap = (inner, size = 20) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

export const Icon = {
  sparkle: (s) => wrap(`<path d="M12 3l1.8 4.8L18.6 9.6 13.8 11.4 12 16.2 10.2 11.4 5.4 9.6 10.2 7.8 12 3z"/><path d="M19 15l.8 2.1L22 18l-2.2.9L19 21l-.8-2.1L16 18l2.2-.9L19 15z"/>`, s),
  bulb: (s) => wrap(`<path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a6 6 0 0 0-4 10.4c.7.6 1.1 1.1 1.2 2.1h5.6c.1-1 .5-1.5 1.2-2.1A6 6 0 0 0 12 2z"/>`, s),
  grid: (s) => wrap(`<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>`, s),
  gallery: (s) => wrap(`<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="9" r="1.6"/><path d="M21 16l-5.5-5.5L3 22"/>`, s),
  folder: (s) => wrap(`<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/>`, s),
  brand: (s) => wrap(`<path d="M4 4h9l7 7-9 9-7-7V4z"/><circle cx="9" cy="9" r="1.4"/>`, s),
  bolt: (s) => wrap(`<path d="M12 2 4 14h6l-1 8 9-13h-6l1-7z"/>`, s),
  settings: (s) => wrap(`<circle cx="12" cy="12" r="3.2"/><path d="M19.4 13.5a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V19a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H5a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H11a1.7 1.7 0 0 0 1-1.5V5a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V11a1.7 1.7 0 0 0 1.5 1H19a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>`, s),
  logout: (s) => wrap(`<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>`, s),
  menu: (s) => wrap(`<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/>`, s),
  menuOpen: (s) => wrap(`<path d="M4 7h10"/><path d="M4 12h16"/><path d="M4 17h10"/><path d="M17 15l3-3-3-3"/>`, s),
  google: (s) => wrap(`<path d="M21 12.2c0-.7-.1-1.4-.2-2H12v3.9h5a4.3 4.3 0 0 1-1.9 2.8v2.3h3A9 9 0 0 0 21 12.2z" fill="#4285F4" stroke="none"/><path d="M12 21c2.4 0 4.5-.8 6-2.2l-3-2.3c-.8.6-1.9.9-3 .9-2.3 0-4.3-1.6-5-3.7H4v2.3A9 9 0 0 0 12 21z" fill="#34A853" stroke="none"/><path d="M7 13.7a5.4 5.4 0 0 1 0-3.4V8H4a9 9 0 0 0 0 8l3-2.3z" fill="#FBBC05" stroke="none"/><path d="M12 6.6c1.3 0 2.5.5 3.4 1.3l2.6-2.6C16.5 3.7 14.4 3 12 3a9 9 0 0 0-8 4.9l3 2.3c.7-2 2.7-3.6 5-3.6z" fill="#EA4335" stroke="none"/>`, s),
  image: (s) => wrap(`<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="9" r="1.6"/><path d="M21 16l-5.5-5.5L3 22"/>`, s),
  aspect: (s) => wrap(`<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M8 15l3-3 2 2 4-4"/>`, s),
  check: (s) => wrap(`<circle cx="12" cy="12" r="9"/><path d="M8.5 12.3l2.4 2.4L16 9.6"/>`, s),
  shield: (s) => wrap(`<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"/>`, s),
  gavel: (s) => wrap(`<path d="M13 8l4 4"/><path d="M9 12l6.5 6.5"/><path d="M4 20l5-5"/><path d="M15 5l4 4"/><path d="M17 3l4 4-3 3-4-4z"/>`, s),
  lock: (s) => wrap(`<rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>`, s),
  help: (s) => wrap(`<circle cx="12" cy="12" r="9"/><path d="M9.5 9.2a2.5 2.5 0 1 1 3.7 2.2c-.9.5-1.2 1-1.2 2"/><circle cx="12" cy="17" r="0.4" fill="currentColor"/>`, s),
  chevronLeft: (s) => wrap(`<path d="M15 18l-6-6 6-6"/>`, s),
  close: (s) => wrap(`<path d="M6 6l12 12"/><path d="M18 6L6 18"/>`, s),
  user: (s) => wrap(`<circle cx="12" cy="8" r="3.4"/><path d="M5 20c1-3.6 3.8-5.6 7-5.6s6 2 7 5.6"/>`, s),
};
