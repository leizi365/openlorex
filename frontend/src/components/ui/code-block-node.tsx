'use client';

import * as React from 'react';

import { formatCodeBlock, isLangSupported } from '@platejs/code-block';
import { BracesIcon, Check, CheckIcon, CopyIcon, PaintbrushIcon } from 'lucide-react';
import { type TCodeBlockElement, type TCodeSyntaxLeaf, NodeApi } from 'platejs';
import {
  type PlateElementProps,
  type PlateLeafProps,
  PlateElement,
  PlateLeaf,
} from 'platejs/react';
import { useEditorRef, useElement, useReadOnly } from 'platejs/react';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/app/api/ai/command/utils';

import {
  CODE_BLOCK_THEMES,
  type CodeBlockTheme,
  getCodeBlockTheme,
} from './code-block-themes';

type CodeBlockElementData = TCodeBlockElement & {
  theme?: CodeBlockTheme;
};

type CodeBlockElementProps = PlateElementProps<CodeBlockElementData> & {
  showLanguageLabel?: boolean;
};

const codeBlockLanguages: { label: string; value: string }[] = [
  { label: '自动', value: 'auto' },
  { label: '纯文本', value: 'plaintext' },
  { label: 'ABAP', value: 'abap' },
  { label: 'Agda', value: 'agda' },
  { label: 'Arduino', value: 'arduino' },
  { label: 'ASCII Art', value: 'ascii' },
  { label: 'Assembly', value: 'x86asm' },
  { label: 'Bash', value: 'bash' },
  { label: 'BASIC', value: 'basic' },
  { label: 'BNF', value: 'bnf' },
  { label: 'C', value: 'c' },
  { label: 'C#', value: 'csharp' },
  { label: 'C++', value: 'cpp' },
  { label: 'Clojure', value: 'clojure' },
  { label: 'CoffeeScript', value: 'coffeescript' },
  { label: 'Coq', value: 'coq' },
  { label: 'CSS', value: 'css' },
  { label: 'Dart', value: 'dart' },
  { label: 'Dhall', value: 'dhall' },
  { label: 'Diff', value: 'diff' },
  { label: 'Docker', value: 'dockerfile' },
  { label: 'EBNF', value: 'ebnf' },
  { label: 'Elixir', value: 'elixir' },
  { label: 'Elm', value: 'elm' },
  { label: 'Erlang', value: 'erlang' },
  { label: 'F#', value: 'fsharp' },
  { label: 'Flow', value: 'flow' },
  { label: 'Fortran', value: 'fortran' },
  { label: 'Gherkin', value: 'gherkin' },
  { label: 'GLSL', value: 'glsl' },
  { label: 'Go', value: 'go' },
  { label: 'GraphQL', value: 'graphql' },
  { label: 'Groovy', value: 'groovy' },
  { label: 'Haskell', value: 'haskell' },
  { label: 'HCL', value: 'hcl' },
  { label: 'HTML', value: 'html' },
  { label: 'Idris', value: 'idris' },
  { label: 'Java', value: 'java' },
  { label: 'JavaScript', value: 'javascript' },
  { label: 'JSON', value: 'json' },
  { label: 'Julia', value: 'julia' },
  { label: 'Kotlin', value: 'kotlin' },
  { label: 'LaTeX', value: 'latex' },
  { label: 'Less', value: 'less' },
  { label: 'Lisp', value: 'lisp' },
  { label: 'LiveScript', value: 'livescript' },
  { label: 'LLVM IR', value: 'llvm' },
  { label: 'Lua', value: 'lua' },
  { label: 'Makefile', value: 'makefile' },
  { label: 'Markdown', value: 'markdown' },
  { label: 'Markup', value: 'markup' },
  { label: 'MATLAB', value: 'matlab' },
  { label: 'Mathematica', value: 'mathematica' },
  { label: 'Mermaid', value: 'mermaid' },
  { label: 'Nix', value: 'nix' },
  { label: 'Notion Formula', value: 'notion' },
  { label: 'Objective-C', value: 'objectivec' },
  { label: 'OCaml', value: 'ocaml' },
  { label: 'Pascal', value: 'pascal' },
  { label: 'Perl', value: 'perl' },
  { label: 'PHP', value: 'php' },
  { label: 'PowerShell', value: 'powershell' },
  { label: 'Prolog', value: 'prolog' },
  { label: 'Protocol Buffers', value: 'protobuf' },
  { label: 'PureScript', value: 'purescript' },
  { label: 'Python', value: 'python' },
  { label: 'R', value: 'r' },
  { label: 'Racket', value: 'racket' },
  { label: 'Reason', value: 'reasonml' },
  { label: 'Ruby', value: 'ruby' },
  { label: 'Rust', value: 'rust' },
  { label: 'Sass', value: 'scss' },
  { label: 'Scala', value: 'scala' },
  { label: 'Scheme', value: 'scheme' },
  { label: 'SCSS', value: 'scss' },
  { label: 'Shell', value: 'shell' },
  { label: 'Smalltalk', value: 'smalltalk' },
  { label: 'Solidity', value: 'solidity' },
  { label: 'SQL', value: 'sql' },
  { label: 'Swift', value: 'swift' },
  { label: 'TOML', value: 'toml' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'VB.Net', value: 'vbnet' },
  { label: 'Verilog', value: 'verilog' },
  { label: 'VHDL', value: 'vhdl' },
  { label: 'Visual Basic', value: 'vbnet' },
  { label: 'WebAssembly', value: 'wasm' },
  { label: 'XML', value: 'xml' },
  { label: 'YAML', value: 'yaml' },
];

function getCodeBlockLanguageLabel(lang?: string | null) {
  const value = lang?.trim();

  if (!value) return null;

  return (
    codeBlockLanguages.find((language) => language.value === value)?.label ??
    value
  );
}

export function CodeBlockElement({
  showLanguageLabel = true,
  ...props
}: CodeBlockElementProps) {
  const { editor, element } = props;
  const theme = getCodeBlockTheme(element.theme);
  const showMacDots = theme === 'mac';

  return (
    <PlateElement
      {...props}
      className={cn('slate-code-block py-1', props.className)}
      attributes={{
        ...props.attributes,
        'data-theme': theme,
        lang: 'zxx',
        spellCheck: false,
        autoCorrect: 'off',
        autoCapitalize: 'off',
        'data-gramm': 'false',
        'data-gramm_editor': 'false',
        'data-enable-grammarly': 'false',
      }}
    >
      <div
        className="relative overflow-hidden rounded-lg border shadow-sm"
        style={{
          backgroundColor: 'var(--code-bg)',
          borderColor: 'var(--code-border)',
        }}
      >
        <div
          className="flex items-center gap-2 border-b px-3 py-1.5"
          style={{
            backgroundColor: 'var(--code-toolbar)',
            borderColor: 'var(--code-border)',
          }}
          contentEditable={false}
        >
          {showMacDots ? (
            <div className="flex shrink-0 items-center gap-1.5 pr-1">
              <span className="size-2.5 rounded-full bg-[#ff5f56]" />
              <span className="size-2.5 rounded-full bg-[#ffbd2e]" />
              <span className="size-2.5 rounded-full bg-[#27c93f]" />
            </div>
          ) : (
            <div className="min-w-0 flex-1" />
          )}

          <div className="ml-auto flex items-center gap-0.5">
            {isLangSupported(element.lang) && (
              <Button
                size="icon"
                variant="ghost"
                className="size-6 text-xs"
                style={{ color: 'var(--code-toolbar-fg)' }}
                onClick={() => formatCodeBlock(editor, { element })}
                title="格式化代码"
              >
                <BracesIcon className="!size-3.5" />
              </Button>
            )}

            <CodeBlockThemePicker />
            <CodeBlockCombobox showLanguageLabel={showLanguageLabel} />

            <CopyButton
              size="icon"
              variant="ghost"
              className="size-6 gap-1 text-xs"
              style={{ color: 'var(--code-toolbar-fg)' }}
              value={() => NodeApi.string(element)}
            />
          </div>
        </div>

        <pre
          className="overflow-x-auto px-4 py-3 font-mono text-[13px] leading-[1.65] [tab-size:2] print:break-inside-avoid"
          spellCheck={false}
        >
          <code spellCheck={false}>{props.children}</code>
        </pre>
      </div>
    </PlateElement>
  );
}

function CodeBlockThemePicker() {
  const [open, setOpen] = React.useState(false);
  const readOnly = useReadOnly();
  const editor = useEditorRef();
  const element = useElement<CodeBlockElementData>();
  const theme = getCodeBlockTheme(element.theme);

  if (readOnly) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            size="sm"
            variant="ghost"
            className="h-6 gap-1 px-2 text-xs"
            style={{ color: 'var(--code-toolbar-fg)' }}
            title="代码块样式"
          />
        }
      >
        <PaintbrushIcon className="!size-3.5" />
        <span className="hidden sm:inline">
          {CODE_BLOCK_THEMES.find((item) => item.value === theme)?.label ??
            'Style'}
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-[160px] p-1" align="end">
        {CODE_BLOCK_THEMES.map((item) => (
          <button
            key={item.value}
            type="button"
            className={cn(
              'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent',
              theme === item.value && 'bg-accent'
            )}
            onClick={() => {
              editor.tf.setNodes({ theme: item.value }, { at: element });
              setOpen(false);
            }}
          >
            <CodeBlockThemePreview theme={item.value} />
            {item.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function CodeBlockThemePreview({ theme }: { theme: CodeBlockTheme }) {
  if (theme === 'mac') {
    return (
      <span className="flex items-center gap-0.5 rounded bg-[#282a36] px-1 py-0.5">
        <span className="size-1.5 rounded-full bg-[#ff5f56]" />
        <span className="size-1.5 rounded-full bg-[#ffbd2e]" />
        <span className="size-1.5 rounded-full bg-[#27c93f]" />
      </span>
    );
  }

  const colors: Record<CodeBlockTheme, string> = {
    default: '#f7f6f3',
    github: '#0d1117',
    mac: '#282a36',
    terminal: '#0b0f0c',
  };

  return (
    <span
      className="size-3.5 rounded-sm border border-black/10"
      style={{ backgroundColor: colors[theme] }}
    />
  );
}

function CodeBlockCombobox({
  showLanguageLabel,
}: {
  showLanguageLabel: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const readOnly = useReadOnly();
  const editor = useEditorRef();
  const element = useElement<CodeBlockElementData>();
  const value = element.lang || 'auto';
  const [searchValue, setSearchValue] = React.useState('');

  const items = React.useMemo(
    () =>
      codeBlockLanguages.filter(
        (language) =>
          !searchValue ||
          language.label.toLowerCase().includes(searchValue.toLowerCase())
      ),
    [searchValue]
  );

  if (readOnly) {
    if (!showLanguageLabel) return null;

    return <CodeBlockLanguageLabel lang={element.lang} />;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            size="sm"
            variant="ghost"
            className="h-6 select-none justify-between gap-1 px-2 text-xs"
            style={{ color: 'var(--code-toolbar-fg)' }}
            aria-expanded={open}
            role="combobox"
          />
        }
      >
        {getCodeBlockLanguageLabel(value) ?? 'Auto'}
      </PopoverTrigger>
      <PopoverContent
        className="w-[200px] p-0"
        onCloseAutoFocus={() => setSearchValue('')}
      >
        <Command shouldFilter={false}>
          <CommandInput
            className="h-9"
            value={searchValue}
            onValueChange={(value) => setSearchValue(value)}
            placeholder="搜索语言…"
          />
          <CommandEmpty>未找到语言</CommandEmpty>

          <CommandList className="h-[344px] overflow-y-auto">
            <CommandGroup>
              {items.map((language) => (
                <CommandItem
                  key={language.label}
                  className="cursor-pointer"
                  value={language.value}
                  onSelect={(value) => {
                    editor.tf.setNodes<TCodeBlockElement>(
                      { lang: value },
                      { at: element }
                    );
                    setSearchValue(value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      value === language.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {language.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function CodeBlockLanguageLabel({ lang }: { lang?: string | null }) {
  const label = getCodeBlockLanguageLabel(lang);

  if (!label) return null;

  return (
    <span className="flex h-6 select-none items-center px-2 text-muted-foreground text-xs">
      {label}
    </span>
  );
}

function CopyButton({
  value,
  ...props
}: { value: (() => string) | string } & Omit<
  React.ComponentProps<typeof Button>,
  'value'
>) {
  const [hasCopied, setHasCopied] = React.useState(false);

  React.useEffect(() => {
    setTimeout(() => {
      setHasCopied(false);
    }, 2000);
  }, [hasCopied]);

  return (
    <Button
      onClick={() => {
        void navigator.clipboard.writeText(
          typeof value === 'function' ? value() : value
        );
        setHasCopied(true);
      }}
      {...props}
    >
      <span className="sr-only">Copy</span>
      {hasCopied ? (
        <CheckIcon className="!size-3" />
      ) : (
        <CopyIcon className="!size-3" />
      )}
    </Button>
  );
}

export function CodeLineElement(props: PlateElementProps) {
  return (
    <PlateElement
      {...props}
      attributes={{
        ...props.attributes,
        lang: 'zxx',
        spellCheck: false,
        autoCorrect: 'off',
        autoCapitalize: 'off',
      }}
    />
  );
}

export function CodeSyntaxLeaf(props: PlateLeafProps<TCodeSyntaxLeaf>) {
  const tokenClassName = props.leaf.className as string | undefined;

  return (
    <PlateLeaf
      {...props}
      className={cn('font-mono', tokenClassName, props.className)}
    >
      {props.children}
    </PlateLeaf>
  );
}
