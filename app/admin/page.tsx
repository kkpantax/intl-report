"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { METRIC_LABELS } from "@/lib/constants";

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [err, setErr] = useState("");
  const [data, setData] = useState<any>(null);
  const [pid, setPid] = useState<number | undefined>();

  useEffect(() => { supabaseBrowser.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? null)); }, []);
  useEffect(() => { if (token) load(); }, [token, pid]);

  async function login() {
    setErr("");
    const { data, error } = await supabaseBrowser.auth.signInWithPassword({ email, password: pw });
    if (error) { setErr(error.message); return; }
    setToken(data.session?.access_token ?? null);
  }
  async function load() {
    const r = await fetch(`/api/admin/summary${pid ? `?periodId=${pid}` : ""}`, { headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) { const j = await r.json(); setData(j); setPid(j.period?.id); }
  }
  async function ret(unitId: number) {
    if (!confirm("退回此系所，使其可再編輯？")) return;
    await fetch(`/api/admin/return`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ unitId, periodId: data.period.id }) });
    load();
  }
  function exportXlsx() { window.open(`/api/admin/export?periodId=${data.period.id}&t=${token}`, "_blank"); }

  if (!token) return (
    <div className="max-w-sm">
      <h1 className="text-xl font-bold mb-4">國際處後台登入</h1>
      <input className="border rounded w-full p-2 mb-2" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
      <input type="password" className="border rounded w-full p-2 mb-3" placeholder="密碼" value={pw} onChange={(e)=>setPw(e.target.value)} />
      <button onClick={login} className="bg-navy text-white rounded px-4 py-2 w-full">登入</button>
      {err && <p className="text-red-500 text-sm mt-2">{err}</p>}
      <p className="text-xs text-gray-400 mt-3">帳號於 Supabase Auth 建立。匯出請改用帶 Authorization header 的下載（見 CLAUDE.md TODO）。</p>
    </div>
  );
  if (!data) return <div>載入中…</div>;

  const mMap = new Map<number, any>(); data.metrics.forEach((m: any)=>mMap.set(m.unit_id,m));
  const sMap = new Map<number, any>(); data.subs.forEach((s: any)=>sMap.set(s.unit_id,s));
  const tot = data.units.reduce((a: any,u: any)=>{const m=mMap.get(u.id)??{};a.outbound_pax+=m.outbound_pax||0;a.conf_sessions+=m.conf_sessions||0;a.conf_pax+=m.conf_pax||0;return a;},{outbound_pax:0,conf_sessions:0,conf_pax:0});

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">後台儀表板 ・ {data.period?.name}</h1>
        <div className="flex gap-2">
          <select className="border rounded p-2 text-sm" value={pid} onChange={(e)=>setPid(Number(e.target.value))}>
            {data.periods.map((p: any)=><option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button onClick={exportXlsx} className="bg-green-700 text-white rounded px-4 py-2 text-sm">下載 Excel</button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {(["outbound_pax","conf_sessions","conf_pax"] as const).map((k)=>(
          <div key={k} className="rounded-xl bg-white border p-4"><div className="text-xs text-gray-500">{METRIC_LABELS[k]}（全校）</div><div className="text-2xl font-bold text-navy">{tot[k]}</div></div>
        ))}
      </div>
      <h2 className="font-semibold mb-2">各系所填報狀態與成效</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm bg-white border rounded-xl overflow-hidden">
          <thead className="bg-gray-50 text-gray-600"><tr>
            <th className="p-2">校區</th><th className="p-2 text-left">學院</th><th className="p-2 text-left">系所</th>
            <th className="p-2">狀態</th><th className="p-2">人次</th><th className="p-2">場次</th><th className="p-2">人數</th><th className="p-2"></th>
          </tr></thead>
          <tbody>
            {data.units.map((u: any)=>{
              const m=mMap.get(u.id)??{}; const s=sMap.get(u.id);
              const status = s?.no_activity ? "申報無活動" : (s ? {draft:"草稿",submitted:"已送出",returned:"已退回"}[s.status as string] : "未填");
              return <tr key={u.id} className="border-t">
                <td className="p-2 text-center">{u.campus}</td><td className="p-2">{u.college}</td><td className="p-2">{u.department}</td>
                <td className="p-2 text-center">{status}</td>
                <td className="p-2 text-center">{m.outbound_pax||0}</td><td className="p-2 text-center">{m.conf_sessions||0}</td><td className="p-2 text-center">{m.conf_pax||0}</td>
                <td className="p-2 text-center">{s?.status==="submitted" && <button onClick={()=>ret(u.id)} className="text-amber-600">退回</button>}</td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
