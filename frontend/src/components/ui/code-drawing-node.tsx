'use client';

import * as React from 'react';

import type {
  CodeDrawingType,
  TCodeDrawingElement,
  ViewMode,
} from '@platejs/code-drawing';
import {
  VIEW_MODE,
  DEFAULT_MIN_HEIGHT,
  CODE_DRAWING_TYPE_ARRAY,
  renderCodeDrawing,
  RENDER_DEBOUNCE_DELAY,
  downloadImage,
  DOWNLOAD_FILENAME,
} from '@platejs/code-drawing';
import type { PlateElementProps } from 'platejs/react';
import {
  PlateElement,
  useEditorRef,
  useEditorSelector,
  useElement,
  useFocusedLast,
  useReadOnly,
  useSelected,
} from 'platejs/react';
import debounce from 'lodash/debounce.js';
import { Code2, ImageIcon, Trash2, DownloadIcon, Columns2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2;
const ZOOM_STEP = 0.1;
const ZOOM_DEFAULT = 1;

function clampZoom(value: number) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(value * 10) / 10));
}

function createDebouncedCodeDrawingRenderer(
  setImage: React.Dispatch<React.SetStateAction<string>>,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>
) {
  let lastRequestId = 0;

  return debounce(
    async (code: string | undefined, drawingType: string | undefined) => {
      lastRequestId += 1;
      const requestId = lastRequestId;

      if (!code?.trim() || !drawingType) {
        setImage('');
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const imageData = await renderCodeDrawing(
          drawingType as CodeDrawingType,
          code
        );

        if (lastRequestId === requestId) {
          setImage(imageData);
          setError(null);
        }
      } catch (err) {
        if (lastRequestId === requestId) {
          setError(err instanceof Error ? err.message : '渲染失败');
          setImage('');
        }
      } finally {
        if (lastRequestId === requestId) {
          setLoading(false);
        }
      }
    },
    RENDER_DEBOUNCE_DELAY
  );
}

function useCodeDrawingElement({ element }: { element: TCodeDrawingElement }) {
  const editor = useEditorRef();
  const readOnly = useReadOnly();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [image, setImage] = React.useState<string>('');

  const debouncedRender = React.useMemo(
    () => createDebouncedCodeDrawingRenderer(setImage, setLoading, setError),
    []
  );

  React.useEffect(() => {
    debouncedRender(element.data?.code, element.data?.drawingType);

    return () => {
      debouncedRender.cancel();
    };
  }, [element.data?.code, element.data?.drawingType, debouncedRender]);

  const removeNode = () => {
    if (readOnly) return;

    const path = editor.api.findPath(element);
    if (path) {
      editor.tf.removeNodes({ at: path });
    }
  };

  return {
    loading,
    error,
    image,
    removeNode,
  };
}

export function CodeDrawingElement(
  props: PlateElementProps<TCodeDrawingElement>
) {
  const { children } = props;
  const isMobile = useIsMobile();
  const editor = useEditorRef();
  const readOnly = useReadOnly();
  const selected = useSelected();
  const isFocusedLast = useFocusedLast();
  const element = useElement<TCodeDrawingElement>();
  const { removeNode, image, loading } = useCodeDrawingElement({ element });

  const handleDownload = React.useCallback(() => {
    if (!image) return;
    downloadImage(image, DOWNLOAD_FILENAME);
  }, [image]);

  const handleCodeChange = React.useCallback(
    (code: string) => {
      const path = editor.api.findPath(element);
      if (path) {
        editor.tf.setNodes(
          {
            data: {
              ...element.data,
              code,
            },
          },
          { at: path }
        );
      }
    },
    [editor, element]
  );

  const handleDrawingTypeChange = React.useCallback(
    (drawingType: CodeDrawingType) => {
      const path = editor.api.findPath(element);
      if (path) {
        editor.tf.setNodes(
          {
            data: {
              ...element.data,
              drawingType,
            },
          },
          { at: path }
        );
      }
    },
    [editor, element]
  );

  const handleDrawingModeChange = React.useCallback(
    (drawingMode: ViewMode) => {
      const path = editor.api.findPath(element);
      if (path) {
        editor.tf.setNodes(
          {
            data: {
              ...element.data,
              drawingMode,
            },
          },
          { at: path }
        );
      }
    },
    [editor, element]
  );

  const code = element.data?.code ?? '';
  const drawingType = element.data?.drawingType ?? 'Mermaid';
  const drawingMode = element.data?.drawingMode ?? 'Both';

  const selectionCollapsed = useEditorSelector(
    (editor) => !editor.api.isExpanded(),
    []
  );

  const open = isFocusedLast && !readOnly && selected && selectionCollapsed;

  const content = (
    <PlateElement {...props}>
      <div contentEditable={false}>
        <div>
          <CodeDrawingPreview
            code={code}
            drawingType={drawingType}
            drawingMode={drawingMode}
            image={image}
            loading={loading}
            onCodeChange={handleCodeChange}
            onDrawingTypeChange={handleDrawingTypeChange}
            onDrawingModeChange={handleDrawingModeChange}
            readOnly={readOnly}
            isMobile={isMobile}
          />
        </div>
      </div>
      {children}
    </PlateElement>
  );

  if (readOnly) {
    return content;
  }

  return (
    <Popover open={open} modal={false}>
      <PopoverAnchor>{content}</PopoverAnchor>
      <PopoverContent
        className="w-auto p-1"
        contentEditable={false}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex items-center gap-1">
          {image && (
            <Button
              size="icon"
              variant="ghost"
              className="size-8"
              onClick={handleDownload}
              title="导出"
            >
              <DownloadIcon className="size-4" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="size-8"
            onClick={removeNode}
            title="删除"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CodeDrawingPreview({
  code,
  drawingType,
  drawingMode,
  image,
  loading,
  onCodeChange,
  onDrawingTypeChange,
  onDrawingModeChange,
  readOnly = false,
  isMobile = false,
}: {
  code: string;
  drawingType: CodeDrawingType;
  drawingMode: ViewMode;
  image: string;
  loading: boolean;
  onCodeChange: (code: string) => void;
  onDrawingTypeChange: (type: CodeDrawingType) => void;
  onDrawingModeChange: (mode: ViewMode) => void;
  readOnly?: boolean;
  isMobile?: boolean;
}) {
  const viewMode = drawingMode;
  const showCode = viewMode === VIEW_MODE.Both || viewMode === VIEW_MODE.Code;
  const showImage = viewMode === VIEW_MODE.Both || viewMode === VIEW_MODE.Image;
  const showBorder = viewMode === VIEW_MODE.Both;
  const [zoom, setZoom] = React.useState(ZOOM_DEFAULT);

  React.useEffect(() => {
    setZoom(ZOOM_DEFAULT);
  }, [image, drawingType]);

  const handleCodeChange = React.useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onCodeChange(e.target.value);
    },
    [onCodeChange]
  );

  return (
    <div
      className="my-4 w-full overflow-hidden rounded-lg border bg-muted/50"
      style={{
        minHeight: `${DEFAULT_MIN_HEIGHT}px`,
      }}
    >
      <CodeDrawingHeader
        drawingType={drawingType}
        viewMode={viewMode}
        readOnly={readOnly}
        showZoom={showImage && !!image}
        zoom={zoom}
        onZoomChange={setZoom}
        onDrawingTypeChange={onDrawingTypeChange}
        onDrawingModeChange={onDrawingModeChange}
      />

      <div
        className={cn(
          'flex items-stretch',
          isMobile ? 'flex-col-reverse' : 'flex-row'
        )}
      >
        {showCode && (
          <CodeDrawingTextarea
            code={code}
            readOnly={readOnly}
            isMobile={isMobile}
            showBorder={showBorder}
            onCodeChange={handleCodeChange}
          />
        )}

        {viewMode !== VIEW_MODE.Code && (
          <CodeDrawingPreviewArea
            image={image}
            loading={loading}
            code={code}
            viewMode={viewMode}
            zoom={zoom}
            onZoomChange={setZoom}
            isMobile={isMobile}
            showBorder={showBorder}
          />
        )}
      </div>
    </div>
  );
}

function CodeDrawingHeader({
  drawingType,
  viewMode,
  readOnly = false,
  showZoom = false,
  zoom,
  onZoomChange,
  onDrawingTypeChange,
  onDrawingModeChange,
}: {
  drawingType: CodeDrawingType;
  viewMode: ViewMode;
  readOnly?: boolean;
  showZoom?: boolean;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onDrawingTypeChange: (type: CodeDrawingType) => void;
  onDrawingModeChange: (mode: ViewMode) => void;
}) {
  const [languageSelectOpen, setLanguageSelectOpen] = React.useState(false);

  const viewModes = [
    {
      value: VIEW_MODE.Both,
      label: '分栏',
      icon: Columns2,
    },
    {
      value: VIEW_MODE.Code,
      label: '代码',
      icon: Code2,
    },
    {
      value: VIEW_MODE.Image,
      label: '视图',
      icon: ImageIcon,
    },
  ] as const;

  return (
    <div
      role="toolbar"
      className="flex items-center gap-2 border-b bg-muted/80 px-3 py-1.5"
      contentEditable={false}
    >
      {readOnly ? (
        <span className="text-xs font-medium text-muted-foreground">
          {drawingType}
        </span>
      ) : (
        <Select
          value={drawingType}
          onValueChange={onDrawingTypeChange}
          open={languageSelectOpen}
          onOpenChange={setLanguageSelectOpen}
        >
          <SelectTrigger className="h-7 w-[120px] border-0 bg-background/70 text-xs shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-[100]">
            {CODE_DRAWING_TYPE_ARRAY.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="flex-1" />

      {showZoom && (
        <div className="flex items-center gap-0.5 rounded-md border bg-background/70 p-0.5">
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            className="size-6"
            disabled={zoom <= ZOOM_MIN}
            onClick={() => onZoomChange(clampZoom(zoom - ZOOM_STEP))}
            title="缩小"
          >
            <ZoomOut className="size-3" />
          </Button>
          <span className="min-w-10 text-center text-xs text-muted-foreground tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            className="size-6"
            disabled={zoom >= ZOOM_MAX}
            onClick={() => onZoomChange(clampZoom(zoom + ZOOM_STEP))}
            title="放大"
          >
            <ZoomIn className="size-3" />
          </Button>
          {zoom !== ZOOM_DEFAULT && (
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              className="size-6"
              onClick={() => onZoomChange(ZOOM_DEFAULT)}
              title="重置缩放"
            >
              <RotateCcw className="size-3" />
            </Button>
          )}
        </div>
      )}

      <div className="flex items-center rounded-md border bg-background/70 p-0.5">
        {viewModes.map(({ value, label, icon: Icon }) => (
          <Button
            key={value}
            type="button"
            size="xs"
            variant={viewMode === value ? 'secondary' : 'ghost'}
            className="h-6 gap-1 px-2 text-xs"
            disabled={readOnly}
            onClick={() => onDrawingModeChange(value)}
            title={label}
          >
            <Icon className="size-3" />
            <span>{label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}

function CodeDrawingTextarea({
  code,
  readOnly = false,
  isMobile = false,
  showBorder = false,
  onCodeChange,
}: {
  code: string;
  readOnly?: boolean;
  isMobile?: boolean;
  showBorder?: boolean;
  onCodeChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const [internalCode, setInternalCode] = React.useState(code);
  const lastExternalCodeRef = React.useRef(code);

  React.useEffect(() => {
    if (code !== lastExternalCodeRef.current) {
      lastExternalCodeRef.current = code;
      setInternalCode(code);
    }
  }, [code]);

  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setInternalCode(newValue);
      onCodeChange(e);
    },
    [onCodeChange]
  );

  return (
    <div
      className={cn(
        'min-w-0 flex-1',
        showBorder && !isMobile && 'border-r'
      )}
    >
      <div className="relative flex-1 rounded-md">
        <pre
          className="m-0 overflow-x-auto p-4 font-mono text-sm leading-[normal] [tab-size:2] print:break-inside-avoid"
          style={{ minHeight: `${DEFAULT_MIN_HEIGHT - 40}px`, height: '100%' }}
        >
          <code className="block h-full w-full">
            <textarea
              ref={textareaRef}
              value={internalCode}
              onChange={handleChange}
              readOnly={readOnly}
              className="m-0 h-full w-full resize-none overflow-auto border-0 bg-transparent p-0 font-mono text-sm outline-none"
              style={{ minHeight: `${DEFAULT_MIN_HEIGHT - 40}px` }}
              placeholder="在此输入代码…"
              spellCheck={false}
            />
          </code>
        </pre>
      </div>
    </div>
  );
}

function CodeDrawingPreviewArea({
  image,
  loading,
  code,
  viewMode,
  zoom,
  onZoomChange,
  isMobile = false,
  showBorder = false,
}: {
  image: string;
  loading: boolean;
  code: string;
  viewMode: ViewMode;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  isMobile?: boolean;
  showBorder?: boolean;
}) {
  const showImage = viewMode === VIEW_MODE.Both || viewMode === VIEW_MODE.Image;

  const handleWheel = React.useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (!image || (!event.ctrlKey && !event.metaKey)) return;

      event.preventDefault();
      const delta = event.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      onZoomChange(clampZoom(zoom + delta));
    },
    [image, onZoomChange, zoom]
  );

  return (
    <div
      className={cn(
        'flex min-w-0 flex-1 flex-col',
        showBorder && isMobile && 'border-b'
      )}
    >
      {showImage ? (
        <div
          className="flex flex-1 overflow-auto bg-muted/30 p-4"
          onWheel={handleWheel}
        >
          {loading && (
            <div className="flex min-h-[200px] w-full items-center justify-center text-muted-foreground">
              Loading...
            </div>
          )}
          {!loading && image && (
            <div className="mx-auto w-full min-w-0">
              <img
                src={image}
                alt="流程图"
                className="mx-auto block h-auto object-contain"
                style={{
                  width: `${zoom * 100}%`,
                  maxWidth: 'none',
                }}
                draggable={false}
              />
            </div>
          )}
          {!loading && !image && (
            <div className="flex min-h-[200px] w-full items-center justify-center text-muted-foreground">
              {code.trim() ? '渲染中…' : '预览将显示在此处'}
            </div>
          )}
        </div>
      ) : (
        <div className="pointer-events-none flex flex-1 items-center justify-center bg-muted/30 p-4 opacity-0">
          {/* Placeholder to maintain height */}
        </div>
      )}
    </div>
  );
}
