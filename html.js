export default `<!DOCTYPE html>
<html lang="hi" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>LogiOp Pro · Powered by OPSI</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
/* ============================================================
   LogiOp Pro · BUILD v41 · Full rebuild from zero
   Design tokens — single source of truth
   ============================================================ */
:root{
  --bg:#060812;
  --bg-2:#0a0d1c;
  --ink:#eef2ff;
  --muted:#98a0c4;
  --faint:#5a6288;
  --violet:#8b5cf6;
  --blue:#60a5fa;
  --cyan:#22d3ee;
  --green:#34d399;
  --magenta:#f472b6;
  --red:#fb5f6e;
  --gold:#f0c46c;
  --glass:rgba(15,18,36,.55);
  --glass-2:rgba(20,24,46,.65);
  --line:rgba(255,255,255,.08);
  --line-2:rgba(255,255,255,.14);
  --shadow:0 20px 60px rgba(0,0,0,.45);
  --r-lg:24px; --r-md:18px; --r-sm:12px;
  --font-d:'Sora',sans-serif;
  --font-b:'Inter',sans-serif;
  --font-m:'JetBrains Mono',monospace;
  --sb-w:96px;
  --ease:cubic-bezier(.22,1,.36,1);
}
html[data-theme="light"]{
  --bg:#e9eef8;
  --bg-2:#f4f7fd;
  --ink:#161a2e;
  --muted:#4c557c;
  --faint:#8b93b8;
  --glass:rgba(255,255,255,.62);
  --glass-2:rgba(255,255,255,.78);
  --line:rgba(22,26,46,.10);
  --line-2:rgba(22,26,46,.18);
  --shadow:0 20px 50px rgba(90,110,160,.18);
}
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%}
body{
  background:var(--bg);
  color:var(--ink);
  font-family:var(--font-b);
  font-size:15px;
  line-height:1.5;
  overflow:hidden;
  -webkit-font-smoothing:antialiased;
  transition:background .5s var(--ease), color .5s var(--ease);
}
::selection{background:rgba(139,92,246,.35)}
::-webkit-scrollbar{width:10px;height:10px}
::-webkit-scrollbar-thumb{background:rgba(139,92,246,.25);border-radius:8px;border:3px solid transparent;background-clip:content-box}
::-webkit-scrollbar-track{background:transparent}
button{font-family:inherit;color:inherit;background:none;border:none;cursor:pointer}
button:focus-visible,a:focus-visible{outline:2px solid var(--cyan);outline-offset:2px;border-radius:8px}

/* ---------- Sky: aurora + particles (fixed canvases, never reflow) ---------- */
#sky,#dust{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:0}
#sky{opacity:.85}
#dust{z-index:1;opacity:.9}
html[data-theme="light"] #sky{opacity:.5}
html[data-theme="light"] #dust{opacity:.55}

/* ---------- App frame ---------- */
#app{position:relative;z-index:2;display:flex;height:100vh}

/* ---------- Sidebar — rebuilt: sliding lantern indicator, nothing ever clipped ---------- */
.sidebar{
  width:var(--sb-w);flex:0 0 var(--sb-w);
  display:flex;flex-direction:column;align-items:center;
  padding:14px 0 18px;
  border-right:1px solid var(--line);
  background:linear-gradient(180deg,rgba(10,12,26,.6),rgba(8,10,20,.35));
  backdrop-filter:blur(18px);
}
html[data-theme="light"] .sidebar{background:linear-gradient(180deg,rgba(255,255,255,.55),rgba(255,255,255,.3))}
@property --spin{syntax:'<angle>';initial-value:0deg;inherits:false}
.brand{
  width:58px;height:58px;border-radius:17px;flex:0 0 auto;
  display:grid;place-items:center;
  background:conic-gradient(from var(--spin),#8b5cf6,#2563eb,#22d3ee,#22c55e,#8b5cf6);
  padding:2px;margin-bottom:8px;
  animation:brandSpin 8s linear infinite;
}
@keyframes brandSpin{to{--spin:360deg}}
.brand-inner{
  width:100%;height:100%;border-radius:15px;color:#fff;position:relative;
  background:linear-gradient(135deg,#0b4a52 0%,#0b1c40 38%,#0d1030 62%,#5c1230 100%);
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;
}
.brand-inner small{font-size:6.5px;letter-spacing:2.5px;color:#cfe9ff;font-weight:700;position:relative;z-index:1}
.brand-inner>.lop-mark{position:relative;z-index:1}

/* ---------- Circuit board (original icon ka background — current ke saath) ---------- */
.circuit{position:absolute;inset:0;width:100%;height:100%;border-radius:inherit;pointer-events:none}
.circuit path{fill:none;stroke:rgba(90,150,255,.38);stroke-width:1.3;stroke-linecap:round;stroke-linejoin:round}
.circuit circle{fill:#3f8bff;opacity:.85}
.circuit .cur{stroke:#35e0ff;stroke-width:1.5;stroke-dasharray:6 90;stroke-dashoffset:0;
  filter:drop-shadow(0 0 3px #35e0ff);animation:current 3.2s linear infinite}
.circuit .cur.c2{stroke:#8b5cf6;filter:drop-shadow(0 0 3px #8b5cf6);animation-duration:4.1s;animation-delay:.8s}
.circuit .cur.c3{stroke:#35e0ff;animation-duration:2.6s;animation-delay:1.6s}
@keyframes current{to{stroke-dashoffset:-96}}
.orb-sm{overflow:visible}
.orb-sm .lop-mark,#opsiOrb .lop-mark,#opsiOrb .tag{position:relative;z-index:1}

/* ---------- LOP mark (asli logo — living vector) ---------- */
.lop-mark{display:block;overflow:visible}
.lop-mark .ring{fill:none;stroke:currentColor;stroke-width:11;stroke-linecap:round}
.lop-mark .band{fill:none;stroke:currentColor;stroke-width:5.5;stroke-linecap:round}
.lop-mark .cup{fill:currentColor}
.lop-mark .tail{fill:currentColor}
.lop-mark .eye{fill:currentColor;transform-box:fill-box;transform-origin:center;animation:blinkEye 4.8s ease-in-out infinite}
.lop-mark .eye.r{animation-delay:.08s}
@keyframes blinkEye{0%,90%,100%{transform:scaleY(1)}93%{transform:scaleY(.1)}96%{transform:scaleY(1)}}
.lop-alive{animation:lopBob 3.6s ease-in-out infinite}
@keyframes lopBob{0%,100%{transform:translateY(0) rotate(0)}30%{transform:translateY(-2px) rotate(-2deg)}65%{transform:translateY(1px) rotate(1.5deg)}}
.nav{
  position:relative;flex:1;width:100%;
  display:flex;flex-direction:column;align-items:center;gap:2px;
  overflow-y:auto;overflow-x:hidden;
  padding:10px 0 24px; /* bottom padding => aakhri icon kabhi nahi katega */
  scrollbar-width:none;
}
.nav::-webkit-scrollbar{display:none}
.nav-glow{
  position:absolute;left:10px;width:76px;height:60px;border-radius:18px;
  background:linear-gradient(135deg,rgba(139,92,246,.28),rgba(34,211,238,.18));
  border:1px solid rgba(139,92,246,.45);
  box-shadow:0 0 24px rgba(139,92,246,.35), inset 0 0 18px rgba(139,92,246,.12);
  transform:translateY(0);transition:transform .38s var(--ease);
  pointer-events:none;z-index:0;
}
.nav-item{
  position:relative;z-index:1;width:76px;height:60px;flex:0 0 60px;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;
  border-radius:18px;color:var(--faint);
  transition:color .25s var(--ease), transform .2s var(--ease);
}
.nav-item svg{width:21px;height:21px;stroke-width:1.8;flex:0 0 auto}
.nav-item span{font-size:9.5px;font-weight:600;letter-spacing:.3px;line-height:1}
.nav-item:hover{color:var(--muted);transform:translateY(-1px)}
.nav-item.active{color:#fff}
html[data-theme="light"] .nav-item.active{color:#3b2f80}
.nav-sep{width:40px;height:1px;background:var(--line);margin:8px 0;flex:0 0 1px}
.theme-btn{
  width:44px;height:44px;border-radius:14px;flex:0 0 auto;
  display:grid;place-items:center;color:var(--muted);
  border:1px solid var(--line);background:var(--glass);
  transition:all .3s var(--ease);
}
.theme-btn:hover{color:var(--gold);border-color:var(--line-2);transform:rotate(15deg)}

/* ---------- Main column ---------- */
.main{flex:1;display:flex;flex-direction:column;min-width:0}
.topbar{
  display:flex;align-items:center;gap:14px;
  padding:14px 26px 12px;
  border-bottom:1px solid var(--line);
  backdrop-filter:blur(14px);
  background:linear-gradient(180deg,rgba(8,10,20,.5),transparent);
}
html[data-theme="light"] .topbar{background:linear-gradient(180deg,rgba(255,255,255,.5),transparent)}
.wordmark{display:flex;align-items:center;gap:2px;font-family:var(--font-d);font-weight:800;font-size:20px;letter-spacing:.2px;white-space:nowrap}
.wordmark .wm-txt{
  background:linear-gradient(92deg,#8b5cf6,#4f7cf6 45%,#22d3ee 75%,#22c55e);
  -webkit-background-clip:text;background-clip:text;color:transparent;
}
.wordmark .wm-o{margin:0 1px;color:#22d3ee;filter:drop-shadow(0 0 6px rgba(34,211,238,.5))}
.wordmark .pro{
  font-size:11.5px;font-weight:800;letter-spacing:1px;margin-left:8px;padding:3px 9px;border-radius:9px;
  background:linear-gradient(92deg,#22c55e,#22d3ee,#8b5cf6);
  -webkit-background-clip:text;background-clip:text;color:transparent;
  border:1.5px solid transparent;position:relative;
}
.wordmark .pro::before{
  content:"";position:absolute;inset:0;border-radius:9px;padding:1.5px;
  background:linear-gradient(92deg,#22c55e,#22d3ee,#8b5cf6);
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
  -webkit-mask-composite:xor;mask-composite:exclude;
}
.powered{display:flex;align-items:center;gap:7px;font-size:9px;letter-spacing:2.5px;color:var(--faint);font-weight:700;margin-top:2px}
.powered b{background:linear-gradient(92deg,#8b5cf6,#22d3ee);-webkit-background-clip:text;background-clip:text;color:transparent;letter-spacing:3px}
.powered .pline{flex:0 0 20px;height:1.5px;background:linear-gradient(90deg,var(--violet),var(--cyan));position:relative;opacity:.7}
.powered .pline::before{content:"";position:absolute;top:50%;width:5px;height:5px;border:1.5px solid var(--violet);border-radius:50%;transform:translateY(-50%)}
.powered .pline.l::before{left:-6px}
.powered .pline.r::before{right:-6px}
.chip{
  display:inline-flex;align-items:center;gap:7px;
  font-family:var(--font-m);font-size:11px;font-weight:600;letter-spacing:.5px;
  color:var(--muted);border:1px solid var(--line);border-radius:999px;
  padding:6px 13px;background:var(--glass);white-space:nowrap;
}
.chip b{color:var(--cyan);font-weight:700}
.avatar{
  display:flex;align-items:center;gap:10px;margin-left:auto;
  border:1px solid var(--line);border-radius:999px;padding:5px 14px 5px 5px;background:var(--glass);
}
.avatar-ring{
  width:34px;height:34px;border-radius:50%;
  background:conic-gradient(from 0deg,var(--violet),var(--magenta),var(--gold),var(--violet));
  display:grid;place-items:center;padding:2px;
}
.avatar-ring i{width:100%;height:100%;border-radius:50%;background:#0a0d1c;display:grid;place-items:center;font-style:normal;font-family:var(--font-d);font-weight:700;font-size:12px;color:#fff}
.avatar .who{line-height:1.15}
.avatar .who b{font-size:13px;display:block}
.avatar .who small{font-size:9px;letter-spacing:2px;color:var(--gold);font-weight:700}

/* ---------- Views ---------- */
.views{flex:1;overflow-y:auto;overflow-x:hidden;padding:22px 26px 120px;scroll-behavior:smooth}
.view{display:none;max-width:1460px;margin:0 auto;animation:none}
.view.on{display:block;animation:viewIn .45s var(--ease) both}
@keyframes viewIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@media (prefers-reduced-motion:reduce){
  *,*::before,*::after{animation-duration:.01ms !important;transition-duration:.01ms !important}
}

/* ---------- Page header ---------- */
.page-eyebrow{font-family:var(--font-m);font-size:10px;letter-spacing:4px;color:var(--faint);font-weight:600;text-transform:uppercase;margin-bottom:2px}
.page-title{font-family:var(--font-d);font-weight:800;font-size:clamp(26px,3.4vw,40px);letter-spacing:-.5px;line-height:1.1}
.page-sub{display:flex;flex-wrap:wrap;align-items:center;gap:8px 18px;margin-top:8px;color:var(--muted);font-size:13px}
.page-sub .dot{width:4px;height:4px;border-radius:50%;background:var(--faint)}
.page-sub b{font-family:var(--font-m);color:var(--ink);font-weight:600}
.hairline{height:2px;border-radius:2px;margin:16px 0 20px;background:linear-gradient(90deg,var(--violet),var(--magenta) 40%,transparent 75%);max-width:900px}

/* ---------- Mode toggle (Cash/Business) ---------- */
.mode-wrap{display:inline-flex;position:relative;border:1px solid var(--line);border-radius:999px;background:var(--glass);padding:4px;margin:4px 0 20px}
.mode-pill{
  position:absolute;top:4px;left:4px;height:calc(100% - 8px);width:calc(50% - 4px);
  border-radius:999px;background:linear-gradient(120deg,var(--violet),var(--magenta));
  box-shadow:0 6px 22px rgba(139,92,246,.45);
  transition:transform .4s var(--ease);
}
.mode-wrap[data-mode="business"] .mode-pill{transform:translateX(100%)}
.mode-btn{
  position:relative;z-index:1;display:flex;align-items:center;gap:9px;
  padding:10px 26px;border-radius:999px;font-weight:700;font-size:14px;color:var(--muted);
  transition:color .3s var(--ease);min-width:190px;justify-content:center;
}
.mode-btn small{font-size:9.5px;letter-spacing:2.5px;font-weight:600;opacity:.85}
.mode-btn.sel{color:#fff}

/* ---------- Cards & glass ---------- */
.card{
  background:var(--glass);border:1px solid var(--line);border-radius:var(--r-lg);
  backdrop-filter:blur(20px);box-shadow:var(--shadow);
  transition:border-color .3s var(--ease);
}
.card:hover{border-color:var(--line-2)}
.card-head{display:flex;align-items:center;gap:10px;padding:18px 22px 0}
.card-eyebrow{font-family:var(--font-m);font-size:10px;letter-spacing:3px;color:var(--faint);font-weight:600;text-transform:uppercase}
.card-eyebrow::before{content:"";display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--violet);margin-right:8px;vertical-align:1px}

/* ---------- Stat cards (tilt + gradient + worm) ---------- */
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;margin-bottom:20px}
.stat{
  position:relative;border-radius:var(--r-lg);padding:20px 20px 16px;overflow:hidden;
  border:1px solid var(--line);min-height:168px;
  transform-style:preserve-3d;will-change:transform;
  transition:box-shadow .3s var(--ease);
  isolation:isolate;
}
.stat::after{content:"";position:absolute;inset:0;border-radius:inherit;background:radial-gradient(600px 200px at var(--mx,50%) var(--my,0%),rgba(255,255,255,.10),transparent 60%);opacity:0;transition:opacity .3s;z-index:1;pointer-events:none}
.stat:hover::after{opacity:1}
.stat.g-green{background:linear-gradient(150deg,rgba(16,80,52,.85),rgba(6,28,20,.9))}
.stat.g-red{background:linear-gradient(150deg,rgba(105,28,40,.85),rgba(38,8,14,.9))}
.stat.g-violet{background:linear-gradient(150deg,rgba(72,44,150,.85),rgba(24,14,52,.9))}
.stat.g-blue{background:linear-gradient(150deg,rgba(24,64,120,.85),rgba(8,20,44,.9))}
.stat.g-gold{background:linear-gradient(150deg,rgba(120,88,26,.85),rgba(44,30,8,.9))}
html[data-theme="light"] .stat.g-green{background:linear-gradient(150deg,#d9f7e8,#f2fdf8)}
html[data-theme="light"] .stat.g-red{background:linear-gradient(150deg,#ffe1e6,#fff4f5)}
html[data-theme="light"] .stat.g-violet{background:linear-gradient(150deg,#e8e0ff,#f6f2ff)}
html[data-theme="light"] .stat.g-blue{background:linear-gradient(150deg,#dcebff,#f2f8ff)}
html[data-theme="light"] .stat.g-gold{background:linear-gradient(150deg,#fdedc8,#fffaf0)}
.stat-top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
.stat-icon{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;color:#fff;flex:0 0 auto;transform:translateZ(30px)}
.stat-icon svg{width:22px;height:22px;stroke-width:2}
.i-green{background:linear-gradient(140deg,#34d399,#0ea56f);box-shadow:0 8px 24px rgba(52,211,153,.4)}
.i-red{background:linear-gradient(140deg,#fb5f6e,#d92643);box-shadow:0 8px 24px rgba(251,95,110,.4)}
.i-violet{background:linear-gradient(140deg,#a78bfa,#7c3aed);box-shadow:0 8px 24px rgba(139,92,246,.4)}
.i-blue{background:linear-gradient(140deg,#60a5fa,#2563eb);box-shadow:0 8px 24px rgba(96,165,250,.4)}
.i-gold{background:linear-gradient(140deg,#f5cf7d,#d9a13c);box-shadow:0 8px 24px rgba(240,196,108,.4)}
.stat .worm{width:110px;height:44px;overflow:visible}
.stat-num{
  font-family:var(--font-m);font-weight:700;font-size:clamp(22px,2.2vw,30px);
  letter-spacing:-.5px;margin-top:14px;font-variant-numeric:tabular-nums;transform:translateZ(24px);
}
.stat-cap{display:flex;align-items:center;gap:8px;margin-top:5px;font-size:12.5px;color:var(--muted)}
.stat-cap b{color:var(--ink);font-weight:600}
.badge{font-size:10.5px;font-weight:700;border-radius:8px;padding:2px 8px;letter-spacing:.3px}
.b-up{color:#7ef2c0;background:rgba(52,211,153,.16)}
.b-down{color:#ffb3bc;background:rgba(251,95,110,.18)}
html[data-theme="light"] .b-up{color:#0b7a52}
html[data-theme="light"] .b-down{color:#b91c34}

/* ---------- OPSI brief ---------- */
.brief{padding:22px 24px;margin-bottom:20px;position:relative;overflow:hidden}
.brief::before{content:"";position:absolute;top:-60px;right:-60px;width:260px;height:260px;border-radius:50%;background:radial-gradient(circle,rgba(139,92,246,.18),transparent 70%);pointer-events:none}
.brief-head{display:flex;align-items:center;gap:14px;margin-bottom:14px}
.orb-sm{width:46px;height:46px;border-radius:50%;position:relative;flex:0 0 auto;display:grid;place-items:center;background:radial-gradient(circle at 35% 30%,#b9a4ff,#6d3df0 55%,#2a1470);box-shadow:0 0 26px rgba(139,92,246,.55)}
.orb-sm::after{content:"";position:absolute;inset:-6px;border-radius:50%;border:1px solid rgba(139,92,246,.45);animation:pulse 2.6s var(--ease) infinite}
@keyframes pulse{0%{transform:scale(.9);opacity:.9}100%{transform:scale(1.35);opacity:0}}
.orb-sm svg{width:22px;height:22px;color:#fff}
.brief-title b{font-family:var(--font-d);font-size:16px;letter-spacing:.5px}
.brief-title small{display:block;color:var(--muted);font-size:12px}
.brief-body{font-size:16.5px;line-height:1.85;max-width:960px}
.brief-body .hl-name{color:var(--violet);font-weight:700}
.brief-body .hl-n{font-family:var(--font-m);font-weight:700;padding:0 2px}
.brief-body .n-red{color:var(--red)}.brief-body .n-amber{color:var(--gold)}.brief-body .n-cyan{color:var(--cyan)}.brief-body .n-green{color:var(--green)}
.caret{display:inline-block;width:3px;height:1.05em;background:var(--violet);vertical-align:-2px;margin-left:2px;animation:blink 1s steps(1) infinite}
@keyframes blink{50%{opacity:0}}

/* ---------- Ticker ---------- */
.ticker{display:flex;flex-wrap:wrap;gap:8px 22px;align-items:center;font-family:var(--font-m);font-size:12.5px;color:var(--muted);margin-top:8px}
.ticker b{color:var(--ink);font-weight:600}
.tick-live{display:inline-flex;align-items:center;gap:6px;color:var(--green);font-weight:600;font-size:11px;letter-spacing:1px}
.tick-live::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 10px var(--green);animation:blink 1.6s infinite}
.rate-live{color:var(--green) !important;text-shadow:0 0 12px rgba(52,211,153,.35)}
.live-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 10px var(--green);margin-left:7px;vertical-align:1px;animation:blink 1.6s infinite}

/* ---------- Two-column widgets ---------- */
.grid-2{display:grid;grid-template-columns:1.25fr 1fr;gap:16px;margin-bottom:20px}
.grid-3{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;margin-bottom:20px}
@media (max-width:1080px){.grid-2{grid-template-columns:1fr}}

/* ---------- Tables ---------- */
.tbl{width:100%;border-collapse:collapse;font-size:13.5px}
.tbl th{font-family:var(--font-m);font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--faint);font-weight:600;text-align:left;padding:10px 14px;border-bottom:1px solid var(--line)}
.tbl td{padding:12px 14px;border-bottom:1px solid var(--line);vertical-align:middle}
.tbl tr:last-child td{border-bottom:none}
.tbl tbody tr{transition:background .2s}
.tbl tbody tr:hover{background:rgba(139,92,246,.06)}
.tbl .num{font-family:var(--font-m);font-variant-numeric:tabular-nums;font-weight:600}
.pos{color:var(--green)}.neg{color:var(--red)}
.pill{font-size:10.5px;font-weight:700;border-radius:999px;padding:3px 10px;letter-spacing:.4px;display:inline-block}
.p-cash{color:#e9b3ff;background:rgba(244,114,182,.15);border:1px solid rgba(244,114,182,.35)}
.p-biz{color:#9fd4ff;background:rgba(96,165,250,.15);border:1px solid rgba(96,165,250,.35)}
.p-live{color:#7ef2c0;background:rgba(52,211,153,.14);border:1px solid rgba(52,211,153,.4)}
.p-wait{color:#ffd794;background:rgba(240,196,108,.14);border:1px solid rgba(240,196,108,.4)}
.p-done{color:var(--muted);background:rgba(255,255,255,.06);border:1px solid var(--line)}

/* ---------- Party avatar dot ---------- */
.pa{display:flex;align-items:center;gap:10px}
.pa i{width:32px;height:32px;border-radius:10px;display:grid;place-items:center;font-style:normal;font-weight:700;font-size:12px;color:#fff;flex:0 0 auto}

/* ---------- Trips / flight ---------- */
.trip{padding:18px 20px;border-bottom:1px solid var(--line)}
.trip:last-child{border-bottom:none}
.trip-top{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.trip-top .who{font-weight:700;font-size:14.5px}
.trip-top .fl{font-family:var(--font-m);font-size:11.5px;color:var(--cyan);border:1px solid rgba(34,211,238,.4);border-radius:8px;padding:2px 8px}
.route{display:flex;align-items:center;gap:10px;margin:14px 0 6px;font-family:var(--font-m);font-size:12px;color:var(--muted)}
.route .bar{flex:1;height:4px;border-radius:4px;background:rgba(255,255,255,.09);position:relative;overflow:visible}
html[data-theme="light"] .route .bar{background:rgba(22,26,46,.10)}
.route .fill{position:absolute;left:0;top:0;height:100%;border-radius:4px;background:linear-gradient(90deg,var(--cyan),var(--violet));width:0;transition:width 1.4s var(--ease)}
.route .plane{position:absolute;top:50%;transform:translate(-50%,-50%);left:0;transition:left 1.4s var(--ease);color:var(--cyan);filter:drop-shadow(0 0 8px rgba(34,211,238,.7))}
.route .plane svg{width:18px;height:18px;transform:rotate(45deg)}
.trip-meta{display:flex;flex-wrap:wrap;gap:6px 18px;font-size:12.5px;color:var(--muted);margin-top:8px}
.trip-meta b{color:var(--ink);font-family:var(--font-m);font-weight:600}

/* ---------- Bags ---------- */
.bags{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;padding:18px 20px 20px}
.bag{border:1px solid var(--line);border-radius:var(--r-md);padding:14px;background:rgba(255,255,255,.03);transition:transform .25s var(--ease),border-color .25s}
html[data-theme="light"] .bag{background:rgba(255,255,255,.5)}
.bag:hover{transform:translateY(-3px);border-color:rgba(139,92,246,.5)}
.bag .id{font-family:var(--font-m);font-weight:700;font-size:13px}
.bag .kg{font-family:var(--font-m);font-size:19px;font-weight:700;margin:6px 0 2px}
.bag .of{font-size:11px;color:var(--muted)}
.bag .meter{height:5px;border-radius:5px;background:rgba(255,255,255,.08);margin-top:9px;overflow:hidden}
.bag .meter i{display:block;height:100%;border-radius:5px;background:linear-gradient(90deg,var(--green),var(--cyan))}
.bag.over .meter i{background:linear-gradient(90deg,var(--gold),var(--red))}
.bag.over .kg{color:var(--red)}

/* ---------- Buttons ---------- */
.btn{
  display:inline-flex;align-items:center;gap:8px;font-weight:700;font-size:13.5px;
  border-radius:14px;padding:11px 20px;border:1px solid var(--line);
  background:var(--glass);color:var(--ink);transition:all .25s var(--ease);
}
.btn:hover{transform:translateY(-2px);border-color:var(--line-2)}
.btn.primary{background:linear-gradient(120deg,var(--violet),var(--magenta));border:none;color:#fff;box-shadow:0 8px 26px rgba(139,92,246,.4)}
.btn.primary:hover{box-shadow:0 12px 34px rgba(139,92,246,.55)}
.btn svg{width:16px;height:16px}
.iconbtn{width:38px;height:38px;border-radius:12px;border:1px solid var(--line);background:var(--glass);display:grid;place-items:center;color:var(--muted);transition:all .25s var(--ease)}
.iconbtn:hover{color:var(--ink);border-color:var(--line-2)}
.iconbtn svg{width:17px;height:17px}

/* ---------- Chart card ---------- */
.chart-wrap{padding:10px 16px 16px}
.legend{display:flex;gap:18px;padding:0 22px;margin-top:6px;font-size:12px;color:var(--muted)}
.legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}

/* ---------- Rates page ---------- */
.rate-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}
.rate-card{padding:20px 22px;position:relative;overflow:hidden}
.rate-src{font-family:var(--font-m);font-size:10px;letter-spacing:2px;color:var(--faint);text-transform:uppercase}
.rate-name{font-weight:700;font-size:15px;margin:4px 0 10px}
.rate-val{font-family:var(--font-m);font-weight:700;font-size:28px;font-variant-numeric:tabular-nums}
.rate-unit{font-size:12px;color:var(--muted);margin-left:6px;font-weight:500}
.rate-foot{display:flex;justify-content:space-between;align-items:center;margin-top:10px;font-size:11.5px;color:var(--muted)}

/* ---------- OPSI floating orb ---------- */
#opsiOrb{
  position:fixed;right:26px;bottom:26px;z-index:60;
  width:74px;height:74px;border-radius:50%;
  background:radial-gradient(circle at 34% 28%,#c8b6ff,#7443f5 52%,#231056);
  box-shadow:0 0 40px rgba(139,92,246,.6),0 14px 40px rgba(0,0,0,.5);
  display:grid;place-items:center;cursor:pointer;
  transition:transform .3s var(--ease);
}
#opsiOrb:hover{transform:scale(1.08)}
#opsiOrb svg{width:32px;height:32px;color:#fff}
#opsiOrb::before,#opsiOrb::after{content:"";position:absolute;inset:-10px;border-radius:50%;border:1.5px solid rgba(139,92,246,.5);animation:pulse 2.8s var(--ease) infinite}
#opsiOrb::after{inset:-20px;border-color:rgba(34,211,238,.3);animation-delay:1.2s}
#opsiOrb .tag{position:absolute;bottom:-20px;left:50%;transform:translateX(-50%);font-family:var(--font-m);font-size:10px;letter-spacing:3px;color:var(--violet);font-weight:700}
#opsiPanel{
  position:fixed;right:26px;bottom:120px;z-index:59;width:min(400px,calc(100vw - 52px));
  border-radius:22px;border:1px solid rgba(139,92,246,.35);
  background:var(--glass-2);backdrop-filter:blur(24px);box-shadow:var(--shadow);
  padding:20px;transform:translateY(18px) scale(.97);opacity:0;pointer-events:none;
  transition:all .35s var(--ease);
}
#opsiPanel.open{transform:none;opacity:1;pointer-events:auto}
#opsiPanel h4{font-family:var(--font-d);font-size:15px;margin-bottom:4px}
#opsiPanel p{font-size:13px;color:var(--muted);margin-bottom:14px}
.opsi-sug{display:flex;flex-direction:column;gap:8px}
.opsi-sug button{
  text-align:left;font-size:13px;font-weight:600;padding:11px 14px;border-radius:14px;
  border:1px solid var(--line);background:rgba(255,255,255,.04);transition:all .25s var(--ease);
}
html[data-theme="light"] .opsi-sug button{background:rgba(255,255,255,.6)}
.opsi-sug button:hover{border-color:rgba(139,92,246,.55);transform:translateX(4px)}
.opsi-sug button b{color:var(--cyan)}

/* ---------- Toast ---------- */
#toast{
  position:fixed;left:50%;bottom:30px;transform:translate(-50%,80px);z-index:80;
  background:var(--glass-2);border:1px solid rgba(139,92,246,.4);border-radius:16px;
  padding:12px 22px;font-weight:600;font-size:13.5px;backdrop-filter:blur(16px);
  box-shadow:var(--shadow);opacity:0;transition:all .4s var(--ease);pointer-events:none;
}
#toast.show{transform:translate(-50%,0);opacity:1}


/* ---------- Quote calculator ---------- */
.field{display:flex;flex-direction:column;gap:7px;margin-bottom:16px}
.field label{font-family:var(--font-m);font-size:10px;letter-spacing:2px;color:var(--faint);font-weight:600;text-transform:uppercase}
.field input{background:rgba(255,255,255,.05);border:1px solid var(--line);border-radius:14px;padding:13px 16px;color:var(--ink);font-family:var(--font-m);font-size:19px;font-weight:600;outline:none;transition:border-color .25s,box-shadow .25s;font-variant-numeric:tabular-nums;width:100%}
html[data-theme="light"] .field input{background:rgba(255,255,255,.7)}
.field input:focus{border-color:var(--violet);box-shadow:0 0 0 3px rgba(139,92,246,.18)}
.qs{border-radius:18px;padding:16px 20px;font-weight:800;font-size:15.5px;display:flex;align-items:center;gap:10px;transition:all .3s var(--ease)}
.qs.ok{background:rgba(52,211,153,.12);border:1px solid rgba(52,211,153,.5);color:#7ef2c0}
.qs.warn{background:rgba(240,196,108,.12);border:1px solid rgba(240,196,108,.5);color:#ffd794}
.qs.bad{background:rgba(251,95,110,.14);border:1px solid rgba(251,95,110,.6);color:#ffb3bc;animation:shake .5s var(--ease)}
html[data-theme="light"] .qs.ok{color:#0b7a52}
html[data-theme="light"] .qs.warn{color:#8a6410}
html[data-theme="light"] .qs.bad{color:#b91c34}
@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}50%{transform:translateX(5px)}75%{transform:translateX(-3px)}}


/* ---------- Fingerprint lock ---------- */
#lock{position:fixed;inset:0;z-index:190;display:none;flex-direction:column;align-items:center;justify-content:center;gap:16px;
  background:radial-gradient(1200px 700px at 50% 35%,#0b1030 0%,#060812 60%,#04050c 100%);transition:opacity .5s var(--ease)}
#lock.show{display:flex}
#lock.off{opacity:0;pointer-events:none}
#lock h3{font-family:var(--font-d);font-size:19px;font-weight:700}
#lock p{color:var(--muted);font-size:13px}
#fpBtn{width:118px;height:118px;border-radius:50%;display:grid;place-items:center;position:relative;
  border:1px solid var(--line);background:var(--glass);cursor:pointer;transition:transform .2s var(--ease);touch-action:none;-webkit-user-select:none;user-select:none}
#fpBtn:active{transform:scale(.96)}
#fpBtn svg.fp{width:52px;height:52px;color:var(--violet);transition:color .3s}
#fpBtn.done svg.fp{color:var(--green)}
#fpRing{position:absolute;inset:-7px;transform:rotate(-90deg)}
#fpRing circle{fill:none;stroke:var(--violet);stroke-width:3.5;stroke-linecap:round;stroke-dasharray:414;stroke-dashoffset:414;filter:drop-shadow(0 0 6px rgba(139,92,246,.6))}
#fpBtn.done #fpRing circle{stroke:var(--green)}
#lockSkip{font-size:12px;color:var(--faint);text-decoration:underline;margin-top:6px}

/* ---------- Calendar picker ---------- */
.datefield{cursor:pointer;caret-color:transparent}
#calPop{position:fixed;z-index:210;width:296px;border-radius:20px;border:1px solid rgba(139,92,246,.35);
  background:var(--glass-2);backdrop-filter:blur(24px);box-shadow:var(--shadow);padding:16px;
  opacity:0;transform:translateY(10px) scale(.97);pointer-events:none;transition:all .28s var(--ease)}
#calPop.open{opacity:1;transform:none;pointer-events:auto}
.cal-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.cal-head b{font-family:var(--font-d);font-size:14.5px}
.cal-nav{width:32px;height:32px;border-radius:10px;border:1px solid var(--line);display:grid;place-items:center;color:var(--muted);transition:all .2s}
.cal-nav:hover{color:var(--ink);border-color:var(--line-2)}
.cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;text-align:center}
.cal-grid .dow{font-family:var(--font-m);font-size:9.5px;color:var(--faint);letter-spacing:1px;padding:5px 0}
.cal-day{height:34px;border-radius:10px;font-family:var(--font-m);font-size:13px;font-weight:600;display:grid;place-items:center;color:var(--ink);transition:all .15s}
.cal-day:hover{background:rgba(139,92,246,.2)}
.cal-day.mute{color:var(--faint);opacity:.45}
.cal-day.today{border:1px solid rgba(34,211,238,.6);color:var(--cyan)}
.cal-day.sel{background:linear-gradient(120deg,var(--violet),var(--magenta));color:#fff;box-shadow:0 4px 14px rgba(139,92,246,.5)}
.field select{background:rgba(255,255,255,.05);border:1px solid var(--line);border-radius:14px;padding:13px 16px;color:var(--ink);font-family:var(--font-b);font-size:15px;font-weight:600;outline:none;width:100%;transition:border-color .25s}
html[data-theme="light"] .field select{background:rgba(255,255,255,.7)}
.field select:focus{border-color:var(--violet)}
.field select option{background:var(--bg-2);color:var(--ink)}

/* ---------- Boot / loading screen ---------- */
#boot{
  position:fixed;inset:0;z-index:200;display:flex;flex-direction:column;
  align-items:center;justify-content:center;gap:22px;
  background:radial-gradient(1200px 700px at 50% 35%,#0b1030 0%,#060812 60%,#04050c 100%);
  transition:opacity .6s var(--ease);
}
#boot.off{opacity:0;pointer-events:none}
#boot .brand{width:148px;height:148px;border-radius:38px;margin:0;animation-duration:6s;padding:4px}
#boot .brand-inner{border-radius:34px}
#boot .brand-inner small{font-size:13px;letter-spacing:6px;margin-top:4px}
#boot .boot-word{display:flex;align-items:center;gap:4px;font-family:var(--font-d);font-weight:800;font-size:30px}
#boot .boot-powered{display:flex;align-items:center;gap:9px;font-size:11px;letter-spacing:3px;color:var(--faint);font-weight:700}
#boot .boot-powered b{background:linear-gradient(92deg,#8b5cf6,#22d3ee);-webkit-background-clip:text;background-clip:text;color:transparent;letter-spacing:4px}
#boot .bar{width:210px;height:4px;border-radius:4px;background:rgba(255,255,255,.08);overflow:hidden;margin-top:6px}
#boot .bar i{display:block;height:100%;width:40%;border-radius:4px;
  background:linear-gradient(90deg,#8b5cf6,#22d3ee,#22c55e);
  animation:bootBar 1.1s var(--ease) infinite}
@keyframes bootBar{0%{transform:translateX(-110%)}100%{transform:translateX(320%)}}
#boot .boot-msg{font-size:12.5px;color:var(--muted);letter-spacing:.5px}

/* ---------- Responsive ---------- */
@media (max-width:860px){
  :root{--sb-w:74px}
  .nav-item{width:60px}
  .nav-glow{left:7px;width:60px}
  .nav-item span{display:none}
  .nav-item{height:52px;flex:0 0 52px}
  .nav-glow{height:52px}
  .views{padding:18px 16px 130px}
  .topbar{padding:12px 16px;flex-wrap:wrap;row-gap:8px}
  .chip.hidesm{display:none}
}
</style>
</head>
<body>
<div id="boot">
  <div class="brand"><div class="brand-inner">
    <svg class="circuit" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <path d="M4 14 H20 L28 22 V34"/><circle cx="28" cy="34" r="1.8"/>
      <path d="M38 2 V12"/><circle cx="38" cy="12" r="1.8"/>
      <path d="M56 4 V10 L64 18"/><circle cx="64" cy="18" r="1.8"/>
      <path d="M97 28 H82 L74 36"/><circle cx="74" cy="36" r="1.8"/>
      <path d="M98 54 H86"/><circle cx="86" cy="54" r="1.8"/>
      <path d="M94 90 H78 L70 82"/><circle cx="70" cy="82" r="1.8"/>
      <path d="M50 98 V88"/><circle cx="50" cy="88" r="1.8"/>
      <path d="M28 96 V84 L22 78"/><circle cx="22" cy="78" r="1.8"/>
      <path d="M2 62 H14 L20 68"/><circle cx="20" cy="68" r="1.8"/>
      <path d="M4 42 H12"/><circle cx="12" cy="42" r="1.8"/>
      <path class="cur" d="M4 14 H20 L28 22 V34"/>
      <path class="cur c2" d="M97 28 H82 L74 36"/>
      <path class="cur c3" d="M28 96 V84 L22 78"/>
    </svg>
    <svg class="lop-mark lop-alive" viewBox="0 0 100 100" width="76" height="76" aria-hidden="true">
      <path class="ring" d="M 62.3 16.2 A 36 36 0 0 1 68 81.2"/>
      <path class="ring" d="M 43.8 85.4 A 36 36 0 0 1 37.7 16.2"/>
      <path class="tail" d="M 47 84 L 51 99 L 63 79 Z"/>
      <path class="band" d="M 11 50 A 39 39 0 0 1 89 50"/>
      <rect class="cup" x="5" y="42" width="10" height="18" rx="5"/>
      <rect class="cup" x="85" y="42" width="10" height="18" rx="5"/>
      <circle class="eye" cx="39" cy="53" r="6.5"/>
      <circle class="eye r" cx="61" cy="53" r="6.5"/>
    </svg>
    <small>OPSI</small>
  </div></div>
  <div>
    <div class="boot-word" style="justify-content:center">
      <span class="wm-txt">Logi</span>
      <svg class="lop-mark" viewBox="0 0 100 100" width="30" height="30" style="color:#22d3ee" aria-hidden="true">
        <path class="ring" d="M 62.3 16.2 A 36 36 0 0 1 68 81.2"/>
        <path class="ring" d="M 43.8 85.4 A 36 36 0 0 1 37.7 16.2"/>
        <path class="tail" d="M 47 84 L 51 99 L 63 79 Z"/>
        <path class="band" d="M 11 50 A 39 39 0 0 1 89 50"/>
        <rect class="cup" x="5" y="42" width="10" height="18" rx="5"/>
        <rect class="cup" x="85" y="42" width="10" height="18" rx="5"/>
        <circle class="eye" cx="39" cy="53" r="6.5"/>
        <circle class="eye r" cx="61" cy="53" r="6.5"/>
      </svg>
      <span class="wm-txt">p</span><span class="pro" style="font-size:14px">Pro</span>
    </div>
    <div class="boot-powered" style="justify-content:center;margin-top:8px"><span class="pline l"></span>POWERED BY <b>OPSI</b><span class="pline r"></span></div>
  </div>
  <div class="bar"><i></i></div>
  <div class="boot-msg" id="bootMsg">OPSI jaag raha hai…</div>
</div>
<div id="lock">
  <svg class="lop-mark lop-alive" viewBox="0 0 100 100" width="54" height="54" style="color:#fff" aria-hidden="true">
    <path class="ring" d="M 62.3 16.2 A 36 36 0 0 1 68 81.2"/>
    <path class="ring" d="M 43.8 85.4 A 36 36 0 0 1 37.7 16.2"/>
    <path class="tail" d="M 47 84 L 51 99 L 63 79 Z"/>
    <path class="band" d="M 11 50 A 39 39 0 0 1 89 50"/>
    <rect class="cup" x="5" y="42" width="10" height="18" rx="5"/>
    <rect class="cup" x="85" y="42" width="10" height="18" rx="5"/>
    <circle class="eye" cx="39" cy="53" r="6.5"/>
    <circle class="eye r" cx="61" cy="53" r="6.5"/>
  </svg>
  <h3>Pehchaan zaroori hai</h3>
  <button id="fpBtn" aria-label="Fingerprint se login">
    <svg id="fpRing" viewBox="0 0 132 132"><circle cx="66" cy="66" r="66"/></svg>
    <svg class="fp" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">
      <path d="M17.8 6.7A7 7 0 0 0 5 11v2c0 1.8.3 3.5 1 5"/>
      <path d="M19 11v2a13 13 0 0 1-1.1 5.2"/>
      <path d="M12 11v2a9 9 0 0 0 1.8 5.4"/>
      <path d="M8.5 14a5.5 5.5 0 0 1-.1-1v-2a3.6 3.6 0 0 1 6.4-2.2"/>
      <path d="M15.4 12.5a20 20 0 0 1-.7 6.5"/>
    </svg>
  </button>
  <p id="lockMsg">Fingerprint par ungli rakh kar pakdiye</p>
  <button id="lockSkip">PIN se login (demo)</button>
</div>
<canvas id="sky"></canvas>
<canvas id="dust"></canvas>

<div id="app">
  <!-- ================= SIDEBAR ================= -->
  <aside class="sidebar">
    <div class="brand"><div class="brand-inner">
      <svg class="circuit" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path d="M4 14 H20 L28 22 V34"/><circle cx="28" cy="34" r="1.8"/>
        <path d="M38 2 V12"/><circle cx="38" cy="12" r="1.8"/>
        <path d="M56 4 V10 L64 18"/><circle cx="64" cy="18" r="1.8"/>
        <path d="M97 28 H82 L74 36"/><circle cx="74" cy="36" r="1.8"/>
        <path d="M98 54 H86"/><circle cx="86" cy="54" r="1.8"/>
        <path d="M94 90 H78 L70 82"/><circle cx="70" cy="82" r="1.8"/>
        <path d="M50 98 V88"/><circle cx="50" cy="88" r="1.8"/>
        <path d="M28 96 V84 L22 78"/><circle cx="22" cy="78" r="1.8"/>
        <path d="M2 62 H14 L20 68"/><circle cx="20" cy="68" r="1.8"/>
        <path d="M4 42 H12"/><circle cx="12" cy="42" r="1.8"/>
        <path class="cur" d="M4 14 H20 L28 22 V34"/>
        <path class="cur c2" d="M97 28 H82 L74 36"/>
        <path class="cur c3" d="M28 96 V84 L22 78"/>
      </svg>
      <svg class="lop-mark lop-alive" viewBox="0 0 100 100" width="32" height="32" aria-hidden="true">
        <path class="ring" d="M 62.3 16.2 A 36 36 0 0 1 68 81.2"/>
        <path class="ring" d="M 43.8 85.4 A 36 36 0 0 1 37.7 16.2"/>
        <path class="tail" d="M 47 84 L 51 99 L 63 79 Z"/>
        <path class="band" d="M 11 50 A 39 39 0 0 1 89 50"/>
        <rect class="cup" x="5" y="42" width="10" height="18" rx="5"/>
        <rect class="cup" x="85" y="42" width="10" height="18" rx="5"/>
        <circle class="eye" cx="39" cy="53" r="6.5"/>
        <circle class="eye r" cx="61" cy="53" r="6.5"/>
      </svg>
      <small>OPSI</small>
    </div></div>
    <nav class="nav" id="nav">
      <div class="nav-glow" id="navGlow"></div>
      <button class="nav-item active" data-view="dashboard"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg><span>Dashboard</span></button>
      <button class="nav-item" data-view="parties"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg><span>Parties</span></button>
      <button class="nav-item" data-view="invoices"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/></svg><span>Invoices</span></button>
      <button class="nav-item" data-view="shipments"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/></svg><span>Shipments</span></button>
      <button class="nav-item" data-view="trips"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg><span>Trips</span></button>
      <button class="nav-item" data-view="hisaab"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z"/></svg><span>Hisaab</span></button>
      <button class="nav-item" data-view="catalog"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2l8 4.5v9L12 20l-8-4.5v-9z"/><path d="M12 11L4 6.5M12 11l8-4.5M12 11v9"/><path d="M8 4.2l8 4.6"/></svg><span>Catalog</span></button>
      <button class="nav-item" data-view="quote"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8"/><path d="M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h.01M12 19h4"/></svg><span>Quote</span></button>
      <button class="nav-item" data-view="rates"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg><span>Rates</span></button>
      <div class="nav-sep"></div>
      <button class="nav-item" data-view="books"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg><span>Books</span></button>
      <button class="nav-item" data-view="reports"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 21h18"/><rect x="5" y="12" width="3" height="6" rx="1"/><rect x="10.5" y="8" width="3" height="10" rx="1"/><rect x="16" y="4" width="3" height="14" rx="1"/></svg><span>Reports</span></button>
      <button class="nav-item" data-view="sikhein"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/><path d="M22 10v6"/></svg><span>Sikhein</span></button>
      <button class="nav-item" data-view="settings"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg><span>Settings</span></button>
    </nav>
    <button class="theme-btn" id="themeBtn" title="Theme badlein">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="19" height="19" stroke-width="1.8"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"/></svg>
    </button>
  </aside>

  <!-- ================= MAIN ================= -->
  <div class="main">
    <header class="topbar">
      <div>
        <div class="wordmark">
          <span class="wm-txt">Logi</span>
          <svg class="lop-mark wm-o lop-alive" viewBox="0 0 100 100" width="24" height="24" aria-hidden="true">
            <path class="ring" d="M 62.3 16.2 A 36 36 0 0 1 68 81.2"/>
            <path class="ring" d="M 43.8 85.4 A 36 36 0 0 1 37.7 16.2"/>
            <path class="tail" d="M 47 84 L 51 99 L 63 79 Z"/>
            <path class="band" d="M 11 50 A 39 39 0 0 1 89 50"/>
            <rect class="cup" x="5" y="42" width="10" height="18" rx="5"/>
            <rect class="cup" x="85" y="42" width="10" height="18" rx="5"/>
            <circle class="eye" cx="39" cy="53" r="6.5"/>
            <circle class="eye r" cx="61" cy="53" r="6.5"/>
          </svg>
          <span class="wm-txt">p</span>
          <span class="pro">Pro</span>
        </div>
        <div class="powered"><span class="pline l"></span>POWERED BY <b>OPSI</b><span class="pline r"></span></div>
      </div>
      <div class="chip hidesm">BUILD <b>v49</b></div>
      <div class="chip hidesm" id="clockChip">--:--</div>
      <div class="avatar">
        <div class="avatar-ring"><i>KS</i></div>
        <div class="who"><b>K Singh</b><small>ADMIN</small></div>
      </div>
    </header>

    <main class="views" id="views">

    <!-- ============ DASHBOARD ============ -->
    <section class="view on" id="v-dashboard">
      <div class="page-eyebrow">Mission Control</div>
      <h1 class="page-title" id="greetTitle">Namaste, Kishan ji</h1>
      <div id="greetTail" style="color:var(--muted);font-size:13.5px;margin-top:4px"></div>
      <div class="page-sub">
        <span id="todayStr">Saturday, 15 Aug</span><span class="dot"></span>
        <span><b>2</b> trips live</span><span class="dot"></span>
        <span><b>6</b> bags taiyaar</span><span class="dot"></span>
        <span>Gold IN <b>&#8377;11,899</b></span><span class="dot"></span>
        <span>Gold BKK <b>&#3647;4,176</b></span><span class="dot"></span>
        <span>USD <b>&#8377;88.24</b> / <b>&#3647;32.41</b></span><span class="dot"></span>
        <span>Transfer <b id="tfRate" class="rate-live">&#8377;2.848</b><i class="live-dot"></i></span>
      </div>
      <div class="hairline"></div>

      <div class="mode-wrap" data-mode="cash" id="modeWrap">
        <div class="mode-pill"></div>
        <button class="mode-btn sel" data-mode="cash">Cash <small>KACHCHA</small></button>
        <button class="mode-btn" data-mode="business">Business <small>PAKKA</small></button>
      </div>

      <!-- OPSI daily brief -->
      <div class="card brief">
        <div class="brief-head">
          <div class="orb-sm"><svg class="circuit" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" style="clip-path:circle(50% at 50% 50%);opacity:.75">
            <path d="M4 20 H22 L30 28"/><circle cx="30" cy="28" r="2.2"/>
            <path d="M96 34 H80 L72 42"/><circle cx="72" cy="42" r="2.2"/>
            <path d="M26 94 V80"/><circle cx="26" cy="80" r="2.2"/>
            <path d="M78 92 L70 84"/><circle cx="70" cy="84" r="2.2"/>
            <path class="cur" d="M4 20 H22 L30 28"/>
            <path class="cur c2" d="M96 34 H80 L72 42"/>
          </svg><svg class="lop-mark lop-alive" viewBox="0 0 100 100" width="24" height="24" style="color:#fff" aria-hidden="true">
            <path class="ring" d="M 62.3 16.2 A 36 36 0 0 1 68 81.2"/>
            <path class="ring" d="M 43.8 85.4 A 36 36 0 0 1 37.7 16.2"/>
            <path class="tail" d="M 47 84 L 51 99 L 63 79 Z"/>
            <path class="band" d="M 11 50 A 39 39 0 0 1 89 50"/>
            <rect class="cup" x="5" y="42" width="10" height="18" rx="5"/>
            <rect class="cup" x="85" y="42" width="10" height="18" rx="5"/>
            <circle class="eye" cx="39" cy="53" r="6.5"/>
            <circle class="eye r" cx="61" cy="53" r="6.5"/>
          </svg></div>
          <div class="brief-title"><b>OPSI</b><small>aapka daily brief</small></div>
          <div style="margin-left:auto;display:flex;gap:8px">
            <button class="iconbtn" data-goto="reports" title="Reports"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 21h18"/><rect x="5" y="12" width="3" height="6" rx="1"/><rect x="10.5" y="8" width="3" height="10" rx="1"/><rect x="16" y="4" width="3" height="14" rx="1"/></svg></button>
            <button class="iconbtn" id="briefReplay" title="Dobara sunao"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M1 4v6h6"/><path d="M3.5 15a9 9 0 1 0 2-9.5L1 10"/></svg></button>
          </div>
        </div>
        <div class="brief-body" id="briefBody"></div>
      </div>

      <!-- Stat cards -->
      <div class="stats" id="statCards">
        <div class="stat g-green" data-tilt>
          <div class="stat-top">
            <div class="stat-icon i-green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 5v14"/><path d="M19 12l-7 7-7-7"/></svg></div>
            <svg class="worm" data-worm="4,9,7,12,10,16,14,19,22" data-color="#34d399"></svg>
          </div>
          <div class="stat-num" data-count="61250" data-prefix="&#8377;">&#8377;0</div>
          <div class="stat-cap"><b>4 parties</b> · Aapko lena hai <span class="badge b-up">&#9650; 6.2%</span></div>
        </div>
        <div class="stat g-red" data-tilt>
          <div class="stat-top">
            <div class="stat-icon i-red"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg></div>
            <svg class="worm" data-worm="6,8,13,11,16,14,20,18,24" data-color="#fb5f6e"></svg>
          </div>
          <div class="stat-num" data-count="101460" data-prefix="&#8377;">&#8377;0</div>
          <div class="stat-cap"><b>outstanding</b> · Aapko dena hai <span class="badge b-down">&#9660; dhyaan dein</span></div>
        </div>
        <div class="stat g-violet" data-tilt>
          <div class="stat-top">
            <div class="stat-icon i-violet"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 6-7"/></svg></div>
            <svg class="worm" data-worm="10,14,8,15,11,18,15,13,20" data-color="#a78bfa"></svg>
          </div>
          <div class="stat-num" data-count="40210" data-prefix="&#8377;">&#8377;0</div>
          <div class="stat-cap"><b>Net position</b> <span class="badge b-down">&#9660; dena zyada</span></div>
        </div>
        <div class="stat g-blue" data-tilt>
          <div class="stat-top">
            <div class="stat-icon i-blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
            <svg class="worm" data-worm="8,10,12,11,14,16,15,18,21" data-color="#60a5fa"></svg>
          </div>
          <div class="stat-num" data-count="5">0</div>
          <div class="stat-cap"><b>live</b> · Total parties <span class="badge b-up">sab active</span></div>
        </div>
        <div class="stat g-gold" data-tilt>
          <div class="stat-top">
            <div class="stat-icon i-gold"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 3h12l3 6-9 12L3 9z"/><path d="M3 9h18"/><path d="M12 21L8 9l4-6 4 6z"/></svg></div>
            <svg class="worm" data-worm="14,13,15,12,14,16,17,19,22" data-color="#f0c46c"></svg>
          </div>
          <div class="stat-num" data-count="412" data-prefix="" data-suffix=" g">0 g</div>
          <div class="stat-cap"><b>Gold stock</b> · &#8776; &#8377;49.02L aaj ke rate par <span class="badge b-up">&#9650; hold</span></div>
        </div>
      </div>

      <!-- Two columns: parties + trips -->
      <div class="grid-2">
        <div class="card">
          <div class="card-head"><span class="card-eyebrow">Top Parties — Outstanding</span>
            <button class="iconbtn" data-goto="parties" style="margin-left:auto" title="Sab dekho"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg></button>
          </div>
          <div style="padding:6px 8px 12px">
            <table class="tbl">
              <thead><tr><th>Party</th><th>Mode</th><th style="text-align:right">INR</th><th style="text-align:right">THB</th></tr></thead>
              <tbody id="topParties"></tbody>
            </table>
          </div>
        </div>
        <div class="card">
          <div class="card-head"><span class="card-eyebrow">Upcoming Trips — Live Flight</span>
            <button class="iconbtn" data-goto="trips" style="margin-left:auto" title="Sab dekho"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg></button>
          </div>
          <div id="dashTrips"></div>
        </div>
      </div>

      <!-- Cashflow chart -->
      <div class="card" style="margin-bottom:20px">
        <div class="card-head"><span class="card-eyebrow">Cashflow — Pichhle 12 hafte</span></div>
        <div class="chart-wrap"><svg id="flowChart" width="100%" height="230" preserveAspectRatio="none"></svg></div>
        <div class="legend" style="padding-bottom:16px">
          <span><i style="background:#34d399"></i>Aaya (IN)</span>
          <span><i style="background:#fb5f6e"></i>Gaya (OUT)</span>
          <span><i style="background:#f0c46c"></i>Gold value</span>
        </div>
      </div>
    </section>

    <!-- ============ PARTIES ============ -->
    <section class="view" id="v-parties">
      <div class="page-eyebrow">Log</div>
      <h1 class="page-title">Parties</h1>
      <div class="page-sub"><span><b>5</b> active</span><span class="dot"></span><span>Parent &#8594; End customer structure</span></div>
      <div class="hairline"></div>
      <div style="display:flex;gap:10px;margin-bottom:18px;flex-wrap:wrap">
        <button class="btn primary" data-toast="Nayi party ka form — demo mode"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>Nayi Party</button>
        <button class="btn" data-toast="PDF export — demo mode">Hisaab PDF bhejo</button>
      </div>
      <div class="card">
        <div style="padding:6px 8px 12px">
        <table class="tbl">
          <thead><tr><th>Party</th><th>Sheher</th><th>Mode</th><th>Freight rate</th><th style="text-align:right">Balance INR</th><th style="text-align:right">Balance THB</th><th></th></tr></thead>
          <tbody id="partyRows"></tbody>
        </table>
        </div>
      </div>
    </section>

    <!-- ============ INVOICES ============ -->
    <section class="view" id="v-invoices">
      <div class="page-eyebrow">Billing</div>
      <h1 class="page-title">Invoices &amp; Receipts</h1>
      <div class="page-sub"><span>Kachcha receipt = quick save</span><span class="dot"></span><span>Pakka = GST + confirm popup</span></div>
      <div class="hairline"></div>
      <div class="mode-wrap" data-mode="cash" id="modeWrap2">
        <div class="mode-pill"></div>
        <button class="mode-btn sel" data-mode="cash">Cash <small>KACHCHA</small></button>
        <button class="mode-btn" data-mode="business">Business <small>PAKKA</small></button>
      </div>
      <div class="card">
        <div class="card-head"><span class="card-eyebrow">Recent</span>
          <button class="btn primary" style="margin-left:auto;margin-top:12px" data-toast="Naya invoice form — demo mode">+ Naya</button>
        </div>
        <div style="padding:6px 8px 12px">
        <table class="tbl">
          <thead><tr><th>No.</th><th>Party</th><th>Type</th><th>Items</th><th style="text-align:right">Amount</th><th>Status</th></tr></thead>
          <tbody id="invRows"></tbody>
        </table>
        </div>
      </div>
    </section>

    <!-- ============ SHIPMENTS ============ -->
    <section class="view" id="v-shipments">
      <div class="page-eyebrow">Maal</div>
      <h1 class="page-title">Shipments &amp; Bags</h1>
      <div class="page-sub"><span><b>6</b> bags taiyaar</span><span class="dot"></span><span>Max 30–40 kg / bag</span><span class="dot"></span><span>FIFO assignment</span></div>
      <div class="hairline"></div>
      <div class="card" style="margin-bottom:16px">
        <div class="card-head"><span class="card-eyebrow">Ready Bags — Delhi Warehouse 1</span></div>
        <div class="bags" id="bagGrid"></div>
      </div>
      <div class="card">
        <div class="card-head"><span class="card-eyebrow">Open Shipments</span></div>
        <div style="padding:6px 8px 12px">
        <table class="tbl">
          <thead><tr><th>Shipment</th><th>Parties</th><th>Bags</th><th>Weight</th><th>Carrier</th><th>Status</th></tr></thead>
          <tbody id="shipRows"></tbody>
        </table>
        </div>
      </div>
    </section>

    <!-- ============ TRIPS ============ -->
    <section class="view" id="v-trips">
      <div class="page-eyebrow">Safar</div>
      <h1 class="page-title">Trips — Kolkata &#8594; Bangkok</h1>
      <div class="page-sub"><span><b>2</b> live</span><span class="dot"></span><span><b>1</b> planned</span><span class="dot"></span><span>Flight tracking live</span></div>
      <div class="hairline"></div>
      <div class="card" style="padding:22px;margin-bottom:16px">
        <div class="card-eyebrow" style="margin-bottom:16px">Nayi Trip Plan Karein</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:14px;align-items:end">
          <div class="field" style="margin:0">
            <label>Delivery Partner</label>
            <select id="tpWho"><option>Ramesh bhai</option><option>Vikas</option><option>Suresh</option></select>
          </div>
          <div class="field" style="margin:0">
            <label>Trip ki date</label>
            <input class="datefield" id="tpDate" readonly placeholder="Calendar se chunein" inputmode="none">
          </div>
          <div class="field" style="margin:0">
            <label>Kitna weight chahiye (kg)</label>
            <input type="number" id="tpKg" value="50" inputmode="numeric">
          </div>
          <button class="btn primary" id="tpGo" style="height:50px">Plan karo</button>
        </div>
      </div>
      <div class="card" id="tripList"></div>
    </section>

    <!-- ============ HISAAB ============ -->
    <section class="view" id="v-hisaab">
      <div class="page-eyebrow">Khata</div>
      <h1 class="page-title">Hisaab — Party-wise</h1>
      <div class="page-sub"><span>INR + THB saath-saath</span><span class="dot"></span><span>Har transaction auto-post</span></div>
      <div class="hairline"></div>
      <div class="grid-2">
        <div class="card">
          <div class="card-head"><span class="card-eyebrow">Lalit Traders — Ledger</span></div>
          <div style="padding:6px 8px 12px">
          <table class="tbl">
            <thead><tr><th>Date</th><th>Detail</th><th style="text-align:right">INR</th><th style="text-align:right">THB</th></tr></thead>
            <tbody id="ledgerRows"></tbody>
          </table>
          </div>
        </div>
        <div>
          <div class="stats" style="grid-template-columns:1fr">
            <div class="stat g-violet" data-tilt>
              <div class="stat-top">
                <div class="stat-icon i-violet"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z"/></svg></div>
                <svg class="worm" data-worm="8,12,10,14,13,12,16,18,21" data-color="#a78bfa"></svg>
              </div>
              <div class="stat-num">&#8377;28,400 <span style="font-size:14px;color:var(--muted)">+</span> &#3647;9,150</div>
              <div class="stat-cap"><b>Lalit Traders</b> · Aapko lena hai <span class="badge b-up">clear track</span></div>
            </div>
          </div>
          <div class="card" style="padding:18px 20px">
            <div class="card-eyebrow" style="margin-bottom:12px">PDF Bhejo — Smart Range</div>
            <div class="opsi-sug">
              <button data-toast="PDF: last sent + nayi entries — demo">Last bheja hua + <b>nayi entries</b> (recommended)</button>
              <button data-toast="PDF: poora FY — demo">Poora FY 2026–27</button>
              <button data-toast="PDF: last month — demo">Last month</button>
              <button data-toast="PDF: custom range — demo">Date-to-date custom</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ RATES ============ -->
    <section class="view" id="v-rates">
      <div class="page-eyebrow">Bhaav</div>
      <h1 class="page-title">Live Rates</h1>
      <div class="page-sub"><span class="tick-live">60s REFRESH</span><span class="dot"></span><span id="rateTime">abhi update hua</span></div>
      <div class="hairline"></div>
      <div class="rate-grid">
        <div class="card rate-card" data-tilt>
          <div class="rate-src">SLN Bullion · India</div>
          <div class="rate-name">Gold 999.9 — Sell</div>
          <div class="rate-val" style="color:var(--gold)">&#8377;11,899<span class="rate-unit">/ gram</span></div>
          <div class="rate-foot"><span class="badge b-up">&#9650; 0.4% aaj</span><svg class="worm" data-worm="10,12,11,14,13,15,17,16,20" data-color="#f0c46c" width="90" height="34"></svg></div>
        </div>
        <div class="card rate-card" data-tilt>
          <div class="rate-src">InterGold · Thailand</div>
          <div class="rate-name">Gold 999.9 — Buy <span style="font-size:11px;color:var(--muted)">(&#3607;&#3629;&#3591; thong = sona)</span></div>
          <div class="rate-val" style="color:var(--gold)">&#3647;4,176<span class="rate-unit">/ gram</span></div>
          <div class="rate-foot"><span class="badge b-up">&#9650; 0.2%</span><svg class="worm" data-worm="12,11,13,12,14,16,15,18,19" data-color="#f0c46c" width="90" height="34"></svg></div>
        </div>
        <div class="card rate-card" data-tilt>
          <div class="rate-src">XE.com</div>
          <div class="rate-name">USD &#8594; INR</div>
          <div class="rate-val" style="color:var(--cyan)">&#8377;88.24</div>
          <div class="rate-foot"><span class="badge b-down">&#9660; 0.1%</span><svg class="worm" data-worm="14,13,15,12,13,11,12,10,11" data-color="#22d3ee" width="90" height="34"></svg></div>
        </div>
        <div class="card rate-card" data-tilt>
          <div class="rate-src">Super Rich · Thailand</div>
          <div class="rate-name">USD &#8594; THB</div>
          <div class="rate-val" style="color:var(--cyan)">&#3647;32.41</div>
          <div class="rate-foot"><span class="badge b-up">&#9650; 0.3%</span><svg class="worm" data-worm="10,11,12,13,12,14,15,16,18" data-color="#22d3ee" width="90" height="34"></svg></div>
        </div>
        <div class="card rate-card" data-tilt style="border-color:rgba(139,92,246,.45)">
          <div class="rate-src">Aapka Rate</div>
          <div class="rate-name">Transfer Rate — quote guard on</div>
          <div class="rate-val rate-live" id="tfRate2">&#8377;2.848<span class="rate-unit">/ &#3647;</span><i class="live-dot"></i></div>
          <div class="rate-foot"><span class="badge b-up">margin safe &#10003;</span><span style="font-size:11px;color:var(--muted)">ulta rate = OPSI rokega</span></div>
        </div>
      </div>
    </section>


    <!-- ============ CATALOG / INVENTORY ============ -->
    <section class="view" id="v-catalog">
      <div class="page-eyebrow">Maal-Khana</div>
      <h1 class="page-title">Catalog &amp; Inventory</h1>
      <div class="page-sub"><span><b>~500</b> variations</span><span class="dot"></span><span>3 warehouses</span><span class="dot"></span><span>Kachcha / Pakka stock alag-alag</span></div>
      <div class="hairline"></div>
      <div class="grid-3">
        <div class="card" style="padding:20px" data-tilt>
          <div class="card-eyebrow">Warehouse 1 — Paharganj</div>
          <div class="stat-num" style="margin-top:10px;font-size:24px">2,140 <span style="font-size:13px;color:var(--muted)">items</span></div>
          <div class="bag" style="border:none;padding:0;background:none;margin-top:8px"><div class="meter"><i style="width:78%"></i></div></div>
          <div style="font-size:12px;color:var(--muted);margin-top:6px">78% bhara · 4 sections</div>
        </div>
        <div class="card" style="padding:20px" data-tilt>
          <div class="card-eyebrow">Warehouse 2 — Karol Bagh</div>
          <div class="stat-num" style="margin-top:10px;font-size:24px">1,380 <span style="font-size:13px;color:var(--muted)">items</span></div>
          <div class="bag" style="border:none;padding:0;background:none;margin-top:8px"><div class="meter"><i style="width:52%"></i></div></div>
          <div style="font-size:12px;color:var(--muted);margin-top:6px">52% bhara · 3 sections</div>
        </div>
        <div class="card" style="padding:20px" data-tilt>
          <div class="card-eyebrow">Warehouse 3 — Sadar</div>
          <div class="stat-num" style="margin-top:10px;font-size:24px">640 <span style="font-size:13px;color:var(--muted)">items</span></div>
          <div class="bag" style="border:none;padding:0;background:none;margin-top:8px"><div class="meter"><i style="width:31%"></i></div></div>
          <div style="font-size:12px;color:var(--muted);margin-top:6px">31% bhara · 2 sections</div>
        </div>
      </div>
      <div class="card">
        <div class="card-head"><span class="card-eyebrow">Stock — Top Items</span>
          <button class="btn primary" style="margin-left:auto;margin-top:12px" data-toast="Naya item form — demo mode">+ Item</button>
        </div>
        <div style="padding:6px 8px 12px">
        <table class="tbl">
          <thead><tr><th>Item</th><th>Category</th><th>Books</th><th style="text-align:right">Qty</th><th>Location</th><th style="text-align:right">Value</th></tr></thead>
          <tbody id="stockRows"></tbody>
        </table>
        </div>
      </div>
    </section>

    <!-- ============ QUOTE — TRANSFER RATE CALCULATOR ============ -->
    <section class="view" id="v-quote">
      <div class="page-eyebrow">Sauda</div>
      <h1 class="page-title">Quote — Transfer Rate</h1>
      <div class="page-sub"><span>Ulta rate? OPSI rokega</span><span class="dot"></span><span>Usool: jo MIL rahi hai zyada, jo DENI hai kam</span></div>
      <div class="hairline"></div>
      <div class="grid-2">
        <div class="card" style="padding:24px">
          <div class="card-eyebrow" style="margin-bottom:18px">Rate Guard Calculator</div>
          <div class="field">
            <label>Customer deta hai (Bangkok) — THB</label>
            <input type="number" id="qThb" value="100000" inputmode="numeric">
          </div>
          <div class="field">
            <label>Aapka quote — &#8377; per &#3647;</label>
            <input type="number" id="qRate" value="2.848" step="0.001" inputmode="decimal">
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
            <button class="btn" data-qr="2.80">&#8377;2.800</button>
            <button class="btn" data-qr="2.848">&#8377;2.848</button>
            <button class="btn" data-qr="2.90">&#8377;2.900</button>
            <button class="btn" data-qr="2.96">&#8377;2.960 (galat)</button>
          </div>
          <div style="font-size:12.5px;color:var(--muted)">Aaj ki asli keemat: <b class="num" style="color:var(--ink)">&#8377;2.930 / &#3647;</b> <span style="opacity:.8">(gold + dollar cycle se calculated)</span></div>
        </div>
        <div>
          <div id="qStatus" class="qs ok" style="margin-bottom:16px">Margin safe &#10003;</div>
          <div class="card" style="padding:22px">
            <table class="tbl">
              <tbody>
                <tr><td>Customer ko INR dena</td><td class="num" style="text-align:right;font-size:17px" id="qInr">&#8377;2,84,800</td></tr>
                <tr><td>Aapki asli value (&#8377;2.930/&#3647;)</td><td class="num" style="text-align:right" id="qVal">&#8377;2,93,000</td></tr>
                <tr><td><b>Aapka munafa</b></td><td class="num pos" style="text-align:right;font-size:17px" id="qProfit">+&#8377;8,200</td></tr>
                <tr><td>Margin</td><td class="num" style="text-align:right" id="qPct">2.80%</td></tr>
              </tbody>
            </table>
          </div>
          <div class="card" style="padding:16px 20px;margin-top:14px;font-size:13px;color:var(--muted);line-height:1.7">
            <b style="color:var(--ink)">Yaad rahe:</b> customer ko rupaya turant jaata hai — gold ke aane ka intezaar nahi. Isliye rate hamesha asli keemat se <b style="color:var(--green)">neeche</b> quote karo.
          </div>
        </div>
      </div>
    </section>

    <!-- ============ BOOKS ============ -->
    <section class="view" id="v-books">
      <div class="page-eyebrow">Bahi-Khata</div>
      <h1 class="page-title">Books</h1>
      <div class="page-sub"><span>Kachcha aur Pakka — kabhi mix nahi</span><span class="dot"></span><span>GST sirf Pakka se</span></div>
      <div class="hairline"></div>
      <div class="grid-2">
        <div class="card" style="padding:24px;border-color:rgba(244,114,182,.3)">
          <span class="pill p-cash">KACHCHA</span>
          <h3 style="font-family:var(--font-d);margin:12px 0 4px">Cash Khata</h3>
          <p style="font-size:13px;color:var(--muted);margin-bottom:16px">Sirf aapke liye — kisi portal par kabhi nahi jaata.</p>
          <table class="tbl"><tbody>
            <tr><td>Entries is FY</td><td class="num" style="text-align:right">132</td></tr>
            <tr><td>Aapko lena hai</td><td class="num pos" style="text-align:right">&#8377;61,250</td></tr>
            <tr><td>Aapko dena hai</td><td class="num neg" style="text-align:right">&#8377;18,400</td></tr>
            <tr><td>Gold stock (aaj)</td><td class="num" style="text-align:right;color:var(--gold)">412 g</td></tr>
          </tbody></table>
        </div>
        <div class="card" style="padding:24px;border-color:rgba(96,165,250,.3)">
          <span class="pill p-biz">PAKKA</span>
          <h3 style="font-family:var(--font-d);margin:12px 0 4px">Business Books</h3>
          <p style="font-size:13px;color:var(--muted);margin-bottom:16px">TallyPrime format · CA-ready · GST portal se juda.</p>
          <table class="tbl"><tbody>
            <tr><td><b>Singh Exports</b> — FY turnover</td><td class="num" style="text-align:right">&#8377;42.6L</td></tr>
            <tr><td><b>Awadh Enterprise</b> — FY turnover</td><td class="num" style="text-align:right">&#8377;11.2L</td></tr>
            <tr><td>GST filed till</td><td class="num" style="text-align:right;color:var(--green)">July 2026 &#10003;</td></tr>
            <tr><td>Pending invoices</td><td class="num" style="text-align:right;color:var(--gold)">3</td></tr>
          </tbody></table>
        </div>
      </div>
      <div class="card" style="padding:16px 22px;font-size:13px;color:var(--muted)">
        <b style="color:var(--ink)">Deewar pakki hai:</b> dono books ka data, inventory aur reports bilkul alag rehte hain — koi combined report nahi banti, aur kachcha kabhi GST portal ki taraf nahi jaata.
      </div>
    </section>

    <!-- ============ SIKHEIN ============ -->
    <section class="view" id="v-sikhein">
      <div class="page-eyebrow">Guru</div>
      <h1 class="page-title">Sikhein</h1>
      <div class="page-sub"><span>Guided mode — aapke liye bhi, staff ke liye bhi</span></div>
      <div class="hairline"></div>
      <div class="grid-3">
        <div class="card" style="padding:22px" data-tilt>
          <div class="card-eyebrow">Aapka Personal Tour</div>
          <p style="font-size:13px;color:var(--muted);margin:10px 0 14px">OPSI aapko poora app ghuma kar dikhayega — har module, har shortcut.</p>
          <div class="bag" style="border:none;padding:0;background:none"><div class="meter"><i style="width:40%"></i></div></div>
          <div style="font-size:12px;color:var(--muted);margin:6px 0 14px">4/10 lessons</div>
          <button class="btn primary" data-toast="Personal tour — demo mode">Jaari rakhein</button>
        </div>
        <div class="card" style="padding:22px" data-tilt>
          <div class="card-eyebrow">TEAM Mode Training</div>
          <p style="font-size:13px;color:var(--muted);margin:10px 0 14px">Staff ke liye: photo kheencho ya bolo — baaki OPSI karega. Aapke approval ke baad hi entry pakki.</p>
          <div class="bag" style="border:none;padding:0;background:none"><div class="meter"><i style="width:0%"></i></div></div>
          <div style="font-size:12px;color:var(--muted);margin:6px 0 14px">Shuru nahi hua</div>
          <button class="btn" data-toast="TEAM training — demo mode">Shuru karein</button>
        </div>
        <div class="card" style="padding:22px" data-tilt>
          <div class="card-eyebrow">Front-desk: Pakka Billing</div>
          <p style="font-size:13px;color:var(--muted);margin:10px 0 14px">GST invoice, confirm popup, TallyPrime-style vouchers — step by step.</p>
          <div class="bag" style="border:none;padding:0;background:none"><div class="meter"><i style="width:15%"></i></div></div>
          <div style="font-size:12px;color:var(--muted);margin:6px 0 14px">1.5/10 lessons</div>
          <button class="btn" data-toast="Billing training — demo mode">Jaari rakhein</button>
        </div>
      </div>
    </section>

    <!-- ============ REPORTS ============ -->
    <section class="view" id="v-reports">
      <div class="page-eyebrow">Kaghaz</div>
      <h1 class="page-title">Reports</h1>
      <div class="page-sub"><span>TallyPrime format PDF</span><span class="dot"></span><span>Kachcha / Pakka kabhi mix nahi</span></div>
      <div class="hairline"></div>
      <div class="grid-3">
        <div class="card" style="padding:22px" data-tilt>
          <div class="card-eyebrow">Business · Pakka</div>
          <h3 style="font-family:var(--font-d);margin:8px 0 6px">GST Summary</h3>
          <p style="font-size:13px;color:var(--muted);margin-bottom:14px">Singh Exports + Awadh — portal-ready, CA format.</p>
          <button class="btn" data-toast="GST report — demo">Generate</button>
        </div>
        <div class="card" style="padding:22px" data-tilt>
          <div class="card-eyebrow">Cash · Kachcha</div>
          <h3 style="font-family:var(--font-d);margin:8px 0 6px">Khata Summary</h3>
          <p style="font-size:13px;color:var(--muted);margin-bottom:14px">Sirf aapke liye — kisi portal par kabhi nahi.</p>
          <button class="btn" data-toast="Khata report — demo">Generate</button>
        </div>
        <div class="card" style="padding:22px" data-tilt>
          <div class="card-eyebrow">Shipment</div>
          <h3 style="font-family:var(--font-d);margin:8px 0 6px">Packing List</h3>
          <p style="font-size:13px;color:var(--muted);margin-bottom:14px">Bag-wise: kya maal, kis party ka, kitne kilo. Pakka mein USD value ke saath.</p>
          <button class="btn" data-toast="Packing list — demo">Generate</button>
        </div>
      </div>
    </section>

    <!-- ============ SETTINGS ============ -->
    <section class="view" id="v-settings">
      <div class="page-eyebrow">Admin</div>
      <h1 class="page-title">Settings</h1>
      <div class="page-sub"><span>Users · Permissions · Rate cards</span></div>
      <div class="hairline"></div>
      <div class="grid-3">
        <div class="card" style="padding:22px">
          <div class="card-eyebrow">Users</div>
          <div style="margin-top:14px;display:flex;flex-direction:column;gap:12px">
            <div class="pa"><i style="background:linear-gradient(135deg,#8b5cf6,#f472b6)">KS</i><div><b>K Singh</b><div style="font-size:11px;color:var(--gold);letter-spacing:1px">ADMIN — full access</div></div></div>
            <div class="pa"><i style="background:linear-gradient(135deg,#60a5fa,#22d3ee)">PJ</i><div><b>Pita ji</b><div style="font-size:11px;color:var(--muted)">Co-owner — Maal Bheja + Hisaab</div></div></div>
            <div class="pa"><i style="background:linear-gradient(135deg,#34d399,#0ea56f)">FD</i><div><b>Front desk</b><div style="font-size:11px;color:var(--muted)">Business books only</div></div></div>
            <div class="pa"><i style="background:linear-gradient(135deg,#f0c46c,#d9a13c)">TM</i><div><b>TEAM mode ×2</b><div style="font-size:11px;color:var(--muted)">Photo + voice → aapka approval</div></div></div>
          </div>
        </div>
        <div class="card" style="padding:22px">
          <div class="card-eyebrow">Partner Rate Card</div>
          <div style="margin-top:12px">
          <table class="tbl">
            <tbody>
              <tr><td>Bags (kapda)</td><td class="num" style="text-align:right">&#8377;200 / kg</td></tr>
              <tr><td>Commodity</td><td class="num" style="text-align:right">&#8377;2,500 / unit</td></tr>
              <tr><td>Forex carry</td><td class="num" style="text-align:right">&#8377;0.50 / USD</td></tr>
              <tr><td>Thai goods wapsi</td><td class="num" style="text-align:right">&#8377;350 / kg</td></tr>
            </tbody>
          </table>
          </div>
        </div>
        <div class="card" style="padding:22px">
          <div class="card-eyebrow">Privacy Wall</div>
          <p style="font-size:13.5px;color:var(--muted);margin-top:12px;line-height:1.7">Gold, dollar aur transfer-rate ka poora kaam <b style="color:var(--ink)">sirf aapko</b> dikhta hai. Staff permissions mein iska koi toggle hi nahi hai — khulne ka raasta band.</p>
          <div class="pill p-live" style="margin-top:10px">LOCKED &#10003;</div>
        </div>
      </div>
    </section>

    </main>
  </div>
</div>

<!-- OPSI orb + panel + toast -->
<div id="opsiPanel">
  <div style="display:flex;align-items:center;gap:11px;margin-bottom:6px">
    <svg class="lop-mark lop-alive" viewBox="0 0 100 100" width="26" height="26" style="color:var(--violet)" aria-hidden="true">
      <path class="ring" d="M 62.3 16.2 A 36 36 0 0 1 68 81.2"/>
      <path class="ring" d="M 43.8 85.4 A 36 36 0 0 1 37.7 16.2"/>
      <path class="tail" d="M 47 84 L 51 99 L 63 79 Z"/>
      <path class="band" d="M 11 50 A 39 39 0 0 1 89 50"/>
      <rect class="cup" x="5" y="42" width="10" height="18" rx="5"/>
      <rect class="cup" x="85" y="42" width="10" height="18" rx="5"/>
      <circle class="eye" cx="39" cy="53" r="6.5"/>
      <circle class="eye r" cx="61" cy="53" r="6.5"/>
    </svg>
    <h4 style="margin:0">Main OPSI hoon, aapka logistics assistant</h4>
  </div>
  <p>Boliye ya tap kariye — main kaam kar dunga.</p>
  <div class="opsi-sug">
    <button data-goto="hisaab" data-toast="OPSI: Lalit ka hisaab khol raha hoon…">"<b>Lalit ka hisaab</b> kaisa hai?"</button>
    <button data-goto="trips" data-toast="OPSI: aaj ki trips dikha raha hoon…">"Aaj ki <b>trips</b> dikhao"</button>
    <button data-goto="rates" data-toast="OPSI: live rates par le ja raha hoon…">"<b>Gold ka bhaav</b> kya chal raha hai?"</button>
    <button data-toast="OPSI: kachcha receipt shuru — demo mode">"Somchai ka <b>kachcha receipt</b> banao"</button>
  </div>
</div>
<button id="opsiOrb" title="OPSI se baat karein">
  <svg class="circuit" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" style="clip-path:circle(50% at 50% 50%);opacity:.8">
    <path d="M6 24 H24 L32 32"/><circle cx="32" cy="32" r="2"/>
    <path d="M44 2 V12"/><circle cx="44" cy="12" r="2"/>
    <path d="M94 30 H80 L72 38"/><circle cx="72" cy="38" r="2"/>
    <path d="M96 62 H84"/><circle cx="84" cy="62" r="2"/>
    <path d="M30 96 V84 L24 78"/><circle cx="24" cy="78" r="2"/>
    <path d="M70 94 L64 86"/><circle cx="64" cy="86" r="2"/>
    <path class="cur" d="M6 24 H24 L32 32"/>
    <path class="cur c2" d="M94 30 H80 L72 38"/>
    <path class="cur c3" d="M30 96 V84 L24 78"/>
  </svg>
  <svg class="lop-mark lop-alive" viewBox="0 0 100 100" width="38" height="38" style="color:#fff" aria-hidden="true">
    <path class="ring" d="M 62.3 16.2 A 36 36 0 0 1 68 81.2"/>
    <path class="ring" d="M 43.8 85.4 A 36 36 0 0 1 37.7 16.2"/>
    <path class="tail" d="M 47 84 L 51 99 L 63 79 Z"/>
    <path class="band" d="M 11 50 A 39 39 0 0 1 89 50"/>
    <rect class="cup" x="5" y="42" width="10" height="18" rx="5"/>
    <rect class="cup" x="85" y="42" width="10" height="18" rx="5"/>
    <circle class="eye" cx="39" cy="53" r="6.5"/>
    <circle class="eye r" cx="61" cy="53" r="6.5"/>
  </svg>
  <span class="tag">OPSI</span>
</button>
<div id="calPop">
  <div class="cal-head">
    <button class="cal-nav" id="calPrev">&#8249;</button>
    <b id="calTitle">Aug 2026</b>
    <button class="cal-nav" id="calNext">&#8250;</button>
  </div>
  <div class="cal-grid" id="calGrid"></div>
</div>
<div id="toast"></div>

<script>
/* ============================================================
   LogiOp Pro v41 — engine (zero-conflict, transform-only motion)
   ============================================================ */
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const buzz=ms=>{try{navigator.vibrate&&navigator.vibrate(ms)}catch(e){}};

/* ---------- Aurora sky ---------- */
(()=>{
  const c=$('#sky'),x=c.getContext('2d');let w,h,t=0;
  const fit=()=>{w=c.width=innerWidth*devicePixelRatio*.6;h=c.height=innerHeight*devicePixelRatio*.6};
  fit();addEventListener('resize',fit,{passive:true});
  const bands=[
    {hue:[139,92,246],y:.22,amp:.10,sp:.00016,ph:0,   op:.16},
    {hue:[34,211,238], y:.34,amp:.13,sp:.00011,ph:2.1, op:.12},
    {hue:[52,211,153], y:.16,amp:.08,sp:.00021,ph:4.2, op:.10},
    {hue:[244,114,182],y:.46,amp:.11,sp:.00013,ph:1.3, op:.09},
  ];
  function frame(now){
    x.clearRect(0,0,w,h);
    for(const b of bands){
      const drift=(now*b.sp+b.ph);
      const cx=w*(0.5+0.45*Math.sin(drift));           // poori screen par aana-jaana
      const cy=h*(b.y+b.amp*Math.sin(drift*1.7+b.ph));
      const r=Math.max(w,h)*.55;
      const g=x.createRadialGradient(cx,cy,0,cx,cy,r);
      g.addColorStop(0,\`rgba(\${b.hue.join(',')},\${b.op})\`);
      g.addColorStop(1,'rgba(0,0,0,0)');
      x.fillStyle=g;x.fillRect(0,0,w,h);
    }
    if(!reduced)requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();

/* ---------- Gold / silver / rose-gold dust ---------- */
(()=>{
  const c=$('#dust'),x=c.getContext('2d');let w,h;
  const fit=()=>{w=c.width=innerWidth;h=c.height=innerHeight};
  fit();addEventListener('resize',fit,{passive:true});
  const cols=['240,196,108','214,220,235','233,180,168'];
  const P=Array.from({length:46},()=>({
    x:Math.random()*innerWidth,y:Math.random()*innerHeight,
    r:Math.random()*1.7+.5,vx:(Math.random()-.5)*.16,vy:-(Math.random()*.22+.05),
    c:cols[Math.random()*3|0],o:Math.random()*.5+.2,tw:Math.random()*6.28
  }));
  function frame(now){
    x.clearRect(0,0,w,h);
    for(const p of P){
      p.x+=p.vx;p.y+=p.vy;p.tw+=.02;
      if(p.y<-6){p.y=h+6;p.x=Math.random()*w}
      if(p.x<-6)p.x=w+6; if(p.x>w+6)p.x=-6;
      const o=p.o*(0.6+0.4*Math.sin(p.tw));
      x.beginPath();x.arc(p.x,p.y,p.r,0,6.283);
      x.fillStyle=\`rgba(\${p.c},\${o})\`;x.fill();
    }
    if(!reduced)requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();

/* ---------- Router + sliding lantern ---------- */
const nav=$('#nav'),glow=$('#navGlow');
function moveGlow(btn){
  glow.style.transform=\`translateY(\${btn.offsetTop - parseFloat(getComputedStyle(nav).paddingTop)}px)\`;
  glow.style.top=getComputedStyle(nav).paddingTop;
}
function go(view){
  const btn=$$('.nav-item').find(b=>b.dataset.view===view);if(!btn)return;
  $$('.nav-item').forEach(b=>b.classList.toggle('active',b===btn));
  moveGlow(btn);
  $$('.view').forEach(v=>v.classList.remove('on'));
  const el=$('#v-'+view); el.classList.add('on');
  $('#views').scrollTo({top:0,behavior:'instant'});
  buzz(8);
  if(view==='trips'||view==='dashboard')setTimeout(animateFlights,120);
}
nav.addEventListener('click',e=>{const b=e.target.closest('.nav-item');if(b)go(b.dataset.view)});
document.addEventListener('click',e=>{const g=e.target.closest('[data-goto]');if(g)go(g.dataset.goto)});
requestAnimationFrame(()=>moveGlow($('.nav-item.active')));
addEventListener('resize',()=>moveGlow($('.nav-item.active')),{passive:true});

/* ---------- Mode toggles ---------- */
$$('.mode-wrap').forEach(w=>{
  w.addEventListener('click',e=>{
    const b=e.target.closest('.mode-btn');if(!b)return;
    w.dataset.mode=b.dataset.mode;
    w.querySelectorAll('.mode-btn').forEach(x=>x.classList.toggle('sel',x===b));
    buzz(10);
    toast(b.dataset.mode==='cash'?'Cash · Kachcha mode — quick save':'Business · Pakka mode — GST + confirm');
  });
});

/* ---------- Theme ---------- */
$('#themeBtn').addEventListener('click',()=>{
  const r=document.documentElement;
  r.dataset.theme=r.dataset.theme==='dark'?'light':'dark';
  buzz(12);
  toast(r.dataset.theme==='dark'?'Raat mode — aurora on':'Ice mode — frosted glass');
});

/* ---------- Clock ---------- */
(function clock(){
  const d=new Date();
  $('#clockChip').textContent=d.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
  $('#todayStr').textContent=d.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'short'});
  setTimeout(clock,20000);
})();

/* ---------- Sparkline worms ---------- */
function drawWorms(){
  $$('svg.worm').forEach(s=>{
    const pts=s.dataset.worm.split(',').map(Number), col=s.dataset.color||'#8b5cf6';
    const W=s.clientWidth||110,H=s.clientHeight||44,max=Math.max(...pts),min=Math.min(...pts);
    s.setAttribute('viewBox',\`0 0 \${W} \${H}\`);
    const X=i=>i/(pts.length-1)*(W-8)+4, Y=v=>H-6-((v-min)/(max-min||1))*(H-12);
    let d=\`M \${X(0)} \${Y(pts[0])}\`;
    for(let i=1;i<pts.length;i++){
      const x0=X(i-1),y0=Y(pts[i-1]),x1=X(i),y1=Y(pts[i]),mx=(x0+x1)/2;
      d+=\` C \${mx} \${y0}, \${mx} \${y1}, \${x1} \${y1}\`;
    }
    const last={x:X(pts.length-1),y:Y(pts[pts.length-1])};
    s.innerHTML=\`<path d="\${d}" fill="none" stroke="\${col}" stroke-width="2.4" stroke-linecap="round" style="filter:drop-shadow(0 0 6px \${col})"/>
    <circle cx="\${last.x}" cy="\${last.y}" r="3.4" fill="\${col}"><animate attributeName="r" values="3.4;5;3.4" dur="2s" repeatCount="indefinite"/></circle>\`;
  });
}
drawWorms();addEventListener('resize',drawWorms,{passive:true});

/* ---------- Count-up ---------- */
function countUp(){
  $$('[data-count]').forEach(el=>{
    const end=+el.dataset.count, pre=el.dataset.prefix||'', suf=el.dataset.suffix||'';
    const t0=performance.now(),dur=reduced?1:1300;
    (function step(t){
      const p=Math.min(1,(t-t0)/dur), e=1-Math.pow(1-p,3);
      el.textContent=pre+Math.round(end*e).toLocaleString('en-IN')+suf;
      if(p<1)requestAnimationFrame(step);
    })(t0);
  });
}
countUp();

/* ---------- 3D tilt ---------- */
$$('[data-tilt]').forEach(card=>{
  let raf=null;
  card.addEventListener('pointermove',e=>{
    if(raf)return;
    raf=requestAnimationFrame(()=>{
      const r=card.getBoundingClientRect();
      const px=(e.clientX-r.left)/r.width, py=(e.clientY-r.top)/r.height;
      card.style.transform=\`perspective(900px) rotateY(\${(px-.5)*10}deg) rotateX(\${(.5-py)*8}deg) translateZ(6px)\`;
      card.style.setProperty('--mx',px*100+'%');card.style.setProperty('--my',py*100+'%');
      raf=null;
    });
  });
  card.addEventListener('pointerleave',()=>{card.style.transform='perspective(900px)'});
});

/* ---------- OPSI typed brief — har baar naya andaaz ---------- */
function buildBrief(){
  const {g,name,tail,pick}=opsiGreet();
  const status=pick([
    'sab theek chal raha hai','sab kaabu mein hai','din raftaar mein hai',
    'sab kuch track par hai','aaj ka mahaul accha hai','kaam smooth chal raha hai',
    'everything is under control','all systems green','aaj hawa hamare saath hai'
  ]);
  const closer=pick([
    'margin safe hai','margin bilkul theek hai','margin hara-bhara hai','aapka calculation sahi baitha hai'
  ]);
  const emoji=pick(['&#10024;','&#9889;','&#128640;','&#128170;','&#127775;']);
  return \`\${g}, <span class="hl-name">\${name}</span> — \${status}.<br>
Aaj <span class="hl-n n-red">3</span> kaam abhi zaroori, <span class="hl-n n-amber">7</span> do-teen din mein, aur <span class="hl-n n-cyan">10</span> baad mein.<br>
Sabse pehle — <span class="hl-n n-red">2 delivery</span> Bangkok mein aaj complete karni hain, aur <span class="hl-n n-amber">Ramesh bhai</span> ki flight <span class="hl-n n-cyan">TG-314</span> abhi hawa mein hai.<br>
Gold ka bhaav <span class="hl-n n-green">&#9650; 0.4%</span> — hold sahi chal raha hai. Transfer rate <span class="hl-n n-green">&#8377;2.848</span> par \${closer}. \${emoji}<br>
<span style="color:var(--muted);font-size:.85em">\${tail}</span>\`;
}
function typeBrief(){
  const el=$('#briefBody');el.innerHTML='<span class="caret"></span>';
  const briefHTML=buildBrief();
  if(reduced){el.innerHTML=briefHTML;return}
  const tokens=briefHTML.split(/(<[^>]+>|&[#a-z0-9]+;)/gi).filter(Boolean);
  let out='',ti=0,ci=0;
  (function tick(){
    if(ti>=tokens.length){el.innerHTML=out;return}
    const tok=tokens[ti];
    if(tok.startsWith('<')||tok.startsWith('&')){out+=tok;ti++;tick();return}
    out+=tok[ci++];
    if(ci>=tok.length){ti++;ci=0}
    el.innerHTML=out+'<span class="caret"></span>';
    setTimeout(tick,14);
  })();
}
/* ---------- OPSI Greeting Engine — 500+ andaaz (Hindi · English · Thai — Urdu kabhi nahi) ---------- */
function opsiGreet(){
  const h=new Date().getHours();
  const slot=h<5?'night':h<12?'morning':h<16?'afternoon':h<21?'evening':'night';
  const G={
    any:[
      'Namaste','Ram Ram','Pranam','Jai Ho','Swagat hai','Dhanya ho','Vandan',
      'Hello','Welcome back','Good to see you','At your service','Ready when you are',
      ['Sawasdee krab','namaste'],['Sabai dee mai','sab theek?'],['Yin dee ton rap','swagat hai']
    ],
    morning:['Suprabhat','Shubh prabhat','Good morning','Rise and shine','Morning',['Arun sawat','suprabhat']],
    afternoon:['Shubh dopahar','Good afternoon','Namaste'],
    evening:['Shubh sandhya','Good evening',['Sawasdee ton yen','shubh sandhya']],
    night:['Shubh ratri','Late night mode','Raat mein bhi kaam? Great']
  };
  const TAILS=[
    'Aaj ka din shubh rahe.','Chaliye, kaam shuru karein.','Sab systems taiyaar hain.',
    'Maal, bhaav, hisaab — sab meri nazar mein hai.','OPSI haazir hai.','Aaj bhi kamaal karte hain.',
    'Bangkok se Delhi tak, sab control mein.','Rates fresh hain, dil khush hai.',
    'Pehla kaam pehle — brief neeche hai.','Aapke bina yeh dashboard adhoora hai.',
    'Everything is on track.','Let\\u2019s make today count.','Numbers are looking sharp.',
    'All engines running.','Focus mode: ON.','Aaj ka target — sab green.',
    'Trips ud rahi hain, hisaab chal raha hai.','Gold chamak raha hai, aap bhi chamkiye.',
    'Chai le aaiye, baaki main sambhal lunga.','Kaam bolo, ho jayega.',
    'Sun sabai (khush raho) — aaj accha din hai.','Chok dee (good luck) aaj ke sauke ke liye.',
    'Warehouse se Bangkok tak — sab set.','Aapka schedule maine dekh liya hai.',
    'Data taaza hai, chaliye shuru karein.'
  ];
  const NAMES=[
    'Kishan ji','Kishan sir','sir','boss','Kishan boss','Shrimaan','Shrimaan Kishan ji',
    'Mr. Singh','Mr. Kishan Singh','K Singh sir','captain','Captain Singh','chief',
    'Kishan chief','maalik','Singh ji','Kishan Singh ji','boss ji','sir ji','commander',
    ['Khun Kishan','Thai ji'],['Khun Singh','Thai ji'],'the boss','team leader','karta-dharta','mukhiya'
  ];
  const pool=[...G.any,...(G[slot]||[])];
  const pick=a=>a[Math.random()*a.length|0];
  const g=pick(pool);
  const gtxt=Array.isArray(g)
    ? \`\${g[0]} <span style="font-size:.62em;color:var(--muted);font-weight:500">(\${g[1]})</span>\`
    : g;
  const n=pick(NAMES);
  const ntxt=Array.isArray(n)
    ? \`\${n[0]} <span style="font-size:.62em;color:var(--muted);font-weight:500">(\${n[1]})</span>\`
    : n;
  return {g:gtxt, name:ntxt, tail:pick(TAILS), pick};
}
(()=>{
  const {g,name,tail}=opsiGreet();
  const el=$('#greetTitle');if(el)el.innerHTML=\`\${g}, \${name}\`;
  const tl=$('#greetTail');if(tl)tl.textContent=tail;
})();

/* ---------- Transfer rate — live calculated feel ---------- */
(()=>{
  let r=2.848;
  setInterval(()=>{
    r=Math.min(2.86,Math.max(2.84,r+(Math.random()-.5)*.004));
    const s='&#8377;'+r.toFixed(3);
    const a=$('#tfRate');if(a)a.innerHTML=s;
    const b=$('#tfRate2');if(b)b.innerHTML=s+'<span class="rate-unit">/ &#3647;</span><i class="live-dot"></i>';
  },4500);
})();

/* ---------- Boot sequence ---------- */
(()=>{
  const boot=$('#boot'),msg=$('#bootMsg');
  const msgs=['OPSI jaag raha hai…','Rates la raha hoon…','Sab taiyaar!'];
  let i=0;
  const mi=setInterval(()=>{i++;if(i<msgs.length)msg.textContent=msgs[i]},650);
  const hide=()=>{
    clearInterval(mi);
    boot.classList.add('off');buzz([10,30,10]);
    setTimeout(()=>{boot.style.display='none';showLock()},650);
  };
  setTimeout(hide,reduced?200:2000);
})();
$('#briefReplay').addEventListener('click',()=>{buzz(10);typeBrief()});

/* ---------- Sample data ---------- */
const PARTY_COLORS=['#8b5cf6','#22d3ee','#f472b6','#34d399','#f0c46c'];
const parties=[
  {n:'Lalit Traders', city:'Bangkok', mode:'cash', rate:'&#8377;210/kg · &#3647;92', inr:28400, thb:9150},
  {n:'Somchai Fabrics', city:'Bangkok', mode:'cash', rate:'&#8377;200/kg · &#3647;88', inr:14750, thb:-3200},
  {n:'Anan Import', city:'Pattaya', mode:'biz', rate:'&#8377;225/kg · &#3647;96', inr:-52360, thb:0},
  {n:'Niran House', city:'Bangkok', mode:'cash', rate:'&#8377;205/kg · &#3647;90', inr:18100, thb:4400},
  {n:'R.K. Garments', city:'Delhi', mode:'biz', rate:'&#8377;—', inr:-49100, thb:0},
];
const fINR=v=>(v<0?'-':'')+'&#8377;'+Math.abs(v).toLocaleString('en-IN');
const fTHB=v=>v===0?'—':(v<0?'-':'')+'&#3647;'+Math.abs(v).toLocaleString('en-IN');
function paIcon(n,i){return \`<i style="background:linear-gradient(135deg,\${PARTY_COLORS[i%5]},\${PARTY_COLORS[(i+2)%5]})">\${n.split(' ').map(w=>w[0]).join('').slice(0,2)}</i>\`}

$('#topParties').innerHTML=parties.slice(0,4).map((p,i)=>\`
<tr><td><div class="pa">\${paIcon(p.n,i)}<b>\${p.n}</b></div></td>
<td><span class="pill \${p.mode==='cash'?'p-cash':'p-biz'}">\${p.mode==='cash'?'KACHCHA':'PAKKA'}</span></td>
<td class="num \${p.inr>=0?'pos':'neg'}" style="text-align:right">\${fINR(p.inr)}</td>
<td class="num \${p.thb>=0?'pos':'neg'}" style="text-align:right">\${fTHB(p.thb)}</td></tr>\`).join('');

$('#partyRows').innerHTML=parties.map((p,i)=>\`
<tr><td><div class="pa">\${paIcon(p.n,i)}<div><b>\${p.n}</b></div></div></td>
<td>\${p.city}</td>
<td><span class="pill \${p.mode==='cash'?'p-cash':'p-biz'}">\${p.mode==='cash'?'KACHCHA':'PAKKA'}</span></td>
<td class="num" style="font-size:12px">\${p.rate}</td>
<td class="num \${p.inr>=0?'pos':'neg'}" style="text-align:right">\${fINR(p.inr)}</td>
<td class="num \${p.thb>=0?'pos':'neg'}" style="text-align:right">\${fTHB(p.thb)}</td>
<td><button class="iconbtn" data-goto="hisaab" title="Hisaab kholo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg></button></td></tr>\`).join('');

$('#invRows').innerHTML=[
  ['KCH-0412','Lalit Traders','KACHCHA','Bed sheets ×40, tops ×25','&#8377;38,500','p-live','PAID'],
  ['SE-2026-118','Anan Import','PAKKA · GST','Cotton bags ×300','&#8377;1,12,400','p-wait','DUE'],
  ['KCH-0411','Somchai Fabrics','KACHCHA','Skirts ×60','&#8377;21,300','p-live','PAID'],
  ['AW-2026-054','R.K. Garments','PAKKA · GST','Fabric rolls ×12','&#8377;64,800','p-done','SENT'],
].map(r=>\`<tr><td class="num">\${r[0]}</td><td><b>\${r[1]}</b></td>
<td><span class="pill \${r[2].includes('KACH')?'p-cash':'p-biz'}">\${r[2]}</span></td>
<td style="color:var(--muted)">\${r[3]}</td><td class="num" style="text-align:right">\${r[4]}</td>
<td><span class="pill \${r[5]}">\${r[6]}</span></td></tr>\`).join('');

/* Bags */
const bags=[
  {id:'BAG-31',kg:34,max:40,p:'Lalit'},{id:'BAG-32',kg:38,max:40,p:'Lalit'},
  {id:'BAG-33',kg:29,max:35,p:'Somchai'},{id:'BAG-34',kg:41,max:40,p:'Niran',over:1},
  {id:'BAG-35',kg:36,max:40,p:'Niran'},{id:'BAG-36',kg:22,max:35,p:'Anan'},
];
$('#bagGrid').innerHTML=bags.map(b=>\`
<div class="bag \${b.over?'over':''}" title="\${b.p} ka maal">
  <div class="id">\${b.id}</div>
  <div class="kg">\${b.kg} kg</div>
  <div class="of">\${b.over?\`&#9888; \${b.kg-b.max} kg zyada — split karo\`:\`max \${b.max} kg · \${b.p}\`}</div>
  <div class="meter"><i style="width:\${Math.min(100,b.kg/b.max*100)}%"></i></div>
</div>\`).join('');

$('#shipRows').innerHTML=[
  ['SHP-208','Lalit + Somchai','3 bags','101 kg','Ramesh bhai','p-live','IN TRANSIT'],
  ['SHP-209','Niran House','2 bags','77 kg','Vikas','p-wait','READY'],
  ['SHP-210','Anan Import','1 bag','22 kg','—','p-done','PACKING'],
].map(r=>\`<tr><td class="num">\${r[0]}</td><td><b>\${r[1]}</b></td><td>\${r[2]}</td>
<td class="num">\${r[3]}</td><td>\${r[4]}</td><td><span class="pill \${r[5]}">\${r[6]}</span></td></tr>\`).join('');

/* ---------- Trips ---------- */
const planeSVG='<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/></svg>';
const trips=[
  {who:'Ramesh bhai',fl:'TG-314',prog:62,dep:'CCU 08:10',arr:'BKK 12:35',kg:'101 kg · 3 bags',cash:'USD $4,200',status:'p-live',st:'HAWA MEIN',eta:'2h 05m baaki'},
  {who:'Vikas',fl:'6E-77',prog:8,dep:'CCU 21:40',arr:'BKK 02:05',kg:'77 kg · 2 bags',cash:'USD $2,800',status:'p-wait',st:'BOARDING AAJ',eta:'raat ko udaan'},
  {who:'Suresh',fl:'plan',prog:0,dep:'CCU — Mon',arr:'BKK — Mon',kg:'chahiye 50 kg',cash:'—',status:'p-done',st:'PLANNED',eta:'bags assign karo'},
];
function tripHTML(t){return \`
<div class="trip">
  <div class="trip-top">
    <span class="who">\${t.who}</span>
    <span class="fl">\${t.fl==='plan'?'flight TBD':t.fl}</span>
    <span class="pill \${t.status}" style="margin-left:auto">\${t.st}</span>
  </div>
  <div class="route">
    <span>CCU</span>
    <div class="bar"><div class="fill" data-prog="\${t.prog}"></div><div class="plane" data-prog="\${t.prog}">\${planeSVG}</div></div>
    <span>BKK</span>
  </div>
  <div class="trip-meta">
    <span>Depart <b>\${t.dep}</b></span><span>Arrive <b>\${t.arr}</b></span>
    <span>Load <b>\${t.kg}</b></span><span>Cash <b>\${t.cash}</b></span>
    <span style="color:var(--cyan)">\${t.eta}</span>
  </div>
</div>\`}
$('#dashTrips').innerHTML=trips.slice(0,2).map(tripHTML).join('');
$('#tripList').innerHTML=trips.map(tripHTML).join('');
function animateFlights(){
  $$('.route .fill').forEach(f=>f.style.width=f.dataset.prog+'%');
  $$('.route .plane').forEach(p=>p.style.left=p.dataset.prog+'%');
}
setTimeout(animateFlights,400);

/* ---------- Ledger ---------- */
$('#ledgerRows').innerHTML=[
  ['12 Aug','Bags ×2 delivered — SHP-206','pos','&#8377;16,800','&#3647;—'],
  ['11 Aug','Transfer payout (Delhi)','neg','-&#8377;22,000','&#3647;—'],
  ['09 Aug','THB received (Bangkok)','pos','&#8377;—','&#3647;9,150'],
  ['06 Aug','Kachcha receipt KCH-0405','pos','&#8377;38,500','&#3647;—'],
  ['03 Aug','Freight adjust','neg','-&#8377;4,900','&#3647;—'],
].map(r=>\`<tr><td class="num" style="color:var(--muted)">\${r[0]}</td><td>\${r[1]}</td>
<td class="num \${r[2]}" style="text-align:right">\${r[3]}</td>
<td class="num \${r[2]}" style="text-align:right">\${r[4]}</td></tr>\`).join('');

/* ---------- Cashflow spline chart ---------- */
(function chart(){
  const svg=$('#flowChart');
  const draw=()=>{
    const W=svg.clientWidth||800,H=230;
    svg.setAttribute('viewBox',\`0 0 \${W} \${H}\`);
    const sets=[
      {d:[42,55,48,63,58,72,66,80,74,88,82,95],c:'#34d399'},
      {d:[38,44,52,47,60,55,68,62,75,70,84,78],c:'#fb5f6e'},
      {d:[60,61,63,62,66,68,67,71,74,73,78,82],c:'#f0c46c'},
    ];
    const max=100,pad=18;
    const X=i=>pad+i/11*(W-pad*2), Y=v=>H-14-(v/max)*(H-34);
    let out='';
    for(let g=0;g<=4;g++){const y=Y(g*25);out+=\`<line x1="\${pad}" y1="\${y}" x2="\${W-pad}" y2="\${y}" stroke="rgba(140,150,200,.12)" stroke-width="1"/>\`}
    for(const s of sets){
      let d=\`M \${X(0)} \${Y(s.d[0])}\`;
      for(let i=1;i<12;i++){const mx=(X(i-1)+X(i))/2;d+=\` C \${mx} \${Y(s.d[i-1])}, \${mx} \${Y(s.d[i])}, \${X(i)} \${Y(s.d[i])}\`}
      out+=\`<path d="\${d} L \${X(11)} \${H-14} L \${X(0)} \${H-14} Z" fill="\${s.c}" opacity=".06"/>\`;
      out+=\`<path d="\${d}" fill="none" stroke="\${s.c}" stroke-width="2.6" stroke-linecap="round" style="filter:drop-shadow(0 0 8px \${s.c}66)"/>\`;
      out+=\`<circle cx="\${X(11)}" cy="\${Y(s.d[11])}" r="4" fill="\${s.c}"/>\`;
    }
    svg.innerHTML=out;
  };
  draw();addEventListener('resize',draw,{passive:true});
})();


/* ---------- Catalog stock ---------- */
$('#stockRows').innerHTML=[
  ['Bed sheets (cotton)','Bedding','cash',480,'WH1 · S2 · R4 · Sh3','&#8377;3,84,000'],
  ['Cotton bags (printed)','Bags','biz',1250,'WH1 · S1 · R2 · Sh1','&#8377;1,87,500'],
  ['Tops (mixed sizes)','Garments','cash',340,'WH2 · S3 · R1 · Sh2','&#8377;2,04,000'],
  ['Skirts (rayon)','Garments','cash',260,'WH2 · S1 · R5 · Sh4','&#8377;1,30,000'],
  ['Short pants','Garments','biz',410,'WH1 · S4 · R3 · Sh2','&#8377;1,64,000'],
  ['Fabric rolls (jaipuri)','Fabric','biz',96,'WH3 · S1 · R1 · Sh1','&#8377;2,88,000'],
  ['Thai balm (wapsi maal)','Thai goods','cash',180,'WH1 · S2 · R6 · Sh1','&#8377;54,000'],
].map(r=>\`<tr><td><b>\${r[0]}</b></td><td style="color:var(--muted)">\${r[1]}</td>
<td><span class="pill \${r[2]==='cash'?'p-cash':'p-biz'}">\${r[2]==='cash'?'KACHCHA':'PAKKA'}</span></td>
<td class="num" style="text-align:right">\${r[3]}</td>
<td class="num" style="font-size:11.5px;color:var(--muted)">\${r[4]}</td>
<td class="num" style="text-align:right">\${r[5]}</td></tr>\`).join('');

/* ---------- Quote — Rate Guard ---------- */
(()=>{
  const V=2.930; // aaj ki asli keemat per baht (gold+dollar cycle)
  const thb=$('#qThb'),rate=$('#qRate'),st=$('#qStatus');
  const inr=$('#qInr'),val=$('#qVal'),prof=$('#qProfit'),pct=$('#qPct');
  const F=v=>'&#8377;'+Math.round(Math.abs(v)).toLocaleString('en-IN');
  function calc(){
    const T=+thb.value||0,R=+rate.value||0;
    const pay=T*R, value=T*V, p=value-pay, m=V?((V-R)/V*100):0;
    inr.innerHTML=F(pay); val.innerHTML=F(value);
    prof.innerHTML=(p<0?'-':'+')+F(p);
    prof.className='num '+(p<0?'neg':'pos');
    pct.textContent=m.toFixed(2)+'%';
    if(R>=V){
      st.className='qs bad';
      st.innerHTML='&#9888; ULTA RATE! Yeh quote loss dega — asli keemat &#8377;'+V.toFixed(3)+' se upar hai. OPSI ne roka.';
      buzz([40,60,40]);
    }else if(m<1){
      st.className='qs warn';
      st.innerHTML='&#9888; Margin patla hai ('+m.toFixed(2)+'%) — soch samajh ke.';
    }else{
      st.className='qs ok';
      st.innerHTML='&#10003; Margin safe — '+m.toFixed(2)+'% · munafa '+(p<0?'-':'+')+F(p);
    }
  }
  if(thb){
    thb.addEventListener('input',calc);rate.addEventListener('input',calc);
    $$('[data-qr]').forEach(b=>b.addEventListener('click',()=>{rate.value=b.dataset.qr;calc();buzz(10)}));
    calc();
  }
})();


/* ---------- Selective haptics: buttons + dock (nav already) + typing ---------- */
document.addEventListener('click',e=>{
  const b=e.target.closest('.btn,.iconbtn,.cal-day,.cal-nav');
  if(b&&!b.dataset.toast)buzz(8);
});
document.addEventListener('input',e=>{
  if(e.target.matches('input,select,textarea'))buzz(4);   // typing haptic
});

/* ---------- Calendar picker (manual dates band — sirf calendar) ---------- */
(()=>{
  const pop=$('#calPop'),grid=$('#calGrid'),title=$('#calTitle');
  const M=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const DOW=['S','M','T','W','T','F','S'];
  let cur=new Date(),target=null,selDate=null;
  function render(){
    const y=cur.getFullYear(),m=cur.getMonth();
    title.textContent=M[m]+' '+y;
    const first=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate();
    const today=new Date();
    let h=DOW.map(d=>\`<span class="dow">\${d}</span>\`).join('');
    for(let i=0;i<first;i++)h+='<span></span>';
    for(let d=1;d<=days;d++){
      const isT=d===today.getDate()&&m===today.getMonth()&&y===today.getFullYear();
      const isS=selDate&&d===selDate.getDate()&&m===selDate.getMonth()&&y===selDate.getFullYear();
      h+=\`<button class="cal-day\${isT?' today':''}\${isS?' sel':''}" data-d="\${d}">\${d}</button>\`;
    }
    grid.innerHTML=h;
  }
  function openFor(input){
    target=input;selDate=null;cur=new Date();render();
    const r=input.getBoundingClientRect();
    let top=r.bottom+8, left=Math.min(r.left, innerWidth-310);
    if(top+380>innerHeight)top=Math.max(10,r.top-388);
    pop.style.top=top+'px';pop.style.left=Math.max(10,left)+'px';
    pop.classList.add('open');buzz(10);
  }
  document.addEventListener('click',e=>{
    const f=e.target.closest('.datefield');
    if(f){openFor(f);return}
    if(!pop.contains(e.target))pop.classList.remove('open');
    const d=e.target.closest('.cal-day');
    if(d&&target){
      selDate=new Date(cur.getFullYear(),cur.getMonth(),+d.dataset.d);
      target.value=\`\${d.dataset.d} \${M[cur.getMonth()]} \${cur.getFullYear()}\`;
      render();buzz([8,30,8]);
      setTimeout(()=>pop.classList.remove('open'),260);
    }
  });
  $('#calPrev').addEventListener('click',e=>{e.stopPropagation();cur.setMonth(cur.getMonth()-1);render()});
  $('#calNext').addEventListener('click',e=>{e.stopPropagation();cur.setMonth(cur.getMonth()+1);render()});
})();

/* ---------- Nayi trip plan ---------- */
(()=>{const b=$('#tpGo');if(!b)return;
  b.addEventListener('click',()=>{
    const w=$('#tpWho').value,d=$('#tpDate').value,k=$('#tpKg').value;
    if(!d){toast('Pehle calendar se date chunein');return}
    toast(\`Trip planned: \${w} · \${d} · \${k} kg chahiye — demo mode\`);
  });
})();

/* ---------- Fingerprint lock ---------- */
function showLock(){if(window.__NATIVE){typeBrief();return}
  const lock=$('#lock');lock.classList.add('show');
  const btn=$('#fpBtn'),ring=$('#fpRing circle'),msg=$('#lockMsg');
  const LEN=414,HOLD=reduced?150:1100;let t0=null,raf=null,done=false;
  function unlock(){
    if(done)return;done=true;
    btn.classList.add('done');msg.textContent='Pehchaan ho gayi — swagat hai!';
    buzz([30,60,30]);
    setTimeout(()=>{lock.classList.add('off');setTimeout(()=>{lock.style.display='none';typeBrief()},550)},450);
  }
  function step(t){
    if(t0===null)t0=t;
    const p=Math.min(1,(t-t0)/HOLD);
    ring.style.strokeDashoffset=LEN*(1-p);
    if(p>=1){unlock();return}
    raf=requestAnimationFrame(step);
  }
  function start(e){e.preventDefault();if(done)return;t0=null;buzz(6);raf=requestAnimationFrame(step);msg.textContent='Padh raha hoon…'}
  function stop(){if(done)return;cancelAnimationFrame(raf);ring.style.strokeDashoffset=LEN;msg.textContent='Fingerprint par ungli rakh kar pakdiye'}
  btn.addEventListener('pointerdown',start);
  btn.addEventListener('pointerup',stop);btn.addEventListener('pointerleave',stop);
  $('#lockSkip').addEventListener('click',unlock);
}

/* ---------- OPSI panel ---------- */
const orb=$('#opsiOrb'),panel=$('#opsiPanel');
orb.addEventListener('click',()=>{panel.classList.toggle('open');buzz([12,40,12])});
document.addEventListener('click',e=>{
  if(!panel.contains(e.target)&&!orb.contains(e.target))panel.classList.remove('open');
});

/* ---------- Toast ---------- */
let toastT;
function toast(msg){
  const t=$('#toast');t.textContent=msg;t.classList.add('show');buzz(8);
  clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),2600);
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-toast]');
  if(b){toast(b.dataset.toast);panel.classList.remove('open')}
});
</script>
</body>
</html>
`;
