import type { SlatePlugin, Value } from 'platejs';

import { BaseEditorKit } from '@/components/editor/editor-base-kit';

/** A4 page size in twips (1/20 pt). */
export const DOCX_A4_PAGE_SIZE = { width: 11906, height: 16838 } as const;

/**
 * System fonts that approximate the web editor stack (Geist + Noto Sans SC)
 * and remain available inside Microsoft Word.
 */
export const DOCX_FONT_FAMILY =
  "'Microsoft YaHei', 'PingFang SC', 'Hiragino Sans GB', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

/**
 * CSS appended after Plate's default DOCX_EXPORT_STYLES.
 * Tuned to mirror the wiki editor: Notion-like gray text, 14px body,
 * generous heading scale, tighter paragraph rhythm.
 */
export const DOCX_WEB_LIKE_STYLES = `
body {
  font-family: ${DOCX_FONT_FAMILY};
  font-size: 10.5pt;
  line-height: 1.75;
  color: #37352f;
  margin: 0;
  padding: 0;
}
h1, h2, h3, h4, h5, h6 {
  color: #37352f;
  font-family: ${DOCX_FONT_FAMILY};
  page-break-after: avoid;
}
h1 {
  font-size: 30pt;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.02em;
  margin: 24pt 0 6pt 0;
}
h2 {
  font-size: 16pt;
  font-weight: 600;
  line-height: 1.3;
  margin: 20pt 0 4pt 0;
}
h3 {
  font-size: 13pt;
  font-weight: 600;
  line-height: 1.3;
  margin: 16pt 0 4pt 0;
}
h4 {
  font-size: 11.5pt;
  font-weight: 600;
  line-height: 1.4;
  margin: 12pt 0 2pt 0;
}
h5 {
  font-size: 10.5pt;
  font-weight: 600;
  line-height: 1.4;
  margin: 12pt 0 2pt 0;
}
h6 {
  font-size: 10pt;
  font-weight: 600;
  line-height: 1.4;
  margin: 12pt 0 2pt 0;
}
p {
  margin: 0 0 3pt 0;
  line-height: 1.75;
  color: #37352f;
}
ul, ol {
  margin: 2pt 0 6pt 0;
  padding-left: 22pt;
}
li {
  margin: 0 0 2pt 0;
  line-height: 1.75;
}
blockquote {
  border-left: 2px solid rgba(55, 53, 47, 0.25);
  margin: 4pt 0 8pt 0;
  padding-left: 14pt;
  color: #37352f;
  font-style: italic;
}
code {
  font-family: Consolas, 'Courier New', monospace;
  font-size: 9.5pt;
  background-color: rgba(55, 53, 47, 0.06);
  padding: 1pt 3pt;
  border-radius: 3px;
  color: #37352f;
}
pre {
  font-family: Consolas, 'Courier New', monospace;
  font-size: 9.5pt;
  line-height: 1.7;
  background-color: #f7f6f3;
  border: 1px solid rgba(55, 53, 47, 0.09);
  padding: 10pt 12pt;
  margin: 6pt 0 8pt 0;
  white-space: pre-wrap;
  color: rgba(55, 53, 47, 0.9);
}
table {
  /* Border is set inline on data tables only (avoids callout tables + rgb() parse bugs). */
  border-collapse: collapse;
  border-spacing: 0;
  width: auto;
  margin: 8pt 0;
  background: transparent;
  background-color: transparent;
}
th, td {
  border: 0;
  border-width: 0;
  border-style: none;
  padding: 4pt 7pt;
  text-align: left;
  color: #37352f;
  vertical-align: top;
  background: transparent;
  background-color: transparent;
}
th {
  background: transparent;
  background-color: transparent;
  font-weight: 600;
}
a {
  color: #37352f;
  text-decoration: underline;
}
hr {
  border: none;
  border-top: 1px solid rgba(55, 53, 47, 0.16);
  margin: 14pt 0;
}
mark {
  background-color: #fbe4a0;
}
`.trim();

export const DOCX_EXPORT_OPTIONS = {
  customStyles: DOCX_WEB_LIKE_STYLES,
  fontFamily: DOCX_FONT_FAMILY,
  margins: {
    top: 1080,
    bottom: 1080,
    left: 1080,
    right: 1080,
    header: 720,
    footer: 720,
    gutter: 0,
  },
  orientation: 'portrait' as const,
  pageSize: DOCX_A4_PAGE_SIZE,
};

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
    ...DOCX_EXPORT_OPTIONS,
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
