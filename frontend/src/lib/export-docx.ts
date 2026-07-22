import type { SlatePlugin, Value } from 'platejs';

import { BaseEditorKit } from '@/components/editor/editor-base-kit';

function sanitizeFilename(name: string) {
  const trimmed = name.trim() || '未命名';
  return trimmed.replace(/[\\/:*?"<>|]/g, '_').slice(0, 120);
}

export async function exportContentToDocx(
  content: Value,
  title = '未命名'
) {
  const [{ exportToDocx }, { DocxExportKit }] = await Promise.all([
    import('@platejs/docx-io'),
    import('@/components/editor/plugins/docx-export-kit'),
  ]);

  const blob = await exportToDocx(content, {
    editorPlugins: [...BaseEditorKit, ...DocxExportKit] as unknown as SlatePlugin[],
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${sanitizeFilename(title)}.docx`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
