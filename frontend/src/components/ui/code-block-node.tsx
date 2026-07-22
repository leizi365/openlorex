'use client';

import * as React from 'react';

import { formatCodeBlock, isLangSupported } from '@platejs/code-block';
import {
  BracesIcon,
  Check,
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  PaintbrushIcon,
  WrapTextIcon,
} from 'lucide-react';
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
  CODE_BLOCK_LANGUAGES,
  getCodeBlockLanguageLabel,
} from '@/lib/code-block-languages';

import {
  CODE_BLOCK_THEMES,
  type CodeBlockTheme,
  getCodeBlockTheme,
} from './code-block-themes';

type CodeBlockElementData = TCodeBlockElement & {
  theme?: CodeBlockTheme;
  wrap?: boolean;
};

type CodeBlockElementProps = PlateElementProps<CodeBlockElementData> & {
  showLanguageLabel?: boolean;
};

export function CodeBlockElement({
  showLanguageLabel = true,
  ...props
}: CodeBlockElementProps) {
  const { editor, element } = props;
  const theme = getCodeBlockTheme(element.theme);
  const readOnly = useReadOnly();
  const showMacDots = theme === 'dracula';
  const wrap = element.wrap === true;

  return (
    <PlateElement
      {...props}
      className={cn('slate-code-block my-2', props.className)}
      attributes={{
        ...props.attributes,
        'data-theme': theme,
        'data-wrap': wrap ? 'true' : 'false',
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
        className="group/code relative overflow-hidden rounded-md border"
        style={{
          backgroundColor: 'var(--code-bg)',
          borderColor: 'var(--code-border)',
        }}
      >
        <div
          className={cn(
            'pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 px-2.5 pt-2',
            'opacity-0 transition-opacity duration-150',
            'group-hover/code:pointer-events-auto group-hover/code:opacity-100',
            'group-focus-within/code:pointer-events-auto group-focus-within/code:opacity-100',
            'has-[[data-state=open]]:pointer-events-auto has-[[data-state=open]]:opacity-100'
          )}
          contentEditable={false}
        >
          <div className="min-w-0">
            {showMacDots && (
              <div className="flex items-center gap-1.5 px-1 pt-0.5">
                <span className="size-2 rounded-full bg-[#ff5f56]" />
                <span className="size-2 rounded-full bg-[#ffbd2e]" />
                <span className="size-2 rounded-full bg-[#27c93f]" />
              </div>
            )}
          </div>

          <div
            className="flex items-center gap-0.5 rounded-md border px-0.5 py-0.5 shadow-sm backdrop-blur-sm"
            style={{
              backgroundColor: 'var(--code-toolbar)',
              borderColor: 'var(--code-border)',
            }}
          >
            {!readOnly && isLangSupported(element.lang) && (
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

            {!readOnly && <CodeBlockWrapToggle />}
            {!readOnly && <CodeBlockThemePicker />}
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
          className={cn(
            'px-4 py-3.5 font-mono text-[13px] leading-[1.7] [tab-size:2] print:break-inside-avoid',
            wrap
              ? 'overflow-x-hidden whitespace-pre-wrap break-words'
              : 'overflow-x-auto whitespace-pre'
          )}
          spellCheck={false}
        >
          <code spellCheck={false}>{props.children}</code>
        </pre>
      </div>
    </PlateElement>
  );
}

function CodeBlockWrapToggle() {
  const editor = useEditorRef();
  const element = useElement<CodeBlockElementData>();
  const wrap = element.wrap === true;

  return (
    <Button
      size="icon"
      variant="ghost"
      className={cn('size-6 text-xs', wrap && 'bg-accent/60')}
      style={{ color: 'var(--code-toolbar-fg)' }}
      title={wrap ? '取消自动换行' : '自动换行'}
      aria-pressed={wrap}
      onClick={() => {
        editor.tf.setNodes({ wrap: !wrap }, { at: element });
      }}
    >
      <WrapTextIcon className="!size-3.5" />
    </Button>
  );
}

function CodeBlockThemePicker() {
  const [open, setOpen] = React.useState(false);
  const editor = useEditorRef();
  const element = useElement<CodeBlockElementData>();
  const theme = getCodeBlockTheme(element.theme);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            size="icon"
            variant="ghost"
            className="size-6 text-xs"
            style={{ color: 'var(--code-toolbar-fg)' }}
            title="代码块样式"
          />
        }
      >
        <PaintbrushIcon className="!size-3.5" />
      </PopoverTrigger>
      <PopoverContent className="w-[188px] p-1.5" align="end">
        <div className="grid grid-cols-2 gap-0.5">
          {CODE_BLOCK_THEMES.map((item) => {
            const selected = theme === item.value;

            return (
              <button
                key={item.value}
                type="button"
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-[12px] text-foreground/80 transition-colors hover:bg-accent',
                  selected && 'bg-accent text-foreground'
                )}
                onClick={() => {
                  editor.tf.setNodes({ theme: item.value }, { at: element });
                  setOpen(false);
                }}
              >
                <span
                  className="size-3 shrink-0 rounded-[3px] border border-black/10"
                  style={{ backgroundColor: item.swatch }}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
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
      CODE_BLOCK_LANGUAGES.filter(
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
            className="h-6 select-none justify-between gap-1 px-2 text-xs font-normal"
            style={{ color: 'var(--code-toolbar-fg)' }}
            aria-expanded={open}
            role="combobox"
          />
        }
      >
        {getCodeBlockLanguageLabel(value) ?? '自动'}
        <ChevronDownIcon className="!size-3 opacity-60" />
      </PopoverTrigger>
      <PopoverContent
        className="w-[200px] p-0"
        onCloseAutoFocus={() => setSearchValue('')}
      >
        <Command shouldFilter={false}>
          <CommandInput
            className="h-9"
            value={searchValue}
            onValueChange={(next) => setSearchValue(next)}
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
                  onSelect={(selected) => {
                    editor.tf.setNodes<TCodeBlockElement>(
                      { lang: selected },
                      { at: element }
                    );
                    setSearchValue(selected);
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
    <span
      className="flex h-6 select-none items-center px-2 text-xs"
      style={{ color: 'var(--code-toolbar-fg)' }}
    >
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
    if (!hasCopied) return;

    const timer = window.setTimeout(() => {
      setHasCopied(false);
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [hasCopied]);

  return (
    <Button
      onClick={() => {
        void navigator.clipboard.writeText(
          typeof value === 'function' ? value() : value
        );
        setHasCopied(true);
      }}
      title="复制"
      {...props}
    >
      <span className="sr-only">复制</span>
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
