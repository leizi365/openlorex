export type CodeBlockTheme =
  | 'default'
  | 'github'
  | 'vscode'
  | 'onedark'
  | 'dracula'
  | 'nord'
  | 'monokai'
  | 'solarized-light'
  | 'solarized-dark'
  | 'terminal';

/** Legacy theme ids kept for existing content. */
const THEME_ALIASES: Record<string, CodeBlockTheme> = {
  mac: 'dracula',
};

export const CODE_BLOCK_THEMES: {
  label: string;
  swatch: string;
  value: CodeBlockTheme;
}[] = [
  { label: '默认', value: 'default', swatch: '#f1f0ee' },
  { label: 'GitHub', value: 'github', swatch: '#0d1117' },
  { label: 'VS Code', value: 'vscode', swatch: '#1e1e1e' },
  { label: 'One Dark', value: 'onedark', swatch: '#282c34' },
  { label: 'Dracula', value: 'dracula', swatch: '#282a36' },
  { label: 'Nord', value: 'nord', swatch: '#2e3440' },
  { label: 'Monokai', value: 'monokai', swatch: '#272822' },
  { label: 'Solarized', value: 'solarized-light', swatch: '#fdf6e3' },
  { label: 'Solarized Dark', value: 'solarized-dark', swatch: '#002b36' },
  { label: '终端', value: 'terminal', swatch: '#0b0f0c' },
];

const THEME_VALUES = new Set<string>(
  CODE_BLOCK_THEMES.map((theme) => theme.value)
);

export function getCodeBlockTheme(theme?: string | null): CodeBlockTheme {
  if (!theme) return 'default';

  const resolved = THEME_ALIASES[theme] ?? theme;

  if (THEME_VALUES.has(resolved)) {
    return resolved as CodeBlockTheme;
  }

  return 'default';
}
