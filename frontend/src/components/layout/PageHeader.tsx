import * as React from 'react';
import { FileDown, Image, Link2, Share2, Smile, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

import { ColorEmoji } from '@/components/ui/color-emoji';
import { StandaloneEmojiPicker } from '@/components/ui/standalone-emoji-picker';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  getCoverSurfaceStyle,
  isCoverImage,
  normalizeCoverValue,
} from '@/features/pages/cover';
import { PAGE_COVER_COLORS } from '@/features/pages/cover-colors';
import type { PageAccess } from '@/features/pages/types';
import { SharedPageAccessLabel } from '@/components/pages/SharedPageContextBar';
import { useIsMobile } from '@/hooks/use-mobile';
import { uploadAsset } from '@/lib/api/assets';
import { getFileSizeError } from '@/lib/upload-limits';
import { cn } from '@/lib/utils';

function formatPageUpdatedAt(updatedAt: number) {
  return new Date(updatedAt).toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type PageHeaderProps = {
  icon?: string;
  coverColor?: string;
  readOnly?: boolean;
  pageId?: string;
  coverMode?: 'private' | 'public';
  updatedAt?: number | null;
  onIconChange: (icon?: string) => void;
  onCoverChange: (coverColor?: string) => void;
  onShareClick?: () => void;
  onExportWordClick?: () => void | Promise<void>;
  pageAccess?: PageAccess | null;
};

export function PageHeader({
  icon,
  coverColor,
  readOnly = false,
  pageId,
  coverMode = 'private',
  updatedAt,
  onIconChange,
  onCoverChange,
  onShareClick,
  onExportWordClick,
  pageAccess,
}: PageHeaderProps) {
  const isMobile = useIsMobile();
  const canEditCover = !readOnly && !(coverMode === 'public' && isMobile);
  const [coverOpen, setCoverOpen] = React.useState(false);
  const [iconOpen, setIconOpen] = React.useState(false);
  const [headerHovered, setHeaderHovered] = React.useState(false);
  const [coverHovered, setCoverHovered] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);

  const showPageControls = !readOnly && (headerHovered || iconOpen || coverOpen);
  const showCoverControls =
    canEditCover && (isMobile || coverHovered || coverOpen);
  const hasCover = Boolean(coverColor);
  const showAccessLabel =
    !onShareClick && Boolean(pageAccess && pageAccess.level !== 'owner');
  const hasHeaderActions = Boolean(
    onExportWordClick || onShareClick || showAccessLabel
  );

  const handleExportWord = async () => {
    if (!onExportWordClick || exporting) return;

    setExporting(true);
    try {
      await onExportWordClick();
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      className={cn(
        'relative flex w-full flex-col justify-end',
        !hasCover && 'min-h-[100px] sm:min-h-[140px]'
      )}
      onMouseEnter={() => setHeaderHovered(true)}
      onMouseLeave={() => setHeaderHovered(false)}
    >
      <div
        className={cn(
          'relative w-full transition-[height] duration-200',
          hasCover ? 'h-[30vw] max-h-[280px] min-h-[120px]' : 'h-0'
        )}
        style={getCoverSurfaceStyle(coverColor, coverMode)}
        onMouseEnter={() => setCoverHovered(true)}
        onMouseLeave={() => setCoverHovered(false)}
      >
        {hasCover && canEditCover ? (
          <div
            className={cn(
              'absolute top-3 right-3 z-20 flex gap-1 transition-opacity duration-150',
              showCoverControls
                ? 'pointer-events-auto opacity-100'
                : 'pointer-events-none opacity-0'
            )}
          >
            <Popover open={coverOpen} onOpenChange={setCoverOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-7 items-center gap-1.5 rounded-md bg-white/90 px-2 text-xs font-medium text-[rgba(55,53,47,0.65)] shadow-sm backdrop-blur-sm transition hover:bg-white"
                >
                  更换封面
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[280px] p-3">
                <CoverPicker
                  cover={coverColor}
                  pageId={pageId}
                  onSelect={(value) => {
                    onCoverChange(value);
                    if (value) setCoverOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
            <button
              type="button"
              onClick={() => onCoverChange(undefined)}
              className="inline-flex size-7 items-center justify-center rounded-md bg-white/90 text-[rgba(55,53,47,0.65)] shadow-sm backdrop-blur-sm transition hover:bg-white"
              aria-label="移除封面"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : null}
      </div>

      <div className="mx-auto w-full min-w-0 max-w-[900px] px-4 sm:px-6 md:px-12 lg:px-16">
        <div className="px-3 md:px-7">
        {icon ? (
          readOnly ? (
            <div
              className={cn(
                'relative z-10 mb-1 block rounded-md p-1',
                hasCover ? '-mt-10 sm:-mt-12' : 'mt-2'
              )}
            >
              <ColorEmoji className="drop-shadow-sm" size={78}>
                {icon}
              </ColorEmoji>
            </div>
          ) : (
            <Popover open={iconOpen} onOpenChange={setIconOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    'relative z-10 mb-1 block rounded-md p-1 transition-colors',
                    'hover:bg-black/5 focus-visible:bg-black/5 focus-visible:outline-none',
                    hasCover ? '-mt-10 sm:-mt-12' : 'mt-2'
                  )}
                  aria-label="更换知识图标"
                  title="更换图标"
                >
                  <ColorEmoji className="drop-shadow-sm" size={78}>
                    {icon}
                  </ColorEmoji>
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0">
                <StandaloneEmojiPicker
                  onSelect={(native) => {
                    onIconChange(native);
                    setIconOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          )
        ) : null}

        <div
          className={cn(
            'flex items-center gap-1 py-2',
            icon ? 'pt-1' : hasCover ? 'pt-4' : 'pt-2'
          )}
        >
          {!readOnly ? (
            <div
              className={cn(
                'flex flex-wrap items-center gap-1 transition-opacity duration-150',
                showPageControls
                  ? 'pointer-events-auto opacity-100'
                  : 'pointer-events-none opacity-0 max-md:pointer-events-auto max-md:opacity-100'
              )}
            >
              {!icon ? (
                <Popover open={iconOpen} onOpenChange={setIconOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground/80 transition-colors hover:bg-accent"
                    >
                      <Smile className="size-4 text-muted-foreground/70" />
                      添加图标
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto p-0">
                    <StandaloneEmojiPicker
                      onSelect={(native) => {
                        onIconChange(native);
                        setIconOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              ) : (
                <button
                  type="button"
                  onClick={() => onIconChange(undefined)}
                  className="inline-flex h-7 items-center rounded-md px-2 text-xs text-muted-foreground/70 transition-colors hover:bg-accent"
                >
                  移除图标
                </button>
              )}

              {!hasCover && canEditCover ? (
                <Popover open={coverOpen} onOpenChange={setCoverOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground/80 transition-colors hover:bg-accent"
                    >
                      <Image className="size-4 text-muted-foreground/70" />
                      添加封面
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-[280px] p-3">
                    <CoverPicker
                      cover={coverColor}
                      pageId={pageId}
                      onSelect={(value) => {
                        onCoverChange(value);
                        if (value) setCoverOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              ) : null}
            </div>
          ) : null}

          {hasHeaderActions ? (
            <div className="ml-auto hidden max-w-[min(100%,520px)] shrink-0 items-center gap-0.5 md:flex">
              {onExportWordClick ? (
                <button
                  type="button"
                  disabled={exporting}
                  className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground/80 transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                  onClick={() => void handleExportWord()}
                >
                  <FileDown className="size-4 text-muted-foreground/70" />
                  {exporting ? '导出中…' : '导出 Word'}
                </button>
              ) : null}
              {onShareClick ? (
                <button
                  type="button"
                  className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
                  onClick={onShareClick}
                >
                  <Share2 className="size-4 text-muted-foreground/70" />
                  分享
                </button>
              ) : null}
              {showAccessLabel && pageAccess ? (
                <SharedPageAccessLabel
                  access={pageAccess}
                  className="justify-end"
                />
              ) : null}
            </div>
          ) : null}
        </div>

        {updatedAt ? (
          <p className="pb-1 text-xs text-[rgba(55,53,47,0.45)]">
            修改于 {formatPageUpdatedAt(updatedAt)}
          </p>
        ) : null}
        </div>
      </div>
    </div>
  );
}

function CoverPicker({
  cover,
  pageId,
  onSelect,
}: {
  cover?: string;
  pageId?: string;
  onSelect: (value?: string) => void;
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = React.useState(
    isCoverImage(cover) ? cover : ''
  );
  const [uploading, setUploading] = React.useState(false);

  const applyUrl = React.useCallback(() => {
    const next = urlInput.trim();
    if (!next) {
      toast.error('请输入图片地址');
      return;
    }
    onSelect(normalizeCoverValue(next));
  }, [onSelect, urlInput]);

  const onUpload = React.useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        toast.error('请选择图片文件');
        return;
      }

      const sizeError = getFileSizeError(file);
      if (sizeError) {
        toast.error(sizeError);
        return;
      }

      setUploading(true);
      try {
        const asset = await uploadAsset(file, pageId ?? null);
        onSelect(normalizeCoverValue(asset.url));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '上传失败');
      } finally {
        setUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [onSelect, pageId]
  );

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">背景色</p>
        <div className="grid grid-cols-5 gap-2">
          {PAGE_COVER_COLORS.map((color) => {
            const isActive = color.value
              ? cover === color.value
              : !cover;

            return (
              <button
                key={color.name}
                type="button"
                title={color.name}
                onClick={() => onSelect(color.value)}
                className={cn(
                  'size-9 rounded-md border transition-transform hover:scale-105',
                  isActive
                    ? 'border-foreground ring-2 ring-foreground/20'
                    : 'border-black/10',
                  !color.value &&
                    'bg-[linear-gradient(to_bottom_right,transparent_46%,#e03e3e_48%,#e03e3e_52%,transparent_54%)] bg-white'
                )}
                style={
                  color.value ? { backgroundColor: color.value } : undefined
                }
              />
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          图片（平铺）
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => void onUpload(event.target.files?.[0])}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-sm transition-colors hover:bg-accent disabled:opacity-50"
        >
          <Upload className="size-4" />
          {uploading ? '上传中…' : '上传图片'}
        </button>

        <div className="mt-2 flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Link2 className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="url"
              value={urlInput}
              placeholder="https://… 图片地址"
              onChange={(event) => setUrlInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  applyUrl();
                }
              }}
              className="h-9 w-full rounded-md border border-input bg-background pr-3 pl-8 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          </div>
          <button
            type="button"
            onClick={applyUrl}
            className="h-9 shrink-0 rounded-md bg-[rgba(55,53,47,0.08)] px-3 text-sm font-medium text-foreground transition-colors hover:bg-[rgba(55,53,47,0.12)]"
          >
            应用
          </button>
        </div>
        {isCoverImage(cover) ? (
          <p className="mt-2 truncate text-[11px] text-muted-foreground">
            当前：{cover}
          </p>
        ) : null}
      </div>
    </div>
  );
}
