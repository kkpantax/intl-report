"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CATEGORIES, TYPES_BY_CATEGORY, DEGREES, METRIC_LABELS } from "@/lib/constants";
import type { Unit, Activity, Submission, Period } from "@/lib/types";

const empty = {
  degree: "學士", category: "出國交流", activity_type: "移地教學",
  title: "", start_date: "", end_date: "", country: "", headcount: "", note: "",
};

export default function DeptClient({ unit, period, initialActivities, initialSubmission }:{
  unit: Unit; period: Period | null; initialActivities: Activity[]; initialSubmission: Submission | null;
}) {
  const [reporter, setReporter] = useState("");
  const [entered, setEntered] = useState(false);
  const [ext, setExt] = useState("");
  const [acts, setActs] = useState<Activity[]>(initialActivities);
  const [sub, setSub] = useState<Submission | null>(initialSubmission);
  const [form, setForm] = useState<any>(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
useEffect(() => {
    (async () => {
      const r = await fetch(`/api/activities?unitId=${unit.id}`, { cache: "no-store" });
      if (r.ok) { const j = await r.json(); setActs(j.activities ?? []); setSub(j.submission ?? null); }
    })();
  }, [unit.id]);

  const locked = sub?.status === "submitted";
  const metrics = useMemo(() => acts.reduce((a, x) => {
    if (x.category === "出國交流") a.outbound_pax += x.headcount;
    else { a.conf_sessions += 1; a.conf_pax += x.headcount; }
    return a;
  }, { outbound_pax: 0, conf_sessions: 0, conf_pax: 0 }), [acts]);

  if (!period) return <div>目前未開放填報。</div>;

  // 進入前要求填報人姓名
  if (!entered) {
    return (
      <div className="max-w-md">
        <Link href={`/college/${encodeURIComponent(unit.college)}`} className="text-sm text-navy">← 回 {unit.college}</Link>
        <h1 className="text-xl font-bold mt-2 mb-4">{unit.campus}校區 ・ {unit.department}</h1>
        <div className="rounded-xl bg-white border p-5">
          <label className="block text-sm mb-1">填報人姓名 <span className="text-red-500">*</span></label>
          <input className="border rounded w-full p-2 mb-3" value={reporter}
            onChange={(e) => setReporter(e.target.value)} placeholder="請輸入您的姓名" />
          <label className="block text-sm mb-1">分機（選填）</label>
          <input className="border rounded w-full p-2 mb-4" value={ext}
            onChange={(e) => setExt(e.target.value)} />
          <button disabled={!reporter.trim()}
            onClick={() => setEntered(true)}
            className="bg-navy text-white rounded px-4 py-2 disabled:opacity-40">開始填寫</button>
          <p className="text-xs text-gray-500 mt-3">此頁為全系共用清單，您會看到本系所本期所有已填項目；送出前任何人皆可整理/修正。</p>
        </div>
      </div>
    );
  }

  const types = TYPES_BY_CATEGORY[form.category] ?? [];

  async function refresh() {
    const r = await fetch(`/api/activities?unitId=${unit.id}`);
    const j = await r.json();
    setActs(j.activities ?? []);
    setSub(j.submission ?? null);
  }

  async function save() {
    if (!form.title.trim()) { setMsg("請填活動名稱"); return; }
    setBusy(true); setMsg("");
    const payload = { ...form, headcount: Number(form.headcount || 0), unitId: unit.id, reporter, ext };
    const url = editId ? `/api/activities/${editId}` : `/api/activities`;
    const method = editId ? "PATCH" : "POST";
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setBusy(false);
    if (!r.ok) { setMsg((await r.json()).error ?? "儲存失敗"); return; }
    setForm(empty); setEditId(null); await refresh();
  }

  async function del(id: string) {
    if (!confirm("確定刪除這筆？")) return;
    await fetch(`/api/activities/${id}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ unitId: unit.id }) });
    await refresh();
  }

  function edit(a: Activity) {
    setEditId(a.id);
    setForm({ degree: a.degree, category: a.category, activity_type: a.activity_type, title: a.title,
      start_date: a.start_date ?? "", end_date: a.end_date ?? "", country: a.country ?? "",
      headcount: String(a.headcount), note: a.note ?? "" });
  }

  async function submit(noActivity = false) {
    if (!noActivity && acts.length === 0) { setMsg("尚未填任何活動；若本期無活動請按「申報本期無活動」"); return; }
    if (!confirm(noActivity ? "確定申報本期無活動並送出？送出後將鎖定。" : "確定送出？送出後將鎖定，需請國際處退回才能修改。")) return;
    setBusy(true);
    const r = await fetch(`/api/submit`, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unitId: unit.id, reporter, noActivity }) });
    setBusy(false);
    if (!r.ok) { setMsg((await r.json()).error ?? "送出失敗"); return; }
    await refresh();
  }

  return (
    <div>
      <Link href={`/college/${encodeURIComponent(unit.college)}`} className="text-sm text-navy">← 回 {unit.college}</Link>
      <div className="flex items-center justify-between mt-2 mb-1">
        <h1 className="text-xl font-bold">{unit.campus}校區 ・ {unit.department}</h1>
        <span className={`text-sm px-3 py-1 rounded-full ${locked ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
          {locked ? "已送出（鎖定）" : "填報中"}
        </span>
      </div>
      <div className="text-sm text-gray-500 mb-4">{period.name} ・ 填報人：{reporter}</div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {(["outbound_pax", "conf_sessions", "conf_pax"] as const).map((k) => (
          <div key={k} className="rounded-xl bg-white border p-4">
            <div className="text-xs text-gray-500">{METRIC_LABELS[k]}</div>
            <div className="text-2xl font-bold text-navy">{metrics[k]}</div>
          </div>
        ))}
      </div>

      {!locked && (
        <div className="rounded-xl bg-white border p-5 mb-6">
          <h2 className="font-semibold mb-3">{editId ? "編輯活動" : "新增活動"}</h2>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="學制"><select className="inp" value={form.degree} onChange={(e)=>setForm({...form,degree:e.target.value})}>{DEGREES.map(d=><option key={d}>{d}</option>)}</select></Field>
            <Field label="活動大類"><select className="inp" value={form.category} onChange={(e)=>{const c=e.target.value;setForm({...form,category:c,activity_type:TYPES_BY_CATEGORY[c][0]})}}>{CATEGORIES.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}</select></Field>
            <Field label="活動類型"><select className="inp" value={form.activity_type} onChange={(e)=>setForm({...form,activity_type:e.target.value})}>{types.map(t=><option key={t}>{t}</option>)}</select></Field>
            <Field label="參與人數"><input type="number" min={0} className="inp" value={form.headcount} onChange={(e)=>setForm({...form,headcount:e.target.value})}/></Field>
            <Field label="活動名稱" full><input className="inp" value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})}/></Field>
            <Field label="開始日期"><input type="date" className="inp" value={form.start_date} onChange={(e)=>setForm({...form,start_date:e.target.value})}/></Field>
            <Field label="結束日期"><input type="date" className="inp" value={form.end_date} onChange={(e)=>setForm({...form,end_date:e.target.value})}/></Field>
            <Field label="國家/地區"><input className="inp" value={form.country} onChange={(e)=>setForm({...form,country:e.target.value})}/></Field>
            <Field label="備註" full><input className="inp" value={form.note} onChange={(e)=>setForm({...form,note:e.target.value})}/></Field>
          </div>
          <div className="mt-4 flex gap-2 items-center">
            <button disabled={busy} onClick={()=>save()} className="bg-navy text-white rounded px-4 py-2 disabled:opacity-40">{editId?"更新":"加入清單"}</button>
            {editId && <button onClick={()=>{setForm(empty);setEditId(null)}} className="text-gray-500 px-3">取消</button>}
            {msg && <span className="text-red-500 text-sm">{msg}</span>}
          </div>
        </div>
      )}

      <h2 className="font-semibold mb-2">本系所本期清單（{acts.length} 筆）</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm bg-white border rounded-xl overflow-hidden">
          <thead className="bg-gray-50 text-gray-600"><tr>
            <th className="p-2 text-left">活動名稱</th><th className="p-2">大類</th><th className="p-2">類型</th>
            <th className="p-2">學制</th><th className="p-2">人數</th><th className="p-2">日期</th>
            <th className="p-2">填報人</th>{!locked && <th className="p-2"></th>}
          </tr></thead>
          <tbody>
            {acts.length === 0 && <tr><td colSpan={8} className="p-4 text-center text-gray-400">尚無資料</td></tr>}
            {acts.map((a)=>(
              <tr key={a.id} className="border-t">
                <td className="p-2">{a.title}</td>
                <td className="p-2 text-center">{a.category === "出國交流" ? "出國交流" : "研討會類"}</td>
                <td className="p-2 text-center">{a.activity_type}</td>
                <td className="p-2 text-center">{a.degree}</td>
                <td className="p-2 text-center">{a.headcount}</td>
                <td className="p-2 text-center">{a.start_date ?? ""}</td>
                <td className="p-2 text-center">{a.reporter}</td>
                {!locked && <td className="p-2 text-center whitespace-nowrap">
                  <button onClick={()=>edit(a)} className="text-navy mr-2">編輯</button>
                  <button onClick={()=>del(a.id)} className="text-red-500">刪除</button>
                </td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!locked && (
        <div className="mt-6 flex gap-3">
          <button disabled={busy} onClick={()=>submit(false)} className="bg-green-700 text-white rounded px-5 py-2 disabled:opacity-40">確認送出並鎖定</button>
          <button disabled={busy} onClick={()=>submit(true)} className="border border-gray-300 rounded px-5 py-2">申報本期無活動</button>
        </div>
      )}
      {locked && <div className="mt-6 text-sm text-gray-600">本系所已送出鎖定。如需修改，請聯繫國際處退回。</div>}

      <style jsx global>{`.inp{border:1px solid #d1d5db;border-radius:0.375rem;padding:0.5rem;width:100%}`}</style>
    </div>
  );
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return <div className={full ? "md:col-span-2" : ""}><label className="block text-xs text-gray-500 mb-1">{label}</label>{children}</div>;
}
