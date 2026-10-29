import { ref, watch } from 'vue';

type Theme = 'light' | 'dark';
const KEY = 'fl-theme';

function initial(): Theme {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // storage blocked
  }
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const theme = ref<Theme>(initial());

watch(
  theme,
  (t) => {
    document.documentElement.classList.toggle('dark', t === 'dark');
    try {
      localStorage.setItem(KEY, t);
    } catch {
      // storage blocked
    }
  },
  { immediate: true },
);

export const toggleTheme = () => (theme.value = theme.value === 'dark' ? 'light' : 'dark');
