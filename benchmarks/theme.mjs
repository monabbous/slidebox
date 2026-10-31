// Shared by new offline reports and the presentation-only pilot archive update.
// No remote fonts, scripts, or assets: exported reports still work offline.
export const REPORT_STYLES = `
:root{color-scheme:dark;--background:#063c59;--primary:#2a5b7c;--accent:#00b2b2;--ink:#e8f6fa;--muted:#b2ccd8;--line:#8ac9d82e;--radius:4px;--mono:"Cascadia Mono","SFMono-Regular",Consolas,monospace}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(ellipse at 90% 0%,#00b2b21a,transparent 55%),var(--background);color:var(--ink);font:15px/1.8 system-ui,sans-serif;min-height:100vh}
main{max-width:1400px;margin:40px auto;padding:0 24px 64px}a{color:#80efdf;text-underline-offset:.25em}a:hover{color:#fff}a:focus-visible,button:focus-visible,select:focus-visible,summary:focus-visible{outline:2px solid #80efdf;outline-offset:4px}
nav{display:flex;flex-wrap:wrap;align-items:center;gap:12px 24px;padding:18px 24px;background:#082f46cc;border-bottom:1px solid var(--line);font:13px/1.6 var(--mono)}nav a{text-decoration:none}nav a:first-child{margin-inline-end:auto}
h1,h2,h3,summary{font-family:var(--mono)}h1{font-size:clamp(26px,4vw,40px);line-height:1.25;letter-spacing:-.04em;max-width:30ch}h2{font-size:23px;line-height:1.4;margin:40px 0 18px}h3{font-size:15px;line-height:1.5;margin:0 0 16px}p{max-width:100ch}li{margin-bottom:8px}
.note,.card,pre,.viewport{border:1px solid var(--line);border-radius:var(--radius);background:linear-gradient(135deg,#2a5b7c59,#082f46b3);box-shadow:inset 0 1px #ffffff08}
.note{padding:16px 20px;border-inline-start:3px solid var(--accent);color:#d8edf4}.note strong{color:#80efdf}.charts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}.card{padding:20px;min-width:0;margin:0;backdrop-filter:blur(12px)}
img,svg{display:block;width:100%;max-width:100%;height:auto;border-radius:var(--radius)}table{display:block;overflow:auto;border-collapse:collapse;width:100%;font:12px/1.7 var(--mono);background:#082f46;border:1px solid var(--line);border-radius:var(--radius)}td,th{padding:10px 12px;border:1px solid var(--line);text-align:left;white-space:nowrap}th{background:#2a5b7c66;color:#b6f4eb}tbody tr:nth-child(even){background:#2a5b7c26}
pre{overflow:auto;padding:20px;color:var(--muted);font:12px/1.8 var(--mono)}code{font-family:var(--mono);font-size:.9em}summary{cursor:pointer;color:#80efdf;padding:10px 0}.legend{display:flex;flex-wrap:wrap;gap:12px 24px;margin:20px 0;color:var(--muted);font:12px/1.7 var(--mono)}.legend span:before{content:'';display:inline-block;width:12px;height:12px;border-radius:2px;background:#00b2b2;margin-right:8px}.legend span+span:before{background:#80b9ed}
header{padding:24px;background:#082f46b3;border-bottom:1px solid var(--line)}.controls{display:flex;flex-wrap:wrap;align-items:center;gap:16px;padding:20px}select,button{font:13px/1.6 var(--mono);padding:8px 12px;color:var(--ink);background:#082f46;border:1px solid #8ac9d866;border-radius:var(--radius)}button{background:#00b2b233;cursor:pointer}button:hover{background:#00b2b255}.viewport{overflow:auto;max-height:75vh;margin:0 20px 20px}iframe{display:block;border:0;width:1920px;height:1440px}
@media(max-width:1000px){.charts{grid-template-columns:1fr}}@media(max-width:600px){main{padding:0 16px 48px;margin-top:24px}nav{padding:16px;gap:12px 16px}.card{padding:12px}h2{font-size:20px}.note{padding:12px}}
`;

export const REPORT_NAV = `<nav aria-label="Benchmark navigation"><a href="https://nabous.dev/">~/ nabous.dev</a><a href="https://nabous.dev/blog/slidebox/">Article</a><a href="https://nabous.dev/lab/slidebox/">Playground</a><a href="https://github.com/monabbous/slidebox/tree/main/benchmarks">Run it yourself ↗</a></nav>`;

export function brandSvg(svg) {
  // Recolor only: never change the chart's coordinates, scale, values, or labels.
  const colors = { "#008f91": "#00b2b2", "#d17b22": "#80b9ed", "#18313e": "#e8f6fa", "#173847": "#e8f6fa", "#b9ccd6": "#8ac9d859" };
  let result = svg.replace(/#(?:008f91|d17b22|18313e|173847|b9ccd6)\b/gi, color => colors[color.toLowerCase()]);
  result = result.replace(/<style data-brand="nabous">[\s\S]*?<\/style><rect data-brand="nabous"[^>]*\/>/, "");
  const style = `<style data-brand="nabous">text{font-family:"Cascadia Mono","SFMono-Regular",Consolas,monospace;fill:#e8f6fa;font-size:14px}svg{color-scheme:dark}</style><rect data-brand="nabous" width="100%" height="100%" rx="4" fill="#082f46"/>`;
  return result.replace(/(<svg\b[^>]*>)/, "$1" + style);
}
