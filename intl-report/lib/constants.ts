// 大類（DB 存值 → 顯示標籤）
export const CATEGORIES = [
  { value: '出國交流', label: '出國交流' },
  { value: '研討會工作營工作坊', label: '研討會 / 工作營 / 工作坊' },
] as const;

// 大類 → 可選的活動類型（連動下拉）
export const TYPES_BY_CATEGORY: Record<string, string[]> = {
  '出國交流': ['移地教學', '文化交流團', '國際參訪', '境外實習', '境外工作營', '國際競賽及展演'],
  '研討會工作營工作坊': ['國際研討會', '工作營', '工作坊'],
};

export const DEGREES = ['學士', '碩士', '博士', '碩士在職專班'] as const;
export const CAMPUSES = ['台北', '高雄'] as const;

export const METRIC_LABELS = {
  outbound_pax: '出國交流人次',
  conf_sessions: '研討會/工作營/工作坊場次',
  conf_pax: '研討會/工作營/工作坊人數',
} as const;
