// Set the theme before first paint (a file, not inline, so the CSP can stay strict).
try {
  const t = localStorage.getItem('fl-theme');
  if (t === 'dark' || (!t && matchMedia('(prefers-color-scheme: dark)').matches))
    document.documentElement.classList.add('dark');
} catch {}
