export type Unit = { id: number; campus: string; college: string; department: string; sort_order: number; };
export type Period = { id: number; name: string; start_date: string; end_date: string; is_open: boolean; };
export type Activity = {
  id: string; period_id: number; unit_id: number;
  degree: string; category: string; activity_type: string;
  title: string; start_date: string | null; end_date: string | null;
  country: string | null; headcount: number; note: string | null;
  reporter: string; ext: string | null; created_at: string; updated_at: string;
};
export type Submission = {
  id: string; period_id: number; unit_id: number;
  status: 'draft' | 'submitted' | 'returned';
  no_activity: boolean; submitted_by: string | null; submitted_at: string | null;
};
export type Metrics = { outbound_pax: number; conf_sessions: number; conf_pax: number; act_count?: number; };
