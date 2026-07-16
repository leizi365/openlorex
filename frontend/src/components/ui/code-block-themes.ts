export type CodeBlockTheme = 'default' | 'mac' | 'github' | 'terminal';

export const CODE_BLOCK_THEMES: {
  label: string;
  value: CodeBlockTheme;
}[] = [
  { label: '默认', value: 'default' },
  { label: 'Mac', value: 'mac' },
  { label: 'GitHub', value: 'github' },
  { label: '终端', value: 'terminal' },
];

export function getCodeBlockTheme(
  theme?: string | null
): CodeBlockTheme {
  if (
    theme === 'mac' ||
    theme === 'github' ||
    theme === 'terminal' ||
    theme === 'default'
  ) {
    return theme;
  }

  return 'default';
}
