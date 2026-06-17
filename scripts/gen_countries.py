import json, sys, io

src = sys.argv[1] if len(sys.argv) > 1 else "/tmp/docx_extract/countries.json"
rows = json.load(open(src, encoding="utf-8"))
out = []
for r in rows:
    if len(r) < 4:
        continue
    code, zh, en, cont = r[0].strip(), r[1].strip(), r[2].strip(), r[3].strip()
    if code == "國別代碼" or not zh or not code:
        continue
    out.append((code, zh, en, cont))


def esc(s):
    return s.replace("\\", "\\\\").replace('"', '\\"')


lines = [
    "// 國家/地區清單（來源：教育部「大學校院校務資料庫」國別代碼）",
    "// 由 scripts/gen_countries.py 從 docx 產生；填報「國家/地區」下拉以此為準。",
    "export type Country = { code: string; zh: string; en: string; continent: string };",
    "",
    "export const COUNTRIES: Country[] = [",
]
for code, zh, en, cont in out:
    lines.append(f'  {{ code: "{esc(code)}", zh: "{esc(zh)}", en: "{esc(en)}", continent: "{esc(cont)}" }},')
lines.append("];")
lines.append("")
content = "\n".join(lines) + "\n"
with io.open("lib/countries.ts", "w", encoding="utf-8", newline="\n") as f:
    f.write(content)
print("wrote lib/countries.ts with", len(out), "countries")
