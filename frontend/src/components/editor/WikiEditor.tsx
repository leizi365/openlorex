import * as React from 'react';
import type { Value } from 'platejs';
import { Plate, usePlateEditor } from 'platejs/react';

import { EditorKit } from '@/components/editor/editor-kit';
import { PageOutlineNav } from '@/components/pages/PageOutlineNav';
import { Editor, EditorContainer } from '@/components/ui/editor';

type WikiEditorProps = {
  pageId: string;
  value: Value;
  onChange: (value: Value) => void;
  readOnly?: boolean;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
};

export function WikiEditor({
  pageId,
  value,
  onChange,
  readOnly = false,
  scrollContainerRef,
}: WikiEditorProps) {
  const editor = usePlateEditor(
    {
      id: pageId,
      plugins: EditorKit,
      value,
    },
    [pageId]
  );

  return (
    <Plate
      editor={editor}
      readOnly={readOnly}
      onChange={({ value: nextValue }) => {
        if (!readOnly) {
          onChange(nextValue);
        }
      }}
    >
      <div className="relative w-full">
        <div className="pointer-events-none sticky top-2 z-20 hidden h-0 w-full md:top-4 md:block">
          <PageOutlineNav scrollContainerRef={scrollContainerRef} />
        </div>
        <div className="mx-auto w-full min-w-0 max-w-[900px] overflow-x-clip px-4 pb-24 pt-2 sm:px-6 sm:pt-4 md:px-12 md:pb-40 md:pt-4 lg:px-16">
          <EditorContainer
            variant="default"
            className="min-h-[60vh] overflow-y-visible"
          >
            <Editor
              variant="none"
              readOnly={readOnly}
              className="size-full overflow-x-hidden px-3 pt-0 pb-24 text-base leading-[1.5] text-[rgba(55,53,47,1)] caret-[#2383e2] selection:bg-[rgba(35,131,226,0.14)] [font-variant-emoji:text] md:px-7 [&_h1]:mb-2 [&_h1]:mt-0 [&_h1]:text-[28px] [&_h1]:font-bold [&_h1]:leading-[1.2] [&_h1]:tracking-[-0.03em] sm:[&_h1]:text-[34px] md:[&_h1]:text-[40px] [&_h2]:mb-1 [&_h2]:mt-[1.4em] [&_h2]:text-[1.35em] [&_h2]:font-semibold md:[&_h2]:text-[1.5em] [&_h3]:mb-1 [&_h3]:mt-[1em] [&_h3]:text-[1.15em] [&_h3]:font-semibold md:[&_h3]:text-[1.25em] [&_p]:my-[1px]"
              placeholder={readOnly ? '只读知识' : "输入 '/' 打开命令菜单…"}
            />
          </EditorContainer>
        </div>
      </div>
    </Plate>
  );
}
