import * as React from 'react';

import emojiMartData, { type Emoji } from '@emoji-mart/data';
import { Search } from 'lucide-react';

import { ColorEmoji } from '@/components/ui/color-emoji';
import { cn } from '@/lib/utils';

const CATEGORY_LABELS: Record<string, string> = {
  people: '人物',
  nature: '自然',
  foods: '食物',
  activity: '活动',
  places: '地点',
  objects: '物品',
  symbols: '符号',
  flags: '旗帜',
};

type StandaloneEmojiPickerProps = {
  onSelect: (native: string) => void;
  className?: string;
};

export function StandaloneEmojiPicker({
  onSelect,
  className,
}: StandaloneEmojiPickerProps) {
  const [search, setSearch] = React.useState('');
  const [activeCategory, setActiveCategory] = React.useState(
    emojiMartData.categories[0]?.id ?? 'people'
  );

  const results = React.useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      const category = emojiMartData.categories.find(
        (item) => item.id === activeCategory
      );

      return (category?.emojis ?? [])
        .map((id) => emojiMartData.emojis[id])
        .filter(Boolean) as Emoji[];
    }

    return Object.values(emojiMartData.emojis)
      .filter((emoji) => {
        if (emoji.name.toLowerCase().includes(query)) return true;
        if (emoji.id.toLowerCase().includes(query)) return true;
        return emoji.keywords.some((keyword) =>
          keyword.toLowerCase().includes(query)
        );
      })
      .slice(0, 64);
  }, [activeCategory, search]);

  return (
    <div
      className={cn(
        'flex h-[23rem] w-80 flex-col rounded-xl border bg-popover text-popover-foreground shadow-md',
        className
      )}
    >
      <div className="flex gap-1 overflow-x-auto border-b px-2 py-1.5">
        {emojiMartData.categories
          .filter((category) => category.id !== 'frequent')
          .map((category) => (
            <button
              key={category.id}
              type="button"
              title={CATEGORY_LABELS[category.id] ?? category.id}
              onClick={() => {
                setSearch('');
                setActiveCategory(category.id);
              }}
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-md text-sm transition-colors',
                !search && activeCategory === category.id
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/60'
              )}
            >
              <ColorEmoji size={18}>
                {emojiMartData.emojis[category.emojis[0]]?.skins[0].native ??
                  '🙂'}
              </ColorEmoji>
            </button>
          ))}
      </div>

      <div className="relative px-2 py-2">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="搜索表情…"
          className="h-8 w-full rounded-md border bg-transparent pr-3 pl-9 text-sm outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <p className="sticky top-0 z-10 bg-popover/90 px-1 py-1 text-xs font-semibold text-muted-foreground backdrop-blur-sm">
          {search
            ? '搜索结果'
            : (CATEGORY_LABELS[activeCategory] ?? activeCategory)}
        </p>
        {results.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            未找到表情
          </p>
        ) : (
          <div className="grid grid-cols-8 gap-0.5">
            {results.map((emoji) => (
              <button
                key={emoji.id}
                type="button"
                title={emoji.name}
                onClick={() => onSelect(emoji.skins[0].native)}
                className="flex size-9 items-center justify-center rounded-md text-2xl transition-colors hover:bg-accent"
              >
                <ColorEmoji size={24}>{emoji.skins[0].native}</ColorEmoji>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
