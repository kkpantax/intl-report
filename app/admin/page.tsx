"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { METRIC_LABELS, CAMPUSES } from "@/lib/constants";

type Tab = "overview" | "accounts" | "units" | "periods" | "options";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "總覽" },
  { key: "accounts", label: "帳號管理" },
  { key: "units", label: "填報系所管理" },
  { key: "periods", label: "期數管理" },
  { key: "options", label: "選項管理" },
];

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [err, setErr] = useState("");
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => { supabaseBrowser.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? null)); }, []);

  async function login() {
    setErr("");
    const { data, error } = await supabaseBrowser.auth.signInWithPassword({ email, password: pw });
    if (error) { setErr(error.message); return; }
    setToken(data.session?.access_token ?? null);
  }
  async function logout() {
    await supabaseBrowser.auth.signOut();
    setToken(null); setEmail(""); setPw("");
  }

  if (!token) return (
    <div className="max-w-sm">
      <h1 className="text-xl font-bold mb-4">國際事務處後台登入</h1>
      <input className="border rounded w-full p-2 mb-2" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
      <input type="password" className="border rounded w-full p-2 mb-3" placeholder="密碼" value={pw} onChange={(e)=>setPw(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&login()} />
      <button onClick={login} className="bg-navy text-white rounded px-4 py-2 w-full">登入</button>
      {err && <p className="text-red-500 text-sm mt-2">{err}</p>}
      <Link href="/" className="block text-center text-sm text-navy mt-4">← 回入口</Link>
    </div>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h1 className="text-xl font-bold">後台儀表板</h1>
        <div className="flex gap-2 text-sm">
          <Link href="/" className="border rounded px-3 py-2 hover:bg-gray-50">回入口</Link>
          <Link href="/report" className="border rounded px-3 py-2 hover:bg-gray-50">系所填報</Link>
          <button onClick={logout} className="border rounded px-3 py-2 text-red-600 hover:bg-red-50">登出</button>
        </div>
      </div>

      <div className="flex gap-1 border-b mb-5">
        {TABS.map((t)=>(
          <button key={t.key} onClick={()=>setTab(t.key)}
            className={`px-4 py-2 text-sm -mb-px border-b-2 ${tab===t.key?"border-navy text-navy font-semibold":"border-transparent text-gray-500 hover:text-navy"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab==="overview" && <Overview token={token} />}
      {tab==="accounts" && <Accounts token={token} />}
      {tab==="units" && <Units token={token} />}
      {tab==="periods" && <Periods token={token} />}
      {tab==="options" && <Options token={token} />}
    </div>
  );
}

// ============ 總覽 ============
function Overview({ token }: { token: string }) {
  const [data, setData] = useState<any>(null);
  const [pid, setPid] = useState<number | undefined>();
  const [updatedAt, setUpdatedAt] = useState<string>("");

  const load = useCallback(async () => {
    const r = await fetch(`/api/admin/summary${pid ? `?periodId=${pid}` : ""}`, { headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) { const j = await r.json(); setData(j); setPid(j.period?.id); setUpdatedAt(new Date().toLocaleTimeString("zh-TW")); }
  }, [token, pid]);
  useEffect(() => { load(); }, [load]);

  // 每 30 秒自動更新，不必等各系送出即可看到目前進度。
  useEffect(() => { const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  async function ret(unitId: number) {
    if (!confirm("退回此系所，使其可再編輯？")) return;
    await fetch(`/api/admin/return`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ unitId, periodId: data.period.id }) });
    load();
  }
  function exportXlsx() { window.open(`/api/admin/export?periodId=${data.period.id}&t=${token}`, "_blank"); }

  if (!data) return <div>載入中…</div>;
  const mMap = new Map<number, any>(); data.metrics.forEach((m: any)=>mMap.set(m.unit_id,m));
  const sMap = new Map<number, any>(); data.subs.forEach((s: any)=>sMap.set(s.unit_id,s));
  const tot = data.units.reduce((a: any,u: any)=>{const m=mMap.get(u.id)??{};a.outbound_pax+=m.outbound_pax||0;a.conf_sessions+=m.conf_sessions||0;a.conf_pax+=m.conf_pax||0;return a;},{outbound_pax:0,conf_sessions:0,conf_pax:0});

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="text-sm text-gray-600">
          期別：<span className="font-semibold">{data.period?.name}</span>
          {updatedAt && <span className="ml-3 text-xs text-gray-400">最後更新 {updatedAt} ・ 每 30 秒自動更新</span>}
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="border rounded px-3 py-2 text-sm hover:bg-gray-50">立即更新</button>
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
              const status = s?.no_activity ? "申報無活動"
                : s?.status==="submitted" ? "已送出"
                : s?.status==="returned" ? "已退回"
                : (m.act_count ?? 0) > 0 ? "填報中"
                : "未填";
              const statusCls = status==="填報中" ? "text-amber-600 font-medium"
                : status==="已送出" ? "text-green-700 font-medium"
                : status==="已退回" ? "text-red-600" : "text-gray-500";
              return <tr key={u.id} className="border-t">
                <td className="p-2 text-center">{u.campus}</td><td className="p-2">{u.college}</td><td className="p-2">{u.department}</td>
                <td className={`p-2 text-center ${statusCls}`}>{status}</td>
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

// ============ 帳號管理 ============
function Accounts({ token }: { token: string }) {
  const [users, setUsers] = useState<any[]>([]);
  const [email, setEmail] = useState(""); const [pw, setPw] = useState("");
  const [msg, setMsg] = useState(""); const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/admin/accounts`, { headers: { Authorization: `Bearer ${token}` } });
    const j = await r.json(); setUsers(r.ok ? j.users : []); setLoading(false);
  }, [token]);
  useEffect(() => { load(); }, [load]);

  async function create() {
    setMsg("");
    const r = await fetch(`/api/admin/accounts`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ email, password: pw }) });
    const j = await r.json();
    if (!r.ok) { setMsg(j.error || "新增失敗"); return; }
    setEmail(""); setPw(""); load();
  }
  async function remove(id: string, em: string) {
    if (!confirm(`刪除帳號 ${em}？`)) return;
    const r = await fetch(`/api/admin/accounts?id=${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    const j = await r.json();
    if (!r.ok) { setMsg(j.error || "刪除失敗"); return; }
    load();
  }

  return (
    <div>
      <div className="rounded-xl border bg-white p-4 mb-5">
        <h2 className="font-semibold mb-3">新增後台帳號</h2>
        <div className="flex flex-wrap gap-2 items-center">
          <input className="border rounded p-2 text-sm" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
          <input type="password" className="border rounded p-2 text-sm" placeholder="密碼（至少 6 碼）" value={pw} onChange={(e)=>setPw(e.target.value)} />
          <button onClick={create} className="bg-navy text-white rounded px-4 py-2 text-sm">新增</button>
        </div>
        {msg && <p className="text-red-500 text-sm mt-2">{msg}</p>}
      </div>
      <h2 className="font-semibold mb-2">現有帳號</h2>
      {loading ? <div>載入中…</div> : (
        <table className="w-full text-sm bg-white border rounded-xl overflow-hidden">
          <thead className="bg-gray-50 text-gray-600"><tr>
            <th className="p-2 text-left">Email</th><th className="p-2">最後登入</th><th className="p-2"></th>
          </tr></thead>
          <tbody>
            {users.map((u)=>(
              <tr key={u.id} className="border-t">
                <td className="p-2">{u.email}</td>
                <td className="p-2 text-center text-gray-500">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString("zh-TW") : "—"}</td>
                <td className="p-2 text-center"><button onClick={()=>remove(u.id, u.email)} className="text-red-600">刪除</button></td>
              </tr>
            ))}
            {users.length===0 && <tr><td colSpan={3} className="p-4 text-center text-gray-400">尚無帳號</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ============ 填報系所管理 ============
function Units({ token }: { token: string }) {
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true); const [msg, setMsg] = useState("");
  const [form, setForm] = useState({ campus: CAMPUSES[0] as string, college: "", department: "", sort_order: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/admin/units`, { headers: { Authorization: `Bearer ${token}` } });
    const j = await r.json(); setUnits(r.ok ? j.units : []); setLoading(false);
  }, [token]);
  useEffect(() => { load(); }, [load]);

  async function create() {
    setMsg("");
    const r = await fetch(`/api/admin/units`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(form) });
    const j = await r.json();
    if (!r.ok) { setMsg(j.error || "新增失敗"); return; }
    setForm({ campus: CAMPUSES[0], college: "", department: "", sort_order: "" }); load();
  }
  async function save(u: any) {
    setMsg("");
    const r = await fetch(`/api/admin/units`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ id: u.id, campus: u.campus, college: u.college, department: u.department, sort_order: Number(u.sort_order) }) });
    const j = await r.json();
    if (!r.ok) { setMsg(j.error || "儲存失敗"); return; }
    load();
  }
  async function remove(u: any) {
    if (!confirm(`刪除「${u.department}」？此操作會一併刪除該系所所有期別的活動與送出紀錄，無法復原。`)) return;
    const r = await fetch(`/api/admin/units?id=${u.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    const j = await r.json();
    if (!r.ok) { setMsg(j.error || "刪除失敗"); return; }
    load();
  }
  function edit(id: number, k: string, v: string) { setUnits((arr)=>arr.map((x)=>x.id===id?{...x,[k]:v}:x)); }

  return (
    <div>
      <div className="rounded-xl border bg-white p-4 mb-5">
        <h2 className="font-semibold mb-3">新增系所</h2>
        <div className="flex flex-wrap gap-2 items-center">
          <select className="border rounded p-2 text-sm" value={form.campus} onChange={(e)=>setForm({...form,campus:e.target.value})}>
            {CAMPUSES.map((c)=><option key={c} value={c}>{c}校區</option>)}
          </select>
          <input className="border rounded p-2 text-sm" placeholder="學院" value={form.college} onChange={(e)=>setForm({...form,college:e.target.value})} />
          <input className="border rounded p-2 text-sm" placeholder="系所" value={form.department} onChange={(e)=>setForm({...form,department:e.target.value})} />
          <input className="border rounded p-2 text-sm w-28" placeholder="排序(選填)" value={form.sort_order} onChange={(e)=>setForm({...form,sort_order:e.target.value})} />
          <button onClick={create} className="bg-navy text-white rounded px-4 py-2 text-sm">新增</button>
        </div>
        {msg && <p className="text-red-500 text-sm mt-2">{msg}</p>}
      </div>
      <h2 className="font-semibold mb-2">現有系所（共 {units.length}）</h2>
      {loading ? <div>載入中…</div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm bg-white border rounded-xl overflow-hidden">
            <thead className="bg-gray-50 text-gray-600"><tr>
              <th className="p-2">ID</th><th className="p-2">校區</th><th className="p-2 text-left">學院</th><th className="p-2 text-left">系所</th><th className="p-2">排序</th><th className="p-2"></th>
            </tr></thead>
            <tbody>
              {units.map((u)=>(
                <tr key={u.id} className="border-t">
                  <td className="p-2 text-center text-gray-400">{u.id}</td>
                  <td className="p-2 text-center">
                    <select className="border rounded p-1" value={u.campus} onChange={(e)=>edit(u.id,"campus",e.target.value)}>
                      {CAMPUSES.map((c)=><option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                  <td className="p-2"><input className="border rounded p-1 w-full" value={u.college} onChange={(e)=>edit(u.id,"college",e.target.value)} /></td>
                  <td className="p-2"><input className="border rounded p-1 w-full" value={u.department} onChange={(e)=>edit(u.id,"department",e.target.value)} /></td>
                  <td className="p-2"><input className="border rounded p-1 w-20 text-center" value={u.sort_order} onChange={(e)=>edit(u.id,"sort_order",e.target.value)} /></td>
                  <td className="p-2 text-center whitespace-nowrap">
                    <button onClick={()=>save(u)} className="text-navy mr-3">儲存</button>
                    <button onClick={()=>remove(u)} className="text-red-600">刪除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============ 期數管理 ============
function Periods({ token }: { token: string }) {
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true); const [msg, setMsg] = useState("");
  const [form, setForm] = useState({ name: "", start_date: "", end_date: "", is_open: false });

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/admin/periods`, { headers: { Authorization: `Bearer ${token}` } });
    const j = await r.json(); setPeriods(r.ok ? j.periods : []); setLoading(false);
  }, [token]);
  useEffect(() => { load(); }, [load]);

  async function create() {
    setMsg("");
    const r = await fetch(`/api/admin/periods`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(form) });
    const j = await r.json();
    if (!r.ok) { setMsg(j.error || "新增失敗"); return; }
    setForm({ name: "", start_date: "", end_date: "", is_open: false }); load();
  }
  async function patch(body: any) {
    setMsg("");
    const r = await fetch(`/api/admin/periods`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!r.ok) { setMsg(j.error || "更新失敗"); return; }
    load();
  }
  function edit(id: number, k: string, v: any) { setPeriods((arr)=>arr.map((x)=>x.id===id?{...x,[k]:v}:x)); }

  return (
    <div>
      <div className="rounded-xl border bg-white p-4 mb-5">
        <h2 className="font-semibold mb-3">新增期別</h2>
        <div className="flex flex-wrap gap-2 items-center">
          <input className="border rounded p-2 text-sm" placeholder="名稱（例：115年1-6月）" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} />
          <input type="date" className="border rounded p-2 text-sm" value={form.start_date} onChange={(e)=>setForm({...form,start_date:e.target.value})} />
          <span className="text-gray-400">~</span>
          <input type="date" className="border rounded p-2 text-sm" value={form.end_date} onChange={(e)=>setForm({...form,end_date:e.target.value})} />
          <label className="text-sm flex items-center gap-1"><input type="checkbox" checked={form.is_open} onChange={(e)=>setForm({...form,is_open:e.target.checked})} />設為開放（將關閉其它期）</label>
          <button onClick={create} className="bg-navy text-white rounded px-4 py-2 text-sm">新增</button>
        </div>
        {msg && <p className="text-red-500 text-sm mt-2">{msg}</p>}
      </div>
      <h2 className="font-semibold mb-2">現有期別</h2>
      {loading ? <div>載入中…</div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm bg-white border rounded-xl overflow-hidden">
            <thead className="bg-gray-50 text-gray-600"><tr>
              <th className="p-2 text-left">名稱</th><th className="p-2">起始</th><th className="p-2">結束</th><th className="p-2">開放中</th><th className="p-2"></th>
            </tr></thead>
            <tbody>
              {periods.map((p)=>(
                <tr key={p.id} className="border-t">
                  <td className="p-2"><input className="border rounded p-1 w-full" value={p.name} onChange={(e)=>edit(p.id,"name",e.target.value)} /></td>
                  <td className="p-2"><input type="date" className="border rounded p-1" value={p.start_date} onChange={(e)=>edit(p.id,"start_date",e.target.value)} /></td>
                  <td className="p-2"><input type="date" className="border rounded p-1" value={p.end_date} onChange={(e)=>edit(p.id,"end_date",e.target.value)} /></td>
                  <td className="p-2 text-center">
                    {p.is_open
                      ? <span className="text-green-700 font-semibold">開放中</span>
                      : <button onClick={()=>patch({ id: p.id, is_open: true })} className="text-amber-600">設為開放</button>}
                  </td>
                  <td className="p-2 text-center"><button onClick={()=>patch({ id: p.id, name: p.name, start_date: p.start_date, end_date: p.end_date })} className="text-navy">儲存</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-gray-400 mt-3">建議同時只開放一期；將某期設為開放時，系統會自動關閉其它期。</p>
    </div>
  );
}

// ============ 選項管理（學制 / 活動大類 / 活動類型）============
const GROUP_LABEL: Record<string, string> = { outbound: "出國交流（計入出國人次）", conference: "研討會類（計入場次/人數）" };

function Options({ token }: { token: string }) {
  const [opts, setOpts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true); const [msg, setMsg] = useState("");
  const [nd, setNd] = useState({ value: "", sort_order: "" });
  const [nc, setNc] = useState({ value: "", label: "", metric_group: "conference", sort_order: "" });
  const [nt, setNt] = useState({ parent: "", value: "", sort_order: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/admin/options`, { headers: { Authorization: `Bearer ${token}` } });
    const j = await r.json(); setOpts(r.ok ? j.options : []); setLoading(false);
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const degrees = opts.filter((o) => o.kind === "degree");
  const categories = opts.filter((o) => o.kind === "category");
  const types = opts.filter((o) => o.kind === "type");

  async function add(kind: string, body: any) {
    setMsg("");
    const r = await fetch(`/api/admin/options`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ kind, ...body }) });
    const j = await r.json();
    if (!r.ok) { setMsg(j.error || "新增失敗"); return false; }
    load(); return true;
  }
  async function patch(body: any) {
    setMsg("");
    const r = await fetch(`/api/admin/options`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!r.ok) { setMsg(j.error || "更新失敗"); return; }
    load();
  }
  function edit(id: number, k: string, v: any) { setOpts((arr) => arr.map((x) => x.id === id ? { ...x, [k]: v } : x)); }

  if (loading) return <div>載入中…</div>;

  return (
    <div className="space-y-8">
      {msg && <p className="text-red-500 text-sm">{msg}</p>}
      <p className="text-xs text-gray-500">「停用」的項目不會再出現在填報下拉，但既有活動仍保留原值。項目名稱建立後不可修改（以維持歷史紀錄）。</p>

      {/* 學制 */}
      <section>
        <h2 className="font-semibold mb-2">學制</h2>
        <div className="flex flex-wrap gap-2 items-center mb-3">
          <input className="border rounded p-2 text-sm" placeholder="新學制名稱" value={nd.value} onChange={(e)=>setNd({...nd,value:e.target.value})} />
          <input className="border rounded p-2 text-sm w-24" placeholder="排序" value={nd.sort_order} onChange={(e)=>setNd({...nd,sort_order:e.target.value})} />
          <button onClick={async()=>{ if(await add("degree", nd)) setNd({value:"",sort_order:""}); }} className="bg-navy text-white rounded px-4 py-2 text-sm">新增學制</button>
        </div>
        <OptTable rows={degrees} cols={["名稱","排序","狀態",""]}>
          {(o:any)=>(<>
            <td className="p-2">{o.value}</td>
            <td className="p-2 text-center"><input className="border rounded p-1 w-16 text-center" value={o.sort_order} onChange={(e)=>edit(o.id,"sort_order",e.target.value)} /></td>
            <td className="p-2 text-center">{o.active ? <span className="text-green-700">啟用中</span> : <span className="text-gray-400">已停用</span>}</td>
            <td className="p-2 text-center whitespace-nowrap">
              <button onClick={()=>patch({id:o.id,sort_order:Number(o.sort_order)})} className="text-navy mr-3">儲存</button>
              <button onClick={()=>patch({id:o.id,active:!o.active})} className={o.active?"text-red-600":"text-green-700"}>{o.active?"停用":"啟用"}</button>
            </td>
          </>)}
        </OptTable>
      </section>

      {/* 活動大類 */}
      <section>
        <h2 className="font-semibold mb-2">活動大類</h2>
        <div className="flex flex-wrap gap-2 items-center mb-3">
          <input className="border rounded p-2 text-sm" placeholder="大類名稱（存入值）" value={nc.value} onChange={(e)=>setNc({...nc,value:e.target.value})} />
          <input className="border rounded p-2 text-sm" placeholder="顯示文字（選填）" value={nc.label} onChange={(e)=>setNc({...nc,label:e.target.value})} />
          <select className="border rounded p-2 text-sm" value={nc.metric_group} onChange={(e)=>setNc({...nc,metric_group:e.target.value})}>
            <option value="outbound">{GROUP_LABEL.outbound}</option>
            <option value="conference">{GROUP_LABEL.conference}</option>
          </select>
          <input className="border rounded p-2 text-sm w-24" placeholder="排序" value={nc.sort_order} onChange={(e)=>setNc({...nc,sort_order:e.target.value})} />
          <button onClick={async()=>{ if(await add("category", nc)) setNc({value:"",label:"",metric_group:"conference",sort_order:""}); }} className="bg-navy text-white rounded px-4 py-2 text-sm">新增大類</button>
        </div>
        <OptTable rows={categories} cols={["名稱","顯示文字","指標歸組","排序","狀態",""]}>
          {(o:any)=>(<>
            <td className="p-2">{o.value}</td>
            <td className="p-2"><input className="border rounded p-1 w-full" value={o.label ?? ""} onChange={(e)=>edit(o.id,"label",e.target.value)} /></td>
            <td className="p-2 text-center">
              <select className="border rounded p-1" value={o.metric_group ?? "conference"} onChange={(e)=>edit(o.id,"metric_group",e.target.value)}>
                <option value="outbound">{GROUP_LABEL.outbound}</option>
                <option value="conference">{GROUP_LABEL.conference}</option>
              </select>
            </td>
            <td className="p-2 text-center"><input className="border rounded p-1 w-16 text-center" value={o.sort_order} onChange={(e)=>edit(o.id,"sort_order",e.target.value)} /></td>
            <td className="p-2 text-center">{o.active ? <span className="text-green-700">啟用中</span> : <span className="text-gray-400">已停用</span>}</td>
            <td className="p-2 text-center whitespace-nowrap">
              <button onClick={()=>patch({id:o.id,label:o.label,metric_group:o.metric_group,sort_order:Number(o.sort_order)})} className="text-navy mr-3">儲存</button>
              <button onClick={()=>patch({id:o.id,active:!o.active})} className={o.active?"text-red-600":"text-green-700"}>{o.active?"停用":"啟用"}</button>
            </td>
          </>)}
        </OptTable>
        <p className="text-xs text-gray-400 mt-2">「指標歸組」決定該大類計入哪組統計：出國交流＝出國交流人次；研討會類＝場次與人數。</p>
      </section>

      {/* 活動類型 */}
      <section>
        <h2 className="font-semibold mb-2">活動類型</h2>
        <div className="flex flex-wrap gap-2 items-center mb-3">
          <select className="border rounded p-2 text-sm" value={nt.parent} onChange={(e)=>setNt({...nt,parent:e.target.value})}>
            <option value="">選擇所屬大類…</option>
            {categories.map((c)=><option key={c.id} value={c.value}>{c.label ?? c.value}</option>)}
          </select>
          <input className="border rounded p-2 text-sm" placeholder="類型名稱" value={nt.value} onChange={(e)=>setNt({...nt,value:e.target.value})} />
          <input className="border rounded p-2 text-sm w-24" placeholder="排序" value={nt.sort_order} onChange={(e)=>setNt({...nt,sort_order:e.target.value})} />
          <button onClick={async()=>{ if(await add("type", nt)) setNt({parent:"",value:"",sort_order:""}); }} className="bg-navy text-white rounded px-4 py-2 text-sm">新增類型</button>
        </div>
        <OptTable rows={types} cols={["類型","所屬大類","排序","狀態",""]}>
          {(o:any)=>(<>
            <td className="p-2">{o.value}</td>
            <td className="p-2 text-center text-gray-500">{o.parent}</td>
            <td className="p-2 text-center"><input className="border rounded p-1 w-16 text-center" value={o.sort_order} onChange={(e)=>edit(o.id,"sort_order",e.target.value)} /></td>
            <td className="p-2 text-center">{o.active ? <span className="text-green-700">啟用中</span> : <span className="text-gray-400">已停用</span>}</td>
            <td className="p-2 text-center whitespace-nowrap">
              <button onClick={()=>patch({id:o.id,sort_order:Number(o.sort_order)})} className="text-navy mr-3">儲存</button>
              <button onClick={()=>patch({id:o.id,active:!o.active})} className={o.active?"text-red-600":"text-green-700"}>{o.active?"停用":"啟用"}</button>
            </td>
          </>)}
        </OptTable>
      </section>
    </div>
  );
}

function OptTable({ rows, cols, children }: { rows: any[]; cols: string[]; children: (o: any) => React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm bg-white border rounded-xl overflow-hidden">
        <thead className="bg-gray-50 text-gray-600"><tr>{cols.map((c,i)=><th key={i} className="p-2 text-left">{c}</th>)}</tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={cols.length} className="p-4 text-center text-gray-400">尚無項目</td></tr>}
          {rows.map((o)=>(<tr key={o.id} className={`border-t ${o.active ? "" : "opacity-50"}`}>{children(o)}</tr>))}
        </tbody>
      </table>
    </div>
  );
}
