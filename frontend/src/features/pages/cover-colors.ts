export type PageCoverColor = {
  name: string;
  value?: string;
};

/** Notion / Potion style pastel covers + richer accents */
export function getHomeCardColor(index: number) {
  const colors = PAGE_COVER_COLORS.filter((color) => color.value).map(
    (color) => color.value!
  );
  return colors[index % colors.length];
}

export const PAGE_COVER_COLORS: PageCoverColor[] = [
  { name: '默认' },
  { name: '灰色', value: '#EBECED' },
  { name: '棕色', value: '#E9E5E3' },
  { name: '橙色', value: '#FADEC9' },
  { name: '黄色', value: '#FDECC8' },
  { name: '绿色', value: '#DBEDDB' },
  { name: '蓝色', value: '#D3E5EF' },
  { name: '紫色', value: '#E8DEEE' },
  { name: '粉色', value: '#F5E0E9' },
  { name: '红色', value: '#FFE2DD' },
  { name: '天蓝', value: '#C2E7F5' },
  { name: '薄荷', value: '#B8EAD9' },
  { name: '薰衣草', value: '#D4C6F0' },
  { name: '珊瑚', value: '#FFC9B8' },
  { name: '金色', value: '#FFE4A8' },
];
