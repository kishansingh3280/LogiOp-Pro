export default `<!DOCTYPE html>
<html lang="hi" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
<title>LogiOp Pro · Powered by OPSI</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
/* ============================================================
   LogiOp Pro · BUILD v41 · Full rebuild from zero
   Design tokens — single source of truth
   ============================================================ */
html,body,button,a,input,select,textarea{-webkit-tap-highlight-color:transparent!important}
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
::-webkit-scrollbar{width:0;height:0;display:none}
*{scrollbar-width:none;-ms-overflow-style:none}
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
  padding:26px 26px 12px;
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
.hairline{height:2px;border-radius:2px;margin:16px 0 20px;background:linear-gradient(90deg,var(--acc1),var(--acc2) 40%,transparent 75%);max-width:900px;position:relative;overflow:hidden}
.hairline::after{content:"";position:absolute;top:0;bottom:0;left:-18%;width:16%;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.95),transparent);
  filter:blur(1px);opacity:0;animation:laser 10s linear infinite}
@keyframes laser{0%{left:-18%;opacity:0}2%{opacity:1}12%{left:104%;opacity:1}13%{opacity:0}100%{left:104%;opacity:0}}

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

/* ============================================================
   v52 — MOBILE SYSTEM: bottom game-dock + more sheet + OPSI trail
   ============================================================ */

/* ---------- Bottom dock (sirf mobile) ---------- */
#dock{
  display:none;position:fixed;left:10px;right:10px;z-index:62;
  bottom:calc(10px + env(safe-area-inset-bottom));
  height:76px;grid-template-columns:repeat(5,1fr);align-items:end;
  background:var(--glass-2);border:1px solid var(--line-2);border-radius:26px;
  backdrop-filter:blur(24px);box-shadow:var(--shadow);padding:0 4px;
}
.dock-item{
  display:flex;flex-direction:column;align-items:center;gap:3px;
  padding:11px 0 12px;color:var(--muted);font-size:9.5px;font-weight:700;
  letter-spacing:.5px;transition:color .25s var(--ease),transform .12s;
}
.dock-item:active{transform:scale(.88)}
.dock-item svg{width:22px;height:22px;stroke-width:1.9}
.dock-item.active{color:var(--ink)}
.dock-item.active svg{filter:drop-shadow(0 0 8px rgba(139,92,246,.9));color:var(--violet)}
#dockOrb{
  position:relative;top:-22px;justify-self:center;width:58px;height:58px;border-radius:50%;
  background:radial-gradient(circle at 34% 28%,#c8b6ff,#7443f5 52%,#231056);
  box-shadow:0 0 0 6px var(--bg),0 0 26px rgba(139,92,246,.7);
  display:grid;place-items:center;transition:transform .15s;
}
#dockOrb:active{transform:scale(.9)}
#dockOrb svg.lop-mark{width:30px;height:30px;color:#fff;position:relative;z-index:1}
#dockOrb small{position:absolute;bottom:-15px;left:50%;transform:translateX(-50%);
  font-family:var(--font-m);font-size:8.5px;letter-spacing:2.5px;color:var(--violet);font-weight:700}

/* ---------- More sheet ---------- */
#moreSheet{
  position:fixed;left:0;right:0;bottom:0;z-index:64;
  background:var(--glass-2);border:1px solid var(--line-2);border-bottom:none;
  border-radius:26px 26px 0 0;backdrop-filter:blur(26px);box-shadow:var(--shadow);
  padding:14px 16px calc(20px + env(safe-area-inset-bottom));
  transform:translateY(105%);transition:transform .38s var(--ease);
}
#moreSheet.open{transform:none}
#moreSheet .grab{width:44px;height:4px;border-radius:4px;background:var(--line-2);margin:0 auto 14px}
.sheet-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.sheet-item{
  display:flex;flex-direction:column;align-items:center;gap:6px;
  padding:13px 4px 11px;border-radius:16px;border:1px solid var(--line);
  background:rgba(255,255,255,.04);color:var(--muted);
  font-size:10.5px;font-weight:700;transition:transform .12s,border-color .2s;
}
html[data-theme="light"] .sheet-item{background:rgba(255,255,255,.6)}
.sheet-item:active{transform:scale(.92);border-color:var(--violet)}
.sheet-item svg{width:21px;height:21px;stroke-width:1.9;color:var(--ink)}
#sheetVeil{position:fixed;inset:0;z-index:63;background:rgba(4,6,14,.55);opacity:0;pointer-events:none;transition:opacity .35s}
#sheetVeil.on{opacity:1;pointer-events:auto}

/* ---------- OPSI flying bot + trail ---------- */
#opsiFly{
  position:fixed;left:0;top:0;z-index:72;width:46px;height:46px;border-radius:50%;
  background:radial-gradient(circle at 34% 28%,#c8b6ff,#7443f5 55%,#231056);
  box-shadow:0 0 22px rgba(139,92,246,.85),0 6px 18px rgba(0,0,0,.5);
  display:grid;place-items:center;pointer-events:none;
  opacity:0;transform:translate3d(-100px,-100px,0) scale(.4);
  transition:transform .85s cubic-bezier(.3,1.15,.35,1),opacity .3s;
}
#opsiFly.on{opacity:1}
#opsiFly svg{width:26px;height:26px;color:#fff;animation:flyBob 1.6s ease-in-out infinite}
@keyframes flyBob{50%{transform:translateY(-3px)}}
.spark{
  position:fixed;z-index:71;width:6px;height:6px;border-radius:50%;pointer-events:none;
  background:var(--cyan);box-shadow:0 0 8px var(--cyan);
  animation:sparkFade .7s ease-out forwards;
}
.spark.v{background:var(--violet);box-shadow:0 0 8px var(--violet)}
.spark.m{background:var(--magenta);box-shadow:0 0 8px var(--magenta)}
@keyframes sparkFade{to{opacity:0;transform:translateY(10px) scale(.2)}}
.magic-target{outline:2px solid var(--cyan)!important;outline-offset:3px;border-radius:12px;
  box-shadow:0 0 18px rgba(34,211,238,.35)!important;transition:outline-color .3s}
.ghost-caret{display:inline-block;width:2px;height:1em;background:var(--cyan);vertical-align:-2px;margin-left:1px;animation:gc .7s steps(1) infinite}
@keyframes gc{50%{opacity:0}}
.row-new{animation:rowIn 1.6s var(--ease)}
@keyframes rowIn{0%{background:rgba(52,211,153,.28)}100%{background:transparent}}

@keyframes qrIn{from{opacity:0;transform:translateY(14px)}}


/* ============================================================
   v56 — BOOK CONTEXT SYSTEM (kachcha / Singh Exports / Awadh)
   ============================================================ */
:root{--acc1:var(--violet);--acc2:var(--magenta);--accsoft:rgba(139,92,246,.35)}
html[data-book="singh"]{--acc1:#ff9f43;--acc2:#f0620e;--accsoft:rgba(255,159,67,.4)}
html[data-book="awadh"]{--acc1:#4f7cff;--acc2:#1e40af;--accsoft:rgba(79,124,255,.4)}
#bookBadge{font-weight:800;letter-spacing:1.5px;border:1px solid var(--accsoft);
  color:var(--acc1);background:rgba(255,255,255,.03);transition:all .4s}
.mode-pill{background:linear-gradient(135deg,var(--acc1),var(--acc2))!important;
  box-shadow:0 6px 22px var(--accsoft)!important;transition:background .4s,box-shadow .4s}
.co-wrap{display:flex;gap:9px;margin:-8px 0 18px;flex-wrap:wrap;animation:qrIn .4s var(--ease)}
html[data-book="kachcha"] .co-wrap{display:none}
.co-btn{font-weight:800;font-size:12.5px;letter-spacing:.4px;padding:10px 16px;border-radius:14px;
  border:1px solid var(--line);background:rgba(255,255,255,.04);color:var(--muted);transition:all .25s}
.co-btn.sel{color:#fff;border-color:transparent;
  background:linear-gradient(135deg,var(--acc1),var(--acc2));box-shadow:0 6px 20px var(--accsoft)}
.wmform{position:relative}
.wmform::before{content:attr(data-wm);position:absolute;inset:0;display:grid;place-items:center;
  font-family:var(--font-d);font-weight:800;font-size:clamp(26px,5vw,44px);letter-spacing:6px;
  color:var(--acc1);opacity:.055;transform:rotate(-8deg);pointer-events:none;white-space:nowrap;z-index:0}
.wmform>*{position:relative;z-index:1}
.formcard{display:none;padding:22px;margin-bottom:16px;border-color:var(--accsoft)}
.formcard.show{display:block;animation:qrIn .4s var(--ease)}
.formcard .fgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;align-items:end}
.field select{background:rgba(255,255,255,.05);border:1px solid var(--line);border-radius:14px;
  padding:13px 16px;color:var(--ink);font-family:var(--font-m);font-size:15px;font-weight:600;
  outline:none;width:100%;appearance:none}
html[data-theme="light"] .field select{background:rgba(255,255,255,.7)}
.field select:focus{border-color:var(--acc1);box-shadow:0 0 0 3px var(--accsoft)}
.gsthint{font-size:12px;color:var(--muted)}
.gsthint b{color:var(--acc1)}
#confirmPop{position:fixed;inset:0;z-index:96;display:grid;place-items:center;
  background:rgba(4,6,14,.6);backdrop-filter:blur(6px);opacity:0;pointer-events:none;transition:opacity .3s}
#confirmPop.open{opacity:1;pointer-events:auto}
#confirmPop .box{width:min(430px,calc(100vw - 40px));border-radius:22px;padding:24px;
  background:var(--glass-2);border:1.5px solid var(--accsoft);box-shadow:var(--shadow);
  transform:scale(.95);transition:transform .3s var(--ease)}
#confirmPop.open .box{transform:none}
#confirmPop .co{font-family:var(--font-d);font-weight:800;font-size:19px;color:var(--acc1);margin-bottom:6px}
#confirmPop .sum{font-size:13.5px;color:var(--muted);line-height:1.7;margin-bottom:18px}
#confirmPop .sum b{color:var(--ink)}
#confirmPop .row{display:flex;gap:10px}
#confirmPop .row button{flex:1;padding:13px;border-radius:14px;font-weight:800;font-size:13.5px}
#confirmPop .yes{background:linear-gradient(135deg,var(--acc1),var(--acc2));color:#fff}
#confirmPop .no{background:rgba(255,255,255,.06);border:1px solid var(--line)}
#assignSheet{position:fixed;left:0;right:0;bottom:0;z-index:95;
  background:var(--glass-2);border:1px solid var(--line-2);border-bottom:none;
  border-radius:26px 26px 0 0;backdrop-filter:blur(26px);box-shadow:var(--shadow);
  padding:16px 18px calc(22px + env(safe-area-inset-bottom));
  transform:translateY(105%);transition:transform .38s var(--ease)}
#assignSheet.open{transform:none}
#assignSheet h4{font-family:var(--font-d);font-size:14px;margin-bottom:12px}
#assignSheet .opsi-sug button b{color:var(--acc1)}
.bag{cursor:pointer;transition:transform .12s,border-color .2s}
.bag:active{transform:scale(.96)}
.bag.assigned{border-color:var(--accsoft)}
.bag .as{font-size:10.5px;font-weight:800;color:var(--acc1);margin-top:3px}


/* ============================================================
   v57 — FULL REDESIGN LAYER
   dashboard bento · party detail · ledger · packing board ·
   movement · warehouse/treasury · catalog grid · calendar · print
   ============================================================ */

/* ---------- Bento dashboard ---------- */
.bento{display:grid;grid-template-columns:repeat(12,1fr);gap:14px;margin-top:6px}
.bento .card{margin:0}
.b12{grid-column:span 12}.b8{grid-column:span 8}.b6{grid-column:span 6}.b4{grid-column:span 4}.b3{grid-column:span 3}
@media(max-width:920px){.b8,.b6,.b4,.b3{grid-column:span 12}.b3{grid-column:span 6}}
.kpi{padding:16px 18px;position:relative;overflow:hidden}
.kpi .k-cap{font-size:10.5px;letter-spacing:1.6px;color:var(--muted);font-weight:800;text-transform:uppercase}
.kpi .k-num{font-family:var(--font-m);font-weight:800;font-size:clamp(19px,2.2vw,26px);margin-top:5px}
.kpi .k-sub{font-size:11.5px;color:var(--muted);margin-top:3px}
.kpi svg.spark{position:absolute;right:10px;top:12px;width:86px;height:34px;opacity:.9}
.kpi.pos .k-num{color:var(--green)}.kpi.neg .k-num{color:var(--red)}
.kpi:active{transform:scale(.985)}
.kpi{transition:transform .15s var(--ease)}
/* treasury */
.tre-top{display:flex;flex-wrap:wrap;gap:14px 26px;align-items:flex-end}
.tre-big{font-family:var(--font-m);font-weight:800;font-size:clamp(22px,2.6vw,30px)}
.tre-pl{font-family:var(--font-m);font-weight:800;font-size:15px;padding:5px 12px;border-radius:12px}
.tre-pl.up{color:var(--green);background:rgba(52,211,153,.12)}
.tre-pl.down{color:var(--red);background:rgba(251,95,110,.12)}
.lot{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:14px;background:rgba(255,255,255,.03);border:1px solid var(--line);margin-top:8px;font-size:12.5px}
.lot b{font-family:var(--font-m)}
.lot .dotc{width:9px;height:9px;border-radius:50%;background:linear-gradient(135deg,#f0c46c,#b8860b);box-shadow:0 0 8px rgba(240,196,108,.7);flex:none}
.lot .pl{margin-left:auto;font-family:var(--font-m);font-weight:800;font-size:12px}
/* corridor map */
.corr{position:relative;height:210px;border-radius:16px;overflow:hidden;background:radial-gradient(120% 140% at 20% 0%,rgba(34,211,238,.08),transparent 50%),radial-gradient(120% 140% at 85% 100%,rgba(139,92,246,.1),transparent 55%)}
.corr svg{position:absolute;inset:0;width:100%;height:100%}
.corr .city{font-family:var(--font-m);font-size:10px;font-weight:800;letter-spacing:1px;fill:var(--muted)}
.corr .land{fill:rgba(140,150,200,.07);stroke:rgba(140,150,200,.18);stroke-width:1}
.corr .arc{fill:none;stroke:url(#corrG);stroke-width:2.2;stroke-dasharray:5 7;animation:dashmove 2.2s linear infinite}
@keyframes dashmove{to{stroke-dashoffset:-24}}
.corr .pl-dot{filter:drop-shadow(0 0 7px rgba(34,211,238,.9))}
.corr-legend{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.corr-legend span{font-size:11px;color:var(--muted);background:rgba(255,255,255,.04);border:1px solid var(--line);padding:5px 10px;border-radius:10px}
.corr-legend b{color:var(--ink)}
/* action list */
.act{display:flex;gap:11px;align-items:flex-start;padding:11px 4px;border-bottom:1px dashed var(--line)}
.act:last-child{border-bottom:none}
.act i{width:32px;height:32px;border-radius:10px;display:grid;place-items:center;flex:none;font-style:normal;font-size:15px}
.act .t{font-size:13px;line-height:1.45}
.act .t small{display:block;color:var(--muted);font-size:11px;margin-top:2px}
.act .go{margin-left:auto;flex:none}
/* donut */
.donutwrap{display:flex;align-items:center;gap:18px;flex-wrap:wrap}
.donutwrap svg{width:120px;height:120px;flex:none}
.dlegend{font-size:12px;display:grid;gap:7px}
.dlegend i{display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:7px}
/* calendar */
.cal-head{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.cal-head b{font-family:var(--font-d);font-size:15px}
.cal-head button{width:30px;height:30px;border-radius:10px;background:rgba(255,255,255,.05);border:1px solid var(--line);color:var(--ink);font-size:15px}
.calgrid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}
.calgrid .dow{font-size:9.5px;letter-spacing:1px;color:var(--muted);text-align:center;font-weight:800;padding:3px 0}
.cald{aspect-ratio:1;border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:var(--font-m);font-size:12px;color:var(--ink);position:relative;background:rgba(255,255,255,.02)}
.cald.dim{opacity:.28}
.cald.today{border:1.5px solid var(--acc1);box-shadow:0 0 10px var(--accsoft)}
.cald .evd{display:flex;gap:2px;margin-top:2px}
.cald .evd i{width:4px;height:4px;border-radius:50%}
.cald.hasev{cursor:pointer}
.cald.hasev:active{transform:scale(.92)}
.cal-evs{margin-top:10px;display:grid;gap:6px}
.cal-evs .ev{font-size:12px;display:flex;gap:8px;align-items:center;padding:7px 10px;border-radius:10px;background:rgba(255,255,255,.03);border:1px solid var(--line)}
.cal-evs .ev i{width:7px;height:7px;border-radius:50%;flex:none}
/* activity feed */
.feed{display:grid;gap:2px;max-height:280px;overflow:auto}
.feed .f{display:flex;gap:10px;padding:8px 4px;font-size:12.5px;border-bottom:1px dashed var(--line);align-items:baseline}
.feed .f:last-child{border:none}
.feed .f .d{font-family:var(--font-m);color:var(--muted);font-size:10.5px;flex:none;width:46px}
.feed .f b{font-family:var(--font-m)}

/* ---------- Parties ---------- */
.pchips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}
.pchip{padding:8px 14px;border-radius:12px;border:1px solid var(--line);background:rgba(255,255,255,.03);color:var(--muted);font-weight:800;font-size:12px}
.pchip.sel{color:#fff;border-color:transparent;background:linear-gradient(135deg,var(--acc1),var(--acc2));box-shadow:0 5px 16px var(--accsoft)}
.prow{display:flex;align-items:center;gap:12px;padding:13px 14px;border-radius:16px;border:1px solid var(--line);background:rgba(255,255,255,.02);margin-bottom:9px;cursor:pointer;transition:transform .12s,border-color .2s}
.prow:active{transform:scale(.985)}
.prow .pa i{width:40px;height:40px;font-size:13px}
.prow .nm{min-width:0}
.prow .nm b{display:block;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.prow .nm small{color:var(--muted);font-size:11px}
.prow .bks{display:flex;gap:4px;margin-left:auto;flex:none}
.bk{font-size:9.5px;font-weight:800;letter-spacing:.5px;padding:4px 7px;border-radius:8px;border:1px solid var(--line);color:var(--line-2)}
.bk.on-k{color:#f472b6;border-color:rgba(244,114,182,.4);background:rgba(244,114,182,.08)}
.bk.on-p{color:#60a5fa;border-color:rgba(96,165,250,.4);background:rgba(96,165,250,.08)}
.prow .bal{flex:none;text-align:right;font-family:var(--font-m);font-size:12.5px;font-weight:700;min-width:92px}
.prow .bal small{display:block;font-size:10.5px;opacity:.75}
/* party detail overlay */
#pdOverlay{position:fixed;inset:0;z-index:80;background:var(--bg,#070912);overflow-y:auto;transform:translateX(103%);transition:transform .38s var(--ease);padding:calc(14px + env(safe-area-inset-top)) 16px 120px}
#pdOverlay.open{transform:none}
.pd-top{display:flex;align-items:center;gap:13px;margin-bottom:14px}
.pd-top .back{width:40px;height:40px;border-radius:13px;background:rgba(255,255,255,.05);border:1px solid var(--line);color:var(--ink);font-size:17px;flex:none}
.pd-top .pa i{width:52px;height:52px;font-size:17px;border-radius:16px}
.pd-top h2{font-family:var(--font-d);font-size:21px;line-height:1.15}
.pd-top .sub{font-size:12px;color:var(--muted)}
.pd-acts{display:flex;gap:9px;flex-wrap:wrap;margin:4px 0 16px}
.pd-acts .btn{padding:10px 15px;font-size:12.5px}
.pd-grid{display:grid;grid-template-columns:repeat(12,1fr);gap:13px}
.pd-grid .card{margin:0}
.pinmap{position:relative;height:190px;border-radius:16px;overflow:hidden;background:
  linear-gradient(rgba(140,150,200,.05) 1px,transparent 1px),
  linear-gradient(90deg,rgba(140,150,200,.05) 1px,transparent 1px),
  radial-gradient(90% 110% at 60% 40%,rgba(34,211,238,.08),transparent 55%);
  background-size:26px 26px,26px 26px,cover}
.pinmap .pin{position:absolute;transform:translate(-50%,-100%)}
.pinmap .pin .p{width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:linear-gradient(135deg,var(--acc1),var(--acc2));box-shadow:0 6px 18px var(--accsoft);display:grid;place-items:center}
.pinmap .pin .p::after{content:"";width:9px;height:9px;border-radius:50%;background:#fff;transform:rotate(45deg)}
.pinmap .ring{position:absolute;width:60px;height:60px;border-radius:50%;border:1.5px solid var(--acc1);opacity:0;transform:translate(-50%,-50%);animation:ringout 2.4s ease-out infinite}
@keyframes ringout{0%{opacity:.7;width:20px;height:20px}100%{opacity:0;width:90px;height:90px}}
.pinmap .addr{position:absolute;left:10px;bottom:10px;right:10px;font-size:11.5px;background:rgba(7,9,18,.72);backdrop-filter:blur(8px);border:1px solid var(--line);border-radius:11px;padding:8px 11px;line-height:1.5}
.kv{display:grid;gap:9px;font-size:12.5px}
.kv .r{display:flex;gap:10px}
.kv .r span{color:var(--muted);width:96px;flex:none}
.kv .r b{font-family:var(--font-m);font-weight:700;word-break:break-all}
.ratechip{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid var(--line);font-size:12.5px;margin-top:8px}
.ratechip b{font-family:var(--font-m)}
.ratechip small{color:var(--muted);font-size:10.5px}
.balduo{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.balbox{padding:13px;border-radius:14px;background:rgba(255,255,255,.03);border:1px solid var(--line);text-align:center}
.balbox .c{font-size:10px;color:var(--muted);letter-spacing:1.4px;font-weight:800}
.balbox .v{font-family:var(--font-m);font-weight:800;font-size:17px;margin-top:4px}

/* ---------- Invoice line editor ---------- */
.lines{display:grid;gap:9px;margin-top:4px}
.line{display:grid;grid-template-columns:minmax(140px,2.2fr) 76px 84px 96px 92px 34px;gap:8px;align-items:center}
@media(max-width:920px){.line{grid-template-columns:1fr 1fr;padding:11px;border:1px solid var(--line);border-radius:14px;background:rgba(255,255,255,.02)}
.line select.li-item{grid-column:span 2}}
.line select,.line input{background:rgba(255,255,255,.05);border:1px solid var(--line);border-radius:12px;padding:11px 12px;color:var(--ink);font-family:var(--font-m);font-size:13px;font-weight:600;outline:none;width:100%;appearance:none}
.line .lt{font-family:var(--font-m);font-weight:800;font-size:13px;text-align:right}
.line .rm{width:32px;height:32px;border-radius:10px;background:rgba(251,95,110,.1);border:1px solid rgba(251,95,110,.3);color:var(--red);font-size:15px}
.totbar{display:flex;flex-wrap:wrap;gap:8px 22px;justify-content:flex-end;align-items:baseline;margin-top:14px;padding-top:13px;border-top:1px dashed var(--line);font-size:12.5px;color:var(--muted)}
.totbar b{font-family:var(--font-m);color:var(--ink)}
.totbar .grand{font-size:19px;font-weight:800;color:var(--acc1)}
.inv-open{cursor:pointer}
.inv-open:active{opacity:.7}

/* ---------- Shipments / packing ---------- */
.shrow{border:1px solid var(--line);border-radius:16px;background:rgba(255,255,255,.02);padding:14px;margin-bottom:10px}
.shrow .top{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.shrow .top b{font-family:var(--font-m);font-size:14px}
.shrow .meta{font-size:11.5px;color:var(--muted);margin-top:5px}
.shrow .btns{display:flex;gap:8px;flex-wrap:wrap;margin-top:11px}
.shrow .btns .btn{padding:9px 13px;font-size:12px}
.pgroup{border:1px solid var(--line);border-radius:14px;margin-top:10px;overflow:hidden}
.pgroup>.gh{display:flex;align-items:center;gap:10px;padding:11px 13px;background:rgba(255,255,255,.03);cursor:pointer}
.pgroup>.gh .pa i{width:30px;height:30px;font-size:11px}
.pgroup>.gh b{font-size:13px}
.pgroup>.gh small{color:var(--muted);font-size:11px;margin-left:auto}
.pgroup>.gh .car{transition:transform .25s}
.pgroup.open>.gh .car{transform:rotate(90deg)}
.pgroup .gb{display:none;padding:10px 13px}
.pgroup.open .gb{display:block}
.bagline{display:flex;gap:10px;align-items:flex-start;padding:9px 0;border-bottom:1px dashed var(--line);font-size:12.5px}
.bagline:last-child{border:none}
.bagline .bid{font-family:var(--font-m);font-weight:800;flex:none}
.bagline .to{color:var(--cyan);font-size:11px}
.bagline .its{color:var(--muted);font-size:11.5px;margin-top:2px}
.bagline .kg{margin-left:auto;font-family:var(--font-m);font-weight:800;flex:none}
.dir-tag{font-size:9px;font-weight:800;letter-spacing:1px;padding:3px 7px;border-radius:7px;background:rgba(52,211,153,.12);color:var(--green);border:1px solid rgba(52,211,153,.3)}
/* packing board modal */
#packBoard{position:fixed;inset:0;z-index:92;background:rgba(4,6,14,.7);backdrop-filter:blur(8px);display:none;place-items:center;padding:14px}
#packBoard.open{display:grid}
#packBoard .pb{width:min(1020px,100%);max-height:92vh;overflow-y:auto;border-radius:22px;background:var(--glass-2);border:1.5px solid var(--accsoft);box-shadow:var(--shadow);padding:18px}
.pb-cols{display:grid;grid-template-columns:1fr 1.4fr;gap:14px}
@media(max-width:920px){.pb-cols{grid-template-columns:1fr}}
.pool-it{display:flex;align-items:center;gap:9px;padding:10px 12px;border-radius:13px;border:1px solid var(--line);background:rgba(255,255,255,.03);margin-bottom:8px;font-size:12.5px}
.pool-it b{font-family:var(--font-m)}
.pool-it .left{margin-left:auto;font-family:var(--font-m);font-weight:800;color:var(--cyan)}
.pool-it.done{opacity:.45}
.pool-it.done .left{color:var(--green)}
.pbag{border:1px solid var(--accsoft);border-radius:15px;padding:11px 13px;margin-bottom:10px;background:rgba(255,255,255,.02)}
.pbag .h{display:flex;align-items:center;gap:9px;font-size:12.5px}
.pbag .h b{font-family:var(--font-m)}
.pbag .h select{margin-left:auto;background:rgba(255,255,255,.05);border:1px solid var(--line);border-radius:10px;padding:7px 9px;color:var(--ink);font-size:11.5px;font-family:var(--font-m);appearance:none;max-width:170px}
.pbag .chips{display:flex;flex-wrap:wrap;gap:7px;margin-top:9px}
.pbchip{display:flex;align-items:center;gap:6px;padding:6px 9px;border-radius:10px;background:rgba(139,92,246,.1);border:1px solid var(--accsoft);font-size:11.5px}
.pbchip b{font-family:var(--font-m)}
.pbchip button{width:20px;height:20px;border-radius:7px;background:rgba(255,255,255,.08);color:var(--ink);font-size:11px;font-family:var(--font-m)}
.pb-add{display:flex;gap:7px;margin-top:9px;flex-wrap:wrap}
.pb-add select,.pb-add input{background:rgba(255,255,255,.05);border:1px solid var(--line);border-radius:10px;padding:8px 10px;color:var(--ink);font-size:12px;font-family:var(--font-m);appearance:none}
.pb-add input{width:76px}
.pb-prog{position:sticky;top:0;z-index:2;background:rgba(10,12,24,.85);backdrop-filter:blur(8px);border:1px solid var(--line);border-radius:13px;padding:10px 13px;font-size:12.5px;margin-bottom:12px;display:flex;gap:12px;align-items:center}
.pb-prog b{font-family:var(--font-m)}
.pb-prog .bar{flex:1;height:6px;border-radius:6px;background:rgba(255,255,255,.07);overflow:hidden}
.pb-prog .bar i{display:block;height:100%;border-radius:6px;background:linear-gradient(90deg,var(--acc1),var(--acc2));transition:width .3s}

/* ---------- Movement ---------- */
.mv-tabs{display:flex;gap:8px;margin-bottom:14px}
.mv-tab{padding:10px 18px;border-radius:13px;border:1px solid var(--line);background:rgba(255,255,255,.03);color:var(--muted);font-weight:800;font-size:12.5px}
.mv-tab.sel{color:#fff;border-color:transparent;background:linear-gradient(135deg,var(--acc1),var(--acc2));box-shadow:0 5px 16px var(--accsoft)}
.mvcard{border:1px solid var(--line);border-radius:17px;background:rgba(255,255,255,.02);padding:15px;margin-bottom:11px}
.mv-duo{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:11px}
@media(max-width:700px){.mv-duo{grid-template-columns:1fr}}
.mv-box{border:1px dashed var(--line);border-radius:13px;padding:10px 12px;font-size:12px}
.mv-box .h{font-size:9.5px;letter-spacing:1.6px;font-weight:800;margin-bottom:6px}
.mv-box.out .h{color:var(--cyan)}
.mv-box.inn .h{color:#f0c46c}
.mv-box div{line-height:1.7}
.mv-box b{font-family:var(--font-m)}
.custrip{display:flex;gap:9px;flex-wrap:wrap;margin-bottom:14px}
.cust{display:flex;align-items:center;gap:9px;padding:9px 13px;border-radius:13px;border:1px solid rgba(240,196,108,.35);background:rgba(240,196,108,.06);font-size:12px}
.cust b{font-family:var(--font-m)}
.cust .who{color:#f0c46c;font-weight:800}
.cust button{padding:6px 10px;border-radius:9px;background:rgba(52,211,153,.14);border:1px solid rgba(52,211,153,.35);color:var(--green);font-size:11px;font-weight:800}
.trk{font-family:var(--font-m);font-size:11px;color:var(--cyan);background:rgba(34,211,238,.07);border:1px solid rgba(34,211,238,.25);border-radius:9px;padding:4px 9px}

/* ---------- Warehouse / Treasury ---------- */
.whgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px;margin-bottom:16px}
.whc{border:1px solid var(--line);border-radius:16px;padding:14px;background:rgba(255,255,255,.02);cursor:pointer;transition:transform .13s}
.whc:active{transform:scale(.97)}
.whc.sel{border-color:var(--acc1);box-shadow:0 0 0 2.5px var(--accsoft)}
.whc b{font-family:var(--font-d);font-size:14px}
.whc small{display:block;color:var(--muted);font-size:11px;margin-top:2px}
.whc .meter{margin-top:10px}
.whc .st{display:flex;gap:12px;margin-top:9px;font-size:11px;color:var(--muted)}
.whc .st b{font-family:var(--font-m);color:var(--ink);font-size:12.5px;display:block}

/* ---------- Catalog grid ---------- */
.catbar{display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;margin-bottom:14px}
.catbar::-webkit-scrollbar{display:none}
.catgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(158px,1fr));gap:12px}
.itcard{border:1px solid var(--line);border-radius:17px;overflow:hidden;background:rgba(255,255,255,.02);cursor:pointer;transition:transform .14s var(--ease)}
.itcard:active{transform:scale(.96)}
.itcard .ph{aspect-ratio:1;display:grid;place-items:center;font-size:44px;position:relative;overflow:hidden}
.itcard .ph img{width:100%;height:100%;object-fit:cover;position:absolute;inset:0}
.itcard .ph .bkc{position:absolute;top:8px;left:8px;font-size:8.5px;font-weight:800;letter-spacing:.8px;padding:3px 7px;border-radius:7px;backdrop-filter:blur(6px)}
.itcard .ph .bkc.k{background:rgba(244,114,182,.2);color:#f9a8d4}
.itcard .ph .bkc.p{background:rgba(96,165,250,.22);color:#93c5fd}
.itcard .inf{padding:10px 12px}
.itcard .inf b{font-size:12.5px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.itcard .inf small{color:var(--muted);font-size:10.5px}
.itcard .inf .q{font-family:var(--font-m);font-weight:800;font-size:12px;margin-top:4px;display:flex;justify-content:space-between}
.itcard .vards{display:flex;gap:4px;margin-top:6px}
.itcard .vards i{width:12px;height:12px;border-radius:5px;border:1px solid rgba(255,255,255,.25)}
.phpick{display:flex;gap:9px;align-items:center;flex-wrap:wrap}
.phpick .pv{width:64px;height:64px;border-radius:14px;border:1.5px dashed var(--line-2);display:grid;place-items:center;font-size:26px;overflow:hidden;position:relative}
.phpick .pv img{width:100%;height:100%;object-fit:cover;position:absolute;inset:0}

/* ---------- Ledger v2 ---------- */
.lg-composer .seg{display:flex;gap:7px;margin-bottom:12px}
.segbtn{flex:1;padding:11px;border-radius:13px;border:1px solid var(--line);background:rgba(255,255,255,.03);color:var(--muted);font-weight:800;font-size:12.5px}
.segbtn.sel-in{color:var(--green);border-color:rgba(52,211,153,.5);background:rgba(52,211,153,.09)}
.segbtn.sel-out{color:var(--red);border-color:rgba(251,95,110,.5);background:rgba(251,95,110,.09)}
.segbtn.sel-cv{color:var(--cyan);border-color:rgba(34,211,238,.5);background:rgba(34,211,238,.09)}
.convbox{border:1px dashed rgba(34,211,238,.4);border-radius:14px;padding:12px;margin-top:11px;font-size:12.5px;display:none}
.convbox.show{display:block;animation:qrIn .35s var(--ease)}
.convbox .row{display:flex;justify-content:space-between;padding:5px 0}
.convbox b{font-family:var(--font-m)}
.convbox .prof{color:var(--green);font-weight:800}
.lgrow{display:flex;gap:11px;padding:11px 4px;border-bottom:1px dashed var(--line);font-size:12.5px;align-items:baseline}
.lgrow:last-child{border:none}
.lgrow .d{font-family:var(--font-m);font-size:10.5px;color:var(--muted);width:46px;flex:none}
.lgrow .amt{margin-left:auto;font-family:var(--font-m);font-weight:800;flex:none;text-align:right}
.lgrow .amt small{display:block;font-weight:600;font-size:10px;color:var(--muted)}

/* ---------- Print preview ---------- */
#printPop{position:fixed;inset:0;z-index:97;background:rgba(4,6,14,.75);backdrop-filter:blur(8px);display:none;place-items:center;padding:14px}
#printPop.open{display:grid}
#printPop .sheet{width:min(760px,100%);max-height:90vh;overflow-y:auto;background:#fff;color:#111;border-radius:14px;padding:26px 28px;font-family:var(--font-m)}
#printPop .sheet h3{font-size:17px;margin-bottom:2px}
#printPop .sheet .sub{font-size:11px;color:#555;margin-bottom:14px}
#printPop .sheet table{width:100%;border-collapse:collapse;font-size:11.5px}
#printPop .sheet th,#printPop .sheet td{border:1px solid #bbb;padding:6px 8px;text-align:left}
#printPop .sheet th{background:#f0f0f4;font-size:10px;letter-spacing:.6px}
#printPop .sheet .cb{display:inline-block;width:14px;height:14px;border:1.6px solid #333;border-radius:3px;vertical-align:middle}
#printPop .sheet .sig{margin-top:22px;display:flex;gap:40px;font-size:11px}
#printPop .sheet .qrph{width:22px;height:22px;background:
  repeating-linear-gradient(0deg,#111 0 2px,transparent 2px 4px),
  repeating-linear-gradient(90deg,#111 0 2px,transparent 2px 4px);opacity:.8}
#printPop .close{position:absolute;top:22px;right:22px;z-index:2}
#printPop .hint{color:#fff;text-align:center;font-size:11.5px;margin-top:10px;opacity:.75}


/* ============================================================
   v58 — CUSTOM SELECT (poore app ka apna dropdown) + LEDGER v3
   ============================================================ */
.cswrap{position:relative;display:inline-flex;min-width:0;vertical-align:middle}
.field .cswrap,.fgrid .cswrap{width:100%}
.pb-add .cswrap{flex:1;min-width:130px}
.line .cswrap{width:100%}
.cs-btn{display:flex;align-items:center;gap:8px;width:100%;background:rgba(255,255,255,.05);
  border:1px solid var(--line);border-radius:12px;padding:11px 13px;color:var(--ink);
  font-family:var(--font-m);font-size:13px;font-weight:600;cursor:pointer;text-align:left;
  transition:border-color .2s,box-shadow .2s,transform .1s;min-height:44px}
.cs-btn:active{transform:scale(.985)}
.cs-btn .lbl{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.cs-btn .car{flex:none;width:16px;height:16px;opacity:.6;transition:transform .25s var(--ease)}
.cs-btn.open{border-color:var(--acc1);box-shadow:0 0 0 3px var(--accsoft)}
.cs-btn.open .car{transform:rotate(180deg)}
#csBackdrop{position:fixed;inset:0;z-index:118;display:none;background:transparent}
#csBackdrop.on{display:block}
#csPanel{position:fixed;z-index:119;min-width:190px;max-width:min(360px,calc(100vw - 24px));
  max-height:46vh;overflow-y:auto;border-radius:16px;padding:6px;
  background:rgba(14,17,32,.92);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);
  border:1px solid rgba(139,92,246,.35);box-shadow:0 22px 60px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.03) inset;
  opacity:0;transform:translateY(-6px) scale(.98);pointer-events:none;transition:opacity .18s var(--ease),transform .18s var(--ease)}
#csPanel.on{opacity:1;transform:none;pointer-events:auto}
#csPanel::-webkit-scrollbar{width:0}
#csPanel .grp{font-size:9px;letter-spacing:1.6px;font-weight:800;color:var(--acc1);
  padding:9px 12px 4px;text-transform:uppercase;opacity:.9}
#csPanel .opt{display:flex;align-items:center;gap:9px;padding:11px 12px;border-radius:11px;
  font-family:var(--font-m);font-size:13px;font-weight:600;color:var(--ink);cursor:pointer}
#csPanel .opt:active{background:rgba(139,92,246,.18)}
#csPanel .opt .tk{margin-left:auto;color:var(--acc1);opacity:0;flex:none;font-weight:800}
#csPanel .opt.sel{background:linear-gradient(90deg,rgba(139,92,246,.16),rgba(139,92,246,.04))}
#csPanel .opt.sel .tk{opacity:1}
#csPanel .csrch{position:sticky;top:0;background:rgba(14,17,32,.97);padding:4px;z-index:2;margin:-2px -2px 4px}
#csPanel .csrch input{width:100%;background:rgba(255,255,255,.06);border:1px solid var(--line);
  border-radius:10px;padding:9px 11px;color:var(--ink);font-family:var(--font-m);font-size:12.5px;outline:none}
.lgp{display:flex;align-items:center;gap:12px;padding:13px 14px;border-radius:16px;
  border:1px solid var(--line);background:rgba(255,255,255,.02);margin-bottom:9px;cursor:pointer;transition:transform .12s}
.lgp:active{transform:scale(.985)}
.lgp .pa i{width:42px;height:42px;font-size:13px}
.lgp .nm{min-width:0;flex:1}
.lgp .nm b{display:block;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lgp .nm small{color:var(--muted);font-size:11px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
.lgp .bal{flex:none;text-align:right;font-family:var(--font-m);font-weight:800;font-size:13.5px}
.lgp .bal small{display:block;font-weight:700;font-size:10.5px;opacity:.8}
.lgp .dirw{flex:none;font-size:9px;font-weight:800;letter-spacing:.6px;padding:4px 8px;border-radius:8px}
.lgp .dirw.get{color:var(--green);background:rgba(52,211,153,.1);border:1px solid rgba(52,211,153,.3)}
.lgp .dirw.give{color:var(--red);background:rgba(251,95,110,.1);border:1px solid rgba(251,95,110,.3)}
#lgOverlay{position:fixed;inset:0;z-index:82;background:var(--bg,#070912);overflow-y:auto;
  transform:translateX(103%);transition:transform .38s var(--ease);
  padding:calc(14px + env(safe-area-inset-top)) 16px 120px}
#lgOverlay.open{transform:none}
.lg-hero{border-radius:20px;padding:18px;margin-bottom:14px;
  background:linear-gradient(135deg,rgba(139,92,246,.22),rgba(34,211,238,.08));
  border:1px solid var(--accsoft);display:flex;flex-wrap:wrap;gap:14px;align-items:center}
.lg-hero .big{font-family:var(--font-m);font-weight:800;font-size:clamp(21px,3vw,28px)}
.lg-hero .sub{font-size:11.5px;color:var(--muted)}
.lg-hero .duo{margin-left:auto;display:flex;gap:10px}
.lg-hero .duo .bx{padding:10px 15px;border-radius:13px;background:rgba(7,9,18,.45);border:1px solid var(--line);text-align:center}
.lg-hero .duo .bx .c{font-size:9px;letter-spacing:1.3px;color:var(--muted);font-weight:800}
.lg-hero .duo .bx .v{font-family:var(--font-m);font-weight:800;font-size:15px;margin-top:3px}


/* ============================================================
   v59 — MASTER BUSINESS · SEND FLOW · NOTICE BOARD · COLOR PASS
   ============================================================ */
#bookBadge{cursor:pointer;user-select:none;font-weight:800;letter-spacing:1.2px;transition:transform .12s}
#bookBadge:active{transform:scale(.93)}
html[data-book="p"] #bookBadge{border-color:rgba(96,165,250,.5);color:#93c5fd}
.cotag{font-size:8.5px;font-weight:800;letter-spacing:.7px;padding:3px 7px;border-radius:7px;vertical-align:middle}
.cotag.se{background:rgba(255,159,67,.14);color:#ffb56b;border:1px solid rgba(255,159,67,.35)}
.cotag.aw{background:rgba(79,124,255,.14);color:#8fabff;border:1px solid rgba(79,124,255,.35)}
.cotag.k{background:rgba(244,114,182,.12);color:#f9a8d4;border:1px solid rgba(244,114,182,.3)}
.co-btn[data-co="both"].sel{background:linear-gradient(135deg,#ff9f43,#4f7cff);color:#fff}
/* flight/bank chip */
.fchip{display:inline-flex;align-items:center;gap:6px;font-family:var(--font-m);font-size:11px;font-weight:700;color:var(--ink);background:rgba(255,255,255,.06);border:1px solid var(--line);border-radius:9px;padding:4px 9px;vertical-align:middle}
.fchip img{width:15px;height:15px;object-fit:contain;background:#fff;border-radius:4px;padding:1.5px}
.fchip.bankc img{width:16px;height:16px}
/* KPI color pass */
.kpi{border:none!important}
.kpi .ktile{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;font-size:17px;margin-bottom:9px;box-shadow:0 6px 16px rgba(0,0,0,.35)}
.kpi.g-green{background:linear-gradient(135deg,rgba(16,120,80,.55),rgba(9,60,45,.65))}
.kpi.g-red{background:linear-gradient(135deg,rgba(150,35,55,.5),rgba(80,18,32,.66))}
.kpi.g-gold{background:linear-gradient(135deg,rgba(150,110,25,.5),rgba(80,58,14,.66))}
.kpi.g-blue{background:linear-gradient(135deg,rgba(35,80,170,.52),rgba(18,40,90,.66))}
.kpi .k-num{color:#fff!important}
.kpi .k-cap{color:rgba(255,255,255,.75)}
.kpi .k-sub{color:rgba(255,255,255,.62)}
.act i{box-shadow:0 5px 14px rgba(0,0,0,.3)}
.feed .f .fd{width:8px;height:8px;border-radius:50%;flex:none;align-self:center}
.cald{font-size:12.5px}
.cald.hasev{background:rgba(139,92,246,.1);border:1px solid rgba(139,92,246,.25)}
/* detail overlay (invoice/shipment full view) */
#dtlOverlay{position:fixed;inset:0;z-index:84;background:var(--bg,#070912);overflow-y:auto;transform:translateY(103%);transition:transform .34s var(--ease);padding:calc(14px + env(safe-area-inset-top)) 16px 130px}
#dtlOverlay.open{transform:none}
.dtl-lines{width:100%;border-collapse:collapse;font-size:12.5px}
.dtl-lines th{font-size:9.5px;letter-spacing:1.4px;color:var(--muted);text-align:left;padding:8px 10px;border-bottom:1px solid var(--line)}
.dtl-lines td{padding:10px;border-bottom:1px dashed var(--line);font-family:var(--font-m)}
.dtl-lines tr:last-child td{border:none}
/* send sheet */
#sendSheet{position:fixed;inset:0;z-index:94;background:rgba(4,6,14,.72);backdrop-filter:blur(10px);display:none;align-items:flex-end;justify-content:center}
#sendSheet.open{display:flex}
#sendSheet .sh{width:min(680px,100%);max-height:88vh;overflow-y:auto;background:var(--glass-2);border:1.5px solid var(--accsoft);border-radius:26px 26px 0 0;padding:20px 18px calc(20px + env(safe-area-inset-bottom));animation:sheetUp .32s var(--ease)}
@keyframes sheetUp{from{transform:translateY(60px);opacity:0}to{transform:none;opacity:1}}
.send-opt{display:flex;align-items:center;gap:13px;padding:14px;border:1px solid var(--line);border-radius:16px;background:rgba(255,255,255,.03);margin-bottom:10px;cursor:pointer;transition:transform .12s,border-color .2s}
.send-opt:active{transform:scale(.98)}
.send-opt.sel{border-color:var(--acc1);box-shadow:0 0 0 2.5px var(--accsoft)}
.send-opt .ic{width:42px;height:42px;border-radius:13px;display:grid;place-items:center;font-size:19px;flex:none}
.send-opt b{font-size:14px;display:block}
.send-opt small{color:var(--muted);font-size:11.5px}
.send-opt .cap{margin-left:auto;text-align:right;font-family:var(--font-m);font-size:11.5px;flex:none}
.sstep{display:none}.sstep.on{display:block;animation:qrIn .3s var(--ease)}
/* notice board */
.nb{border:1px solid rgba(240,196,108,.28);border-radius:17px;background:linear-gradient(160deg,rgba(240,196,108,.06),rgba(240,196,108,.015));padding:14px;margin-bottom:16px}
.nb .nb-h{display:flex;align-items:center;gap:9px;font-size:11px;letter-spacing:1.6px;font-weight:800;color:#f0c46c;margin-bottom:8px}
.nbrow{display:flex;gap:11px;align-items:flex-start;padding:10px 2px;border-bottom:1px dashed rgba(240,196,108,.2);font-size:12.5px}
.nbrow:last-child{border:none}
.nbrow .em{font-size:17px;flex:none;margin-top:1px}
.nbrow .tx{flex:1;line-height:1.5}
.nbrow .tx b{font-family:var(--font-m)}
.nbrow .tx small{display:block;color:var(--muted);font-size:10.5px;margin-top:2px}
.nbrow .st-got{color:var(--green);font-weight:800;font-size:11px;white-space:nowrap}
.nbrow .st-with{color:#f0c46c;font-weight:800;font-size:11px;white-space:nowrap}
.nbrow button{padding:7px 11px;border-radius:10px;font-size:11px;font-weight:800;flex:none}
.nbrow .bt-got{background:rgba(52,211,153,.14);border:1px solid rgba(52,211,153,.35);color:var(--green)}
.nbrow .bt-undo{background:rgba(255,255,255,.05);border:1px solid var(--line);color:var(--muted)}
/* plane livery */
.tripPlane{width:44px;height:44px;flex:none;filter:drop-shadow(0 4px 10px rgba(0,0,0,.5))}
/* ship composer (single form) */
.bagrow{border:1px dashed var(--line);border-radius:14px;padding:11px;margin-top:9px;display:grid;grid-template-columns:minmax(150px,2fr) 90px minmax(130px,1.6fr) 34px;gap:8px;align-items:center}
@media(max-width:860px){.bagrow{grid-template-columns:1fr 1fr}.bagrow .cswrap{grid-column:span 2}}
.bagrow input{background:rgba(255,255,255,.05);border:1px solid var(--line);border-radius:11px;padding:10px 11px;color:var(--ink);font-family:var(--font-m);font-size:12.5px;width:100%}
.bagrow .rm{width:32px;height:32px;border-radius:10px;background:rgba(251,95,110,.1);border:1px solid rgba(251,95,110,.3);color:var(--red)}
.recv{border:1px solid rgba(52,211,153,.3);background:rgba(52,211,153,.05);border-radius:14px;padding:12px;margin-top:13px;font-size:12.5px}
.recv .r{display:flex;justify-content:space-between;padding:4px 0}
.recv b{font-family:var(--font-m)}
.recv .tt{border-top:1px dashed rgba(52,211,153,.3);margin-top:6px;padding-top:8px;font-weight:800}
/* pipeline */
.pipe{display:flex;align-items:stretch;gap:0;overflow-x:auto;padding:6px 2px 14px;margin-bottom:14px}
.pipe::-webkit-scrollbar{display:none}
.pnode{min-width:150px;flex:1;border:1px solid var(--line);border-radius:16px;background:rgba(255,255,255,.02);padding:12px;position:relative;cursor:pointer;transition:transform .12s}
.pnode:active{transform:scale(.97)}
.pnode.sel{border-color:var(--acc1);box-shadow:0 0 0 2.5px var(--accsoft)}
.pnode b{font-size:12.5px;display:block}
.pnode small{color:var(--muted);font-size:10px;display:block;margin-top:1px}
.pnode .cnt{display:flex;gap:9px;margin-top:9px;font-family:var(--font-m);font-size:11.5px}
.pnode .cnt span b{font-size:14px;display:inline}
.plink{width:34px;flex:none;display:grid;place-items:center;position:relative}
.plink::before{content:"";position:absolute;left:0;right:0;top:50%;height:2px;background:repeating-linear-gradient(90deg,var(--acc1) 0 6px,transparent 6px 12px);opacity:.55;animation:dashmove 1.6s linear infinite}
.wtab{display:flex;gap:8px;margin:4px 0 12px}
/* rate engine */
.rateduo{display:grid;grid-template-columns:1fr 1fr;gap:14px}
@media(max-width:860px){.rateduo{grid-template-columns:1fr}}
.ratec{border-radius:18px;padding:16px;position:relative;overflow:hidden}
.ratec.buy{background:linear-gradient(150deg,rgba(16,120,80,.4),rgba(9,60,45,.55));border:1px solid rgba(52,211,153,.35)}
.ratec.sell{background:linear-gradient(150deg,rgba(150,90,25,.38),rgba(90,45,14,.55));border:1px solid rgba(240,196,108,.35)}
.ratec .dirlbl{font-size:10px;letter-spacing:1.6px;font-weight:800;color:rgba(255,255,255,.75)}
.ratec .big{font-family:var(--font-m);font-weight:800;font-size:clamp(26px,3.4vw,36px);color:#fff;margin:6px 0 2px}
.ratec .sub{font-size:11.5px;color:rgba(255,255,255,.65)}
.ratec .pr{margin-top:9px;font-family:var(--font-m);font-weight:800;font-size:13px}
.marginbox{display:flex;gap:10px;align-items:center;flex-wrap:wrap;background:rgba(255,255,255,.03);border:1px solid var(--line);border-radius:15px;padding:12px 14px;margin:14px 0}
.marginbox input{width:90px;background:rgba(255,255,255,.06);border:1px solid var(--line);border-radius:11px;padding:9px 11px;color:var(--ink);font-family:var(--font-m);font-weight:700;text-align:right}


/* ============================================================
   v60 — CINEMATIC BOOT · ADVANCED OPSI · WORLD MAP ART · FINS
   ============================================================ */
/* mode toggle — asli highlight */
.mode-btn{position:relative;z-index:1;transition:color .25s}
.mode-btn.sel{color:#fff}
.mode-btn.sel::before{content:"";position:absolute;inset:0;z-index:-1;border-radius:999px;
  background:linear-gradient(120deg,#8b5cf6,#22d3ee);opacity:.92;box-shadow:0 4px 18px rgba(139,92,246,.45)}
.mode-wrap[data-mode="cash"] .mode-btn[data-mode="cash"].sel::before{background:linear-gradient(120deg,#f472b6,#8b5cf6)}
/* pinch lock */
html,body{touch-action:pan-x pan-y;-ms-touch-action:pan-x pan-y}
/* ---------- boot v2: login + dive ---------- */
#boot{transition:opacity .5s}
#boot .stage{display:flex;flex-direction:column;align-items:center;gap:14px;transition:transform .6s var(--ease)}
#boot.auth .stage{transform:translateY(-11vh)}
#authWrap{width:min(340px,86vw);opacity:0;pointer-events:none;transform:translateY(26px);transition:.5s var(--ease);display:flex;flex-direction:column;gap:11px;margin-top:6px}
#boot.auth #authWrap{opacity:1;pointer-events:auto;transform:none}
#authWrap input{background:rgba(255,255,255,.05);border:1px solid rgba(139,92,246,.3);border-radius:14px;
  padding:13px 15px;color:var(--ink);font-size:14px;width:100%;outline:none;transition:border-color .2s,box-shadow .2s}
#authWrap input:focus{border-color:#8b5cf6;box-shadow:0 0 0 3px rgba(139,92,246,.18)}
#authRow{display:flex;gap:10px;align-items:stretch}
#authGo{flex:1;border-radius:14px;border:none;padding:13px;font-weight:800;font-size:14px;color:#fff;cursor:pointer;
  background:linear-gradient(120deg,#8b5cf6,#22d3ee);box-shadow:0 8px 24px rgba(139,92,246,.35)}
#authGo:active{transform:scale(.97)}
#authFp{width:54px;border-radius:14px;border:1.5px solid rgba(34,211,238,.45);background:rgba(34,211,238,.08);
  display:grid;place-items:center;color:#22d3ee;cursor:pointer;position:relative;overflow:hidden}
#authFp svg{width:26px;height:26px}
#authFp.scan::after{content:"";position:absolute;left:8%;right:8%;height:2.5px;border-radius:2px;top:12%;
  background:linear-gradient(90deg,transparent,#22d3ee,transparent);box-shadow:0 0 12px #22d3ee;animation:fpscan .8s linear infinite}
@keyframes fpscan{0%{top:12%}50%{top:82%}100%{top:12%}}
#authMsg{text-align:center;font-size:11.5px;color:var(--muted);min-height:16px}
#authWrap.ok input,#authWrap.ok button{pointer-events:none}
/* dive */
#boot.dive .stage{transition:transform 1s cubic-bezier(.7,0,.85,0);transform:scale(26)}
#boot.dive{background:#05060d}
#diveFx{position:absolute;inset:0;pointer-events:none;opacity:0}
#boot.dive #diveFx{opacity:1}
#diveFx i{position:absolute;left:50%;top:50%;width:2px;height:2px;border-radius:2px;
  background:linear-gradient(180deg,#8b5cf6,#22d3ee);animation:streak .9s cubic-bezier(.6,0,.9,.2) forwards}
@keyframes streak{from{transform:translate(-50%,-50%) rotate(var(--a)) translateY(0) scaleY(1);opacity:0}
 25%{opacity:1}to{transform:translate(-50%,-50%) rotate(var(--a)) translateY(-64vmax) scaleY(46);opacity:0}}
/* dashboard wake stagger */
.view.active .card.wake{animation:wakeUp .55s var(--ease) both}
@keyframes wakeUp{from{opacity:0;transform:translateY(22px) scale(.985)}to{opacity:1;transform:none}}
/* ---------- OPSI advanced bot ---------- */
.opsibot{display:block;filter:drop-shadow(0 6px 18px rgba(139,92,246,.4))}
.opsibot .cirq{stroke-dasharray:6 90;animation:cirqRun 3.2s linear infinite;opacity:.85}
.opsibot .cirq.c2{animation-delay:-1.4s}
.opsibot .cirq.c3{animation-delay:-2.3s}
@keyframes cirqRun{to{stroke-dashoffset:-96}}
.opsibot .eyeL,.opsibot .eyeR{transform-origin:center;animation:botBlink 4.6s infinite}
@keyframes botBlink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.08)}}
.opsibot .core{animation:corePulse 2.4s ease-in-out infinite}
@keyframes corePulse{0%,100%{opacity:.55}50%{opacity:1}}
.beehover{animation:beeHover 3.8s ease-in-out infinite}
@keyframes beeHover{0%,100%{transform:translate(0,0) rotate(0deg)}25%{transform:translate(1.5px,-2.5px) rotate(-1.6deg)}55%{transform:translate(-1.5px,-1px) rotate(1.2deg)}80%{transform:translate(.5px,-3px) rotate(-.6deg)}}
#flyBot{position:fixed;z-index:240;width:64px;height:64px;pointer-events:none;display:none;
  transition:transform .95s cubic-bezier(.45,.05,.2,1.1),width .4s,height .4s;will-change:transform}
#flyBot.on{display:block}
#flyBot .wingL,#flyBot .wingR{animation:wingBuzz .12s linear infinite;transform-origin:center}
@keyframes wingBuzz{0%,100%{opacity:.2}50%{opacity:.75}}
.brief-ava2{width:56px;height:56px;border-radius:18px;background:linear-gradient(150deg,rgba(139,92,246,.18),rgba(34,211,238,.08));
  border:1px solid rgba(139,92,246,.35);display:grid;place-items:center;flex:none}
/* ---------- world map art ---------- */
.worldwrap{position:relative;width:100%;aspect-ratio:2/1.04;border-radius:18px;overflow:hidden;
  background:radial-gradient(120% 100% at 30% 0%,#0b1030 0%,#070a1c 45%,#05070f 100%)}
.worldwrap svg{position:absolute;inset:0;width:100%;height:100%}
.wm-land{fill:#141b3d;stroke:#2a3670;stroke-width:.8;filter:drop-shadow(0 0 6px rgba(64,84,190,.25))}
.wm-grid{stroke:#1a2350;stroke-width:.5;opacity:.5}
.wm-route{fill:none;stroke:url(#wmRoute);stroke-width:2.2;stroke-linecap:round;stroke-dasharray:5 7;animation:dashmove 1.4s linear infinite;filter:drop-shadow(0 0 6px rgba(139,92,246,.6))}
.wm-city{fill:#e7ebff;font-family:var(--font-m);font-size:11px;font-weight:700;letter-spacing:1.5px}
.wm-dot{filter:drop-shadow(0 0 7px currentColor)}
.wm-lbl{fill:#aeb8e8;font-family:var(--font-m);font-size:9.5px;font-weight:700}
/* tail fin badge */
.finb{display:inline-flex;align-items:center;gap:7px;vertical-align:middle}
.finb svg{filter:drop-shadow(0 3px 8px rgba(0,0,0,.45))}
.finb .fno{font-family:var(--font-m);font-weight:800;font-size:12px;letter-spacing:.5px}
/* flat bag rows */
.bagflat{display:flex;align-items:center;gap:11px;padding:11px 12px;border:1px solid var(--line);border-radius:14px;margin-top:8px;background:rgba(255,255,255,.02)}
.bagflat .bid2{font-family:var(--font-m);font-weight:800;font-size:12px;color:#a5b4fc;background:rgba(99,102,241,.12);border:1px solid rgba(99,102,241,.3);padding:5px 9px;border-radius:9px;flex:none}
.bagflat .own{display:flex;align-items:center;gap:6px;font-size:12.5px;flex-wrap:wrap}
.bagflat .own .arrw{color:var(--muted)}
.bagflat .own b{white-space:nowrap}
.bagflat .its2{font-size:11px;color:var(--muted);margin-top:2px}
.bagflat .kg2{margin-left:auto;font-family:var(--font-m);font-weight:800;flex:none}
.brief-card-fix{background:linear-gradient(160deg,rgba(139,92,246,.07),rgba(34,211,238,.03))!important;border:1px solid rgba(139,92,246,.28)!important;box-shadow:none!important}


/* ---------- v60b: OPSI chat ---------- */
#aiLog{max-height:280px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;margin:10px 0;padding-right:2px}
#aiLog::-webkit-scrollbar{width:0}
.aimsg{max-width:88%;padding:10px 13px;border-radius:15px;font-size:12.8px;line-height:1.55}
.aimsg.me{align-self:flex-end;background:linear-gradient(120deg,#8b5cf6,#22d3ee);color:#fff;border-bottom-right-radius:5px}
.aimsg.bot{align-self:flex-start;background:rgba(255,255,255,.05);border:1px solid var(--line);border-bottom-left-radius:5px}
.aithink i{animation:thinkDots 1.2s infinite;opacity:0}
.aithink i:nth-child(2){animation-delay:.25s}.aithink i:nth-child(3){animation-delay:.5s}
@keyframes thinkDots{0%,100%{opacity:0}40%{opacity:1}}
#aiBar{display:flex;gap:8px;margin-bottom:10px}
#aiBar input{flex:1;background:rgba(255,255,255,.05);border:1px solid rgba(139,92,246,.3);border-radius:13px;padding:11px 13px;color:var(--ink);font-size:13px;outline:none}
#aiBar input:focus{border-color:#8b5cf6}
#aiBar button{width:46px;border-radius:13px;border:none;background:linear-gradient(120deg,#8b5cf6,#22d3ee);color:#fff;font-size:16px;cursor:pointer}
#aiBar button:active{transform:scale(.94)}


/* v60c voice */
#aiMic{width:46px;border-radius:13px;border:1.5px solid rgba(34,211,238,.4);background:rgba(34,211,238,.08);color:#22d3ee;cursor:pointer;display:grid;place-items:center}
#aiMic.live{background:linear-gradient(120deg,#f43f5e,#f472b6);border-color:transparent;color:#fff;animation:micPulse 1.1s infinite}
@keyframes micPulse{0%,100%{box-shadow:0 0 0 0 rgba(244,63,94,.5)}55%{box-shadow:0 0 0 9px rgba(244,63,94,0)}}
#aiSpk{width:42px;border-radius:13px;border:1px solid var(--line);background:rgba(255,255,255,.05);font-size:15px;cursor:pointer}
#aiSpk.off{opacity:.4;filter:grayscale(1)}
#vizWrap{display:none;align-items:flex-end;gap:3px;height:34px;margin:0 0 8px;padding:0 4px}
#vizWrap.on{display:flex}
#vizWrap i{width:4px;height:5px;border-radius:3px;background:linear-gradient(180deg,#22d3ee,#8b5cf6);transition:height .09s}
#vState{margin-left:10px;font-size:11px;color:var(--muted);align-self:center}

/* ---------- Mobile breakpoint — poora layout switch ---------- */
@media (max-width:920px){
  .sidebar{display:none}
  #dock{display:grid}
  html,body{overflow-x:hidden}
  #app{width:100%;max-width:100vw;overflow-x:hidden}
  .main{min-width:0;max-width:100vw}
  .views{overflow-x:hidden}
  .views{padding:12px 14px 160px}
  .topbar{padding:10px 14px}
  .avatar .who{display:none}
  .page-title{font-size:26px}
  .chip.hidesm{display:inline-flex}
  .page-sub{flex-wrap:wrap;row-gap:6px}
  .grid-2{grid-template-columns:1fr}
  /* stat cards → swipe carousel */
  .stats{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;
    gap:12px;margin:0 -14px 20px;padding:4px 14px 10px;scrollbar-width:none}
  .stats::-webkit-scrollbar{display:none}
  .stats .stat{flex:0 0 80%;max-width:320px;scroll-snap-align:center;min-height:150px}
  /* tables → horizontal scroll, layout kabhi na toote */
  .tblwrap{overflow-x:auto;-webkit-overflow-scrolling:touch;max-width:100%}
  .tbl{min-width:520px}
  /* floating orb chhupao — dock ka orb hi OPSI hai */
  #opsiOrb{display:none}
  #opsiPanel{right:10px;left:10px;width:auto;bottom:calc(104px + env(safe-area-inset-bottom))}
  #toast{bottom:calc(100px + env(safe-area-inset-bottom));width:max-content;max-width:92vw;text-align:center}
  .formcard .fgrid{grid-template-columns:1fr 1fr}
}
</style>
</head>
<body>
<div id="boot"><div class="stage">
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
  <div id="authWrap">
    <input id="authUser" placeholder="Login ID" autocomplete="off">
    <input id="authPass" type="password" placeholder="Password" autocomplete="off">
    <div id="authRow">
      <button id="authGo">Login &#10142;</button>
      <button id="authFp" aria-label="Fingerprint">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">
          <path d="M17.8 6.7A7 7 0 0 0 5 11v2c0 1.8.3 3.5 1 5"/><path d="M19 11v2a13 13 0 0 1-1.1 5.2"/>
          <path d="M12 11v2a9 9 0 0 0 1.8 5.4"/><path d="M8.5 14a5.5 5.5 0 0 1-.1-1v-2a3.6 3.6 0 0 1 6.4-2.2"/>
          <path d="M15.4 12.5a20 20 0 0 1-.7 6.5"/></svg>
      </button>
    </div>
    <div id="authMsg">Fingerprint dabaiye — ya ID/password se aaiye</div>
  </div>
  </div><div id="diveFx"></div>
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
      <button class="nav-item" data-view="trips"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg><span>Movement</span></button>
      <button class="nav-item" data-view="hisaab"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z"/></svg><span>Ledger</span></button>
      <button class="nav-item" data-view="catalog"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2l8 4.5v9L12 20l-8-4.5v-9z"/><path d="M12 11L4 6.5M12 11l8-4.5M12 11v9"/><path d="M8 4.2l8 4.6"/></svg><span>Catalog</span></button>
      <button class="nav-item" data-view="warehouse"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 21V8l9-5 9 5v13"/><path d="M3 21h18"/><path d="M7 21v-8h10v8"/><path d="M7 17h10"/></svg><span>Warehouse</span></button>
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
      <div class="chip hidesm">BUILD <b>v60</b></div>
      <div class="chip" id="bookBadge">KACHCHA</div>
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
      <h1 class="page-title" id="greetTitle">Namaste</h1>
      <div class="page-sub" id="greetTail">Sab systems taiyaar hain.</div>
      <div class="page-sub" style="margin-top:6px">
        <span id="todayStr">—</span><span class="dot"></span>
        <span><b id="dsTrips">0</b> trips live</span><span class="dot"></span>
        <span><b id="dsBags">0</b> bags ready</span><span class="dot"></span>
        <span>Gold IN <b>&#8377;11,899</b></span><span class="dot"></span>
        <span>Gold BKK <b>&#3647;4,176</b></span><span class="dot"></span>
        <span>Transfer <b id="tfRate" style="color:var(--green)">&#8377;2.848</b><i class="live-dot"></i></span>
      </div>
      <div class="hairline"></div>

      <div class="mode-wrap" data-mode="cash" id="modeWrap">
        <button class="mode-btn sel" data-mode="cash">Cash <small>KACHCHA</small></button>
        <button class="mode-btn" data-mode="business">Business <small>PAKKA</small></button>
      </div>
      <div class="co-wrap"><button class="co-btn sel" data-co="singh">Singh Exports</button><button class="co-btn" data-co="awadh">Awadh Enterprise</button></div>

      <!-- OPSI daily brief -->
      <div class="card brief-card-fix" id="briefCard" style="margin-bottom:14px">
        <div class="card-head" style="margin-bottom:10px">
          <div class="pa" style="gap:12px"><span class="brief-ava2" id="briefBot"></span>
            <div><b style="font-family:var(--font-d)">OPSI</b><div style="font-size:11px;color:var(--muted)">aapka daily brief</div></div>
          </div>
          <div style="margin-left:auto;display:flex;gap:8px">
            <button class="iconbtn" id="briefStats" title="Stats"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="5" y="12" width="3" height="7" rx="1"/><rect x="10.5" y="8" width="3" height="11" rx="1"/><rect x="16" y="4" width="3" height="15" rx="1"/></svg></button>
            <button class="iconbtn" id="briefReplay" title="Dobara"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M1 4v6h6"/><path d="M3.5 15a9 9 0 1 0 2-9.7L1 10"/></svg></button>
          </div>
        </div>
        <div class="brief" id="briefBody"></div>
      </div>

      <div class="bento">
        <!-- KPI row -->
        <div class="card kpi g-green b3" data-goto="hisaab"><div class="ktile" style="background:linear-gradient(135deg,#34d399,#0d9463)">&#8595;</div><div class="k-cap">Lena hai</div><div class="k-num" id="kpiIn">&#8377;0</div><div class="k-sub" id="kpiInSub">—</div><svg class="spark" id="sp1"></svg></div>
        <div class="card kpi g-red b3" data-goto="hisaab"><div class="ktile" style="background:linear-gradient(135deg,#fb5f6e,#b91c30)">&#8593;</div><div class="k-cap">Dena hai</div><div class="k-num" id="kpiOut">&#8377;0</div><div class="k-sub" id="kpiOutSub">—</div><svg class="spark" id="sp2"></svg></div>
        <div class="card kpi g-gold b3" data-goto="warehouse"><div class="ktile" style="background:linear-gradient(135deg,#f0c46c,#a8752c)">&#127942;</div><div class="k-cap">Treasury aaj</div><div class="k-num" id="kpiTre">&#8377;0</div><div class="k-sub" id="kpiTreSub">gold + USD</div><svg class="spark" id="sp3"></svg></div>
        <div class="card kpi g-blue b3" data-goto="shipments"><div class="ktile" style="background:linear-gradient(135deg,#60a5fa,#2451b5)">&#128230;</div><div class="k-cap">Bags ready</div><div class="k-num" id="kpiBags">0</div><div class="k-sub" id="kpiBagsSub">—</div><svg class="spark" id="sp4"></svg></div>

        <!-- Corridor live map -->
        <div class="card b8">
          <div class="card-head"><span class="card-eyebrow">Corridor Live — Delhi &#8596; Bangkok</span><span class="pill p-live" style="margin-left:auto" id="corrLive">LIVE</span></div>
          <div class="corr" id="corrMap"></div>
          <div class="corr-legend" id="corrLegend"></div>
        </div>

        <!-- Treasury -->
        <div class="card b4" data-goto="warehouse" style="cursor:pointer">
          <div class="card-head"><span class="card-eyebrow">Treasury — Gold 999.9</span><span class="tre-pl up" id="trePL" style="margin-left:auto">+0%</span></div>
          <div class="tre-top">
            <div><div class="tre-big" id="treGm">0 gm</div><div style="font-size:11px;color:var(--muted)" id="treBuy">avg &#8377;— / gm</div></div>
            <div style="margin-left:auto;text-align:right"><div class="tre-big" id="treVal" style="color:var(--green)">&#8377;0</div><div style="font-size:11px;color:var(--muted)">aaj ke bhaav par</div></div>
          </div>
          <svg id="goldWorm" style="width:100%;height:110px;margin-top:10px"></svg>
          <div style="font-size:11px;color:var(--muted)" id="treUsd">USD stock: $0</div>
        </div>

        <!-- Aaj ke kaam -->
        <div class="card b4">
          <div class="card-head"><span class="card-eyebrow">Aaj Ke Kaam — OPSI ki nazar</span></div>
          <div id="actList"></div>
        </div>

        <!-- Calendar -->
        <div class="card b4">
          <div class="cal-head"><b id="dcalTitle">—</b>
            <div style="margin-left:auto;display:flex;gap:6px"><button id="dcalPrev">&#8249;</button><button id="dcalNext">&#8250;</button></div>
          </div>
          <div class="calgrid" id="dcalGrid"></div>
          <div class="cal-evs" id="calEvs"></div>
        </div>

        <!-- Cashflow -->
        <div class="card b4">
          <div class="card-head"><span class="card-eyebrow">Cashflow — 12 hafte</span></div>
          <svg id="flowChart" style="width:100%;height:230px"></svg>
          <div class="corr-legend"><span><i style="color:#34d399">&#9679;</i> Aaya</span><span><i style="color:#fb5f6e">&#9679;</i> Gaya</span><span><i style="color:#f0c46c">&#9679;</i> Gold value</span></div>
        </div>

        <!-- Book split donut + activity -->
        <div class="card b4">
          <div class="card-head"><span class="card-eyebrow">Is Mahine — Kachcha vs Pakka</span></div>
          <div class="donutwrap"><svg id="bookDonut" viewBox="0 0 42 42"></svg><div class="dlegend" id="donutLegend"></div></div>
        </div>
        <div class="card b8">
          <div class="card-head"><span class="card-eyebrow">Abhi-Abhi — Activity</span></div>
          <div class="feed" id="feedList"></div>
        </div>
      </div>
    </section>

    <!-- ============ PARTIES ============ -->
    <section class="view" id="v-parties">
      <div class="page-eyebrow">Log</div>
      <h1 class="page-title">Parties</h1>
      <div class="page-sub"><span><b id="pCount">0</b> active</span><span class="dot"></span><span>Parent &#8594; End customer &#183; Direct &#183; Carriers &#183; Suppliers</span></div>
      <div class="hairline"></div>
      <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">
        <button class="btn primary" id="btnNewParty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>New Party</button>
        <input id="pSearch" placeholder="Dhundho…" style="flex:1;min-width:150px;background:rgba(255,255,255,.05);border:1px solid var(--line);border-radius:13px;padding:11px 15px;color:var(--ink);font-family:var(--font-m);font-size:13px;outline:none">
      </div>
      <div class="pchips" id="pTypeChips">
        <button class="pchip sel" data-pt="all">All</button>
        <button class="pchip" data-pt="parent">Parents</button>
        <button class="pchip" data-pt="direct">My Direct</button>
        <button class="pchip" data-pt="end">End Customers</button>
        <button class="pchip" data-pt="carrier">Carriers</button>
        <button class="pchip" data-pt="supplier">Suppliers</button>
      </div>
      <div class="card formcard wmform" id="partyForm" data-wm="KACHCHA">
        <div class="card-eyebrow" style="margin-bottom:16px">New Party — quick add</div>
        <div class="fgrid">
          <div class="field" style="margin:0"><label>Name</label><input id="pfName" placeholder="jaise: Prasert Silk"></div>
          <div class="field" style="margin:0"><label>Type</label><select id="pfType"><option value="parent">Parent customer</option><option value="direct">Mera direct customer</option><option value="end">End customer</option><option value="carrier">Delivery partner</option><option value="supplier">Supplier</option></select></div>
          <div class="field" style="margin:0" id="pfParentWrap"><label>Under which parent</label><select id="pfParent"></select></div>
          <div class="field" style="margin:0"><label>Country</label><select id="pfCountry"><option>Thailand</option><option>India</option><option>Malaysia</option><option>China</option><option>Australia</option><option>USA</option><option>Germany</option></select></div>
          <div class="field" style="margin:0"><label>City</label><input id="pfCity" placeholder="Bangkok"></div>
          <div class="field" style="margin:0"><label>Phone / WhatsApp</label><input id="pfPhone" placeholder="+66 …"></div>
          <div class="field" style="margin:0"><label>LINE ID</label><input id="pfLine" placeholder="@id (Thailand ke liye)"></div>
          <div class="field" style="margin:0"><label>Freight &#8377;/kg</label><input id="pfRateI" type="number" inputmode="numeric" placeholder="210"></div>
          <div class="field" style="margin:0"><label>Freight &#3647;/kg</label><input id="pfRateT" type="number" inputmode="numeric" placeholder="92"></div>
          <div class="field" style="margin:0" id="pfGstWrap" style="display:none"><label>GSTIN (optional)</label><input id="pfGst" placeholder="07AAACx…"></div>
          <button class="btn primary" id="pfSave" style="height:50px">Save</button>
        </div>
        <div class="gsthint" style="margin-top:12px">Bhasha OPSI khud tay karega (country/state se) &#183; poori detail party khol kar kabhi bhi</div>
      </div>
      <div id="pList"></div>
    </section>

    <!-- ============ INVOICES ============ -->
    <section class="view" id="v-invoices">
      <div class="page-eyebrow">Billing</div>
      <h1 class="page-title">Invoices</h1>
      <div class="page-sub"><span>Kachcha = tear &amp; throw</span><span class="dot"></span><span>Pakka = permanent &#183; GST &#183; SE + AW master</span></div>
      <div class="hairline"></div>
      <div class="mode-wrap" data-mode="cash" id="modeWrap2">
        <button class="mode-btn sel" data-mode="cash">Cash <small>KACHCHA</small></button>
        <button class="mode-btn" data-mode="business">Business <small>PAKKA</small></button>
      </div>
      <div class="co-wrap"><button class="co-btn sel" data-co="singh">Singh Exports</button><button class="co-btn" data-co="awadh">Awadh Enterprise</button></div>

      <div class="card formcard wmform" id="invForm" data-wm="KACHCHA">
        <div class="card-eyebrow" style="margin-bottom:16px" id="invTitle">New Kachcha Receipt</div>
        <div class="fgrid" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">
          <div class="field" style="margin:0"><label>Party</label><select id="invParty"></select></div>
          <div class="field" style="margin:0"><label>Currency</label><select id="invCur"><option value="INR">&#8377; INR</option><option value="THB">&#3647; THB</option></select></div>
          <div class="field" style="margin:0"><label>Freight (kg, optional)</label><input id="invKg" type="number" inputmode="decimal" placeholder="0"></div>
        </div>
        <div style="font-size:10.5px;letter-spacing:1.4px;color:var(--muted);font-weight:800;margin:16px 0 8px">ITEMS</div>
        <div class="lines" id="invLines"></div>
        <button class="btn" id="invAddLine" style="margin-top:10px;padding:9px 14px;font-size:12px">+ Line jodo</button>
        <div class="totbar">
          <span>Subtotal <b id="invSub">&#8377;0</b></span>
          <span id="invFrWrap">Freight <b id="invFr">&#8377;0</b></span>
          <span id="invGstWrap" style="display:none">GST 5% <b id="invGstAmt">&#8377;0</b></span>
          <span class="grand" id="invGrand">&#8377;0</span>
          <button class="btn primary" id="invSave" style="padding:12px 22px">Save</button>
        </div>
        <div class="gsthint" id="invGst" style="display:none;margin-top:10px">Pakka bill — <b id="invGstCo">Singh Exports</b> &#183; confirm popup ke baad hi save</div>
      </div>

      <div class="card">
        <div class="card-head"><span class="card-eyebrow">Recent</span>
          <button class="btn primary" style="margin-left:auto;margin-top:12px" id="btnNewInv">+ New</button>
        </div>
        <div style="padding:6px 8px 12px">
        <table class="tbl">
          <thead><tr><th>No.</th><th>Party</th><th>Type</th><th>Items</th><th style="text-align:right">Amount</th><th>Status</th><th></th></tr></thead>
          <tbody id="invRows"></tbody>
        </table>
        </div>
      </div>
    </section>

    <!-- ============ SHIPMENTS ============ -->
    <section class="view" id="v-shipments">
      <div class="page-eyebrow">Cargo</div>
      <h1 class="page-title">Shipments</h1>
      <div class="page-sub"><span><b id="shBagCount">0</b> bags ready</span><span class="dot"></span><span>Parent &#8594; End &#183; Direct sab alag dikhega</span></div>
      <div class="hairline"></div>
      <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">
        <button class="btn primary" id="btnNewShip">+ New Shipment</button>
      </div>
      <div class="card formcard wmform" id="shipForm" data-wm="KACHCHA">
        <div class="card-eyebrow" style="margin-bottom:16px">New Shipment — sab ek hi jagah</div>
        <div class="fgrid" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">
          <div class="field" style="margin:0"><label>Date</label><input id="shDate" class="datefield" readonly placeholder="Tap — calendar (khaali = aaj)"></div>
          <div class="field" style="margin:0"><label>Destination</label><select id="shDest"><option>Bangkok</option><option>Pattaya</option><option>Chiang Mai</option><option>Kuala Lumpur</option><option>Sydney</option><option>Delhi (return)</option></select></div>
        </div>
        <div style="font-size:10.5px;letter-spacing:1.4px;color:var(--muted);font-weight:800;margin:16px 0 4px">BAGS — kiska maal · kg · items</div>
        <div id="scRows"></div>
        <button class="btn" id="scAdd" style="margin-top:10px;padding:9px 14px;font-size:12px;border-style:dashed">+ Bag</button>
        <div class="recv" id="scRecv"></div>
        <div style="display:flex;gap:10px;margin-top:14px"><button class="btn primary" id="shSave" style="flex:1;padding:13px">Create Shipment ✓</button></div>
        <div class="gsthint" style="margin-top:10px">Invoice ke items se bharna ho to Invoices → Ship → — wahan Packing Board khulta hai</div>
      </div>
      <div id="shipList"></div>
    </section>

    <!-- ============ MOVEMENT ============ -->
    <section class="view" id="v-trips">
      <div class="page-eyebrow">Corridor</div>
      <h1 class="page-title">Movement</h1>
      <div class="page-sub"><span>Carrier &#183; Courier &#183; Air cargo &#183; Sea cargo</span><span class="dot"></span><span>Two-way — going &amp; coming</span></div>
      <div class="hairline"></div>
      <div class="custrip" id="custStrip"></div>
      <div class="mv-tabs">
        <button class="mv-tab sel" data-dir="out">Jaa Raha Hai &#8594;</button>
        <button class="mv-tab" data-dir="in">&#8592; Aa Raha Hai</button>
      </div>
      <div class="card formcard wmform" id="tripForm" data-wm="KACHCHA">
        <div class="card-eyebrow" style="margin-bottom:16px" id="tpTitle">New Carrier Trip — dono taraf ka plan</div>
        <div class="fgrid">
          <div class="field" style="margin:0"><label>Delivery partner</label><select id="tpWho"></select></div>
          <div class="field" style="margin:0"><label>Trip date</label><input id="tpDate" class="datefield" readonly placeholder="Tap — calendar khulega"></div>
          <div class="field" style="margin:0"><label>Weight needed (kg)</label><input type="number" id="tpKg" value="50" inputmode="numeric"></div>
          <div class="field" style="margin:0"><label>Flight no. (TG-314…)</label><div style="display:flex;gap:9px;align-items:center"><input id="tpFl" placeholder="TG-314" style="flex:1"><span id="tpPrev"></span></div></div>
          <div class="field" style="margin:0"><label>SOMANY carry ($)</label><input id="tpUsd" type="number" inputmode="numeric" placeholder="0"></div>
          <div class="field" style="margin:0"><label>Wapsi — SAMAAN (gm)</label><input id="tpGold" type="number" inputmode="numeric" placeholder="500"></div>
          <div class="field" style="margin:0"><label>Wapsi — Thai goods (kg)</label><input id="tpThai" type="number" inputmode="numeric" placeholder="0"></div>
          <div class="field" style="margin:0"><label>Note</label><input id="tpNote" placeholder="optional"></div>
          <button class="btn primary" id="tpGo" style="height:50px">Plan Trip ✓</button>
        </div>
        <div class="gsthint" id="tpPartnerInfo" style="margin-top:10px">Partner chunte hi uska rate yahan aayega · flight likhte hi tail-fin banegi · tracking API ready</div>
      </div>
      <button class="btn primary" id="btnNewTrip" style="margin-bottom:14px">+ New Trip</button>
      <div id="mvList"></div>
    </section>

    <!-- ============ LEDGER ============ -->
    <section class="view" id="v-hisaab">
      <div class="page-eyebrow">Khata</div>
      <h1 class="page-title">Ledger</h1>
      <div class="page-sub"><span>Tap a party &#8594; full khata opens</span><span class="dot"></span><span>INR + THB saath-saath</span></div>
      <div class="hairline"></div>
      <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">
        <input id="lgSearch" placeholder="Search party&#8230;" style="flex:1;min-width:170px;background:rgba(255,255,255,.05);border:1px solid var(--line);border-radius:13px;padding:12px 15px;color:var(--ink);font-family:var(--font-m);font-size:13px;outline:none">
      </div>
      <div id="lgList"></div>
    </section>

    <section class="view" id="v-warehouse">
      <div class="page-eyebrow">Stock &amp; Treasury</div>
      <h1 class="page-title">Warehouse</h1>
      <div class="page-sub"><span id="whSub">—</span></div>
      <div class="hairline"></div>
      <div style="font-size:10.5px;letter-spacing:1.6px;color:var(--muted);font-weight:800;margin-bottom:8px">MAAL PIPELINE — LIVE</div>
      <div class="pipe" id="whPipe"></div>
      <div class="whgrid" id="whGrid"></div>
      <div class="wtab mv-tabs" id="whTabs" style="margin-bottom:12px">
        <button class="mv-tab sel" data-wt="items">Items · racks</button>
        <button class="mv-tab" data-wt="bags">Packed bags</button>
        <button class="mv-tab" data-wt="treasury">Treasury</button>
      </div>
      <div id="whBody"></div>
      <div class="card" id="parcelCard">
          <div class="card-head"><span class="card-eyebrow">Bangkok Inbound — import parcels</span><span class="pill p-wait" id="bkkKg" style="margin-left:auto">0 kg</span></div>
          <div id="parcelList"></div>
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
      <div class="page-eyebrow">Maal</div>
      <h1 class="page-title">Catalog</h1>
      <div class="page-sub"><span><b id="catCount">0</b> items</span><span class="dot"></span><span>Photo-first &#183; yahi items invoice aur shipment mein uthenge</span></div>
      <div class="hairline"></div>
      <div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap">
        <button class="btn primary" id="btnNewItem">+ Item</button>
        <input id="catSearch" placeholder="Item dhundho…" style="flex:1;min-width:150px;background:rgba(255,255,255,.05);border:1px solid var(--line);border-radius:13px;padding:11px 15px;color:var(--ink);font-family:var(--font-m);font-size:13px;outline:none">
      </div>
      <div class="catbar pchips" id="catChips"></div>
      <div class="card formcard wmform" id="itemForm" data-wm="KACHCHA">
        <div class="card-eyebrow" style="margin-bottom:16px">New Item</div>
        <div class="phpick" style="margin-bottom:14px">
          <div class="pv" id="itPv">&#128247;</div>
          <label class="btn" style="padding:10px 14px;font-size:12px;cursor:pointer">Choose photo<input type="file" id="itPhoto" accept="image/*" style="display:none"></label>
          <span style="font-size:11px;color:var(--muted)">Aage OPSI supplier ki WhatsApp/LINE photos se khud bharega</span>
        </div>
        <div class="fgrid">
          <div class="field" style="margin:0"><label>Item</label><input id="itName" placeholder="naam"></div>
          <div class="field" style="margin:0"><label>Category</label><select id="itCat"><option>Garments</option><option>Fabric</option><option>Bedding</option><option>Bags</option><option>Thai goods</option><option>Accessories</option></select></div>
          <div class="field" style="margin:0"><label>Qty</label><input id="itQty" type="number" inputmode="numeric" placeholder="0"></div>
          <div class="field" style="margin:0"><label>Rate &#8377;</label><input id="itRate" type="number" inputmode="numeric" placeholder="0"></div>
          <div class="field" style="margin:0"><label>Location</label><input id="itLoc" placeholder="WH1 &#183; S1 &#183; R1 &#183; Sh1"></div>
          <button class="btn primary" id="itSave" style="height:50px">Save</button>
        </div>
      </div>
      <div class="catgrid" id="catGrid"></div>
    </section>

    <!-- ============ QUOTE ============ -->
    <section class="view" id="v-quote">
      <div class="page-eyebrow">Sauda</div>
      <h1 class="page-title">OPSI Rate Engine</h1>
      <div class="page-sub"><span>THB &#8594; INR aur INR &#8594; THB — dono taraf ke live quotes</span><span class="dot"></span><span>Yahi rate poore app mein suggest hota hai</span></div>
      <div class="hairline"></div>
      <div id="reWrap">
        <div class="marginbox"><span style="font-size:12.5px">Mera margin:</span><input id="reMargin" type="number" step="0.1" inputmode="decimal"><span style="font-family:var(--font-m);font-weight:800">%</span>
          <span style="font-size:11.5px;color:var(--muted)">amount:</span><input id="reAmt" type="number" inputmode="numeric" value="100000" style="width:110px"><span style="font-family:var(--font-m)">&#3647;</span>
          <span style="margin-left:auto;font-size:11px;color:var(--muted)">SAMAAN + SOMANY cycle se live · rate engine har jagah yahi bhejega</span></div>
        <div class="rateduo">
          <div class="ratec buy"><div class="dirlbl">&#8595; THB MIL RAHI HAI — customer THB de raha, INR maang raha</div>
            <div class="big" id="reBuyRate">&#8377;0.000</div><div class="sub" id="reBuySub">—</div><div class="pr" id="reBuyPr" style="color:#6ee7b7">—</div></div>
          <div class="ratec sell"><div class="dirlbl">&#8593; THB DENI HAI — customer INR de raha, Bangkok mein THB maang raha</div>
            <div class="big" id="reSellRate">&#8377;0.000</div><div class="sub" id="reSellSub">—</div><div class="pr" id="reSellPr" style="color:#fde68a">—</div></div>
        </div>
        <div class="card" style="padding:16px 20px;margin-top:14px;font-size:13px;color:var(--muted);line-height:1.7">
          <b style="color:var(--ink)">Usool:</b> jo currency MIL rahi hai uska rate asli keemat se <b style="color:var(--green)">neeche</b>, jo DENI hai uska <b style="color:#f0c46c">upar</b> — profit dono taraf. Ulta quote OPSI har jagah rokega.
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
    <button id="sugHisaab">"<b>Lalit ka hisaab</b> kaisa hai?"</button>
    <button data-goto="trips" data-toast="OPSI: aaj ki trips dikha raha hoon…">"Aaj ki <b>trips</b> dikhao"</button>
    <button data-goto="rates" data-toast="OPSI: live rates par le ja raha hoon…">"<b>Gold ka bhaav</b> kya chal raha hai?"</button>
    <button id="sugReceipt">"Somchai ka <b>kachcha receipt</b> banao"</button>
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
<div id="sheetVeil"></div>
<div id="moreSheet">
  <div class="grab"></div>
  <div class="sheet-grid">
    <button class="sheet-item" data-goto="parties"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>Parties</button>
    <button class="sheet-item" data-goto="invoices"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/></svg>Invoices</button>
    <button class="sheet-item" data-goto="shipments"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/></svg>Shipments</button>
    <button class="sheet-item" data-goto="catalog"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2l8 4.5v9L12 20l-8-4.5v-9z"/><path d="M12 11L4 6.5M12 11l8-4.5M12 11v9"/></svg>Catalog</button>
    <button class="sheet-item" data-goto="warehouse"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 21V8l9-5 9 5v13"/><path d="M3 21h18"/><path d="M7 21v-8h10v8"/></svg>Warehouse</button>
    <button class="sheet-item" data-goto="quote"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8"/><path d="M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h.01M12 19h4"/></svg>Quote</button>
    <button class="sheet-item" data-goto="rates"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>Rates</button>
    <button class="sheet-item" data-goto="books"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>Books</button>
    <button class="sheet-item" data-goto="reports"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 21h18"/><rect x="5" y="12" width="3" height="6" rx="1"/><rect x="10.5" y="8" width="3" height="10" rx="1"/><rect x="16" y="4" width="3" height="14" rx="1"/></svg>Reports</button>
    <button class="sheet-item" data-goto="sikhein"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/></svg>Sikhein</button>
    <button class="sheet-item" data-goto="settings"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"/></svg>Settings</button>
    <button class="sheet-item" id="sheetTheme"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22"/></svg>Theme</button>
  </div>
</div>
<nav id="dock">
  <button class="dock-item active" data-view="dashboard"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>Home</button>
  <button class="dock-item" data-view="trips"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>Moves</button>
  <button id="dockOrb" title="OPSI">
    <svg class="lop-mark lop-alive" viewBox="0 0 100 100" aria-hidden="true">
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
  </button>
  <button class="dock-item" data-view="hisaab"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z"/></svg>Ledger</button>
  <button class="dock-item" id="dockMore"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>More</button>
</nav>
<div id="opsiFly">
  <svg class="lop-mark" viewBox="0 0 100 100" aria-hidden="true">
    <path class="ring" d="M 62.3 16.2 A 36 36 0 0 1 68 81.2"/>
    <path class="ring" d="M 43.8 85.4 A 36 36 0 0 1 37.7 16.2"/>
    <path class="tail" d="M 47 84 L 51 99 L 63 79 Z"/>
    <path class="band" d="M 11 50 A 39 39 0 0 1 89 50"/>
    <rect class="cup" x="5" y="42" width="10" height="18" rx="5"/>
    <rect class="cup" x="85" y="42" width="10" height="18" rx="5"/>
    <circle class="eye" cx="39" cy="53" r="6.5"/>
    <circle class="eye r" cx="61" cy="53" r="6.5"/>
  </svg>
</div>
<div id="pdOverlay"></div>
<div id="dtlOverlay"></div>
<div id="sendSheet"><div class="sh" id="ssInner"></div></div>
<div id="lgOverlay">
  <div class="pd-top"><button class="back" id="lgBack">&#8592;</button>
    <div style="flex:1;min-width:0"><h2 id="lgName" style="font-family:var(--font-d);font-size:21px">&#8212;</h2><div class="sub" id="lgMeta" style="font-size:12px;color:var(--muted)">&#8212;</div></div>
    <select id="ledParty" style="max-width:190px"></select>
  </div>
  <div class="lg-hero">
    <div><div class="big" id="lgHero">&#8377;0</div><div class="sub"><b id="lgHeroName">&#8212;</b> &#183; <span id="lgHeroDir">Aapko lena hai</span></div></div>
    <div class="duo">
      <div class="bx"><div class="c">&#8377; INR</div><div class="v" id="lgBalI">&#8377;0</div></div>
      <div class="bx"><div class="c">&#3647; THB</div><div class="v" id="lgBalT">&#3647;0</div></div>
    </div>
  </div>
  <div class="pd-grid">
    <div class="card b6" style="margin:0">
      <div class="card-head"><span class="card-eyebrow">New Entry</span></div>
      <div class="lg-composer">
        <div class="seg">
          <button class="segbtn sel-in" data-lg="mila">&#8595; Mila</button>
          <button class="segbtn" data-lg="diya">&#8593; Diya</button>
          <button class="segbtn" data-lg="conv">&#8646; Convert</button>
        </div>
        <div class="fgrid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px">
          <div class="field" style="margin:0"><label>Currency</label><select id="lgCur"><option value="INR">&#8377; INR</option><option value="THB">&#3647; THB</option></select></div>
          <div class="field" style="margin:0"><label>Amount</label><input id="lgAmt" type="number" inputmode="numeric" placeholder="0"></div>
          <div class="field" style="margin:0"><label>Note</label><input id="lgNote" placeholder="kis baat ka"></div>
          <button class="btn primary" id="lgSave" style="height:48px">Save</button>
        </div>
        <div class="convbox" id="convBox">
          <div class="row"><span>THB mila</span><b id="cvThb">&#3647;0</b></div>
          <div class="row"><span>Transfer rate <small style="color:var(--muted)" id="cvLast"></small></span><b><input id="cvRate" type="number" step="0.001" inputmode="decimal" style="width:90px;background:rgba(255,255,255,.06);border:1px solid var(--line);border-radius:9px;padding:6px 9px;color:var(--ink);font-family:var(--font-m);text-align:right"></b></div>
          <div class="row"><span>INR dena banega</span><b id="cvInr" style="color:var(--acc1);font-size:15px">&#8377;0</b></div>
          <div class="row"><span>Aapka margin (live &#8377;2.93 par)</span><b class="prof" id="cvProf">&#8212;</b></div>
          <div id="cvGuard" style="display:none;color:var(--red);font-weight:800;font-size:12px;margin-top:6px">&#9888; Rate ulta lag raha hai &#8212; isme LOSS hai. Dobara dekhein.</div>
        </div>
      </div>
    </div>
    <div class="card b6" style="margin:0">
      <div class="card-head"><span class="card-eyebrow">Custody &#8212; kiske haath mein</span></div>
      <div id="lgCustody"></div>
      <div class="card-head" style="margin-top:16px"><span class="card-eyebrow">PDF Bhejo &#8212; Smart Range</span></div>
      <div class="opsi-sug" style="display:grid;gap:8px">
        <button data-toast="PDF: last bheja hua + nayi entries &#8212; demo">Last bheja hua + <b style="color:var(--cyan)">nayi entries</b> (recommended)</button>
        <button data-toast="PDF: poora FY &#8212; demo">Poora FY 2026&#8211;27</button>
        <button data-toast="PDF: last month &#8212; demo">Last month</button>
      </div>
    </div>
    <div class="card b12" style="margin:0">
      <div class="card-head"><span class="card-eyebrow">Entries</span></div>
      <div id="ledgerRows"></div>
    </div>
  </div>
</div>
<div id="packBoard"><div class="pb" id="pbInner"></div></div>
<div id="printPop"><button class="btn primary close" id="printClose">Band karo</button><div class="sheet" id="printSheet"></div></div>
<div id="confirmPop">
  <div class="box">
    <div class="card-eyebrow" style="margin-bottom:8px">PAKKA BILL — CONFIRM</div>
    <div class="co" id="cfCo">Singh Exports</div>
    <div class="sum" id="cfSum"></div>
    <div class="row">
      <button class="no" id="cfNo">Nahi, ruko</button>
      <button class="yes" id="cfYes">Haan, save karo</button>
    </div>
  </div>
</div>
<div id="assignSheet">
  <h4 id="asTitle">Bag assign karein</h4>
  <div class="opsi-sug" id="asList"></div>
</div>
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
/* Haptics — semantic (native engine), duration-based vibration nahi */
const HAP_P={tap:[9],tick:[6],type:[3],toggle:[8,26,8],nav:[10,22,6],save:[12,40,14],confirm:[10,34,10],reject:[28,40,28],magic:[6,18,6,18,10],drag:[7],thump:[34],land:[16]};
const rawBuzz=p=>{try{if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify({t:'hap',p:Array.isArray(p)?p:[p]}))}catch(e){}
  try{if(navigator.vibrate)navigator.vibrate(p)}catch(e){}};
const hap=k=>rawBuzz(HAP_P[k]||[8]);
const buzz=v=>rawBuzz(v);

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
  hap('nav');
  if(view==='trips'||view==='dashboard')setTimeout(animateFlights,120);
}
nav.addEventListener('click',e=>{const b=e.target.closest('.nav-item');if(b)go(b.dataset.view)});
document.addEventListener('click',e=>{const g=e.target.closest('[data-goto]');if(g)go(g.dataset.goto)});
requestAnimationFrame(()=>moveGlow($('.nav-item.active')));
addEventListener('resize',()=>moveGlow($('.nav-item.active')),{passive:true});

/* ---------- BOOK ENGINE — kachcha / Singh Exports / Awadh ---------- */
const CO_NAMES={singh:'Singh Exports',awadh:'Awadh Enterprise'};
function bookKey(){return BOOK.mode==='cash'?'kachcha':BOOK.co}
function bookLabel(){return BOOK.mode==='cash'?'KACHCHA':(CO_NAMES[BOOK.co].toUpperCase()+' \u00B7 PAKKA')}
function setBook(mode,co,silent){
  BOOK.mode=mode;BOOK.co=co||BOOK.co;DB.book=BOOK;saveDB();
  document.documentElement.dataset.book=bookKey();
  const badge=$('#bookBadge');
  if(badge)badge.textContent=bookLabel();
  $$('.mode-wrap').forEach(function(w){
    w.dataset.mode=(mode==='cash'?'cash':'business');
    w.querySelectorAll('.mode-btn').forEach(function(x){x.classList.toggle('sel',x.dataset.mode===(mode==='cash'?'cash':'business'))});
  });
  $$('.co-btn').forEach(function(x){x.classList.toggle('sel',x.dataset.co===BOOK.co)});
  $$('.wmform').forEach(function(f){f.dataset.wm=(mode==='cash'?'KACHCHA':CO_NAMES[BOOK.co].toUpperCase())});
  const g=$('#invGst');if(g){g.style.display=(mode==='cash'?'none':'block');const gc=$('#invGstCo');if(gc)gc.textContent=CO_NAMES[BOOK.co]}
  const qt=$('#invTitle');if(qt)qt.textContent=(mode==='cash'?'New Kachcha Receipt':'Naya Pakka Invoice \u2014 '+CO_NAMES[BOOK.co]);try{renderAll()}catch(e){}
  if(!silent){
    hap('toggle');
    toast(mode==='cash'?'Kachcha khata \u2014 quick save, no GST':CO_NAMES[BOOK.co]+' \u2014 Pakka \u00B7 GST \u00B7 confirm zaroori');
  }
}
document.addEventListener('click',function(e){
  const mb=e.target.closest('.mode-btn');
  if(mb){setBook(mb.dataset.mode==='cash'?'cash':'business',BOOK.co);return}
  const cb=e.target.closest('.co-btn');
  if(cb){setBook('business',(BOOK.mode!=='cash'&&BOOK.co===cb.dataset.co)?'both':cb.dataset.co)}
});

/* ---------- Theme ---------- */
$('#themeBtn').addEventListener('click',()=>{
  const r=document.documentElement;
  r.dataset.theme=r.dataset.theme==='dark'?'light':'dark';
  hap('toggle');
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

/* ---------- Boot v60 cinema (module niche define hota hai — hoisted) ---------- */
setTimeout(function(){try{runBootCinema()}catch(e){var bt=$('#boot');if(bt)bt.style.display='none';typeBrief()}},60);
$('#briefReplay').addEventListener('click',()=>{buzz(10);typeBrief()});

/* ============================================================
   v57 — ENGINE v3 · poora operation, 300+ seeded entries
   ============================================================ */
const DB_KEY='logiop_db_v4';
const PARTY_COLORS=['#8b5cf6','#22d3ee','#f472b6','#34d399','#f0c46c','#60a5fa','#fb7185','#a3e635'];
const GOLD_IN=11899, GOLD_BUYRATE_LIVE=2.93;
function rng(seed){let x=seed;return function(){x=(x*1103515245+12345)%2147483648;return x/2147483648}}
function seedDB(){
  const R=rng(42);
  const pick=a=>a[Math.floor(R()*a.length)];
  const ri=(a,b)=>a+Math.floor(R()*(b-a+1));
  const D=(off)=>{const dt=new Date(2026,7,16);dt.setDate(dt.getDate()-off);return dt};
  const iso=dt=>dt.toISOString().slice(0,10);
  const dsh=dt=>dt.toLocaleDateString('en-IN',{day:'numeric',month:'short'});
  const db={v:3,book:{mode:'cash',co:'singh'},seq:{kch:447,se:131,aw:61,shp:221,bag:118,mv:31,pc:71,lg:1},
    parties:[],catalog:[],invoices:[],ships:[],bags:[],moves:[],ledger:[],parcels:[],lots:[],usd:[],custody:[],
    wh:[
      {id:'WH1',n:'Warehouse 1',city:'Paharganj, Delhi',fill:78,sections:4},
      {id:'WH2',n:'Warehouse 2',city:'Karol Bagh, Delhi',fill:52,sections:3},
      {id:'WH3',n:'Warehouse 3',city:'Sadar, Delhi',fill:31,sections:2},
      {id:'JAI',n:'Jaipur Godown',city:'Jaipur',fill:44,sections:2},
      {id:'KOL',n:'Kolkata Point',city:'Kolkata',fill:18,sections:1},
      {id:'BKK',n:'Bangkok Store',city:'Sukhumvit, Bangkok',fill:37,sections:1}
    ]};
  /* ---- parties ---- */
  let pid=1;
  const P=(o)=>{o.id='P'+(pid++);o.balK=o.balK||{inr:0,thb:0};o.balP=o.balP||{inr:0,thb:0};
    o.books=o.books||{k:true,p:false};o.last=o.last||{};db.parties.push(o);return o};
  const parents=[
    ['Lalit Traders','Bangkok','Thailand','+66 81 234 5501','lalit.bkk'],
    ['Somchai Fabrics','Bangkok','Thailand','+66 89 555 2210','somchai_fab'],
    ['Niran House','Bangkok','Thailand','+66 92 118 7743','niranhouse'],
    ['Anan Import','Pattaya','Thailand','+66 84 909 1287','anan.imp'],
    ['Prasert Silk','Bangkok','Thailand','+66 61 442 9098','prasertsilk'],
    ['Kanya Boutique','Chiang Mai','Thailand','+66 93 771 5522','kanya.cnx'],
    ['Wong Trading','Kuala Lumpur','Malaysia','+60 12 330 8811',''],
    ['Meesha Overseas','Sydney','Australia','+61 4 2211 8890','']
  ];
  const endNames=['Nok Shop','Ploy Store','Bee Fashion','Dow Garments','Fon Boutique','Mali Textiles','Som Style','Gift House','Aom Collection','Ying Fabrics','Tuk Shop','Jib Store','Noon Fashion','Pim Boutique','May Garments','Waan Shop','Chompoo Store','Namfon Style','Kwan Textiles','Preaw Shop','Golf Trading','Oat Fashion','Bank Store','Nan Boutique','Petch Garments','Toey Shop','Mook Style','Fern Collection'];
  const parentIds=[];
  parents.forEach((pp,i)=>{const par=P({n:pp[0],type:'parent',city:pp[1],country:pp[2],phone:pp[3],line:pp[4],lang:pp[2]==='Thailand'?'Thai':'English',ri:ri(195,228),rt:ri(86,98),books:{k:true,p:i%3===0},balK:{inr:ri(-30,90)*1000,thb:ri(-40,120)*100},balP:i%3===0?{inr:ri(-90,140)*1000,thb:0}:{inr:0,thb:0},pin:{x:ri(18,82),y:ri(22,74)}});parentIds.push(par.id)});
  let ei=0;
  parentIds.forEach((prId,i)=>{const n=ri(3,4);for(let k=0;k<n&&ei<endNames.length;k++){P({n:endNames[ei++],type:'end',parentId:prId,city:pick(['Bangkok','Bangkok','Pattaya','Chiang Mai']),country:'Thailand',phone:'+66 9'+ri(0,9)+' '+ri(100,999)+' '+ri(1000,9999),line:'',lang:'Thai',ri:0,rt:0,pin:{x:ri(15,85),y:ri(20,78)}})}});
  const directs=[['R.K. Garments','Delhi','India','Hindi'],['Sharma Textiles','Delhi','India','Hindi'],['Meera Creations','Jaipur','India','Hindi'],['Basu & Sons','Kolkata','India','Bangla'],['Karthik Exports','Chennai','India','Tamil'],['Thip Fashion','Bangkok','Thailand','Thai'],['Orchid Wear','Bangkok','Thailand','Thai'],['Chen Textiles','Guangzhou','China','Chinese'],['Amara Fashion','Melbourne','Australia','English'],['Nadia Boutique','Kuala Lumpur','Malaysia','English']];
  directs.forEach((dd,i)=>{P({n:dd[0],type:'direct',city:dd[1],country:dd[2],lang:dd[3],phone:dd[2]==='India'?'+91 98'+ri(100,999)+' '+ri(10000,99999):'+66 8'+ri(0,9)+' '+ri(100,999)+' '+ri(1000,9999),line:dd[2]==='Thailand'?dd[0].split(' ')[0].toLowerCase():'',ri:ri(198,232),rt:ri(88,99),books:{k:i%2===0,p:i%2===1||i<3},gstin:dd[2]==='India'&&i%2===1?('07AA'+String.fromCharCode(65+i)+'CS'+ri(1000,9999)+'K1Z'+i):'' ,balK:{inr:ri(-20,60)*1000,thb:0},balP:{inr:ri(-80,120)*1000,thb:0},pin:{x:ri(18,82),y:ri(22,74)}})});
  const carriers=[['Ramesh bhai','+91 98110 22334'],['Vikas','+91 99530 88771'],['Suresh','+91 98735 44120'],['Mahesh ji','+91 97173 90218']];
  carriers.forEach(c=>{P({n:c[0],type:'carrier',city:'Delhi',country:'India',lang:'Hindi',phone:c[1],ri:0,rt:0,cc:200,last:{cc:{v:200,d:'10 Aug'}}})});
  const sups=[['Jaipur Prints Co.','Jaipur'],['Rajasthan Fabrics','Jaipur'],['Sanganer Textiles','Jaipur'],['Bagru Handblock','Jaipur'],['Delhi Cotton House','Delhi']];
  sups.forEach(sn=>{P({n:sn[0],type:'supplier',city:sn[1],country:'India',lang:'Hindi',phone:'+91 94'+ri(100,999)+' '+ri(10000,99999),ri:0,rt:0})});
  /* ---- catalog ---- */
  const CATS=[
    ['Bed sheets (cotton)','Bedding','🛏️',480,'WH1 · S2 · R4',800,['#8b5cf6','#22d3ee']],
    ['Bed sheets (jaipuri print)','Bedding','🛏️',260,'WH1 · S2 · R5',950,['#f472b6','#8b5cf6']],
    ['Cotton bags (printed)','Bags','👜',1250,'WH1 · S1 · R2',150,['#34d399','#22d3ee']],
    ['Cotton bags (plain)','Bags','👜',900,'WH1 · S1 · R3',110,['#60a5fa','#34d399']],
    ['Jute bags','Bags','🧺',420,'WH2 · S1 · R1',180,['#f0c46c','#fb7185']],
    ['Tops (mixed sizes)','Garments','👚',340,'WH2 · S3 · R1',600,['#fb7185','#f472b6']],
    ['Skirts (rayon)','Garments','👗',260,'WH2 · S1 · R5',500,['#a3e635','#34d399']],
    ['Short pants','Garments','🩳',410,'WH1 · S4 · R3',400,['#22d3ee','#60a5fa']],
    ['Kurtis (printed)','Garments','👘',380,'WH2 · S2 · R2',550,['#f472b6','#f0c46c']],
    ['Palazzo sets','Garments','👖',220,'WH2 · S2 · R4',700,['#8b5cf6','#f472b6']],
    ['Scarves (silk mix)','Accessories','🧣',560,'WH3 · S1 · R1',250,['#fb7185','#f0c46c']],
    ['Fabric rolls (jaipuri)','Fabric','🧵',96,'WH3 · S1 · R2',3000,['#60a5fa','#8b5cf6']],
    ['Fabric rolls (cotton)','Fabric','🧵',140,'JAI · S1 · R1',2600,['#34d399','#a3e635']],
    ['Block-print dupatta','Fabric','🧣',310,'JAI · S1 · R2',350,['#f0c46c','#f472b6']],
    ['Cushion covers','Bedding','🛋️',480,'WH1 · S3 · R1',220,['#22d3ee','#8b5cf6']],
    ['Table runners','Bedding','🍽️',260,'WH3 · S2 · R1',280,['#a3e635','#22d3ee']],
    ['Thai balm (wapsi maal)','Thai goods','🫙',180,'WH1 · S2 · R6',300,['#34d399','#f0c46c']],
    ['Thai snacks box','Thai goods','🍘',95,'BKK · S1 · R1',450,['#fb7185','#a3e635']],
    ['Thai herbal soap','Thai goods','🧼',240,'BKK · S1 · R2',120,['#60a5fa','#34d399']],
    ['Anklets (oxidised)','Accessories','📿',700,'WH3 · S1 · R3',90,['#f472b6','#60a5fa']],
    ['Jhumka sets','Accessories','💠',520,'WH3 · S1 · R4',140,['#f0c46c','#8b5cf6']],
    ['Stoles (pashmina mix)','Accessories','🧣',180,'WH2 · S3 · R3',480,['#8b5cf6','#34d399']]
  ];
  CATS.forEach((c,i)=>{db.catalog.push({id:'IT'+(i+1),n:c[0],cat:c[1],emoji:c[2],qty:c[3],loc:c[4],rate:c[5],g:c[6],photo:null,book:i%4===1?'p':'k',vars:ri(2,5)})});
  /* ---- invoices + ledger (46) ---- */
  const kParties=db.parties.filter(x=>(x.type==='parent'||x.type==='direct')&&x.books.k);
  const pParties=db.parties.filter(x=>(x.type==='parent'||x.type==='direct')&&x.books.p);
  const UNITS={Garments:'pc',Bags:'pc',Bedding:'pc',Fabric:'mtr',Accessories:'pc','Thai goods':'pc'};
  function mkInv(off,biz){
    const par=biz?pick(pParties):pick(kParties);
    const nl=ri(1,4),lines=[];let sub=0;
    for(let i=0;i<nl;i++){const it=pick(db.catalog);const q=ri(2,14)*10;const r=it.rate+ri(-20,30);lines.push({item:it.n,qty:q,unit:UNITS[it.cat]||'pc',rate:r});sub+=q*r}
    const kg=ri(8,60);const fr=Math.round(kg*(par.ri||210));
    const gst=biz?Math.round((sub+fr)*0.05):0;const total=sub+fr+gst;
    const co=biz?(R()<0.6?'singh':'awadh'):'';
    let id;if(!biz)id='KCH-0'+(db.seq.kch++);else if(co==='singh')id='SE-2026-'+(db.seq.se++);else id='AW-2026-0'+(db.seq.aw++);
    const dt=D(off);
    const st=off<3?['p-wait','DUE']:(R()<0.8?['p-live','PAID']:['p-wait','DUE']);
    db.invoices.push({id:id,book:biz?'p':'k',co:co,party:par.n,d:dsh(dt),ds:iso(dt),lines:lines,kg:kg,fr:fr,gst:gst,total:total,cur:'INR',stl:st[0],st:st[1],shp:''});
    db.ledger.push({id:'L'+(db.seq.lg++),party:par.n,book:biz?'p':'k',d:dsh(dt),ds:iso(dt),neg:false,inr:total,thb:0,txt:(biz?(co==='singh'?'Singh Exports':'Awadh Ent.')+' invoice ':'Kachcha receipt ')+id});
    if(st[1]==='PAID'&&R()<0.7){db.ledger.push({id:'L'+(db.seq.lg++),party:par.n,book:biz?'p':'k',d:dsh(D(off-1)),ds:iso(D(off-1)),neg:true,inr:total,thb:0,txt:'Payment mila — '+id})}
    return id;
  }
  for(let i=0;i<32;i++)mkInv(ri(0,54),false);
  for(let i=0;i<14;i++)mkInv(ri(0,54),true);
  /* THB receipts + conversions (Lalit flow) */
  for(let i=0;i<12;i++){const par=pick(db.parties.filter(x=>x.type==='parent'&&x.country==='Thailand'));
    const off=ri(0,40);const thb=ri(3,26)*500;const dt=D(off);
    db.ledger.push({id:'L'+(db.seq.lg++),party:par.n,book:'k',d:dsh(dt),ds:iso(dt),neg:true,inr:0,thb:thb,txt:'End customer se THB mila ('+par.n.split(' ')[0]+' ke liye)'});
    if(R()<0.75){const rate=2.83+R()*0.03;const inr=Math.round(thb*rate);
      db.ledger.push({id:'L'+(db.seq.lg++),party:par.n,book:'k',d:dsh(D(off-1)),ds:iso(D(off-1)),neg:false,inr:0,thb:thb,txt:'Convert @'+rate.toFixed(3)+' — settle'});
      db.ledger.push({id:'L'+(db.seq.lg++),party:par.n,book:'k',d:dsh(D(off-1)),ds:iso(D(off-1)),neg:true,inr:inr,thb:0,txt:'INR cash diya (transfer @'+rate.toFixed(3)+')'});
      par.last.tr={v:+rate.toFixed(3),d:dsh(D(off-1))};
    }}
  /* freight adjusts + payouts */
  for(let i=0;i<10;i++){const par=pick(kParties);const off=ri(2,50);const dt=D(off);
    db.ledger.push({id:'L'+(db.seq.lg++),party:par.n,book:'k',d:dsh(dt),ds:iso(dt),neg:R()<0.5,inr:ri(2,18)*500,thb:0,txt:pick(['Freight adjust','Transfer payout (Delhi)','Purana baaki clear','Advance mila'])})}
  db.ledger.sort((a,b)=>a.ds<b.ds?1:-1);

  /* ---- ships + bags (14 ships, ~58 bags) ---- */
  const ends=db.parties.filter(x=>x.type==='end');
  function endsOf(prId){return ends.filter(e=>e.parentId===prId)}
  function mkShip(off,status,carrier){
    const dt=D(off);const id='SHP-'+(db.seq.shp++);
    const nb=ri(3,6);const bagIds=[];let kg=0;const parsUsed={};
    for(let i=0;i<nb;i++){
      const direct=R()<0.35;let parent='',end='',owner;
      if(direct){owner=pick(db.parties.filter(x=>x.type==='direct'));end=owner.n}
      else{const pr=pick(db.parties.filter(x=>x.type==='parent'));parent=pr.n;const es=endsOf(pr.id);end=es.length?pick(es).n:pr.n;owner=pr}
      const bkg=ri(24,42);kg+=bkg;
      const its=[];const ni=ri(1,3);
      for(let j=0;j<ni;j++){const it=pick(db.catalog);its.push({n:it.n,qty:ri(2,12)*10,unit:'pc'})}
      const bid='BAG-'+(db.seq.bag++);
      db.bags.push({id:bid,shp:id,parent:parent,end:end,direct:direct,kg:bkg,items:its,who:carrier||''});
      bagIds.push(bid);parsUsed[parent||end]=1;
    }
    db.ships.push({id:id,book:'k',d:dsh(dt),ds:iso(dt),dest:'Bangkok',who:carrier||'',bags:bagIds,kg:kg,stl:status[0],st:status[1]});
    return {id:id,kg:kg,bags:bagIds.length};
  }
  const s1=mkShip(1,['p-live','IN TRANSIT'],'Ramesh bhai');
  const s2=mkShip(0,['p-wait','READY'],'Vikas');
  mkShip(0,['p-done','PACKING'],'');
  mkShip(2,['p-done','LOADED'],'Suresh');
  for(let i=0;i<10;i++){mkShip(ri(4,50),['p-live','DELIVERED'],pick(['Ramesh bhai','Vikas','Suresh','Mahesh ji']))}
  /* ---- moves ---- */
  const dtf=o=>{const d=D(o);return d.toLocaleDateString('en-IN',{day:'numeric',month:'short'})};
  db.moves=[
    {id:'MV-'+(db.seq.mv++),kind:'carrier',who:'Ramesh bhai',fl:'TG-314',ds:iso(D(0)),d:dtf(0),prog:62,st:'HAWA MEIN',stl:'p-live',out:{bags:s1.bags,kg:s1.kg,usd:4200,shp:s1.id},back:{gold:500,thai:62,kg:62},need:100,eta:'2h 05m baaki'},
    {id:'MV-'+(db.seq.mv++),kind:'carrier',who:'Vikas',fl:'6E-77',ds:iso(D(0)),d:dtf(0),prog:8,st:'BOARDING AAJ',stl:'p-wait',out:{bags:s2.bags,kg:s2.kg,usd:2800,shp:s2.id},back:{gold:0,thai:0,kg:0},need:80,eta:'raat ko udaan'},
    {id:'MV-'+(db.seq.mv++),kind:'carrier',who:'Suresh',fl:'',ds:iso(D(-3)),d:'19 Aug',prog:0,st:'PLANNED',stl:'p-done',out:{bags:[],kg:0,usd:0,shp:''},back:{gold:0,thai:0,kg:0},need:50,eta:'bags assign karo'},
    {id:'MV-'+(db.seq.mv++),kind:'carrier',who:'Mahesh ji',fl:'FD-121',ds:iso(D(2)),d:dtf(2),prog:100,st:'WAPSI — DELHI',stl:'p-live',out:{bags:[],kg:0,usd:0,shp:''},back:{gold:640,thai:48,kg:48},need:0,eta:'gold custody mein'},
    {id:'MV-'+(db.seq.mv++),kind:'aircargo',who:'Delhi Cargo Co.',fl:'AI-332',awb:'098-4471 8890',ds:iso(D(1)),d:dtf(1),prog:45,st:'IN AIR',stl:'p-live',out:{kg:220,desc:'Cotton bags ×1400 — Anan Import'},need:0,eta:'kal subah BKK'},
    {id:'MV-'+(db.seq.mv++),kind:'courier',who:'DHL Express',awb:'JD01 4472 1190',ds:iso(D(0)),d:dtf(0),prog:70,st:'BKK CUSTOMS',stl:'p-wait',out:{kg:18,desc:'Samples ×4 box — Wong Trading'},need:0,eta:'clearance mein'},
    {id:'MV-'+(db.seq.mv++),kind:'seacargo',who:'MSC Line',awb:'MSCU 884211-3',ds:iso(D(12)),d:dtf(12),prog:38,st:'AT SEA',stl:'p-live',out:{kg:2400,desc:'Fabric rolls ×96 — Meesha Overseas, Sydney'},need:0,eta:'ETA 2 Sep · Port Botany'},
    {id:'MV-'+(db.seq.mv++),kind:'carrier',who:'Ramesh bhai',fl:'TG-320',ds:iso(D(9)),d:dtf(9),prog:100,st:'COMPLETE',stl:'p-live',out:{bags:[],kg:97,usd:3600,shp:'SHP-214'},back:{gold:500,thai:30,kg:30},need:100,eta:'ho gaya'},
    {id:'MV-'+(db.seq.mv++),kind:'carrier',who:'Vikas',fl:'6E-71',ds:iso(D(16)),d:dtf(16),prog:100,st:'COMPLETE',stl:'p-live',out:{bags:[],kg:84,usd:2400,shp:'SHP-212'},back:{gold:700,thai:41,kg:41},need:90,eta:'ho gaya'}
  ];
  /* ---- parcels (Bangkok inbound, 14) ---- */
  const plat=['Lazada','Shopee','Makro','Lotus','Lazada','Shopee'];
  const pit=['Thai balm ×48','Herbal soap ×120','Snacks box ×24','Mama noodles ×90','Face masks ×60','Body lotion ×36','Thai tea packs ×50','Coconut oil ×24'];
  for(let i=0;i<14;i++){const off=ri(0,18);const st=off>10?'clubbed':(off>4?'received':(R()<0.7?'received':'ordered'));
    db.parcels.push({id:'PC-'+(db.seq.pc++),party:'Sharma Textiles',platform:pick(plat),order:'#'+ri(40000,99999),item:pick(pit),kg:ri(2,14),ds:iso(D(off)),d:dtf(off),st:st})}
  /* ---- gold lots + usd + custody ---- */
  db.lots=[
    {id:'G1',d:'12 Aug',who:'Ramesh bhai',gm:500,buy:11240,at:'Delhi WH1'},
    {id:'G2',d:'04 Aug',who:'Vikas',gm:640,buy:11610,at:'Delhi WH1'},
    {id:'G3',d:'28 Jul',who:'Ramesh bhai',gm:700,buy:12050,at:'Jaipur'},
    {id:'G4',d:'19 Jul',who:'Suresh',gm:300,buy:11180,at:'Delhi WH2'},
    {id:'G5',d:'08 Jul',who:'Vikas',gm:450,buy:10980,at:'Kolkata'}
  ];
  db.usd=[];
  db.custody=[
    {id:'C1',kind:'gold',qty:640,unit:'gm',holder:'Mahesh ji',since:'2 din',note:'Delhi aa gaya — aapke bolne par dega'},
    {id:'C2',kind:'usd',qty:4200,unit:'$',holder:'Ramesh bhai',since:'aaj',note:'flight mein — Super Rich ke liye'},
    {id:'C3',kind:'usd',qty:2800,unit:'$',holder:'Vikas',since:'aaj',note:'raat ki flight se jayega'}
  ];
  return db;
}
let DB;
try{const raw=JSON.parse(localStorage.getItem(DB_KEY));DB=(raw&&raw.v===4)?raw:seedExtra(seedDB())}catch(e){DB=seedExtra(seedDB())}
function saveDB(){try{localStorage.setItem(DB_KEY,JSON.stringify(DB))}catch(e){}}
let BOOK=DB.book||{mode:'cash',co:'singh'};
/* ---- helpers ---- */
const todayShort=()=>new Date().toLocaleDateString('en-IN',{day:'numeric',month:'short'});
const todayISO=()=>new Date().toISOString().slice(0,10);
const fINR=v=>(v<0?'-':'')+'\u20B9'+Math.abs(Math.round(v)).toLocaleString('en-IN');
const fTHB=v=>(v<0?'-':'')+'\u0E3F'+Math.abs(Math.round(v)).toLocaleString('en-IN');
const esc=t=>String(t).replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
function paIcon(n,i){return '<i style="background:linear-gradient(135deg,'+PARTY_COLORS[i%8]+','+PARTY_COLORS[(i+3)%8]+')">'+esc(String(n).split(' ').map(w=>w[0]).join('').slice(0,2))+'</i>'}
function partyByName(n){return DB.parties.find(x=>x.n===n)}
function bookKeyOf(){return BOOK.mode==='cash'?'k':'p'}
function balOf(p){return bookKeyOf()==='k'?p.balK:p.balP}
function curBookParties(){const bk=bookKeyOf();return DB.parties.filter(x=>(x.type==='parent'||x.type==='direct')&&x.books&&x.books[bk])}
function svgSpark(el,data,color){if(!el)return;const W=86,H=34,max=Math.max.apply(null,data),min=Math.min.apply(null,data);
  const X=i=>i/(data.length-1)*W, Y=v=>H-3-((v-min)/((max-min)||1))*(H-8);
  let d='M '+X(0)+' '+Y(data[0]);for(let i=1;i<data.length;i++){const mx=(X(i-1)+X(i))/2;d+=' C '+mx+' '+Y(data[i-1])+', '+mx+' '+Y(data[i])+', '+X(i)+' '+Y(data[i])}
  el.setAttribute('viewBox','0 0 '+W+' '+H);
  el.innerHTML='<path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="2" stroke-linecap="round" style="filter:drop-shadow(0 0 5px '+color+'99)"/>';
}

/* ---------- DASHBOARD ---------- */
function goldTotals(){let gm=0,cost=0;DB.lots.forEach(l=>{gm+=l.gm;cost+=l.gm*l.buy});
  const val=gm*GOLD_IN;return {gm:gm,cost:cost,val:val,pl:val-cost,plp:cost?((val-cost)/cost*100):0}}
function usdTotal(){return DB.usd.reduce((a,u)=>a+u.amt,0)}
function renderKPIs(){
  const bk=bookKeyOf();
  let lena=0,dena=0;
  DB.parties.forEach(p=>{const b=(bk==='k'?p.balK:p.balP);if(!b)return;
    if(b.inr>0)lena+=b.inr;else dena+=-b.inr;
    if(b.thb<0)dena+=-b.thb*2.85;else lena+=b.thb*2.85});
  const g=goldTotals();
  const ready=DB.bags.filter(b=>{const sh=DB.ships.find(x=>x.id===b.shp);return sh&&(sh.st==='PACKING'||sh.st==='READY')}).length;
  $('#kpiIn').innerHTML=fINR(lena);$('#kpiInSub').textContent=curBookParties().length+' parties se';
  $('#kpiOut').innerHTML=fINR(dena);$('#kpiOutSub').textContent='payouts + THB owed';
  $('#kpiTre').innerHTML=fINR(g.val+usdTotal()*88.24);
  $('#kpiTreSub').textContent=g.gm+' gm gold + $'+usdTotal().toLocaleString('en-IN');
  $('#kpiBags').textContent=ready;$('#kpiBagsSub').textContent=DB.ships.filter(x=>x.st==='READY'||x.st==='PACKING').length+' shipments open';
  svgSpark($('#sp1'),[42,48,45,55,52,61,58,66],'#34d399');
  svgSpark($('#sp2'),[30,36,33,41,38,35,42,39],'#fb5f6e');
  svgSpark($('#sp3'),[50,52,51,55,58,57,61,64],'#f0c46c');
  svgSpark($('#sp4'),[3,5,4,7,6,8,6,ready],'#22d3ee');
  const ds=$('#dsTrips');if(ds)ds.textContent=DB.moves.filter(m=>m.st==='HAWA MEIN'||m.st==='IN AIR'||m.st==='AT SEA').length;
  const db2=$('#dsBags');if(db2)db2.textContent=ready;
  const td=$('#todayStr');if(td)td.textContent=new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'short'});
}
/* corridor map */
function corrPt(t){const x0=14,y0=34,x1=86,y1=66,cx=50,cy=6;
  const x=(1-t)*(1-t)*x0+2*(1-t)*t*cx+t*t*x1;
  const y=(1-t)*(1-t)*y0+2*(1-t)*t*cy+t*t*y1;return [x,y]}
function renderCorridor(){
  const live=DB.moves.filter(m=>m.kind==='carrier'&&(m.st==='HAWA MEIN'||m.st==='BOARDING AAJ'||m.st==='WAPSI — DELHI'));
  let dots='';
  live.forEach((m,i)=>{const t=m.st==='WAPSI — DELHI'?1-(m.prog/100):(m.prog/100);const pt=corrPt(Math.max(.03,Math.min(.97,t)));
    const col=m.st==='WAPSI — DELHI'?'#f0c46c':'#22d3ee';
    dots+='<circle class="pl-dot" cx="'+pt[0]+'" cy="'+pt[1]+'" r="1.9" fill="'+col+'"/>';
    dots+='<text x="'+pt[0]+'" y="'+(pt[1]-3.4)+'" text-anchor="middle" style="font-size:3.4px;font-weight:800;fill:#dfe4ff;font-family:monospace">'+esc(m.who.split(' ')[0])+'</text>';
  });
  $('#corrMap').innerHTML='<svg viewBox="0 0 100 100" preserveAspectRatio="none">'+
    '<defs><linearGradient id="corrG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient></defs>'+
    '<path class="land" d="M4 18 Q14 8 22 14 Q30 10 28 24 Q34 34 26 44 Q30 56 20 60 Q10 58 8 46 Q2 34 4 18 Z"/>'+
    '<path class="land" d="M78 52 Q88 46 92 56 Q96 68 90 78 Q86 90 80 84 Q74 88 74 76 Q70 62 78 52 Z"/>'+
    '<path class="arc" d="M14 34 Q50 6 86 66"/>'+dots+
    '<circle cx="14" cy="34" r="1.7" fill="#8b5cf6"/><circle cx="86" cy="66" r="1.7" fill="#f472b6"/>'+
    '<text class="city" x="14" y="42" text-anchor="middle" style="font-size:4px">DEL/CCU</text>'+
    '<text class="city" x="86" y="74" text-anchor="middle" style="font-size:4px">BKK</text></svg>';
  $('#corrLegend').innerHTML=live.map(m=>'<span><b>'+esc(m.who)+'</b> \u00B7 '+(m.fl?esc(m.fl):'\u2014')+' \u00B7 '+esc(m.st)+' \u00B7 '+esc(m.eta)+'</span>').join('')||'<span>Abhi koi hawa mein nahi</span>';
  const cl=$('#corrLive');if(cl)cl.textContent=live.length+' LIVE';
}
/* treasury card */
function wormChart(el,buyAvg){if(!el)return;
  const W=el.clientWidth||320,H=el.clientHeight||110,pad=6;
  const seq=[11480,11510,11460,11590,11640,11600,11720,11780,11750,11830,11870,GOLD_IN];
  const min=Math.min.apply(null,seq.concat([buyAvg]))-40,max=Math.max.apply(null,seq.concat([buyAvg]))+40;
  const X=i=>pad+i/(seq.length-1)*(W-pad*2),Y=v=>H-8-((v-min)/(max-min))*(H-16);
  let d='M '+X(0)+' '+Y(seq[0]);
  for(let i=1;i<seq.length;i++){const mx=(X(i-1)+X(i))/2;d+=' C '+mx+' '+Y(seq[i-1])+', '+mx+' '+Y(seq[i])+', '+X(i)+' '+Y(seq[i])}
  const by=Y(buyAvg);
  el.setAttribute('viewBox','0 0 '+W+' '+H);
  el.innerHTML='<path d="'+d+' L '+X(seq.length-1)+' '+by+' L '+X(0)+' '+by+' Z" fill="'+(GOLD_IN>=buyAvg?'#34d399':'#fb5f6e')+'" opacity=".1"/>'+
    '<line x1="'+pad+'" y1="'+by+'" x2="'+(W-pad)+'" y2="'+by+'" stroke="#f0c46c" stroke-width="1" stroke-dasharray="4 4" opacity=".7"/>'+
    '<text x="'+(pad+2)+'" y="'+(by-4)+'" style="font-size:9px;fill:#f0c46c;font-family:monospace">aapki avg kharid</text>'+
    '<path d="'+d+'" fill="none" stroke="#f0c46c" stroke-width="2.4" stroke-linecap="round" style="filter:drop-shadow(0 0 7px rgba(240,196,108,.6))"/>'+
    '<circle cx="'+X(seq.length-1)+'" cy="'+Y(seq[seq.length-1])+'" r="3.4" fill="#f0c46c"/>';
}
function renderTreasury(){
  const g=goldTotals();const avg=g.gm?Math.round(g.cost/g.gm):0;
  $('#treGm').textContent=g.gm.toLocaleString('en-IN')+' gm';
  $('#treBuy').innerHTML='avg \u20B9'+avg.toLocaleString('en-IN')+' / gm \u00B7 aaj \u20B9'+GOLD_IN.toLocaleString('en-IN');
  $('#treVal').innerHTML=fINR(g.val);
  const pl=$('#trePL');pl.textContent=(g.pl>=0?'+':'')+fINR(g.pl)+' ('+g.plp.toFixed(1)+'%)';
  pl.className='tre-pl '+(g.pl>=0?'up':'down');
  $('#treUsd').textContent='USD stock: $'+usdTotal().toLocaleString('en-IN')+' \u00B7 '+DB.usd.length+' jagah';
  wormChart($('#goldWorm'),avg);
}
/* actions */
function renderActions(){
  const acts=[];
  DB.invoices.filter(i=>i.st==='DUE').slice(0,2).forEach(i=>acts.push({e:'\u23F3',bg:'rgba(240,196,108,.14)',t:'<b>'+i.id+'</b> \u2014 '+esc(i.party)+' se '+fINR(i.total)+' due hai',s:i.d,go:'invoices'}));
  DB.custody.forEach(c=>acts.push({e:c.kind==='gold'?'\uD83D\uDFE1':'\uD83D\uDCB5',bg:'rgba(240,196,108,.12)',t:'<b>'+(c.kind==='gold'?c.qty+' gm gold':'$'+c.qty.toLocaleString('en-IN'))+'</b> abhi <b>'+esc(c.holder)+'</b> ke paas',s:c.note,go:'trips'}));
  const bkkKg=DB.parcels.filter(p=>p.st==='received').reduce((a,p)=>a+p.kg,0);
  if(bkkKg>0)acts.push({e:'\uD83D\uDCE6',bg:'rgba(34,211,238,.12)',t:'Bangkok mein <b>'+bkkKg+' kg</b> parcels jama \u2014 '+(bkkKg>=100?'carrier ko dene laayak!':'abhi aur aane do'),s:DB.parcels.filter(p=>p.st==='received').length+' parcels received',go:'warehouse'});
  const pend=DB.parcels.filter(p=>p.st==='ordered');
  if(pend.length)acts.push({e:'\uD83D\uDD0D',bg:'rgba(251,95,110,.12)',t:'<b>'+pend.length+' orders</b> platform par hain, warehouse mein nahi dikhe',s:'check karo \u2014 claim window nikal na jaaye',go:'warehouse'});
  const pl=DB.moves.find(m=>m.st==='PLANNED');
  if(pl)acts.push({e:'\u2708\uFE0F',bg:'rgba(139,92,246,.14)',t:'<b>'+esc(pl.who)+'</b> ki trip '+pl.d+' ko \u2014 chahiye '+pl.need+' kg, abhi 0 assigned',s:'bags assign karo',go:'trips'});
  $('#actList').innerHTML=acts.slice(0,6).map(a=>'<div class="act"><i style="background:'+a.bg+'">'+a.e+'</i><div class="t">'+a.t+'<small>'+esc(a.s)+'</small></div>'+
    '<button class="iconbtn go" data-goto="'+a.go+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg></button></div>').join('');
}
/* calendar */
let calY=2026,calM=7;
function calEvents(){
  const ev={};
  const add=(ds,txt,col)=>{if(!ds)return;(ev[ds]=ev[ds]||[]).push({t:txt,c:col})};
  DB.moves.forEach(m=>add(m.ds,(m.kind==='carrier'?'\u2708 ':'')+m.who+' \u00B7 '+m.st,m.kind==='carrier'?'#22d3ee':'#8b5cf6'));
  DB.ships.filter(s=>s.st!=='DELIVERED').forEach(s=>add(s.ds,s.id+' \u00B7 '+s.st+' \u00B7 '+s.kg+' kg','#f472b6'));
  DB.parcels.filter(p=>p.st==='ordered').forEach(p=>add(p.ds,p.platform+' '+p.order+' aane wala','#f0c46c'));
  return ev;
}
function renderCal(){
  const ev=calEvents();
  const first=new Date(calY,calM,1);const start=first.getDay();
  const days=new Date(calY,calM+1,0).getDate();
  $('#dcalTitle').textContent=first.toLocaleDateString('en-IN',{month:'long',year:'numeric'});
  let h=['S','M','T','W','T','F','S'].map(d=>'<div class="dow">'+d+'</div>').join('');
  for(let i=0;i<start;i++)h+='<div class="cald dim"></div>';
  for(let d=1;d<=days;d++){
    const ds=calY+'-'+String(calM+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    const e=ev[ds]||[];const today=(ds===todayISO());
    h+='<div class="cald'+(today?' today':'')+(e.length?' hasev':'')+'" data-ds="'+ds+'">'+d+
      (e.length?'<div class="evd">'+e.slice(0,3).map(x=>'<i style="background:'+x.c+'"></i>').join('')+'</div>':'')+'</div>';
  }
  $('#dcalGrid').innerHTML=h;
  showCalDay(todayISO());
}
function showCalDay(ds){
  const ev=calEvents();const e=ev[ds]||[];
  const dt=new Date(ds);
  $('#calEvs').innerHTML='<div style="font-size:10.5px;letter-spacing:1.2px;color:var(--muted);font-weight:800;margin-bottom:2px">'+dt.toLocaleDateString('en-IN',{day:'numeric',month:'short'}).toUpperCase()+'</div>'+
    (e.length?e.map(x=>'<div class="ev"><i style="background:'+x.c+'"></i>'+esc(x.t)+'</div>').join(''):'<div class="ev"><i style="background:var(--line-2)"></i>Koi event nahi \u2014 khaali din</div>');
}
$('#dcalGrid').addEventListener('click',e=>{const d=e.target.closest('.cald');if(d&&d.dataset.ds){showCalDay(d.dataset.ds);hap('tick')}});
$('#dcalPrev').addEventListener('click',()=>{calM--;if(calM<0){calM=11;calY--}renderCal();hap('nav')});
$('#dcalNext').addEventListener('click',()=>{calM++;if(calM>11){calM=0;calY++}renderCal();hap('nav')});
/* donut + feed */
function renderDonut(){
  let k=0,p=0;
  DB.invoices.forEach(i=>{if(i.ds>=todayISO().slice(0,8)+'01'||i.ds>'2026-07-16'){if(i.book==='k')k+=i.total;else p+=i.total}});
  const tot=k+p||1;const kp=k/tot*100;
  const C=2*Math.PI*15.9;
  $('#bookDonut').innerHTML='<circle cx="21" cy="21" r="15.9" fill="none" stroke="rgba(140,150,200,.12)" stroke-width="5"/>'+
    '<circle cx="21" cy="21" r="15.9" fill="none" stroke="#f472b6" stroke-width="5" stroke-dasharray="'+(kp/100*C)+' '+C+'" stroke-linecap="round" transform="rotate(-90 21 21)"/>'+
    '<circle cx="21" cy="21" r="15.9" fill="none" stroke="#60a5fa" stroke-width="5" stroke-dasharray="'+((100-kp)/100*C)+' '+C+'" stroke-dashoffset="'+(-kp/100*C)+'" stroke-linecap="round" transform="rotate(-90 21 21)"/>'+
    '<text x="21" y="20" text-anchor="middle" style="font-size:6px;font-weight:800;fill:#dfe4ff;font-family:monospace">'+Math.round(kp)+'%</text>'+
    '<text x="21" y="27" text-anchor="middle" style="font-size:3.6px;fill:#8a93b8;font-family:monospace">KACHCHA</text>';
  $('#donutLegend').innerHTML='<div><i style="background:#f472b6"></i>Kachcha <b style="font-family:var(--font-m)">'+fINR(k)+'</b></div>'+
    '<div><i style="background:#60a5fa"></i>Pakka <b style="font-family:var(--font-m)">'+fINR(p)+'</b></div>'+
    '<div style="color:var(--muted);font-size:10.5px">30 din \u00B7 dono books kabhi milte nahi \u2014 sirf jhalak</div>';
}
function renderFeed(){
  const f=[];
  DB.ledger.slice(0,7).forEach(l=>f.push({d:l.d,t:'<b>'+esc(l.party)+'</b> \u2014 '+esc(l.txt)+' \u00B7 '+(l.inr?fINR(l.inr):fTHB(l.thb))}));
  DB.ships.slice(0,3).forEach(s=>f.push({d:s.d,t:'<b>'+s.id+'</b> \u2014 '+s.bags.length+' bags \u00B7 '+s.kg+' kg \u00B7 '+s.st}));
  $('#feedList').innerHTML=f.slice(0,10).map(x=>'<div class="f"><span class="d">'+esc(x.d)+'</span><span>'+x.t+'</span></div>').join('');
}
function renderDash(){renderKPIs();renderCorridor();renderTreasury();renderActions();renderCal();renderDonut();renderFeed()}

/* ---------- PARTIES ---------- */
let pFilter='all',pQuery='';
function typeLabel(t){return {parent:'Parent',end:'End customer',direct:'Direct',carrier:'Carrier',supplier:'Supplier'}[t]||t}
function flag(c){return {Thailand:'\uD83C\uDDF9\uD83C\uDDED',India:'\uD83C\uDDEE\uD83C\uDDF3',Malaysia:'\uD83C\uDDF2\uD83C\uDDFE',China:'\uD83C\uDDE8\uD83C\uDDF3',Australia:'\uD83C\uDDE6\uD83C\uDDFA',USA:'\uD83C\uDDFA\uD83C\uDDF8',Germany:'\uD83C\uDDE9\uD83C\uDDEA'}[c]||'\uD83C\uDF10'}
function renderParties(){
  const q=pQuery.toLowerCase();
  const list=DB.parties.filter(p=>(pFilter==='all'||p.type===pFilter)&&(!q||p.n.toLowerCase().indexOf(q)>-1));
  $('#pCount').textContent=DB.parties.length;
  $('#pList').innerHTML=list.map((p,i)=>{
    const parent=p.parentId?(DB.parties.find(x=>x.id===p.parentId)||{}).n:'';
    const b=balOf(p)||{inr:0,thb:0};
    return '<div class="prow" data-pid="'+p.id+'">'+
      '<div class="pa">'+paIcon(p.n,i)+'</div>'+
      '<div class="nm"><b>'+esc(p.n)+' <span style="font-weight:600;font-size:11px">'+flag(p.country)+'</span></b>'+
      '<small>'+typeLabel(p.type)+(parent?' \u00B7 under '+esc(parent):'')+' \u00B7 '+esc(p.city||'')+'</small></div>'+
      '<div class="bks"><span class="bk'+(p.books&&p.books.k?' on-k':'')+'">K</span><span class="bk'+(p.books&&p.books.p?' on-p':'')+'">P</span></div>'+
      ((p.type==='parent'||p.type==='direct')?'<div class="bal"><span class="'+(b.inr>=0?'pos':'neg')+'">'+fINR(b.inr)+'</span><small class="'+(b.thb>=0?'pos':'neg')+'">'+fTHB(b.thb)+'</small></div>':'')+
      '</div>'}).join('')||'<div style="color:var(--muted);padding:20px;font-size:13px">Koi party nahi mili</div>';
  renderPartySelects();
}
function renderPartySelects(){
  const bk=bookKeyOf();
  const opts=curBookParties().map(p=>'<option>'+esc(p.n)+'</option>').join('');
  ['invParty'].forEach(id=>{const el=$('#'+id);if(el){const v=el.value;el.innerHTML=opts;if(v)el.value=v}});
  const lp=$('#ledParty');if(lp){const v=lp.value;lp.innerHTML=opts;if(v&&curBookParties().some(x=>x.n===v))lp.value=v}
  const carriers=DB.parties.filter(x=>x.type==='carrier');
  ['shWho','tpWho'].forEach(id=>{const el=$('#'+id);if(el){const v=el.value;
    el.innerHTML=(id==='shWho'?'<option value="">\u2014 abhi nahi</option>':'')+carriers.map(c=>'<option>'+esc(c.n)+'</option>').join('');if(v)el.value=v}});
  const pf=$('#pfParent');if(pf)pf.innerHTML=DB.parties.filter(x=>x.type==='parent').map(p=>'<option>'+esc(p.n)+'</option>').join('');
}
$('#pTypeChips').addEventListener('click',e=>{const c=e.target.closest('.pchip');if(!c)return;
  $$('#pTypeChips .pchip').forEach(x=>x.classList.toggle('sel',x===c));pFilter=c.dataset.pt;renderParties();hap('tick')});
$('#pSearch').addEventListener('input',()=>{pQuery=$('#pSearch').value;renderParties()});
$('#pList').addEventListener('click',e=>{const r=e.target.closest('.prow');if(r){openParty(r.dataset.pid);hap('nav')}});
/* party detail overlay */
function openParty(pid){
  const p=DB.parties.find(x=>x.id===pid);if(!p)return;
  const i=DB.parties.indexOf(p);
  const parent=p.parentId?(DB.parties.find(x=>x.id===p.parentId)||{}).n:'';
  const kids=DB.parties.filter(x=>x.parentId===p.id);
  const led=DB.ledger.filter(l=>l.party===p.n).slice(0,3);
  const bK=p.balK||{inr:0,thb:0},bP=p.balP||{inr:0,thb:0};
  const pin=p.pin||{x:50,y:50};
  const lastTr=p.last&&p.last.tr?('\u20B9'+p.last.tr.v+' \u00B7 '+p.last.tr.d):'abhi nahi diya';
  const ov=$('#pdOverlay');
  ov.innerHTML='<div class="pd-top"><button class="back" id="pdBack">\u2190</button>'+
    '<div class="pa">'+paIcon(p.n,i)+'</div>'+
    '<div><h2>'+esc(p.n)+' '+flag(p.country)+'</h2><div class="sub">'+typeLabel(p.type)+(parent?' \u00B7 under '+esc(parent):'')+' \u00B7 '+esc(p.city||'')+', '+esc(p.country||'')+' \u00B7 OPSI bhasha: <b style="color:var(--acc1)">'+esc(p.lang||'Hindi')+'</b></div></div></div>'+
    '<div class="pd-acts">'+
      '<button class="btn primary" data-t="WhatsApp — OPSI '+esc(p.lang)+' mein message banayega (API phase)">\uD83D\uDCAC WhatsApp</button>'+
      (p.line?'<button class="btn" data-t="LINE — '+esc(p.line)+' (API phase)">\uD83D\uDFE2 LINE</button>':'')+
      '<button class="btn" data-t="Call '+esc(p.phone||'')+'">\uD83D\uDCDE Call</button>'+
      ((p.type==='parent'||p.type==='direct')?'<button class="btn" id="pdLedger">\uD83D\uDCD2 Poora Ledger \u2192</button>':'')+
    '</div>'+
    '<div class="pd-grid">'+
    '<div class="card b6"><div class="card-head"><span class="card-eyebrow">Delivery Location \u2014 Lalamove pin</span></div>'+
      '<div class="pinmap"><div class="ring" style="left:'+pin.x+'%;top:'+pin.y+'%"></div><div class="pin" style="left:'+pin.x+'%;top:'+pin.y+'%"><div class="p"></div></div>'+
      '<div class="addr"><b>'+esc(p.n)+'</b> \u00B7 '+esc(p.city||'')+' \u00B7 pin draggable hoga (Google Maps API phase mein) \u00B7 receiver: '+esc(p.phone||'\u2014')+'</div></div>'+
      (kids.length?'<div style="font-size:11px;color:var(--muted);margin-top:10px">End customers ('+kids.length+'): '+kids.map(k=>esc(k.n)).join(' \u00B7 ')+'</div>':'')+
    '</div>'+
    '<div class="card b6"><div class="card-head"><span class="card-eyebrow">Contact & Details</span></div>'+
      '<div class="kv">'+
      '<div class="r"><span>Phone</span><b>'+esc(p.phone||'\u2014')+'</b></div>'+
      '<div class="r"><span>WhatsApp</span><b>'+esc(p.phone||'\u2014')+'</b></div>'+
      '<div class="r"><span>LINE</span><b>'+esc(p.line||'\u2014')+'</b></div>'+
      '<div class="r"><span>Books</span><b>'+(p.books&&p.books.k?'KACHCHA ':'')+(p.books&&p.books.p?'\u00B7 PAKKA':'')+'</b></div>'+
      (p.gstin?'<div class="r"><span>GSTIN</span><b>'+esc(p.gstin)+'</b></div>':'')+
      '</div>'+
      ((p.type==='parent'||p.type==='direct'||p.type==='carrier')?
      '<div class="ratechip"><span>Freight</span><b>'+(p.ri?'\u20B9'+p.ri+'/kg \u00B7 \u0E3F'+p.rt:'\u2014')+'</b><small>last used</small></div>'+
      '<div class="ratechip"><span>Transfer rate</span><b>'+lastTr+'</b><small>auto-fetch hoga</small></div>'+
      (p.type==='carrier'?'<div class="ratechip"><span>Carrying charge</span><b>\u20B9'+(p.cc||200)+'/kg</b><small>last used</small></div>':''):'')+
    '</div>'+
    ((p.type==='parent'||p.type==='direct')?
    '<div class="card b6"><div class="card-head"><span class="card-eyebrow">Balance \u2014 dono khaate alag</span></div>'+
      '<div style="font-size:10px;letter-spacing:1.4px;color:#f9a8d4;font-weight:800;margin-bottom:7px">KACHCHA</div>'+
      '<div class="balduo"><div class="balbox"><div class="c">\u20B9 INR</div><div class="v '+(bK.inr>=0?'pos':'neg')+'">'+fINR(bK.inr)+'</div></div>'+
      '<div class="balbox"><div class="c">\u0E3F THB</div><div class="v '+(bK.thb>=0?'pos':'neg')+'">'+fTHB(bK.thb)+'</div></div></div>'+
      (p.books&&p.books.p?'<div style="font-size:10px;letter-spacing:1.4px;color:#93c5fd;font-weight:800;margin:12px 0 7px">PAKKA</div>'+
      '<div class="balduo"><div class="balbox"><div class="c">\u20B9 INR</div><div class="v '+(bP.inr>=0?'pos':'neg')+'">'+fINR(bP.inr)+'</div></div>'+
      '<div class="balbox"><div class="c">\u0E3F THB</div><div class="v">'+fTHB(bP.thb)+'</div></div></div>':'')+
    '</div>'+
    '<div class="card b6"><div class="card-head"><span class="card-eyebrow">Aakhri 3 entries</span></div>'+
      (led.map(l=>'<div class="lgrow"><span class="d">'+esc(l.d)+'</span><span>'+esc(l.txt)+'</span><span class="amt '+(l.neg?'neg':'pos')+'">'+(l.inr?fINR(l.inr*(l.neg?-1:1)):fTHB(l.thb*(l.neg?-1:1)))+'</span></div>').join('')||'<div style="color:var(--muted);font-size:12px;padding:8px">Abhi koi entry nahi</div>')+
    '</div>':'')+
    '</div>';
  ov.classList.add('open');
  $('#pdBack').addEventListener('click',()=>{ov.classList.remove('open');hap('nav')});
  const pl2=$('#pdLedger');if(pl2)pl2.addEventListener('click',()=>{ov.classList.remove('open');
    go('hisaab');openLedger(p.n);hap('confirm')});
  ov.querySelectorAll('[data-t]').forEach(b=>b.addEventListener('click',()=>{toast(b.dataset.t);hap('tap')}));
}
/* party form */
$('#btnNewParty').addEventListener('click',()=>{$('#partyForm').classList.toggle('show');hap('tap')});
$('#pfType').addEventListener('change',()=>{$('#pfParentWrap').style.display=$('#pfType').value==='end'?'':'none'});
$('#pfParentWrap').style.display='none';
$('#pfSave').addEventListener('click',()=>{
  const n=($('#pfName').value||'').trim();
  if(!n){toast('Party ka naam zaroori hai');hap('reject');return}
  if(DB.parties.some(x=>x.n.toLowerCase()===n.toLowerCase())){toast('Yeh party pehle se hai');hap('reject');return}
  const type=$('#pfType').value,country=$('#pfCountry').value;
  const langMap={Thailand:'Thai',India:'Hindi',China:'Chinese',Malaysia:'English',Australia:'English',USA:'English',Germany:'German'};
  const parent=type==='end'?DB.parties.find(x=>x.n===$('#pfParent').value):null;
  const bk=bookKeyOf();
  DB.parties.push({id:'P'+(DB.parties.length+1)+'x',n:n,type:type,parentId:parent?parent.id:'',city:($('#pfCity').value||'\u2014').trim(),country:country,
    phone:($('#pfPhone').value||'').trim(),line:($('#pfLine').value||'').trim(),lang:langMap[country]||'English',
    ri:+($('#pfRateI').value)||0,rt:+($('#pfRateT').value)||0,gstin:($('#pfGst')?($('#pfGst').value||'').trim():''),
    books:{k:bk==='k'||type!=='parent'&&type!=='direct',p:bk==='p'},balK:{inr:0,thb:0},balP:{inr:0,thb:0},last:{},
    pin:{x:20+Math.random()*60,y:25+Math.random()*50}});
  saveDB();renderParties();
  $('#partyForm').classList.remove('show');
  ['pfName','pfCity','pfPhone','pfLine','pfRateI','pfRateT'].forEach(i=>{const el=$('#'+i);if(el)el.value=''});
  hap('confirm');toast(n+' add ho gayi \u2713 OPSI bhasha: '+(langMap[country]||'English')+' \u00B7 rates aage last-used se chalenge');
});

/* ---------- INVOICES ---------- */
let invLines=[];
function itemOpts(sel){return DB.catalog.map(c=>'<option'+(c.n===sel?' selected':'')+'>'+esc(c.n)+'</option>').join('')}
function addLine(item,qty,rate){invLines.push({item:item||DB.catalog[0].n,qty:qty||0,rate:rate||0});renderLines()}
function renderLines(){
  $('#invLines').innerHTML=invLines.map((l,i)=>'<div class="line">'+
    '<select class="li-item" id="l'+i+'item">'+itemOpts(l.item)+'</select>'+
    '<input id="l'+i+'qty" type="number" inputmode="numeric" placeholder="qty" value="'+(l.qty||'')+'">'+
    '<input id="l'+i+'rate" type="number" inputmode="numeric" placeholder="rate" value="'+(l.rate||'')+'">'+
    '<div class="lt" id="l'+i+'tot">'+fINR((l.qty||0)*(l.rate||0))+'</div>'+
    '<button class="rm" data-rm="'+i+'">\u00D7</button></div>').join('');
  invLines.forEach((l,i)=>{
    $('#l'+i+'item').addEventListener('change',()=>{l.item=$('#l'+i+'item').value;
      const it=DB.catalog.find(c=>c.n===l.item);if(it&&!l.rate){l.rate=it.rate;$('#l'+i+'rate').value=it.rate}calcInv()});
    ['qty','rate'].forEach(f=>$('#l'+i+f).addEventListener('input',()=>{l[f]=+($('#l'+i+f).value)||0;calcInv()}));
  });
  $$('#invLines .rm').forEach(b=>b.addEventListener('click',()=>{invLines.splice(+b.dataset.rm,1);renderLines();hap('tick')}));
  if(window.dressAll)dressAll($('#invLines'));
  calcInv();
}
function calcInv(){
  invLines.forEach((l,i)=>{const el=$('#l'+i+'tot');if(el)el.innerHTML=fINR((l.qty||0)*(l.rate||0))});
  const sub=invLines.reduce((a,l)=>a+(l.qty||0)*(l.rate||0),0);
  const par=partyByName($('#invParty').value);
  const kg=+($('#invKg').value)||0;
  const fr=Math.round(kg*((par&&par.ri)||210));
  const biz=BOOK.mode==='business';
  const gst=biz?Math.round((sub+fr)*0.05):0;
  $('#invSub').innerHTML=fINR(sub);$('#invFr').innerHTML=fINR(fr);
  $('#invGstWrap').style.display=biz?'':'none';$('#invGstAmt').innerHTML=fINR(gst);
  $('#invGrand').innerHTML=fINR(sub+fr+gst);
  return {sub:sub,fr:fr,gst:gst,total:sub+fr+gst,kg:kg};
}
function openInvForm(){$('#invForm').classList.add('show');if(!invLines.length)addLine('',0,0);renderPartySelects();calcInv()}
$('#btnNewInv').addEventListener('click',()=>{openInvForm();hap('tap')});
$('#invAddLine').addEventListener('click',()=>{addLine('',0,0);hap('tick')});
$('#invParty').addEventListener('change',calcInv);
$('#invKg').addEventListener('input',calcInv);
function saveInvoice(fromMagic){
  const t=calcInv();
  const par=partyByName($('#invParty').value);
  if(!par){toast('Party chuno');hap('reject');return}
  if(!invLines.some(l=>l.qty>0&&l.rate>0)){toast('Kam se kam ek line bharo');hap('reject');return}
  const biz=BOOK.mode==='business';
  const doSave=()=>{
    let id;
    if(!biz)id='KCH-0'+(DB.seq.kch++);
    else if(BOOK.co==='singh')id='SE-2026-'+(DB.seq.se++);
    else id='AW-2026-0'+(DB.seq.aw++);
    const inv={id:id,book:biz?'p':'k',co:biz?BOOK.co:'',party:par.n,d:todayShort(),ds:todayISO(),
      lines:invLines.filter(l=>l.qty>0),kg:t.kg,fr:t.fr,gst:t.gst,total:t.total,cur:$('#invCur').value,stl:'p-wait',st:'DUE',shp:''};
    DB.invoices.unshift(inv);
    DB.ledger.unshift({id:'L'+(DB.seq.lg++),party:par.n,book:inv.book,d:inv.d,ds:inv.ds,neg:false,inr:t.total,thb:0,
      txt:(biz?(BOOK.co==='singh'?'Singh Exports':'Awadh Ent.')+' invoice ':'Kachcha receipt ')+id});
    const b=biz?par.balP:par.balK;b.inr+=t.total;
    invLines.forEach(l=>{const it=DB.catalog.find(c=>c.n===l.item);if(it)it.qty=Math.max(0,it.qty-l.qty)});
    saveDB();
    invLines=[];$('#invForm').classList.remove('show');
    renderInvoices();renderLedger();renderCatalog();renderDash();
    hap('save');toast(id+' ban gaya \u00B7 '+fINR(t.total)+' \u00B7 ledger + stock auto-update \u2713');
  };
  if(biz&&!fromMagic){confirmPakka(par.n,fINR(t.total),doSave)}else{doSave()}
}
$('#invSave').addEventListener('click',()=>saveInvoice(false));
function renderInvoices(){
  const bk=bookKeyOf();
  $('#invRows').innerHTML=DB.invoices.filter(i=>i.book===bk).slice(0,25).map(inv=>
    '<tr class="inv-open" data-inv="'+inv.id+'"><td class="mono">'+inv.id+'</td><td>'+esc(inv.party)+'</td>'+
    '<td>'+(inv.book==='k'?'Kachcha':'Pakka \u00B7 '+(inv.co==='singh'?'SE':'AW'))+'</td>'+
    '<td style="font-size:11px;color:var(--muted)">'+inv.lines.map(l=>esc(l.item.split(' (')[0])+' \u00D7'+l.qty).join(', ').slice(0,46)+'</td>'+
    '<td class="mono" style="text-align:right">'+fINR(inv.total)+'</td>'+
    '<td><span class="pill '+inv.stl+'">'+inv.st+'</span></td>'+
    '<td>'+(inv.shp?'<span class="trk">'+inv.shp+'</span>':'<button class="btn" style="padding:7px 11px;font-size:11px" data-ship="'+inv.id+'">Ship \u2192</button>')+'</td></tr>').join('');
  $$('#invRows [data-ship]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();shipFromInvoice(b.dataset.ship);hap('nav')}));
}

/* ---------- SHIPMENTS + PACKING BOARD ---------- */
let PB={ship:null,pool:[],bags:[]};
function ownerSelect(sel){
  let h='<option value="">\u2014 kiska maal \u2014</option>';
  DB.parties.filter(x=>x.type==='parent').forEach(pr=>{
    h+='<optgroup label="'+esc(pr.n)+' (parent)">';
    DB.parties.filter(e=>e.parentId===pr.id).forEach(e2=>{h+='<option value="'+esc(pr.n)+'|'+esc(e2.n)+'"'+(sel===pr.n+'|'+e2.n?' selected':'')+'>'+esc(e2.n)+'</option>'});
    h+='<option value="'+esc(pr.n)+'|'+esc(pr.n)+'">'+esc(pr.n)+' (khud)</option></optgroup>'});
  h+='<optgroup label="DIRECT — mere customers">';
  DB.parties.filter(x=>x.type==='direct').forEach(d=>{h+='<option value="|'+esc(d.n)+'"'+(sel==='|'+d.n?' selected':'')+'>'+esc(d.n)+' \u2726</option>'});
  h+='</optgroup>';return h;
}
function shipFromInvoice(invId){
  const inv=DB.invoices.find(i=>i.id===invId);if(!inv)return;
  const id='SHP-'+(DB.seq.shp++);
  DB.ships.unshift({id:id,book:inv.book,d:todayShort(),ds:todayISO(),dest:'Bangkok',who:'',bags:[],kg:0,stl:'p-done',st:'PACKING',inv:invId});
  inv.shp=id;inv.stl='p-live';
  saveDB();
  openPackBoard(id,invId);
}
$('#btnNewShip').addEventListener('click',()=>{$('#shipForm').classList.toggle('show');if(!SC2.rows.length)scAddRow();renderSC();hap('tap')});
$('#shSave').addEventListener('click',()=>{saveComposerShip()});
function openPackBoard(shipId,invId){
  PB={ship:shipId,pool:[],bags:[]};
  if(invId){const inv=DB.invoices.find(i=>i.id===invId);
    if(inv)PB.pool=inv.lines.map(l=>({n:l.item,total:l.qty,left:l.qty}))}
  pbAddBag();
  renderPB();
  $('#packBoard').classList.add('open');hap('nav');
}
function pbAddBag(){PB.bags.push({owner:'',kg:'',items:[]})}
function pbPlaced(){return PB.pool.reduce((a,p)=>a+(p.total-p.left),0)}
function pbTotal(){return PB.pool.reduce((a,p)=>a+p.total,0)}
function renderPB(){
  const ship=DB.ships.find(s=>s.id===PB.ship);
  const tot=pbTotal(),done=pbPlaced();
  let h='<div class="card-head" style="margin-bottom:12px"><span class="card-eyebrow">Packing Board \u2014 '+PB.ship+'</span>'+
    '<button class="btn" id="pbClose" style="margin-left:auto;padding:8px 13px;font-size:12px">Band</button></div>';
  if(tot>0)h+='<div class="pb-prog"><span>Bhara: <b>'+done+'</b> / '+tot+'</span><div class="bar"><i style="width:'+(tot?done/tot*100:0)+'%"></i></div>'+
    '<button class="btn" id="pbAuto" style="padding:7px 11px;font-size:11px">\u26A1 Auto-split</button></div>';
  h+='<div class="pb-cols"><div>';
  h+='<div style="font-size:10.5px;letter-spacing:1.4px;color:var(--muted);font-weight:800;margin-bottom:8px">MAAL POOL'+(tot?'':' \u2014 khaali (neeche bag mein seedha jodo)')+'</div>';
  h+=PB.pool.map(p=>'<div class="pool-it'+(p.left===0?' done':'')+'"><b>'+esc(p.n)+'</b><span class="left">'+(p.left===0?'\u2713 poora':p.left+' baaki')+'</span></div>').join('');
  h+='</div><div><div style="font-size:10.5px;letter-spacing:1.4px;color:var(--muted);font-weight:800;margin-bottom:8px">BAGS ('+PB.bags.length+')</div>';
  PB.bags.forEach((b,bi)=>{
    h+='<div class="pbag"><div class="h"><b>Bag '+(bi+1)+'</b>'+(b.owner&&b.owner[0]==='|'?'<span class="dir-tag">DIRECT</span>':'')+
      '<select data-own="'+bi+'">'+ownerSelect(b.owner)+'</select>'+
      '<input data-kg="'+bi+'" type="number" inputmode="numeric" placeholder="kg" value="'+(b.kg||'')+'" style="width:64px;background:rgba(255,255,255,.05);border:1px solid var(--line);border-radius:10px;padding:7px 8px;color:var(--ink);font-family:var(--font-m);font-size:11.5px"></div>';
    h+='<div class="chips">'+b.items.map((it,ii)=>'<span class="pbchip"><b>'+it.qty+'</b> '+esc(it.n.split(' (')[0])+'<button data-chip="'+bi+'_'+ii+'">\u00D7</button></span>').join('')+'</div>';
    h+='<div class="pb-add"><select data-bsel="'+bi+'">'+
      (PB.pool.length?PB.pool.map(p=>'<option>'+esc(p.n)+'</option>').join(''):DB.catalog.map(c=>'<option>'+esc(c.n)+'</option>').join(''))+
      '</select><input data-bq="'+bi+'" type="number" inputmode="numeric" placeholder="qty"><button class="btn" data-badd="'+bi+'" style="padding:8px 12px;font-size:11.5px">+ Daalo</button></div></div>';
  });
  h+='<button class="btn" id="pbNewBag" style="width:100%;padding:11px;border-style:dashed">+ Naya Bag</button>';
  h+='<button class="btn primary" id="pbFinish" style="width:100%;margin-top:11px;padding:13px">Packing Done \u2713</button>';
  h+='</div></div>';
  $('#pbInner').innerHTML=h;
  $('#pbClose').addEventListener('click',()=>{$('#packBoard').classList.remove('open');renderShips();hap('nav')});
  $('#pbNewBag').addEventListener('click',()=>{pbAddBag();renderPB();hap('tick')});
  const au=$('#pbAuto');if(au)au.addEventListener('click',()=>{
    const n=PB.bags.length||1;
    PB.pool.forEach(p=>{if(p.left<=0)return;const per=Math.floor(p.left/n);let rem=p.left-per*n;
      PB.bags.forEach(b=>{let q=per+(rem>0?1:0);if(rem>0)rem--;if(q>0){b.items.push({n:p.n,qty:q})}});p.left=0});
    renderPB();hap('magic');toast('OPSI ne maal '+n+' bags mein baraabar baant diya \u2713')});
  $$('#pbInner [data-own]').forEach(el=>el.addEventListener('change',()=>{PB.bags[+el.dataset.own].owner=el.value;renderPB()}));
  $$('#pbInner [data-kg]').forEach(el=>el.addEventListener('input',()=>{PB.bags[+el.dataset.kg].kg=el.value}));
  $$('#pbInner [data-badd]').forEach(el=>el.addEventListener('click',()=>{
    const bi=+el.dataset.badd;
    const sel=$('#pbInner [data-bsel="'+bi+'"]').value;
    const q=+($('#pbInner [data-bq="'+bi+'"]').value)||0;
    if(q<=0){toast('Qty likho');hap('reject');return}
    const pool=PB.pool.find(p=>p.n===sel);
    if(pool){if(q>pool.left){toast('Pool mein sirf '+pool.left+' baaki hain');hap('reject');return}pool.left-=q}
    PB.bags[bi].items.push({n:sel,qty:q});renderPB();hap('tick')}));
  $$('#pbInner [data-chip]').forEach(el=>el.addEventListener('click',()=>{
    const pr=el.dataset.chip.split('_');const it=PB.bags[+pr[0]].items.splice(+pr[1],1)[0];
    const pool=PB.pool.find(p=>p.n===it.n);if(pool)pool.left+=it.qty;
    renderPB();hap('tick')}));
  if(window.dressAll)dressAll($('#pbInner'));
  $('#pbFinish').addEventListener('click',()=>{
    const ship=DB.ships.find(s=>s.id===PB.ship);if(!ship)return;
    const good=PB.bags.filter(b=>b.items.length&&b.owner);
    if(!good.length){toast('Har bag mein maal + malik chuno');hap('reject');return}
    let kg=0;
    good.forEach(b=>{const pr=b.owner.split('|');const bid='BAG-'+(DB.seq.bag++);const bkg=+(b.kg)||0;kg+=bkg;
      DB.bags.push({id:bid,shp:ship.id,parent:pr[0],end:pr[1],direct:!pr[0],kg:bkg,items:b.items,who:ship.who});
      ship.bags.push(bid)});
    ship.kg=kg;ship.st='READY';ship.stl='p-wait';
    saveDB();$('#packBoard').classList.remove('open');
    renderShips();renderDash();hap('save');
    toast(ship.id+' READY \u2713 '+good.length+' bags \u00B7 '+kg+' kg \u2014 ab carrier do ya Packing List nikaalo');
  });
}
/* ships list */
function renderShips(){
  $('#shBagCount').textContent=DB.bags.filter(b=>{const sh=DB.ships.find(x=>x.id===b.shp);return sh&&(sh.st==='READY'||sh.st==='PACKING')}).length;
  $('#shipList').innerHTML=DB.ships.slice(0,12).map(sh=>{
    const bags=DB.bags.filter(b=>b.shp===sh.id);
    const groups={};
    bags.forEach(b=>{const k=b.direct?'\u2726 DIRECT \u2014 mere customers':(b.parent||'Anya');(groups[k]=groups[k]||[]).push(b)});
    let gh='';let gi=0;
    Object.keys(groups).forEach(gk=>{const gb=groups[gk];gi++;
      gh+='<div class="pgroup'+(gi===1?' open':'')+'"><div class="gh"><span class="car">\u203A</span><div class="pa">'+paIcon(gk.replace('\u2726 ',''),gi)+'</div><b>'+esc(gk)+'</b><small>'+gb.length+' bags \u00B7 '+gb.reduce((a,b)=>a+b.kg,0)+' kg</small></div><div class="gb">'+
      gb.map(b=>'<div class="bagline"><span class="bid">'+b.id+'</span><div><div class="to">\u2192 '+esc(b.end)+(b.direct?' <span class="dir-tag">DIRECT</span>':'')+'</div><div class="its">'+b.items.map(i=>esc(i.n.split(' (')[0])+' \u00D7'+i.qty).join(' \u00B7 ')+'</div></div><span class="kg">'+b.kg+' kg</span></div>').join('')+
      '</div></div>'});
    return '<div class="shrow"><div class="top"><b>'+sh.id+'</b><span class="pill '+sh.stl+'">'+sh.st+'</span>'+
      (sh.who?'<span class="trk">\u2708 '+esc(sh.who)+'</span>':'')+
      '<span style="margin-left:auto;font-family:var(--font-m);font-weight:800">'+sh.kg+' kg</span></div>'+
      '<div class="meta">'+esc(sh.d)+' \u00B7 '+esc(sh.dest)+' \u00B7 '+bags.length+' bags'+(sh.inv?' \u00B7 invoice: '+sh.inv:'')+'</div>'+gh+
      '<div class="btns">'+
      (sh.st==='PACKING'?'<button class="btn primary" data-pack="'+sh.id+'">\uD83D\uDCE6 Packing jaari rakho</button>':'')+
      '<button class="btn" data-plist="'+sh.id+'">\uD83D\uDCC4 Packing List</button>'+
      '<button class="btn" data-chk="'+sh.id+'">\u2611 Loading Checklist</button>'+
      (!sh.who&&sh.st==='READY'?'<button class="btn" data-trip="'+sh.id+'">\u2708 Trip do \u2192</button>':'')+
      '</div></div>'}).join('');
  $$('#shipList .gh').forEach(g=>g.addEventListener('click',()=>{g.parentElement.classList.toggle('open');hap('tick')}));
  $$('#shipList [data-pack]').forEach(b=>b.addEventListener('click',()=>{openPackBoard(b.dataset.pack,DB.ships.find(s=>s.id===b.dataset.pack).inv||null)}));
  $$('#shipList [data-plist]').forEach(b=>b.addEventListener('click',()=>{buildPackingList(b.dataset.plist);hap('nav')}));
  $$('#shipList [data-chk]').forEach(b=>b.addEventListener('click',()=>{buildChecklist(b.dataset.chk);hap('nav')}));
  $$('#shipList [data-trip]').forEach(b=>b.addEventListener('click',()=>{assignShipToTrip(b.dataset.trip)}));
}
function assignShipToTrip(shipId){
  const open=DB.moves.filter(m=>m.kind==='carrier'&&(m.st==='PLANNED'||m.st==='BOARDING AAJ'));
  if(!open.length){toast('Koi open trip nahi \u2014 pehle Movement mein trip plan karo');hap('reject');return}
  const m=open[0];const sh=DB.ships.find(s=>s.id===shipId);
  sh.who=m.who;sh.st='LOADED';sh.stl='p-done';
  m.out.shp=shipId;m.out.kg+=sh.kg;m.out.bags=(m.out.bags||[]).concat(sh.bags);
  DB.bags.filter(b=>b.shp===shipId).forEach(b=>b.who=m.who);
  saveDB();renderShips();renderMoves();hap('confirm');
  toast(shipId+' \u2192 '+m.who+' ('+m.d+') \u00B7 ab trip par '+m.out.kg+' kg');
}
/* ---------- PRINT BUILDERS ---------- */
function openPrint(html){$('#printSheet').innerHTML=html;$('#printPop').classList.add('open')}
$('#printClose').addEventListener('click',()=>{$('#printPop').classList.remove('open');hap('nav')});
function buildPackingList(shipId){
  const sh=DB.ships.find(s=>s.id===shipId);const bags=DB.bags.filter(b=>b.shp===shipId);
  let rows='';bags.forEach((b,i)=>{rows+='<tr><td>'+(i+1)+'</td><td><b>'+b.id+'</b></td><td>'+esc(b.parent||'DIRECT')+'</td><td>'+esc(b.end)+'</td><td>'+b.items.map(x=>esc(x.n)+' \u00D7'+x.qty).join('<br>')+'</td><td>'+b.kg+'</td></tr>'});
  openPrint('<h3>PACKING LIST \u2014 '+shipId+'</h3><div class="sub">'+esc(sh.d)+' \u00B7 Delhi \u2192 '+esc(sh.dest)+' \u00B7 Carrier: '+esc(sh.who||'\u2014 pending')+' \u00B7 Total '+sh.kg+' kg \u00B7 '+bags.length+' bags</div>'+
    '<table><tr><th>#</th><th>Bag</th><th>Parent</th><th>Deliver To</th><th>Items</th><th>KG</th></tr>'+rows+'</table>'+
    '<div class="sig"><div>Packed by: ____________</div><div>Checked by: ____________</div><div>Date: '+esc(sh.d)+'</div></div>');
}
function buildChecklist(shipId){
  const sh=DB.ships.find(s=>s.id===shipId);const bags=DB.bags.filter(b=>b.shp===shipId);
  let rows='';bags.forEach((b,i)=>{rows+='<tr><td><span class="cb"></span></td><td><b>'+b.id+'</b> <div class="qrph" style="display:inline-block;vertical-align:middle;margin-left:6px"></div></td><td>'+esc(b.end)+'</td><td>'+b.kg+' kg</td><td><span class="cb"></span> sahi maal<br><span class="cb"></span> weight OK<br><span class="cb"></span> seal laga</td></tr>'});
  openPrint('<h3>LOADING CHECKLIST \u2014 '+shipId+'</h3><div class="sub">Staff har bag load karte waqt tick kare \u00B7 photo kheench kar OPSI ko bheje \u2192 shipment IN-TRANSIT ho jayegi \u00B7 (QR sticker Brother printer se \u2014 agle phase mein)</div>'+
    '<table><tr><th>Load</th><th>Bag \u00B7 QR</th><th>Kiska</th><th>KG</th><th>Checks</th></tr>'+rows+'</table>'+
    '<div class="sig"><div>Loaded by: ____________</div><div>Carrier sign: ____________</div><div>Total bags: '+bags.length+'</div></div>');
}

/* ---------- MOVEMENT ---------- */
let mvDir='out';
$$('.mv-tab').forEach(t=>t.addEventListener('click',()=>{
  $$('.mv-tab').forEach(x=>x.classList.toggle('sel',x===t));mvDir=t.dataset.dir;renderMoves();hap('tick')}));
$('#btnNewTrip').addEventListener('click',()=>{$('#tripForm').classList.toggle('show');hap('tap')});
$('#tpGo').addEventListener('click',()=>{
  const who=$('#tpWho').value;if(!who){toast('Partner chuno');hap('reject');return}
  const d=$('#tpDate').value||'19 Aug';
  DB.moves.unshift({id:'MV-'+(DB.seq.mv++),kind:'carrier',book:'k',who:who,fl:($('#tpFl').value||'').toUpperCase(),ds:todayISO(),d:d,prog:0,st:'PLANNED',stl:'p-done',
    out:{bags:[],kg:0,usd:+($('#tpUsd').value)||0,shp:''},back:{gold:+($('#tpGold').value)||0,thai:+($('#tpThai').value)||0,kg:+($('#tpThai').value)||0},need:+($('#tpKg').value)||50,eta:($('#tpNote').value||'assign bags')});
  saveDB();$('#tripForm').classList.remove('show');mvDir='out';if(bookKeyOf()!=='k'){setBook('cash',BOOK.co,true);toast('Trip KACHCHA book mein saved — book switch kar diya')}var mvTop=$('#mvList');if(mvTop)mvTop.scrollIntoView({behavior:'smooth',block:'start'});renderMoves();renderDash();
  hap('save');toast(who+' ki trip '+d+' ko plan ho gayi \u2014 ab shipments se bags do');
});
function kindTag(k){return {carrier:'\u2708 Carrier',courier:'\uD83D\uDCE8 Courier',aircargo:'\uD83D\uDEEB Air Cargo',seacargo:'\uD83D\uDEA2 Sea Cargo'}[k]||k}
function renderMoves(){
  const bk=bookKeyOf();
  let list=DB.moves.filter(m=>bk==='k'?m.kind==='carrier':m.kind!=='carrier');
  list=list.filter(m=>{
    const inbound=(m.st==='WAPSI \u2014 DELHI')||(m.back&&(m.back.gold>0||m.back.kg>0)&&m.prog>=100)||m.st==='WAPSI — DELHI';
    return mvDir==='in'?inbound:!inbound});
  $('#mvList').innerHTML=list.map(m=>{
    let h='<div class="mvcard"><div class="top" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">'+
      '<b style="font-family:var(--font-m)">'+kindTag(m.kind)+' \u00B7 '+esc(m.who)+'</b>'+
      '<span class="pill '+m.stl+'">'+esc(m.st)+'</span>'+
      (m.fl?'<span class="trk">'+esc(m.fl)+'</span>':'')+(m.awb?'<span class="trk">AWB '+esc(m.awb)+'</span>':'')+
      '<span style="margin-left:auto;font-size:11.5px;color:var(--muted)">'+esc(m.d)+' \u00B7 '+esc(m.eta||'')+'</span></div>';
    if(m.prog>0&&m.prog<100)h+='<div class="meter" style="margin-top:10px"><i style="width:'+m.prog+'%"></i></div>';
    if(m.kind==='carrier'){
      h+='<div class="mv-duo"><div class="mv-box out"><div class="h">JAA RAHA \u2192 BKK</div><div>'+
        '<b>'+((m.out.bags&&m.out.bags.length)||0)+'</b> bags \u00B7 <b>'+m.out.kg+'</b> kg'+(m.out.shp?' \u00B7 '+m.out.shp:'')+'<br>USD carry: <b>$'+(m.out.usd||0).toLocaleString('en-IN')+'</b>'+(m.need?'<br><span style="color:var(--muted)">chahiye '+m.need+' kg'+(m.out.kg<m.need?' \u00B7 <b style="color:#f0c46c">'+(m.need-m.out.kg)+' kg jagah baaki</b>':' \u00B7 full')+'</span>':'')+'</div></div>'+
        '<div class="mv-box inn"><div class="h">\u2190 WAPSI LAAYEGA</div><div>Gold 999.9: <b>'+(m.back.gold||0)+' gm</b><br>Thai goods: <b>'+(m.back.kg||0)+' kg</b>'+((m.back.gold||m.back.kg)?'':'<br><span style="color:var(--muted)">Bangkok se tay hoga</span>')+'</div></div></div>';
    }else{
      h+='<div class="mv-box out" style="margin-top:10px"><div class="h">CONSIGNMENT</div><div><b>'+m.out.kg+' kg</b> \u00B7 '+esc(m.out.desc||'')+'</div></div>';
    }
    h+='</div>';return h}).join('')||'<div style="color:var(--muted);font-size:13px;padding:16px">Is taraf abhi kuch nahi'+(bk==='p'?' \u2014 courier/cargo pakka book mein dikhte hain':'')+'</div>';
  renderCustody();
}
function renderCustody(){
  const h=DB.custody.map(c=>'<div class="cust"><span>'+(c.kind==='gold'?'\uD83D\uDFE1':'\uD83D\uDCB5')+'</span><div><b>'+(c.kind==='gold'?c.qty+' gm':'$'+c.qty.toLocaleString('en-IN'))+'</b> \u00B7 <span class="who">'+esc(c.holder)+'</span> ke paas \u00B7 '+esc(c.since)+'<div style="font-size:10.5px;color:var(--muted)">'+esc(c.note)+'</div></div><button data-got="'+c.id+'">Mil gaya \u2713</button></div>').join('');
  const el=$('#custStrip');if(el)el.innerHTML=h;
  const el2=$('#lgCustody');if(el2)el2.innerHTML=h||'<div style="color:var(--muted);font-size:12px;padding:8px">Sab kuch warehouse mein \u2713</div>';
  $$('[data-got]').forEach(b=>b.addEventListener('click',()=>{
    const c=DB.custody.find(x=>x.id===b.dataset.got);if(!c)return;
    if(c.kind==='gold'){DB.lots.unshift({id:'G'+(DB.lots.length+1),d:todayShort(),who:c.holder,gm:c.qty,buy:Math.round(GOLD_IN*0.965),at:'Delhi WH1'})}
    else{const u=DB.usd.find(x=>x.at==='Delhi WH1');if(u)u.amt+=c.qty;else DB.usd.push({at:'Delhi WH1',amt:c.qty})}
    DB.custody=DB.custody.filter(x=>x.id!==c.id);
    saveDB();renderCustody();renderWarehouse();renderDash();
    hap('save');toast((c.kind==='gold'?c.qty+' gm gold':'$'+c.qty)+' warehouse mein aa gaya \u2713 '+esc(c.holder)+' ki custody clear')}));
}
/* ---------- LEDGER v2 ---------- */
let lgType='mila';
$$('.segbtn').forEach(b=>b.addEventListener('click',()=>{
  lgType=b.dataset.lg;
  $$('.segbtn').forEach(x=>{x.className='segbtn'+(x===b?(lgType==='mila'?' sel-in':lgType==='diya'?' sel-out':' sel-cv'):'')});
  $('#convBox').classList.toggle('show',lgType==='conv');
  if(lgType==='conv'){$('#lgCur').value='THB';calcConv()}
  hap('tick')}));
function calcConv(){
  const amt=+($('#lgAmt').value)||0;
  const par=partyByName($('#ledParty').value);
  const last=(par&&par.last&&par.last.tr)?par.last.tr.v:2.848;
  const cv=$('#cvRate');if(!cv.value)cv.value=last;
  const rate=+cv.value||last;
  $('#cvLast').textContent=par&&par.last&&par.last.tr?('last: '+par.last.tr.v+' \u00B7 '+par.last.tr.d):'default';
  $('#cvThb').innerHTML=fTHB(amt);
  $('#cvInr').innerHTML=fINR(amt*rate);
  const marg=(GOLD_BUYRATE_LIVE-rate)*amt;
  $('#cvProf').innerHTML=(marg>=0?'+':'')+fINR(marg);
  $('#cvProf').style.color=marg>=0?'var(--green)':'var(--red)';
  $('#cvGuard').style.display=rate>GOLD_BUYRATE_LIVE?'':'none';
  return {amt:amt,rate:rate,inr:Math.round(amt*rate)};
}
$('#lgAmt').addEventListener('input',()=>{if(lgType==='conv')calcConv()});
$('#cvRate').addEventListener('input',calcConv);
$('#ledParty').addEventListener('change',()=>{$('#cvRate').value='';renderLedger()});
$('#lgSave').addEventListener('click',()=>{
  const par=partyByName($('#ledParty').value);
  if(!par){toast('Party chuno');hap('reject');return}
  const amt=+($('#lgAmt').value)||0;
  if(amt<=0){toast('Amount likho');hap('reject');return}
  const cur=$('#lgCur').value,note=($('#lgNote').value||'').trim();
  const bk=bookKeyOf();const b=bk==='k'?par.balK:par.balP;
  if(lgType==='conv'){
    const c=calcConv();
    if(c.rate>GOLD_BUYRATE_LIVE){toast('\u26A0 Rate ulta hai \u2014 pehle theek karo');hap('reject');return}
    DB.ledger.unshift({id:'L'+(DB.seq.lg++),party:par.n,book:bk,d:todayShort(),ds:todayISO(),neg:false,inr:0,thb:amt,txt:'Convert @'+c.rate+' \u2014 settle'+(note?' \u00B7 '+note:'')});
    DB.ledger.unshift({id:'L'+(DB.seq.lg++),party:par.n,book:bk,d:todayShort(),ds:todayISO(),neg:true,inr:c.inr,thb:0,txt:'INR cash diya (transfer @'+c.rate+')'});
    b.thb+=amt;
    par.last=par.last||{};par.last.tr={v:c.rate,d:todayShort()};
    toast('\u0E3F'+amt.toLocaleString('en-IN')+' convert \u2192 '+fINR(c.inr)+' diya \u00B7 margin book \u2713 \u00B7 rate yaad rahega');
  }else{
    const neg=lgType==='diya';
    DB.ledger.unshift({id:'L'+(DB.seq.lg++),party:par.n,book:bk,d:todayShort(),ds:todayISO(),neg:neg,inr:cur==='INR'?amt:0,thb:cur==='THB'?amt:0,txt:note||(neg?'Diya':'Mila')});
    const sign=neg?-1:1;
    if(cur==='INR')b.inr-=sign*amt;else b.thb-=sign*amt;
    toast((neg?'Diya':'Mila')+' \u2014 '+(cur==='INR'?fINR(amt):fTHB(amt))+' \u00B7 balance update \u2713');
  }
  $('#lgAmt').value='';$('#lgNote').value='';
  saveDB();renderLedger();renderDash();hap('save');
});
function renderLedger(){
  renderPartySelects();
  const par=partyByName($('#ledParty').value)||curBookParties()[0];
  if(!par)return;
  if($('#ledParty').value!==par.n)$('#ledParty').value=par.n;
  const bk=bookKeyOf();const b=bk==='k'?par.balK:par.balP;
  $('#lgBalI').innerHTML=fINR(b.inr);$('#lgBalI').className='v '+(b.inr>=0?'pos':'neg');
  $('#lgBalT').innerHTML=fTHB(b.thb);$('#lgBalT').className='v '+(b.thb>=0?'pos':'neg');
  const rows=DB.ledger.filter(l=>l.party===par.n&&l.book===bk).slice(0,30);
  $('#ledgerRows').innerHTML=rows.map(l=>'<div class="lgrow"><span class="d">'+esc(l.d)+'</span><span>'+esc(l.txt)+'</span>'+
    '<span class="amt '+(l.neg?'neg':'pos')+'">'+(l.neg?'\u2212':'+')+(l.inr?fINR(l.inr):fTHB(l.thb))+
    '<small>'+(l.inr?'INR':'THB')+'</small></span></div>').join('')||'<div style="color:var(--muted);font-size:12px;padding:10px">Is book mein '+esc(par.n)+' ki koi entry nahi</div>';
  $('#lgHero').innerHTML=fINR(Math.abs(b.inr))+(b.thb?' <span style="font-size:14px">+ '+fTHB(Math.abs(b.thb))+'</span>':'');
  $('#lgHeroName').textContent=par.n;
  $('#lgHeroDir').textContent=b.inr>=0?'Aapko lena hai':'Aapko dena hai';
  const nEl=$('#lgName');if(nEl)nEl.textContent=par.n;
  const mEl=$('#lgMeta');if(mEl)mEl.textContent=typeLabel(par.type)+' \u00B7 '+(par.city||'')+', '+(par.country||'')+' \u00B7 OPSI bhasha: '+(par.lang||'Hindi');
  calcConv();
}
/* ---------- WAREHOUSE ---------- */
let whSel='WH1';
function renderWarehouse(){
  const g=goldTotals();const avg=g.gm?Math.round(g.cost/g.gm):0;
  $('#whSub').innerHTML=DB.wh.length+' locations \u00B7 '+DB.catalog.reduce((a,c)=>a+c.qty,0).toLocaleString('en-IN')+' pcs stock \u00B7 gold <b style="color:#f0c46c">'+g.gm+' gm</b>';
  $('#whGrid').innerHTML=DB.wh.map(w=>{
    const its=DB.catalog.filter(c=>c.loc.indexOf(w.id)===0);
    return '<div class="whc'+(w.id===whSel?' sel':'')+'" data-wh="'+w.id+'"><b>'+esc(w.n)+'</b><small>'+esc(w.city)+'</small>'+
    '<div class="meter"><i style="width:'+w.fill+'%"></i></div>'+
    '<div class="st"><span><b>'+its.length+'</b>item types</span><span><b>'+w.fill+'%</b>bhara</span><span><b>'+w.sections+'</b>sections</span></div></div>'}).join('');
  $$('#whGrid .whc').forEach(c=>c.addEventListener('click',()=>{whSel=c.dataset.wh;renderWarehouse();hap('tick')}));
  const w=DB.wh.find(x=>x.id===whSel);
  const its=DB.catalog.filter(c=>c.loc.indexOf(whSel)===0);
  $('#whItemsTitle').textContent='Items \u2014 '+w.n;
  $('#whItemRows').innerHTML=its.map(c=>'<tr><td>'+c.emoji+' '+esc(c.n)+'</td><td><span class="bk '+(c.book==='k'?'on-k':'on-p')+'">'+c.book.toUpperCase()+'</span></td><td class="mono" style="text-align:right">'+c.qty.toLocaleString('en-IN')+'</td><td style="font-size:11px;color:var(--muted)">'+esc(c.loc)+'</td></tr>').join('')||'<tr><td colspan="4" style="color:var(--muted)">Yahan abhi khaali</td></tr>';
  $('#whGm').textContent=g.gm.toLocaleString('en-IN')+' gm';
  $('#whAvg').innerHTML='avg kharid \u20B9'+avg.toLocaleString('en-IN')+'/gm';
  $('#whVal').innerHTML=fINR(g.val);
  const pl=$('#whPL');pl.textContent=(g.pl>=0?'+':'')+fINR(g.pl)+' ('+g.plp.toFixed(1)+'%)';pl.className='tre-pl '+(g.pl>=0?'up':'down');
  wormChart($('#whWorm'),avg);
  $('#whLots').innerHTML=DB.lots.map(l=>{const v=(GOLD_IN-l.buy)*l.gm;
    return '<div class="lot"><span class="dotc"></span><b>'+l.gm+' gm</b><span style="color:var(--muted);font-size:11px">'+esc(l.d)+' \u00B7 '+esc(l.who)+' laya \u00B7 @\u20B9'+l.buy.toLocaleString('en-IN')+' \u00B7 '+esc(l.at)+'</span><span class="pl" style="color:'+(v>=0?'var(--green)':'var(--red)')+'">'+(v>=0?'+':'')+fINR(v)+'</span></div>'}).join('');
  $('#whUsdV').textContent='$'+usdTotal().toLocaleString('en-IN');
  $('#whUsdW').textContent=DB.usd.map(u=>u.at+' $'+u.amt.toLocaleString('en-IN')).join(' \u00B7 ');
  const recKg=DB.parcels.filter(p=>p.st==='received').reduce((a,p)=>a+p.kg,0);
  $('#bkkKg').textContent=recKg+' kg jama';
  const stMap={ordered:['p-wait','AANE WALA'],received:['p-live','BKK STORE MEIN'],clubbed:['p-done','CLUB \u2192 CARRIER']};
  $('#parcelList').innerHTML=DB.parcels.slice(0,12).map(p=>{const st2=stMap[p.st]||['p-done',p.st];
    return '<div class="bagline"><span class="bid">'+p.id+'</span><div><div>'+esc(p.platform)+' '+esc(p.order)+' \u00B7 <b>'+esc(p.item)+'</b></div><div class="its">'+esc(p.d)+' \u00B7 Sharma Textiles ke liye</div></div><span class="pill '+st2[0]+'" style="margin-left:auto">'+st2[1]+'</span><span class="kg">'+p.kg+' kg</span></div>'}).join('')+
    (recKg>=100?'<button class="btn primary" id="clubBtn" style="margin-top:10px">\uD83D\uDCE6 '+recKg+' kg ho gaya \u2014 club karke carrier ko do</button>':'<div style="font-size:11px;color:var(--muted);margin-top:8px">100 kg par OPSI khud bolega \u2014 club karke Ramesh bhai flight ya cargo se Kolkata bhejo</div>');
  const cb=$('#clubBtn');if(cb)cb.addEventListener('click',()=>{DB.parcels.forEach(p=>{if(p.st==='received')p.st='clubbed'});saveDB();renderWarehouse();hap('magic');toast('Club ho gaya \u2014 Movement mein wapsi trip ke saath jayega \u2713')});
}
/* ---------- CATALOG ---------- */
let catFilter='all',catQ='';
function renderCatalog(){
  $('#catCount').textContent=DB.catalog.length;
  const cats=['all'].concat(Array.from(new Set(DB.catalog.map(c=>c.cat))));
  $('#catChips').innerHTML=cats.map(c=>'<button class="pchip'+(c===catFilter?' sel':'')+'" data-cat="'+esc(c)+'">'+(c==='all'?'Sab':esc(c))+'</button>').join('');
  $$('#catChips .pchip').forEach(b=>b.addEventListener('click',()=>{catFilter=b.dataset.cat;renderCatalog();hap('tick')}));
  const q=catQ.toLowerCase();
  const list=DB.catalog.filter(c=>(catFilter==='all'||c.cat===catFilter)&&(!q||c.n.toLowerCase().indexOf(q)>-1));
  $('#catGrid').innerHTML=list.map(c=>{
    const ph=c.photo?'<img src="'+c.photo+'">':'<span style="filter:drop-shadow(0 4px 14px rgba(0,0,0,.4))">'+c.emoji+'</span>';
    return '<div class="itcard" data-t="'+esc(c.n)+' \u00B7 '+c.qty+' pcs \u00B7 '+esc(c.loc)+' \u00B7 \u20B9'+c.rate+'">'+
    '<div class="ph" style="background:linear-gradient(140deg,'+c.g[0]+'33,'+c.g[1]+'22),radial-gradient(80% 80% at 30% 20%,'+c.g[0]+'44,transparent)">'+ph+
    '<span class="bkc '+c.book+'">'+(c.book==='k'?'KACHCHA':'PAKKA')+'</span></div>'+
    '<div class="inf"><b>'+esc(c.n)+'</b><small>'+esc(c.cat)+' \u00B7 '+esc(c.loc)+'</small>'+
    '<div class="q"><span>'+c.qty.toLocaleString('en-IN')+' pcs</span><span style="color:var(--acc1)">\u20B9'+c.rate+'</span></div>'+
    '<div class="vards">'+Array.apply(null,{length:c.vars||3}).map((x,i)=>'<i style="background:'+PARTY_COLORS[i%8]+'55"></i>').join('')+'</div></div></div>'}).join('');
  $$('#catGrid .itcard').forEach(c=>c.addEventListener('click',()=>{toast(c.dataset.t);hap('tap')}));
}
$('#catSearch').addEventListener('input',()=>{catQ=$('#catSearch').value;renderCatalog()});
$('#btnNewItem').addEventListener('click',()=>{$('#itemForm').classList.toggle('show');hap('tap')});
let itPhotoData=null;
$('#itPhoto').addEventListener('change',()=>{
  const f=$('#itPhoto').files[0];if(!f)return;
  const img=new Image();const url=URL.createObjectURL(f);
  img.onload=()=>{const cv=document.createElement('canvas');const sc=240/Math.max(img.width,img.height);
    cv.width=Math.round(img.width*sc);cv.height=Math.round(img.height*sc);
    cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);
    itPhotoData=cv.toDataURL('image/jpeg',0.72);
    $('#itPv').innerHTML='<img src="'+itPhotoData+'">';
    URL.revokeObjectURL(url);hap('confirm');toast('Photo lag gayi \u2713')};
  img.src=url;
});
$('#itSave').addEventListener('click',()=>{
  const n=($('#itName').value||'').trim();
  if(!n){toast('Item ka naam likho');hap('reject');return}
  DB.catalog.unshift({id:'IT'+(DB.catalog.length+1)+'x',n:n,cat:$('#itCat').value,emoji:'\uD83D\uDCE6',qty:+($('#itQty').value)||0,
    loc:($('#itLoc').value||'WH1').trim(),rate:+($('#itRate').value)||0,g:[PARTY_COLORS[DB.catalog.length%8],PARTY_COLORS[(DB.catalog.length+3)%8]],photo:itPhotoData,book:bookKeyOf(),vars:2});
  itPhotoData=null;$('#itPv').innerHTML='\uD83D\uDCF7';
  ['itName','itQty','itRate','itLoc'].forEach(i=>$('#'+i).value='');
  $('#itemForm').classList.remove('show');
  saveDB();renderCatalog();hap('save');toast(n+' catalog mein aa gaya \u2713 \u2014 ab invoice/shipment mein uthega');
});
/* ============================================================
   v58 — CUSTOM SELECT ENGINE (poore app ka apna dropdown)
   Native <select> chhupa rehta hai, value/change waise hi kaam
   karte hain — upar hamara glass panel khulta hai.
   ============================================================ */
(function(){
  const bd=document.createElement('div');bd.id='csBackdrop';document.body.appendChild(bd);
  const pn=document.createElement('div');pn.id='csPanel';document.body.appendChild(pn);
  let cur=null;
  function labelOf(sel){const o=sel.options[sel.selectedIndex];return o?o.textContent:(sel.getAttribute('placeholder')||'Chuno')}
  window.dressSelect=function(sel){
    if(sel.dataset.cs)return refreshCs(sel);
    sel.dataset.cs='1';
    const w=document.createElement('div');w.className='cswrap';
    sel.parentNode.insertBefore(w,sel);w.appendChild(sel);
    sel.style.position='absolute';sel.style.opacity='0';sel.style.pointerEvents='none';
    sel.style.width='1px';sel.style.height='1px';sel.tabIndex=-1;
    const btn=document.createElement('button');btn.type='button';btn.className='cs-btn';
    if(sel.style.maxWidth)w.style.maxWidth=sel.getAttribute('style').match(/max-width:[^;]+/)?sel.style.maxWidth:'';
    btn.innerHTML='<span class="lbl"></span><svg class="car" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M6 9l6 6 6-6"/></svg>';
    w.appendChild(btn);
    btn.querySelector('.lbl').textContent=labelOf(sel);
    sel.addEventListener('change',()=>{btn.querySelector('.lbl').textContent=labelOf(sel)});
    btn.addEventListener('click',e=>{e.stopPropagation();openCs(sel,btn)});
  };
  function refreshCs(sel){
    const w=sel.closest('.cswrap');if(!w)return;
    const l=w.querySelector('.cs-btn .lbl');if(l)l.textContent=labelOf(sel);
  }
  window.dressAll=function(root){
    (root||document).querySelectorAll('select').forEach(s2=>{if(s2.id!=='__never')dressSelect(s2)});
  };
  function openCs(sel,btn){
    cur={sel:sel,btn:btn};
    let h='';
    const many=sel.querySelectorAll('option').length>9;
    if(many)h+='<div class="csrch"><input placeholder="Dhundho\u2026" id="csQ"></div>';
    h+=buildOpts(sel,'');
    pn.innerHTML=h;
    bd.classList.add('on');pn.classList.add('on');btn.classList.add('open');
    place(btn);
    const q=pn.querySelector('#csQ');
    if(q){q.addEventListener('input',()=>{
      const box=pn.querySelectorAll('.grp,.opt');box.forEach(x=>x.remove());
      pn.insertAdjacentHTML('beforeend',buildOpts(sel,q.value.toLowerCase()));bindOpts()});
      setTimeout(()=>{try{q.focus()}catch(e){}},80)}
    bindOpts();
    hap('tick');
  }
  function buildOpts(sel,q){
    let h='';
    const walk=(nodes)=>{nodes.forEach(n=>{
      if(n.tagName==='OPTGROUP'){
        const kids=Array.from(n.children).filter(o=>!q||o.textContent.toLowerCase().indexOf(q)>-1);
        if(kids.length){h+='<div class="grp">'+esc(n.label)+'</div>';walk(kids)}
      }else if(n.tagName==='OPTION'){
        if(q&&n.textContent.toLowerCase().indexOf(q)<0)return;
        h+='<div class="opt'+(n.selected?' sel':'')+'" data-v="'+esc(n.value)+'">'+esc(n.textContent)+'<span class="tk">\u2713</span></div>';
      }})};
    walk(Array.from(sel.children));
    return h||'<div class="opt" style="opacity:.5">Kuch nahi mila</div>';
  }
  function bindOpts(){
    pn.querySelectorAll('.opt[data-v]').forEach(o=>o.addEventListener('click',()=>{
      cur.sel.value=o.dataset.v;
      cur.sel.dispatchEvent(new Event('change',{bubbles:true}));
      closeCs();hap('confirm');
    }));
  }
  function place(btn){
    const r=btn.getBoundingClientRect();
    pn.style.minWidth=Math.max(190,r.width)+'px';
    const ph=Math.min(pn.scrollHeight,window.innerHeight*0.46);
    let top=r.bottom+8;
    if(top+ph>window.innerHeight-12)top=Math.max(12,r.top-ph-8);
    let left=r.left;
    if(left+pn.offsetWidth>window.innerWidth-12)left=Math.max(12,window.innerWidth-12-pn.offsetWidth);
    pn.style.top=top+'px';pn.style.left=left+'px';
  }
  function closeCs(){
    bd.classList.remove('on');pn.classList.remove('on');
    if(cur&&cur.btn)cur.btn.classList.remove('open');
    cur=null;
  }
  bd.addEventListener('click',closeCs);
  window.addEventListener('resize',closeCs);
})();

/* ============================================================
   v58 — LEDGER v3: pehle party list, tap → personal khata
   ============================================================ */
function lastEntryOf(n){const l=DB.ledger.find(x=>x.party===n&&x.book===bookKeyOf());return l?(l.d+' \u00B7 '+l.txt):'abhi koi entry nahi'}
function renderLedgerList(){
  const el=$('#lgList');if(!el)return;
  const q=(($('#lgSearch')||{}).value||'').toLowerCase();
  const list=curBookParties().filter(p=>!q||p.n.toLowerCase().indexOf(q)>-1)
    .sort((a,b)=>Math.abs(balOf(b).inr)-Math.abs(balOf(a).inr));
  el.innerHTML=list.map((p,i)=>{const b=balOf(p);
    return '<div class="lgp" data-lg-open="'+esc(p.n)+'">'+
    '<div class="pa">'+paIcon(p.n,i)+'</div>'+
    '<div class="nm"><b>'+esc(p.n)+' '+flag(p.country)+'</b><small>'+esc(lastEntryOf(p.n))+'</small></div>'+
    '<span class="dirw '+(b.inr>=0?'get':'give')+'">'+(b.inr>=0?'LENA':'DENA')+'</span>'+
    '<div class="bal '+(b.inr>=0?'pos':'neg')+'">'+fINR(b.inr)+(b.thb?'<small class="'+(b.thb>=0?'pos':'neg')+'">'+fTHB(b.thb)+'</small>':'')+'</div>'+
    '</div>'}).join('')||'<div style="color:var(--muted);padding:20px;font-size:13px">Is book mein koi party nahi</div>';
  $$('#lgList [data-lg-open]').forEach(r=>r.addEventListener('click',()=>{openLedger(r.dataset.lgOpen);hap('nav')}));
}
function openLedger(name){
  const lp=$('#ledParty');if(lp)lp.value=name;
  renderLedger();
  $('#lgOverlay').classList.add('open');
}
$('#lgBack').addEventListener('click',()=>{$('#lgOverlay').classList.remove('open');renderLedgerList();hap('nav')});
$('#lgSearch').addEventListener('input',renderLedgerList);

/* ---------- MASTER RENDER ---------- */
function renderAll(){renderDash();renderParties();renderInvoices();renderShips();renderMoves();renderLedger();renderLedgerList();renderWarehouse();renderCatalog();dressAll()}
if(!invLines.length)addLine('',0,0);
/* boot ab initV59 ke setBook se chalta hai (TDZ-safe) */
/* v59 — AIRLINE + BANK LOGOS (user-provided SVGs) */
const LOGOS={
"TG":"<svg id=\\"Layer_1\\" data-name=\\"Layer 1\\" xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 341.8 100.75\\"><g id=\\"g6837\\"><path id=\\"path5411\\" d=\\"M318,396.25a27.2,27.2,0,0,0-3.5-5.7,23.85,23.85,0,0,0-4.6-4.4,25.43,25.43,0,0,0-2.8-1.6h0a10.09,10.09,0,0,0-1.5-.7c.5-.3,1-.5,1.5-.8a27.92,27.92,0,0,0,2.8-1.6,23.85,23.85,0,0,0,4.6-4.4,24.85,24.85,0,0,0,3.5-5.7,38.35,38.35,0,0,0,2.1-6.8,40.51,40.51,0,0,0,.4-4.8c0-.7-.1-1.5-.1-2.3a25,25,0,0,0-1.3-5.9,21.37,21.37,0,0,0-2.6-5.5,30.29,30.29,0,0,0-3.9-4.8,30.65,30.65,0,0,0-5-3.9,28.42,28.42,0,0,0-6.2-2.7,27.52,27.52,0,0,0-7-1,26.11,26.11,0,0,0-6.9.6,25.5,25.5,0,0,0-11.2,6.1,22.53,22.53,0,0,0-3.7,4.9,24.16,24.16,0,0,0-2,5.9,18.41,18.41,0,0,0-.3,3.3,26.45,26.45,0,0,0,.2,2.7,39.39,39.39,0,0,0-5.9-2.8,33.46,33.46,0,0,0-8-1.3,31.09,31.09,0,0,0-7.6.8,22.43,22.43,0,0,0-6.5,2.5,29.42,29.42,0,0,0-5.5,3.7,34.89,34.89,0,0,0-3.5,3.2s-1.7,1.6-2.6,2.7-1.8,2.3-2.9,3.6l-2.2,2.8c-.6.8-1.2,1.5-1.9,2.3-.9,1-1.9,2.1-2.9,3.1a28.84,28.84,0,0,1-5.4,4.4,3.6,3.6,0,0,1-1.2.8,5.58,5.58,0,0,1-.8.5c-.2.1-.5.3-.5.6s.3.4.5.6a2,2,0,0,1,.8.4,6.22,6.22,0,0,1,1.2.8,26,26,0,0,1,5.4,4.4c1,1,2,2.1,2.9,3.1.6.7,1.2,1.4,1.9,2.3l2.2,2.8c1,1.3,2,2.6,2.9,3.6a37.32,37.32,0,0,0,2.6,2.7A26,26,0,0,0,237,408a27.92,27.92,0,0,0,5.5,3.7,25.71,25.71,0,0,0,6.5,2.5,31.09,31.09,0,0,0,7.6.8,29.12,29.12,0,0,0,8-1.3,26.31,26.31,0,0,0,5.9-2.8,22.81,22.81,0,0,0-.2,2.7,18.41,18.41,0,0,0,.3,3.3,17.93,17.93,0,0,0,2,5.9,20.36,20.36,0,0,0,3.7,4.9,20.81,20.81,0,0,0,5.1,3.7,25,25,0,0,0,6.1,2.4,26.11,26.11,0,0,0,6.9.6,27.52,27.52,0,0,0,7-1,28.42,28.42,0,0,0,6.2-2.7,30.65,30.65,0,0,0,5-3.9,30.29,30.29,0,0,0,3.9-4.8,27.68,27.68,0,0,0,2.6-5.5,25,25,0,0,0,1.3-5.9c0-.7.1-1.5.1-2.3a40.51,40.51,0,0,0-.4-4.8,25.3,25.3,0,0,0-2.1-7.2\\" transform=\\"translate(-213.1 -333.62)\\" style=\\"fill:#f5c300\\"/><path id=\\"path5413\\" d=\\"M312.2,398.55a18.88,18.88,0,0,0-3.3-5,20.62,20.62,0,0,0-4.5-3.8,23.49,23.49,0,0,0-5.4-2.4,22.14,22.14,0,0,0-6.2-.9,25.09,25.09,0,0,0-6.7.8A23.83,23.83,0,0,0,281,389a18.35,18.35,0,0,0-4.2,2.6c-1.3.9-2.5,1.9-3.7,2.8a26.51,26.51,0,0,1-7.4,4.6,17,17,0,0,1-4.6.7,16.68,16.68,0,0,1-6.2-1.2,16.1,16.1,0,0,1-5-3.5,17.5,17.5,0,0,1-3.4-5.1,18.8,18.8,0,0,1,0-12.1,16.53,16.53,0,0,1,8.4-8.6,16.68,16.68,0,0,1,6.2-1.2,17,17,0,0,1,4.6.7,16,16,0,0,1,3.9,2,28.82,28.82,0,0,1,3.5,2.6c1.2.9,2.4,2,3.7,2.8a22.64,22.64,0,0,0,4.2,2.6,31.74,31.74,0,0,0,5.1,2,29.89,29.89,0,0,0,6.7.7,22.14,22.14,0,0,0,6.2-.9,18.61,18.61,0,0,0,5.4-2.4,20.83,20.83,0,0,0,7.8-8.8,23,23,0,0,0,1.4-12.9,19.81,19.81,0,0,0-2.2-6,20.8,20.8,0,0,0-3.6-4.8,23.62,23.62,0,0,0-4.8-3.5,22.71,22.71,0,0,0-5.7-2,19.7,19.7,0,0,0-6.4-.3,17.4,17.4,0,0,0-5.9,1.7,16.71,16.71,0,0,0-7.9,8.4,17.6,17.6,0,0,0-1.3,5.7,18.23,18.23,0,0,0,.8,6.2,2.35,2.35,0,0,0,.2.8c0,.1.1.2.1.3s.1.3.2.5a.35.35,0,0,0,.2.1c.2,0,.2-.1.2-.2a2.77,2.77,0,0,0,.1-.9,11.81,11.81,0,0,1,.8-3.1A10.21,10.21,0,0,1,282,355a12.24,12.24,0,0,1,11.6-.5,9.65,9.65,0,0,1,4.1,3.9,12,12,0,0,1,1.3,5.7,11.76,11.76,0,0,1-1.6,5.8,10,10,0,0,1-4.4,4,10.78,10.78,0,0,1-5.9,1.1,16.82,16.82,0,0,1-4-1.1,18.05,18.05,0,0,1-3.7-2.4c-1.2-.9-2.5-2-3.6-3s-2.6-2.2-3.8-3.1a36.07,36.07,0,0,0-4.3-2.9,32.7,32.7,0,0,0-5.1-2.2,26.36,26.36,0,0,0-6.2-.8,27.25,27.25,0,0,0-6.4.6,16.92,16.92,0,0,0-5.1,2,18.63,18.63,0,0,0-4.1,2.8,39.84,39.84,0,0,0-3.6,3.5c-1.1,1.2-2.2,2.6-3.2,3.9s-2,2.6-3,3.8-2.2,2.5-3.3,3.6a17.93,17.93,0,0,1-3.7,3.1,3.51,3.51,0,0,1-.8.5c-.2.2-.4.2-.6.3a.85.85,0,0,0-.3.5c0,.1.2.3.3.4l.6.3a3.51,3.51,0,0,1,.8.5,21.74,21.74,0,0,1,3.7,3.1c1.1,1.1,2.3,2.4,3.3,3.6s2.1,2.6,3,3.9,2.1,2.6,3.2,3.8a39.84,39.84,0,0,0,3.6,3.5,22.86,22.86,0,0,0,4.1,2.8,24.54,24.54,0,0,0,5.1,2,22.81,22.81,0,0,0,6.4.6,26.36,26.36,0,0,0,6.2-.8,20.71,20.71,0,0,0,5.1-2.2,27.07,27.07,0,0,0,4.3-2.9c1.2-.9,2.6-2.1,3.8-3.1s2.4-2.1,3.6-3a23,23,0,0,1,3.7-2.3,11.72,11.72,0,0,1,9.9-.1,9.51,9.51,0,0,1,4.4,4,11.47,11.47,0,0,1,1.6,5.8,13,13,0,0,1-1.3,5.8,9.43,9.43,0,0,1-4.1,3.8,11.73,11.73,0,0,1-6.1,1.2A11.48,11.48,0,0,1,282,413a10.21,10.21,0,0,1-3.6-4.4,11.81,11.81,0,0,1-.8-3.1,2.77,2.77,0,0,0-.1-.9.2.2,0,0,0-.2-.2.22.22,0,0,0-.2.2c-.1.1-.1.2-.2.4s-.1.2-.1.3a2.35,2.35,0,0,0-.2.8,17.25,17.25,0,0,0,.5,11.9,14.43,14.43,0,0,0,3.2,4.8,16.37,16.37,0,0,0,4.7,3.6,19.25,19.25,0,0,0,12.3,1.4,17.66,17.66,0,0,0,5.7-2,23.62,23.62,0,0,0,4.8-3.5,20.8,20.8,0,0,0,3.6-4.8,26.14,26.14,0,0,0,2.2-6.1,21.44,21.44,0,0,0,.2-6.7,21,21,0,0,0-1.6-6.2\\" transform=\\"translate(-213.1 -333.62)\\" style=\\"fill:#370e62\\"/><path id=\\"path5415\\" d=\\"M282.3,383.85h0c0-.1,0-.2-.1-.2a20,20,0,0,1-6.8-3.5c-2.2-1.5-4.2-3.3-6.5-4.8s-4.6-2.8-7.3-2.9a11.05,11.05,0,0,0-6.2,1.3,10.12,10.12,0,0,0-4.1,4.1,11.77,11.77,0,0,0-1.5,5.9v.1h0a12,12,0,0,0,1.5,5.9,10.12,10.12,0,0,0,4.1,4.1,12,12,0,0,0,6.2,1.4,15.17,15.17,0,0,0,7.3-3c2.3-1.5,4.3-3.3,6.5-4.8a20,20,0,0,1,6.8-3.5.1.1,0,0,0,.1-.1\\" transform=\\"translate(-213.1 -333.62)\\" style=\\"fill:#b6007d\\"/><path id=\\"path5417\\" d=\\"M508.3,414.55H533c-4.9-2.9-6.5-5.7-9.6-12.8-17-39.4-23-53-23-53s-3.7,6.3-15.8,8.7a5.05,5.05,0,0,1,1.7,3.8,10.69,10.69,0,0,1-1,4.3l-16.2,36.1c-3.4,7.6-5.4,10.9-10.2,12.5-3.7-2.2-4.5-4.2-4.5-11.8V365c0-7.8.8-9.9,4.8-12.1h-22c4,2.3,4.8,4.2,4.8,12.1v12.7H411.4V365c0-7.9.7-9.9,4.8-12.1H394.1c4.1,2.3,4.8,4.2,4.8,12.1v37.3c0,7.9-.7,9.9-4.8,12.1h22.1c-4.1-2.3-4.8-4.2-4.8-12.1v-16H442v16c0,7.8-.8,9.9-4.9,12.1h43.6c-2.2-1.2-3.8-3-3.8-5.3,0-1.6.6-2.8,2-6l3.5-8.2h24.4l3.7,9.2c1,2.5,1.4,3.5,1.4,5C511.8,411.55,509.9,413.45,508.3,414.55Zm-22.8-27.1,9.2-22.1,8.9,22.1H485.5\\" transform=\\"translate(-213.1 -333.62)\\" style=\\"fill:#370e62\\"/><path id=\\"path5419\\" d=\\"M550.2,402.45v-37.3c0-7.9.8-9.8,4.7-12.1H533c4,2.4,4.7,4.2,4.7,12.1v37.3c0,7.9-.7,9.8-4.7,12.1h21.9c-3.9-2.4-4.7-4.2-4.7-12.1\\" transform=\\"translate(-213.1 -333.62)\\" style=\\"fill:#370e62\\"/><path id=\\"path5421\\" d=\\"M392.2,348.75h0c-2.3,1.8-5.9,4.2-15.6,4.2H349.1a9,9,0,0,1-8.6-5.1A50.48,50.48,0,0,1,329.8,362h25.8v39.7c0,7.9-1,10.4-4.9,12.8h22.1c-4-2.4-4.7-4.2-4.7-12.1v-37.3c0-1.1-.1-1.8-.1-3.1h3.8c5.4,0,8.3-.6,10.6-1.4,5.8-2.2,9.4-6.4,9.8-11.9h0\\" transform=\\"translate(-213.1 -333.62)\\" style=\\"fill:#370e62\\"/></g></svg>",
"WE":"<svg version=\\"1.0\\" id=\\"katman_1\\" xmlns=\\"http://www.w3.org/2000/svg\\" xmlns:xlink=\\"http://www.w3.org/1999/xlink\\" x=\\"0px\\" y=\\"0px\\" viewBox=\\"0 0 600 400\\" style=\\"enable-background:new 0 0 600 400;\\" xml:space=\\"preserve\\"><style type=\\"text/css\\"> .st0{clip-path:url(#SVGID_4_);} .st1{clip-path:url(#SVGID_5_);} .st2{clip-path:url(#SVGID_6_);fill:#D60C8C;} .st3{clip-path:url(#SVGID_6_);fill:#46166B;} .st4{clip-path:url(#SVGID_6_);fill:#F58025;} .st5{clip-path:url(#SVGID_6_);fill:#FFCF01;} .st6{clip-path:url(#SVGID_8_);fill-rule:evenodd;clip-rule:evenodd;fill:#FFCF01;} .st7{fill-rule:evenodd;clip-rule:evenodd;fill:#3E296E;} .st8{fill-rule:evenodd;clip-rule:evenodd;fill:#D60C8C;} .st9{fill-rule:evenodd;clip-rule:evenodd;fill:#472669;} </style><g><g><defs><rect id=\\"SVGID_1_\\" x=\\"228.5\\" y=\\"140.8\\" width=\\"334.2\\" height=\\"119.2\\"/></defs><defs><path id=\\"SVGID_2_\\" d=\\"M451,145.2c-0.8,4.3-3.6,8.4-6.7,11.5c-0.2,0.2-0.4,0.4-0.6,0.6c-0.8-1.4-1-3.6-1.1-4.7 c-0.6-4.1-12.9-1.2-12.2,3.3c0.5,3.5,1.7,7.4,5.4,8.7c4.5,1.7,9.7,0,13.7-2.3c6.3-3.6,12.4-11.5,13.8-18.7 c0.4-1.9-1.4-2.6-3.7-2.6C456,141,451.4,142.7,451,145.2 M469,147.7c-5.1,30.5-12.5,60.7-12.7,91.7c-0.1,10.3,15.9,10.3,15.9,0 c0.1-29.7,7.2-58.4,12.1-87.5c1-6-4.1-10-8.8-10C472.5,141.9,469.7,143.6,469,147.7 M301.3,164.5c-6.5,3.3-12.9,7-18.9,11.4 c-4.2,3.1-9.2,6.8-11.7,12c-2.5,5.3-0.2,12.1,4.8,13.8c14.9,5,33.9,2.2,47.1,9.1c0.7,0.4,1.4,0.9,2.1,1.3 c0.2,0.1,0.3,0.2,0.4,0.3c0.1,0.1,0.2,0.2,0.3,0.4c0.6,0.6,0.6,0.6,0.8,1.4c0.2,0.6,0.1,1.2-0.1,2.6c-0.4,2.1-0.9,3.4-1.7,5.1 c-2.9,6.2-8,10.1-14.2,13.5c-12.9,7-30.2,7.2-44.1,2.8c-6.4-2-12.4-5.4-16.6-10.3c-1.6-1.9-3.3-5-3.8-6.7 c-1.2-4-1.2-5.5-0.8-10.1c0.4-5.1-3.9-9.4-8-9.4c-4.7,0-7.5,4.3-8,9.4c-1.7,20.4,10.8,35.2,25.7,42.4c16.1,7.7,34.9,8,51.6,3.2 c15.5-4.5,32.7-16.8,35.6-37c3.7-25.5-21.3-29.8-37-31.8c-2.3-0.3-4.6-0.5-6.8-0.8c1.8-1.1,3.6-2.2,5.4-3.2 c4.1-2.3,8.3-4.2,12.6-5.6c0.8-0.3,1.7-0.5,2.5-0.7c1.4-0.4,1.1-0.3,1.2-0.3c0,0,0,0,0.2,0c5.2,5.7,15.8,0.6,13.1-9.2 c-2-7.3-6.8-9.7-12.2-9.7C314.1,158.4,306.4,161.9,301.3,164.5 M499.6,170.8c-12,12.3-18.3,35.2-14.7,52 c2.1,9.8,10.3,19.3,19.4,23.2c9.9,4.3,20.8,3.6,30.9,0.1c9.1-3.1,17.3-8.4,24.4-14.9c7.6-6.9-3.7-18.2-11.3-11.3 c-10.2,9.4-27.8,18.5-40.9,9.7c-3.4-2.3-5.5-5.3-6.6-8.7c6.8-2.8,12.6-8.3,17.6-13.6c6.2-6.6,11.9-14.3,14.7-23 c2.8-8.5-0.6-17.6-9.4-20.6c-2.2-0.7-4.4-1.1-6.5-1.1C510.5,162.7,504.3,165.9,499.6,170.8 M498.4,192c1.2-3,3-5.9,4.9-8.5 c1.4-1.9,4.1-4.1,5-4.4c1.8-0.7,0.9-0.5,2.8-0.5c-0.1,0,0.3,0.1,0.7,0.2c0,0.3-0.1,0.5-0.1,0.6c-1.3,5.4-6,11.3-10.1,15.9 c-2,2.2-4.2,4.4-6.4,6.3C496,198.2,497.2,194.9,498.4,192 M409.1,173.2c-8,7.6-12.6,17.5-17,27.5c-0.4,0.8-0.7,1.7-1.1,2.6 c0.2-5.4-0.2-10.7-2.4-16.1c-1.9-4.6-6.9-7.7-11.7-4.7c-4,2.5-7.5,5.6-10.5,9.1c-3.9-5.1-14.3-3.5-14.4,4.8 c-0.1,13.3-2.2,26.4-2.3,39.6c-0.1,10.4,15,10.1,15.9,0c0.8-9.4,3.8-21,9.6-29.9c-0.1,2-0.3,4-0.5,6.1 c-0.8,7.6-1.3,14.8-0.3,22.4c0.9,6.4,9.4,7,13.3,3.5c9.7-8.6,13.9-20.7,19.1-32.2c-0.4,5.5-0.7,11-0.5,16.5 c0.3,8.4,1.7,17,7,23.7c5.7,7.3,14.9,8.2,23.4,6.9c4.3-0.7,6.6-6,5.6-9.8c-1.3-4.5-5.5-6.2-9.8-5.6c-2.5,0.4-4.6,0-5.4-0.4 c-1.8-0.9-0.2,0.2-1.6-1.3c-0.1,0-0.1-0.1-0.1-0.1c-0.1-0.2-0.2-0.3-0.3-0.5c-0.4-0.6-0.7-1.3-1-1.9c0.6,1.1-0.6-2-0.7-2.5 c-0.5-1.7-0.6-3-0.7-3.8c-0.4-3.8-0.4-7.6-0.3-11.4c0.2-7.4,1-14.8,1.5-22.2c0.3-5.3,0.9-11.7-1.2-16.7c-1.5-3.5-4.6-5.8-7.9-5.8 C412.7,170.9,410.8,171.6,409.1,173.2 M436,180c-0.2,12.5-3.2,24.9-4.7,37.3c-0.5,4.3,4,8,8,8c4.7,0,7.5-3.6,8-8 c1.4-12.4,4.5-24.8,4.7-37.3c0.1-5.1-3.9-7.7-7.8-7.7C440.1,172.3,436.1,174.8,436,180\\"/></defs><defs><rect id=\\"SVGID_3_\\" x=\\"228.5\\" y=\\"140.8\\" width=\\"334.2\\" height=\\"119.2\\"/></defs><clipPath id=\\"SVGID_4_\\"><use xlink:href=\\"#SVGID_1_\\" style=\\"overflow:visible;\\"/></clipPath><clipPath id=\\"SVGID_5_\\" class=\\"st0\\"><use xlink:href=\\"#SVGID_2_\\" style=\\"overflow:visible;\\"/></clipPath><clipPath id=\\"SVGID_6_\\" class=\\"st1\\"><use xlink:href=\\"#SVGID_3_\\" style=\\"overflow:visible;\\"/></clipPath><rect x=\\"159.9\\" y=\\"112.2\\" class=\\"st2\\" width=\\"416.9\\" height=\\"92.5\\"/><rect x=\\"159.9\\" y=\\"198.3\\" class=\\"st3\\" width=\\"416.9\\" height=\\"18.5\\"/><rect x=\\"159.9\\" y=\\"228.6\\" class=\\"st4\\" width=\\"416.9\\" height=\\"40.9\\"/><rect x=\\"159.9\\" y=\\"216.8\\" class=\\"st5\\" width=\\"416.9\\" height=\\"12.6\\"/></g><g><defs><rect id=\\"SVGID_7_\\" x=\\"36.3\\" y=\\"140\\" width=\\"526.3\\" height=\\"120\\"/></defs><clipPath id=\\"SVGID_8_\\"><use xlink:href=\\"#SVGID_7_\\" style=\\"overflow:visible;\\"/></clipPath><path class=\\"st6\\" d=\\"M108.3,183c-0.7-1.5-1.5-2.8-2.4-3.9c-1-1.2-2-2.1-3.2-3c-0.6-0.5-1.2-0.9-1.9-1.2c-0.3-0.2-0.7-0.4-0.9-0.6 c0.3-0.1,0.7-0.3,0.9-0.5c0.7-0.3,1.3-0.7,1.9-1.1c1.2-0.9,2.2-1.8,3.2-3c0.9-1.2,1.7-2.5,2.4-3.9c0.7-1.4,1.1-3,1.4-4.6 c0.1-1.2,0.2-2.3,0.2-3.4v-1.5c-0.1-1.3-0.4-2.7-0.9-4c-0.5-1.3-1.1-2.6-1.8-3.7c-0.8-1.3-1.6-2.3-2.7-3.4 c-1.1-0.9-2.2-1.9-3.4-2.7c-1.4-0.7-2.7-1.3-4.2-1.7c-1.5-0.5-3.1-0.8-4.8-0.8c-1.6-0.1-3.2,0.1-4.7,0.4c-1.4,0.4-2.9,1-4.1,1.6 c-1.3,0.7-2.5,1.5-3.6,2.6c-1,1-1.8,2.1-2.5,3.3c-0.7,1.3-1.1,2.6-1.3,4c-0.2,0.8-0.2,1.4-0.2,2.2c0,0.7,0,1.3,0.1,1.8 c-1.3-0.8-2.7-1.4-4-1.8c-1.6-0.6-3.6-0.9-5.5-1c-1.8,0-3.5,0.2-5.2,0.6c-1.5,0.3-3.1,0.9-4.5,1.6c-1.4,0.7-2.6,1.6-3.8,2.6 c-0.8,0.7-1.5,1.3-2.3,2.1c0,0-1.2,1.2-1.7,1.9c-0.7,0.7-1.3,1.5-2,2.4l-1.5,1.9c-0.4,0.6-0.8,1.1-1.2,1.5 c-0.6,0.8-1.3,1.5-1.9,2.1c-1.2,1.2-2.4,2.2-3.7,3.1c-0.3,0.2-0.6,0.4-0.9,0.6c-0.2,0.1-0.4,0.2-0.6,0.3c-0.2,0.1-0.4,0.2-0.4,0.4 c0,0.3,0.2,0.4,0.4,0.5c0.2,0.1,0.4,0.2,0.6,0.3c0.3,0.2,0.6,0.4,0.9,0.6c1.3,0.9,2.6,1.9,3.7,3.1c0.7,0.7,1.3,1.4,1.9,2.1 c0.5,0.5,0.9,1,1.2,1.5l1.5,1.9c0.7,0.9,1.3,1.7,2,2.4c0.6,0.8,1.7,1.8,1.7,1.8c0.8,0.9,1.5,1.5,2.3,2.2c1.3,1,2.6,1.9,3.8,2.6 c1.4,0.8,3,1.3,4.5,1.6c1.6,0.5,3.4,0.6,5.2,0.6c1.9-0.1,3.9-0.4,5.5-0.9c1.3-0.4,2.7-1.1,4-1.8c-0.1,0.6-0.1,1.1-0.1,1.8 c0,0.8,0,1.4,0.2,2.2c0.2,1.4,0.7,2.8,1.3,4c0.7,1.3,1.5,2.4,2.5,3.4c1.1,1,2.2,1.9,3.6,2.6c1.2,0.7,2.7,1.2,4.1,1.6 c1.5,0.3,3.1,0.5,4.7,0.4c1.7,0,3.3-0.3,4.8-0.8c1.5-0.4,2.9-0.9,4.2-1.7c1.2-0.8,2.4-1.7,3.4-2.7c1.1-1.1,1.9-2.1,2.7-3.4 c0.8-1.2,1.3-2.5,1.8-3.7c0.5-1.3,0.8-2.7,0.9-4.2V191c0-1.1-0.1-2.2-0.2-3.4C109.4,186,108.9,184.5,108.3,183\\"/></g><path class=\\"st7\\" d=\\"M104.2,184.6c-0.6-1.3-1.3-2.4-2.2-3.5c-0.9-1.1-1.9-1.9-3.1-2.6c-1.2-0.8-2.5-1.4-3.8-1.6 c-1.3-0.5-2.8-0.7-4.2-0.7c-1.5,0-3,0.2-4.5,0.6c-1.3,0.3-2.4,0.7-3.5,1.2c-1.1,0.5-2,1.2-2.9,1.8c-0.9,0.6-1.7,1.3-2.5,1.9 c-0.9,0.6-1.6,1.2-2.5,1.7c-0.8,0.5-1.6,1-2.6,1.3c-1.1,0.3-2.1,0.5-3.2,0.5c-1.5,0-2.9-0.3-4.2-0.9c-1.4-0.6-2.5-1.3-3.5-2.4 c-1.1-1-1.8-2.2-2.3-3.6c-0.6-1.2-0.8-2.7-0.8-4.1c0-1.3,0.2-2.8,0.8-4c0.5-1.4,1.3-2.5,2.3-3.6c1-1.1,2.1-1.8,3.5-2.4 c1.3-0.6,2.8-0.8,4.2-0.8c1.1,0,2.1,0.2,3.2,0.5c1,0.4,1.8,0.8,2.6,1.3c0.9,0.6,1.6,1.2,2.5,1.8c0.8,0.6,1.6,1.2,2.5,1.9 c0.9,0.6,1.8,1.2,2.9,1.7c1.2,0.6,2.3,1,3.5,1.2c1.5,0.4,3,0.6,4.5,0.6c1.4,0,2.9-0.2,4.2-0.6c1.3-0.4,2.6-0.9,3.8-1.7 c1.2-0.7,2.2-1.5,3.1-2.6c1-1.1,1.6-2.2,2.2-3.5c0.6-1.3,1-2.7,1.1-4.1c0.2-1.5,0.2-3.1-0.1-4.6c-0.3-1.4-0.8-2.9-1.4-4.1 c-0.7-1.2-1.5-2.3-2.5-3.3c-1-1-2.1-1.8-3.4-2.5c-1.2-0.6-2.6-1.1-3.9-1.3c-1.3-0.3-2.9-0.4-4.3-0.2c-1.4,0.2-2.8,0.6-4,1.2 c-1.2,0.6-2.3,1.4-3.2,2.4c-1,1-1.6,2.1-2.2,3.4c-0.5,1.2-0.9,2.6-1,4c0,1.3,0.1,2.8,0.6,4.1c0,0.2,0.1,0.4,0.2,0.6 c0,0.1,0,0.2,0.1,0.3c0,0.1,0,0.2,0.1,0.3c0,0,0.1,0.1,0.2,0.1c0,0,0.1-0.1,0.1-0.2v-0.6c0.1-0.8,0.3-1.4,0.6-2.1 c0.6-1.2,1.4-2.3,2.5-3.1c1.2-0.7,2.5-1.1,3.8-1.2c1.4-0.1,2.9,0.1,4.1,0.8c1.1,0.6,2.1,1.5,2.8,2.7c0.7,1.1,1,2.6,1,4 c0,1.3-0.4,2.8-1.1,3.9c-0.7,1.2-1.7,2.1-3,2.8c-1.3,0.6-2.7,0.9-4,0.7c-1-0.1-1.9-0.4-2.8-0.8c-0.8-0.4-1.7-1-2.5-1.5 c-0.9-0.7-1.7-1.3-2.5-2c-0.9-0.8-1.7-1.5-2.6-2.2c-1-0.8-1.9-1.4-3-1.9c-1.2-0.7-2.3-1.1-3.5-1.5c-1.4-0.4-2.8-0.6-4.2-0.6 c-1.4,0-2.9,0.1-4.3,0.5c-1.2,0.3-2.4,0.7-3.5,1.3c-1,0.6-1.9,1.2-2.9,2c-0.9,0.7-1.6,1.5-2.4,2.4c-0.8,0.9-1.4,1.7-2.1,2.6 c-0.8,0.9-1.4,1.8-2.1,2.7c-0.8,0.9-1.4,1.7-2.3,2.5c-0.8,0.7-1.5,1.4-2.5,2.1c-0.2,0.1-0.4,0.2-0.6,0.3c-0.1,0.1-0.3,0.2-0.4,0.3 c-0.1,0-0.3,0.1-0.3,0.2c0,0.2,0.2,0.3,0.3,0.4c0.1,0,0.3,0.1,0.4,0.2c0.2,0.1,0.4,0.2,0.6,0.4c1,0.6,1.7,1.2,2.5,2 c0.9,0.8,1.5,1.7,2.3,2.5c0.7,0.9,1.3,1.8,2.1,2.7c0.7,0.9,1.3,1.7,2.1,2.6c0.8,0.9,1.5,1.7,2.4,2.4c1,0.8,1.9,1.5,2.9,2 c1.1,0.6,2.3,1,3.5,1.2c1.4,0.4,2.9,0.5,4.3,0.5c1.5,0,2.9-0.2,4.2-0.6c1.2-0.4,2.4-0.9,3.5-1.4c1-0.6,2-1.2,3-2 c0.9-0.6,1.7-1.4,2.6-2.1c0.8-0.8,1.6-1.5,2.5-2.1c0.8-0.6,1.6-1.2,2.5-1.5c0.9-0.4,1.8-0.7,2.8-0.8c1.3-0.2,2.8,0.1,4,0.7 c1.3,0.6,2.3,1.6,3,2.8c0.8,1.2,1.1,2.6,1.1,3.9c0,1.4-0.3,2.8-1,3.9c-0.7,1.2-1.6,2.1-2.8,2.7c-1.3,0.7-2.7,0.9-4.1,0.8 c-1.4,0-2.7-0.5-3.8-1.2c-1.1-0.8-1.9-1.8-2.5-3.1c-0.3-0.7-0.5-1.3-0.6-2.1v-0.6c0-0.1-0.1-0.2-0.1-0.2c-0.1,0-0.2,0.1-0.2,0.1 c-0.1,0.1-0.1,0.2-0.1,0.3c-0.1,0.1-0.1,0.2-0.1,0.3c-0.1,0.2-0.2,0.4-0.2,0.6c-0.5,1.4-0.6,2.8-0.6,4.1c0.1,1.4,0.5,2.7,1,3.9 c0.6,1.2,1.2,2.4,2.2,3.4c0.9,1,2,1.8,3.2,2.4c1.2,0.7,2.7,1,4,1.2c1.4,0.2,3,0.1,4.3-0.2c1.3-0.3,2.7-0.8,3.9-1.3 c1.2-0.7,2.3-1.5,3.4-2.5c1-1,1.8-2,2.5-3.3c0.7-1.2,1.2-2.7,1.4-4.1c0.3-1.5,0.3-3.1,0.1-4.6C105.2,187.2,104.8,185.9,104.2,184.6 \\"/><path class=\\"st8\\" d=\\"M83.8,174.4l-0.1-0.1c-1.7-0.4-3.3-1.3-4.6-2.3c-1.5-1.1-3-2.3-4.4-3.4c-1.6-1.1-3.3-1.9-5.1-2 c-1.4-0.1-3,0.2-4.2,1c-1.1,0.7-2.1,1.6-2.8,2.8c-0.8,1.3-1.1,2.7-1.1,4v0.1c0,1.3,0.3,2.8,1.1,4c0.7,1.1,1.6,2.1,2.8,2.8 c1.2,0.7,2.8,1.1,4.2,1c1.8-0.1,3.5-1,5.1-2c1.4-1.1,2.9-2.2,4.4-3.4c1.3-1,2.9-1.9,4.6-2.3C83.7,174.6,83.8,174.5,83.8,174.4\\"/><path class=\\"st9\\" d=\\"M216.6,176.9l6.2-14.5l5.8,14.5H216.6 M231.5,194.7h16.2c-3.2-1.9-4.2-3.8-6.2-8.5 c-11.1-25.8-15.1-34.8-15.1-34.8s-2.5,4.2-10.5,5.7c0.6,0.4,1.2,1.4,1.2,2.5c0,0.7-0.2,1.7-0.6,2.8l-10.6,23.8 c-2.3,5-3.6,7.2-6.7,8.2c-2.5-1.4-2.9-2.8-2.9-7.7v-24.5c0-5.1,0.5-6.4,3.1-7.9h-14.4c2.6,1.5,3.1,2.8,3.1,7.9v8.4h-20.1v-8.4 c0-5.1,0.6-6.4,3.2-7.9h-14.5c2.8,1.5,3.2,2.8,3.2,7.9v24.5c0,5.1-0.5,6.4-3.2,8h14.5c-2.7-1.6-3.2-2.9-3.2-8v-10.5h20.1v10.5 c0,5.1-0.6,6.4-3.2,8h28.6c-1.4-0.9-2.5-2-2.5-3.6c0-1.1,0.4-1.8,1.3-3.9l2.3-5.5h16l2.4,6.1c0.7,1.6,1,2.3,1,3.3 C233.9,192.7,232.6,193.9,231.5,194.7 M259.1,186.7v-24.5c0-5.1,0.5-6.4,3-7.9h-14.4c2.6,1.5,3.1,2.8,3.1,7.9v24.5 c0,5.1-0.5,6.4-3.1,8h14.4C259.6,193.1,259.1,191.9,259.1,186.7 M155.4,151.4c-1.5,1.3-3.9,2.9-10.2,2.9h-18.1 c-3.6,0-5.1-2.1-5.7-3.4c-1.4,3.1-4.9,7.5-7,9.3h16.9v26c0,5.2-0.8,6.9-3.2,8.5h14.4c-2.6-1.6-3-2.9-3-8v-26.6h2.4 c3.6,0,5.5-0.4,7-0.9C152.7,157.9,155.1,155,155.4,151.4\\"/></g></svg>",
"PG":"<svg id=\\"uuid-5904ef7f-1585-4591-8c01-ecbdc277c967\\" xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 1383.3 1226.8\\"><path d=\\"M955.6,1038.7h33.6v.5c-2.8,1.2-4.1,4.1-4.4,7.2,1.4,16.1,2.9,32.3,4.2,48.5.6,7.3.3,17.5,2.5,23.9,2.2,6.3,6.6,14.5,14.5,14.5,6.1-.7,8.1-4,10-9.3,2.2-9.3,2.2-16.9,2.2-25.4v-41.5c0-5.3-1.2-13.1,2.5-16.4,3.2-3.5,30.9-2,37.8-2v.5c-1.4.8-2.5,2.1-3,3.8-1.1,3.4-.6,8.1-.6,12.1v93.6c0,16.2,1.8,33.9-3.8,47.3-5.1,12.5-19.8,22.5-32,25.8-4.1,1.1-10.9,2.1-15.3,2.3-6.2.4-12.7.7-18.7.7-3.8,0-7.8-.3-10.9.9-.5.4-1.4.4-1.4,1.1h-.9v-35.8c0-.8-.6-3.5.4-3.5,0,.2.4.5.6.5,5.9,8.4,18.6,8.1,28.5,8.1,3.7-.5,6.9-1.5,10.1-3.8,6.6-4.8,6.8-11.2,6.8-19.6v-18.1c-1.1.6-.7.6-1.1.6-5.9,3.2-15.2,2.4-22.3,2-5.5-.1-10-2.2-14.4-4.4-3.2-1.6-6.2-3.1-8.8-5.4-14.4-13-14.4-45.6-17.9-64.9-1.1-8.7-2.3-17.3-3.4-25.9-.5-3.9-1.5-8.7-.2-12.2.9-2.7,3-4.1,5.4-5.7\\" style=\\"fill:#000f9f; fill-rule:evenodd;\\"/><path d=\\"M704.2,1038.7h44.6c-.1.2-3.6,1.9-4.2,5.7-.2,1.5-.3,3-.5,4.5-.9,8-.9,17.2.2,24.9.8,4,1.6,7.9,2.3,11.7.3.1-.1,0,0,0,0-.1.5-.1.5-.4,4.2-5.6,19.5-37.8,26.7-37.8,2.4,3.3,5.4,6.1,8,9.3,5.1,6.8,9,14.3,13.1,21.7,1.3,2.4,2.7,4.8,3.9,7.3.2-.1.4,0,.6,0,.7-3.7,1.5-7.6,2.3-11.2,1.1-6,1.7-28.4-1.5-32.5-.9-1.1-2.1-2.7-1.7-3.3h43.1v.5c-1.5.9-2.7,2.5-3.1,4.2-1,4.4-.9,9.4-1,14.2-.9,19.4-.8,44.5-8.8,60.2-3,5.9-6.5,11.8-10.8,17.1-2.5,2.3-4.9,4.5-7.4,6.9-4.4,3.8-8.8,8.2-13.7,11.3-.6.3-1.1.3-1.1.9h-1.1c-2.8-9.5-7.4-19.5-11.4-28.6-2.2-5-3.5-11.2-6.4-15.7-.7-1-1.8-1.9-3.2-2.1-1.7-.4-3.4.7-4.2,2.1-1.6,3.6-3.1,7.2-4.6,10.7-3.1,7.6-6.2,15.2-9.4,23-1.2,3.5-2.6,7.1-4,10.6-.7,0-.9.4-.9-.4-4.1-1.7-7.4-5.5-10.8-8.3-19.7-16.2-28-34-29.6-60.3-.4-9.1-1.1-18.4-1.6-27.6-.1-4.8.4-10.3-.9-14.6-.7-1.6-2-2.7-3.4-4\\" style=\\"fill:#000f9f; fill-rule:evenodd;\\"/><path d=\\"M624.3,1038.7h32c0,3.7-1.1,10.7,3.6,10.7,7.1-6.5,14.2-13,24.9-10,2.5.7,5.2,1.8,6.6,4,1.2,1.8,1.2,4.8,1.5,7.2,1,8.6,2.4,17.2,3.5,26h-.8c-4.3-3.4-12.7-5.8-18.9-4.4-8.9,2.5-16.4,9.1-18.5,18.2-1.1,4.5-.3,10.4-.3,15.4v23.9c0,4-1,24,2.3,24v.4h-36.6v-.4c.2,0,.7-.4.7-.5,1-1.5,1.7-3.2,1.9-5.1,0-26.5,0-52.8.1-79.2,0-7.9,1.4-24.8-2-30.2\\" style=\\"fill:#000f9f; fill-rule:evenodd;\\"/><path d=\\"M582.3,1038.7h28.6v.5c-2.1,1.1-2.9,3.4-3.3,5.7-1.4,8.4,0,18.7.2,27.1v57.7c0,6.2-1.9,24,6.2,24v.4h-41.4c0-.1.4-.3.4-.4.1,0-.1,0,0,0,1.1-1.3,2.1-2.3,2.8-3.7,1.8-4.7.9-16.9.9-23v-73c.1-2.9.3-4.9.3-7.7,0-4.9,2.5-5.9,5.3-7.6\\" style=\\"fill:#000f9f; fill-rule:evenodd;\\"/><path d=\\"M1132.1,1036.2c1.5,1.2,1.5,25.5.6,28.5-.5,1.9-1.7,3.6-3.3,4.4-1.7.7-3.4.8-5.4.8-7.9.1-9.9-3.5-15.8-5.1-2.1-.6-4.3-.1-6,1-1.4.9-2.1,2.3-2.1,4.2,0,5.9,7.2,9,10.9,12.5,16.5,15.3,37.1,34.7,20.6,58.4-4.7,6.4-14.5,13-20.3,13-2.8.2-4.5.2-7.3.3h-19.8c-5.9,0-11.4-.1-15.8,2.8-.4.2-1.3.8-1.7.8,0-12.8-.2-25.5,0-38.3,0-1-.1-2.9,1.2-2.9,0,0,1.2,2.4,6.7,6.2,4.4,3.1,19,10.1,24,5.1,2.2-2,2.4-4.9,1.7-7.8-3.2-12-12.7-15.3-21.3-22.3-13.2-11.1-23.8-29.2-12-44.9,5.7-7.9,15.7-13,25.8-13,7-.6,23-.6,30.1-.6,6.3,0,7.3-2.3,9.2-3.1\\" style=\\"fill:#000f9f; fill-rule:evenodd;\\"/><path d=\\"M585.4,979c4.4,0,8,.1,11.8,1.2,23.5,7,19.7,42.3-5.1,45.6-23.7,3.1-34.7-27.5-16.8-42,2.7-2.1,6.5-4.4,10.1-4.4v-.4Z\\" style=\\"fill:#000f9f; fill-rule:evenodd;\\"/><path d=\\"M551.7,862.9c1.5,5.1.5,14.1.5,20v246.3c0,6.3-1,13.9.8,19.4.4,1.8,2.6,5.2,4.8,5.2v.4h-50c-1.1,0-5.5.5-5.5-.4,3-1.7,5.5-5.5,6.2-8.8,1-4.3.4-10,.4-14.7v-194.7c-27.9.9-35.6,54.6-39.6,76.2-1.2,8.1-2.5,16.2-3.8,24.4,17.1,2.2,30.8,6.8,37.4,23.9,1.3,3.6,3.4,8.4,3.4,12.4-2.5-.9-4.9-1.8-7.2-2.8-3.6-1.2-7.4-1.8-11.3-2.2-9-.9-18,1.4-27.1,1.4-2.5,40.7-21.3,81.8-65.7,85.2-11.3.8-22.5-.2-32.3-2.6-2.1-.5-4.4-1.4-6.6-2.2-1.5-.7-3-1.5-4.5-2.2v-1c5.6-1.7,10.7-4.8,15.9-7.6,22.2-11.4,39.2-29.5,48-52.7,1.2-3.3,4.6-10.9,4.6-14.5-4.8.4-9.9.9-14.9.5-5.7-.5-11-3-15.5-5.8-14.8-8.6-21.3-20.8-21.3-38.4h.5q.1.3,0,.4c5.2,2,9.6,5.3,14.9,7.1,15.6,6.4,41.3,1.9,41.3,1.1h.5c0-11.4,1.7-22.6,3.5-33.2,5.6-34.7,16.9-69.4,46.2-90.7,8.7-6.3,18.4-11.2,28.5-15,15.3-5.9,31.3-10.2,41.9-24.3,2.3-3.2,4.8-6.5,6-10.1\\" style=\\"fill:#000f9f; fill-rule:evenodd;\\"/><path d=\\"M907.3,820.1c5.3,0,9.2-.3,13.9.8,4.1.9,7.5,3.2,11,6.1,2.7,2.3,5.8,5.3,7.7,8.5,5.7,9.8,5.4,21.8,5.4,34.6v44.5c0,4.6.1,9.2.3,13.8.3,1.9,1.5,7.2,4.3,7.2,0,.2-.1.3-.1.4h-21.8c-3.4,0-7.1.5-10.1-.2-2.5-.6-4.9-2.7-5.7-5-1.5-3.8-.5-10.1-.5-14.5,0-13.1-.1-26,0-38.8,0-5.1.9-11.4-.4-15.8-1.3-3.8-5.7-7.3-9.3-8.1-6.4-1.5-14.1,2.3-16.7,8.1-1.7,3.8-.6,13.3-.6,18.2v56.1h-33.3v-95.5c0-3.8-.1-7.7-.2-11.7-.2-1.8-3.3-6.3-2.7-7.7.5-.2,1.6-.4,1.6-.4,2.5-.1,5.1.1,7.5,0h17.5c2.8,0,9.3.5,9.3.5,1.5.6,4.3,4.7,4.3,6.1.2,0-.2,0,0,0,0-.2.6-.3.6-.5,2.3-1.3,4.6-2.5,7.1-3.7,2.8-1.6,6.1-2.6,10.9-3\\" style=\\"fill:#000f9f; fill-rule:evenodd;\\"/><path d=\\"M1321.5,732.2c1.1,2.3.5,5.7.5,8.5v117.6c.4,0,1.1,0,1.1-.3,8.4-3.2,18.7-14.9,22.1-24.9,1.4-4.3-.4-12.1-.4-12.1.6-.7,28-.4,32.3-.4-.6,17.5-7.3,31.7-19.8,43.5-1.7,1.5-5,4.1-7.3,4.9,0,.4,0-.3,0,0,3.6,2.3,6.5,5.3,9.4,8,13.8,13.7,23.9,38.3,23.9,58.7h-35.8v-.4c.8,0,1.7-6.5,1.4-9.7-.5-16.6-11.1-31.3-25-39-.8-.4-3.2-1.7-3.2-1.7h-.3c0,13.7.1,27.5.1,41.3.1,3.8,2.6,9,2.6,9.6h-35.8c0-.1-.1-.2,0-.4.2,0,.6-.4.6-.6,3.5-4.3,2.1-28,2.1-35.7v-117.4c-.2-3.6-.2-6.4-.4-10,.1-2.7-2.4-7-4.8-7,0,0,0-.7,1.5-2,1.4-1.1,23.1-20,35.2-30.5\\" style=\\"fill:#000f9f; fill-rule:evenodd;\\"/><path d=\\"M1107.5,732.2c1.9,2.2,1.2,28,1.1,33v93.1s.9,0,.9-.3c7.8-2.4,21-17.3,22.3-25.8.1-1.5.2-3.5-.2-7-.3-1.6-.6-4-.7-4.6,0-.1,0,0,0,0,0,0,0,.1.2,0h32.6c-.5,17.3-7.7,33.5-21,44.3-1.4,1.1-5.2,4.4-6.1,4.6,0,.4,0-.2,0,0,2.9,1.9,4.5,3.5,6.6,5.4,14,12,21.3,29.2,24.8,46.8.8,4.7,1.8,9.3,1.8,14.2h-35.7c0-.1,1.7-3.9,1.1-13.1-1.7-15.6-9.5-25.7-21.4-33.9,0,0-6-3.9-6.8-3.9,0,14.5-.6,28.1.1,42.3,0,2.1.4,4,1.2,6,.4.7,1.3,2.5,1.3,2.5h-35.7c0-.1,0,0,.7-1.4,2.5-3.3,1.9-28.1,1.9-35.7v-118.2c-.2-3,.3-6.8-.4-9.7-.7-2.2-2.4-5.7-5.3-6.1,0,0,0,.1,0,0,0,0,.5-1.1,2.5-2.8s11.8-10,18.6-15.9c5.2-4.6,11.1-8.6,15.6-13.8\\" style=\\"fill:#000f9f; fill-rule:evenodd;\\"/><path d=\\"M909.6,1039.4c-1.9.9-2.7,2.7-3.6,4.4-.1.1-.1.3-.1.4h-.5c0-.8-1.5-1.6-2.1-1.8-7.4-4.4-16.6-3.7-26.5-3.7-2.3.7-4.9,1.4-7.1,2.1-3.6,1.3-8.1,4.8-10.6,7.8-3,3.9-5.4,8.9-6.5,13.7-3.7,14.2-5.4,29.5-7.7,44.3-1,6.6-2.7,15.1-1,21.9,1.8,6.6,6.6,12.8,12.1,17.3,8.1,6.5,26.5,10.3,38.1,7.5,2.1-.5,3.7-.9,5.4-2.1,1.3-.8,2.5-2.5,4.3-2.6,2.3-.1,2.8,1.9,4.3,3.2,1.4,1.2,2.8,1.7,4.5,1.9,3.7.2,7.7.2,11.7.3h19.3v-.4c-.9,0-1.5-1-1.9-1.7-4.1-6.7-3.1-16-3.1-25v-51.9c0-8.8,0-17.5.2-26.1.3-4.1,2.8-7.3,4.7-9.8v-.5h-22.8c-3.5.1-8.1-.4-11.1.8M906.2,1119.3c-1.7,3.4-4.6,6.7-8.1,8.6-1.2.7-2.5,1.3-3.9,1.8-4.6,0-8.7-.8-11.6-4.3-7.2-10-.9-48.4,5.4-57.2,1.3-1.9,3-2.6,4.8-3.4,4.4,0,10.2-.2,12.7,3.4.8,1.1,1.2,2.2,1.2,3.8.3,10.6.2,21.2.3,31.7-.1,4.7,1.1,11.6-.8,15.6\\" style=\\"fill:#000f9f; fill-rule:evenodd;\\"/><path d=\\"M1267,860.4c-.8-5.2-1.2-10.9-2.8-15.8-1.9-5.7-5.2-11.9-9.9-16.1-10.2-9.6-32.2-8.7-40.6-7.9.5,0-6.5,1-6.5,1-14.9,2.4-24.1,12.2-27.7,24.5-2.5,8.8-3,18.8-4,28-1.1,9.1-2.6,19.9-1.3,29.6,1.7,11.1,9.3,21.7,19.5,26.9,13.1,6.8,34.8,7.1,49.6,2.7,11-3.2,20.7-11.8,24.8-22.5,5.2-13.1.7-36.4-1.1-50.4M1236.7,891.6c-.6,5.1-1,10.1-3.3,14.5-1,2.8-4.9,6.3-8.4,6.6-4.7,0-8.4-.3-11.4-3.3-7.7-7.7-6.1-24.3-5.5-35.6.2-7.6.6-15.9,4.5-21.7,1.6-2.5,5.5-3.7,7.9-3.9,4.6,0,7.4,0,10.5,3.4,5.4,5.8,4.4,19.6,5.2,28.2.4,4.5.8,7.9.5,11.8\\" style=\\"fill:#000f9f; fill-rule:evenodd;\\"/><path d=\\"M1035.7,820.6c-3.3,0-8.1,0-10,.4-2.3.8-3.4,3-3.7,5.1,0,0-3.4-2.1-4.4-2.7q-2-.8-5.3-2.2c-6-1.5-14.6-1.5-20-.7-3.2.2-6.4,1.7-6.6,1.8-4.2,1.7-9.2,5.5-11.8,9.5-8.7,13.4-8.9,31.6-12,47.9-1.6,8.4-3.9,19.9-2.7,29.2.5,3.8,2.6,7.6,4.9,10.7,9.2,11.8,24.5,17.4,40.3,16.1,6.4-.3,12-2.4,17.9-3.3v24c0,2.5.4,6.6-.3,9.6-.8,2.3-2.2,9.1-13.5,9.9-4.8.3-31.2,1.2-37.7-6.7-.1,0,0,0-.4-.5-1.1,0-.7,3.1-.7,4v39h.4c.7-6.6,19.1-5.4,24.1-5.8,9.4-1.1,19.5-.3,28.7-2.3,10.6-2.2,21.2-10,25.5-20.3,6.8-15.6,5.5-35.9,5.5-55.1v-86.2c0-3.9-.2-8.2.6-11.7.5-3.4,2.3-6.4,4.1-8.7.6-1,.6-.3.6-1h-23.5M1021.6,901.6c-.8,5-5,9.8-11,11-4.7.3-9.4-.6-12.4-4.9-7.2-9.9-1.2-49.4,5.4-57.9,1.2-1.9,2.8-2.2,4.4-3.2,4.7-1.2,12.2-.8,13.4,3.9,1.6,2.6,1.6,47.6.2,51.1\\" style=\\"fill:#000f9f; fill-rule:evenodd;\\"/><path d=\\"M800.5,820.9c-2.2,1-3.7,3.3-4.3,5.3-.1,0,.5,0,0,0,0-.2,0,.1,0,0-1,0-2.6-2.1-3.5-2.5-1.3-1-4-2-6.3-2.4-5.9-1.3-16.6-2.2-26.2,1.1-3.9,1.6-9,5.4-11.3,8.9-9.4,13.6-9.4,33.4-12.6,49.9-.6,4.9-1.2,9.6-1.8,14.4-.6,3.8-1.5,8.1-.7,12.1.9,6.7,4.7,12.7,9.6,17.2,9.7,8.9,25.9,12.6,40.1,10.3,1.9-.4,4-.8,5.7-1.8,1.5-1.1,3.2-3.2,5.1-3.2,2,0,2.9,2.1,4.4,3.4,1.4,1,3.2,1.7,4.8,2,10.3,0,20.5.1,30.6.1v-.4c-5.3,0-5.9-19.4-5.4-24,.7-7.7.3-16.1.4-24.1-.1-12.1-.1-24.5,0-36.7,0-6.3-1-15,.3-20.8.7-2.8,3-6.5,4.8-8.8v-.4h-24.9c-3,0-6.8-.5-9.1.4M796.8,900c-.8,4.7-3,7.3-5.8,9.2-1.5,1.2-4.1,1.9-6.9,2.3-6.1,0-10.9-2.4-13.2-7.7-1.8-3.8-1.1-7.3-1.1-11.7.2-12.9,2.1-33.1,8.6-42.5,1.1-1.8,3.6-3,4.7-3,5.2,0,10.1.2,13.1,4.2,1.5,2,1.9,45.6.6,49.2\\" style=\\"fill:#000f9f; fill-rule:evenodd;\\"/><path d=\\"M678.8,774.1s3.1-5,3.9-6.2c1.2-2.8,2.1-5.6,2.7-8.6,4.1-19.3-3.6-37.9-14.5-51.5-10.6-13-24.5-19.7-39.1-24.9-7-2.3-14-4.5-20.9-6.9-5.1-1.5-10.7-2.7-15-5.4-5.1-3.1-9.1-7.2-12.7-11.8-2.2-2.9-4.6-5.9-5.9-9.4h-.9v291.8c3.2,0,10.7-4.3,14.2-5.6,4.3-2,9.6-3.2,14.8-3.5,12.5-.8,25,1,37.2,1.5,23.6.6,41.1-5.6,57.3-19.4,7-6,12-13.7,16.5-21.3,20.2-34.9,8.8-72.9-16.1-100.2-5.4-6-14.6-15.8-21.5-18.6M664.8,884.1c-3.7,2.7-7.6,4.6-12,5.9-2.5.7-4.8,1.4-7.2,2.1-1.4.2-2.7.4-4.1.4-6.8,0-13.9-.2-20.8-.4,0-.2,0,.1,0,0-1,0-.6-3.6-.6-4.7v-167.4c13,6.7,30.6,18.5,27.2,36.7-.9,5.1-3.2,9.8-6.9,13.4-3.4,3.4-7.8,5.6-12.1,7.2-1.9.7-3.7,1.3-5.5,1.8-.9,0-.4,1.4-.1,2.1.8,6.2,2.7,11.8,6.9,16.1,3.1,3.3,7.3,4.7,10.9,7.1,11.4,7.3,25.2,12.7,32.9,24.8,10.5,16.4,8.1,43.3-8.6,54.9\\" style=\\"fill:#000f9f; fill-rule:evenodd;\\"/><path d=\\"M478.7,601.9c.7,2.2.5,5.4.5,8.1v13.8c.3,21.3.5,43.6.5,65.4v49.6c.1,3.4.2,6.8.4,10.1.1,11.3-.3,22.3-1.6,33-4.5,34.7-21,65.2-47.1,88.5-9.3,8.1-18.8,15-29.2,20.9-3.3,1.5-6.5,3.3-9.8,5-.3.2-.6.2-1.1.2h-1.3c-5.4-3.4-10.7-6.9-16.1-10.2-11.2-6.5-24.5-11.6-37.7-13.4-6.5-1.1-14-2.1-21-1.1-42.2,5.6-85,38.3-104.3,76-5.9,11.5-10.6,23-13,36.3-1.8,9.3-1.8,21.2-.8,31.1,3.6,36.5,16.7,66.4,41.9,91.6,13.4,13.5,27.3,24.2,42.3,34.4,5.4,3.3,11,6.9,16.5,10.2.5.5,1,.5,1,1.2h.4v.5c-22.2-.8-47.5-13.7-64.3-25.6-12.4-8.4-24.1-16.7-35.3-28-6.1-6.2-11.1-13.2-15.8-20.1-5.4-8-11.1-16-15.1-24.5-11.7-24.3-18.4-55-16.4-85.9,1.3-18.5,5.3-35.5,11-51.5,3.3-9.1,8.3-17.3,13.2-25.2,24.8-40.9,68.5-66.6,106.3-92.4,24.4-16.5,48.8-33.1,73.2-49.7,23.4-15.8,46.8-31.4,66.9-52.7,18.3-19.6,31.5-42.6,42.3-66,4.8-9.8,9.8-19.4,13.5-29.6\\" style=\\"fill:#ea0029; fill-rule:evenodd;\\"/><path d=\\"M481.8,482.3c1.1,2.9.6,6.8.6,10.2v22c0,14,.5,28.8-1.3,41.9-3.7,30-18.4,55.4-33.3,79.9-5,8.3-10.9,16-16.2,24-4.8,7-10.1,14.3-16.2,20.7-10,10.2-20.7,19.7-31.8,28-17.7,13.2-34.6,26-53.2,37.3-18.9,11.5-36.9,24.4-55.1,36.8-38.9,26.2-79,56.3-106.1,96.5-7.7,11.4-13.1,24-17.8,36.8-7.7,19.9-11.9,43.6-10.4,67.8,1.4,22.2,8.1,42.2,16.1,61,5.1,12.1,11.1,24.1,18.9,34.9,8.8,13,20.9,25.1,33.2,35.7,12.6,10.8,25.3,20.8,38.8,29.7,1.8,1.2,7,5.4,8.9,5.4v.6c-24.6-2.3-47.5-16.5-65.8-31.8-45.3-37.5-75.4-88.8-78.2-149.1-1-21,.2-41.5,6.9-59.2,27.6-71.9,94.8-127.3,155.6-173,21.4-16.2,42.5-32.4,63.8-48.5,13.6-10.5,27.5-20.9,41.2-31.3,4-4.1,8.3-8.2,12.3-12.2,21.9-22,41.3-45.3,56.8-71.1,4.5-7.2,9.1-14.6,13-22.2,6.8-14,11.9-29.2,14.9-44.9,1.4-8.7,3.9-17.1,4.4-25.9\\" style=\\"fill:#85754e; fill-rule:evenodd;\\"/><path d=\\"M475.1,0c4.2,0,8.1-.1,10.3,3.3,2.8,4,1.6,15.1,1.6,20.7,0,24.3-.7,48.4-.7,73.1,0,7.1-.3,14-.3,21,0,60.7-.6,120.4-.6,181.4v52.6c.3,19.1,1.3,38.7.9,58.1-.7,52.6-17.1,97.5-39.9,139-8.5,15.5-15.8,31.5-28,45.4-8.8,9.9-17.6,19.8-27.3,28.9-18.9,17.8-38.9,33.5-59.1,49.2-20.8,17.3-41.7,34.7-62.6,52.1-14.7,11.1-29.6,22.2-43.6,34.7-8.8,7.8-17.7,16.3-26.4,24.4-9.4,8.6-17.5,18.3-26.5,27.3-26,26.9-49.1,57.3-60.1,92-3.9,11.9-6.7,23.7-8.4,36.9-1.5,11.3-.5,24,.2,35.3,3.7,58.3,30.6,109.9,76,145.2,14.3,11.1,29,20.8,45.1,28.1,3.3,1.4,9.2,5,12.7,5v.4c-54.3-6.7-103.3-25.9-145.2-57.4-7.9-5.9-15.1-13.1-22.3-20C19,1025-6.2,951.2,1.3,871.5c3.5-37,12.1-71.5,26.7-103.1,24.7-53.4,64.8-96.3,109.9-137.2,9.8-8.3,19.7-16.4,29.7-24.7,16.8-13.5,33.3-27.5,49.9-41.8,7.7-6.8,15.5-13.5,23.2-20.1,22.7-21.4,46.1-41.9,66.8-65.5,25-28.4,49.2-57.2,70-87.9,12.3-18.4,23.7-37.5,35.1-56.2,8.7-14.6,16.1-30.1,22.8-45.8,24.4-55.8,40.1-120.5,42.2-187.2.6-21-.9-41-3.5-60.1-1.4-6.7-2.6-13.2-3.8-20.1-1-4.5-2.3-9.6-1.7-14.6.5-3.9,3.5-5.7,6.5-7.2\\" style=\\"fill:#000f9f; fill-rule:evenodd;\\"/></svg>",
"FD":"<svg id=\\"a\\" xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 290 290\\"><path d=\\"M290,144.999c0,80.078-64.913,145.001-145.006,145.001S0,225.076,0,144.999,64.922,0,144.994,0c80.092.001,145.006,64.922,145.006,144.999\\" style=\\"fill:#e32526;\\"/><path d=\\"M104.182,115.998c3.279-.593,5.716,1.4,5.471,4.431-.245,3.027-3.111,5.985-6.384,6.57-3.258.581-5.716-1.412-5.456-4.445.249-3.032,3.096-5.956,6.369-6.556M68.923,137.734c2.838-10.566,6.273-21.355,9.672-29.411-6.849,8.978-14.188,20.401-20.801,31.806,3.849-.901,7.593-1.7,11.129-2.395M127.254,129.5c2.556-.465,8.297,3.01,5.551,6.23-2.854,3.313-6.074,2.652-11.129,4.762-2.865,1.188-5.063,3.753-8.201,8.268-3.99,5.854-5.818,11.588-6.146,15.897-.027,1.279-.129,1.918-.805,2.359-6.68,4.363-8.735,1.084-8.566-2.924.043-.946.374-2.442.964-4.284-5.14,7.707-9.69,11.605-12.666,12.14-3.989.721-6.24-2.048-5.811-7.171.196-2.33.897-5.069,2.202-8.521,1.368-3.505,3.524-8.297,5.52-12.223.509-1.023,1.001-2.005,1.415-2.884-3.028.585-7.324,1.473-12.381,2.626-.068.166-.125.257-.187.267-2.149,10.038-2.318,13.822-3.476,22.574-.49,3.828.248,7.946-4.311,8.575-4.558.661-6.071-4.033-6.098-8.041-.059-4.081.695-8.985,3.579-20.856-4.736,1.206-9.742,2.593-14.696,4.114-.07.111-.119.169-.119.169-8.227,15.06-16.347,33.694-17.69,39.72-1.071,4.831-3.254,6.311-6.466,4.911-3.206-1.405-5.073-4.635-3.907-8.236,2.113-6.464,8.548-20.973,14.28-31.386-.043.019,0-.125.135-.389-4.201,1.632-8.107,3.382-11.521,5.264-2.251,1.212-5.077.092-5.619-2.422-.388-1.783-1.24-5.304,3.121-7.218,6.588-2.88,13.715-5.319,20.834-7.379,15.119-25.437,33.911-51.608,39.315-51.13,2.339.202,1.969,2.73,4.032,5.021,2.036,2.281,2.333,3.678-.104,9.725-4.997,12.412-4.599,9.521-9.394,28.884,8.793-1.458,16.447-2.299,17.164-2.41,2.427-.345,6.604,1.308,4.396,6.048,0,0-2.314,4.075-3.227,5.82-1.65,2.887-3.791,7.226-5.083,10.158-.821,1.729-1.194,3.051-1.261,4.019-.067.629.169.985.677.894.673-.122,1.66-.849,2.85-2.081,1.157-1.353,5.064-4.558,12.047-16.323l1.843-3.812c.594-1.136,1.445-3.138,1.607-4.057.193-1.366.245-1.721,1.387-2.44,1.843-1.176,5.174-2.149,7.097-.894,1.81,1.197,1.341,3.365-.162,5.995,6.086-6.853,7.651-7.135,9.01-7.359M246.337,149.311c3.422-4.208,8.716-13.862,9.047-16.498.152-1.21-.196-1.688-1.147-1.565-1.176.156-3.815,2.312-6.327,5.387-3.679,4.415-8.633,13.32-9.021,16.254-.163,1.2.327,1.988,1.173,1.887,1.361-.187,3.713-2.229,6.275-5.465M266.841,142.345c1.487-2.361,4.635-1.589,3.793.582-.727,1.879-2.101,4.929-5.604,9.067-4.305,5.293-8.27,7.861-11.854,8.337-2.89.407-4.938-.831-5.438-3.42l-.168-.527c-.009-.456-.238-.683-.489-.641-.264.028-.457.225-.94.681-3.635,3.852-6.415,6.221-9.775,6.681-5.019.656-7.94-3.262-7.229-8.947-1.343,1.988-2.73,3.898-4.007,5.307-3.922,4.357-7.137,7.125-10.12,7.515-4.025.538-6.132-2.331-5.454-7.414.303-2.316,1.166-5.013,2.639-8.435,1.53-3.413,3.903-8.105,6.096-11.932,1.751-3.136,3.441-6.682,3.704-7.891.202-.952.306-1.136,1.05-1.62.935-.664,2.78-1.451,3.905-1.54,2.841-.214,6.611,1.84,4.117,6.099l-.94,1.62c-.135.333-1.841,3.416-2.822,5.098-1.81,2.834-4.127,7.058-5.582,9.917-.903,1.702-1.341,3.004-1.46,3.952-.099.634.119,1.012.615.938.695-.086,1.718-.769,2.961-1.969,1.275-1.334,2.054-2.219,4.896-5.979l1.031-1.301c.82-1.07,7.296-9.539,9.243-11.636,5.224-6.233,11.124-10.651,14.913-11.141,2.489-.343,4.497.793,5.465,3.092.683,1.877.818,2.006,2.483,2.725,2.663,1.056,3.536,1.95,3.331,3.307-.099.968-.462,1.718-2.155,4.379-1.19,2.035-2.501,4.411-3.441,6.242-1.979,3.917-3.062,6.583-1.143,7.263.727.251,2.071-.44,3.749-2.217,1.856-1.967,3.17-3.915,4.63-6.192M232.526,122.691c3.268-.582,6.123-3.527,6.381-6.567.235-3.034-2.211-5.009-5.463-4.424-3.275.588-6.141,3.53-6.38,6.574-.261,3.027,2.201,5.005,5.462,4.417M182.835,108.317c-6.8,8.931-14.105,20.305-20.725,31.664,3.871-.885,7.591-1.65,11.068-2.308,2.858-10.53,6.265-21.311,9.657-29.356M184.543,135.768c1.953-.288,8.304-1.041,8.06,1.623-.374,4.293-1.991,4.229-7.671,5.447-1.074.242-2.217.487-3.416.741-.087.288-.179.456-.245.466-2.14,10.038-2.309,13.834-3.484,22.574-.505,3.828.244,7.946-4.313,8.575-4.556.661-6.13-4.036-6.103-8.041.016-7.088,3.592-20.985,3.61-21.067-4.636,1.181-9.607,2.525-14.553,4.068-5.893,10.008-16.633,34.12-17.962,40.146-1.081,4.831-3.261,6.311-6.482,4.896-3.205-1.39-4.996-4.592-3.897-8.221,2.991-9.976,14.298-31.581,14.476-31.971-4.194,1.685-8.104,3.493-11.475,5.416-2.088,1.188-4.752.055-5.318-2.449-.374-1.801-1.204-5.309,2.875-7.173,6.542-2.982,13.655-5.476,20.758-7.524,15.095-25.389,33.815-51.438,39.209-50.957,2.351.199,1.985,2.728,4.04,5.018,2.045,2.275,2.333,3.678-.118,9.725-4.974,12.421-4.565,9.521-9.377,28.918.474-.066.923-.142,1.386-.21M191.754,170.954c3.729-.382,14.629-2.771,14.738-14.738.025-4.632-4.402-7.074-5.478-10.303-.694-1.995-.527-6.112,2.621-7.349,3.889-1.531,4.694,1.025,6.037,2.936.558.784,2.339.597,2.948-.04.849-.882,2.089-2.202,2.624-4.443.472-2.054-1.708-5.505-8.042-5.291-2.214.049-5.346.426-9.782,4.657-2.046,1.947-8.559,10.854-3.738,18.502,1.301,2.076,4.43,4.614,2.418,6.564-3.139,3.025-8.531-1.661-9.556-3.076-.462-.651-1.8-1.412-2.679-.122-.508.74-2.927,5.052-2.553,6.646,1.089,4.975,7.509,6.351,10.442,6.057\\" style=\\"fill:#fff;\\"/></svg>",
"SL":"<svg xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 242.5 63.51\\"><defs><style>.a{fill:#fb0102;}</style></defs><path class=\\"a\\" d=\\"M398.23,498.32l-6.78,19.29c-.15.54-.3,1.09-.41,1.62a11.51,11.51,0,0,0-.25,1.56,10.36,10.36,0,0,0,0,1.6,6.15,6.15,0,0,0,.31,1.55,9.14,9.14,0,0,0,.79,1.78,5.44,5.44,0,0,0,1.29,1.45,6.08,6.08,0,0,0,1.78,1,11.14,11.14,0,0,0,2.18.51,13.64,13.64,0,0,0,1.77.08h15.59a1.86,1.86,0,0,0,.39-.06,1.58,1.58,0,0,0,.37-.19,1.66,1.66,0,0,0,.37-.31,2,2,0,0,0,.3-.46,5.1,5.1,0,0,0,.22-.52c.56-1.71,1.11-3.42,1.52-4.69s.66-2.09.81-2.57a3.51,3.51,0,0,0,.18-.73,1.23,1.23,0,0,0,0-.32.78.78,0,0,0-.12-.29.79.79,0,0,0-.23-.2.83.83,0,0,0-.27-.09c-.09,0-.2,0-.3,0H406.34a2.35,2.35,0,0,1-.52,0,1.39,1.39,0,0,1-.44-.2,1.53,1.53,0,0,1-.35-.29,1.24,1.24,0,0,1-.24-.42,2.31,2.31,0,0,1-.11-.6,2.68,2.68,0,0,1,.06-.69c.06-.27.15-.57.23-.87q2.84-8.35,5.68-16.71a1.18,1.18,0,0,0,0-.32,1,1,0,0,0-.09-.37.84.84,0,0,0-.2-.26.51.51,0,0,0-.25-.11,3,3,0,0,0-.31,0H399.56l-.26,0-.26.07-.25.13a1.22,1.22,0,0,0-.22.17,1,1,0,0,0-.2.24A2.88,2.88,0,0,0,398.23,498.32Z\\" transform=\\"translate(-390.75 -480.24)\\"/><path class=\\"a\\" d=\\"M427.1,506.14a1.52,1.52,0,0,0-.28,0,1.44,1.44,0,0,0-.28.11.87.87,0,0,0-.2.14.75.75,0,0,0-.17.17,1.57,1.57,0,0,0-.12.21l-6.43,20.84a2.05,2.05,0,0,0,0,.21.72.72,0,0,0,0,.2.43.43,0,0,0,.11.18,1,1,0,0,0,.19.15.55.55,0,0,0,.18.06l.17,0h9.84a1,1,0,0,0,.29,0,1.39,1.39,0,0,0,.27-.12.48.48,0,0,0,.2-.18,1.92,1.92,0,0,0,.17-.39l6.6-20.85a1.43,1.43,0,0,0,0-.19.75.75,0,0,0,0-.2.3.3,0,0,0-.06-.16.52.52,0,0,0-.12-.13.55.55,0,0,0-.15-.07l-.15,0H427.1Z\\" transform=\\"translate(-390.75 -480.24)\\"/><path class=\\"a\\" d=\\"M456.55,517.54c-2,4.16-11.19,4.66-9.21-.87.6-1.67,2.84-3.2,5.18-3.39,2.59-.22,5.38,1.43,4,4.28Zm10.24-.95c2.82-9.8-11.34-16.26-24.34-7-6.25,4.47-8.42,13.26-1.9,17.23,3.3,2,6.62,2.48,11.19,1.76,5.81-.92,13.16-5.47,15.05-12Z\\" transform=\\"translate(-390.75 -480.24)\\"/><path class=\\"a\\" d=\\"M433.39,495.14c3.66-.58,6.75.91,6.9,3.32s-2.7,4.84-6.36,5.42-6.75-.91-6.9-3.32S429.73,495.72,433.39,495.14Z\\" transform=\\"translate(-390.75 -480.24)\\"/><path class=\\"a\\" d=\\"M473,506l-6.71,21.4a1.47,1.47,0,0,0,0,.39.73.73,0,0,0,.08.32.59.59,0,0,0,.18.21.62.62,0,0,0,.22.11.6.6,0,0,0,.17,0h9.76a1.63,1.63,0,0,0,.29,0,1.75,1.75,0,0,0,.31-.09.74.74,0,0,0,.22-.13.89.89,0,0,0,.17-.2c0-.07.07-.15.11-.22q1.85-6.27,3.69-12.53a1.59,1.59,0,0,1,.31-.58,1.39,1.39,0,0,1,.68-.26,11.81,11.81,0,0,1,1.25-.15c.53,0,1.2-.06,1.7-.07a7.06,7.06,0,0,1,1.13,0,1.26,1.26,0,0,1,.56.2.87.87,0,0,1,.29.29,1.37,1.37,0,0,1,.18.53,3.33,3.33,0,0,1,0,.86,4.44,4.44,0,0,1-.24.86c-.12.35-.27.83-.83,2.6s-1.54,4.86-2.5,7.94a1.32,1.32,0,0,0,0,.2,1,1,0,0,0,0,.23.54.54,0,0,0,.08.22.56.56,0,0,0,.17.18.58.58,0,0,0,.23.08l.18,0h10a1.24,1.24,0,0,0,.33,0,.75.75,0,0,0,.26-.13,1.23,1.23,0,0,0,.19-.18,1.34,1.34,0,0,0,.11-.17q1.73-5.69,3.46-11.37c.07-.27.16-.53.24-1s.16-1,.2-1.53a8.07,8.07,0,0,0,0-1.33c0-.47-.11-1-.19-1.47a5,5,0,0,0-.29-1,5.77,5.77,0,0,0-.48-.84,10.17,10.17,0,0,0-.71-1.07,5.7,5.7,0,0,0-1-1,10.87,10.87,0,0,0-1.32-.87,10,10,0,0,0-1.22-.55,9.59,9.59,0,0,0-1.29-.43,9.69,9.69,0,0,0-2-.24c-.88,0-2.06,0-3,0s-1.76.1-2.46.19-1.31.21-1.87.34-1.09.27-1.63.41a13.56,13.56,0,0,1-1.66.38,8,8,0,0,1-1.6,0,5,5,0,0,1-1-.18l-1-.22a7.39,7.39,0,0,0-1-.17,12.32,12.32,0,0,0-1.26-.06c-.49,0-1,0-1.58.06Z\\" transform=\\"translate(-390.75 -480.24)\\"/><path class=\\"a\\" d=\\"M600.13,505.63l-.18,0a.59.59,0,0,0-.17.07,1,1,0,0,0-.15.13.83.83,0,0,0-.1.15,1.42,1.42,0,0,0-.07.17l-6.62,21.56a1.34,1.34,0,0,0,0,.2.5.5,0,0,0,0,.2.36.36,0,0,0,.13.16.57.57,0,0,0,.2.09.79.79,0,0,0,.2,0h10.28a1.24,1.24,0,0,0,.27,0,.62.62,0,0,0,.21-.13.93.93,0,0,0,.14-.19c0-.06,0-.12.06-.17l6.73-21.69a.71.71,0,0,0,0-.14.43.43,0,0,0,0-.15.4.4,0,0,0-.07-.14.36.36,0,0,0-.14-.09l-.17,0H600.11Z\\" transform=\\"translate(-390.75 -480.24)\\"/><path class=\\"a\\" d=\\"M606.65,494.78c3.66-.58,6.75.91,6.9,3.32s-2.7,4.84-6.36,5.42-6.75-.91-6.9-3.32S603,495.36,606.65,494.78Z\\" transform=\\"translate(-390.75 -480.24)\\"/><path class=\\"a\\" d=\\"M581.33,515.75c-.75,2.53-2.24,7.35-3.71,12.18a.53.53,0,0,0,0,.13.45.45,0,0,0,.06.17.42.42,0,0,0,.16.13.34.34,0,0,0,.15,0h10.37l.17,0,.16,0,.17-.08a.83.83,0,0,0,.17-.15,1.51,1.51,0,0,0,.13-.2l6.81-21.8a.69.69,0,0,0,0-.27.32.32,0,0,0-.12-.19.27.27,0,0,0-.17,0c-1.25,0-2.5,0-3.34,0a9,9,0,0,1-1.63-.18,10.78,10.78,0,0,1-1.1-.29c-.37-.12-.75-.27-1.09-.39s-.63-.2-1.09-.32-1.09-.28-1.62-.4-1-.2-1.59-.29-1.4-.16-2.13-.2a20.65,20.65,0,0,0-2.13,0c-.72,0-1.48.12-2.07.21a9.84,9.84,0,0,0-1.43.29c-.41.12-.83.26-1.23.41s-.81.31-1.22.51-.85.41-1.32.67a14.64,14.64,0,0,0-1.49.92c-.52.37-1,.82-1.58,1.29s-1.07,1-1.57,1.5a13.48,13.48,0,0,0-1.48,1.8,24.4,24.4,0,0,0-1.31,2.21c-.39.73-.71,1.38-1,2a14.38,14.38,0,0,0-.71,1.92,18.13,18.13,0,0,0-.53,2.59,10.71,10.71,0,0,0-.06,2,7.75,7.75,0,0,0,.2,1.29c.08.36.16.67.24.95a6.56,6.56,0,0,0,.26.75,4.51,4.51,0,0,0,.35.7,8,8,0,0,0,.47.72,8.69,8.69,0,0,0,.57.67,4.06,4.06,0,0,0,.54.52,6.07,6.07,0,0,0,.72.47,5.25,5.25,0,0,0,1,.43,6.08,6.08,0,0,0,1.21.25,11.21,11.21,0,0,0,1.23,0,10.26,10.26,0,0,0,1.09,0,4.43,4.43,0,0,0,1-.24c.35-.12.75-.28,1.09-.43a10.87,10.87,0,0,0,1-.52c.35-.2.75-.44,1.1-.68a9,9,0,0,0,1-.75,9.37,9.37,0,0,0,.86-.86,7.89,7.89,0,0,0,.56-.75c.16-.24.32-.49.48-.76a6.71,6.71,0,0,0,.44-.89,9.2,9.2,0,0,0,.28-.95,4.73,4.73,0,0,1-.52.25c-.21.08-.47.16-.86.28a10.33,10.33,0,0,1-1.35.35,4.35,4.35,0,0,1-1.18,0,2.38,2.38,0,0,1-.81-.23,2.76,2.76,0,0,1-.72-.47,2.3,2.3,0,0,1-.52-.69,2.32,2.32,0,0,1-.2-.89,8,8,0,0,1,0-1.32,9.65,9.65,0,0,1,.19-1.15c.08-.37.17-.75.29-1.13a11.17,11.17,0,0,1,.47-1.24,13.24,13.24,0,0,1,.71-1.39,9.39,9.39,0,0,1,1-1.47,11.17,11.17,0,0,1,1.49-1.46,4.89,4.89,0,0,1,1.33-.79,5,5,0,0,1,1.19-.29,4.75,4.75,0,0,1,1.09,0,3,3,0,0,1,.9.25,1.65,1.65,0,0,1,.52.42,1.72,1.72,0,0,1,.31.52,2.3,2.3,0,0,1,.16.68,3.74,3.74,0,0,1,0,.72,21.29,21.29,0,0,1-.83,3Z\\" transform=\\"translate(-390.75 -480.24)\\"/><path class=\\"a\\" d=\\"M614.74,505.63q-3.42,11-6.84,22a1.24,1.24,0,0,0,0,.27.51.51,0,0,0,.08.28.4.4,0,0,0,.21.17,1.25,1.25,0,0,0,.29.07h9.75a1.07,1.07,0,0,0,.28,0,1.83,1.83,0,0,0,.4-.15,1.1,1.1,0,0,0,.37-.31,1.7,1.7,0,0,0,.2-.43l3-10.53a8,8,0,0,1,.32-.84,2.6,2.6,0,0,1,.42-.62,4.06,4.06,0,0,1,.48-.43,3.53,3.53,0,0,1,1.06-.59,5,5,0,0,1,.71-.19,3.81,3.81,0,0,1,.71-.08,4.24,4.24,0,0,1,.63,0,3.45,3.45,0,0,1,.51.14l.61.21,5.32-6.45a5.28,5.28,0,0,0-.28-.68,3.13,3.13,0,0,0-.49-.68,4.36,4.36,0,0,0-1.65-1.09,6.08,6.08,0,0,0-1-.29,8.21,8.21,0,0,0-1.47-.19,18,18,0,0,0-2.2.06c-.74.06-1.4.17-2,.27s-1.27.17-1.89.23-1.24.1-1.86.11a16.54,16.54,0,0,1-1.71,0c-.48,0-.81-.12-1.44-.16s-1.56,0-2.49,0Z\\" transform=\\"translate(-390.75 -480.24)\\"/><path class=\\"a\\" d=\\"M555.35,496.16a9.72,9.72,0,0,1-1,1.93,9.18,9.18,0,0,1-.67-.73,3.63,3.63,0,0,1-.62-.88,6.38,6.38,0,0,0,1.2-.09A10.17,10.17,0,0,1,555.35,496.16Zm-14.11,39h0c-.06-.38-.13-.85-.19-1.32l1.21-.08h0a8.88,8.88,0,0,0,3.63-1.19,12.57,12.57,0,0,0,3.43-3.22,10.24,10.24,0,0,0,1.78-5.85v-.1a10.39,10.39,0,0,0-.14-1.62s0-.08,0-.12v0a10.48,10.48,0,0,0-.92-2.84,10.23,10.23,0,0,0-6.62-5.31,10.51,10.51,0,0,0-1.78-.32h-.19a10.3,10.3,0,0,0-5.05.88l-.44.21a10.49,10.49,0,0,0-3.23,2.54l0,0-.17-.08c-3.22-1.55-8-10.51-9.09-14.58-1.39-5-2.27-13.62-1.14-18.84.17-.81.4-2,.48-2.35-3.27-2.07-7.77.75-8.27,7.14-.82,10.3,5.5,21.08,12.87,27.48,1.07.93,1.89,1.53,2.47,2l1.58,1.15a10.36,10.36,0,0,0-.6,1.39,34.3,34.3,0,0,1-3.37-2.24c-1.08-.8-2.06-1.55-3.06-2.4a44,44,0,0,1-5.39-5.54c-2.49-2.89-6.77-10.1-7-15.1-4.84-.64-7.85,8.5,1.21,16.85,5.87,5.41,9.72,7,17.17,10.16a9.4,9.4,0,0,0-.12,1.14v.1c-1.2.1-5.66-1.32-6.93-1.78C511.7,517,509,512,507.64,510.53c-1.9,1.35-2.22,5.25-.53,7.51,2.85,3.82,9,6,13.87,6.56a49.33,49.33,0,0,0,8.32.36l1.1-.1a11.55,11.55,0,0,0,.32,1.51l-.17,0-.2,0h0a31.85,31.85,0,0,1-17.43-.92,26.3,26.3,0,0,1-4.25-2c-.54.45-1.57,8.17,8.94,8.25a24.76,24.76,0,0,0,7.56-1.22c2.14-.69,4.09-1.53,6.27-2.36a10.13,10.13,0,0,0,.71,1.17l-.3.28a2.61,2.61,0,0,1-.23.21,26.12,26.12,0,0,1-6.88,3.36c-4.14,1.33-6,1.12-10.07.64.5,5.47,6.62,4.8,10.1,3.43s5.86-4,8.46-6.62a10.35,10.35,0,0,0,.94.86,8.5,8.5,0,0,1-.75,1.33,22.81,22.81,0,0,1-7.47,6.06,12.53,12.53,0,0,1-3.93,1.17c.21,1.43,1.7,2.2,3.45,2.19,5.24,0,8.65-6.75,9.61-8.69l.54-1.09a9.26,9.26,0,0,0,1.09.53l-.4,1.31-.06.18h0a14.52,14.52,0,0,1-1.38,2.87c-2.67,4.49-5.09,5.17-5.36,5.31.61,1.07,2.47,1.35,3.86.78,3.41-1.38,3.93-6.42,4.53-9.26l.15-.76a9,9,0,0,0,1.12.23v0c.63,5.9-2,8.74-2.18,9,1.81.31,3.39,0,4.22-1.4s.42-3.59.22-5.22a21.11,21.11,0,0,0,5.38-1.15c4.44-1.48,7.39-5.26,8.61-9.68.12-.42.3-.86.4-1.31.71,0,1.5-.07,1.5-1a3,3,0,0,0-.27-.92c-.28-.44-1.45-1.19-1.45-2.41a5.84,5.84,0,0,1,.21-1c.58,0,1.4-.64,1.4-1.29,0-1-1.64-1.47-2.24-2.06a5.42,5.42,0,0,1-1.32-3c0-.55-.28-1.93.53-1.93s4.3,1.76,4.3-3.54c-1.34.64-2.32,1.08-3.67,0-1.58-1.23-.27-5.49,2.7-5.49A1.75,1.75,0,0,1,559,502a2.73,2.73,0,0,1,.51,1.54,5.83,5.83,0,0,0,1.47-1.53,6.43,6.43,0,0,0,.78-2.34c0-.4-.2-.53-.17-.85,0-.51.75-1.18-.14-1.74-.7-.44-2.08.38-4.44-.81a6.3,6.3,0,0,0-.93-.47c0-.6.21-.69.21-1.29,0-.94-2.93-2.12-3.93-2.73a10.22,10.22,0,0,1-1.9-1.43,4.55,4.55,0,0,1-1.25-1.83,1.15,1.15,0,0,0-.54-.13,1.81,1.81,0,0,0-1.72,1.4,3.26,3.26,0,0,0-.62-.53,4.93,4.93,0,0,0-.86-.47c-2-.85-3.29-.89-5.4-2a2.32,2.32,0,0,0-1.18,2.47,4.41,4.41,0,0,0-3-.28,30.25,30.25,0,0,1-3.22.34,10.05,10.05,0,0,1-1.66-.17,16.42,16.42,0,0,0-.32,1.82,3,3,0,0,0,.32,1.4,12.48,12.48,0,0,0-2.8.2,10.87,10.87,0,0,1-2.78.22,3.67,3.67,0,0,0,.34,3.2,9.71,9.71,0,0,0,1,1.53,12.24,12.24,0,0,1-2,.43,21.88,21.88,0,0,0,1,5.07,32,32,0,0,0,5.82,11,7.92,7.92,0,0,0,.75.86,7.15,7.15,0,0,1,.75-.64,12,12,0,0,1,8.05-2.69,11.73,11.73,0,0,1,11,9.06c1.11,4.37-.44,9.57-4.1,12.21a14.31,14.31,0,0,1-2,1.17,13.62,13.62,0,0,1-4.89,1.18Zm14.11-39Zm-12-1.4c0,.4.38,1.13.21,1.18-.86-.07-1.29-.9-1.29-1.82,0-1.75,3.23-2.36,3.75-.11a4.59,4.59,0,0,0-1.61-.43,1.31,1.31,0,0,0-1.08,1.18Z\\" transform=\\"translate(-390.75 -480.24)\\"/></svg>",
"VZ":"<svg xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 210 43.96\\"><defs><style>.a{fill:#e30613;}</style></defs><path class=\\"a\\" d=\\"M449.76,500.14c-1.89,0-3.49,1.52-4.59,4.09a13.26,13.26,0,0,0-.84,2.83h7.9a14.71,14.71,0,0,0,.35-2.87c0-2.64-1-4-2.83-4m7.64,11.8H444c-.13,3.42,1.05,5.88,4.42,5.88a13.82,13.82,0,0,0,6.06-1.51l.64,4.74a16.94,16.94,0,0,1-8.17,2c-5.73,0-9.1-3.76-9.1-10.11a22.83,22.83,0,0,1,3.08-11.38c2.19-3.56,5.51-5.81,9.64-5.81,5,0,7.83,3.41,7.83,9.27a31.54,31.54,0,0,1-1,7\\" transform=\\"translate(-407 -490.02)\\"/><polygon class=\\"a\\" points=\\"8.73 40.25 2.79 40.25 0 6.4 6.49 6.4 7.68 29.41 16.8 6.4 23.5 6.4 8.73 40.25\\"/><path class=\\"a\\" d=\\"M471.72,501.31h-3.51l-2.47,13.77c-.08.4-.48,2.79,1.6,2.92a4.29,4.29,0,0,0,1.84-.34s-1,5.32-5.62,5.32c-3.58,0-5.2-3.11-4.36-7.76l4.14-22.86a7,7,0,0,1,6.9-2.18c-.79,4.32-1.15,6.23-1.15,6.23h3.51Z\\" transform=\\"translate(-407 -490.02)\\"/><path class=\\"a\\" d=\\"M515.33,501.31h-3.51l-2.47,13.77c-.08.4-.48,2.79,1.6,2.92a4.29,4.29,0,0,0,1.84-.34s-1,5.32-5.62,5.32c-3.57,0-5.19-3.11-4.35-7.76L507,492.36a7,7,0,0,1,6.9-2.18c-.8,4.32-1.15,6.23-1.15,6.23h3.52Z\\" transform=\\"translate(-407 -490.02)\\"/><path class=\\"a\\" d=\\"M493.37,500.14c-1.89,0-3.49,1.52-4.59,4.09a12.41,12.41,0,0,0-.84,2.83h7.89a14.15,14.15,0,0,0,.36-2.87c0-2.64-1-4-2.82-4m7.64,11.8h-13.4c-.13,3.42,1.05,5.88,4.42,5.88a13.87,13.87,0,0,0,6.06-1.51l.64,4.74a17,17,0,0,1-8.18,2c-5.72,0-9.08-3.76-9.08-10.11a22.89,22.89,0,0,1,3.06-11.38c2.2-3.56,5.52-5.81,9.64-5.81,5,0,7.84,3.41,7.84,9.27a31.58,31.58,0,0,1-1,7\\" transform=\\"translate(-407 -490.02)\\"/><path class=\\"a\\" d=\\"M562.53,501.4a5.45,5.45,0,0,0-4.34-.2l-3.83,21.54H547.9l4.46-24.85A18,18,0,0,1,564.08,496Z\\" transform=\\"translate(-407 -490.02)\\"/><path class=\\"a\\" d=\\"M531.19,503.94l-6.73,13.9h6.6ZM531,530.27l.07-7.54H522.1l-3.61,7.54h-6.4l17.54-33.85h6.69l1.15,33.85Z\\" transform=\\"translate(-407 -490.02)\\"/><path class=\\"a\\" d=\\"M465.6,534c-5.8,0-9-4.39-8.51-9a7.46,7.46,0,0,0,11.41.64c1.17-1.18,2.13-3.07,2.92-7.62,1.37-7.75,3.91-21.61,3.91-21.61h6.49l-4.49,24.79C475.85,528.94,471.4,534,465.6,534\\" transform=\\"translate(-407 -490.02)\\"/><polygon class=\\"a\\" points=\\"26.38 32.71 19.9 32.71 24.66 6.4 31.14 6.4 26.38 32.71\\"/><polygon class=\\"a\\" points=\\"137.85 32.71 131.36 32.71 136.13 6.4 142.62 6.4 137.85 32.71\\"/><path class=\\"a\\" d=\\"M559.69,523a1.9,1.9,0,0,1-1.83-2,3,3,0,0,1,2.68-3,1.9,1.9,0,0,1,1.86,2,3,3,0,0,1-2.71,3\\" transform=\\"translate(-407 -490.02)\\"/><path class=\\"a\\" d=\\"M575.91,507.1a2.72,2.72,0,0,0-1.76-.66c-1.29,0-2.44.84-3.31,2.62a15.13,15.13,0,0,0-1.35,6.06c0,2.41.84,3.67,2.2,3.67A3.91,3.91,0,0,0,574,518l.41,3.49a6,6,0,0,1-4.21,1.45c-3.29,0-5.63-2.91-5.63-7.52a18.15,18.15,0,0,1,2.34-8.66c1.7-2.76,4.09-4.14,6.53-4.14a5.87,5.87,0,0,1,4.07,1.45Z\\" transform=\\"translate(-407 -490.02)\\"/><path class=\\"a\\" d=\\"M584.45,506.19c-1.31,0-2.25,1.17-2.91,2.91a24.41,24.41,0,0,0-1.35,7.21c0,1.66.43,2.83,1.81,2.83s2.23-1.09,2.88-2.83a25.48,25.48,0,0,0,1.38-7.24c0-1.68-.48-2.87-1.82-2.87m4.23,12.44a8,8,0,0,1-7.14,4.35c-4,0-6.08-3-6.08-7.23a18.81,18.81,0,0,1,2.29-8.76,8,8,0,0,1,7.11-4.33c4,0,6.12,2.94,6.12,7.2a19.25,19.25,0,0,1-2.29,8.77\\" transform=\\"translate(-407 -490.02)\\"/><path class=\\"a\\" d=\\"M616.88,509.08l-2.44,13.72h-4.93l2.5-13.9a6.52,6.52,0,0,0,.06-.73,1.8,1.8,0,0,0-2.06-1.94,3.5,3.5,0,0,0-2.37,1l-2.78,15.54h-4.93l2.5-13.94a5.12,5.12,0,0,0,.07-.69c0-1.21-.76-1.94-2.25-1.94a5.27,5.27,0,0,0-2.09.41l-2.88,16.17h-4.93l3.36-18.67a16.44,16.44,0,0,1,7.17-1.46,6.1,6.1,0,0,1,4.88,2,9.25,9.25,0,0,1,6.09-2c3.46,0,5.16,2.05,5.16,5a7.46,7.46,0,0,1-.12,1.43\\" transform=\\"translate(-407 -490.02)\\"/></svg>",
"TR":"<svg xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 198.35 175.08\\"><defs><style>.a{fill:#ffe900;}.b{fill:#1d1d1b;}</style></defs><path class=\\"a\\" d=\\"M500.36,599.54A87.54,87.54,0,1,0,412.82,512a87.55,87.55,0,0,0,87.54,87.54\\" transform=\\"translate(-412.82 -424.46)\\"/><polyline class=\\"b\\" points=\\"170.65 83.11 178.96 80.89 185.61 108.04 198.35 104.99 198.07 97.51 194.47 98.34 189.49 78.4 198.35 76.18 196.13 66.21 187.27 68.42 184.5 57.34 174.8 63.99 176.47 70.92 168.15 73.14 170.37 83.11\\"/><path class=\\"b\\" d=\\"M582.09,498.43A19.39,19.39,0,0,0,568,492.89c-13.3,0-19.67,10.53-19.67,19.39h0c0,8.86,6.37,19.39,19.67,19.39s19.67-10.53,19.67-19.39a20,20,0,0,0-3.32-11.08Zm-5.54,13.85a8.82,8.82,0,0,1-8.86,9.14,9,9,0,0,1-8.86-9.14h0a8.87,8.87,0,1,1,17.73,0m-28.53,0c0-8.86-6.37-19.39-19.67-19.39s-19.67,10.53-19.67,19.39h0c0,8.86,6.37,19.39,19.67,19.39S548,521.14,548,512.28m-10.8,0a8.82,8.82,0,0,1-8.86,9.14,9,9,0,0,1-8.86-9.14h0a8.82,8.82,0,0,1,8.86-9.14,9,9,0,0,1,8.86,9.14m-39.34-4.16H509a19.44,19.44,0,0,0-19.39-15.24,19,19,0,0,0-19.11,19.39A19.52,19.52,0,0,0,509,516.71H497.87a8.32,8.32,0,0,1-7.76,5c-5.26,0-8.59-3.88-8.59-9.14a9.44,9.44,0,0,1,2.49-6.65,7.8,7.8,0,0,1,6.37-2.49c3.88-.55,6.09,2.22,7.48,4.71m-39.06-3.88h10.8c-.83-9.7-9.14-11.36-14.13-11.36-7.48,0-14.13,4.71-14.13,12.47,0,5,3.88,8,8.59,9.42,6.93,2.77,9.7,3,9.7,5.54,0,1.66-1.94,2.77-3.88,2.77a3.89,3.89,0,0,1-4.16-3.32H440.8c1.11,9.7,9.42,12.19,15,12.19,8,0,15-4.71,15-12.74,0-7.76-6.65-9.7-12.74-11.36-2.77-.83-5.54-1.94-5.54-3.6,0-1.11.83-2.49,3-2.49,3-.28,3.32,1.66,3.32,2.49\\" transform=\\"translate(-412.82 -424.46)\\"/></svg>",
"6E":"<svg id=\\"uuid-4b924dd5-41b0-4e7f-8d6e-da63803e69f6\\" xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 95.38 28.75\\"><path d=\\"M89.09,8.85c.61,0,1.1.49,1.1,1.1s-.49,1.1-1.1,1.1-1.1-.49-1.1-1.1.49-1.1,1.1-1.1\\" style=\\"fill:#213f99;\\"/><path d=\\"M85.43,5.18c.61,0,1.1.49,1.1,1.1s-.49,1.1-1.1,1.1-1.1-.49-1.1-1.1.49-1.1,1.1-1.1\\" style=\\"fill:#213f99;\\"/><path d=\\"M89.09,5.18c.61,0,1.1.49,1.1,1.1s-.49,1.1-1.1,1.1-1.1-.49-1.1-1.1.49-1.1,1.1-1.1\\" style=\\"fill:#213f99;\\"/><path d=\\"M81.76,5.18c.61,0,1.1.49,1.1,1.1s-.49,1.1-1.1,1.1-1.1-.49-1.1-1.1.49-1.1,1.1-1.1\\" style=\\"fill:#213f99;\\"/><path d=\\"M92.46,2.91c.43.43.43,1.12,0,1.56-.43.43-1.12.43-1.56,0-.43-.43-.43-1.13,0-1.56.43-.43,1.13-.43,1.56,0\\" style=\\"fill:#213f99;\\"/><path d=\\"M95.06.32c.43.43.43,1.12,0,1.56-.43.43-1.12.43-1.56,0-.43-.43-.43-1.12,0-1.56.43-.43,1.13-.43,1.56,0\\" style=\\"fill:#213f99;\\"/><path d=\\"M78.09,5.18c.61,0,1.1.49,1.1,1.1s-.49,1.1-1.1,1.1-1.1-.49-1.1-1.1.49-1.1,1.1-1.1\\" style=\\"fill:#213f99;\\"/><path d=\\"M74.43,5.18c.61,0,1.1.49,1.1,1.1s-.49,1.1-1.1,1.1-1.1-.49-1.1-1.1.49-1.1,1.1-1.1\\" style=\\"fill:#213f99;\\"/><path d=\\"M89.09,12.52c.61,0,1.1.49,1.1,1.1s-.49,1.1-1.1,1.1-1.1-.49-1.1-1.1.49-1.1,1.1-1.1\\" style=\\"fill:#213f99;\\"/><path d=\\"M75.06,22.89c.61,0,1.1.49,1.1,1.1s-.49,1.1-1.1,1.1-1.1-.49-1.1-1.1.49-1.1,1.1-1.1\\" style=\\"fill:#213f99;\\"/><path d=\\"M71.39,19.22c.61,0,1.1.49,1.1,1.1s-.49,1.1-1.1,1.1-1.1-.49-1.1-1.1.49-1.1,1.1-1.1\\" style=\\"fill:#213f99;\\"/><path d=\\"M75.06,19.22c.61,0,1.1.49,1.1,1.1s-.49,1.1-1.1,1.1-1.1-.49-1.1-1.1.49-1.1,1.1-1.1\\" style=\\"fill:#213f99;\\"/><path d=\\"M67.73,19.22c.61,0,1.1.49,1.1,1.1s-.49,1.1-1.1,1.1-1.1-.49-1.1-1.1.49-1.1,1.1-1.1\\" style=\\"fill:#213f99;\\"/><path d=\\"M75.06,26.55c.61,0,1.1.49,1.1,1.1s-.49,1.1-1.1,1.1-1.1-.49-1.1-1.1.49-1.1,1.1-1.1\\" style=\\"fill:#213f99;\\"/><path d=\\"M89.09,16.18c.61,0,1.1.49,1.1,1.1s-.49,1.1-1.1,1.1-1.1-.49-1.1-1.1.49-1.1,1.1-1.1\\" style=\\"fill:#213f99;\\"/><path d=\\"M89.09,19.85c.61,0,1.1.49,1.1,1.1s-.49,1.1-1.1,1.1-1.1-.49-1.1-1.1.49-1.1,1.1-1.1\\" style=\\"fill:#213f99;\\"/><path d=\\"M80.24,14.04c.61,0,1.1.49,1.1,1.1s-.49,1.1-1.1,1.1-1.1-.49-1.1-1.1.49-1.1,1.1-1.1\\" style=\\"fill:#213f99;\\"/><path d=\\"M83.61,11.76c.43.43.43,1.12,0,1.56-.43.43-1.12.43-1.56,0-.43-.43-.43-1.13,0-1.56.43-.43,1.13-.43,1.56,0\\" style=\\"fill:#213f99;\\"/><path d=\\"M86.21,9.17c.43.43.43,1.12,0,1.56-.43.43-1.12.43-1.55,0-.43-.43-.43-1.13,0-1.56.43-.43,1.12-.43,1.55,0\\" style=\\"fill:#213f99;\\"/><path d=\\"M78.43,16.95c.43.43.43,1.12,0,1.56-.43.43-1.12.43-1.56,0-.43-.43-.43-1.12,0-1.56.43-.43,1.13-.43,1.56,0\\" style=\\"fill:#213f99;\\"/><path d=\\"M45.18,19.64c-1.57,1.34-3.42,2.01-5.55,2.01-2.28,0-4.25-.8-5.91-2.4-1.65-1.62-2.47-3.58-2.47-5.9s.82-4.28,2.47-5.9c1.66-1.63,3.63-2.45,5.91-2.45,1.35,0,2.54.22,3.56.67,1.02.43,2.05,1.17,3.09,2.21l.09.08-1.6,1.72-.09-.08c-1.02-.85-1.79-1.42-2.35-1.71-.82-.43-1.71-.65-2.7-.65-1.7,0-3.1.6-4.23,1.78-1.13,1.19-1.7,2.62-1.7,4.31s.57,3.09,1.7,4.28,2.54,1.78,4.23,1.78c1.57,0,2.89-.45,3.97-1.36,1.12-.94,1.7-2.14,1.73-3.6h-5.53v-2.23h8.01v1.47c0,2.46-.88,4.45-2.64,5.95M58.98,19.98c-1.13,1.08-2.49,1.63-4.07,1.63s-2.92-.54-4.05-1.63c-1.14-1.09-1.7-2.47-1.7-4.14s.56-3.03,1.68-4.12c1.13-1.1,2.49-1.65,4.07-1.65s2.92.55,4.05,1.65c1.15,1.09,1.72,2.46,1.72,4.12s-.57,3.06-1.7,4.14M57.37,13.21c-.64-.67-1.46-1.01-2.46-1.01s-1.84.34-2.48,1.01c-.63.65-.94,1.53-.94,2.62s.32,1.95.97,2.62c.64.67,1.46,1.01,2.46,1.01s1.82-.34,2.46-1.01c.64-.67.97-1.54.97-2.62s-.32-1.95-.97-2.62M29.55,8.91c-.23.26-.56.38-.98.38-.39,0-.73-.13-.98-.38-.23-.26-.35-.59-.35-.95s.12-.67.35-.93c.24-.26.57-.38.98-.38s.72.13.96.4c.25.25.38.55.38.9,0,.38-.12.7-.35.95M27.45,10.29h2.25v11.09h-2.25v-11.09ZM24.32,19.92c-1.04,1.12-2.39,1.68-4.03,1.68-1.73,0-3.14-.6-4.21-1.79-1.01-1.14-1.51-2.55-1.51-4.25,0-1.53.52-2.83,1.56-3.89,1.05-1.07,2.32-1.61,3.78-1.61,1.16,0,2.2.25,3.13.77l.07.04v2.41l-.19-.13c-.37-.25-.81-.47-1.32-.65-.49-.19-.94-.29-1.35-.29-1.05,0-1.88.33-2.5.99-.63.66-.94,1.53-.94,2.62s.32,1.96.97,2.65c.66.67,1.49,1.01,2.52,1.01.96,0,1.76-.37,2.39-1.1.64-.73.97-1.79.97-3.22V5.28h2.26v10.23c0,1.8-.52,3.28-1.58,4.41M10.97,21.38v-6.46c0-.79-.25-1.44-.74-1.94-.48-.52-1.07-.78-1.78-.78s-1.27.26-1.78.78c-.49.5-.74,1.15-.74,1.94v6.46h-2.23v-6.46c0-1.42.44-2.6,1.33-3.5.89-.91,2.03-1.36,3.41-1.36s2.51.45,3.41,1.36c.91.91,1.36,2.08,1.36,3.5v6.46h-2.25,0ZM0,5.28h2.37v16.1H0V5.28Z\\" style=\\"fill:#213f99;\\"/></svg>",
"AI":"<svg id=\\"Layer_1\\" data-name=\\"Layer 1\\" xmlns=\\"http://www.w3.org/2000/svg\\" xmlns:xlink=\\"http://www.w3.org/1999/xlink\\" viewBox=\\"0 0 637.15 147.22\\"><defs><linearGradient id=\\"linear-gradient\\" x1=\\"371.81\\" y1=\\"235.55\\" x2=\\"371.81\\" y2=\\"197.67\\" gradientTransform=\\"matrix(3.29, 0, 0, -3.29, -541.41, 1108.15)\\" gradientUnits=\\"userSpaceOnUse\\"><stop offset=\\"0\\" stop-color=\\"#9e7847\\"/><stop offset=\\"1\\" stop-color=\\"#dab687\\"/></linearGradient></defs><g id=\\"layer1\\"><g id=\\"g13550\\"><path id=\\"path356\\" d=\\"M330.4,374.61l-18.67,0v58.69l18.67,0Zm-136.9,0V433.4l18.67,0V421h28.74a45.46,45.46,0,0,1,7.39,12.35l19,0c-2.15-6.07-4.4-12-10.4-17.81,0,0,9.64-5,9.64-19,0-20.72-25.69-21.92-27.63-21.93Zm282.93,0v0H436.92v58.72l18.67,0h22.92c16.61,0,33.6-8.86,33.6-29.41,0-21.29-18.47-29.38-35.67-29.38Zm-380.89,0C76.8,394.86,65.46,417.5,65.43,433.38h19a43.46,43.46,0,0,1,1.11-9.56H128a42.42,42.42,0,0,1,1.39,9.56h19c0-15.87-11.37-38.52-30.13-58.74Zm64,0v58.74h18.67V374.64Zm186.17,0v58.72l18.08,0V393.55c21.89,8.52,33.74,25.84,40.94,39.8l16.3,0V374.64H402.94v26.68c-4.63-5.12-18.4-19.6-40.94-26.68Zm177.68,0v58.72l18.67,0V374.64Zm59.92,0c-18.75,20.22-30.09,42.87-30.13,58.74h19a43.45,43.45,0,0,1,1.11-9.56h42.44a42.42,42.42,0,0,1,1.39,9.56h19c0-15.87-11.37-38.52-30.13-58.74ZM106.72,385.56c5.63,5.63,12.14,15.36,16.73,25.58H89.94C93.3,403.88,98.57,395.37,106.72,385.56Zm487.75,0c5.63,5.63,12.14,15.36,16.73,25.58H577.68C581,403.88,586.32,395.37,594.46,385.56Zm-382.29,2.26h16.38c16,0,20,2.59,20,10,0,9.77-11.36,9.6-11.36,9.6h-25Zm243.41.52H472c15.77,0,21.33,6.41,21.33,15.66,0,13.06-11.06,15.64-21.33,15.64H455.59Z\\" transform=\\"translate(-65.43 -310.39)\\" style=\\"fill:#d90d2b;opacity:0.8895900249481201;isolation:isolate\\"/><path id=\\"path2662\\" d=\\"M559.94,339.59a38.12,38.12,0,0,1,25.51-10.33c25.93,0,47.23,16.4,76.48,26.22,7.52-6.55,14.6-13.54,21.51-20.7-23.16-5.1-51.62-24.39-71-24.39C593.29,310.39,580.53,316.75,559.94,339.59Z\\" transform=\\"translate(-65.43 -310.39)\\" style=\\"fill:#fedaa0\\"/><path id=\\"path2664\\" d=\\"M669.76,457.61a36.51,36.51,0,0,0,11.91-24.7c1.6-22.15-8-40.09-19.75-77.43,7.07-7,13.87-14.33,21.51-20.7,3.68,25.26,20.46,53,19.05,72.54C701.24,424.66,695.05,437.91,669.76,457.61Z\\" transform=\\"translate(-65.43 -310.39)\\" style=\\"fill:url(#linear-gradient)\\"/></g></g></svg>",
"IX":"<svg id=\\"Layer_1\\" data-name=\\"Layer 1\\" xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 634 192.14\\"><g id=\\"layer1\\"><g id=\\"g4\\"><path id=\\"path356-0-0\\" d=\\"M278.11,287.93l-14.54,0v45.72l14.54,0Zm-106.47,0v45.8l14.54,0v-9.59h22.39a35.41,35.41,0,0,1,5.76,9.62l14.8,0c-1.67-4.73-3.42-9.35-8.1-13.88,0,0,7.51-3.89,7.51-14.79,0-16.14-20-17.08-21.53-17.08Zm220.06,0H360.91v45.74l14.54,0h17.85c12.94,0,26.18-6.9,26.18-22.91,0-16.59-14.39-22.89-27.79-22.89Zm-296.36,0C80.73,303.7,71.9,321.34,71.87,333.71H86.65a33.86,33.86,0,0,1,.87-7.45h33.06a33,33,0,0,1,1.08,7.45h14.78c0-12.37-8.86-30-23.47-45.76Zm49.67,0v45.76h14.54V287.95Zm145,0v45.74l14.09,0v-31c17,6.64,26.28,20.13,31.89,31l12.69,0V287.94H334.62v20.79a72.92,72.92,0,0,0-31.89-20.79Zm138.59,0v45.74l14.54,0V287.95Zm46.33,0c-14.61,15.76-23.44,33.39-23.47,45.76h14.79a33.87,33.87,0,0,1,.87-7.45h33.06a33,33,0,0,1,1.08,7.45h14.78c0-12.37-8.86-30-23.47-45.76ZM104,296.46c4.38,4.38,9.45,12,13,19.92H91A92.35,92.35,0,0,1,104,296.46Zm379.61,0c4.38,4.38,9.45,12,13,19.92h-26.1A92.36,92.36,0,0,1,483.64,296.46Zm-297.45,1.76h12.76c10.19,0,15.56.49,15.56,7.77,0,6.46-5.38,7.48-9.72,7.48h-18.6Zm189.27.4h12.75c12.29,0,16.61,5,16.61,12.2,0,10.17-8.61,12.19-16.61,12.19H375.46Z\\" transform=\\"translate(-67 -287.93)\\" style=\\"fill:#d8233d\\"/><path id=\\"path5-4\\" d=\\"M575.62,452.7c26.51,0,39.63-6.87,39.63-26.69V422.8c0-16-6.71-22.76-29.33-26.35l-10.64-1.69c-17.05-2.71-19.25-4-19.25-12v-.68c0-8.27,5.23-11.69,22-11.69h1.18c8.95,0,21.28,1.76,33.27,5.14V360a116.94,116.94,0,0,0-34.28-5.59h-1c-26,0-39.17,7.88-39.17,27v3.21c0,17.47,8.43,22.11,28.87,25l10.81,1.52c17.38,2.44,19.87,5.75,19.87,13.18v.84c0,8.61-4,12.17-22.57,12.17h-1.18c-9.12,0-21.44-2.44-33.77-5.81v15.53c10.3,3,25.16,5.64,34.62,5.64Z\\" transform=\\"translate(-67 -287.93)\\" style=\\"fill:#ff6423\\"/><path id=\\"path5-6-2\\" d=\\"M661.37,452.7c26.51,0,39.63-6.87,39.63-26.69V422.8c0-16-6.71-22.76-29.33-26.35L661,394.76c-17.05-2.71-19.25-4-19.25-12v-.68c0-8.27,5.23-11.69,22-11.69h1.18c8.95,0,21.28,1.76,33.27,5.14V360a116.94,116.94,0,0,0-34.28-5.59h-1c-26,0-39.17,7.88-39.17,27v3.21c0,17.47,8.43,22.11,28.87,25l10.81,1.52c17.38,2.44,19.87,5.75,19.87,13.18v.84c0,8.61-4,12.17-22.57,12.17h-1.18c-9.12,0-21.44-2.44-33.77-5.81v15.53c10.3,3,25.16,5.64,34.62,5.64Z\\" transform=\\"translate(-67 -287.93)\\" style=\\"fill:#ff6423\\"/><path id=\\"path3-1-3\\" d=\\"M427.16,355.11c-19.09,0-32.42,13-32.42,13V356.44H377V451h17.73V383.8a50.71,50.71,0,0,1,41.2-11.46V355.79a46.4,46.4,0,0,0-8.78-.68Z\\" transform=\\"translate(-67 -287.93)\\" style=\\"fill:#ff6423\\"/><path id=\\"path2-5-8\\" d=\\"M290,368.12V356.44H272.26V480.07H290V446.44A77.9,77.9,0,0,0,320,452.35h1.52c27.35,0,39.33-11,39.33-41.2V390.89c0-24.82-9.72-35.77-33-35.77C303.07,355.11,290,368.12,290,368.12Zm53.17,44.22c0,18.24-5.15,23.64-25.65,23.64-18.46,0-27.52-5.23-27.52-5.23V383.8s14.31-13,30.54-13,22.63,5.55,22.63,22.94Z\\" transform=\\"translate(-67 -287.93)\\" style=\\"fill:#ff6423\\"/><path id=\\"text1-9-9-7\\" d=\\"M111.22,411c13.51,0,25.84-.51,41.37-1.69V392.41c0-26.17-9-38-39.34-38H110c-31.13,0-43,13.32-43,41V412c0,27.69,13.15,40.7,45.91,40.7h2.53a119.16,119.16,0,0,0,34.11-5.64V431.52c-11.82,3.38-21.44,5.81-32.08,5.81H116c-23.3,0-30.56-7.1-30.56-23.82V410.3C95,410.81,103.29,411,111.22,411Zm1-40.65c17.22,0,22.63,5.87,22.63,22.76v3c-8.95.51-17.05.84-25.33.84-7.6,0-15.2-.17-24.15-.68v-2.36c0-16.55,7.6-23.6,24.15-23.6Z\\" transform=\\"translate(-67 -287.93)\\" style=\\"fill:#ff6423\\"/><path id=\\"text1-9-9-5-4\\" d=\\"M485.33,411c13.51,0,25.84-.51,41.37-1.69V392.41c0-26.17-9-38-39.34-38h-3.21c-31.13,0-43,13.32-43,41V412c0,27.69,13.15,40.7,45.91,40.7h2.53a119.16,119.16,0,0,0,34.11-5.64V431.52c-11.82,3.38-21.44,5.81-32.08,5.81h-1.52c-23.3,0-30.56-7.1-30.56-23.82V410.3c9.62.51,17.9.68,25.84.68Zm1-40.65c17.22,0,22.63,5.87,22.63,22.76v3c-8.95.51-17.05.84-25.33.84-7.6,0-15.2-.17-24.15-.68v-2.36c0-16.55,7.6-23.6,24.15-23.6Z\\" transform=\\"translate(-67 -287.93)\\" style=\\"fill:#ff6423\\"/><path id=\\"path6-7-1-1-5-0-9\\" d=\\"M172.83,355.88c-10.51,0-12.78,1.94-12.78,1.94V373s2.26-1.61,9.4-1.61c7.35,0,14,2,20.63,15.36l8.47,17.07-10.21,20.29c-2,4-7.38,11.8-18.49,11.8-6.75,0-9.8-1.43-9.8-1.43v15.31s2.95,1.7,13.45,1.7c15.62,0,24.65-5.58,33.44-24.93l10.32-22.73L206.89,381c-3.89-8.52-7.07-14.72-14.1-19.81C187.53,357.43,181,355.88,172.83,355.88Zm75.85,0c-4.89,0-10.23,0-16.27,2.79s-12.51,8.73-18.11,18.24l8.1,17.71c7-11.81,12.79-23.26,27.74-23.26a32.33,32.33,0,0,1,10.5,1.64V357.34A42.61,42.61,0,0,0,248.68,355.9ZM222.4,412.76l-8.1,18.14c5.6,9.51,12,14.94,18.11,17.81s11.39,2.79,16.27,2.79a42.64,42.64,0,0,0,12-1.44V434.38a36.69,36.69,0,0,1-10.5,1.43C234,435.8,229.4,424.57,222.4,412.76Z\\" transform=\\"translate(-67 -287.93)\\" style=\\"fill:#ff6423\\"/></g></g></svg>",
"UK":"<svg id=\\"Layer_1\\" data-name=\\"Layer 1\\" xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 691.32 189.73\\"><path d=\\"M258.64,421.39h-11.5v9.06H257V433H246.94a7.25,7.25,0,0,1,.21,1.5v10.95h-2.87V418.8h15.08Z\\" transform=\\"translate(-38.34 -289.13)\\" style=\\"fill:#511d4b\\"/><path d=\\"M268,445.8c-2.92,0-4.44-1.54-4.44-4.8V416.65h2.9V441c0,1.66.5,2.2,1.61,2.2h1.4v2.6Z\\" transform=\\"translate(-38.34 -289.13)\\" style=\\"fill:#511d4b\\"/><path d=\\"M279.36,450.71c-1,2.76-2.61,3.72-6,3.72h-2.53v-2.59h2.53c2.28,0,2.79-.49,3.45-2.34l1.29-3.5-7.64-20.38h3l5.45,14.6c.22.56.44,1.62.66,2.51.24-.91.5-1.95.72-2.51l5.43-14.6h3Z\\" transform=\\"translate(-38.34 -289.13)\\" style=\\"fill:#511d4b\\"/><path d=\\"M308.22,446.06c-2.9,0-5.18-1.07-5.18-5.44v-11a3.62,3.62,0,0,1,.32-1.48h-3.73v-2.54H303v-6.73l2.89-.85v7.59H313l-.83,2.54h-6.28v12.46c0,2.35,1,3.08,3.21,3.08a5.89,5.89,0,0,0,3.19-1.09l1.79,1.83c-1.54,1.25-4,1.62-5.91,1.62\\" transform=\\"translate(-38.34 -289.13)\\" style=\\"fill:#511d4b\\"/><path d=\\"M330.7,445.48V432.73c0-4.26-1.81-5.3-4.21-5.3-1.62,0-2.74.52-4.58,1.74L320,430.45v15h-2.89V416.65h2.85V427l-.28,1.32,1.79-1.27a9.17,9.17,0,0,1,5.05-2c4.05,0,7.06,2.11,7.06,7.61v12.84Z\\" transform=\\"translate(-38.34 -289.13)\\" style=\\"fill:#511d4b\\"/><path d=\\"M346.93,427.43c-3.85,0-5.88,1.6-6.17,6.51h11.6c0-4-1-6.51-5.44-6.51m-6.17,8.94c.15,4.94,1.49,7.28,6.15,7.28,2.89,0,4.62-.95,5.55-2.87l2.5,1c-1.29,2.72-3.59,4.28-8.05,4.28-6.35,0-9.18-3.18-9.18-10.52,0-6.65,2.26-10.51,9.2-10.51,7.46,0,8.41,4.88,8.41,10.51v.83Z\\" transform=\\"translate(-38.34 -289.13)\\" style=\\"fill:#511d4b\\"/><path d=\\"M382.4,445.48V432.73c0-4.26-1.82-5.3-4.18-5.3-1.66,0-2.75.52-4.61,1.74l-2,1.28v15h-2.88V425.62h2.31l.63,2.39,1.46-1a9.06,9.06,0,0,1,5.08-2c4,0,7,2.11,7,7.61v12.84Z\\" transform=\\"translate(-38.34 -289.13)\\" style=\\"fill:#511d4b\\"/><path d=\\"M398.61,427.43c-3.86,0-5.89,1.6-6.19,6.51H404c0-4-1-6.51-5.42-6.51m-6.19,8.94c.13,4.94,1.51,7.28,6.15,7.28,2.9,0,4.61-.95,5.61-2.87l2.48,1c-1.31,2.72-3.61,4.28-8.09,4.28-6.34,0-9.22-3.18-9.22-10.52,0-6.65,2.28-10.51,9.26-10.51,7.41,0,8.38,4.88,8.38,10.51v.83Z\\" transform=\\"translate(-38.34 -289.13)\\" style=\\"fill:#511d4b\\"/><path d=\\"M430.27,445.48h-2.84l-4.09-13.29a30.81,30.81,0,0,1-.73-3.66,23.71,23.71,0,0,1-.62,3.66l-4.11,13.29H415l-6.14-19.87h2.78l4.1,13.56c.32,1,.7,3.63.7,3.63a27.23,27.23,0,0,1,.71-3.63l4.1-13.56H424l4.14,13.56a34.21,34.21,0,0,1,.6,3.71s.42-2.54.76-3.71l4.12-13.56h2.8Z\\" transform=\\"translate(-38.34 -289.13)\\" style=\\"fill:#511d4b\\"/><path d=\\"M461.45,419.7c-.79-.14-1.31-.24-1.85-.35a12.17,12.17,0,0,0-2.06-.18c-2.14,0-4,1.09-4,4.27v2.18h6.85l-.64,2.51h-6.21v17.36h-2.86V429.75a4.3,4.3,0,0,1,.33-1.63h-3.4v-2.51h3.06v-2.18c0-4.55,2.91-6.78,6.9-6.78a24.81,24.81,0,0,1,4.44.51Z\\" transform=\\"translate(-38.34 -289.13)\\" style=\\"fill:#511d4b\\"/><path d=\\"M471.26,427.43c-3.9,0-5.91,1.6-6.21,6.51h11.58c0-4-.94-6.51-5.37-6.51m-6.21,8.94c.16,4.94,1.51,7.28,6.16,7.28,2.87,0,4.62-.95,5.56-2.87l2.5,1c-1.31,2.72-3.59,4.28-8.07,4.28-6.34,0-9.22-3.18-9.22-10.52,0-6.65,2.31-10.51,9.27-10.51,7.43,0,8.36,4.88,8.36,10.51v.83Z\\" transform=\\"translate(-38.34 -289.13)\\" style=\\"fill:#511d4b\\"/><path d=\\"M492.44,427.43c-3.88,0-5.92,1.6-6.21,6.51h11.58c0-4-1-6.51-5.36-6.51m-6.21,8.94c.16,4.94,1.51,7.28,6.15,7.28,2.88,0,4.61-.95,5.58-2.87l2.48,1c-1.32,2.72-3.61,4.28-8.06,4.28-6.32,0-9.21-3.18-9.21-10.52,0-6.65,2.26-10.51,9.26-10.51,7.4,0,8.36,4.88,8.36,10.51v.83Z\\" transform=\\"translate(-38.34 -289.13)\\" style=\\"fill:#511d4b\\"/><path d=\\"M509.53,445.8c-2.93,0-4.4-1.54-4.4-4.8V416.65H508V441c0,1.66.53,2.2,1.64,2.2H511v2.6Z\\" transform=\\"translate(-38.34 -289.13)\\" style=\\"fill:#511d4b\\"/><path d=\\"M514.31,425.62h2.89v19.87h-2.89Zm3-5.4h-3l-.24-.29V417l.24-.37h3l.25.37v2.89Z\\" transform=\\"translate(-38.34 -289.13)\\" style=\\"fill:#511d4b\\"/><path d=\\"M535.9,445.48V432.73c0-4.26-1.76-5.3-4.16-5.3-1.68,0-2.78.52-4.61,1.74l-2,1.28v15H522.3V425.62h2.29l.63,2.39,1.44-1a9.12,9.12,0,0,1,5.08-2c4,0,7.05,2.11,7.05,7.61v12.84Z\\" transform=\\"translate(-38.34 -289.13)\\" style=\\"fill:#511d4b\\"/><path d=\\"M551.73,427.4c-3.16,0-5.15,1.25-5.15,4.61,0,3.53,2.28,4.47,5.15,4.47,3.26,0,5.18-.9,5.18-4.47,0-3-1.77-4.61-5.18-4.61M555.53,445l-8.44-1.55a4.84,4.84,0,0,0-2,4.23c0,3.33,2.23,4.4,6.57,4.4,4.87,0,6.53-1.53,6.53-3.94a2.8,2.8,0,0,0-2.69-3.14m6-17.19h-1.42a6.75,6.75,0,0,1-1.84-.25,6.94,6.94,0,0,1,1.6,4.4c0,4.62-2.64,6.8-8.1,6.8a16.35,16.35,0,0,1-2.27-.19l-1.4-.25a1.44,1.44,0,0,0-1.66,1.54c0,.79.44,1.19,1.39,1.39l8.19,1.42c4.31.77,5.19,3,5.19,5.45,0,4.76-4.17,6.19-9.47,6.19-4.37,0-9.53-.73-9.53-6.65a6.32,6.32,0,0,1,2.81-5.26,3.11,3.11,0,0,1,.8-5.38,6.4,6.4,0,0,1-2.16-5.08c0-5,3.74-7,8.1-7a10,10,0,0,1,5.23,1.18L560,425h2Z\\" transform=\\"translate(-38.34 -289.13)\\" style=\\"fill:#511d4b\\"/><path d=\\"M245.57,328.53h11.92a2.1,2.1,0,0,1,2.07,1.29c6.36,11.68,27.71,49.92,27.71,49.92s21.75-38.24,28.21-50a2,2,0,0,1,2-1.19h6a1.24,1.24,0,0,1,1.05,1.83l-32.22,56.27a2.29,2.29,0,0,1-2.18,1.44H278.92a2.69,2.69,0,0,1-2.32-1.62c-4.4-7.64-24.67-43.06-32.05-56-.28-.48-.75-2,1-2\\" transform=\\"translate(-38.34 -289.13)\\" style=\\"fill:#511d4b\\"/><path d=\\"M424.58,338.74a55.29,55.29,0,0,0-27-6.67c-15.6,0-18.66,6.71-18.66,11.44,0,5.92,6.15,7.6,13.26,8.1,4.39.32,15.35.83,21.29,1.92,14.2,2.6,18,10.55,18,16.95,0,13.41-15.61,19.13-34.58,19.13A68.29,68.29,0,0,1,364.73,382a1.66,1.66,0,0,1-.45-2.3c1.15-2.12.78-1.4,1.76-3.22a1.39,1.39,0,0,1,2.14-.61c3.76,2.35,15.81,8.21,28.67,8.21,13.25,0,20.53-5.79,20.53-11.6,0-4.89-1.88-7.88-11.9-9.26-5.31-.72-17.22-.78-23.22-2.16s-16.55-4.28-16.55-16c0-6.51,5.17-18.5,32.47-18.5,14.92,0,24.84,4,29.75,6.58a1.34,1.34,0,0,1,.59,2c-.8,1.33-1.14,1.89-1.93,3.3a1.44,1.44,0,0,1-2,.33\\" transform=\\"translate(-38.34 -289.13)\\" style=\\"fill:#511d4b\\"/><path d=\\"M348,328.53H338.3a1.85,1.85,0,0,0-1.85,1.85v55.69a1.94,1.94,0,0,0,1.85,2H348a1.94,1.94,0,0,0,1.85-2V330.38a1.85,1.85,0,0,0-1.85-1.85\\" transform=\\"translate(-38.34 -289.13)\\" style=\\"fill:#511d4b\\"/><path d=\\"M489,384.9c-.89-2.39-.53-1.51-1.27-3.67a1.35,1.35,0,0,0-2-.83,38.31,38.31,0,0,1-12.95,2.9c-9.57,0-15.2-4.17-15.2-12.72V335.94h26.95a1.91,1.91,0,0,0,2-1.83v-2.75a1.91,1.91,0,0,0-2-1.81H457.61V315.13a1.5,1.5,0,0,0-2-1.5c-2.35.77-6.71,2.19-9.08,2.94a2.39,2.39,0,0,0-1.64,2.37V367.5c0,12.07,7.06,22,26.08,22a59.21,59.21,0,0,0,16.9-2.68A1.42,1.42,0,0,0,489,384.9\\" transform=\\"translate(-38.34 -289.13)\\" style=\\"fill:#511d4b\\"/><path d=\\"M595.06,362V334.43h27.51c8.77,0,12.55,7.07,12.55,13.16,0,6.84-3.35,14.45-14.53,14.45Zm54.4,23.29c-6.8-5.19-22-16.68-23.9-18.1,10.73,0,23.56-6.13,23.56-19.73,0-15-14.53-19-21.3-19l-43.94,0a1.94,1.94,0,0,0-1.84,2V386a1.94,1.94,0,0,0,1.84,2h9.31a1.93,1.93,0,0,0,1.85-2V367.83h14.45s16.44,13.34,22.22,18.06c.46.42,2.52,2.2,4.7,2.2h12.82c.87,0,1.79-1.57.24-2.76\\" transform=\\"translate(-38.34 -289.13)\\" style=\\"fill:#511d4b\\"/><path d=\\"M526.82,383.63c-13.07,0-16.52-6.64-16.52-13.08,0-10.82,13-12.89,21.05-12.89a96.33,96.33,0,0,1,22.2,2.86v14.8a44.58,44.58,0,0,1-26.73,8.31M566.53,353v-.52c0-3.74-.88-12.29-8.18-18.32-2.56-2.11-10.25-6.93-25.25-6.93-12.52,0-21.92,3.17-31.15,8a1.46,1.46,0,0,0-.7,2c1.06,2.41.85,2.19,1.51,3.61.37.84,1.1,1,2,.49,4.58-2.62,15-8.11,26.71-8.11,14.3,0,22,6.51,22,15.5v6.87a97.6,97.6,0,0,0-24-3.45c-24.39,0-32.89,8.9-32.89,19,0,14.82,14.7,18.48,27.67,18.48,11.07,0,21.16-2.52,29.07-8.45h.23c0,2.82,0,5,0,5a2,2,0,0,0,1.9,2h9.2a1.91,1.91,0,0,0,1.81-2Z\\" transform=\\"translate(-38.34 -289.13)\\" style=\\"fill:#511d4b\\"/><path d=\\"M689.92,383.63c-13.06,0-16.49-6.64-16.49-13.08,0-10.82,13-12.89,21-12.89a96.51,96.51,0,0,1,22.22,2.86v14.8a44.77,44.77,0,0,1-26.74,8.31M729.66,353v-.52c0-3.74-.9-12.29-8.2-18.32-2.58-2.11-10.26-6.93-25.29-6.93-12.47,0-21.9,3.17-31.15,8a1.49,1.49,0,0,0-.68,2c1.06,2.41.88,2.19,1.53,3.61.38.84,1.12,1,2,.49,4.55-2.62,15-8.11,26.69-8.11,14.28,0,22.07,6.51,22.07,15.5v6.87a98.12,98.12,0,0,0-24-3.45c-24.38,0-32.9,8.9-32.9,19,0,14.82,14.68,18.48,27.68,18.48,11.07,0,21.13-2.52,29.06-8.45h.22v5a2,2,0,0,0,1.89,2h9.21a1.93,1.93,0,0,0,1.83-2Z\\" transform=\\"translate(-38.34 -289.13)\\" style=\\"fill:#511d4b\\"/><path d=\\"M196.82,406.13c-.45-1.83-1-3.7-1.52-5.59,11.26-7.71,17.2-14.8,17.46-15.11l1.18-1.44-1.16-1.42c-.25-.31-6.21-7.38-17.44-15.08.59-1.9,1.1-3.77,1.56-5.59a121.15,121.15,0,0,1,25,22.09,120.53,120.53,0,0,1-25.1,22.14M196,447.29a110.29,110.29,0,0,1-18,.09,122.87,122.87,0,0,1-44.23-11.65,113.17,113.17,0,0,1-10.5-5.77c-2.42-1.53-4.76-3.1-7-4.71l-.74-.54-.91.15a82,82,0,0,1-23,.32,81.85,81.85,0,0,1,.29-23l.15-.91-.55-.73c-1.35-1.86-2.65-3.79-4-5.86.87-2,1.78-4.07,2.8-6.07a110.22,110.22,0,0,0,8,11.59,59,59,0,0,0-1.68,18.1l.15,1.81,1.82.19a59.59,59.59,0,0,0,18.05-1.72,110.65,110.65,0,0,0,15.15,10,112.84,112.84,0,0,0,10.92,5.23,109.6,109.6,0,0,0,40.88,8.36c3,0,4.85-.16,5.11-.19l1.8-.18.19-1.83c.1-.84,1.89-20.82-7.75-45,1.14-1.9,2.25-3.82,3.3-5.79a124.64,124.64,0,0,1,9.68,40.15,112.5,112.5,0,0,1-.08,18m-63.05,25.93a119.82,119.82,0,0,1-22.05-25.13c1.83-.45,3.68-1,5.56-1.57A93.05,93.05,0,0,0,131.51,464l1.42,1.18,1.44-1.18c.31-.27,7.34-6.18,15-17.47,1.91.58,3.76,1.1,5.58,1.55a119.29,119.29,0,0,1-22,25.09m-.11-33A120.22,120.22,0,0,0,145,445.15a95,95,0,0,1-12,14.17,95.21,95.21,0,0,1-12-14.23,123.44,123.44,0,0,0,11.94-4.87M85.66,399.76c.61.89,1.22,1.77,1.85,2.64a81.78,81.78,0,0,0,.1,25.16l.31,1.46,1.43.28a80.64,80.64,0,0,0,25.13.11c.91.66,1.85,1.31,2.79,1.93a104.36,104.36,0,0,1-38,6.43,104.68,104.68,0,0,1,6.38-38m2,47.62a110.45,110.45,0,0,1-18-.09,111.61,111.61,0,0,1-.09-18A124.12,124.12,0,0,1,81.17,385a108.6,108.6,0,0,1,5.89-10.75c1.49-2.39,3-4.67,4.58-6.84l.55-.73-.15-.92a81.7,81.7,0,0,1-.29-23,79.52,79.52,0,0,1,22.92.3l.94.15.72-.55c1.88-1.39,3.92-2.76,6-4.08,2.06.87,4.07,1.8,6.07,2.79a112.88,112.88,0,0,0-11.68,8.11,58.68,58.68,0,0,0-18.09-1.7l-1.79.18-.17,1.81a58.86,58.86,0,0,0,1.7,18.11,111.16,111.16,0,0,0-9.92,15A104.65,104.65,0,0,0,83.09,394C73,418.73,74.87,439.26,75,440.11l.18,1.83,1.83.18c.23,0,2,.2,5.09.2a110,110,0,0,0,39.9-8c1.86,1.14,3.8,2.24,5.75,3.28a124.11,124.11,0,0,1-40.06,9.75M43.95,384a117.77,117.77,0,0,1,24.82-22.08c.47,1.85,1,3.71,1.57,5.62a89.6,89.6,0,0,0-17.24,15L51.93,384l1.17,1.41a89.6,89.6,0,0,0,17.31,15.11c-.57,1.89-1.09,3.76-1.57,5.59A118.12,118.12,0,0,1,43.95,384M71.82,396A94.58,94.58,0,0,1,57.8,384a94.58,94.58,0,0,1,14-12A118.48,118.48,0,0,0,76.71,384a119.55,119.55,0,0,0-4.89,12m15.68-30.51c-.62.86-1.23,1.77-1.85,2.64a103.33,103.33,0,0,1-6.28-38,101.36,101.36,0,0,1,37.86,6.32c-.95.64-1.89,1.29-2.8,2a80.48,80.48,0,0,0-25.09.1l-1.43.31-.31,1.45a81.92,81.92,0,0,0-.1,25.18M69.68,320.61a120.84,120.84,0,0,1,62.19,11.47A121.43,121.43,0,0,1,142.56,338c2.39,1.5,4.7,3.1,6.86,4.69l.72.54.93-.15a82,82,0,0,1,22.85-.36,83,83,0,0,1-.36,22.94l-.14.93.54.73q2.16,2.93,4.11,6.08-1.25,3-2.67,5.88a110.47,110.47,0,0,0-8-11.59,61.6,61.6,0,0,0,1.75-18.07l-.2-1.83-1.8-.18a59.08,59.08,0,0,0-18,1.76,108.47,108.47,0,0,0-15.06-10.08A110.15,110.15,0,0,0,122.95,334c-24.64-10.17-45-8.14-45.91-8.07l-1.79.21-.19,1.79c-.09.83-2,20.73,7.64,45-1.2,2-2.33,4-3.43,6a123.07,123.07,0,0,1-9.76-40.27,105.54,105.54,0,0,1,.17-18m63.25-25.87a117.46,117.46,0,0,1,22,24.92c-1.82.49-3.69,1-5.59,1.58a89.54,89.54,0,0,0-15-17.32l-1.43-1.16-1.42,1.16c-.29.25-7.34,6.13-15.06,17.36-1.89-.59-3.75-1.09-5.58-1.57a118.14,118.14,0,0,1,22.05-25m-.11,32.89a116.24,116.24,0,0,0-11.94-4.9,91.52,91.52,0,0,1,12-14.08,92.08,92.08,0,0,1,12,14,116.63,116.63,0,0,0-12.11,5m45.23,12.73-.28-1.45-1.47-.31a81.54,81.54,0,0,0-25,0c-.86-.64-1.81-1.29-2.72-1.9a102.35,102.35,0,0,1,37.83-6.31,103.48,103.48,0,0,1-6.3,38c-.66-1-1.32-1.94-2-2.89a82.75,82.75,0,0,0-.06-25.09M102.6,398.21A106.16,106.16,0,0,1,92.92,384a107.38,107.38,0,0,1,9.58-14.15l.69-.88-.27-1.08A61.07,61.07,0,0,1,101,352.11a60.54,60.54,0,0,1,15.68,2l1.11.29.86-.72a106.47,106.47,0,0,1,14.37-9.8,106.92,106.92,0,0,1,14.24,9.72l.85.71,1.09-.25a61,61,0,0,1,15.63-2,61.2,61.2,0,0,1-2,15.67l-.28,1.08.71.87A104,104,0,0,1,172.91,384a103.87,103.87,0,0,1-9.77,14.42l-.7.88.27,1.08a61.81,61.81,0,0,1,2,15.68A61.26,61.26,0,0,1,149,414l-1.07-.29-.88.7A103.38,103.38,0,0,1,133,424.06a101.93,101.93,0,0,1-14.26-9.69l-.87-.7-1.07.29a59.58,59.58,0,0,1-15.7,1.94A59.42,59.42,0,0,1,103,400.18l.27-1.08Zm75.5,4.27c.68-.93,1.33-1.89,2-2.88a104.87,104.87,0,0,1,6.38,38.06,104.5,104.5,0,0,1-37.94-6.41c.93-.63,1.84-1.28,2.72-1.9a82.45,82.45,0,0,0,25,0l1.47-.29.28-1.49a82.83,82.83,0,0,0,.06-25m-.06-82a106.39,106.39,0,0,1,17.93.17,122.14,122.14,0,0,1-11.47,62.44,115,115,0,0,1-5.79,10.5c-1.52,2.45-3.11,4.81-4.73,7l-.58.74.14.91a83.12,83.12,0,0,1,.36,22.94,83,83,0,0,1-22.86-.37l-.92-.17-.76.57c-1.84,1.37-3.83,2.71-5.89,4-2-.85-3.93-1.76-5.87-2.71A106.44,106.44,0,0,0,149,418.63a60,60,0,0,0,18,1.75l1.83-.18.19-1.83a60.44,60.44,0,0,0-1.75-18.05A108.38,108.38,0,0,0,177.42,385a106.45,106.45,0,0,0,5.23-11c10.17-24.74,8.14-45.22,8.05-46.07l-.18-1.79-1.81-.2c-.83-.08-20.64-2-44.79,7.63-1.94-1.2-4-2.36-6-3.44a122.51,122.51,0,0,1,40.11-9.76M188.94,384a115.09,115.09,0,0,0,5-12.11A95.76,95.76,0,0,1,208,384a94.61,94.61,0,0,1-14.19,12.09,114.61,114.61,0,0,0-4.92-12m37.6-1.39c-.41-.54-10.16-13.45-28.58-25.38a125.86,125.86,0,0,0,2.64-18.47,100.78,100.78,0,0,0-.4-20.54l-.25-1.61-1.62-.25a99.94,99.94,0,0,0-20.44-.42,128.33,128.33,0,0,0-18.31,2.61c-11.91-18.44-24.77-28.08-25.34-28.49l-1.31-1-1.3,1c-.56.41-13.45,10.06-25.35,28.52A128,128,0,0,0,87.8,316a100,100,0,0,0-20.46.42l-1.61.25-.24,1.61a100.43,100.43,0,0,0-.42,20.54,128.94,128.94,0,0,0,2.61,18.48c-18.35,11.93-27.95,24.83-28.36,25.4l-1,1.31,1,1.32c.41.55,10,13.49,28.43,25.43a133,133,0,0,0-2.61,18.37,103.56,103.56,0,0,0,.33,20.52l.25,1.65,1.61.24a86.64,86.64,0,0,0,11.54.64c2.63,0,5.65-.09,8.94-.33a128.81,128.81,0,0,0,18.46-2.66c11.91,18.49,24.79,28.27,25.33,28.69l1.33,1,1.35-1c.55-.43,13.39-10.18,25.3-28.66a130.22,130.22,0,0,0,18.24,2.62c3.35.24,6.35.33,9,.33a86.71,86.71,0,0,0,11.52-.64l1.63-.24.25-1.65a102.59,102.59,0,0,0,.32-20.52,131.86,131.86,0,0,0-2.62-18.36c18.46-11.95,28.22-24.86,28.63-25.44l1-1.32Z\\" transform=\\"translate(-38.34 -289.13)\\" style=\\"fill:#bb9753\\"/></svg>",
"SG":"<svg id=\\"Layer_1\\" data-name=\\"Layer 1\\" xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 276.91 74.88\\"><path d=\\"M316.71,381.82c-2.12,2.06-5,2.66-6.24,1.45s-.61-4.17,1.51-6.23,5-2.72,6.18-1.51.67,4.23-1.45,6.29\\" transform=\\"translate(-244.4 -339.06)\\" style=\\"fill:#fcd20a\\"/><path d=\\"M325.31,381.52c-1.51,1.69-3.58,2.3-4.61,1.45s-.61-3.08.91-4.78,3.64-2.42,4.6-1.57.61,3.21-.91,4.9\\" transform=\\"translate(-244.4 -339.06)\\" style=\\"fill:#fcd800\\"/><path d=\\"M289.56,370.93a11.1,11.1,0,0,0-9.51,3c-2.85,2.78-4.91,6.65-3.76,9.8a4.69,4.69,0,0,0,3.76,2.6,12.55,12.55,0,0,0,8.48-3.27,12,12,0,0,0,3.82-7.86,6.11,6.11,0,0,0-.12-1.45,4,4,0,0,0-2.67-2.84\\" transform=\\"translate(-244.4 -339.06)\\" style=\\"fill:#f8a81b\\"/><path d=\\"M305.07,382.13c-2.85,2.72-7,3.69-8.66,2.12s-.67-5.62,2.18-8.35,6.79-3.39,8.36-1.75.91,5.26-1.88,8\\" transform=\\"translate(-244.4 -339.06)\\" style=\\"fill:#f9bb16\\"/><path d=\\"M300,374.87a5.9,5.9,0,0,1,3-1.45,13.52,13.52,0,0,0-3,1.45\\" transform=\\"translate(-244.4 -339.06)\\" style=\\"fill:#f7a51c\\"/><path d=\\"M323.68,368.82c-1.76,2.36-4.54,3.39-5.94,2.42s-1.39-4,.3-6.35,4.61-3.57,6-2.6,1.39,4.17-.36,6.53\\" transform=\\"translate(-244.4 -339.06)\\" style=\\"fill:#fcd20a\\"/><path d=\\"M330.4,371.36c-1.39,1.93-3.45,2.84-4.6,2.06s-1-3.08.42-5,3.51-3,4.67-2.18.91,3.27-.48,5.14\\" transform=\\"translate(-244.4 -339.06)\\" style=\\"fill:#fcd800\\"/><path d=\\"M301,361.32c-3.51,4.23-8.91,5.93-11.21,3.75-2.67-2.6-2.79-6.71,1.15-11.67,4.24-5.32,9-5.57,11.45-3.57s2.12,7.26-1.39,11.49\\" transform=\\"translate(-244.4 -339.06)\\" style=\\"fill:#f9b517\\"/><path d=\\"M314.16,365.49c-2.61,4.35-6.6,4.42-8.36,3s-1.27-5.57,1.27-8.59,6.54-4.23,8.18-2.6c1.33,1.33.91,4.78-1.09,8.17\\" transform=\\"translate(-244.4 -339.06)\\" style=\\"fill:#fac113\\"/><path d=\\"M290,347.41c0,.6-.06,1.27-.12,1.88.06-.61.12-1.27.12-1.87\\" transform=\\"translate(-244.4 -339.06)\\" style=\\"fill:#f7a51c\\"/><path d=\\"M285.93,339.79c-9.21-3.87-18.48,8.59-17.75,15.61.61,5.38,4,7.56,8.85,6.83a.37.37,0,0,1,.24-.06c5.09-.67,9.33-4.84,11.27-8.47a14.14,14.14,0,0,0,1.39-4.36c.06-.6.12-1.27.12-1.87-.06-3.33-1.27-6.47-4.12-7.68\\" transform=\\"translate(-244.4 -339.06)\\" style=\\"fill:#f7a11c\\"/><path d=\\"M266.6,367.67a15.43,15.43,0,0,0-5.94,2.42,17.68,17.68,0,0,0-6.85,6.83c-1.76,3.39-1.51,6.47-.06,8.59a5.53,5.53,0,0,0,2.54,2.24,11.93,11.93,0,0,0,1.58.48,11,11,0,0,0,5.39-.18c5.82-1.57,12.48-7.92,12.42-13.91s-4.24-7.5-9.09-6.47\\" transform=\\"translate(-244.4 -339.06)\\" style=\\"fill:#f7991d\\"/><path d=\\"M323.61,390.77c-1.64,1.57-3.7,2.06-4.67,1.15s-.42-3.08,1.21-4.66,3.76-2.18,4.73-1.27.36,3.21-1.27,4.78\\" transform=\\"translate(-244.4 -339.06)\\" style=\\"fill:#fcd800\\"/><path d=\\"M313.56,393.74c-2.18,1.93-5,2.42-6.12,1.15s-.24-3.87,2-5.81,4.85-2.42,6-1.15.36,3.87-1.88,5.81\\" transform=\\"translate(-244.4 -339.06)\\" style=\\"fill:#fcd20a\\"/><path d=\\"M300.11,397.85c-3,2.54-6.67,3.21-8.18,1.51s-.3-5.14,2.67-7.68,6.48-3.21,8-1.51.48,5.14-2.48,7.68\\" transform=\\"translate(-244.4 -339.06)\\" style=\\"fill:#f9bd15\\"/><path d=\\"M283.56,392.17c-5.94-1.69-15.33,5.87-14,11.79.3,1.33,2.18,2.54,3.64,2.72,5.94.6,12.6-5.68,13-10.22a13.76,13.76,0,0,1-.06-1.57,3.75,3.75,0,0,0-2.55-2.72\\" transform=\\"translate(-244.4 -339.06)\\" style=\\"fill:#f9a81a\\"/><path d=\\"M267.63,398.76c-1.09-4.48-6.54-4.11-10.18-3.08a16.94,16.94,0,0,0-4,1.51,18.77,18.77,0,0,0-4.85,3.39c-1.76,1.69-4.73,5.44-4.12,9.07.61,3.81,5.45,5,9.76,3.93,5.21-1.15,15-7.86,13.39-14.82\\" transform=\\"translate(-244.4 -339.06)\\" style=\\"fill:#f79a1d\\"/><path d=\\"M358.7,367.43c-.79-2.3-.73-5.5-4.54-5.44s-5.51,2.54-5.51,5.5c0,4.78,12.12,5.68,13,15.36.55,5.81-5.09,15.36-16.42,15.48-4.61,0-10.36-2.06-10.42-11.73l8.18-1.75c.06,2.42-.12,6.77,4.54,6.77,3.57,0,5.39-3.33,5.69-6,.67-6-12.84-7.8-12.78-15.54.12-7.26,4.79-14.7,15.94-14.64s9.57,10,9.57,10l-7.27,2Z\\" transform=\\"translate(-244.4 -339.06)\\" style=\\"fill:#ff0006\\"/><path d=\\"M508.11,373.84h-3.7l1.46-5.87h3.7l2.73-10.89h7.15L516.71,368h4.61l-1.45,5.87h-4.6l-4,16a1.53,1.53,0,0,0,.48,1.76,3.61,3.61,0,0,0,2.18.6c.48,0,1-.06,1.45-.06l-1.51,6.11a32.38,32.38,0,0,1-4.18.3,8.13,8.13,0,0,1-5.21-1.39c-1.09-1-1.39-2.6-.91-4.84l4.54-18.51ZM486,378.13h8.36l.42-1.75a4.34,4.34,0,0,0-.18-3.33,3.12,3.12,0,0,0-2.85-1.21,5.16,5.16,0,0,0-3.51,1.21,6.68,6.68,0,0,0-1.88,3.33ZM500,384H484.48l-1,4.17c-.36,1.57-.24,2.66.36,3.39a3.35,3.35,0,0,0,2.73,1.09,5.24,5.24,0,0,0,3.58-1.27,6.38,6.38,0,0,0,1.7-3.15H499a13.52,13.52,0,0,1-13.87,10.28c-3.45-.06-5.94-1-7.45-3s-1.88-4.66-1.09-8.17l2.54-10.28a14.75,14.75,0,0,1,5.15-8.1,14.4,14.4,0,0,1,9-3c3.39.06,5.82,1,7.39,2.9s2,4.48,1.21,7.74L500,384Zm-56.65-5.87h8.36l.42-1.75a4.34,4.34,0,0,0-.18-3.33,3.17,3.17,0,0,0-2.91-1.21,4.9,4.9,0,0,0-3.45,1.21,6.18,6.18,0,0,0-1.82,3.33ZM457.4,384H441.89l-1,4.17c-.36,1.57-.24,2.66.36,3.39a3.35,3.35,0,0,0,2.73,1.09,5,5,0,0,0,3.51-1.27,6,6,0,0,0,1.76-3.15h7.15a14.11,14.11,0,0,1-5,7.56,14.57,14.57,0,0,1-8.91,2.72c-3.45-.06-5.94-1-7.45-3s-1.88-4.66-1.09-8.17l2.61-10.22a14.74,14.74,0,0,1,5.15-8.1,14.4,14.4,0,0,1,9-3c3.33.06,5.82,1,7.39,2.9s2,4.48,1.27,7.74Zm-25.45-6.59h-7.09l.36-1.39a2.85,2.85,0,0,0-.48-2.78,3.69,3.69,0,0,0-2.79-1,5.37,5.37,0,0,0-3.27,1A4.89,4.89,0,0,0,416.8,376l-3.15,12.46a3,3,0,0,0,.42,2.78,3.77,3.77,0,0,0,2.79.91,5.77,5.77,0,0,0,3.27-.91,4.55,4.55,0,0,0,1.82-2.78l.48-1.93h7.15v.12c-1.09,4.11-2.85,7.14-5.27,9a13.65,13.65,0,0,1-9,2.78c-3.57.06-6.18-.91-7.63-2.78s-1.7-4.9-.73-9l2.18-8.77c1.09-4.11,2.85-7.14,5.27-9a14.13,14.13,0,0,1,9-2.84c3.51-.06,6,.91,7.51,2.72s1.94,4.66,1,8.65m-61.86-10.83h6.54l-1,3.81h.12a15.36,15.36,0,0,1,3.82-2.9,10.65,10.65,0,0,1,4.85-1.45c2.73,0,4.48,1.09,5.21,3.21s.55,5.2-.55,9.25l-1.94,7.62c-1,4-2.36,7.14-4.18,9.25a8.68,8.68,0,0,1-6.79,3.21,5.33,5.33,0,0,1-2.79-.79,17.74,17.74,0,0,1-3.45-2.66l-4.42,17.42h-7l11.57-46Zm5.33,7.08-4.36,17.18a4.14,4.14,0,0,0,3.76,2.24,3.49,3.49,0,0,0,2.85-1.39c.91-1,1.82-3,2.54-6.11l1.7-6.65c.73-3,.91-5.08.48-6a1.94,1.94,0,0,0-2.12-1.39C378.75,371.42,377.18,372.15,375.42,373.66Z\\" transform=\\"translate(-244.4 -339.06)\\" style=\\"fill:#ff0006;fill-rule:evenodd\\"/><path d=\\"M463.39,388.29l5.09-20.14,2.79-11.07h7.15l-2.79,11.07L467,401.54c-1.09,4.11-2.85,7.08-5.27,9a14,14,0,0,1-9,2.84c-3.64,0-6.18-.91-7.63-2.84s-1.76-4.9-.73-9l7.21-.06-.55,1.88a2.85,2.85,0,0,0,.48,2.72,3.78,3.78,0,0,0,2.79,1,5.8,5.8,0,0,0,3.27-1,4.74,4.74,0,0,0,1.88-2.72l.67-2.54,3.33-12.46Z\\" transform=\\"translate(-244.4 -339.06)\\" style=\\"fill:#ff0006\\"/><path d=\\"M406.08,363.68H399l1.63-6.59h7.09Zm-7.94,2.9h7.15l-7.88,31.33h-7.15Z\\" transform=\\"translate(-244.4 -339.06)\\" style=\\"fill:#ff0006;fill-rule:evenodd\\"/></svg>",
"QP":"<svg xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 222 37.53\\"><path d=\\"M560.19,525.39a.5.5,0,0,0,0,.23.52.52,0,0,0,.32.32.48.48,0,0,0,.23,0H565V507.19h-1.28a3.25,3.25,0,0,0-3.38,3c-1.23-2.26-3.64-3.35-6.49-3.35-4.88,0-9.15,4-9.15,10.08,0,5.87,3.07,9.56,8.55,9.56,3.94,0,5.59-1.8,5.59-3.57a2.33,2.33,0,0,0-.79-1.92,4.73,4.73,0,0,1-3.49,1.23c-2.48,0-4.69-1.39-4.69-5.3,0-3.71,2.55-5.56,5.22-5.56,3.42,0,5.14,2.22,5.14,5.45Zm29.94-22.53L599,526h-5.07a.71.71,0,0,1-.51-.14.75.75,0,0,1-.28-.46l-7-19.22-3.76,10.23h2.44c2.25,0,3.11.86,3.64,2.25l.64,1.7c.15.37,0,.63-.38.63h-8l-1.8,5h-4.65a.43.43,0,0,1-.23,0,.4.4,0,0,1-.18-.15.43.43,0,0,1,0-.46l8.3-21.73c.86-2.25,2-3,3.94-3h4.12c.31,0,.41.15.41.35,0,.41-.6.52-.6,1.16A2.34,2.34,0,0,0,590.13,502.87Zm-71.45,22.53a.5.5,0,0,0,0,.23.45.45,0,0,0,.12.19.51.51,0,0,0,.19.12.5.5,0,0,0,.23,0h4.2V507.19h-1.27a3.25,3.25,0,0,0-3.38,3c-1.23-2.26-3.64-3.35-6.49-3.35-4.93,0-9.15,4-9.15,10.08,0,5.87,3.07,9.56,8.56,9.56,3.94,0,5.59-1.8,5.59-3.57a2.36,2.36,0,0,0-.79-1.92,4.8,4.8,0,0,1-1.62,1,4.75,4.75,0,0,1-1.87.26c-2.48,0-4.69-1.39-4.69-5.3,0-3.71,2.55-5.56,5.22-5.56,3.42,0,5.14,2.22,5.14,5.45Zm-22.08-17.57a1.35,1.35,0,0,1,1.35-.67h5.44l-8,9,8.22,9.82H498a1.36,1.36,0,0,1-.78-.13,1.41,1.41,0,0,1-.57-.55l-6.16-7.56V526h-4.2a.5.5,0,0,1-.23,0,.51.51,0,0,1-.19-.12.45.45,0,0,1-.12-.19.5.5,0,0,1,0-.23V503a3.51,3.51,0,0,1,3.49-3.49h1.27v15.27Zm-22.51-4.94L483,526h-5a.72.72,0,0,1-.51-.14.75.75,0,0,1-.28-.46l-7-19.24-3.76,10.23h2.45c2.25,0,3.11.86,3.64,2.25l.64,1.7c.15.37,0,.63-.37.63h-8l-1.8,5h-4.65a.44.44,0,0,1-.42-.18.42.42,0,0,1-.08-.23.39.39,0,0,1,0-.23l8.3-21.73c.86-2.25,2-3,3.94-3h4.13c.3,0,.4.15.4.35,0,.41-.59.52-.59,1.16a2.1,2.1,0,0,0,.15.73Zm136.45,7.78v14.72a.5.5,0,0,0,0,.23.52.52,0,0,0,.32.32.48.48,0,0,0,.23,0h4.2v-9.36a4.85,4.85,0,0,1,2.91-4.76,4.89,4.89,0,0,1,1.93-.4,5.25,5.25,0,0,1,2.14.34,6.72,6.72,0,0,0,.72-2.67c0-1.12-.6-2.18-2.63-2.18s-3.94,1.29-5.07,4v-3.72H614a3.41,3.41,0,0,0-1.36.21,3.31,3.31,0,0,0-1.16.75,3.31,3.31,0,0,0-1,2.53Zm-8.78,0a3.51,3.51,0,0,1,3.49-3.5h1.27v18.77h-4.2a.48.48,0,0,1-.23,0,.52.52,0,0,1-.32-.32.48.48,0,0,1,0-.23Zm-75.59,11.94c0,2.48,4.36,3.76,7.89,3.76,4.61,0,8.41-2.18,8.41-6.09,0-2.9-1.46-4.59-5-5.45l-3.94-1c-1-.27-1.58-.68-1.58-1.62s.94-1.47,2.74-1.47a10.81,10.81,0,0,1,5.91,1.84,4.15,4.15,0,0,0,1.24-2.52c0-2.1-3.45-3.35-7.25-3.35-4,0-7.77,2-7.77,5.93,0,3,1.47,4.77,4.77,5.52l4,1c1,.22,1.65.67,1.65,1.54,0,1.09-.9,1.65-3.07,1.65a12.84,12.84,0,0,1-6.9-2.29A3.76,3.76,0,0,0,526.17,522.61Zm78-24.15a3,3,0,1,0,2.15,5.09,3,3,0,0,0,.67-1,3,3,0,0,0-.67-3.28,3,3,0,0,0-2.15-.84Z\\" transform=\\"translate(-401 -493.23)\\" style=\\"fill:#5c0fd9\\"/><path d=\\"M401.15,529.86l13.8-23.46c.23-.37.37-.53.6-.53s.38.2.57.49a18.83,18.83,0,0,1,2.62,9.53c0,8.8-6.9,14.87-16.83,14.87-.19,0-.91,0-.91-.45A.72.72,0,0,1,401.15,529.86Z\\" transform=\\"translate(-401 -493.23)\\" style=\\"fill:#ff6300\\"/><path d=\\"M432.77,508.15l12.08,21.63c.31.54.12,1-.64,1-8.87,0-13-3.34-16.32-9.31l-9.32-16.69a4.49,4.49,0,0,1-.76-2.24,6,6,0,0,1,1-2.76l1.17-2.08c1.67-3.08,3.48-4.45,7.76-4.45h3c.46,0,.49.35.27.6a6.59,6.59,0,0,0-1.52,4.52C429.52,500.63,430.35,503.78,432.77,508.15Z\\" transform=\\"translate(-401 -493.23)\\" style=\\"fill:#ff6300\\"/></svg>",
"MH":"<svg id=\\"Layer_1\\" data-name=\\"Layer 1\\" xmlns=\\"http://www.w3.org/2000/svg\\" xmlns:xlink=\\"http://www.w3.org/1999/xlink\\" width=\\"320.1\\" height=\\"80.4\\" viewBox=\\"0 0 320.1 80.4\\"><defs><clipPath id=\\"clip-path\\" transform=\\"translate(-224.5 -343.05)\\"><path d=\\"M543.4,372.85l-1.8-.1a7,7,0,0,1-7-7c.1-7.9-4.4-20.5-22.2-21.2H481.7l-.4,1.5h25.8c2.6.1,4.4,2,3.6,5.1L506.1,368a6.79,6.79,0,0,1-6.4,4.8c-4.7-.4-3.4-4.9-3.4-4.9l2.1-7.7a2.89,2.89,0,0,0-2.8-3.9H478.5l-.4,1.5h7.3c2.7.1,3.3,2.1,2.8,3.9,0,0-.9,3.2-2,7.2a5.19,5.19,0,0,1-5.2,4h-7.1l-.5,1.8h6.7c.8,0,4.4.1,3.3,4s-2,7.2-2,7.2a5.32,5.32,0,0,1-4.9,3.9h-7.3l-.4,1.5h17.1a5.85,5.85,0,0,0,5-3.9l2.1-7.7a6.8,6.8,0,0,1,6.1-4.9s4.8-.3,3.7,4.8l-4.6,16.8a7.08,7.08,0,0,1-6.4,5.1H466l-.4,1.6h30.8c18.2-.7,29.6-13.3,33.9-21.2,0,0,3.4-6.4,10.8-7l1.8-.1a.31.31,0,0,0,.2-.1c.1-.3.4-1.5.4-1.6s0-.2-.1-.2\\" style=\\"fill:none\\"/></clipPath></defs><path d=\\"M543.4,372.85l-1.8-.1a7,7,0,0,1-7-7c.1-7.9-4.4-20.5-22.2-21.2H481.7l-.4,1.5h25.8c2.6.1,4.4,2,3.6,5.1L506.1,368a6.79,6.79,0,0,1-6.4,4.8c-4.7-.4-3.4-4.9-3.4-4.9l2.1-7.7a2.89,2.89,0,0,0-2.8-3.9H478.5l-.4,1.5h7.3c2.7.1,3.3,2.1,2.8,3.9,0,0-.9,3.2-2,7.2a5.19,5.19,0,0,1-5.2,4h-7.1l-.5,1.8h6.7c.8,0,4.4.1,3.3,4s-2,7.2-2,7.2a5.32,5.32,0,0,1-4.9,3.9h-7.3l-.4,1.5h17.1a5.85,5.85,0,0,0,5-3.9l2.1-7.7a6.8,6.8,0,0,1,6.1-4.9s4.8-.3,3.7,4.8l-4.6,16.8a7.08,7.08,0,0,1-6.4,5.1H466l-.4,1.6h30.8c18.2-.7,29.6-13.3,33.9-21.2,0,0,3.4-6.4,10.8-7l1.8-.1a.31.31,0,0,0,.2-.1c.1-.3.4-1.5.4-1.6s0-.2-.1-.2\\" transform=\\"translate(-224.5 -343.05)\\" style=\\"fill:#0a468c\\"/><path id=\\"SVGID\\" d=\\"M543.4,372.85l-1.8-.1a7,7,0,0,1-7-7c.1-7.9-4.4-20.5-22.2-21.2H481.7l-.4,1.5h25.8c2.6.1,4.4,2,3.6,5.1L506.1,368a6.79,6.79,0,0,1-6.4,4.8c-4.7-.4-3.4-4.9-3.4-4.9l2.1-7.7a2.89,2.89,0,0,0-2.8-3.9H478.5l-.4,1.5h7.3c2.7.1,3.3,2.1,2.8,3.9,0,0-.9,3.2-2,7.2a5.19,5.19,0,0,1-5.2,4h-7.1l-.5,1.8h6.7c.8,0,4.4.1,3.3,4s-2,7.2-2,7.2a5.32,5.32,0,0,1-4.9,3.9h-7.3l-.4,1.5h17.1a5.85,5.85,0,0,0,5-3.9l2.1-7.7a6.8,6.8,0,0,1,6.1-4.9s4.8-.3,3.7,4.8l-4.6,16.8a7.08,7.08,0,0,1-6.4,5.1H466l-.4,1.6h30.8c18.2-.7,29.6-13.3,33.9-21.2,0,0,3.4-6.4,10.8-7l1.8-.1a.31.31,0,0,0,.2-.1c.1-.3.4-1.5.4-1.6s0-.2-.1-.2\\" transform=\\"translate(-224.5 -343.05)\\" style=\\"fill:#0a468c\\"/><g style=\\"clip-path:url(#clip-path)\\"><rect x=\\"248\\" width=\\"72.1\\" height=\\"30.7\\" style=\\"fill:#0a468c\\"/></g><path d=\\"M267.9,375.35a7.62,7.62,0,0,0-6.3-2.7H232.8L224.5,403h8.1l6.5-23.6h7.2l-6.4,23.6H248l6.4-23.6h3.1a3.09,3.09,0,0,1,2.7,1,3.84,3.84,0,0,1,.3,3.1l-5.3,19.5h8.1l5.7-21A7.93,7.93,0,0,0,267.9,375.35Z\\" transform=\\"translate(-224.5 -343.05)\\" style=\\"fill:#0a468c\\"/><path d=\\"M301.4,375.65a8.65,8.65,0,0,0-6.8-2.9H277.1l-1.7,6.3h15.3a4.21,4.21,0,0,1,3.3,1.1,3.6,3.6,0,0,1,.3,3.3l-.4,1.2H281.1a12,12,0,0,0-11.9,9.1c-.8,2.8-.5,5.2.8,6.8s3.4,2.4,6.2,2.4H297l5.3-19.4C303.2,380.25,302.9,377.55,301.4,375.65Zm-10.7,21h-9.8c-.9,0-2.3-.1-2.8-.8a2.5,2.5,0,0,1-.2-2c.7-2.6,2.7-2.9,4.7-2.9h9.7Z\\" transform=\\"translate(-224.5 -343.05)\\" style=\\"fill:#0a468c\\"/><path d=\\"M348.1,375.65a8.65,8.65,0,0,0-6.8-2.9H323.9l-1.7,6.3h15.3a4.21,4.21,0,0,1,3.3,1.1,3.6,3.6,0,0,1,.3,3.3l-.3,1.2H328a12,12,0,0,0-11.9,9.1c-.8,2.8-.5,5.2.8,6.8s3.4,2.4,6.2,2.4h20.8l5.3-19.4C350,380.25,349.7,377.55,348.1,375.65Zm-10.7,21h-9.8c-.9,0-2.3-.1-2.8-.8a2.5,2.5,0,0,1-.2-2c.7-2.6,2.7-2.9,4.7-2.9H339Z\\" transform=\\"translate(-224.5 -343.05)\\" style=\\"fill:#0a468c\\"/><path d=\\"M376.7,372.75l-6.5,23.6h-8a3.09,3.09,0,0,1-2.7-1c-.8-.9-.5-2.4-.3-3.2l5.3-19.5h-8l-5.5,20.2c-.9,3.1-.6,5.6.8,7.3,1.8,2.2,5,2.7,7.3,2.7h9.3l-.8,3a5.76,5.76,0,0,1-5.6,3.8H347.1l-1.7,6.3h17.3c4.8,0,11.4-4.2,13-10.2l9.1-33.1-8.1.1Z\\" transform=\\"translate(-224.5 -343.05)\\" style=\\"fill:#0a468c\\"/><path d=\\"M413,387.05c-1.2-1.6-3.4-2.4-6.2-2.4h-8.3c-1,0-2.4-.1-2.9-.8a2.32,2.32,0,0,1-.2-1.9c.7-2.6,2.8-2.9,4.8-2.9h16.1l1.7-6.3H398.7a12,12,0,0,0-11.9,9.1c-.8,2.8-.5,5.1.8,6.8s3.4,2.4,6.2,2.4h8.3c1,0,2.3.1,2.9.8a2.5,2.5,0,0,1,.2,2c-.7,2.6-2.8,2.9-4.8,2.9H382.7l-1.7,6.3h20.9a12,12,0,0,0,11.9-9.1C414.6,391.05,414.3,388.75,413,387.05Z\\" transform=\\"translate(-224.5 -343.05)\\" style=\\"fill:#0a468c\\"/><polygon points=\\"198.8 29.7 190.6 59.9 198.7 59.9 206.9 29.7 198.8 29.7\\" style=\\"fill:#0a468c\\"/><path d=\\"M461.2,375.65a8.65,8.65,0,0,0-6.8-2.9H436.9l-1.7,6.3h15.3a4.21,4.21,0,0,1,3.3,1.1,3.6,3.6,0,0,1,.3,3.3l-.3,1.2H441a12,12,0,0,0-11.9,9.1c-.8,2.8-.5,5.2.8,6.8s3.4,2.4,6.2,2.4h20.8l5.3-19.4C463.1,380.25,462.7,377.55,461.2,375.65Zm-10.7,21h-9.8c-.9,0-2.3-.1-2.8-.8a2.5,2.5,0,0,1-.2-2c.7-2.6,2.7-2.9,4.7-2.9h9.7Z\\" transform=\\"translate(-224.5 -343.05)\\" style=\\"fill:#0a468c\\"/><polygon points=\\"87.7 21.5 77.2 59.9 85.3 59.9 95.8 21.5 87.7 21.5\\" style=\\"fill:#0a468c\\"/><path d=\\"M390.6,410.75a3.19,3.19,0,0,0-2.4-1h-8.7l-.5,1.9h8a1.75,1.75,0,0,1,1.5.6,1.63,1.63,0,0,1,.1,1.2c-.1.4-.5,1.7-.5,1.7H382a5.35,5.35,0,0,0-5.6,4.2,3.37,3.37,0,0,0,.5,2.9,3.87,3.87,0,0,0,3.1,1.1h8.2l2.6-9.7A2.65,2.65,0,0,0,390.6,410.75Zm-4.2,10.7h-5.3c-1,0-1.6-.2-1.9-.6a1.71,1.71,0,0,1-.2-1.6c.4-1.5,1.5-2.2,3.3-2.2h5.4Z\\" transform=\\"translate(-224.5 -343.05)\\" style=\\"fill:#0a468c\\"/><polygon points=\\"168.5 80.3 172.1 66.7 169.8 66.7 166.1 80.3 168.5 80.3\\" style=\\"fill:#0a468c\\"/><polygon points=\\"181.7 80.3 186.4 62.9 184.1 62.9 179.3 80.3 181.7 80.3\\" style=\\"fill:#0a468c\\"/><polygon points=\\"186.4 80.3 190 66.7 187.7 66.7 184 80.3 186.4 80.3\\" style=\\"fill:#0a468c\\"/><path d=\\"M423.9,409.75h-7.1l-3.7,13.6h2.4l3.2-11.7h4.4c1,0,1.6.2,1.9.7s.2,1.4,0,2.5l-2.3,8.5h2.4l2.5-9.1a3.87,3.87,0,0,0-.3-3.3A4.25,4.25,0,0,0,423.9,409.75Z\\" transform=\\"translate(-224.5 -343.05)\\" style=\\"fill:#0a468c\\"/><path d=\\"M431.7,415.35a5.55,5.55,0,0,1,5-3.7h4.8l.5-1.9h-5.6c-4,0-6.8,3.4-7.7,6.8-.6,2.2-.4,4.1.5,5.3a3.88,3.88,0,0,0,3.4,1.4h5.6l.5-1.9h-4.8a3.39,3.39,0,0,1-2.5-.8,3.57,3.57,0,0,1-.3-3.1v-.1h8.5l.5-1.9h-8.4Z\\" transform=\\"translate(-224.5 -343.05)\\" style=\\"fill:#0a468c\\"/><path d=\\"M455.1,411.75l.5-1.9h-7.5a5.37,5.37,0,0,0-5.5,3.9,2.84,2.84,0,0,0,.3,2.5,3.29,3.29,0,0,0,2.9,1.1h3.7c2.2,0,1.9,1.7,1.7,2.2-.6,1.7-2.4,1.9-4.3,1.9h-6.4l-.5,1.9h9a4.79,4.79,0,0,0,4.8-3.9,3.44,3.44,0,0,0-.5-2.9,3.67,3.67,0,0,0-3-1.1h-3.2c-.3,0-1.4,0-1.7-.5a1.9,1.9,0,0,1-.1-1.3,2.63,2.63,0,0,1,2.7-1.9Z\\" transform=\\"translate(-224.5 -343.05)\\" style=\\"fill:#0a468c\\"/><path d=\\"M402.8,409.75a5.1,5.1,0,0,0-5,4.1c-.1.3-2.6,9.6-2.6,9.6h2.4s2.4-9,2.5-9.3a3.25,3.25,0,0,1,3.1-2.5h2l.5-2h-2.9Z\\" transform=\\"translate(-224.5 -343.05)\\" style=\\"fill:#0a468c\\"/></svg>",
"SQ":"<svg xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 204.31 73\\"><polyline points=\\"0 69.84 0 73 140.78 73 143 69.84 0 69.84\\" style=\\"fill:#ff9f00\\"/><path d=\\"M571.77,542.24s9.76-14.58,10.64-16a6.42,6.42,0,0,0,.16-6.07l-15-23.81c-1.31-2.49-1-4.19-.11-5.4l4-5.87s17.67,27.73,18.41,29a8.28,8.28,0,0,1-.19,8.91c-1.31,2.24-12.76,19.3-12.76,19.3h-5.06\\" transform=\\"translate(-409.84 -475.5)\\" style=\\"fill:#ff9f00\\"/><path d=\\"M568.62,543.82s11.3-16.54,12.14-17.91a5.66,5.66,0,0,0,0-5.45C580.29,519.7,564.6,495,564.6,495s-2.78,4.2-3.66,5.5-1.4,2.9.11,5.49l11.71,18.49a6.11,6.11,0,0,1-.15,5.78c-.84,1.35-12.43,18.25-12.43,18.25h33.44a7.53,7.53,0,0,0,6.9-3.68c1.42-2,6.92-10,7.77-11.26a5,5,0,0,1,3.26-2.09h2.61l-5.1-7.75h-8.13c-1.55,0-3.43,1.38-4.42,2.84-.77,1.15-6.33,9.48-7.34,10.83a1.84,1.84,0,0,1-1.51.93H586.6c.33-.67,9.68-14.26,11.51-17.26a12.86,12.86,0,0,0,.08-13.22c-1-1.7-20.39-32.33-20.39-32.33s-2.59,3.72-3.66,5.32c-.87,1.3-1.14,3,.12,5.49,0,0,16.3,25.93,17.08,27.12a9.31,9.31,0,0,1,0,9.6c-1.35,2.21-12.62,19.22-12.62,19.22h8.92c3.23,0,4-1.2,4.92-2.19s5.74-8.36,6.3-9.13,2-2.94,3.84-2.94h5.86v.17a5.58,5.58,0,0,0-3.37,2.23c-.89,1.21-6.78,9.93-7.49,10.94a4.83,4.83,0,0,1-4.48,2.5h-24.6\\" transform=\\"translate(-409.84 -475.5)\\" style=\\"fill:#ff9f00\\"/><polygon points=\\"83.78 62.29 86.94 62.29 86.94 47.89 83.78 47.89 83.78 62.29\\" style=\\"fill:#00266b\\"/><polyline points=\\"81.55 62.29 81.55 59.66 74.18 59.66 74.18 47.89 71 47.89 71 62.29 81.55 62.29\\" style=\\"fill:#00266b\\"/><path d=\\"M442.74,533.61h6.71l1.86,4.18h3.45l-7.05-14.4h-3.26l-7.05,14.4h3.48Zm3.35-7.74,2.28,5.2h-4.55Z\\" transform=\\"translate(-409.84 -475.5)\\" style=\\"fill:#00266b\\"/><path d=\\"M467.57,526h5a2,2,0,0,1,1.9,2.12,2,2,0,0,1-1.9,2.09h-3.88l6.29,7.56h3.75l-4.46-5.37h0a4.54,4.54,0,0,0,3.15-4.37,4.63,4.63,0,0,0-4.71-4.67h-8.21v14.4h3.11V526\\" transform=\\"translate(-409.84 -475.5)\\" style=\\"fill:#00266b\\"/><polygon points=\\"47.05 62.29 50.21 62.29 50.21 47.89 47.05 47.89 47.05 62.29\\" style=\\"fill:#00266b\\"/><path d=\\"M537.24,532h4a1.57,1.57,0,0,1,0,3.14h-8.71v2.7H541c3.26,0,4.87-2.15,4.87-4.34s-1.61-4.32-4.87-4.32h-4.07a1.53,1.53,0,0,1,0-3.05h8.73v-2.7h-8.4c-3.23,0-4.82,1.91-4.82,4.29S534,532,537.24,532\\" transform=\\"translate(-409.84 -475.5)\\" style=\\"fill:#00266b\\"/><polyline points=\\"119.53 62.29 119.53 59.66 111.1 59.66 111.1 55.97 118.45 55.97 118.45 53.35 111.1 53.35 111.1 50.52 119.53 50.53 119.53 47.89 107.92 47.89 107.92 62.29 119.53 62.29\\" style=\\"fill:#00266b\\"/><path d=\\"M503.82,526h5.24a2.2,2.2,0,0,1,2.1,2.26v9.51h3.16v-9.92a4.36,4.36,0,0,0-4.55-4.49h-4.14l-1.8,2.4v-2.4h-3.16v14.4h3.16V526\\" transform=\\"translate(-409.84 -475.5)\\" style=\\"fill:#00266b\\"/><path d=\\"M414.66,513.93h4a1.57,1.57,0,0,1,0,3.14H410v2.71h8.41c3.26,0,4.87-2.15,4.87-4.34s-1.61-4.32-4.87-4.32h-4.07a1.52,1.52,0,0,1,0-3h8.73v-2.71h-8.4c-3.23,0-4.82,1.9-4.82,4.29s1.59,4.27,4.82,4.27\\" transform=\\"translate(-409.84 -475.5)\\" style=\\"fill:#00266b\\"/><path d=\\"M457.93,519.77h6.43v-9.4H461.2V517h-3.7a4.11,4.11,0,0,1-4.47-4.5c0-3,1.79-4.49,4.47-4.49h6.86v-2.63h-6.43c-5.42,0-8.1,3.89-8.1,7.22s2.67,7.19,8.1,7.19\\" transform=\\"translate(-409.84 -475.5)\\" style=\\"fill:#00266b\\"/><polygon points=\\"16.66 44.27 19.82 44.27 19.82 29.87 16.66 29.87 16.66 44.27\\" style=\\"fill:#00266b\\"/><path d=\\"M436.74,508H442a2.2,2.2,0,0,1,2.1,2.26v9.51h3.16v-9.91a4.36,4.36,0,0,0-4.55-4.49h-4.15l-1.8,2.4v-2.4h-3.16v14.4h3.16V508\\" transform=\\"translate(-409.84 -475.5)\\" style=\\"fill:#00266b\\"/><path d=\\"M520.69,508h5a2,2,0,0,1,1.9,2.12,2,2,0,0,1-1.9,2.09h-3.88l6.29,7.56h3.75l-4.46-5.37h0A4.55,4.55,0,0,0,530.5,510a4.62,4.62,0,0,0-4.71-4.66h-8.21v14.4h3.11V508\\" transform=\\"translate(-409.84 -475.5)\\" style=\\"fill:#00266b\\"/><polyline points=\\"135.78 44.27 135.78 41.64 127.35 41.64 127.35 37.95 134.7 37.95 134.7 35.33 127.35 35.33 127.35 32.5 135.78 32.5 135.78 29.87 124.18 29.87 124.18 44.27 135.78 44.27\\" style=\\"fill:#00266b\\"/><path d=\\"M471.37,515.59h6.71l1.87,4.18h3.45l-7.05-14.4h-3.26L466,519.77h3.48Zm3.35-7.74,2.28,5.21h-4.55Z\\" transform=\\"translate(-409.84 -475.5)\\" style=\\"fill:#00266b\\"/><path d=\\"M488.18,512.78h0l1.8,2.4h3.23a4.91,4.91,0,0,0,0-9.8H485v14.4h3.18Zm0-4.78h4.9a2.16,2.16,0,0,1,1.9,2.3,2.13,2.13,0,0,1-1.9,2.26h-4.9Z\\" transform=\\"translate(-409.84 -475.5)\\" style=\\"fill:#00266b\\"/><path d=\\"M507.39,520.37a7.83,7.83,0,1,0-7.82-7.82A7.83,7.83,0,0,0,507.39,520.37Zm0-12.75a4.92,4.92,0,1,1-4.93,4.93A4.93,4.93,0,0,1,507.39,507.62Z\\" transform=\\"translate(-409.84 -475.5)\\" style=\\"fill:#00266b\\"/></svg>",
"EK":"<svg id=\\"Layer_1\\" xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 438.2 284.8\\"><defs><style>.cls-1{fill:#d71921;}</style></defs><path class=\\"cls-1\\" d=\\"M426.4,212.93v-2.15c0-1.61-.54-2.68-2.68-2.68h-1.07v5.9h1.61c.54,0,1.61,0,2.15-1.07M431.76,222.05h-3.22l-2.15-3.22c-1.61-2.15-2.68-3.75-3.75-3.75v6.97h-2.68v-15.02h4.29c4.29,0,5.9,1.07,5.9,3.75l-1.07,3.22-2.68,1.07c1.07,0,1.61,1.07,2.68,2.68l2.15,4.29M432.3,205.96c-1.61-1.61-4.83-2.68-7.51-2.68s-5.36,1.07-7.51,3.22c-2.02,1.98-3.18,4.68-3.22,7.51,0,5.92,4.8,10.73,10.73,10.73,3.22,0,5.36-1.07,7.51-3.22,2.15-1.61,3.22-5.36,3.22-7.51,0-2.68-1.07-5.36-3.22-7.51M433.9,222.58c-2.68,2.68-5.36,3.75-9.12,3.75s-6.44-1.07-9.12-3.75c-4.74-4.47-4.96-11.94-.48-16.68.16-.17.32-.33.48-.48,2.68-2.68,5.36-4.29,9.12-4.29s6.44,1.61,9.12,4.29c2.68,2.15,4.29,5.36,4.29,8.58,0,3.38-1.59,6.56-4.29,8.58M393.14,220.44c-10.19,0-19.31,6.97-18.77,15.55,0,6.97,3.22,12.34,9.12,16.09l8.58,5.36c4.83,3.22,6.44,6.44,6.44,9.65,0,4.29-3.75,10.19-12.34,10.19s-11.8-8.58-11.8-8.58v10.73s5.9,5.36,15.02,5.36c11.8,0,23.06-9.12,23.06-21.45.1-3.91-1.24-7.73-3.75-10.73-3.75-5.36-10.73-9.12-16.09-12.34-3.75-1.61-5.36-4.83-5.36-6.44,0-2.15,1.61-5.9,10.19-5.9,7.51,0,10.73,8.58,10.73,8.58v-10.73s-5.36-5.36-15.02-5.36M256.91,220.44c-10.19,0-15.55,5.36-15.55,5.36v10.73s3.22-8.58,11.8-8.58,9.12,4.29,9.12,6.44c0,0,1.07,2.68-1.61,6.44-3.75,6.97-33.79,8.58-28.96,31.11,2.15,9.65,8.05,12.34,15.02,12.34,8.58,0,12.34-3.75,14.48-7.51,1.07,6.97,5.36,7.51,5.36,7.51h16.09s-6.44-3.75-6.44-12.87v-35.4c0-8.05-10.73-15.55-20.38-15.55M251.01,276.75c-4.29,0-6.44-3.75-6.44-7.51,0-16.09,12.34-18.24,16.09-22.53v26.82c-1.61,1.07-3.22,3.22-10.19,3.22M174.85,200.06c-4.29,0-7.51,3.75-7.51,8.05,0,3.75,3.75,7.51,7.51,7.51,4.29,0,8.05-3.75,8.05-7.51,0-4.29-3.75-8.05-8.05-8.05M348.63,221.51c-17.7,0-26.82,15.55-26.82,32.72s11.26,30.57,27.35,30.57c13.41,0,18.24-5.36,18.24-5.36v-9.65c-4.29,6.44-9.12,8.05-12.87,8.05-2.23-.08-4.43-.63-6.44-1.61-8.05-3.22-9.12-13.41-9.12-13.41,6.44-6.97,13.41-5.36,22.53-15.02,12.87-12.87,3.75-26.82-13.41-26.82M337.9,256.37s-1.61-28.96,9.65-30.04c9.12,0,6.97,12.87,4.29,17.16-4.29,8.05-10.19,8.58-13.41,12.87M307.86,207.57s-4.29,5.9-11.8,12.34c-4.83,3.75-14.48,8.58-14.48,8.58h10.73v43.98c0,11.8,4.83,11.8,4.83,11.8h16.09s-5.9-3.75-5.9-12.34v-42.91h3.75c5.36,0,10.73,2.15,10.73,2.15v-9.65h-14.48v-13.95M201.67,221.51h-10.73s6.44,2.68,6.44,12.34v37.54c0,12.87,5.36,12.87,5.36,12.87h16.09s-5.9-5.36-5.9-12.87v-30.57c0-2.68,1.61-4.83,3.75-6.44s4.83-2.15,7.51-2.15c3.22,0,7.51,1.61,10.19,5.36v-11.8s-2.15-4.83-8.58-4.83c-10.73,0-13.41,12.87-13.41,12.87-.54-10.19-3.22-12.87-10.73-12.87M171.63,220.97h-10.73s6.44,2.68,6.44,12.87v37.54c0,12.34,5.36,12.87,5.36,12.87h16.63s-6.44-4.29-6.44-12.87v-35.4c0-14.48-8.05-14.48-11.26-14.48M101.91,221.51c-12.34,0-15.55,11.8-15.55,11.8,0,0,0-11.8-10.73-11.8h-10.19s5.36,2.68,5.36,12.87v37.54c0,12.34,5.36,12.87,5.36,12.87h17.7s-6.97-5.36-6.97-12.87v-33.25c0-1.61,3.22-6.97,10.73-6.97,3.22,0,7.51,4.83,7.51,9.65v30.04c0,13.41,5.36,13.41,5.36,13.41h16.09s-5.9-5.36-5.9-12.87v-33.25c0-1.61,2.68-6.44,9.12-6.44,5.36,0,9.12,4.29,9.12,8.58v31.11c0,12.87,5.36,12.87,5.36,12.87h16.09s-5.9-4.29-5.9-12.87v-33.25c0-13.41-10.73-17.16-19.31-17.16-10.73,0-13.41,9.12-15.02,11.8-2.15-8.58-10.73-12.34-17.16-12.34M39.69,205.42H0s6.97,5.36,6.44,17.7v48.27c0,12.34,5.36,12.87,5.36,12.87h39.15c8.58,0,11.26-6.44,11.26-10.19v-4.29s-2.15,5.9-13.95,5.9h-18.77c-5.36,0-5.36-5.36-5.36-9.12v-26.28h13.41c4.29,0,8.58,1.07,12.34,2.68,0,0-4.83-10.73-17.7-10.73h-8.05v-8.58s0-6.97-1.61-9.65h11.8c10.73,0,18.77,0,27.89,5.36,0,0-1.61-13.41-22.53-13.41M158.22,133.01l-10.73,11.8c8.05,7.51,10.73,11.8,11.8,15.02,0,0,11.26-9.12,11.26-12.34,0-5.36-3.22-6.97-10.73-14.48M131.4,112.1h-5.36s5.36,3.75,5.36,12.34v28.96c0,18.77,16.09,35.94,34.86,35.94h15.55c10.19,0,13.41-1.61,18.77-6.97l5.36-5.9c3.75-3.75,7.51-6.97,7.51-16.09v-10.19c0-8.05-5.36-10.73-7.51-13.41l-5.36-5.36v19.31l5.36,5.36c9.12,6.97,2.15,18.24-5.36,18.24h-34.86c-16.63-.54-30.04-13.95-30.04-30.57v-15.55c0-16.09-4.29-16.09-4.29-16.09M206.49.54l-8.05,7.51c-3.22,3.75-2.15,10.73,4.83,16.09v17.16c0,1.07-1.61,2.68-1.61,2.68,0,0-9.12-8.05-17.7-8.05h-13.41c-8.05,0-15.02,6.97-15.55,7.51-3.75,4.29-4.29,12.34,0,16.09l8.58,8.58s-2.15-14.48,0-24.14c0-2.15,2.68-4.83,5.9-4.83,7.51,5.36,14.48,10.19,20.92,16.09l-24.14,25.21c-1.07,1.07-4.29,3.75-7.51,3.75-4.29,0-5.36-2.15-7.51-4.29v11.8c0,4.29,5.36,8.05,10.19,8.05h32.18c2.15,0,5.36,0,7.51-2.15l10.19-11.26c2.15-1.61,2.68-3.75,2.68-6.44v-12.87c0-11.26-9.12-20.38-9.12-20.38,0,0,1.61-2.15,1.61-7.51v-12.34s3.75,3.75,4.29,5.36l6.44-6.44c3.22-3.22-2.15-9.65-3.75-11.8C206.49,6.97,206.49,0,206.49,0M165.73,84.74l27.89-26.82s10.73,10.73,15.02,17.7c1.61,2.68,3.75,9.12-5.9,9.12h-37.01M181.82,133.01l-11.26,10.73c8.05,8.05,10.19,12.34,10.73,16.09,1.07-.54,11.8-9.65,11.8-12.87,0-5.36-3.22-6.97-10.73-14.48M138.91,60.61h-5.36c3.22,1.61,5.9,8.05,5.9,12.34v23.6c0,5.9,5.36,29.5,25.74,29.5h61.14v38.62c0,5.9-2.15,10.19-3.75,11.8l-9.65,7.51h4.29l16.09-15.02c3.22-3.22,7.51-7.51,7.51-19.31v-24.14l6.97-7.51,11.8-10.73c0,9.65,5.36,13.41,9.65,13.41,2.38-.15,4.65-1.1,6.44-2.68l10.73-10.19c5.36-4.83,7.51-20.38-4.29-20.38-7.51,0-16.09,10.73-17.16,12.34l-5.36-5.36v9.12c-1.07,2.15-5.36,5.36-9.65,5.36h-8.58v-9.65c0-4.29,1.61-9.65,3.75-10.73l9.65-9.12h-5.36l-18.24,17.16c-3.22,3.22-5.36,10.19-5.36,11.8h-67.58c-8.05,0-13.41-8.05-13.41-15.02v-17.7c0-14.48-3.75-15.55-4.83-16.09M279.44,111.02c-1.61,0-3.22,0-5.36-2.68-2.11-1.85-3.92-4.02-5.36-6.44.54-1.07,3.75-2.15,6.44-2.15,2.15,0,3.75,0,5.36,1.61,3.22,5.36,2.15,9.65-1.61,9.65M253.69,121.75v19.31l5.9,6.97c5.36,5.36,5.36,15.02-10.73,31.11-2.68,2.68-10.73,10.73-21.99,10.73h-29.5l17.7,15.02h11.26c11.8,0,22.53-5.36,30.04-12.34,6.44-6.97,10.19-16.09,10.19-25.21v-25.21c0-8.05-5.36-13.41-7.51-14.48l-5.36-5.36M249.4.54l-17.7,16.09c-1.61,1.07-5.36,7.51-5.36,15.55v47.2c-.47,3.8-1.75,7.46-3.75,10.73l-9.12,7.51h3.75l17.16-15.02c1.61-2.68,6.44-7.51,6.44-16.09V20.38c0-6.97,3.22-10.73,5.36-12.87.54-1.61,6.44-6.44,7.51-7.51l-4.29.54\\"/></svg>",
"QR":"<svg id=\\"Layer_1\\" xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 140.32 39.77\\"><defs><style>.cls-1{fill:#525a68;}.cls-2{fill:#5c0d34;}.cls-3{fill:#757f8b;}</style></defs><path class=\\"cls-1\\" d=\\"M25.61,35.36h-1.91l1.03-2.35.88,2.35ZM26.79,38h1.47c-.44-.88-1.03-2.35-1.47-3.24-.29-.88-.88-2.21-1.32-3.53h-.59c-.29.74-.74,2.06-1.76,4.26l-1.18,2.5h.88c.15-.59.44-1.32.74-2.06h2.35l.44,1.03.44,1.03Z\\"/><path class=\\"cls-1\\" d=\\"M29,33.59c0,1.62,0,3.24-.15,4.41h1.47c-.15-.74-.15-1.76-.15-3.24,0-1.03,0-2.65.15-3.38h-1.47c.15.88.15,1.62.15,2.21\\"/><path class=\\"cls-1\\" d=\\"M34.88,34.77c.88-.15,1.62-.74,1.62-1.76,0-.44-.15-.74-.44-1.03-.44-.44-.88-.44-1.47-.44h-2.65v2.65c0,1.91,0,2.06-.15,3.97h1.32v-3.09h.29c.59.74,1.18,1.62,1.62,2.35.15.29.29.59.44.74h1.62c-.59-.74-.88-1.18-1.62-2.21-.15-.15-.29-.59-.44-.74l-.15-.44ZM33.26,31.83h.74c.29,0,.59,0,.88.29s.44.59.44,1.03c0,.59-.29,1.32-1.32,1.32h-.74v-2.65Z\\"/><path class=\\"cls-1\\" d=\\"M39.88,35.8c-.44-1.32-1.03-3.24-1.32-4.41h-1.47c.44,1.03.74,1.91,1.03,2.65.44,1.32.74,2.06,1.03,3.24l.29.74h.74c.15-.44.29-1.18.44-1.47.44-1.18.44-1.32.88-2.65l.29-.74c.15.29.29.74.44,1.18.15.29.59,1.76.74,2.06.15.44.15.59.59,1.76h.88c.44-1.18.44-1.32.88-2.79.59-1.47.88-2.35,1.47-3.82h-.88c-.29,1.32-.59,1.91-.74,2.65-.44,1.32-.44,1.47-.74,2.21-.29-.88-.59-1.62-.88-2.5-.44-.59-1.03-2.5-1.03-2.5h-.88c-.29,1.18-1.32,3.97-1.47,4.26l-.15.59-.15-.44Z\\"/><path class=\\"cls-1\\" d=\\"M49.58,35.36h-1.91l1.03-2.35.88,2.35ZM50.76,38h1.47c-.44-.88-1.03-2.35-1.47-3.24-.29-.88-.88-2.21-1.32-3.53h-.59c-.29.74-.74,2.06-1.76,4.26l-1.18,2.5h.88c.15-.59.44-1.32.74-2.06h2.35l.44,1.03.44,1.03Z\\"/><path class=\\"cls-1\\" d=\\"M54.73,35.36q0-.15.15-.29c.44-.74.74-1.47,1.18-2.06.15-.29.88-1.32,1.03-1.62h-1.03c-.74,1.47-.88,1.91-1.62,3.24-.88-1.47-1.18-2.21-1.76-3.24h-1.47c.44.88,1.32,2.21,1.76,3.09l.59,1.03v2.65h1.32v-2.79h-.15Z\\"/><path class=\\"cls-1\\" d=\\"M57.67,36.53c0,.44,0,.59-.29,1.03.29.15,1.03.44,1.76.44,1.76,0,2.5-1.18,2.5-2.06,0-.29,0-.88-.44-1.32-.29-.29-.59-.44-1.32-.74-.88-.29-1.32-.59-1.32-1.18s.44-1.03,1.18-1.03c.59,0,1.18.29,1.32.88h.15q.15-.44.29-.88c-.44-.15-.88-.44-1.62-.44-1.76,0-2.21,1.03-2.21,1.91,0,.74.29,1.32,1.18,1.76.29.15.74.29,1.03.44.15.15.74.29.74,1.18,0,.74-.44,1.18-1.32,1.18-.59,0-1.03-.15-1.62-1.18h0Z\\"/><path class=\\"cls-2\\" d=\\"M3.85,18.59c0-7.35,3.97-9.26,6.91-9.26,4.71,0,6.76,3.97,6.76,8.24,0,2.35-.29,4.71-1.47,6.47-1.18,1.76-3.24,2.94-5.29,2.94-5.29,0-6.91-5.15-6.91-8.38M18.41,33.59c.88-.59,2.21-1.32,3.24-1.76l-6.62-4.12c3.97-1.47,6.62-5,6.62-10,0-6.91-5.29-10-10.74-10C5.03,7.71.03,10.94.03,18.3c-.15,1.76.29,4.71,2.65,7.21,2.5,2.5,5.59,2.94,8.09,2.94h1.03l6.62,5.15Z\\"/><path class=\\"cls-2\\" d=\\"M35.17,19.91c-.88,0-1.76.15-2.65.15-1.03,0-2.06-.15-3.09-.15l2.94-7.21,2.79,7.21ZM38.41,28c.59,0,1.32-.15,2.21-.15s1.76.15,2.21.15c-1.32-2.79-3.24-7.21-4.26-9.71-1.03-2.5-2.79-6.47-4.12-10.44-.29.15-.59.15-.88.15s-.59,0-1.03-.15c-.74,2.35-2.35,6.18-5.29,12.79l-3.38,7.5c.44,0,.88-.15,1.32-.15s1.03.15,1.32.15c.44-1.62,1.32-4.12,2.35-6.32,1.18,0,2.35-.15,3.53-.15s2.5,0,3.68.15l1.18,3.09,1.18,3.09Z\\"/><path class=\\"cls-2\\" d=\\"M51.35,13.3v-3.24c2.06,0,4.12,0,5.74.15-.15-.44-.15-.74-.15-1.03s0-.59.15-1.18c-2.79.29-5.29.29-7.65.29-2.21,0-5.44,0-7.79-.15.15.29.15.74.15,1.03s0,.74-.15,1.03c1.47-.15,4.26-.15,4.56-.15h1.47v11.32c0,2.21-.15,4.41-.29,6.62,1.03-.15,1.47-.15,1.91-.15.29,0,1.32.15,2.06.15v-14.71Z\\"/><path class=\\"cls-2\\" d=\\"M67.53,19.91c-.88,0-1.76.15-2.65.15-1.03,0-2.06-.15-3.09-.15l2.94-7.21,2.79,7.21ZM70.76,28c.59,0,1.32-.15,2.21-.15s1.76.15,2.21.15c-1.32-2.79-3.24-7.21-4.26-9.71-1.03-2.5-2.79-6.47-4.12-10.44-.29.15-.59.15-.88.15s-.59,0-1.03-.15c-.74,2.35-2.35,6.18-5.29,12.79l-3.38,7.5c.44,0,.88-.15,1.32-.15s1.03.15,1.32.15c.44-1.62,1.32-4.12,2.35-6.32,1.18,0,2.35-.15,3.53-.15s2.5,0,3.68.15l1.18,3.09,1.18,3.09Z\\"/><path class=\\"cls-2\\" d=\\"M86.94,18.15c2.65-.44,5-2.21,5-5.44,0-1.18-.44-2.35-1.32-3.24-1.18-1.18-2.65-1.47-4.56-1.47-.74,0-3.97.15-4.85.15-1.47,0-2.21-.15-2.94-.15.15,3.68.15,4.12.15,7.94,0,5.59,0,6.18-.29,11.91.59-.15,1.32-.15,2.06-.15s1.32.15,1.91.15c0-.74-.15-4.56-.15-5.29v-3.97h.74c1.62,2.21,3.38,4.71,4.85,7.06.44.74,1.03,1.76,1.47,2.35.88-.15,1.18-.15,2.35-.15,1.03,0,1.76.15,2.65.15-1.76-2.35-2.65-3.38-4.85-6.47-.44-.59-1.03-1.62-1.47-2.21l-.74-1.18ZM82.08,9.62c.44,0,1.47-.15,2.06-.15,1.03,0,1.91.15,2.65.74,1.03.74,1.18,1.76,1.18,3.09,0,1.91-1.03,3.97-3.97,3.97-.74,0-1.47,0-2.06-.15v-7.5h.15Z\\"/><path class=\\"cls-3\\" d=\\"M130.32,18.15c0,.15-2.65.29-6.32.44-.74-.44-1.18-.74-1.47-1.03,4.41.29,7.79.44,7.79.59\\"/><path class=\\"cls-3\\" d=\\"M127.67,11.83c0,.15-2.21.29-5.29.44.44-.29.88-.59,1.47-.74,2.21.15,3.82.15,3.82.29\\"/><path class=\\"cls-3\\" d=\\"M104.14,25.5h-3.68c-1.47,0-2.65-.44-2.65-1.03s1.18-1.03,2.65-1.03h5c-.88,1.32-1.18,1.91-1.32,2.06h0\\"/><path class=\\"cls-3\\" d=\\"M104.88,26.83c.44.59.88,1.03,1.62,1.62,0,0,.29.29.88,0,.74-.29,1.32-.74,2.06-1.62,2.06,0,4.12.15,6.18.15.15.29.59.74.88,1.47-5.88.15-12.21.29-15.44.29-1.32,0-2.5-.44-2.5-.88,0-.59,1.03-.88,2.5-.88,1.18-.15,2.35-.15,3.82-.15h0\\"/><path class=\\"cls-3\\" d=\\"M102.67,31.68c-1.18,0-2.21-.44-2.21-.88s1.03-.88,2.21-.88c3.24,0,9.71.15,15.29.29.29.44.59.74.74,1.18-5.74.29-12.65.29-16.03.29\\"/><path class=\\"cls-3\\" d=\\"M121.2,34.33c-4.71.15-12.79.29-16.03.29-.88,0-1.76-.29-1.76-.59s.74-.59,1.76-.59c3.24,0,10.74.15,15.44.29.15.15.29.44.59.59\\"/><path class=\\"cls-3\\" d=\\"M109,36.09c2.79,0,11.18.15,11.18.44s-8.38.44-11.18.44c-.59,0-1.03-.15-1.03-.44,0-.15.44-.44,1.03-.44\\"/><path class=\\"cls-3\\" d=\\"M109,19.18c-3.53,0-6.62.15-8.53.15-1.47,0-2.65-.44-2.65-1.03s1.18-1.03,2.65-1.03c2.35,0,6.18,0,10.29.15-.74.59-1.32,1.18-1.76,1.76\\"/><path class=\\"cls-3\\" d=\\"M126.05,14.62c2.06.15,3.38.29,3.38.29,0,.15-1.62.29-3.97.44.44-.29.59-.59.59-.74\\"/><path class=\\"cls-3\\" d=\\"M101.2,15.94c-1.32,0-2.5-.44-2.5-.88,0-.59,1.03-.88,2.5-.88,2.79,0,7.79,0,12.79.15-.59.59-1.18,1.03-1.76,1.62h-11.03\\"/><path class=\\"cls-3\\" d=\\"M116.35,12.56c-5.15.15-10.74.15-13.68.15-1.18,0-2.21-.44-2.21-.88s1.03-.88,2.21-.88c3.24,0,9.71.15,15.29.29-.29.15-.59.44-.88.59-.29.29-.59.44-.74.74\\"/><path class=\\"cls-3\\" d=\\"M105.03,9.33c-.88,0-1.76-.29-1.76-.59s.74-.59,1.76-.59c3.68-.15,12.5,0,16.91.29-.29.15-.59.44-.88.59-4.56.15-12.65.29-16.03.29\\"/><path class=\\"cls-3\\" d=\\"M100.17,22.41c-1.47,0-2.65-.44-2.65-1.03s1.18-1.03,2.65-1.03c1.76,0,4.56,0,7.65.15-.59.74-1.03,1.32-1.47,1.91-2.5,0-4.71,0-6.18,0\\"/><path class=\\"cls-3\\" d=\\"M107.97,6.24c0-.29.44-.44,1.03-.44,2.79,0,11.18.15,11.18.44s-8.38.44-11.18.44c-.59,0-1.03-.29-1.03-.44\\"/><path class=\\"cls-2\\" d=\\"M130.61,20.65v1.47c-4.85.15-9.56.44-9.56.88,0,.29,4.56.59,9.41.88-.15.59-.15,1.18-.29,1.62-4.71.15-9.12.44-9.12.74s4.12.59,8.68.74c-.15.59-.44,1.18-.74,1.76-3.97.15-7.21.44-7.21.74s2.79.44,6.47.74c-.15.29-.44.59-.59.88-.29.29-.44.59-.74,1.03-2.21.15-3.82.29-3.82.59,0,.15,1.03.29,2.79.44-.88.88-2.06,1.76-3.24,2.5,0,0-1.47-1.32-2.79-2.79-1.18-1.32-3.53-5-3.97-5.74-.59-.74-.88-1.03-1.62-.74-.88.29-1.91.44-2.21.44s-.44-.15,0-.29c.59-.15,2.65-1.18,3.53-3.24,1.18-2.21.15-5.44.15-5.44-.44,1.62-1.32,2.35-1.32,2.35.29-1.62,0-2.94-.74-3.97l-.59,1.76s-.29,0-.88.59-.88,1.32-.88,1.32c.59.15,1.18-.29,1.18-.29-.74,2.94-1.91,5.44-2.79,6.76s-1.47,1.76-2.35,2.06c-.74.29-.88,0-.88,0-.59-.59-1.03-1.03-1.62-1.62h.15c.29,0,1.03-.59,1.03-.88.15-.29.15-.44,0-.44s-.15.15-.88.59c-.59.44-1.03.15-1.18-.15-.15-.15,0-.44.15-.59s3.53-6.62,12.79-13.53C129,2.86,136.79.5,137.23.21c.29-.15.74-.29.88-.15.15.15.15.29.15.44s-.15.15-.59.44c-4.71,2.06-10.15,5.44-13.09,7.5-3.82,1.91-7.35,4.56-7.5,4.56-.29.15-.15.44.15.29,6.47-4.26,13.97-7.21,22.21-9.56.44-.15.59-.15.74,0s.15.15.15.29-.15.29-.44.29c-8.97,3.38-15.44,6.32-19.71,9.26,0,0-.44.29-.44.59,0,.15.29.15.29.15,2.06,0,5,.15,6.32.29,0,0-.15.74-1.47,1.18-1.03.44-1.91.29-2.79.29-.15,0-.44.15-.15.44-.29.29,1.62,3.38,8.68,4.12\\"/><path class=\\"cls-2\\" d=\\"M66.05,36.97h-1.18s-.15-.74.29-1.03.88-.44.88-.44v1.47ZM71.64,34.18s-.74.44-1.18.88c-.44.44.15.59.15.59v1.32h-3.53v-4.85s-1.32,1.18-1.32,1.32c-.15.15.29.29.29.29v.44s-.44.29-1.18.74c-.59.44-1.03.88-1.03,1.32,0,.29-.15,1.76-.15,1.76h8.09v-3.82h-.15ZM64.44,32.41c.44,0,.74-.15.74-.44s-.15-.59-.74-.59c-.44,0-.59.15-.59.59.15.29.29.44.59.44M65.91,32.41c.44,0,.74-.15.74-.44s-.15-.59-.74-.59c-.44,0-.59.15-.59.59.15.29.29.44.59.44M68.26,38.44c-.44,0-.59.15-.59.59,0,.29.15.44.59.44s.74-.15.74-.44c-.15-.44-.29-.59-.74-.59M69.73,38.44c-.44,0-.59.15-.59.59,0,.29.15.44.59.44s.74-.15.74-.44c0-.44-.29-.59-.74-.59M87.08,32.41c.44,0,.74-.15.74-.44s-.15-.59-.74-.59c-.44,0-.59.15-.59.59,0,.29.15.44.59.44M88.55,32.41c.44,0,.74-.15.74-.44s-.15-.59-.74-.59c-.44,0-.59.15-.59.59,0,.29.15.44.59.44M92.82,32.56c-.15.15-.15.44.15.44v5.15h1.18v-6.32c0-.15-1.18.44-1.32.74M88.26,35.36h-.74c0-.44.74-.59.74-.59v.59ZM83.41,36.24v.74h-6.47v-1.18c.15-.44.44-.44.88-.44h4.71c1.03,0,.88.59.88.88M90.91,32.86v4.12h-1.47v-3.68s-.29.15-.74.29-1.91.88-1.91,1.62v1.03h1.62v.74h-3.68v-.88c0-1.18-1.03-1.91-1.91-1.91h-4.26c-.74,0-1.18.15-1.32.44v-3.09s-.74.44-1.18.88c-.44.44,0,.59,0,.59v3.97h-1.47v-3.38s-1.03.74-1.32.88-.15.44.15.44v3.09c0,.59-.44,1.32-1.47,1.03,0,0-.29,0,0,.29s.59.44,1.03.44,1.76-.29,1.76-1.76h17.79v-6.32s-1.03.74-1.32.88c-.59.15-.59.29-.29.29\\"/></svg>",
"BA":"<svg id=\\"uuid-c68f7d5f-f971-4f50-817c-b4a0edd18d23\\" xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 168.96 68.35\\"><path d=\\"M6.89,43.11c.71-.35.88-1.06.88-1.77v-15.71c0-.53-.18-1.41-.88-1.77h7.41c3.35,0,6.71,1.41,6.71,5.3,0,1.94-1.77,3.53-3.71,3.88,2.83,0,5.3,1.59,5.3,4.59,0,4.41-4.41,5.47-7.59,5.47H6.89ZM12.89,25.63h-1.24v6.71h.88c2.3,0,4.41-.71,4.41-3.35s-1.77-3.35-4.06-3.35h0ZM13.42,34.1h-1.77v7.06c.88.18,1.77.18,2.65.18,1.94,0,3.88-.71,3.88-3.71,0-2.82-2.29-3.53-4.77-3.53h0ZM30.01,25.63h-.88v6.71h.88c2.12,0,3.71-1.24,3.71-3.53s-1.59-3.18-3.71-3.18h0ZM39.72,43.28c-.71,0-1.59,0-2.29-.35-1.24-.35-3-3.18-3.71-4.41-1.24-1.77-2.12-4.41-4.59-4.41v7.24c0,.71.18,1.41.88,1.77h-5.83c.71-.35.88-1.06.88-1.77v-15.71c0-.53-.18-1.41-.88-1.77h7.06c3,0,6.71,1.24,6.71,4.94,0,3-2.47,4.59-5.3,4.59,3.88,0,6.36,9.36,10.77,9.36-1.24.35-2.47.53-3.71.53h0ZM43.61,43.11c.53-.18,1.06-.88,1.06-1.77v-15.71c0-.88-.53-1.41-1.06-1.77h6c-.53.35-1.06.88-1.06,1.77v15.71c0,.88.53,1.59,1.06,1.77h-6ZM56.5,43.11c.53-.35.88-1.06.88-1.77v-15.18h-4.24c-1.06,0-2.12.18-3,.53l1.41-2.82h13.95c1.06,0,2.29,0,3.35-.18-.53,1.41-2.12,2.47-3,2.47h-4.59v15.18c0,.71.35,1.41,1.06,1.77h-5.83ZM69.56,43.11c.53-.18,1.06-.88,1.06-1.77v-15.71c0-.88-.53-1.41-1.06-1.77h6c-.53.35-1.06.88-1.06,1.77v15.71c0,.88.53,1.59,1.06,1.77h-6ZM87.04,38.69c0-3.53-8.65-4.41-8.65-10.24,0-3.53,3.35-4.77,6.36-4.77,1.41,0,3.35.18,4.59.71l.18,3.71c-.71-1.59-2.65-2.83-4.41-2.83-1.41,0-2.82.71-2.82,2.3,0,3.71,8.83,4.77,8.83,10.24,0,3.88-3.53,5.65-7.06,5.65-1.94,0-4.41-.35-6-1.41,0-.71-.18-1.41-.18-1.94,0-.88.18-1.59.35-2.47.88,2.3,2.82,4.06,5.47,4.06,1.76,0,3.35-.88,3.35-3h0ZM105.4,43.11c.35-.18.88-.88.88-1.77v-7.06c-1.06-.18-2.47-.18-4.06-.18-1.76,0-3.18,0-4.24.18v7.06c0,.88.53,1.59.88,1.77h-5.65c.35-.18.88-.88.88-1.77v-15.71c0-.88-.53-1.41-.88-1.77h5.65c-.35.35-.88.88-.88,1.77v6.53c1.06,0,2.47.18,4.24.18,1.59,0,3-.18,4.06-.18v-6.53c0-.88-.53-1.41-.88-1.77h5.65c-.53.35-.88.88-.88,1.77v15.71c0,.88.35,1.59.88,1.77h-5.65Z\\" style=\\"fill:#14427a; fill-rule:evenodd;\\"/><path d=\\"M14.3,68c.18-.18.35-.35.35-.71,0,0-.18-.35-.18-.71,0,0-1.59-4.24-1.77-4.77h-7.06c-.18.53-1.94,4.77-1.94,4.77-.18.53-.35.71-.35.88,0,.35.35.35.53.53H0c.53-.35,1.06-.88,1.41-1.41l6.18-16.42c.18,0,.18-.18.18-.18,0-.53-.35-.88-.71-1.06h4.94l6.35,17.65c.35.71.88,1.06,1.41,1.41h-5.47ZM9.18,52.46l-2.82,7.41c.88.18,1.77.18,2.65.18s1.94,0,3-.18l-2.83-7.41h0ZM20.66,68c.53-.18,1.06-.88,1.06-1.77v-15.71c0-.88-.53-1.41-1.06-1.59h6c-.53.18-1.06.71-1.06,1.59v15.71c0,.88.53,1.59,1.06,1.77h-6ZM35.49,50.52h-.88v6.71h.88c2.12,0,3.71-1.06,3.71-3.53,0-2.29-1.59-3.18-3.71-3.18h0ZM45.73,68.18c-.88,0-1.59,0-2.29-.18-1.24-.53-3.18-3.36-3.88-4.59-1.06-1.77-2.47-4.41-4.94-4.41v7.24c0,.71.18,1.41.88,1.77h-5.83c.71-.35.88-1.06.88-1.77v-15.71c0-.53-.18-1.41-.88-1.59h7.06c3,0,6.71,1.06,6.71,4.77,0,3-2.83,4.59-4.77,4.59,4.06.18,6.53,9.36,10.59,9.36-1.06.35-2.29.53-3.53.53h0ZM69.56,50.7l-5.83,17.3c-.53,0-1.06-.18-1.24-.35-.53-.53-1.41-2.83-1.77-3.71l-2.65-6.71-3.88,10.77h-1.77l-6.53-17.3c-.18-.71-.71-1.41-1.41-1.77h5.65c-.18.18-.35.35-.35.71,0,.18,0,.53.18.71l4.24,11.48,4.41-12.89,4.94,12.36,3.88-11.3c0-.18.18-.35.18-.53,0-.35-.18-.35-.35-.53h3.71c-.71.35-1.24,1.06-1.41,1.77h0ZM76.45,52.46l-2.82,7.41c.88.18,1.77.18,2.65.18s1.94,0,2.82-.18l-2.65-7.41h0ZM81.39,68c.35-.18.35-.35.35-.71,0,0,0-.35-.18-.71,0,0-1.41-4.24-1.77-4.77h-6.89c-.18.53-1.94,4.77-1.94,4.77-.18.53-.35.71-.35.88,0,.35.35.35.53.53h-3.88c.53-.35,1.06-.88,1.24-1.41l6.36-16.42.18-.18c0-.53-.35-.88-.71-1.06h4.94l6.36,17.65c.35.71.88,1.06,1.41,1.41h-5.65ZM98.69,50.87l-4.41,7.95v7.42c0,.71.18,1.41.71,1.77h-5.47c.53-.35.71-1.06.71-1.77v-7.42l-3.88-6.36c-.35-.53-1.94-3.35-4.06-3.35.53-.18,2.29-.53,3.35-.53,1.94,0,2.82.18,3.88,1.94l3.71,5.82c.35-.53,3.18-5.65,3.18-5.65.35-.53.53-1.06.53-1.24s0-.35-.35-.53h4.06c-.71.35-1.41,1.24-1.94,1.94h0ZM109.28,63.59c0-3.53-8.47-4.41-8.47-10.24,0-3.53,3.35-4.77,6.36-4.77,1.41,0,3.35.18,4.59.71l.18,3.71c-.71-1.59-2.65-2.82-4.41-2.82-1.41,0-2.82.71-2.82,2.29,0,3.71,8.65,4.77,8.65,10.24,0,4.06-3.35,5.65-6.88,5.65-1.94,0-4.41-.35-6-1.41,0-.71-.18-1.24-.18-1.94,0-.88.18-1.59.18-2.29,1.06,2.12,3,3.88,5.47,3.88,1.94,0,3.35-.88,3.35-3h0Z\\" style=\\"fill:#14427a; fill-rule:evenodd;\\"/><path d=\\"M161.01,10.62c-3.35,3.18-10.41,6-13.77,7.24-4.77,1.77-6.88,2.47-9.53,3.35-3,.88-9,2.82-9,2.82,12.36,3.71,21.19,4.77,21.19,4.77,0,0,4.06-1.24,10.59-4.77,3.53-1.77,5.12-2.82,6.36-4.06.53-.35,1.76-1.59,1.94-3.18,0-.18.18-.35.18-.71v-.35c-.18-.18-.18-.35-.18-.35,0,0,0-.35-.18-.71,0-.18-.35-1.06-1.06-1.59-.53-.35-1.24-1.24-3.88-2.12-.88-.35-2.47-.71-2.47-.71l-.18.35h0Z\\" style=\\"fill:#14427a; fill-rule:evenodd;\\"/><path d=\\"M168.96,15.92s0-.35-.18-.53c0-.35-.18-.53-.35-.88-.18-.18-.53-.53-.88-1.06-.35-.18-.71-.53-1.06-.88-1.77-1.06-3.88-1.59-5.83-1.94-3-.35-6.53-.35-6.89-.35-1.06,0-8.3,0-10.06.18-8.12.18-18.18.18-20.83.18-27.01,0-38.84-.53-51.91-3.18-11.12-2.12-17.3-4.24-17.3-4.24C63.56,2.85,120.94.38,131.35.2c6.89-.18,11.65-.35,15.54,0,2.12,0,3.88.18,6.18.71,2.12.35,4.06.88,5.12,1.24,2.29.88,4.41,2.12,5.3,3.53,0,0,.35.18.71.71.35.71.88,1.41,1.06,1.59,1.41,2.29,2.12,3.53,2.29,4.06.35.53.53,1.06.71,1.59.35.35.35.71.35.88.18.53.18,1.06.35,1.24v.18h0Z\\" style=\\"fill:#e11a27; fill-rule:evenodd;\\"/></svg>",
"LH":"<svg xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 279.5 47.91\\"><path d=\\"M651.75,528V512.85c0-6.34-3.7-8.58-10.4-8.58s-10.08,2.6-10.36,7.48h6.71c.09-1.28.82-2.24,3.65-2.24,2.51,0,3.7.82,3.7,2.05s-.69,1.51-2.37,1.69l-4.38.45c-5.93.64-8.62,3.1-8.62,7.58,0,4.15,2.56,7.35,8,7.35,3.69,0,5.89-1.19,7.8-3.56V528h6.3ZM645.18,519c0,2.51-2.37,4.38-6,4.38-1.78,0-2.83-.82-2.83-2.37,0-1.19.73-2.19,3.06-2.51l4-.55a11.51,11.51,0,0,0,1.82-.36V519Zm-30.94-7.62c0-1,.87-1.78,3.15-1.78s3.06.82,3.28,2.14h6.71c-.32-5-3.7-7.48-10-7.48-6.8,0-10,3.24-10,7.62,0,4.56,2.92,6.53,8,7.21l2.42.32c2.37.32,3.29.87,3.29,2.05s-1.1,1.92-3.79,1.92-3.83-.82-4-2.51h-6.8c.14,4.61,2.92,7.76,10.81,7.76,7.26,0,10.68-2.87,10.68-7.71s-2.92-6.62-8.76-7.39l-2.42-.32c-2-.27-2.51-.82-2.51-1.83ZM597.74,528h6.89V514.49c0-7.58-3.06-10.22-9-10.22-3.69,0-5.66,1.55-6.61,3.33V505H582.5v23h6.89V514.81c0-3.06,1.55-4.43,4.15-4.43,2.87,0,4.2,1.37,4.2,4.43V528Zm-24.38,0h6.3V512.85c0-6.34-3.7-8.58-10.4-8.58s-10.08,2.6-10.36,7.48h6.71c.09-1.28.82-2.24,3.65-2.24,2.51,0,3.7.82,3.7,2.05s-.68,1.51-2.37,1.69l-4.38.45c-5.93.64-8.62,3.1-8.62,7.58,0,4.15,2.55,7.35,8,7.35,3.7,0,5.89-1.19,7.8-3.56V528Zm-.27-8.94c0,2.51-2.37,4.38-6,4.38-1.78,0-2.83-.82-2.83-2.37,0-1.19.73-2.19,3.06-2.51l4-.55a11.67,11.67,0,0,0,1.83-.36ZM548.63,528h6.89V514.49c0-7.58-3.06-10.22-8.9-10.22-3.24,0-5.11,1.23-6.3,2.92V496.06h-6.94V528h6.89V514.81c0-3.06,1.55-4.43,4.15-4.43,2.87,0,4.2,1.37,4.2,4.43V528Zm-20.55.41a16.77,16.77,0,0,0,3.29-.36v-5.52s-1.14.14-2,.14c-2,0-3.29-.64-3.29-3.1v-8.95h5.25V505h-5.25v-6.71h-6.89V505h-3.47v5.61h3.47v9.72c0,5.57,3.33,8.07,8.85,8.07Zm-19.17-17.8H514V505h-5.07V504c0-2,1.14-2.74,3.29-2.74.82,0,1.78.09,1.78.09v-5.57a13.77,13.77,0,0,0-2.92-.27c-5.52,0-9,3-9,8.53V505h-3.47v5.61H502V528h6.89V510.57ZM490.26,528h6.48V505h-6.89V518.1c0,3.06-1.55,4.43-4.06,4.43-2.78,0-4.11-1.37-4.11-4.43V505h-6.89v13.46c0,7.57,3.06,10.22,8.94,10.22,3.61,0,5.57-1.55,6.53-3.33V528Zm-38.15,0h21.13v-6.44H459.5V496h-7.39Zm-31.94-16a24,24,0,1,0-24,24A23.9,23.9,0,0,0,420.16,512Zm-1.72,0a22.23,22.23,0,1,1-22.23-22.23A22.28,22.28,0,0,1,418.44,512Zm-13.75-1.44c-.53,0-1.2,0-2.06,0l.62-1.05h1a49.4,49.4,0,0,1,8.72.62l1.1-1.05a56,56,0,0,0-9.39-.77h-.81l.53-1h.91a52.11,52.11,0,0,1,9.73.86l1.15-1.1a58.11,58.11,0,0,0-11.12-1q-2.54,0-5.08.24c-1.92,4.12-5,6.52-8.43,6.47a12.66,12.66,0,0,1-5.17-1.77l-2-1.15.62-.57,4.65,2,1-.77-9.39-4.26-1.44,1.1L376.47,506l0,1.39A54.16,54.16,0,0,1,387.63,514,46.47,46.47,0,0,0,407,522.35l2-1.92h-.48c-5.08,0-9.63-1.68-12.27-4.5,2.2-1.34,4.93-2,8.72-2,1,0,2.44.09,3.79.24l1.15-1.1a45.64,45.64,0,0,0-5.41-.34q-1.82,0-3.64.14l.86-1.05q1.53-.09,3.07-.1a38.49,38.49,0,0,1,6.13.38l1.1-1.05A48.47,48.47,0,0,0,404.69,510.56Z\\" transform=\\"translate(-372.25 -488.04)\\" style=\\"fill:#05164d\\"/></svg>",
"AF":"<svg id=\\"Layer_1\\" xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 189 25\\"><defs><style>.cls-1{fill:none;}.cls-2{fill:#051039;}.cls-3{fill:red;}</style></defs><path class=\\"cls-3\\" d=\\"M178.21,4.67l-8.44,12.4c-1.11,1.63-2.91,3.2-5.09,3.37v.38h9.39c2.49,0,4.31-1.65,5.54-3.46l8.67-12.69h-10.06Z\\"/><path class=\\"cls-2\\" d=\\"M22.78,20.81V6.03h4.25v14.79h-4.25,0ZM120.78,20.81l-10.21-8.78v8.78h-3.59V6.03h3.05l10.07,8.64V6.03h3.59v14.79h-2.91ZM142.98,10.8c-1.92-.96-4.08-1.74-6.95-1.74-3.42,0-5.98,1.8-5.98,4.3s2.6,4.38,5.95,4.38c2.76,0,4.95-.72,7.12-1.98v3.66c-1.91.96-4.44,1.68-7.3,1.68-5.82,0-10.41-3.02-10.41-7.73s4.67-7.61,10.39-7.61c2.7,0,5.15.52,7.18,1.36v3.69ZM50.67,20.81V6.03h14.2v3.17h-9.95v3.67h9.73v3.17h-9.73v4.77h-4.25ZM145.55,20.81V6.03h14.74v3.17h-10.49v2.56h10.33v3.17h-10.33v2.71h10.45v3.17h-14.7ZM79.64,15.26l5.87,5.55h-4.53c-1.01,0-1.67-.32-2.19-.84l-3.99-3.93c-.09-.08-.22-.13-.34-.12h-2.72v4.89h-4.25V6.03h9.2c4.77,0,6.79,2.18,6.79,4.59,0,2.81-2.46,4.15-3.83,4.65h0ZM76.24,12.83c1.68,0,2.49-.87,2.49-1.84s-.72-1.78-2.49-1.78h-4.52v3.63h4.52ZM43.17,15.27l5.87,5.55h-4.53c-1.01,0-1.67-.32-2.19-.84l-3.99-3.93c-.09-.08-.22-.13-.35-.12h-2.72v4.89h-4.25V6.03h9.2c4.77,0,6.79,2.18,6.79,4.59,0,2.81-2.46,4.15-3.83,4.65M39.77,12.83c1.68,0,2.49-.87,2.49-1.84s-.72-1.78-2.49-1.78h-4.52v3.63h4.52ZM16.13,20.81l-1.86-3.25H6.13l-1.7,3.25H.38L8.49,6.04h3.69l9.19,14.77h-5.24ZM7.75,14.49h4.74l-2.46-4.51-2.28,4.51ZM100.97,20.81l-1.82-3.25h-7.92l-1.64,3.25h-3.95l7.9-14.77h3.59l8.93,14.77h-5.09ZM92.82,14.49h4.62l-2.4-4.51-2.22,4.51Z\\"/><path class=\\"cls-1\\" d=\\"M0,0h189v25H0V0Z\\"/></svg>",
"CX":"<svg xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 248.5 34.73\\"><path d=\\"M495.63,526.76c0-2,0-10.57,0-12.6s1.15-2.18,1.15-2.18l.12-.11h-6.15l.11.11s1.15.15,1.15,2.18,0,4.94,0,4.94h-8.45v-4.94c0-2,1.15-2.17,1.15-2.17l.11-.12h-6.14l.12.12s1.15.14,1.15,2.17v12.6c0,2-1.15,2.2-1.15,2.2l-.12.11h6.14l-.11-.11s-1.15-.17-1.15-2.2v-6H492v6c0,2-1.15,2.2-1.15,2.2l-.12.11h6.15l-.12-.11s-1.15-.17-1.15-2.2Zm-32.25-14.88a6.13,6.13,0,0,1-2.31-.19v3.42l.12-.09a3.55,3.55,0,0,1,2.95-1.48H467v13.23c0,2-1.14,2.2-1.14,2.2l-.12.11h6.14l-.11-.11s-1.15-.17-1.15-2.2l0-13.23h2.82a3.7,3.7,0,0,1,3,1.48l.12.09v-3.42a6.16,6.16,0,0,1-2.31.19ZM504,522.52l2.66-5.58,2.42,5.58Zm11,4.24L507.48,511,500,526.76c-1.12,2.15-2.36,2.2-2.36,2.2l-.12.12h5.14l-.11-.12s-1.44-.28-.53-2.2l1.35-2.78h6.44l1.3,2.78c.92,1.92-.52,2.2-.52,2.2l-.12.12h7.08l-.12-.12s-1.31,0-2.36-2.2Zm12.13-14.88.12.12s1.52.43.37,2.21c-.56.87-2.25,3.29-3.79,5.63-1.55-2.34-3.21-4.78-3.77-5.65-1.14-1.79.38-2.2.38-2.2l.11-.12h-7.08l.11.12s1,.17,2.37,2.2c.56.86,3.44,4.88,5,7.22v5.35c0,2-1.15,2.2-1.15,2.2l-.11.11h6.14l-.12-.11s-1.14-.17-1.14-2.2c0-.86,0-3,0-5.35,1.55-2.35,4.43-6.35,5-7.21a4.51,4.51,0,0,1,2.86-2.21l.12-.12Zm-90.33,15.57c-3.7,0-6.25-2.42-6.25-6.85s2.48-7.31,6.38-7.31a6,6,0,0,1,5.51,3.15l.1.08v-3.72a14.58,14.58,0,0,0-5.88-1.19c-6.24,0-10.15,3.85-10.15,9,0,4.16,3.23,8.74,9.9,8.74a20.12,20.12,0,0,0,5.45-1l1.35-4.61-.15.1s-2.19,3.6-6.25,3.6Zm13.07-4.93,2.65-5.58,2.42,5.58Zm11,4.24L453.35,511l-7.51,15.74c-1.12,2.15-2.37,2.2-2.37,2.2l-.11.12h5.14l-.12-.12s-1.44-.28-.52-2.2L449.2,524h6.44l1.31,2.78c.91,1.92-.53,2.2-.53,2.2l-.11.12h7.08l-.12-.12s-1.31,0-2.36-2.2Z\\" transform=\\"translate(-387.75 -494.64)\\" style=\\"fill:#005d63\\"/><path d=\\"M556.5,522.52l2.65-5.58,2.42,5.58Zm11,4.24L559.94,511l-7.51,15.74c-1.13,2.15-2.36,2.2-2.36,2.2l-.12.12h5.14L555,529s-1.44-.28-.53-2.2L555.8,524h6.43l1.31,2.78c.91,1.92-.53,2.2-.53,2.2l-.11.12H570l-.12-.12s-1.3,0-2.36-2.2Z\\" transform=\\"translate(-387.75 -494.64)\\" style=\\"fill:#005d63\\"/><path d=\\"M617.7,512l.11-.11h-6.14l.11.11s1.15.17,1.15,2.2v12.6c0,2-1.15,2.2-1.15,2.2l-.11.12h6.14l-.11-.12s-1.15-.17-1.15-2.2v-12.6c0-2,1.15-2.2,1.15-2.2\\" transform=\\"translate(-387.75 -494.64)\\" style=\\"fill:#005d63\\"/><path d=\\"M579.4,527.45c-3.69,0-6.24-2.42-6.24-6.85s2.48-7.31,6.39-7.31a6,6,0,0,1,5.5,3.15l.1.08v-3.72a14.59,14.59,0,0,0-5.88-1.19c-6.24,0-10.15,3.85-10.15,9,0,4.16,3.23,8.74,9.9,8.74a20.08,20.08,0,0,0,5.45-1l1.35-4.61-.15.1s-2.19,3.6-6.25,3.6\\" transform=\\"translate(-387.75 -494.64)\\" style=\\"fill:#005d63\\"/><path d=\\"M597.36,511.88l.11.12s1.15.17,1.15,2.2v12.59c0,2-1.15,2.2-1.15,2.2l-.11.12h6.14l-.12-.12s-1.14-.17-1.14-2.2h0v-6.09h3.63c2,0,2.19.89,2.19.89l.12.12V518l-.12.12s-.17.88-2.19.88h-3.63v-5.5h4.36a3.54,3.54,0,0,1,2.87,1.16l.12.09v-3.07a6.23,6.23,0,0,1-2.32.19Z\\" transform=\\"translate(-387.75 -494.64)\\" style=\\"fill:#005d63\\"/><path d=\\"M594.06,512l.11-.11H588l.12.11s1.15.17,1.15,2.2v12.6c0,2-1.15,2.2-1.15,2.2l-.12.12h6.15l-.11-.12s-1.15-.17-1.15-2.2v-12.6c0-2,1.15-2.2,1.15-2.2\\" transform=\\"translate(-387.75 -494.64)\\" style=\\"fill:#005d63\\"/><path d=\\"M636.1,523.85a7.88,7.88,0,0,1-6.25,3.6c-3.69,0-6.25-2.42-6.25-6.85s2.48-7.31,6.39-7.31a6,6,0,0,1,5.51,3.15l.1.08v-3.72a14.61,14.61,0,0,0-5.88-1.19c-6.23,0-10.15,3.85-10.15,9,0,4.16,3.23,8.74,9.9,8.74a20.08,20.08,0,0,0,5.44-1l1.35-4.61Z\\" transform=\\"translate(-387.75 -494.64)\\" style=\\"fill:#005d63\\"/><path d=\\"M543.45,514.19v-.67h.81a10,10,0,0,1,2.63.2c1.62.48,2.44,1.72,2.44,3.67a3.78,3.78,0,0,1-3.8,4,5.4,5.4,0,0,1-2.07-.51Zm3.27,8.81a5.79,5.79,0,0,0,6.05-5.65c0-1.54-.57-4.27-4.4-5.23a12.62,12.62,0,0,0-3.06-.23h-6.74l.11.11s1.15.17,1.15,2.2v12.6c0,2-1.15,2.2-1.15,2.2l-.11.12h6.14l-.11-.12s-1.14-.17-1.14-2.2V522.4a8,8,0,0,0,3.27.6Z\\" transform=\\"translate(-387.75 -494.64)\\" style=\\"fill:#005d63\\"/><path d=\\"M398.33,511.34c-.11,0-.24-.15-.29-.23s-.08-.15-.06-.17.15,0,.19.05a.55.55,0,0,1,.19.32,0,0,0,0,1,0,0m-2.73-1.52c-.08,0-.27-.19-.32-.27s-.19-.31-.3-.45a.8.8,0,0,1-.23-.44s0-.09,0-.09.2.19.26.26l.12.16c.05.08.07.17.13.25s.15.17.21.26a.59.59,0,0,1,.11.16s0,.16,0,.17m-.78,0c-.06,0-.08,0-.12-.07a.43.43,0,0,1-.18-.35s0,0,0,0,.23.18.28.26a.32.32,0,0,1,0,.14s0,0,0,0m-2.6.53a0,0,0,0,1,0,0c-.12,0-.16-.19-.22-.27l-.13-.22a1.39,1.39,0,0,1-.1-.16,1.52,1.52,0,0,0-.09-.21l-.08-.09a1.25,1.25,0,0,1-.17-.3l0-.12-.08-.22a.37.37,0,0,1,0-.14s0,0,0,0,.19.25.23.33.13.16.18.26.05.19.1.27.1.11.13.17a2.13,2.13,0,0,1,.13.27c0,.1.11.17.15.27a.28.28,0,0,1,0,.15m-.48-3.55a1.15,1.15,0,0,1-.07-.14c0-.05,0-.1,0-.15l-.23-.5a.44.44,0,0,1,0-.28s0,0,0,0l.06.06,0,.07a1.42,1.42,0,0,1,.11.17c.06.13.08.28.14.41s.11.16.15.25a1,1,0,0,1,0,.15.63.63,0,0,1,0,.12s0,.07,0,.07-.15-.15-.19-.23m24.74,11c-.14-.53-1.7-.3-3-.42a18.14,18.14,0,0,1-4.45-.94,32.34,32.34,0,0,1-4.72-2l-.63-.34-.33-.2-.25-.14a1.7,1.7,0,0,1-.25-.15l-.29-.16c-.13-.08-.21-.14-.33-.23L402,513l-.23-.13-.3-.22-.21-.13-.23-.17-.14-.1-.25-.22-.23-.19-.18-.15-.34-.25c-.08-.06-.15-.14-.23-.2l-.27-.21-.18-.15-.18-.2c0-.05-.14-.11-.19-.16a1.69,1.69,0,0,0-.3-.29l-.1-.11-.09-.11-.09-.09-.12-.11-.09-.12-.08-.11-.15-.16-.11-.11-.06-.09-.06-.08s-.06,0-.07,0,0,.06,0,.11a1.58,1.58,0,0,0,.11.17l0,0,0,.06.06.09a1.66,1.66,0,0,0,.15.17l0,.05.09.11.09.12,0,.06.05.06.09.09.14.14.11.11.28.33a1,1,0,0,0,.19.15,1,1,0,0,1,.16.19l.16.16a1.29,1.29,0,0,0,.28.28.93.93,0,0,1,.19.18l.18.2a.52.52,0,0,1,.14.26c-.07,0-.24-.13-.34-.2l-.18-.14a1.54,1.54,0,0,1-.19-.16l-.16-.17a2.76,2.76,0,0,0-.36-.35c-.12-.12-.27-.22-.38-.33l-.1-.11-.12-.11a1.66,1.66,0,0,0-.19-.25l-.19-.15-.07-.07-.1-.08-.24-.31-.13-.14c-.08-.11-.14-.22-.22-.32s-.27-.25-.37-.39-.17-.32-.28-.48-.11-.12-.16-.18,0-.08-.07-.12l-.17-.25c-.07-.11-.12-.22-.19-.34a1,1,0,0,0-.08-.15,2.3,2.3,0,0,1-.13-.2l-.11-.19-.08-.15-.09-.14c-.07-.1-.08-.15-.16-.25s-.09-.11-.13-.09,0,.06,0,.08a.58.58,0,0,0,.06.13c.05.1.07.15.13.24s.08.15.11.2l.1.17a2,2,0,0,0,.11.23,1.37,1.37,0,0,1,.1.17,2.85,2.85,0,0,0,.19.29l.12.22c.08.12.17.23.25.35l.14.26c0,.07.11.13.16.2s.09.18.14.26l.15.2.22.33.14.17c.06.08.11.18.17.25a1.55,1.55,0,0,1,.15.18c.09.1.3.41.27.41s-.37-.26-.47-.36a2.38,2.38,0,0,1-.22-.21c-.08-.11-.14-.23-.22-.34l-.1-.11a1.94,1.94,0,0,0-.17-.21l-.08-.08c-.1-.13-.18-.26-.28-.4l-.13-.16s0-.09-.08-.13l-.13-.18-.08-.13c-.05-.08-.12-.15-.17-.23s-.05-.15-.1-.22l-.33-.5s0-.09-.06-.13L395,507c0-.05,0-.11-.08-.16s-.1-.11-.14-.17a1.18,1.18,0,0,1-.07-.15c0-.07-.08-.14-.11-.21s0-.08-.06-.12a4.51,4.51,0,0,1-.27-.51c0-.09-.11-.18-.15-.27l-.14-.31-.07-.21c-.05-.11-.13-.2-.18-.31s-.05-.15-.08-.21-.06-.07-.08-.05,0,.05,0,.11a2.55,2.55,0,0,0,.13.31c.06.13.09.26.15.4s.08.14.11.21l.17.37c0,.07.06.14.1.2l.07.11c0,.08,0,.17.09.25s.1.15.14.23a10.44,10.44,0,0,0,.64,1.19c.07.1.1.23.17.33s.16.19.23.3.07.21.12.3.18.26.26.39,0,.08.05.12l.11.15c0,.07.07.15.11.21s.12.13.17.2.11.19.17.27.12.1.16.16l.4.52a3.56,3.56,0,0,1,.4.53c0,.06.13.19.11.22s-.3-.24-.34-.28a3.42,3.42,0,0,1-.28-.35l-.28-.29-.07-.09c-.07-.1-.11-.22-.18-.31l-.1-.11c-.06-.07-.09-.16-.15-.23s-.19-.22-.28-.34-.16-.28-.25-.4-.11-.12-.15-.18l0-.09a1.45,1.45,0,0,1-.11-.17,1.34,1.34,0,0,0-.07-.15l-.29-.47c0-.07-.07-.14-.11-.21s-.17-.22-.24-.33-.13-.3-.22-.43l-.18-.26c-.06-.1-.09-.21-.15-.31s-.12-.17-.16-.26-.08-.19-.13-.3-.06-.11-.09-.16,0-.14-.07-.21-.21-.37-.3-.55-.12-.27-.17-.41,0-.15-.08-.22-.17-.35-.25-.52l-.1-.27a.68.68,0,0,0,0-.08c0-.08-.08-.16-.11-.24l-.09-.28c-.12-.3-.23-.64-.34-1,0-.06,0-.13,0-.19l-.18-.48c0-.08-.11-.05-.09,0s0,.14.06.23l0,.13c0,.05,0,.11.06.16s0,.19.07.28.09.26.14.39l0,.2.07.18c.07.16.13.32.19.49l.07.28.08.16s0,.09,0,.13.08.21.13.32.09.18.12.27,0,.08,0,.13c.1.28.21.57.33.83,0,.07,0,.13.07.2l.08.17,0,.11c0,.08.1.14.14.22a4.25,4.25,0,0,0,.32.6,3.62,3.62,0,0,1,.26.6,1.94,1.94,0,0,0,.15.26s0,.09.07.14a2.39,2.39,0,0,0,.16.29.79.79,0,0,1,.1.2,1.25,1.25,0,0,1,.06.23s-.12,0-.15-.08a.81.81,0,0,1-.17-.23l-.1-.2a3.32,3.32,0,0,0-.25-.37,2.1,2.1,0,0,1-.11-.23l-.21-.43a1.81,1.81,0,0,0-.11-.17c0-.06-.05-.12-.09-.17a3.72,3.72,0,0,1-.23-.4c0-.1-.07-.2-.12-.3l-.06-.09a1.52,1.52,0,0,1-.07-.16c0-.08-.09-.15-.12-.22s-.11-.31-.18-.46-.09-.13-.12-.2-.06-.24-.11-.36c-.13-.3-.28-.61-.4-.92,0-.05,0-.11,0-.17s-.12-.26-.16-.4,0-.12-.05-.18l-.11-.28a.8.8,0,0,0,0-.09c0-.09-.06-.19-.1-.28s-.05-.09-.07-.15,0-.2-.05-.29l-.15-.39c0-.07,0-.14-.06-.22l-.09-.26c0-.09,0-.18-.06-.27s-.05-.14-.07-.21-.06-.25-.11-.37l0-.06s0-.06-.06-.05,0,.06,0,.09a.93.93,0,0,0,.07.25c0,.08,0,.16.06.23s0,.1,0,.15,0,.14.06.21,0,.14,0,.19.1.33.15.47,0,.16,0,.23l.09.23c0,.07,0,.13.06.19a2.11,2.11,0,0,1,.08.21c0,.1,0,.19.06.28s.12.28.17.42,0,.1,0,.16.07.25.12.37.14.34.21.51.07.37.14.53.11.13.15.2a1.24,1.24,0,0,1,0,.16c0,.06.05.13.07.19l0,.16a2.06,2.06,0,0,0,.1.19,2.26,2.26,0,0,0,.13.3,1.83,1.83,0,0,1,.13.21c0,.08.05.17.09.26s.13.25.17.38a2.72,2.72,0,0,0,.12.36c.06.11.13.2.19.31l.11.23c0,.06.09.12.12.18l.12.25a1.28,1.28,0,0,0,.07.17l.14.23a1.5,1.5,0,0,1,.13.25.91.91,0,0,0,.09.19,2.09,2.09,0,0,1,.13.17.64.64,0,0,1,.06.27s-.16-.1-.2-.14-.14-.27-.23-.4a2.13,2.13,0,0,1-.22-.36,3.52,3.52,0,0,0-.17-.33,1.86,1.86,0,0,1-.15-.22c0-.07,0-.15-.07-.22s-.14-.16-.19-.26-.08-.23-.13-.34l-.09-.16c0-.07,0-.13-.08-.2s-.16-.25-.22-.39-.1-.29-.17-.44-.1-.14-.13-.22-.07-.21-.12-.31l-.1-.18c0-.09-.06-.19-.1-.28l-.28-.64c0-.08,0-.16-.08-.25l-.11-.21c-.08-.18-.11-.4-.19-.59s-.09-.18-.13-.28-.08-.32-.14-.48-.16-.51-.25-.75c0-.07,0-.15-.06-.22l-.08-.22c0-.06,0-.14,0-.22l-.2-.63s0-.14,0-.21l0-.11s0-.09,0-.14-.09-.33-.14-.48,0-.12,0-.17c-.07-.22-.1-.49-.19-.69,0,0,0-.08-.08-.07s0,.05,0,.09a2.75,2.75,0,0,0,.06.27s0,.09,0,.13a.76.76,0,0,0,0,.12l.13.41c0,.06,0,.16,0,.23a6.09,6.09,0,0,0,.17.64,4.88,4.88,0,0,1,.13.56c0,.08,0,.16,0,.24a1,1,0,0,0,.08.2s0,.09,0,.14.07.26.12.4.08.18.11.27,0,.08,0,.12,0,.18.06.27l.19.56c0,.1,0,.2.08.3l.43,1.16.07.26c0,.09.08.16.12.24s.06.21.1.31.1.22.15.35,0,.13.07.19.06.09.08.13,0,.17.08.25a2.54,2.54,0,0,0,.15.21,2,2,0,0,1,.08.23c.05.12.12.23.17.35s0,.1.05.15.07.11.1.17h0v0l0,.08a.67.67,0,0,0,.06.12l.06.07,0,0a2.54,2.54,0,0,1,.1.28c0,.09.12.16.16.25s.05.24,0,.24-.19-.25-.25-.38-.12-.18-.17-.28a.51.51,0,0,1,0-.1l0-.1,0-.07-.08-.12h0c-.07-.11-.11-.26-.16-.33l-.09-.12a1.89,1.89,0,0,1-.1-.23c0-.07-.09-.14-.12-.21s0-.2-.08-.28-.06-.1-.08-.14-.08-.21-.13-.31-.06-.09-.09-.14-.06-.17-.1-.25-.19-.35-.27-.52-.06-.21-.1-.31-.09-.17-.13-.26,0-.11-.06-.17l-.12-.3c0-.07,0-.21-.06-.27s-.07-.15-.1-.22-.06-.22-.11-.33-.08-.17-.11-.26,0-.14-.06-.21l-.07-.16c0-.06,0-.17-.06-.25s-.07-.18-.1-.27,0-.22,0-.27c-.1-.28-.19-.59-.28-.87,0-.13-.06-.26-.1-.39s0-.12,0-.17l-.09-.25c0-.06,0-.12,0-.17a1.59,1.59,0,0,0-.07-.18c-.05-.17-.08-.35-.14-.52s0-.16,0-.22-.08-.45-.14-.66c0-.06,0-.13,0-.18-.11-.4-.15-.86-.27-1.25,0-.07,0-.17,0-.25s0-.17-.08-.25,0-.07,0-.11,0-.12-.09-.11,0,.05,0,.11a1.13,1.13,0,0,0,0,.24c0,.06,0,.11,0,.17a4.16,4.16,0,0,1,.07.42s0,.11,0,.17.06.13.07.2,0,.19,0,.28,0,.15.06.22,0,.12,0,.18a1.42,1.42,0,0,1,.06.18c0,.07,0,.18,0,.24.09.36.12.78.22,1.12,0,0,0,.1,0,.15.09.3.15.62.24.91,0,0,0,.09,0,.15s.06.22.08.32,0,.09,0,.14.07.22.1.32,0,.1,0,.16,0,.09,0,.13,0,.12,0,.18a1.12,1.12,0,0,1,0,.11c0,.06,0,.13,0,.19s.07.15.1.22,0,.12,0,.18l.13.34c0,.09,0,.18.07.28l.07.18s0,.1,0,.15a1.53,1.53,0,0,0,.1.17c0,.06,0,.15,0,.22s.06.13.09.2,0,.14,0,.21.06.1.08.15l.06.17.06.11c0,.07.06.14.08.21a3.18,3.18,0,0,1,.07.33s0,.11,0,.12-.1-.06-.13-.11a1.38,1.38,0,0,1-.14-.25l0-.1c0-.07-.05-.16-.09-.23s0-.1-.07-.15,0-.15,0-.22-.07-.09-.09-.15,0-.1,0-.14a1.62,1.62,0,0,0-.09-.16,1.37,1.37,0,0,1,0-.17,1.37,1.37,0,0,0-.07-.21l-.1-.21s0-.08,0-.12l-.07-.16a1.06,1.06,0,0,0,0-.12l-.08-.18c0-.05,0-.11,0-.16l-.09-.28c0-.07,0-.14,0-.21s-.06-.16-.09-.24,0-.13,0-.2-.07-.17-.1-.26,0-.14,0-.21l-.16-.52c-.06-.19-.06-.41-.12-.6s-.09-.27-.13-.41,0-.14,0-.21-.09-.35-.14-.51,0-.17,0-.26,0-.2-.06-.3a1.32,1.32,0,0,1-.06-.18c0-.08,0-.17,0-.22s-.11-.39-.12-.46,0-.18,0-.22-.06-.17-.06-.21,0-.08,0-.16-.06-.24-.07-.29,0-.15,0-.19,0-.16-.06-.24,0-.2,0-.29l-.07-.2a1.43,1.43,0,0,1,0-.17c0-.05,0-.16,0-.2s0-.15,0-.23a1.66,1.66,0,0,0,0-.29s0-.09,0-.12-.05-.21-.11-.2-.05,0,0,.11,0,.15,0,.23a1.35,1.35,0,0,1,0,.19,1.18,1.18,0,0,0,0,.13,1,1,0,0,0,0,.1.55.55,0,0,1,0,.12s0,.08,0,.13a.32.32,0,0,0,0,.08.62.62,0,0,1,0,.1s0,.07,0,.1a.37.37,0,0,0,0,.11.56.56,0,0,1,0,.27.71.71,0,0,0,0,.31c0,.06,0,.13,0,.19l.07.26c0,.07,0,.13,0,.2s.09.22.1.26,0,.16,0,.23,0,.15,0,.2,0,.07,0,.1.05.2.06.24,0,.06,0,.11,0,.22.05.28,0,.09,0,.15.05.16.07.24,0,.1,0,.15,0,.15.06.22,0,.11,0,.17,0,.25.08.38.06.14.09.21,0,.14,0,.2.06.11.07.17,0,.1,0,.16,0,.12.05.18,0,.09,0,.14,0,.1.06.15,0,.13,0,.19.05.15.07.22,0,.14,0,.21.09.32.14.46,0,.16,0,.24a1.47,1.47,0,0,0,.07.14c0,.05,0,.1,0,.16s0,.22.07.31.1.19.13.28,0,.21.07.32.08.18.12.26,0,.17,0,.25.09.15.12.24.06.2.09.3l0,.13c0,.13.11.24.15.36s0,.11,0,.16.07.18.11.27.08.15.12.23,0,.14.07.22l.09.22s0,.09,0,.13c.09.2.2.4.29.59s.07.22.12.33.09.17.13.26,0,.11.06.17.12.21.17.32a.38.38,0,0,1,0,.18v0s-.1,0-.14-.08-.15-.36-.23-.52l-.08-.14a1.05,1.05,0,0,0,0-.1c-.05-.1-.12-.2-.17-.31s0-.17-.08-.25c-.14-.31-.31-.61-.45-.92-.06-.14-.08-.3-.13-.46s-.09-.17-.13-.25,0-.14-.07-.21-.1-.17-.13-.27,0-.13-.05-.19-.07-.12-.1-.19a2.27,2.27,0,0,1-.08-.31l-.06-.18c0-.05,0-.11,0-.16s-.11-.22-.16-.34,0-.18-.06-.26-.08-.12-.11-.18,0-.16,0-.24-.05-.15-.08-.23,0-.09,0-.14l-.1-.29s0-.09,0-.14a1.76,1.76,0,0,1-.09-.17c0-.09,0-.19-.05-.28s-.08-.22-.12-.34,0-.07,0-.12,0-.22-.07-.33,0-.09,0-.14l-.09-.3c0-.06,0-.12,0-.18s-.09-.34-.14-.49,0-.08,0-.13-.09-.26-.11-.38,0-.14,0-.21,0-.16-.06-.25,0-.07,0-.1,0-.11,0-.16c-.05-.22-.14-.48-.19-.7s0-.16,0-.23a1.58,1.58,0,0,0,0-.17,1.27,1.27,0,0,1-.05-.17c0-.09,0-.18,0-.27v0c0-.11-.07-.34-.09-.42l0-.32c0-.07,0-.14,0-.21s0-.21-.05-.32,0-.15,0-.21,0-.11-.06-.11,0,.06,0,.11a2,2,0,0,0,0,.34c0,.13,0,.26,0,.4s0,.15,0,.22,0,.26,0,.38h0a1.52,1.52,0,0,0,0,.17v0h0l0,.07s0,.09,0,.14,0,.31.07.45.09.45.15.66c0,.06,0,.12,0,.19l.05.2c0,.08,0,.16,0,.24l.06.22c0,.09,0,.18,0,.27a2.92,2.92,0,0,1,.08.3c0,.11,0,.24.05.35s.07.21.09.32,0,.07,0,.11,0,.15.05.22,0,.06,0,.1.08.31.12.45,0,.08,0,.12.06.17.07.22,0,.1,0,.15,0,.14.06.21,0,.1,0,.15a1.46,1.46,0,0,0,.07.18c0,.13,0,.26.09.38s.06.14.08.22,0,.16,0,.23l.13.38c.05.14.08.3.13.44s0,.11,0,.17l.13.42c0,.07,0,.14.05.21s.11.21.16.33,0,.2.08.29.11.25.16.39,0,.18.08.27l.11.22.07.2a2.24,2.24,0,0,0,.11.2c0,.09,0,.19.08.28s.12.3.19.43,0,.1.05.16.1.17.14.26,0,.18.09.26a.69.69,0,0,1,.1.36,0,0,0,0,1,0,0s-.07,0-.09-.06a.85.85,0,0,1-.17-.31c-.09-.19-.2-.37-.29-.56s-.06-.2-.11-.31l-.09-.18c0-.09-.06-.18-.11-.26a3.21,3.21,0,0,1-.17-.39s0-.1,0-.14L390,506c0-.08-.05-.18-.09-.26s-.15-.32-.21-.49-.08-.3-.14-.45l-.07-.2c0-.06,0-.11,0-.16s-.12-.29-.18-.42,0-.13-.06-.2l-.1-.26c0-.11,0-.24-.08-.36s-.21-.51-.28-.77c0-.06,0-.12,0-.18l-.13-.42c0-.16,0-.32-.09-.47l-.19-.6c0-.06,0-.12,0-.18s-.09-.33-.14-.47,0-.15-.05-.21-.11-.05-.1,0a1.77,1.77,0,0,0,0,.23c0,.06,0,.11,0,.17s.06.19.09.29,0,.19.06.3l.05.16c0,.1,0,.21.07.31s0,.16.07.24,0,.09,0,.15l.09.28c0,.05,0,.1,0,.15s0,.15.06.22,0,.16,0,.23l.13.38c0,.13.05.28.1.41s.17.52.25.76c0,.06,0,.13,0,.2s.05.21.09.31.05.1.07.15,0,.12.06.18.05.1.07.15,0,.17,0,.24.06.12.08.18,0,.14.05.2.06.11.09.16,0,.1,0,.16.05.12.08.17,0,.13.06.19.06.11.08.17,0,.13,0,.19.1.18.14.27,0,.14.06.21.08.16.12.23.08.21.13.31.1.37.19.54.14.25.2.37,0,.14.07.21.1.14.13.22,0,.15.08.23.11.18.15.28,0,.11.06.16.13.19.18.3l.07.21c.05.11.14.2.19.32a1.92,1.92,0,0,0,.11.25l.2.32c0,.08.11.19.15.28s.1.15.14.23l.13.24c0,.09.1.15.15.23s.14.27.23.41l.19.28c.17.24.43.67.53.82s.16.26.24.38.14.19.21.28l.16.23,0,.06a26.15,26.15,0,0,0,6.51,6h0a8.71,8.71,0,0,0,1.58.83c.13.05,0,.15,0,.19l-11.59,7.42s-.13.09-.09.16.15,0,.18,0c9.3-3.27,16.05-6,20.18-7.92s5.59-3.12,5.44-3.69\\" transform=\\"translate(-387.75 -494.64)\\" style=\\"fill:#005d63\\"/></svg>",
"KE":"<svg id=\\"Layer_1\\" xmlns=\\"http://www.w3.org/2000/svg\\" xmlns:xlink=\\"http://www.w3.org/1999/xlink\\" viewBox=\\"0 0 649.48 99.13\\"><defs><style>.cls-1{mask:url(#mask);}.cls-2{fill:#fff;}.cls-2,.cls-3{fill-rule:evenodd;}.cls-3{fill:#051766;}</style><mask id=\\"mask\\" x=\\"0\\" y=\\"0\\" width=\\"93.93\\" height=\\"99.13\\" maskUnits=\\"userSpaceOnUse\\"><g id=\\"mask0_407_41521\\"><path id=\\"Clip_23\\" class=\\"cls-2\\" d=\\"M0,0h93.93v99.13H0V0Z\\"/></g></mask></defs><g id=\\"Logo\\"><g id=\\"logo\\"><g id=\\"Group_24\\"><g class=\\"cls-1\\"><path id=\\"Fill_22\\" class=\\"cls-3\\" d=\\"M6.54,73.9l-.4.27c8.08,14.89,23.37,24.96,40.82,24.96,25.95,0,46.96-22.21,46.96-49.57,0-7.53-3.12-13.88-6.82-18.69-4.91-6.39-11.9-9.47-18.86-9.52-5.75-.05-11.7,1.88-15.89,5.68-4.78,4.34-5.85,9.91-7.09,18.96-1.36,9.91-9.34,16.75-19.6,16.75-13.28,0-21.51-8.18-20.97-20.69.05-.87.12-1.73.27-2.58,2.5-14.77,18.39-30.01,42.28-29.96,16.03,0,28.08,3.59,40.12,15.71l.4-.27C79.7,10.06,64.44,0,46.96,0,21.04,0,0,22.21,0,49.57c0,7.53,3.12,13.88,6.82,18.69,4.88,6.39,11.9,9.44,18.86,9.52,5.75.07,11.7-1.88,15.89-5.68,4.78-4.34,5.85-9.91,7.09-18.96,1.36-9.91,9.37-16.75,19.6-16.75,13.31,0,21.54,8.18,20.99,20.69-.05.87-.12,1.74-.27,2.58-2.55,14.77-18.36,30.01-42.3,29.96-16.03,0-28.08-3.59-40.12-15.71\\"/></g></g><path id=\\"Fill_25\\" class=\\"cls-3\\" d=\\"M182.29,74.01c1.47,1.55,2.81,2.77,4.02,3.66h-7.64c-2.68,0-5.01-.47-7.01-1.42-1.99-.94-3.94-2.57-5.83-4.88l-18.97-23.69,24.48-26.21h12.59l-24.56,25.74,17.08,20.15c2.41,2.89,4.36,5.1,5.82,6.65h0ZM134.03,77.67h11.18V21.46h-11.18v56.21Z\\"/><path id=\\"Fill_27\\" class=\\"cls-3\\" d=\\"M225.5,67.44c2.78-1.57,4.96-3.88,6.53-6.93,1.57-3.04,2.36-6.69,2.36-10.94s-.79-7.9-2.36-10.94c-1.57-3.04-3.75-5.35-6.53-6.93-2.78-1.57-5.96-2.36-9.53-2.36s-6.82.79-9.6,2.36c-2.78,1.57-4.96,3.88-6.53,6.93-1.57,3.04-2.36,6.69-2.36,10.94s.79,7.9,2.36,10.94c1.57,3.04,3.75,5.35,6.53,6.93,2.78,1.57,5.98,2.36,9.6,2.36s6.74-.79,9.53-2.36M200.63,74.95c-4.57-2.44-8.15-5.86-10.75-10.27-2.6-4.41-3.9-9.45-3.9-15.11s1.3-10.71,3.9-15.11c2.6-4.41,6.18-7.83,10.75-10.27,4.57-2.44,9.68-3.66,15.35-3.66s10.71,1.22,15.27,3.66c4.57,2.44,8.15,5.88,10.75,10.31,2.6,4.44,3.9,9.46,3.9,15.07s-1.3,10.64-3.9,15.07c-2.6,4.44-6.18,7.87-10.75,10.31-4.57,2.44-9.66,3.66-15.27,3.66s-10.78-1.22-15.35-3.66\\"/><path id=\\"Fill_29\\" class=\\"cls-3\\" d=\\"M308,77.67h-7.08c-2.89,0-5.33-.5-7.32-1.5-2-1-3.83-2.6-5.51-4.8l-17-22.83h5.12c4.2,0,7.37-.8,9.53-2.4,2.15-1.6,3.23-3.95,3.23-7.05s-1.06-5.3-3.19-6.77c-2.13-1.47-5.39-2.2-9.8-2.2h-7.01v47.55h-11.18V21.46h20.47c4.46,0,8.36.68,11.69,2.05,3.33,1.37,5.89,3.32,7.68,5.86,1.78,2.55,2.68,5.52,2.68,8.93,0,3.78-1.09,7.07-3.27,9.88-2.18,2.81-5.24,4.89-9.17,6.26l10.31,12.91c3.52,4.41,6.8,7.85,9.84,10.31\\"/><path id=\\"Fill_31\\" class=\\"cls-3\\" d=\\"M351.92,68.85v8.82h-37V21.46h36.21v8.82h-25.03v14.01h21.02v8.66h-21.02v15.9h25.82Z\\"/><path id=\\"Fill_33\\" class=\\"cls-3\\" d=\\"M395.38,57.75l-8.97-20.7-8.98,20.7h17.95ZM417.1,77.67h-6.69c-2.21,0-4.04-.51-5.51-1.53-1.47-1.02-2.78-2.85-3.94-5.47l-1.89-4.41h-25.35l-4.96,11.41h-10.55l25.82-56.2h6.14l20.07,43.61c2.84,6.14,5.12,10.34,6.85,12.59h0Z\\"/><path id=\\"Fill_35\\" class=\\"cls-3\\" d=\\"M474.72,21.46v56.21h-6.14l-34.32-37v37h-9.61V21.46h6.14l34.32,37V21.46h9.61Z\\"/><path id=\\"Fill_37\\" class=\\"cls-3\\" d=\\"M541.95,57.75l-8.98-20.7-8.97,20.7h17.95ZM563.68,77.67h-6.69c-2.2,0-4.04-.51-5.51-1.53-1.47-1.02-2.78-2.85-3.93-5.47l-1.89-4.41h-25.35l-4.96,11.41h-10.55l25.82-56.2h6.14l20.07,43.61c2.83,6.14,5.12,10.34,6.85,12.59h0Z\\"/><path id=\\"Fill_39\\" class=\\"cls-3\\" d=\\"M571.23,77.67h11.18V21.46h-11.18v56.2Z\\"/><path id=\\"Fill_41\\" class=\\"cls-3\\" d=\\"M649.48,77.67h-7.08c-2.89,0-5.33-.5-7.32-1.5-2-1-3.83-2.6-5.51-4.8l-17-22.83h5.12c4.2,0,7.37-.8,9.53-2.4,2.15-1.6,3.23-3.95,3.23-7.05s-1.06-5.3-3.19-6.77c-2.13-1.47-5.39-2.2-9.8-2.2h-7.01v47.55h-11.18V21.46h20.46c4.46,0,8.36.68,11.69,2.05,3.33,1.37,5.89,3.32,7.68,5.86,1.78,2.55,2.68,5.52,2.68,8.93,0,3.78-1.09,7.07-3.27,9.88-2.18,2.81-5.23,4.89-9.17,6.26l10.31,12.91c3.52,4.41,6.8,7.85,9.84,10.31\\"/></g></g></svg>",
"JL":"<svg xmlns=\\"http://www.w3.org/2000/svg\\" width=\\"223.22\\" height=\\"50.75\\" viewBox=\\"0 0 223.22 50.75\\"><polygon points=\\"25.74 41.09 27.69 41.09 27.61 38.77 25.74 41.09\\" style=\\"fill:#e60012\\"/><path d=\\"M323,386.24a25.51,25.51,0,0,0-.13-5.62s0,0,0,0a15.18,15.18,0,0,1-5.57,8.55,0,0,0,1,1,0,0,18.58,18.58,0,0,0,5.12-11.33,25.48,25.48,0,0,0-2.58-6.39s0,0,0,0a17.44,17.44,0,0,1-4.39,14.08s-.07,0,0,0a19.73,19.73,0,0,0,2.86-16.54,25.36,25.36,0,0,0-40.82,0,19.73,19.73,0,0,0,2.85,16.54s0,.07,0,0a17.42,17.42,0,0,1-4.39-14.08s0,0,0,0a25.36,25.36,0,0,0-2.57,6.39,18.51,18.51,0,0,0,5.12,11.33,0,0,0,1,1,0,0,15.15,15.15,0,0,1-5.58-8.55s0,0,0,0a25.86,25.86,0,0,0-.12,5.62,15.27,15.27,0,0,0,4.64,6.67s0,.07,0,.05A13.63,13.63,0,0,1,273,389.2s0,0,0,0a25.37,25.37,0,0,0,49.66,0s0,0,0,0a13.65,13.65,0,0,1-4.14,3.76s-.06,0,0-.05a15.27,15.27,0,0,0,4.64-6.67m-34.69,16.54a11.15,11.15,0,0,1-2.4-.24l.59-1.54c1.58.19,2.95.05,3.47-1.34l1.69-4.38h3.46l-1.85,4.83c-.95,2.47-3.28,2.67-4.94,2.67m11.84-.24-.06-1.43H297l-1.15,1.43H293l5.8-6.72a1.48,1.48,0,0,1,1.06-.54H303l.69,7.26Zm12.24,0h-7.85l2.79-7.26h3.46l-2.2,5.72H313Zm-3.19-15.32c-5.19,5-12.94,1.82-12.15-4.37.6-4.79,6.47-9.54,10.9-12.13a0,0,0,0,0,0-.06c-.58-.55-1.78-1.81-2.57-2.74a5.09,5.09,0,0,0-8.15.15l-12.76,1.19a0,0,0,1,0,0,.08l13.67.79c2.43.13,3.22,2.34.88,4.11-8.69,6.59-10.24,13.55-8.3,19.07a0,0,0,0,1-.06,0,11.2,11.2,0,0,1-1.72-4,16.33,16.33,0,1,1,20.24-2.15\\" transform=\\"translate(-272.39 -358.63)\\" style=\\"fill:#e60012\\"/><polygon points=\\"163.49 21.04 157.9 21.04 153.21 12.48 149.93 21.04 144.35 21.04 149.91 6.55 156.4 6.55 160.54 14.16 163.46 6.55 169.05 6.55 163.49 21.04\\"/><path d=\\"M352,374.81c-1.88,4.93-6.56,5.34-9.88,5.34a22.2,22.2,0,0,1-4.8-.49l1.18-3.07c3.17.37,5.87.1,6.93-2.67l3.36-8.75h6.91l-3.7,9.64\\" transform=\\"translate(-272.39 -358.63)\\"/><path d=\\"M391.12,365.17H380.37l-5.56,14.49h6.91l2-5.26h3.84c6.39,0,9.83-1.71,10.94-4.62s-1-4.62-7.4-4.62m.49,4.62a3.26,3.26,0,0,1-3,1.83h-3.83l1.4-3.67h3.85c1.26,0,2,.77,1.55,1.83\\" transform=\\"translate(-272.39 -358.63)\\"/><path d=\\"M371.68,365.17H365.5a3,3,0,0,0-2.13,1.08l-11.57,13.42h5.71l2.3-2.85H366l.11,2.85h6.91l-1.38-14.49M362,374l3.72-4.63.18,4.63Z\\" transform=\\"translate(-272.39 -358.63)\\"/><path d=\\"M413.6,365.17h-6.18a3,3,0,0,0-2.13,1.08l-11.57,13.42h5.71l2.29-2.85H408l.11,2.85H415l-1.38-14.49M404,374l3.72-4.63.17,4.63Z\\" transform=\\"translate(-272.39 -358.63)\\"/><path d=\\"M493.72,398.3c-1.45,3.79-6.49,5-11.93,5s-8.92-1.18-8.11-5h6.91c-.17,1,.44,1.65,2.48,1.65s3.36-.65,3.74-1.65c1-2.48-12.72-.06-10.54-5.73,1.21-3.17,6-4.66,11.42-4.66s8.48,1.16,7.83,4.66h-6.77c.1-.94-.18-1.65-2.21-1.65s-3.13.72-3.49,1.65c-1,2.52,12.84.07,10.67,5.73\\" transform=\\"translate(-272.39 -358.63)\\"/><polygon points=\\"100.39 44.22 93.47 44.22 99.03 29.72 105.94 29.72 100.39 44.22\\"/><polygon points=\\"152.66 44.22 145.75 44.22 151.31 29.72 158.22 29.72 152.66 44.22\\"/><polygon points=\\"197.18 44.22 180.38 44.22 185.95 29.72 202.75 29.72 201.67 32.51 191.78 32.51 190.66 35.43 198.89 35.43 197.82 38.2 189.59 38.2 188.47 41.14 198.35 41.14 197.18 44.22\\"/><polygon points=\\"176.09 44.22 170.5 44.22 165.82 35.66 162.53 44.22 156.95 44.22 162.51 29.72 169.01 29.72 173.14 37.34 176.07 29.72 181.65 29.72 176.09 44.22\\"/><path d=\\"M393.37,388.35H382.63l-5.57,14.49H384l2-5.26h2.09l1.36,5.26H397l-1.85-5.79c3.06-.72,4.88-2.13,5.63-4.09,1.12-2.9-1-4.62-7.4-4.62m.49,4.62a3.26,3.26,0,0,1-3,1.83h-3.84l1.41-3.67h3.85c1.26,0,2,.78,1.55,1.84\\" transform=\\"translate(-272.39 -358.63)\\"/><polygon points=\\"136.11 41.14 140.51 29.72 133.6 29.72 128.04 44.22 143.72 44.22 144.91 41.14 136.11 41.14\\"/><path d=\\"M362.72,388.35h-6.18a3,3,0,0,0-2.13,1.07l-11.57,13.42h5.7l2.3-2.85h6.24l.11,2.85h6.91l-1.39-14.49m-9.63,8.85,3.72-4.63.17,4.63Z\\" transform=\\"translate(-272.39 -358.63)\\"/></svg>",
"BR":"<svg id=\\"uuid-1f206692-a3fb-46bf-81e1-fb0df5613682\\" xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 211.42 47.84\\"><path d=\\"M0,47.72v-17.57h20.1v4.58H7.33v1.74h12.81v4.42H7.35v2.23h12.75v4.59H0ZM30.14,47.72l-7.2-17.57h7.68l3.84,10.6,4.05-10.6h7.73l-7.5,17.57h-8.59ZM53.68,41.31h4.4l-2.17-5.75-2.23,5.75h0ZM43.41,47.72l7.99-17.57h9.14l7.74,17.57h-7.83l-.94-2.49h-7.32l-.97,2.49h-7.81ZM84.31,41.31h4.4l-2.17-5.75-2.23,5.75h0ZM74.03,47.72l7.99-17.57h9.14l7.74,17.57h-7.83l-.94-2.49h-7.32l-.97,2.49h-7.81ZM103.78,47.72v-17.57h7.47v17.57h-7.47ZM122.49,37.55h4.58c.64,0,1.22-.2,1.65-.55.43-.35.64-.8.58-1.27-.05-.43-.3-.8-.72-1.09-.42-.29-.95-.44-1.52-.44h-4.57v3.35h0ZM122.45,47.72h-7.3v-17.57h14.2c1.62,0,3.11.3,4.49.93,1.55.69,2.56,1.82,2.81,3.15.32,1.54-.31,3.05-1.76,4.18-.67.53-1.46.87-2.4,1.04,1.65.29,2.91,1.25,3.29,2.48.13.44.21.85.26,1.3.13,1.23.26,2.34.42,3.56.04.35.23.66.54.92h-7.32c-.32-.37-.51-.77-.57-1.21-.17-1.12-.3-2.14-.41-3.27-.05-.45-.3-.86-.75-1.17-.45-.31-1-.48-1.61-.49h-3.87s0,6.14,0,6.14h0Z\\" style=\\"fill:#009f4e; fill-rule:evenodd;\\"/><path d=\\"M208.26.1h3.15l-16.62,47.75h-3.42c5.26-16.6,10.54-31.53,16.88-47.75h0Z\\" style=\\"fill:#eb6431; fill-rule:evenodd;\\"/><polygon points=\\"177.41 12.76 178.76 18.64 181.69 16.85 181.9 17.01 180.75 20.16 185.57 21.15 185.54 21.78 180.77 22.82 182.41 26.42 181.94 26.73 178.72 25.11 177.41 31.82 177.13 31.82 175.78 25.11 172.71 26.8 172.34 26.42 173.96 22.84 168.72 21.78 168.63 21.18 173.92 20.21 172.69 17.13 172.89 16.94 175.93 18.64 177.13 12.76 177.41 12.76 177.41 12.76 177.41 12.76\\" style=\\"fill:#009f4e; fill-rule:evenodd;\\"/><path d=\\"M160.72,28.54l19.28-24.27,3.04,1.37c1.07.35,2.01.76,3,1.3,2.74,1.58,4.86,3.69,6.45,6.43.38.65.69,1.26.98,1.96.31.76.56,1.48.78,2.27,2.08,7.64-1.33,15.84-8.21,19.75-.96.53-1.87.95-2.9,1.32-3.9,1.44-7.94,1.44-11.83,0-1.03-.38-1.94-.79-2.9-1.32-2.74-1.58-4.86-3.69-6.45-6.43-.47-.8-.86-1.55-1.23-2.4h0ZM165.23,29.18h-2.52c.18.37.36.7.57,1.05.74,1.28,1.57,2.36,2.62,3.39l.35.33.17.16h3.36c-1.15-1.54-1.98-3.12-2.6-4.94h-1.95ZM164.37,28.59l2.63.03c-.59-1.94-.9-3.77-.97-5.79l-3.93,4.96c.12.29.23.55.35.84l1.92-.03h0ZM169.17,22.36l-2.85.06c.06,2.14.37,4.09.99,6.14l4.92-.04c-.31-2.1-.46-4.04-.47-6.16h-2.59ZM168.63,34.61h-1.59c.72.61,1.43,1.1,2.25,1.56,1.17.74,2.34,1.27,3.68,1.66.88.28,1.68.5,2.58.72l-2.88-1.54c-.34-.16-.63-.34-.93-.57-.33-.25-.6-.5-.88-.8-.31-.33-.56-.65-.82-1.02h-1.42ZM171.36,33.99l2.25.02c-.3-.79-.53-1.53-.74-2.35-.22-.88-.39-1.69-.54-2.58l-4.87.06c.48,1.28,1.02,2.4,1.72,3.57.27.48.55.9.88,1.34l1.31-.06h0ZM177.06,34.58h-2.97c.23.62.48,1.17.8,1.75.34.55.71,1.02,1.18,1.47.21.2.41.36.65.53.11.07.21.13.34.18v-3.93h0ZM176.15,38.12c-.32-.3-.59-.6-.86-.96-.3-.39-.54-.76-.78-1.19-.26-.47-.48-.9-.68-1.4l-3.47.05c.4.49.8.9,1.28,1.31.43.37.86.67,1.36.94l2.96,1.6c.26.09.51.1.78.05-.22-.12-.41-.25-.59-.43h0ZM177.38,9.71h2.97c-.23-.62-.48-1.17-.8-1.75-.16-.31-.34-.58-.55-.87-.08-.11-.17-.21-.28-.3l-1.35,1.72v1.21h0ZM177.4,38.47c.27-.15.51-.31.75-.51.26-.22.48-.45.7-.71.65-.8,1.12-1.62,1.47-2.58h-2.95l.03,3.81h0ZM177.73,38.51c.25.05.48.05.73-.02.13-.04.24-.08.36-.14l2.7-1.48c.67-.35,1.23-.76,1.77-1.29.3-.29.56-.57.83-.9l-3.54-.02c-.24.58-.49,1.09-.8,1.62-.28.48-.57.9-.93,1.33-.22.26-.45.47-.73.67-.13.09-.25.16-.39.22h0ZM179.14,6.98c.59.89,1.05,1.75,1.47,2.73l3.47-.05c-.4-.49-.8-.9-1.28-1.31-.43-.37-.86-.67-1.36-.94l-2.26-1.22-.36.44c.12.11.22.22.31.36h0ZM180.17,38.2c1.82-.39,3.42-1.02,5.02-1.98.88-.5,1.64-1.03,2.42-1.68l-3.17.12c-.5.69-1.04,1.26-1.71,1.79-.3.23-.59.42-.92.6l-2.54,1.34c.31-.04.6-.11.9-.2h0ZM183.08,10.3l-2.25-.02c.3.79.53,1.53.74,2.35.22.88.39,1.69.54,2.58l4.87-.06c-.48-1.28-1.02-2.4-1.72-3.57-.27-.48-.55-.9-.88-1.34l-1.31.06h0ZM184.74,29.13l-2.65.04c-.26,1.74-.66,3.3-1.28,4.94h1.65l1.94-.07c1.17-1.52,1.99-3.08,2.58-4.91h-2.24ZM184.46,28.6l2.71-.06c.61-2.04.9-3.98.94-6.11h-5.45c-.01,2.13-.16,4.07-.47,6.17h2.28ZM185.81,9.68h1.59c-.72-.61-1.43-1.1-2.25-1.56-1.17-.74-2.34-1.27-3.68-1.66-.71-.22-1.36-.41-2.08-.58l-.07.1,2.45,1.3c.34.16.63.34.93.57.33.25.6.5.88.8.31.33.56.65.82,1.02h1.42ZM186.15,34.08h1.91s.35-.32.35-.32l.17-.17c1.05-1.04,1.88-2.12,2.62-3.39.21-.35.39-.68.57-1.06h-4.47c-.6,1.83-1.43,3.41-2.6,4.94h1.45ZM190.07,15.7l-2.63-.03c.63,2.06.94,4.01.98,6.17h4.95c-.05-2.19-.5-4.17-1.38-6.17l-1.92.03h0ZM189.2,15.11h2.52c-.18-.37-.36-.7-.57-1.05-.74-1.28-1.57-2.36-2.62-3.39l-.35-.33-.17-.16h-3.36c1.15,1.54,1.98,3.12,2.6,4.94h1.95ZM189.47,28.58h2.56c.34-.78.6-1.51.83-2.34.35-1.29.52-2.5.56-3.83h-4.95c-.03,2.15-.34,4.11-.98,6.17h1.98ZM182.64,20.43l-.45-.09c-.07-1.57-.21-2.99-.46-4.55h-3.66s-.13-.6-.13-.6l3.76.02-.2-1.19c-.22-1.2-.48-2.27-.85-3.43l-.09-.26-.02-.05h-3.17s0,2.46,0,2.46l-.02-.1h-.28v.05s0-2.49,0-2.49h-1.06s-3.07,3.87-3.07,3.87c-.07.37-.12.7-.17,1.08h3.8s-.13.62-.13.62h-3.77c-.22,1.58-.34,3.02-.39,4.62l-.45.08c.06-1.64.2-3.13.44-4.76h-.5s-4.91,6.18-4.91,6.18l2.85-.02,2.51.51c0,1.27.07,2.42.18,3.68l-.11.24.15.16c.08.71.16,1.35.27,2.06h3.73s.12.6.12.6l-3.81-.02.2,1.19c.22,1.2.48,2.27.85,3.43l.09.26.02.05h3.17s0-2.37,0-2.37v.04h.29l.02-.12v2.54h3.15c.54-1.66.9-3.21,1.15-4.94h-3.83s.12-.62.12-.62h3.81c.1-.7.17-1.33.23-2.03l.34-.22-.27-.6c.08-1.1.11-2.11.11-3.21h-.51s2.47-.53,2.47-.53h1.13s2.85-.06,2.85-.06c-.06-2.14-.37-4.09-.99-6.14l-4.92.04c.24,1.59.37,3.04.44,4.65h0Z\\" style=\\"fill:#eb6431; fill-rule:evenodd;\\"/><path d=\\"M184.62,0h21.7s-16.27,46.99-16.27,46.99c-.18.52-.68.87-1.23.86h-43.12L182.55,1c.5-.65,1.25-1.01,2.07-1h0ZM161.09,28.94l19.28-24.27,2.79.94c1.07.35,2.01.76,2.99,1.3,2.74,1.58,4.86,3.69,6.45,6.43.38.65.69,1.26.98,1.96.32.76.56,1.48.78,2.27,2.08,7.64-1.33,15.84-8.21,19.75-.96.53-1.87.95-2.9,1.32-3.9,1.44-7.94,1.44-11.83,0-1.03-.38-1.94-.79-2.9-1.32-2.74-1.58-4.86-3.69-6.45-6.43-.38-.65-.69-1.26-.98-1.96h0Z\\" style=\\"fill:#009f4e; fill-rule:evenodd;\\"/></svg>",
"UA":"<svg id=\\"Layer_1\\" data-name=\\"Layer 1\\" xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 696.37 118.29\\"><g id=\\"_Group_\\" data-name=\\"&lt;Group&gt;\\"><polygon id=\\"_Path_\\" data-name=\\"&lt;Path&gt;\\" points=\\"152.49 31.72 152.49 68.83 116.52 31.72 101.28 31.72 101.28 93.61 117.69 93.61 117.69 54.87 155.74 93.61 168.9 93.61 168.9 31.72 152.49 31.72\\" style=\\"fill:#0033a0\\"/><polygon id=\\"_Path_2\\" data-name=\\"&lt;Path&gt;\\" points=\\"207.93 45.91 207.93 31.72 225.84 31.72 225.84 93.61 207.93 93.61 207.93 45.91\\" style=\\"fill:#0033a0\\"/><polygon id=\\"_Path_3\\" data-name=\\"&lt;Path&gt;\\" points=\\"368.14 68.83 368.14 80.13 408.67 80.13 408.67 93.61 350.62 93.61 350.62 31.72 408.42 31.72 408.42 45.28 368.14 45.28 368.14 56.26 402.25 56.26 402.25 68.83 368.14 68.83\\" style=\\"fill:#0033a0\\"/><polygon id=\\"_Path_4\\" data-name=\\"&lt;Path&gt;\\" points=\\"297.27 45.73 297.27 93.61 279.66 93.61 279.66 45.73 256.98 45.73 256.98 31.72 319.99 31.72 319.99 45.73 297.27 45.73\\" style=\\"fill:#0033a0\\"/><g id=\\"_Group_2\\" data-name=\\"&lt;Group&gt;\\"><path id=\\"_Compound_Path_\\" data-name=\\"&lt;Compound Path&gt;\\" d=\\"M495.82,370.46H509c14.46,0,20.35,6.07,20.35,17.08,0,11.27-6,17-20.35,17H495.82Zm-17.57-13.89v61.89H509.4c25.65,0,38.25-11.62,38.25-31,0-18.35-11.35-30.84-38.25-30.87Z\\" transform=\\"translate(-35.81 -324.85)\\" style=\\"fill:#0033a0\\"/><path id=\\"_Path_5\\" data-name=\\"&lt;Path&gt;\\" d=\\"M103.38,391.17c0,18.93-11.79,28.42-33.66,28.42s-33.91-9.46-33.9-28.31v-34.7H53.38v34.74c0,9.43,5.36,14.15,16.4,14.11s16.07-4.63,16.08-14V356.58h17.52Z\\" transform=\\"translate(-35.81 -324.85)\\" style=\\"fill:#0033a0\\"/><path id=\\"_Path_6\\" data-name=\\"&lt;Path&gt;\\" d=\\"M591.82,337.52c10.46-.46,16,5.47,17.82,12.73,3.62,14.42-4.44,28.53-17.82,37.61l0-5.14c1.51-.81,5.58-4.22,6.69-6a23.45,23.45,0,0,0-6.73-1v-6.51a46.89,46.89,0,0,1,11.14,1.09,16.1,16.1,0,0,0,2.48-5.93,55.32,55.32,0,0,0-13.62.07v-4.56a57.2,57.2,0,0,1,14.82-1.42,11.49,11.49,0,0,0-.29-4.87,57.05,57.05,0,0,0-14.51,1.74v-3.69c3.26-1.39,10.64-2.69,13.77-2.89a7.52,7.52,0,0,0-2.05-3.7,61.4,61.4,0,0,0-11.72,2.48V344a31.83,31.83,0,0,1,8.55-2.13,17,17,0,0,0-8.54-1.72Z\\" transform=\\"translate(-35.81 -324.85)\\" style=\\"fill:#0033a0\\"/><path id=\\"_Path_7\\" data-name=\\"&lt;Path&gt;\\" d=\\"M600.67,336c24.18-4.47,35.12,6.22,28.56,32.29-6.08,21.44-18.92,35.85-37.4,46.89V403.91a18.32,18.32,0,0,1,3.41,4.19,24.73,24.73,0,0,0,6.26-4.54,49.16,49.16,0,0,0-9.66-9.09s0-1.38,0-1.46c2.52-1.34,6.88-4.56,8.77-7.06,3.1,1.33,9.22,6.35,10.6,8.17a34.37,34.37,0,0,0,5.91-8.28,39.51,39.51,0,0,0-10.73-6.14,25.4,25.4,0,0,0,4.75-7.68c3,.67,8.61,2.3,11.2,3.81a30.56,30.56,0,0,0,2.91-8.48A53.57,53.57,0,0,0,613.78,365a26.67,26.67,0,0,0,.69-6.62,58.61,58.61,0,0,1,12.37,1.17,15.41,15.41,0,0,0,.21-5.91,68.32,68.32,0,0,0-13-.57,14.54,14.54,0,0,0-1.17-5.09,60.63,60.63,0,0,1,12.9-.15,9.61,9.61,0,0,0-2.82-4.73,57.57,57.57,0,0,0-11.81.67,9.92,9.92,0,0,0-3-3.46,35.73,35.73,0,0,1,9.67-1c-2.11-1.09-6.12-2.12-12.29-1.31a15.24,15.24,0,0,0-4.88-1.93\\" transform=\\"translate(-35.81 -324.85)\\" style=\\"fill:#0033a0\\"/><path id=\\"_Path_8\\" data-name=\\"&lt;Path&gt;\\" d=\\"M709.53,442.6V324.85H591.86v9.7c16.83-5.34,50.34-2.3,69.79,15.17,15.81,14.22,26.62,32.2,27.94,57,.81,15.09-3.1,28.52-6.8,35.87Z\\" transform=\\"translate(-35.81 -324.85)\\" style=\\"fill:#0033a0\\"/><path id=\\"_Path_9\\" data-name=\\"&lt;Path&gt;\\" d=\\"M642.41,350.63a26.14,26.14,0,0,0-8.28-2.11,22.91,22.91,0,0,1,.81,5.8,45.2,45.2,0,0,1,9.73,2.69,23.35,23.35,0,0,1,.92,7.81,41,41,0,0,0-10.92-4.05,36,36,0,0,1-1.49,8.45,50.12,50.12,0,0,1,11.22,5.55,34.55,34.55,0,0,1-3.47,11,51.2,51.2,0,0,0-11.35-7.1c-1,3.14-3.87,9.14-5.9,11.57a50.42,50.42,0,0,1,9.85,8.57,33.65,33.65,0,0,1-7.64,9.52,42.08,42.08,0,0,0-8.1-10,42.35,42.35,0,0,1-10.93,11.12,52.42,52.42,0,0,1,7.2,9.66,38.39,38.39,0,0,1-8.82,6.27,43,43,0,0,0-5-10.59c-2,2.06-5.2,3.74-8.42,5.4v16.49c21.54-7.8,49.51-30.12,56.16-60.33,3.24-14.7,0-23.59-3.08-28.44-5-7.94-14.19-9.52-18.34-10.13a17.16,17.16,0,0,1,5.5,5.12c6.78,1.24,9.22,5.35,10.36,7.74\\" transform=\\"translate(-35.81 -324.85)\\" style=\\"fill:#0033a0\\"/><path id=\\"_Path_10\\" data-name=\\"&lt;Path&gt;\\" d=\\"M591.81,442.52v-1.39c6.85-2.06,14.82-6.39,18.19-9.36A48.85,48.85,0,0,1,612.73,442a39.36,39.36,0,0,0,9.28-7.34,34.73,34.73,0,0,0-3.79-8A71.4,71.4,0,0,0,631.69,414a38.31,38.31,0,0,1,3.86,8.62,52.07,52.07,0,0,0,9.47-11.1,32,32,0,0,0-5.6-7.17A50.45,50.45,0,0,0,647.36,390c1.89,1.07,5.16,4.72,6.36,6.59a42.4,42.4,0,0,0,4.57-13.78,21,21,0,0,0-6.64-5,37.25,37.25,0,0,0,1.44-10.53,23.48,23.48,0,0,1,6.46,4.59,25.5,25.5,0,0,0-.77-9.31,18.19,18.19,0,0,0-6.2-3.68,19.94,19.94,0,0,0-1.68-6,19.17,19.17,0,0,1,5.64,3.13,13.43,13.43,0,0,0-6.82-6.49,22.77,22.77,0,0,0-3.43-4.72c13.59,4.6,15.22,14.26,16.22,18.09,2.25,14.6-.79,27.62-7.31,40.19-8.26,16-18.42,25.17-36.07,39.46Z\\" transform=\\"translate(-35.81 -324.85)\\" style=\\"fill:#0033a0\\"/><path id=\\"_Path_11\\" data-name=\\"&lt;Path&gt;\\" d=\\"M625.54,442.56a58.07,58.07,0,0,0,14.52-12.94C641.33,432.51,642,438,642,438c2.91-2.45,8.93-9,10.95-12.57a25.11,25.11,0,0,0-3.1-6.52c4-3.91,7.86-11.08,9.27-15.86A19,19,0,0,1,663,409.4a54.56,54.56,0,0,0,6-16.56,20.16,20.16,0,0,0-3.89-5.46,35.81,35.81,0,0,0,1.65-11.69,23,23,0,0,1,4.36,5.47c0-6.54-.68-10.73-4.59-14.22a22,22,0,0,0-1.86-7.69c5.77,4.89,10.87,11.4,9.4,25.94-2.2,21.92-15.13,42.82-30.39,57.38Z\\" transform=\\"translate(-35.81 -324.85)\\" style=\\"fill:#0033a0\\"/><path id=\\"_Path_12\\" data-name=\\"&lt;Path&gt;\\" d=\\"M667.61,442.61c3.22-2.93,4.84-5.86,6.63-9.67a19.11,19.11,0,0,1,1.23,6.53c.94-2.78,6.09-11.24,6-23.11a74.65,74.65,0,0,0,3.08-17c1.8,8.52,1.8,27.37-6.52,43.29Z\\" transform=\\"translate(-35.81 -324.85)\\" style=\\"fill:#0033a0\\"/><path id=\\"_Path_13\\" data-name=\\"&lt;Path&gt;\\" d=\\"M679,391.26a13.1,13.1,0,0,0-1.79-8.42,52.7,52.7,0,0,0-.7-7.87c3.41,4.67,6.29,9.87,5.18,22.14-1.91,16.6-6.91,33.28-19.66,45.5H657a26.63,26.63,0,0,0-.89-7.59c4.75-4.89,9.9-13,11.82-18.89a24.13,24.13,0,0,1,2.39,8.52A62.79,62.79,0,0,0,677,404.11a16,16,0,0,0-2.24-5.07,41.5,41.5,0,0,0,2.18-11.47,13.13,13.13,0,0,1,2.06,3.69\\" transform=\\"translate(-35.81 -324.85)\\" style=\\"fill:#0033a0\\"/><path id=\\"_Compound_Path_2\\" data-name=\\"&lt;Compound Path&gt;\\" d=\\"M716.47,435.32a7.86,7.86,0,1,1,7.86,7.82,7.79,7.79,0,0,1-7.86-7.82m14.52,0a6.66,6.66,0,1,0-6.66,6.62,6.67,6.67,0,0,0,6.66-6.62m-2.93,4.24h-1.45l-2.57-4H722.6v4h-1.2V431h3.73c1.54,0,3.06.42,3.06,2.27,0,1.69-1.19,2.31-2.72,2.35Zm-4-5.16c1.07,0,2.94.19,2.94-1.17,0-.89-1.16-1-2.09-1H722.6v2.22Z\\" transform=\\"translate(-35.81 -324.85)\\" style=\\"fill:#0033a0\\"/></g></g></svg>",
"ET":"<svg xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 229.5 94.37\\"><path d=\\"M573.88,510.35A183.58,183.58,0,0,0,596,511.52c5.28-.17,9.26.58,13.72-4.15,4.67-4.84,4.12-7.36,1.3-6.58-4.18,1.25-19.44,6.45-37.44,9-.81.11-.61.54.34.6\\" transform=\\"translate(-397.25 -464.82)\\" style=\\"fill:#c43c30\\"/><path d=\\"M569.8,509.05c12.31-3.13,43.11-19.68,47.67-22.63,2.26-1.4,4.74-.57.76,5.91-2.7,4-4.57,6.3-11.79,8.5-5,1.88-23.41,7.25-36.33,8.81-1,.08-1.25-.27-.31-.59\\" transform=\\"translate(-397.25 -464.82)\\" style=\\"fill:#f9cb2e\\"/><path d=\\"M571,508.19c10.74-3.77,34.11-16.07,42.08-21,5.73-3.49,10.16-6.07,11.9-10.44,3.7-10,.87-14.06-2.65-10.94-4.5,4.37-25.63,26.53-52.67,42.12-.41.23-.48.77,1.34.22\\" transform=\\"translate(-397.25 -464.82)\\" style=\\"fill:#5e8c4d\\"/><path d=\\"M406.72,507.49v10.63h6.37l2.24-1.28v4.54l-2.26-1.28h-6.35v6.68c0,1.49,0,3.88,0,3.88h9.46l3.64-3.73v5.72H397.25l2.95-2.12V507.89l-2.95-2.38h21.84v5.09l-3.69-3.11h-8.68Z\\" transform=\\"translate(-397.25 -464.82)\\" style=\\"fill:#c43c30\\"/><path d=\\"M431,507.09v6.84h4.44v2H431v11.55c0,1.08,0,2.09,0,2.09a2,2,0,0,0,1.38.63,2.6,2.6,0,0,0,2.46-1.56l.6.44q-1.62,3.84-5.26,3.84a4.65,4.65,0,0,1-3-1,4.37,4.37,0,0,1-1.57-2.21,18.82,18.82,0,0,1-.2-3.68v-10.1h-3.91Z\\" transform=\\"translate(-397.25 -464.82)\\" style=\\"fill:#c43c30\\"/><path d=\\"M473.21,513.72V531.1c.87.59,2,1.54,2,1.54h-9.57l2-1.54V518a27.64,27.64,0,0,0-2.66-2Z\\" transform=\\"translate(-397.25 -464.82)\\" style=\\"fill:#c43c30\\"/><path d=\\"M470.41,506.07a3.37,3.37,0,0,1,2.2.73,2.21,2.21,0,0,1,.9,1.77,2.18,2.18,0,0,1-.91,1.76,3.41,3.41,0,0,1-2.19.72,3.37,3.37,0,0,1-2.18-.72,2.17,2.17,0,0,1,0-3.53,3.33,3.33,0,0,1,2.18-.73\\" transform=\\"translate(-397.25 -464.82)\\" style=\\"fill:#c43c30\\"/><path d=\\"M532.66,513.72V531.1c.87.59,2,1.54,2,1.54h-9.57l2-1.54V518a27.65,27.65,0,0,0-2.66-2Z\\" transform=\\"translate(-397.25 -464.82)\\" style=\\"fill:#c43c30\\"/><path d=\\"M529.86,506.07a3.37,3.37,0,0,1,2.2.73,2.21,2.21,0,0,1,.9,1.77,2.18,2.18,0,0,1-.91,1.76,3.41,3.41,0,0,1-2.19.72,3.37,3.37,0,0,1-2.18-.72,2.17,2.17,0,0,1,0-3.53,3.33,3.33,0,0,1,2.18-.73\\" transform=\\"translate(-397.25 -464.82)\\" style=\\"fill:#c43c30\\"/><path d=\\"M547.07,529.67a11.26,11.26,0,0,1-6.77,3,3.63,3.63,0,0,1-2.66-1.05,3.55,3.55,0,0,1-1.06-2.63,5.16,5.16,0,0,1,1.84-3.85c1.23-1.14,4.53-2.66,8.65-4.55v-1.88c0-1.41-.47-3.13-1.69-3.56a5.43,5.43,0,0,0-4.24.64c-.35.24-3.56,2.82-3.56,2.82v-3s3-1.29,4.32-1.75a13,13,0,0,1,4.24-.7,7,7,0,0,1,4.21,1.13,5.28,5.28,0,0,1,2,2.45,15.84,15.84,0,0,1,.28,3.86v10.48l2.26,1.6h-7.79a24.61,24.61,0,0,0,0-3m0-1.46v-6.26c-1.61.95-4.91,3.22-5.69,4.3a3.69,3.69,0,0,0-.78,2.18,2.29,2.29,0,0,0,.66,1.62,1.82,1.82,0,0,0,1.4.54c.67,0,3.53-1.63,4.41-2.38\\" transform=\\"translate(-397.25 -464.82)\\" style=\\"fill:#c43c30\\"/><path d=\\"M564.88,513.72v2.63a11.64,11.64,0,0,1,3.35-2.31,13.34,13.34,0,0,1,5.68-.73,6.12,6.12,0,0,1,3.45,1.07,4.83,4.83,0,0,1,1.6,2.51,19.35,19.35,0,0,1,.32,4.38V531l2,1.64-7.63,0s0-.29,0-1.62V520.24a12,12,0,0,0-.18-2.9A2.25,2.25,0,0,0,572,516.2a7.09,7.09,0,0,0-3.07-.17,5.82,5.82,0,0,0-4.07,2.51v12.53c.76.66,1.84,1.57,1.84,1.57h-9.46l2-1.57v-13c-.68-.67-2-2.08-2-2.08Z\\" transform=\\"translate(-397.25 -464.82)\\" style=\\"fill:#c43c30\\"/><path d=\\"M492.6,523.22c0-4-.83-8.33-5.59-8.33s-5.58,4.37-5.58,8.33.88,8.32,5.58,8.32,5.59-4.37,5.59-8.32M487,513.37c6.4,0,10.71,4.74,10.72,9.84S493.41,533,487,533.05s-10.71-4.75-10.71-9.83,4.37-9.84,10.71-9.84\\" transform=\\"translate(-397.25 -464.82)\\" style=\\"fill:#c43c30\\"/><path d=\\"M487,545.62a3.7,3.7,0,0,0-.48-2l0-.06c-1.07-1.95-4.28-2.36-6.79-2.36s-5.86.84-6.88,3.18a4.48,4.48,0,0,0-.39,1.55c0,.2,0,.41,0,.63,0,1.38-.09,3.28,1.58,4.56l2.51,2,2.25,1.74h0c.36.23.6.42.59.91v1.69l-2.45,1.75h8l-2.46-1.75v-1.81a2.9,2.9,0,0,0-1.18-2.68l-2.5-2-.56-.41c.53,0,1.16,0,1.65,0h.27c4.4.07,5.91-1.15,6.39-2.16a5.75,5.75,0,0,0,.4-2.79m-3.37-.12v.89a2,2,0,0,1-2.13,2.27c-1.28.1-2.13.16-2.9.16a21.82,21.82,0,0,1-2.21-.13c-.66-.15-.6-1.47-.58-2v-1c0-1.79,1.45-2.82,3.9-2.84h.17c1.58,0,2.59.27,3.16.86a2.37,2.37,0,0,1,.59,1.8\\" transform=\\"translate(-397.25 -464.82)\\" style=\\"fill:#c43c30\\"/><path d=\\"M520.6,553.23v-2.72h-3.78v6.91l2.43,1.75h-8l2.46-1.75v-6.91h-3.79v2.72h-5.61l2.47-1.75v-2.63h6.93v-3.53h-2.49v-1.15L509,542.62l5.3-1.57v2.6h.89a1.39,1.39,0,0,1,1.59,1.57v3.63h6.92v2.63l2.44,1.75Z\\" transform=\\"translate(-397.25 -464.82)\\" style=\\"fill:#c43c30\\"/><path d=\\"M546.31,550.51l-2.45-1.75v-2.63h-3.44c0-.16,0-.33,0-.51a3.6,3.6,0,0,0-.48-2.06l0,0c-1.07-1.95-4.28-2.36-6.79-2.36s-5.86.84-6.86,3.18a4.84,4.84,0,0,0-.41,1.51v0c0,.2,0,.42,0,.64,0,1.38-.06,3.27,1.59,4.55l2.51,2,2.25,1.74,0,0a1,1,0,0,1,.59.91v1.69l-2.45,1.75h8L536,557.43v-1.81a2.89,2.89,0,0,0-1.2-2.68l-2.49-2-.56-.42c.53,0,1.16,0,1.65,0H534c4.14,0,5.56-1.18,6-2.16a3.61,3.61,0,0,0,.23-.62h.46v2.73Zm-9.27-5v.88a2,2,0,0,1-2.13,2.28c-1.28.1-2.11.16-2.9.16a21.89,21.89,0,0,1-2.22-.13c-.66-.15-.59-1.47-.57-2v-1c0-1.78,1.44-2.82,3.88-2.84h.16c1.59,0,2.6.27,3.18.86a2.36,2.36,0,0,1,.59,1.8\\" transform=\\"translate(-397.25 -464.82)\\" style=\\"fill:#c43c30\\"/><path d=\\"M581.17,545.62a3.63,3.63,0,0,0-.5-2.1c-1.06-1.95-4.28-2.36-6.79-2.36S568,542,567,544.34a4.76,4.76,0,0,0-.41,1.51v0c0,.2,0,.41,0,.63,0,1.38-.07,3.28,1.59,4.56l4.81,3.84-7.39.64v1.86l-2.45,1.75h8l-2.43-1.75v-.49l8.91-.76v-1.47l-5.22-4.2c.53,0,1.17,0,1.67,0h.63c4.15,0,5.57-1.18,6-2.17a5.86,5.86,0,0,0,.4-2.78m-3.36-.12v.89a2,2,0,0,1-2.14,2.27c-1.27.1-2.11.16-2.89.16a22.08,22.08,0,0,1-2.22-.13c-.66-.15-.6-1.47-.57-2v-1c0-1.78,1.44-2.82,3.89-2.84H574c1.58,0,2.58.27,3.16.85a2.4,2.4,0,0,1,.6,1.8\\" transform=\\"translate(-397.25 -464.82)\\" style=\\"fill:#c43c30\\"/><path d=\\"M502.95,559.17v-.91a8.51,8.51,0,0,1-1,.63,2.17,2.17,0,0,1-1.14.28c-.64,0-1.33-.57-1.33-1.82V552c0-1.28-1.74-1.55-3.21-1.55a11.15,11.15,0,0,0-2.22.21.42.42,0,0,0-.21.13l-.1.14c-.07.11-.17.25-.3.43l0,0a2.34,2.34,0,0,0-.44,1.49v4.53l2.45,1.75h-8.1l2.5-1.75V552.9a5.24,5.24,0,0,1,1.18-3.16l3.38-4.42h-3.07v-1.15l-2.15-1.54,5.29-1.57v2.6h3.72v1.44l-2.8,3.68c.82-.08,1.55-.12,2.21-.12,3.29,0,5,1.06,5,3.16v4.41l1.78-1.2h1.68v2.39l2.45,1.75Z\\" transform=\\"translate(-397.25 -464.82)\\" style=\\"fill:#c43c30\\"/><path d=\\"M560.27,554.7a3.29,3.29,0,0,0-2.74-3.56c2-.76,2.74-1.67,2.87-3.35h.33v2.73h5.59l-2.44-1.75v-2.63h-3.69c-.58-1.53-2.3-2.36-5.13-2.47v-2.61l-5.31,1.57,1.52,1.09c-2.38.25-4.56,1.44-4.66,3.75a3.38,3.38,0,0,0,.86,2.55,3.87,3.87,0,0,0,1.89,1.07l-1.22.43c-1.32.51-2.41,1.14-2.41,3.62v2.3l-2.47,1.75h8.06l-2.45-1.75v-2.08c0-.07,0-.14,0-.21,0-.58,0-.85.77-1.11l4.18-1.47c2.11.16,3.29.35,3.29,2.13v2.75l-2.45,1.75h8.05l-2.45-1.75Zm-3.12-7.62v0c0,.7,0,1.2-1.43,1.72-.3.11-1.49.54-2.56.9-2.69-.07-3.23-.47-3.23-2.36,0-1.36,1.22-2.08,3.63-2.14h.29a4.27,4.27,0,0,1,3,.74,1.41,1.41,0,0,1,.36,1.09\\" transform=\\"translate(-397.25 -464.82)\\" style=\\"fill:#c43c30\\"/><path d=\\"M445.11,503.75v11.92a16.36,16.36,0,0,1,3-2.07,11.42,11.42,0,0,1,6.59-1.18,7.23,7.23,0,0,1,3.36,1.21,5,5,0,0,1,1.73,2.45,18.38,18.38,0,0,1,.43,4.74V531l2.1,1.61H454.4V519.73c0-1.61,0-2.27-.2-2.64a2.42,2.42,0,0,0-.87-.89,3.29,3.29,0,0,0-1.21-.43,7.25,7.25,0,0,0-2.09.07,8.87,8.87,0,0,0-2.66.92,6.34,6.34,0,0,0-2.27,1.86V531c.4.34,2,1.61,2,1.61H437.08l2.19-1.61v-22c-.26-.3-2.68-2.48-2.68-2.48Z\\" transform=\\"translate(-397.25 -464.82)\\" style=\\"fill:#c43c30\\"/><path d=\\"M506.25,519.21V529a6.13,6.13,0,0,0,6.18,2.77c3.09-.37,5.57-4,5.28-7.77-.27-3.55-1.05-6.85-5.24-7.59a6.05,6.05,0,0,0-6.26,2.75m-7.48,22.22,2-1.91V518l-2.68-2,8.24-2V517c1.77-2.32,5.36-2.89,7.65-2.89,5.61,0,9.6,5.19,9.6,10.16,0,4.61-4,10.14-9.6,10.15-2.28,0-5.65-.68-7.65-2.9v8l2,1.91Z\\" transform=\\"translate(-397.25 -464.82)\\" style=\\"fill:#c43c30\\"/><path d=\\"M573.88,510.35A183.58,183.58,0,0,0,596,511.52c5.28-.17,9.26.58,13.72-4.15,4.67-4.84,4.12-7.36,1.3-6.58-4.18,1.25-19.44,6.45-37.44,9-.81.11-.61.54.34.6\\" transform=\\"translate(-397.25 -464.82)\\" style=\\"fill:#c43c30\\"/><path d=\\"M569.8,509.05c12.31-3.13,43.11-19.68,47.67-22.63,2.26-1.4,4.74-.57.76,5.91-2.7,4-4.57,6.3-11.79,8.5-5,1.88-23.41,7.25-36.33,8.81-1,.08-1.25-.27-.31-.59\\" transform=\\"translate(-397.25 -464.82)\\" style=\\"fill:#f9cb2e\\"/><path d=\\"M571,508.19c10.74-3.77,34.11-16.07,42.08-21,5.73-3.49,10.16-6.07,11.9-10.44,3.7-10,.87-14.06-2.65-10.94-4.5,4.37-25.63,26.53-52.67,42.12-.41.23-.48.77,1.34.22\\" transform=\\"translate(-397.25 -464.82)\\" style=\\"fill:#5e8c4d\\"/><path d=\\"M406.72,507.49v10.63h6.37l2.24-1.28v4.54l-2.26-1.28h-6.35v6.68c0,1.49,0,3.88,0,3.88h9.46l3.64-3.73v5.72H397.25l2.95-2.12V507.89l-2.95-2.38h21.84v5.09l-3.69-3.11h-8.68Z\\" transform=\\"translate(-397.25 -464.82)\\" style=\\"fill:#c43c30\\"/><path d=\\"M431,507.09v6.84h4.44v2H431v11.55c0,1.08,0,2.09,0,2.09a2,2,0,0,0,1.38.63,2.6,2.6,0,0,0,2.46-1.56l.6.44q-1.62,3.84-5.26,3.84a4.65,4.65,0,0,1-3-1,4.37,4.37,0,0,1-1.57-2.21,18.82,18.82,0,0,1-.2-3.68v-10.1h-3.91Z\\" transform=\\"translate(-397.25 -464.82)\\" style=\\"fill:#c43c30\\"/><path d=\\"M473.21,513.72V531.1c.87.59,2,1.54,2,1.54h-9.57l2-1.54V518a27.64,27.64,0,0,0-2.66-2Z\\" transform=\\"translate(-397.25 -464.82)\\" style=\\"fill:#c43c30\\"/><path d=\\"M470.41,506.07a3.37,3.37,0,0,1,2.2.73,2.21,2.21,0,0,1,.9,1.77,2.18,2.18,0,0,1-.91,1.76,3.41,3.41,0,0,1-2.19.72,3.37,3.37,0,0,1-2.18-.72,2.17,2.17,0,0,1,0-3.53,3.33,3.33,0,0,1,2.18-.73\\" transform=\\"translate(-397.25 -464.82)\\" style=\\"fill:#c43c30\\"/><path d=\\"M532.66,513.72V531.1c.87.59,2,1.54,2,1.54h-9.57l2-1.54V518a27.65,27.65,0,0,0-2.66-2Z\\" transform=\\"translate(-397.25 -464.82)\\" style=\\"fill:#c43c30\\"/><path d=\\"M529.86,506.07a3.37,3.37,0,0,1,2.2.73,2.21,2.21,0,0,1,.9,1.77,2.18,2.18,0,0,1-.91,1.76,3.41,3.41,0,0,1-2.19.72,3.37,3.37,0,0,1-2.18-.72,2.17,2.17,0,0,1,0-3.53,3.33,3.33,0,0,1,2.18-.73\\" transform=\\"translate(-397.25 -464.82)\\" style=\\"fill:#c43c30\\"/><path d=\\"M547.07,529.67a11.26,11.26,0,0,1-6.77,3,3.63,3.63,0,0,1-2.66-1.05,3.55,3.55,0,0,1-1.06-2.63,5.16,5.16,0,0,1,1.84-3.85c1.23-1.14,4.53-2.66,8.65-4.55v-1.88c0-1.41-.47-3.13-1.69-3.56a5.43,5.43,0,0,0-4.24.64c-.35.24-3.56,2.82-3.56,2.82v-3s3-1.29,4.32-1.75a13,13,0,0,1,4.24-.7,7,7,0,0,1,4.21,1.13,5.28,5.28,0,0,1,2,2.45,15.84,15.84,0,0,1,.28,3.86v10.48l2.26,1.6h-7.79a24.61,24.61,0,0,0,0-3m0-1.46v-6.26c-1.61.95-4.91,3.22-5.69,4.3a3.69,3.69,0,0,0-.78,2.18,2.29,2.29,0,0,0,.66,1.62,1.82,1.82,0,0,0,1.4.54c.67,0,3.53-1.63,4.41-2.38\\" transform=\\"translate(-397.25 -464.82)\\" style=\\"fill:#c43c30\\"/><path d=\\"M564.88,513.72v2.63a11.64,11.64,0,0,1,3.35-2.31,13.34,13.34,0,0,1,5.68-.73,6.12,6.12,0,0,1,3.45,1.07,4.83,4.83,0,0,1,1.6,2.51,19.35,19.35,0,0,1,.32,4.38V531l2,1.64-7.63,0s0-.29,0-1.62V520.24a12,12,0,0,0-.18-2.9A2.25,2.25,0,0,0,572,516.2a7.09,7.09,0,0,0-3.07-.17,5.82,5.82,0,0,0-4.07,2.51v12.53c.76.66,1.84,1.57,1.84,1.57h-9.46l2-1.57v-13c-.68-.67-2-2.08-2-2.08Z\\" transform=\\"translate(-397.25 -464.82)\\" style=\\"fill:#c43c30\\"/><path d=\\"M492.6,523.22c0-4-.83-8.33-5.59-8.33s-5.58,4.37-5.58,8.33.88,8.32,5.58,8.32,5.59-4.37,5.59-8.32M487,513.37c6.4,0,10.71,4.74,10.72,9.84S493.41,533,487,533.05s-10.71-4.75-10.71-9.83,4.37-9.84,10.71-9.84\\" transform=\\"translate(-397.25 -464.82)\\" style=\\"fill:#c43c30\\"/><path d=\\"M487,545.62a3.7,3.7,0,0,0-.48-2l0-.06c-1.07-1.95-4.28-2.36-6.79-2.36s-5.86.84-6.88,3.18a4.48,4.48,0,0,0-.39,1.55c0,.2,0,.41,0,.63,0,1.38-.09,3.28,1.58,4.56l2.51,2,2.25,1.74h0c.36.23.6.42.59.91v1.69l-2.45,1.75h8l-2.46-1.75v-1.81a2.9,2.9,0,0,0-1.18-2.68l-2.5-2-.56-.41c.53,0,1.16,0,1.65,0h.27c4.4.07,5.91-1.15,6.39-2.16a5.75,5.75,0,0,0,.4-2.79m-3.37-.12v.89a2,2,0,0,1-2.13,2.27c-1.28.1-2.13.16-2.9.16a21.82,21.82,0,0,1-2.21-.13c-.66-.15-.6-1.47-.58-2v-1c0-1.79,1.45-2.82,3.9-2.84h.17c1.58,0,2.59.27,3.16.86a2.37,2.37,0,0,1,.59,1.8\\" transform=\\"translate(-397.25 -464.82)\\" style=\\"fill:#c43c30\\"/><path d=\\"M520.6,553.23v-2.72h-3.78v6.91l2.43,1.75h-8l2.46-1.75v-6.91h-3.79v2.72h-5.61l2.47-1.75v-2.63h6.93v-3.53h-2.49v-1.15L509,542.62l5.3-1.57v2.6h.89a1.39,1.39,0,0,1,1.59,1.57v3.63h6.92v2.63l2.44,1.75Z\\" transform=\\"translate(-397.25 -464.82)\\" style=\\"fill:#c43c30\\"/><path d=\\"M546.31,550.51l-2.45-1.75v-2.63h-3.44c0-.16,0-.33,0-.51a3.6,3.6,0,0,0-.48-2.06l0,0c-1.07-1.95-4.28-2.36-6.79-2.36s-5.86.84-6.86,3.18a4.84,4.84,0,0,0-.41,1.51v0c0,.2,0,.42,0,.64,0,1.38-.06,3.27,1.59,4.55l2.51,2,2.25,1.74,0,0a1,1,0,0,1,.59.91v1.69l-2.45,1.75h8L536,557.43v-1.81a2.89,2.89,0,0,0-1.2-2.68l-2.49-2-.56-.42c.53,0,1.16,0,1.65,0H534c4.14,0,5.56-1.18,6-2.16a3.61,3.61,0,0,0,.23-.62h.46v2.73Zm-9.27-5v.88a2,2,0,0,1-2.13,2.28c-1.28.1-2.11.16-2.9.16a21.89,21.89,0,0,1-2.22-.13c-.66-.15-.59-1.47-.57-2v-1c0-1.78,1.44-2.82,3.88-2.84h.16c1.59,0,2.6.27,3.18.86a2.36,2.36,0,0,1,.59,1.8\\" transform=\\"translate(-397.25 -464.82)\\" style=\\"fill:#c43c30\\"/><path d=\\"M581.17,545.62a3.63,3.63,0,0,0-.5-2.1c-1.06-1.95-4.28-2.36-6.79-2.36S568,542,567,544.34a4.76,4.76,0,0,0-.41,1.51v0c0,.2,0,.41,0,.63,0,1.38-.07,3.28,1.59,4.56l4.81,3.84-7.39.64v1.86l-2.45,1.75h8l-2.43-1.75v-.49l8.91-.76v-1.47l-5.22-4.2c.53,0,1.17,0,1.67,0h.63c4.15,0,5.57-1.18,6-2.17a5.86,5.86,0,0,0,.4-2.78m-3.36-.12v.89a2,2,0,0,1-2.14,2.27c-1.27.1-2.11.16-2.89.16a22.08,22.08,0,0,1-2.22-.13c-.66-.15-.6-1.47-.57-2v-1c0-1.78,1.44-2.82,3.89-2.84H574c1.58,0,2.58.27,3.16.85a2.4,2.4,0,0,1,.6,1.8\\" transform=\\"translate(-397.25 -464.82)\\" style=\\"fill:#c43c30\\"/><path d=\\"M502.95,559.17v-.91a8.51,8.51,0,0,1-1,.63,2.17,2.17,0,0,1-1.14.28c-.64,0-1.33-.57-1.33-1.82V552c0-1.28-1.74-1.55-3.21-1.55a11.15,11.15,0,0,0-2.22.21.42.42,0,0,0-.21.13l-.1.14c-.07.11-.17.25-.3.43l0,0a2.34,2.34,0,0,0-.44,1.49v4.53l2.45,1.75h-8.1l2.5-1.75V552.9a5.24,5.24,0,0,1,1.18-3.16l3.38-4.42h-3.07v-1.15l-2.15-1.54,5.29-1.57v2.6h3.72v1.44l-2.8,3.68c.82-.08,1.55-.12,2.21-.12,3.29,0,5,1.06,5,3.16v4.41l1.78-1.2h1.68v2.39l2.45,1.75Z\\" transform=\\"translate(-397.25 -464.82)\\" style=\\"fill:#c43c30\\"/><path d=\\"M560.27,554.7a3.29,3.29,0,0,0-2.74-3.56c2-.76,2.74-1.67,2.87-3.35h.33v2.73h5.59l-2.44-1.75v-2.63h-3.69c-.58-1.53-2.3-2.36-5.13-2.47v-2.61l-5.31,1.57,1.52,1.09c-2.38.25-4.56,1.44-4.66,3.75a3.38,3.38,0,0,0,.86,2.55,3.87,3.87,0,0,0,1.89,1.07l-1.22.43c-1.32.51-2.41,1.14-2.41,3.62v2.3l-2.47,1.75h8.06l-2.45-1.75v-2.08c0-.07,0-.14,0-.21,0-.58,0-.85.77-1.11l4.18-1.47c2.11.16,3.29.35,3.29,2.13v2.75l-2.45,1.75h8.05l-2.45-1.75Zm-3.12-7.62v0c0,.7,0,1.2-1.43,1.72-.3.11-1.49.54-2.56.9-2.69-.07-3.23-.47-3.23-2.36,0-1.36,1.22-2.08,3.63-2.14h.29a4.27,4.27,0,0,1,3,.74,1.41,1.41,0,0,1,.36,1.09\\" transform=\\"translate(-397.25 -464.82)\\" style=\\"fill:#c43c30\\"/><path d=\\"M445.11,503.75v11.92a16.36,16.36,0,0,1,3-2.07,11.42,11.42,0,0,1,6.59-1.18,7.23,7.23,0,0,1,3.36,1.21,5,5,0,0,1,1.73,2.45,18.38,18.38,0,0,1,.43,4.74V531l2.1,1.61H454.4V519.73c0-1.61,0-2.27-.2-2.64a2.42,2.42,0,0,0-.87-.89,3.29,3.29,0,0,0-1.21-.43,7.25,7.25,0,0,0-2.09.07,8.87,8.87,0,0,0-2.66.92,6.34,6.34,0,0,0-2.27,1.86V531c.4.34,2,1.61,2,1.61H437.08l2.19-1.61v-22c-.26-.3-2.68-2.48-2.68-2.48Z\\" transform=\\"translate(-397.25 -464.82)\\" style=\\"fill:#c43c30\\"/><path d=\\"M506.25,519.21V529a6.13,6.13,0,0,0,6.18,2.77c3.09-.37,5.57-4,5.28-7.77-.27-3.55-1.05-6.85-5.24-7.59a6.05,6.05,0,0,0-6.26,2.75m-7.48,22.22,2-1.91V518l-2.68-2,8.24-2V517c1.77-2.32,5.36-2.89,7.65-2.89,5.61,0,9.6,5.19,9.6,10.16,0,4.61-4,10.14-9.6,10.15-2.28,0-5.65-.68-7.65-2.9v8l2,1.91Z\\" transform=\\"translate(-397.25 -464.82)\\" style=\\"fill:#c43c30\\"/></svg>",
"VN":"<svg xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 459.71 60.18\\"><g style=\\"isolation:isolate\\"><path d=\\"M734.22,503.72h0a21.79,21.79,0,0,1-29,32.47l0,0a21.79,21.79,0,1,0,29-32.51\\" transform=\\"translate(-282.14 -481.91)\\" style=\\"fill:#004381\\"/><path d=\\"M695.61,528.52c-.7.38-.85,1-.49,1.86s.84,1.17,1.39.95.52-.55.34-1.54l-.08-.38a4,4,0,0,1-.09-1.8,1.27,1.27,0,0,1,.79-.94c1-.39,1.92.22,2.47,1.6s.28,2.63-.89,3.11l-.29-.73c.82-.35,1-1.1.58-2.2-.35-.89-.91-1.29-1.51-1s-.59.63-.41,1.64l.07.42.06.38a3.21,3.21,0,0,1,.07,1.33,1.17,1.17,0,0,1-.76.85c-.93.37-1.82-.18-2.32-1.42s-.25-2.36.78-2.83Z\\" transform=\\"translate(-282.14 -481.91)\\" style=\\"fill:#004381\\"/><polygon points=\\"412.84 38.73 416.15 35.95 416.17 36.98 413.37 39.3 414.28 40.3 416.25 40.26 416.26 41.07 410.65 41.19 410.63 40.38 412.84 40.33 413.42 40.33 413.24 40.13 413.04 39.93 410.56 37.25 410.53 36.18 412.84 38.73\\" style=\\"fill:#004381\\"/><path d=\\"M697.47,511.94l2.17.76-.26.76-2.17-.76-3.88,1.17.33-.92,2.41-.68.29-.09.4-.1c-.18-.22-.23-.28-.43-.55l-1.48-2,.31-.88Z\\" transform=\\"translate(-282.14 -481.91)\\" style=\\"fill:#004381\\"/><polygon points=\\"419.13 19.7 417.94 21.15 421.49 24.05 420.64 25.09 417.09 22.19 415.91 23.64 415.11 22.98 418.32 19.04 419.13 19.7\\" style=\\"fill:#004381\\"/><polygon points=\\"426.71 14.38 423.88 16.03 424.48 17.07 427.09 15.55 427.57 16.38 424.97 17.9 425.66 19.1 428.56 17.4 429.08 18.3 425.03 20.67 422.19 15.81 426.19 13.47 426.71 14.38\\" style=\\"fill:#004381\\"/><path d=\\"M716.52,495.58a8.7,8.7,0,0,1-.6-1.15,10.35,10.35,0,0,1-.24,1.28l-.24,1.07,1.64-.26Zm3.22,2.89-1.47.1-.73-1.22-2.26.37L715,499.1l-1.4.35,1.48-6.14,1.39-.22Z\\" transform=\\"translate(-282.14 -481.91)\\" style=\\"fill:#004381\\"/><path d=\\"M728.76,500.27l-1.18-.45.45-1.68c0-.18.12-.46.22-.8s.18-.62.23-.83.15-.45.23-.7l.12-.4c-.33.58-.46.77-.77,1.23-.12.21-.24.38-.35.52l-1.59,2.24-1-.27-.32-2.69a5.94,5.94,0,0,1-.05-.6c0-.35,0-.62,0-.81s0-.37,0-.68l-.14.68c-.17.74-.24,1.06-.46,1.94l-.47,1.81-1.25-.2,1.41-5.49,1.88.36.27,2.61a12.13,12.13,0,0,1,.06,1.84,8.7,8.7,0,0,1,.53-.93l.44-.67,1.47-2.12,1.8.61Z\\" transform=\\"translate(-282.14 -481.91)\\" style=\\"fill:#004381\\"/><path d=\\"M728.63,518.42a7.73,7.73,0,0,1,3.81-1.65c.49,0,1.09.16,1.09.78s-.6,1.15-1.77,1.58a10.35,10.35,0,0,1-4.33.28,9.81,9.81,0,0,1,1.21-1m-22.8,2c-1-.07-1.49-.47-1.49-1.25,0-.1.07-2.57,5.7-2.85a13.38,13.38,0,0,1,2.46.07,7.32,7.32,0,0,0-.64.54l-.35.33c-1.35,1.23-3.64,3.3-5.67,3.16M718,511.1c-.68.6-2,1.9-3.33,3.15l-1.48,1.42a19.62,19.62,0,0,0-3.62-.32c-2.73,0-5.24.75-6.39,1.92a2,2,0,0,0-.64,1.44c0,1.33,1.54,2,2,2.17a6.56,6.56,0,0,0,6.61-.86,34.91,34.91,0,0,0,3.71-3.23c.87.2,1.85.46,2.9.77l1,.28c-1.26,1.24-2.56,2.55-3.75,3.61l-.09.08c-1.67,1.48-2.88,2.54-4.62,2.93a3.57,3.57,0,0,1-2.38-.16s-.07.05-.07.05a4.48,4.48,0,0,0,3.61,1.16,9.43,9.43,0,0,0,5.22-2.86l2.49-2.45,1.75-1.74,3.54,1,.06,0s-2.19,2.13-2.19,2.13l-1.88,1.88a37.35,37.35,0,0,1-4.1,3.63,9.94,9.94,0,0,1-4.85,2.1,4.78,4.78,0,0,1-2.65-.51s-.09,0-.09,0a5.67,5.67,0,0,0,4.12,1.74c2.26-.08,4.27-1.16,7.4-4,1.43-1.31,2.84-2.77,4.09-4.07l2.32-2.35a17.71,17.71,0,0,0,4.41.45c2.2-.05,4.08-1.1,4.1-2.31a2,2,0,0,0-1.15-1.66,5,5,0,0,0-2.7-.78,8.2,8.2,0,0,0-5.12,2.17l-1.16,1s-.42-.12-.42-.12l-3.23-.92c1-.89,1.77-1.65,2.5-2.3a8.82,8.82,0,0,1,4.87-2.3,5.64,5.64,0,0,1,2.88.44s.06-.07.06-.07a5.84,5.84,0,0,0-4.1-1.54,8.42,8.42,0,0,0-5.11,2.06,40.82,40.82,0,0,0-3.28,3.09l-1.64-.5-.39-.12-1.72-.52s1-.92,1-.92c1.16-1.14,2.25-2.21,3.1-2.94,3.1-2.61,5.06-2.95,6.41-3a5.93,5.93,0,0,1,3.52.92s.05-.06.05-.06a6.71,6.71,0,0,0-5.15-2.1c-1.9,0-4.17,1-6.39,3\\" transform=\\"translate(-282.14 -481.91)\\" style=\\"fill:#004381\\"/><path d=\\"M717.46,519.63v0Z\\" transform=\\"translate(-282.14 -481.91)\\" style=\\"fill:#004381\\"/><path d=\\"M731.94,496c.11.06.29.19.37,0s-.06-.17-.16-.22l-.24-.13-.12.23Zm.12.76-.15-.08,0-.56-.15-.08-.23.41-.12-.07.49-.88.38.21c.16.09.3.21.19.4s-.25.18-.41.09Zm.54-.27a.78.78,0,0,0-1.37-.75.78.78,0,0,0,1.37.75m-1.54-.74a.93.93,0,0,1,1.21-.48.92.92,0,0,1,.49,1.21.91.91,0,0,1-1.21.48.92.92,0,0,1-.49-1.21\\" transform=\\"translate(-282.14 -481.91)\\" style=\\"fill:#004381\\"/><path d=\\"M322.88,526.26c-.71.4-5.79,4.71-15.91,4.71-8.52,0-17.63-4.36-20.48-4.28a5.42,5.42,0,0,0-2.45.44c-1.19.5-2.36-.23-1.71-1.46a16.36,16.36,0,0,1,9.65-7.94c2.63-.8,5-1.06,6.28.32,2.74,3,7.69,6.79,12.5,7.29.39,0,2.14.19,2.16-.31,0-.3-.58-.5-1.18-.54-4.91-.36-13.77-5.62-18.64-15.8-1.83-3.82-3.27-7.53-6.46-9.14-.7-.34-.73-1.64.76-2,1-.25,7.57-.88,15,3.06,3.43,1.81,3.91,3.43,3.93,4.84,0,10.67,5.37,14.91,7.45,16.16,1.17.7,2.25,1,2.37.63s-.21-.51-.48-.67c-6.47-3.93-8.18-10-8.23-16.13s2.21-11.36,3.81-15.67a10.16,10.16,0,0,0,.35-5.57c-.48-1.78-.09-2.29.85-2.29s2.39,1.66,2.85,2.23a27,27,0,0,1,3.36,5.44,36.21,36.21,0,0,1,3.59,15.32c0,5.06-1.31,5.65-3.43,6.7s-3.13,2.4-3.14,4a4.15,4.15,0,0,0,3.14,3.88c1.57.46,2.56.29,2.48-.12s-.76-.4-1-.46c-2.13-.58-3.54-1.67-3.54-3.3,0-2,2.52-3.54,6.06-3.54s6.06,1.5,6.06,3.54c0,1.64-1.41,2.73-3.54,3.3-.2.05-.89.13-1,.45s.91.58,2.48.12a4.14,4.14,0,0,0,3.13-3.88c0-1.57-1-2.92-3.14-4s-3.43-1.64-3.43-6.7a36.21,36.21,0,0,1,3.59-15.32,27.26,27.26,0,0,1,3.36-5.45c.46-.57,1.83-2.23,2.85-2.23s1.33.52.85,2.29a10.16,10.16,0,0,0,.35,5.56c1.6,4.32,3.86,9.59,3.81,15.68s-1.76,12.2-8.23,16.13c-.27.16-.58.37-.48.67s1.2.07,2.36-.63c2.09-1.25,7.49-5.49,7.46-16.16,0-1.42.49-3,3.93-4.84,7.48-3.94,14-3.3,15-3.06,1.48.35,1.46,1.66.75,2-3.19,1.61-4.63,5.32-6.46,9.14-4.87,10.18-13.73,15.44-18.64,15.8-.61,0-1.2.24-1.18.54,0,.49,1.77.35,2.16.31,4.81-.49,9.76-4.25,12.5-7.29,1.24-1.38,3.64-1.11,6.28-.32a16.34,16.34,0,0,1,9.65,7.94c.65,1.23-.51,2-1.71,1.46a5.5,5.5,0,0,0-2.45-.44c-2.86-.08-12,4.28-20.49,4.28-10.12,0-15.2-4.32-15.91-4.72\\" transform=\\"translate(-282.14 -481.91)\\" style=\\"fill:#dd9e1f\\"/><path d=\\"M581.84,510.56c0-1.74,1.87-2.67,3.92-2.67,3.5,0,3.1,2.79,5.6,2.79a1.65,1.65,0,0,0,1.83-1.76c0-1.92-2.56-3.2-6.53-3.33a16.42,16.42,0,0,0-7.15,1.08c-1.53.6-2.21,1.47-2.21,2.83V528.4c0,1,.48,1,2.27,1s2.27,0,2.27-1Zm-114.89,3.36c0-7.18-6.24-8.31-10.78-8.31a23,23,0,0,0-8.49,1.61c-1.53.68-1.66,1.52-1.66,2.91v18.29c0,1,.49,1,2.27,1s2.27,0,2.27-1V511.53c0-1.49.53-3.55,5.71-3.55,4.9,0,6.13,2.9,6.13,5.94v14.5c0,1,.49,1,2.26,1s2.27,0,2.27-1ZM568.4,528.39c0,1,.49,1,2.26,1s2.27,0,2.27-1l0-21.54c0-1.58-2.16-1.19-3.27-.46s-1.29,1.22-1.29,2.79Zm-24-12.71c.67-1.71,5-13,5.21-13.63.07-.18.25-.18.32,0,.31.79,4.66,11.87,5.31,13.58.14.37.19.68-.3.68H544.73c-.62,0-.47-.38-.37-.65m12.55,4.16c1.55,3.67,3.67,8.79,3.67,8.79.27.65,0,.81,2.71.81,2.85,0,3-.09,2.46-1.36-.15-.34-11.44-27.46-12.07-28.95s-.9-1.59-3.25-1.59-2.63.06-3.27,1.59-12,28.8-12.13,29.14c-.48,1.16-.05,1.16,1.87,1.16s2-.05,2.36-.83l3.5-8.75c.21-.53.28-.74.9-.74H556c.6,0,.67.17.9.73m16.39-20.68a2.75,2.75,0,1,0-2.17,2.69,2.44,2.44,0,0,0,2.17-2.69m21.37,29.25c0,1,.49,1,2.26,1s2.27,0,2.27-1l0-30.88c0-1.58-2.16-1.18-3.27-.46s-1.29,1.22-1.29,2.79Zm14.51-29.24a2.75,2.75,0,1,0-2.18,2.69,2.44,2.44,0,0,0,2.18-2.69m-4.91,29.23c0,1,.49,1,2.26,1s2.27,0,2.27-1l0-21.54c0-1.58-2.16-1.18-3.27-.46s-1.29,1.22-1.29,2.79Zm30.41-14.46c0-7.18-6.24-8.31-10.78-8.31a22.93,22.93,0,0,0-8.49,1.61c-1.53.67-1.66,1.52-1.66,2.91v18.29c0,1,.49,1,2.27,1s2.27,0,2.27-1V511.55c0-1.49.53-3.55,5.71-3.55,4.89,0,6.12,2.9,6.12,5.94v14.5c0,1,.49,1,2.26,1s2.28,0,2.28-1Zm47.86,9.12c-.18-8-15-6.49-15-12,0-2.17,2.22-3.17,4.64-3.17,3.48,0,4.63,1.16,5.35,2.86a2.39,2.39,0,0,0,2.35,1.51,1.73,1.73,0,0,0,1.84-1.81c0-1.76-2.45-4.86-9.12-4.9-5.53,0-9.27,2.07-9.28,6.44,0,8.18,14.86,6.44,14.83,12.11,0,2.34-2.19,3.43-5.37,3.46s-4.86-1.25-5.77-3.47a2.47,2.47,0,0,0-2.41-1.69,1.88,1.88,0,0,0-2,2c0,1.67,2.9,5.54,10,5.54,5.78,0,10.09-2.33,10-6.89M396.85,528.4c0,1,.49,1,2.26,1s2.28,0,2.28-1l0-21.54c0-1.58-2.16-1.18-3.27-.46s-1.28,1.22-1.28,2.79Zm84.06,1.55a16.4,16.4,0,0,0,8-1.69,2.47,2.47,0,0,0,1.7-2.75v-13c0-4.95-4.11-7-8.83-7-7.69,0-10.75,3.32-10.87,5.46a1.79,1.79,0,0,0,1.94,2,2.47,2.47,0,0,0,2.36-1.53c.95-2.21,2.57-3.58,5.93-3.58,2.63,0,5,1.21,5,4.33v1.38c0,.42,0,.51-.37.56-6.92,1.11-15.92,3.29-15.92,9.65,0,4,4.75,6.15,11.1,6.15m5.19-5.51c0,2.4-3.12,3-5.43,3-4.08,0-6.11-1.74-6.11-4,0-4.19,5.41-5.7,11.05-6.89.3-.06.48-.1.48.33Zm-84.35-25.27a2.75,2.75,0,1,0-2.17,2.69,2.44,2.44,0,0,0,2.17-2.69m122.54,29.27c0,1,.49,1,2.27,1s2.27,0,2.27-1V513c0-6.12-5.75-7.39-9.15-7.39-4,0-6.24,1.14-7.79,2.85-1.65-1.8-3.86-2.85-7.73-2.85a18.85,18.85,0,0,0-7.59,1.67,2.43,2.43,0,0,0-1.68,2.7v18.42c0,1,.49,1,2.27,1s2.27,0,2.27-1V511.28c0-2.56,2.05-3.26,4.74-3.26,3.35,0,5.41,1.58,5.41,5.53v14.9c0,1,.49,1,2.27,1s2.26,0,2.26-1V513.25c0-3,1.58-5.25,5.19-5.25s5,2.29,5,5.32ZM410.11,513.89a6.77,6.77,0,0,1,6.84-6c3.58,0,6.72,2.15,6.88,5.34,0,.92-.19,1-1.29,1H410.46c-.34,0-.38-.15-.35-.37m18.23,8.53a.83.83,0,0,0-.89-.82c-.52,0-.79.18-1.1.73a9.73,9.73,0,0,1-8.08,4.47c-5.3,0-8.36-3.76-8.23-9.65,0-.2.08-.37.39-.38s8.3,0,16.36,0c1.55,0,1.57-1,1.57-1.87,0-4.88-4.54-9.38-11.06-9.38-6.76,0-12,3.69-12,12.17,0,9,6.75,12.23,12.5,12.23,7,0,10.49-5.38,10.49-7.51m214.06-8.53a6.77,6.77,0,0,1,6.84-6c3.58,0,6.72,2.15,6.88,5.34,0,.92-.19,1-1.29,1H642.75c-.34,0-.38-.15-.35-.37m18.23,8.53a.83.83,0,0,0-.89-.82c-.52,0-.78.18-1.1.73a9.73,9.73,0,0,1-8.08,4.47c-5.3,0-8.36-3.76-8.23-9.65a.34.34,0,0,1,.39-.38c.31,0,8.3,0,16.36,0,1.55,0,1.57-1,1.57-1.87,0-4.88-4.54-9.38-11.06-9.38-6.76,0-12,3.69-12,12.17,0,9,6.75,12.23,12.5,12.23,7,0,10.49-5.38,10.49-7.51m-283.36,5.42c.62,1.48.77,1.6,3.13,1.6s2.33-.09,3-1.61,9.31-23.25,11.6-28.94c.51-1.26.29-1.37-1.75-1.37-1.79,0-1.95.1-2.29.87,0,0-9.69,24.77-9.89,25.34-.05.16-.26.17-.35,0-.31-.7-10.14-25.39-10.14-25.39-.24-.63-.3-.86-3-.86-2.9,0-2.7.28-2.13,1.7.14.34,11.16,27.19,11.78,28.68m55.45-21.91c-1.06,0-2.51,0-2.51,0-.72,0-.72.4-.72,1.2s0,1.17.72,1.17h2.51c.52,0,.54.06.53.59,0,1.13,0,14.82,0,14.82,0,5.4,2.89,6,5.74,6.09s4.68-.79,4.64-1.79c0-.58-.4-.84-1.06-.76a9,9,0,0,1-1.4.19c-1.5,0-3.38-.4-3.38-3.68V508.95c0-.57,0-.64.57-.64h4.09c.72,0,.74-.4.74-1.17s0-1.21-.74-1.21h-4.11c-.55,0-.54-.05-.55-.53v-5a1,1,0,0,0-1.1-1,4.71,4.71,0,0,0-1.79.92,2.87,2.87,0,0,0-1.66,3v2.09c0,.57,0,.56-.53.57\\" transform=\\"translate(-282.14 -481.91)\\" style=\\"fill:#006885;fill-rule:evenodd\\"/></g></svg>",
"GA":"<svg xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 223.98 41.25\\"><defs><style>.a{fill:#358e9d;}.b{fill:#202d5c;}.c{fill:#474343;}</style></defs><path class=\\"a\\" d=\\"M587.1,508.54a21.13,21.13,0,0,0-10-2.53h-6.07l-.32-.57h7.14c.49,0,6.41-.08,9.89.85a25.22,25.22,0,0,1,8,3.84c.59.38,8.54,6.07,8.54,6.07a4.63,4.63,0,0,1-2.64,1.37,5.36,5.36,0,0,1-2.57-1s-4.26-3.07-4.9-3.52a65,65,0,0,0-7-4.55Z\\" transform=\\"translate(-400.01 -491.37)\\"/><path class=\\"a\\" d=\\"M586.78,513c3,2,4.77,3.45,5.35,3.87l3.24,2.32a3.63,3.63,0,0,0,5.28-.37l-7-4.9a18.08,18.08,0,0,0-6.44-3,37,37,0,0,0-8-.82h-5.81l.34.59h4.71a17.3,17.3,0,0,1,8.3,2.32Z\\" transform=\\"translate(-400.01 -491.37)\\"/><path class=\\"a\\" d=\\"M587.76,503.83a75.62,75.62,0,0,1,8.41,5.47L602.7,514a5.61,5.61,0,0,0,2.6.92,4.8,4.8,0,0,0,2.59-1.34s-9.28-6.68-10.12-7.27a25.37,25.37,0,0,0-9.55-4.6c-4.2-1.07-11.22-.94-11.7-.94H568l.34.59h7.42c1.54,0,7.46.08,12,2.5Z\\" transform=\\"translate(-400.01 -491.37)\\"/><path class=\\"b\\" d=\\"M621.4,503.74c-1.14-.2-2.65-.29-2.65-.29l-2.05.59-1.17-1s2.45.19,3.13.29.39-.29.09-.89a1.15,1.15,0,0,0-1-.59H611.6a11.39,11.39,0,0,1-2.37-.29,2.76,2.76,0,0,1-1.78-1.25c-.49,1.14,1.47,2.46,1.47,2.46l6.11,4.38a1.47,1.47,0,0,0,1.47.1,14.68,14.68,0,0,1,2.45-1,15.46,15.46,0,0,1,3.52-.19,3.62,3.62,0,0,1,1.47.79c.39-2.75-1.37-2.93-2.54-3.14Z\\" transform=\\"translate(-400.01 -491.37)\\"/><path class=\\"b\\" d=\\"M589,494.66c4.26,1.87,10.34,6.42,11.23,7.07l9.66,6.93a5.51,5.51,0,0,0,2.65,1,4.38,4.38,0,0,0,2.53-1.28h0l-13.29-9.55a34.21,34.21,0,0,0-12.64-6.12c-5.23-1.38-14.22-1.32-15.26-1.32H562.63l.35.59h10.28c2.6,0,10.08.22,15.71,2.7Z\\" transform=\\"translate(-400.01 -491.37)\\"/><path class=\\"b\\" d=\\"M588.31,499.24c-4.6-2.3-10.27-2.59-13.56-2.59h-9.08l-.34-.59h9.86c1.07,0,8.54-.08,13.48,1a32.79,32.79,0,0,1,11.11,5.39l11.74,8.41a4.47,4.47,0,0,1-2.66,1.32,5.5,5.5,0,0,1-2.64-1l-8-5.75a80.47,80.47,0,0,0-9.88-6.26Z\\" transform=\\"translate(-400.01 -491.37)\\"/><path class=\\"c\\" d=\\"M423.59,525.32a7.74,7.74,0,0,0-1.52-.15c-1.85,0-3.23.82-3.61,2.05a4,4,0,0,0-.11,1,2.32,2.32,0,0,0,2.44,2.45,3.23,3.23,0,0,0,1-.2,2.27,2.27,0,0,0,1.75-2Zm1.27,7c-.12,0-.66,0-.89-.22a1,1,0,0,1-.22-.75v-.79a4.67,4.67,0,0,1-4.23,2,3.82,3.82,0,0,1-3.94-4,4,4,0,0,1,.78-2.44c1.14-1.61,3.51-2.13,5.63-2.13a9.41,9.41,0,0,1,1.59.13v-1.41a3,3,0,0,0-.5-2,3.3,3.3,0,0,0-2.64-.88,6,6,0,0,0-3.65,1.24l.26-1.67a7.4,7.4,0,0,1,3.89-1,5.75,5.75,0,0,1,4.19,1.37c.93,1,1.17,1.87,1.17,3.66v8.93Z\\" transform=\\"translate(-400.01 -491.37)\\"/><path class=\\"c\\" d=\\"M433.76,520.25c-2.32.44-2.57,2.27-2.57,3.56v8.53h-2.72V520.15c0-1.17-.77-1.42-.77-1.42h2.69c.59,0,.8.33.8.7v.74a3.44,3.44,0,0,1,2.86-1.61,3.35,3.35,0,0,1,1.62.25l.36,1.71a3.32,3.32,0,0,0-2.27-.29Z\\" transform=\\"translate(-400.01 -491.37)\\"/><path class=\\"c\\" d=\\"M446.81,532.33a1.4,1.4,0,0,1-.91-.22,1.1,1.1,0,0,1-.2-.75v-.79a4.3,4.3,0,0,1-3.87,2,4,4,0,0,1-3.23-1.24,5.39,5.39,0,0,1-1.11-3.88v-7.47a1.25,1.25,0,0,0-.81-1.21h2.53c.63,0,1,.32,1,.79v8.2c0,2.43.72,3.11,2.42,3.11,1.4,0,2.92-.94,2.92-2.39v-9.71h2.7v13.6h-1.44Z\\" transform=\\"translate(-400.01 -491.37)\\"/><path class=\\"c\\" d=\\"M484,532.33c-.56,0-.9-.24-.9-.93V515.36a1.56,1.56,0,0,0-.78-1.4H485c.78,0,1.13.38,1.13.94v17.44H484Z\\" transform=\\"translate(-400.01 -491.37)\\"/><path class=\\"c\\" d=\\"M521.07,519.86c-2.74,0-3.22,2.8-3.22,5.81,0,3.75.94,5.54,3.22,5.54,2,0,3-2.32,3-5.54,0-2.63-.25-5.78-3-5.81M521,532.53c-4.45,0-6-2.78-6-6.93,0-3.78,1.6-7.19,6-7.17s5.88,3.43,5.88,7.17S524.74,532.57,521,532.53Z\\" transform=\\"translate(-400.01 -491.37)\\"/><path class=\\"c\\" d=\\"M561.66,531.34a5.65,5.65,0,0,1-3.66,1.24h-.15a7.35,7.35,0,0,1-3.81-.87l-.39-1.61a8,8,0,0,0,3.8,1.22c1.87,0,2.94-1,2.81-2.66-.19-2.65-6.33-2-6.33-6.4,0-2.41,2-3.68,4.37-3.71h.15c2.49,0,3.41.87,3.41.87l.38,1.51a4.71,4.71,0,0,0-3.2-1.05,2.21,2.21,0,0,0-2.47,2.35c.15,1.32,1.15,1.64,3,2.43s3.36,1.84,3.36,3.83a3.65,3.65,0,0,1-1.22,2.87Z\\" transform=\\"translate(-400.01 -491.37)\\"/><path class=\\"c\\" d=\\"M565.34,532.33c-.5,0-.77-.26-.77-.71V520a1.37,1.37,0,0,0-.85-1.22h2.77c.56,0,.77.29.77.81v12.79Z\\" transform=\\"translate(-400.01 -491.37)\\"/><path class=\\"c\\" d=\\"M490.73,518.73c.52,0,.78.25.78.7v1.07a4.31,4.31,0,0,1,3.87-2,3.94,3.94,0,0,1,3.23,1.24,5.41,5.41,0,0,1,1.11,3.89v8.68H498.1a1,1,0,0,1-1.1-1.12v-7.86c0-2.43-.73-3.11-2.41-3.11-1.4,0-2.93.94-2.93,2.39v9.7H489V519.92a1.15,1.15,0,0,0-.75-1.17h2.52Z\\" transform=\\"translate(-400.01 -491.37)\\"/><path class=\\"c\\" d=\\"M577,525.32a7.78,7.78,0,0,0-1.53-.15c-1.85,0-3.23.82-3.61,2.05a4,4,0,0,0-.1,1,2.32,2.32,0,0,0,2.44,2.45,3.2,3.2,0,0,0,1-.2,2.27,2.27,0,0,0,1.75-2Zm1.27,7c-.13,0-.66,0-.9-.22a1,1,0,0,1-.19-.75v-.79a4.7,4.7,0,0,1-4.25,2,3.81,3.81,0,0,1-3.93-4,3.88,3.88,0,0,1,.79-2.44c1.14-1.61,3.51-2.13,5.62-2.13a9.49,9.49,0,0,1,1.61.13v-1.41a2.77,2.77,0,0,0-.49-2,3.34,3.34,0,0,0-2.74-.87,4.89,4.89,0,0,0-3.56,1.24l.27-1.67a7.35,7.35,0,0,1,3.88-1,5.73,5.73,0,0,1,4.19,1.37c.94,1,1.17,1.87,1.17,3.66v8.93h-1.45Z\\" transform=\\"translate(-400.01 -491.37)\\"/><path class=\\"c\\" d=\\"M458.76,523.31a3.84,3.84,0,0,0-.72-2.55A2.76,2.76,0,0,0,456,520c-2.64,0-2.94,3.51-2.94,5.41v.2c0,2.68.79,5.34,3,5.34a3.27,3.27,0,0,0,2.75-1.37V523.3Zm.84,9c-.53,0-.72-.18-.72-.67V531a5,5,0,0,1-3.5,1.54h-.05c-3.89,0-5.24-3.28-5.24-6.93,0-2.73,1.05-7.17,5.37-7.17,2.59,0,3.31,1.56,3.31,1.56v-4.63a1.84,1.84,0,0,0-.8-1.48h2.11a1.32,1.32,0,0,1,1.41,1.17v17.28H459.6Z\\" transform=\\"translate(-400.01 -491.37)\\"/><path class=\\"c\\" d=\\"M471.46,525.32a7.64,7.64,0,0,0-1.52-.15c-1.85,0-3.23.82-3.61,2.05a4.32,4.32,0,0,0-.11,1,2.32,2.32,0,0,0,2.44,2.45,3.2,3.2,0,0,0,1-.2,2.27,2.27,0,0,0,1.75-2Zm1.27,7c-.12,0-.66,0-.89-.22a1,1,0,0,1-.21-.75v-.79a4.67,4.67,0,0,1-4.24,2,3.82,3.82,0,0,1-3.94-4,3.93,3.93,0,0,1,.79-2.44c1.14-1.61,3.51-2.13,5.62-2.13a9.33,9.33,0,0,1,1.6.13v-1.41a3,3,0,0,0-.5-2,3.28,3.28,0,0,0-2.63-.88,6,6,0,0,0-3.65,1.24l.27-1.67a7.39,7.39,0,0,1,3.88-1,5.74,5.74,0,0,1,4.19,1.37c.93,1,1.17,1.87,1.17,3.66v8.93Z\\" transform=\\"translate(-400.01 -491.37)\\"/><path class=\\"c\\" d=\\"M510.36,523.31a3.87,3.87,0,0,0-.71-2.55,2.75,2.75,0,0,0-2.09-.77c-2.64,0-3,3.51-3,5.41v.2c0,2.68.79,5.34,3,5.34a3.24,3.24,0,0,0,2.74-1.37V523.3Zm.85,9c-.53,0-.73-.18-.73-.67V531a5,5,0,0,1-3.51,1.54h-.07c-3.86,0-5.21-3.28-5.21-6.93,0-2.73,1-7.17,5.36-7.17,2.59,0,3.3,1.56,3.3,1.56v-4.63a1.84,1.84,0,0,0-.8-1.48h2.12a1.31,1.31,0,0,1,1.41,1.17v17.28Z\\" transform=\\"translate(-400.01 -491.37)\\"/><path class=\\"c\\" d=\\"M530.58,518.73c.53,0,.79.25.79.7v1.07a4.29,4.29,0,0,1,3.87-2,3.92,3.92,0,0,1,3.22,1.24,5.41,5.41,0,0,1,1.12,3.89v8.68h-1.63a1,1,0,0,1-1.09-1.12v-7.86c0-2.43-.73-3.11-2.42-3.11-1.4,0-2.92.94-2.92,2.39v9.7h-2.7V519.92a1.15,1.15,0,0,0-.75-1.17h2.5Z\\" transform=\\"translate(-400.01 -491.37)\\"/><path class=\\"c\\" d=\\"M411.24,532.43a18.49,18.49,0,0,1-2.82.2,7.88,7.88,0,0,1-5.92-2.16c-2-2-2.49-5.22-2.49-7.26a9.9,9.9,0,0,1,2.92-7.36,8.41,8.41,0,0,1,6-2.12,7.88,7.88,0,0,1,3.76.73l.47,1.68a7.67,7.67,0,0,0-3.6-.8c-4.49,0-6.37,3.08-6.37,7.88,0,7.25,3.53,7.82,5.53,7.82a6.14,6.14,0,0,0,2-.22v-7.21h-1.56a4.93,4.93,0,0,0-1.5.16l.22-1.46h5.76v9.6a16.48,16.48,0,0,1-2.39.52Z\\" transform=\\"translate(-400.01 -491.37)\\"/><path class=\\"c\\" d=\\"M544.32,525.54a8.17,8.17,0,0,0,1.53.15c3,0,3.71-1.48,3.85-3.2.12-1.53-.29-3.05-2.66-2.76-2.15.27-2.72,1.67-2.72,3.41,0,1.44,0,2.39,0,2.39m4.06-7.15a4.06,4.06,0,0,1,3.15,6.46c-1.14,1.61-3.51,2.13-5.62,2.13a9.9,9.9,0,0,1-1.6-.12v1.26c0,2.38,1.27,3,3.36,3a7.77,7.77,0,0,0,4.19-1.48l-.26,1.67a10.15,10.15,0,0,1-4.52,1.24,6,6,0,0,1-4.33-1.37c-1-1-1.17-2.43-1.17-4.22v-3C541.61,521.44,542.65,518,548.39,518.38Z\\" transform=\\"translate(-400.01 -491.37)\\"/></svg>",
"IATA":"<svg xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 176.25 110.34\\"><path d=\\"M448.93,567.17l7.18-35h11.73l-7.16,35Zm35.26-11.49h7.53l-2-12.78Zm-16.35,11.49,17.72-35h11.58l7.23,35H493.56l-.65-4.14H481.33l-1.84,4.14Zm47.29,0,4-26.3H509l1.74-8.92H542.2l-1.84,8.92h-9.72l-4,26.3Zm39.37-11.49h7.43L560,542.9Zm-16.33,11.49,17.62-35h11.56l7.36,35h-11l-.47-4.14H551.66l-1.94,4.14Zm62-74.67H545.05c-2,9.84-9,18-22.86,23.72a14.1,14.1,0,0,0,12.58,9h29.85c4.57,0,8.15-3.77,9.62-6.71H543.86c-1.84-.28-1.94-1.75-.1-1.93h29.85c3.85,0,7.33-3.22,9.34-6.71H548.26c-1.74-.28-1.74-1.75,0-1.93h35c3.5,0,6.71-4,8.08-6.71H552.86c-1.94-.28-1.94-2,0-2.11h39.09c3.13,0,6.06-3.22,8.18-6.62m-176.25,0h55.07c2,9.84,9,18,22.86,23.72a14.1,14.1,0,0,1-12.58,9H459.39c-4.57,0-8.15-3.77-9.62-6.71h30.37c1.84-.28,1.94-1.75.1-1.93H450.39c-3.85,0-7.33-3.22-9.34-6.71h34.69c1.74-.28,1.74-1.75,0-1.93h-35c-3.5,0-6.71-4-8.08-6.71h38.45c1.94-.28,1.94-2,0-2.11H432.05c-3.13,0-6.06-3.22-8.18-6.62M494.11,463a23.85,23.85,0,0,0,6.78,4.23,35.59,35.59,0,0,1,8.35-10.39A30.18,30.18,0,0,0,494.11,463m-9.64,19.59h12.2a39.21,39.21,0,0,1,3.31-13.7,30.18,30.18,0,0,1-7.33-4.51,27.11,27.11,0,0,0-8.18,18.21m26.62-11.22v11.22h-12.3a31.88,31.88,0,0,1,3-13,31.26,31.26,0,0,0,9.27,1.75M529.82,463a22.52,22.52,0,0,1-6.71,4.23,35.59,35.59,0,0,0-8.35-10.39A29.67,29.67,0,0,1,529.82,463m9.72,19.59h-12.2a37.09,37.09,0,0,0-3.21-13.7,32.69,32.69,0,0,0,7.23-4.51,26.62,26.62,0,0,1,8.18,18.21M513,471.36v11.22h12.2a30.35,30.35,0,0,0-3-13,31.22,31.22,0,0,1-9.17,1.75m-18.91,32.73a27.09,27.09,0,0,1,6.78-4,37.77,37.77,0,0,0,8.35,10.3,29.94,29.94,0,0,1-15.13-6.25m-9.64-19.59h12.2A39.71,39.71,0,0,0,500,498.3a33.33,33.33,0,0,0-7.33,4.51,27.41,27.41,0,0,1-8.18-18.3m26.62,11.31V484.51h-12.3a32,32,0,0,0,3,13.06,28.59,28.59,0,0,1,9.27-1.75m18.74,8.28a23.93,23.93,0,0,0-6.71-4,37.77,37.77,0,0,1-8.35,10.3,29.79,29.79,0,0,0,15.06-6.25m9.72-19.59h-12.2a35.68,35.68,0,0,1-3.21,13.79,35.16,35.16,0,0,1,7.23,4.51,27.33,27.33,0,0,0,8.18-18.3M513,495.82V484.51h12.2a30.75,30.75,0,0,1-3,13.06,28.5,28.5,0,0,0-9.17-1.75m-1.94-37.88a31.32,31.32,0,0,0-8.25,9.93,27.37,27.37,0,0,0,8.25,1.56Zm1.94,0a31.32,31.32,0,0,1,8.15,9.93,24.71,24.71,0,0,1-8.15,1.56Zm-1.94,51.22a27.77,27.77,0,0,1-8.25-9.93,24.68,24.68,0,0,1,8.25-1.38Zm1.94.18a31,31,0,0,0,8.15-10.11,27.12,27.12,0,0,0-8.15-1.38Z\\" transform=\\"translate(-423.88 -456.83)\\" style=\\"fill:#1e32fa;fill-rule:evenodd\\"/></svg>",
"BANK_BBL":"<svg id=\\"a\\" xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 162.0997 40.3216\\"><path d=\\"M43.6207,25.881c1.2546,0,2.3074-.6358,2.3074-2.1067s-1.0528-2.1268-2.405-2.1268h-2.9061v4.2335h3.0037ZM43.1834,19.7393c1.1941,0,2.0686-.6358,2.0686-1.9081s-.9351-1.8483-2.0888-1.8483h-2.5462v3.7563h2.5664ZM38.0102,13.9758h5.6105c2.5462,0,4.1978,1.4907,4.1978,3.5177,0,1.4309-.7736,2.4646-1.9879,2.9811,1.591.4574,2.7245,1.7491,2.7245,3.4384,0,2.3254-1.6515,3.9748-4.5139,3.9748h-6.0309v-13.9127.0007Z\\"/><path d=\\"M54.3942,26.1199c1.6515,0,2.5462-1.3314,2.5462-3.2596s-.8947-3.26-2.5462-3.26-2.5462,1.3318-2.5462,3.26.9149,3.2596,2.5462,3.2596ZM49.3421,22.8602c0-3.0809,1.6515-5.3072,4.4534-5.3072,1.4329,0,2.5092.6563,3.1853,1.7888v-1.5105h2.4453v10.0572h-2.4453v-1.5105c-.6761,1.113-1.7524,1.7888-3.1853,1.7888-2.8019,0-4.4534-2.2263-4.4534-5.3072v.0007Z\\"/><path d=\\"M61.2156,17.8313h2.4453v1.5902c.5785-1.1926,1.813-1.8486,3.1046-1.8486,2.368,0,3.599,1.4312,3.599,3.876v6.4396h-2.5059v-6.0024c0-1.4312-.5954-2.266-1.9105-2.266-1.4127,0-2.2267,1.0733-2.2267,2.9017v5.3667h-2.5059v-10.0572Z\\"/><path d=\\"M76.5132,25.4441c1.5708,0,2.4655-1.1923,2.4655-2.9219s-.8947-2.9219-2.4655-2.9219-2.4453,1.1926-2.4453,2.9219.8947,2.9219,2.4453,2.9219ZM71.7571,28.5246h2.5462c.2388.7749.9553,1.2921,2.1897,1.2921,1.6919,0,2.368-1.0532,2.368-2.6037v-1.1331c-.6559.8747-1.6515,1.3912-2.9263,1.3912-2.7447,0-4.376-2.067-4.376-4.9489s1.6313-4.9691,4.376-4.9691c1.3353,0,2.3478.5965,3.007,1.5703v-1.2921h2.4251v9.3616c0,2.9014-1.9307,4.5518-4.9142,4.5518-2.664,0-4.3962-1.2521-4.6956-3.22Z\\"/><polygon points=\\"85.6689 22.9994 85.6689 27.8888 83.163 27.8888 83.163 13.9762 85.6689 13.9762 85.6689 21.966 89.2713 17.8316 92.275 17.8316 88.1781 22.3834 92.8131 27.8892 89.7287 27.8892 85.6689 22.9997 85.6689 22.9994\\"/><path d=\\"M97.2732,26.1592c1.6683,0,2.5664-1.3714,2.5664-3.299s-.8981-3.2993-2.5664-3.2993c-1.6717,0-2.6068,1.3912-2.6068,3.2993s.9149,3.299,2.6068,3.299ZM92.1606,22.8602c0-3.0809,1.887-5.3267,5.1127-5.3267,3.2223,0,5.0723,2.2458,5.0723,5.3267s-1.8702,5.3267-5.0723,5.3267c-3.2055,0-5.1127-2.2462-5.1127-5.3267Z\\"/><polygon points=\\"106.1094 22.9994 106.1094 27.8889 103.6002 27.8889 103.6002 13.9762 106.1094 13.9762 106.1094 21.966 109.7084 17.8317 112.7121 17.8317 108.6153 22.3834 113.2503 27.8892 110.1659 27.8892 106.1094 22.9997 106.1094 22.9994\\"/><path d=\\"M123.9532,25.881c1.2546,0,2.3074-.6358,2.3074-2.1067s-1.0528-2.1268-2.4083-2.1268h-2.9028v4.2335h3.0037ZM123.516,19.7394c1.1941,0,2.0686-.6358,2.0686-1.9081s-.9351-1.8483-2.0888-1.8483h-2.5462v3.7563h2.5664ZM118.3428,13.9759h5.6105c2.5462,0,4.1978,1.4907,4.1978,3.5177,0,1.4309-.777,2.4646-1.9912,2.9811,1.591.4573,2.7279,1.7491,2.7279,3.4384,0,2.3254-1.6515,3.9748-4.5173,3.9748h-6.0275v-13.9127.0007Z\\"/><path d=\\"M134.7234,26.1199c1.6515,0,2.5496-1.3314,2.5496-3.2596s-.8981-3.26-2.5496-3.26c-1.6481,0-2.5462,1.3317-2.5462,3.26s.9183,3.2596,2.5462,3.2596ZM129.6713,22.8603c0-3.0809,1.6515-5.3072,4.4568-5.3072,1.4329,0,2.5059.6563,3.1819,1.7888v-1.5105h2.4487v10.0572h-2.4487v-1.5105c-.6761,1.113-1.7491,1.7888-3.1819,1.7888-2.8052,0-4.4568-2.2263-4.4568-5.3072v.0007Z\\"/><path d=\\"M141.5448,17.8313h2.4487v1.5902c.5752-1.1926,1.8096-1.8486,3.1012-1.8486,2.368,0,3.6024,1.4312,3.6024,3.8759v6.4397h-2.5059v-6.0025c0-1.4312-.5987-2.2659-1.9105-2.2659-1.4127,0-2.2267,1.0733-2.2267,2.9017v5.3667h-2.5092v-10.0572Z\\"/><polygon points=\\"154.9554 22.9994 154.9554 27.8889 152.4495 27.8889 152.4495 13.9762 154.9554 13.9762 154.9554 21.966 158.5578 17.8317 161.5615 17.8317 157.4647 22.3834 162.0997 27.8892 159.0153 27.8892 154.9554 22.9997 154.9554 22.9994\\"/><path d=\\"M23.0056,31.3498l-5.9028,4.0322v-2.3688c0-1.5122-.0505-2.2179.9586-3.3773l6.2559-6.9558c1.11-1.2598,1.6142-2.1167,1.9169-2.9737.7064,1.3106,1.11,2.7216,1.11,4.1834,0,2.8228-1.5641,5.5948-4.3387,7.4599ZM8.5263,21.1682c-1.5641-1.7138-1.8668-2.6716-1.8668-3.6797s.2018-1.8143,1.4127-3.377l7.0629-9.175,7.0632,9.1751c1.1604,1.5626,1.4127,2.4192,1.4127,3.3769,0,1.0081-.3027,1.9659-1.8668,3.6797l-6.6091,7.3588-6.6088-7.3588ZM13.1678,33.0132v2.3688l-5.9028-4.0322c-2.775-1.8651-4.3389-4.6371-4.3389-7.4599,0-1.4618.4036-2.8729,1.1098-4.1834.3027.8569.8073,1.7138,1.9172,2.9737l6.2559,6.9558c1.0091,1.1594.9586,1.8651.9586,3.3773ZM27.3947,16.0775L15.1351,0,2.8757,16.0775c-2.0685,2.7216-2.8757,5.0908-2.8757,7.6612,0,3.9317,1.9676,7.4599,5.4991,9.9295l9.636,6.6535,9.6363-6.6534c3.5314-2.4696,5.4991-5.9978,5.4991-9.9295,0-2.5704-.8073-4.9395-2.8759-7.6612Z\\" style=\\"fill:#0064ff;\\"/></svg>",
"BANK_KBANK":"<svg id=\\"Layer_1\\" xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 32 32\\"><defs><style>.cls-1{fill:#e71618;}.cls-2{fill:#fff;}.cls-3{fill:#887369;}.cls-4{fill:#009b3b;}</style></defs><g id=\\"Group_39591\\"><g id=\\"Group_39591-2\\"><path id=\\"Path_56081\\" class=\\"cls-2\\" d=\\"M30.86,16.1c0,8.15-6.61,14.76-14.76,14.76-8.15,0-14.76-6.61-14.76-14.76,0-8.15,6.61-14.76,14.76-14.76,8.15,0,14.76,6.61,14.76,14.76\\"/><path id=\\"Path_56082\\" class=\\"cls-3\\" d=\\"M23.54,23.74c-.75-.45-1.61-.69-2.48-.71-.87.04-1.71.28-2.47.7-.82.45-1.73.7-2.66.73-.85-.04-1.67-.27-2.42-.68-.82-.45-1.74-.7-2.67-.74-.86.04-1.71.27-2.47.68-.82.44-1.74.69-2.67.72h-.17c.11.14.22.27.34.4.93-.06,1.84-.32,2.67-.75.71-.39,1.5-.61,2.31-.65.88.04,1.73.27,2.5.7.79.43,1.68.68,2.58.72.99-.03,1.96-.3,2.83-.77.71-.39,1.49-.62,2.3-.66.81.02,1.6.25,2.3.67.83.49,1.78.76,2.75.76.12-.14.24-.27.35-.42-.11,0-.22.01-.33.01-.91,0-1.8-.26-2.59-.72\\"/><path id=\\"Path_56083\\" class=\\"cls-3\\" d=\\"M21.06,23.8c-.87.04-1.71.28-2.47.7-.82.45-1.73.69-2.66.73-.85-.04-1.67-.27-2.42-.68-.82-.45-1.74-.7-2.67-.74-.86.04-1.71.28-2.47.68-.69.35-1.43.59-2.2.69.11.12.23.25.35.36.7-.14,1.37-.37,2.01-.68.71-.39,1.5-.61,2.31-.65.88.03,1.73.27,2.5.7.8.44,1.68.68,2.59.72.99-.03,1.96-.29,2.83-.77.71-.39,1.49-.62,2.3-.66.81.02,1.6.25,2.3.67.64.37,1.34.61,2.07.72.12-.12.25-.25.36-.37-.79-.07-1.56-.31-2.25-.71-.75-.45-1.61-.69-2.48-.71\\"/><path id=\\"Path_56084\\" class=\\"cls-3\\" d=\\"M21.06,24.56c-.86.04-1.71.28-2.47.69-.82.45-1.73.7-2.66.73-.85-.04-1.67-.27-2.42-.68-.82-.45-1.74-.7-2.67-.74-.86.04-1.71.28-2.47.68-.49.24-1.01.44-1.54.58.11.11.24.22.36.32.46-.15.92-.33,1.35-.53.71-.39,1.5-.61,2.31-.65.88.03,1.73.27,2.5.7.79.44,1.68.68,2.59.72.99-.03,1.96-.3,2.83-.77.71-.39,1.49-.62,2.3-.66.81.02,1.6.25,2.3.67.44.24.91.44,1.39.58l.37-.33c-.55-.13-1.08-.34-1.58-.62-.75-.45-1.61-.69-2.48-.71\\"/><path id=\\"Path_56085\\" class=\\"cls-3\\" d=\\"M21.06,25.32c-.87.04-1.71.28-2.47.7-.82.44-1.73.69-2.66.73-.85-.04-1.67-.27-2.42-.68-.82-.45-1.74-.7-2.67-.74-.86.04-1.71.27-2.47.68-.29.13-.59.27-.9.38.12.1.24.19.37.29.24-.1.47-.2.7-.3.71-.38,1.5-.61,2.31-.65.88.03,1.73.27,2.5.7.79.44,1.68.68,2.59.72.99-.03,1.96-.29,2.83-.77.71-.39,1.49-.62,2.3-.66.81.02,1.6.25,2.3.67.24.12.47.24.74.35.12-.09.24-.19.36-.29-.31-.12-.62-.26-.92-.42-.75-.45-1.61-.69-2.48-.71\\"/><path id=\\"Path_56086\\" class=\\"cls-3\\" d=\\"M21.06,26.09c-.87.04-1.71.28-2.47.7-.82.44-1.73.69-2.66.73-.85-.04-1.67-.27-2.42-.68-.82-.45-1.74-.7-2.67-.74-.86.04-1.71.28-2.47.68-.09.04-.17.08-.26.11.13.09.25.18.38.27.01,0,.03,0,.04-.01.71-.38,1.5-.61,2.31-.65.88.04,1.73.27,2.5.7.79.44,1.68.68,2.59.72.99-.03,1.96-.3,2.83-.77.71-.39,1.49-.62,2.3-.66.81.02,1.6.25,2.3.66l.09.04c.13-.08.25-.17.38-.26l-.29-.14c-.75-.45-1.61-.69-2.48-.71\\"/><path id=\\"Path_56087\\" class=\\"cls-3\\" d=\\"M18.59,27.54c-.82.44-1.73.69-2.66.73-.85-.04-1.67-.27-2.41-.68-.82-.45-1.74-.7-2.68-.74-.71.02-1.41.19-2.06.5.14.09.28.18.43.26.51-.22,1.07-.34,1.63-.35.88.04,1.73.27,2.5.7.8.43,1.68.68,2.59.72.99-.03,1.96-.29,2.83-.77.71-.39,1.49-.62,2.3-.66.59,0,1.17.13,1.71.38.14-.08.28-.17.42-.25-.65-.34-1.38-.52-2.12-.53-.87.04-1.71.28-2.47.7\\"/><path id=\\"Path_56088\\" class=\\"cls-1\\" d=\\"M16,0C7.16,0,0,7.16,0,16s7.16,16,16,16,16-7.16,16-16S24.84,0,16,0M16,29.45c-7.43,0-13.45-6.02-13.45-13.45,0-7.43,6.02-13.45,13.45-13.45,7.43,0,13.45,6.02,13.45,13.45,0,7.43-6.02,13.45-13.44,13.45h0\\"/><path id=\\"Path_56089\\" class=\\"cls-4\\" d=\\"M23.57,12.03c-.16.5-.47.93-.89,1.25-.62.5-4.76,3.03-5.23,3.62-.4.62-.59,1.36-.54,2.1v4.86h.64v-1.26c.05-.62.31-1.2.75-1.64,1.31-1.07,2.69-2.06,4.13-2.96.85-.67,1.28-1.73,1.15-2.81v-3.32.15Z\\"/><path id=\\"Path_56090\\" class=\\"cls-4\\" d=\\"M16.91,16.6c.46-.58,4.73-3.18,5.34-3.68.75-.51,1.23-1.32,1.33-2.22v-5.45c-.08.78-.43,1.52-.98,2.08-.63.82-3.5,2.38-4.92,3.37-1.17.65-1.9,1.88-1.91,3.22v9.95h.64v-5.19c-.06-.73.12-1.45.51-2.07\\"/><path id=\\"Path_56091\\" class=\\"cls-4\\" d=\\"M13.67,10.97c-1.49-1.11-2.91-2.3-4.26-3.56-.55-.58-.9-1.32-1-2.11v5.06c.05,1.18.64,2.27,1.61,2.95,1.26.92,3.04,2.26,3.57,2.8.71.79,1.09,1.82,1.04,2.88v4.88h.63v-9.74c.16-1.28-.47-2.53-1.58-3.17\\"/></g></g></svg>",
"BANK_SCB":"<svg id=\\"Layer_1\\" data-name=\\"Layer 1\\" xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 153 48\\"><g id=\\"Layer_2\\" data-name=\\"Layer 2\\"><rect width=\\"153\\" height=\\"48\\" style=\\"fill:none\\"/></g><g id=\\"Layer_1-2\\" data-name=\\"Layer 1\\"><path d=\\"M169.4,282.2a2.54,2.54,0,0,0-1.6-.5H165v1.7h2.1c.6.1.5,0,.6.3h0a2.94,2.94,0,0,0-.8,1.7v11.1h2.3V285.7h0c0-.6.8-1,.8-2.1A1.56,1.56,0,0,0,169.4,282.2Zm35.8,9.6-2.4-7h-1.9l-2.4,7-1.9-7h-2.3l3.1,11.6h1.7l2.7-7.7,2.7,7.7h1.8l3.1-11.6h-2.3Zm11.5-5.9a4.38,4.38,0,0,0-3.4-1.3,5.4,5.4,0,0,0-2.7.6h-.2v2.5l.5-.3a3.89,3.89,0,0,1,2.3-.7,2.14,2.14,0,0,1,1.8.7,2.71,2.71,0,0,1,.6,1.9v7.1h2.3v-7.6h0A4.77,4.77,0,0,0,216.7,285.9Zm-36.8-.2a3.61,3.61,0,0,0-1.5-.8,5.66,5.66,0,0,0-1.8-.3,4.8,4.8,0,0,0-3.1,1v-.8h-2.2v11.6h2.3v-7.5a1.76,1.76,0,0,1,.9-1.5,3.52,3.52,0,0,1,2.1-.7,2.61,2.61,0,0,1,1.8.6,2.11,2.11,0,0,1,.6,1.6v7.5h2.3v-7.7a4.67,4.67,0,0,0-.3-1.7A4.49,4.49,0,0,0,179.9,285.7Zm13.1-.9h-2.3v8.9a5,5,0,0,1-2.7.8,4.62,4.62,0,0,1-2.3-.5,1.72,1.72,0,0,1-.8-1.4,1.45,1.45,0,0,1,.2-.7,2.65,2.65,0,0,1,.5-.6,2,2,0,0,1,.8-.4,2.77,2.77,0,0,1,.9-.1h1.5v-2.2h-1.7c-1.4,0-1.9-.4-1.9-.9s.3-.8,1.5-.8a1.76,1.76,0,0,1,.6.1,5.16,5.16,0,0,1,1.1.2h.4v-2.1l-.2-.1a6.28,6.28,0,0,0-1.9-.3,7.72,7.72,0,0,0-1.5.2,3.38,3.38,0,0,0-1.2.6,3.24,3.24,0,0,0-.8.9,2.66,2.66,0,0,0-.3,1.2,2,2,0,0,0,.6,1.5,1.56,1.56,0,0,0,.8.6,6.47,6.47,0,0,0-.9.8,3.06,3.06,0,0,0-.7,2h0a3.5,3.5,0,0,0,1.4,2.8,6.16,6.16,0,0,0,4,1.2h0a6.26,6.26,0,0,0,4.9-1.9h0Zm34.5-3.9v1.8h9.2v-2h-9.2ZM257,293.7a5,5,0,0,1-2.7.8,4.62,4.62,0,0,1-2.3-.5,1.72,1.72,0,0,1-.8-1.4,1.45,1.45,0,0,1,.2-.7,2.65,2.65,0,0,1,.5-.6,2,2,0,0,1,.8-.4,2.77,2.77,0,0,1,.9-.1h1.5v-2.2h-1.7c-1.4,0-1.8-.4-1.9-.9s.3-.8,1.5-.8a1.76,1.76,0,0,1,.6.1,6.53,6.53,0,0,1,1.1.2h.4v-2.1l-.2-.1a6.28,6.28,0,0,0-1.9-.3,7.72,7.72,0,0,0-1.5.2,2.28,2.28,0,0,0-1.2.6,3.24,3.24,0,0,0-.8.9,2.66,2.66,0,0,0-.3,1.2h0a2.2,2.2,0,0,0,.6,1.5,1.56,1.56,0,0,0,.8.6,6.47,6.47,0,0,0-.9.8,3.06,3.06,0,0,0-.7,2h0a3.85,3.85,0,0,0,1.4,2.9,6.16,6.16,0,0,0,4,1.2h0a6.26,6.26,0,0,0,4.9-1.9h0v-.1h0v-9.7H257Zm.8-13.7a1.72,1.72,0,0,0-1.5.5,2.12,2.12,0,0,0-.4,1.4v.8h2.3v-.6c0-.3,0-.3.6-.4h1.1V280Zm-23.4,12.3a1.66,1.66,0,0,1-.8,1.5,2.81,2.81,0,0,1-1.9.7,2.54,2.54,0,0,1-1.6-.5,1.68,1.68,0,0,1-.6-1.4v-3.9h0a3.44,3.44,0,0,0-1.5-3,5.58,5.58,0,0,0-3.5-1,5.72,5.72,0,0,0-4.9,2.5h0v9.2h3.9v-2.1h-1.7v-6.5a3.39,3.39,0,0,1,2.7-1.1,3.17,3.17,0,0,1,2,.6,1.75,1.75,0,0,1,.7,1.6v3.7h0a3.7,3.7,0,0,0,1.2,2.9,4.23,4.23,0,0,0,3.1,1.1,4.45,4.45,0,0,0,2.9-1v.8h2.3V284.8h-2.3Zm11-4.8,2-1.8-1.9-1.1-4.3,3.7.6.1c2.8.5,4,1.6,4,3.4a2.32,2.32,0,0,1-.9,1.9,3.74,3.74,0,0,1-2.5.8h-.3a1.7,1.7,0,0,1-.7-.1,1.85,1.85,0,0,1-.7-.2v-9.5h-2.3v11.1l.2.1a11,11,0,0,0,3.6.7h.1a6.44,6.44,0,0,0,4.2-1.4,4.19,4.19,0,0,0,1.5-3.4h0A4.39,4.39,0,0,0,245.4,287.5Z\\" transform=\\"translate(-164 -254)\\" style=\\"fill:#462279\\"/><rect x=\\"104.5\\" width=\\"48.5\\" height=\\"48\\" style=\\"fill:#462279\\"/><path d=\\"M311.5,291.9l-5.1-20-13.6-12.4-13.6,12.3-5.1,20,9.7,4.6h7.7v-6.9s-14.2,7.5-10.5-9.3c1.2-5.6,7.8-13,11.5-15.1.1-.1.2-.1.3-.2h0c3.7,1.8,10.6,9.5,11.9,15.3,3.7,16.8-10.5,9.3-10.5,9.3v6.9h7.7Z\\" transform=\\"translate(-164 -254)\\" style=\\"fill:#feac00\\"/><path d=\\"M229.6,264.4l.4-2.5a13.67,13.67,0,0,0-4.6-.8c-2.7,0-6,.8-6,4.5,0,3.3,3.8,3.9,4.7,4.1s3.6.7,3.6,2.2-2,1.9-3.2,1.9a10.94,10.94,0,0,1-4.8-1.3l-.4,2.6a10.68,10.68,0,0,0,5.1,1.2c3.1,0,6.1-1.3,6.1-4.4,0-2.8-1.7-3.9-4.5-4.5-3.2-.7-3.8-1.2-3.8-2.1s.9-1.7,3.2-1.7A18,18,0,0,1,229.6,264.4Z\\" transform=\\"translate(-164 -254)\\" style=\\"fill:#462279\\"/><path d=\\"M244.1,264.3l.4-2.5a12.51,12.51,0,0,0-4.1-.7c-2.4,0-7.7.5-7.7,7.7s5.4,7.6,7.6,7.6a13.22,13.22,0,0,0,4.3-.9l-.4-2.4a9.53,9.53,0,0,1-3.7.7c-2,0-4.7-.4-4.7-5.1s2.6-5,4.7-5A14.07,14.07,0,0,1,244.1,264.3Z\\" transform=\\"translate(-164 -254)\\" style=\\"fill:#462279\\"/><path d=\\"M257.1,268.4v-.1s2.2-.3,2.2-3.2-2.8-3.7-5.3-3.7h-6.7v14.8h7c3.3,0,5.7-1.1,5.7-4.2A3.47,3.47,0,0,0,257.1,268.4Zm-6.9-4.6h3.9c1.3,0,2.3.4,2.3,1.8s-.7,1.9-2.3,1.9h-3.9Zm4.2,9.9h-4.2v-4h4.3c1.1,0,2.5.2,2.5,1.9S255.8,273.7,254.4,273.7Z\\" transform=\\"translate(-164 -254)\\" style=\\"fill:#462279\\"/></g></svg>",
};
const LIVERY={TG:['#4b2a85','#f2b21d'],WE:['#e5486d','#f2b21d'],PG:['#0e6eb8','#7dc242'],FD:['#e40b1c','#ffffff'],SL:['#c8102e','#ff8200'],VZ:['#ec1c24','#ffcb05'],TR:['#ffcd00','#33334c'],'6E':['#001b94','#ffffff'],AI:['#d3072a','#e8a33d'],IX:['#f37021','#2a2a72'],UK:['#4b286d','#c5a05a'],SG:['#d61a2e','#ffcb05'],QP:['#ff6d38','#4b2a85'],MH:['#0f2557','#c8102e'],SQ:['#f4b400','#12295e'],EK:['#d71920','#c8a45d'],QR:['#5c0632','#c9b48a'],BA:['#075aaa','#dc241f'],LH:['#05164d','#ffad1d'],AF:['#002157','#ff0000'],CX:['#00645a','#b8b8b8'],KE:['#00a3e0','#c8102e'],JL:['#b8000f','#ffffff'],BR:['#006747','#ff8200'],UA:['#005daa','#ffffff'],ET:['#628c2a','#fbe122'],VN:['#0a6c58','#f2b21d'],GA:['#0e4c8c','#35b6b4']};
function airlineOf(fl){if(!fl)return null;const m=String(fl).toUpperCase().match(/^([A-Z0-9]{2})[\\s-]?/);return m?m[1]:null}
function logoURI(code){const s=LOGOS[code]||LOGOS['IATA'];return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(s)}
function flightChip(fl){if(!fl)return '';const c=airlineOf(fl);const has=c&&LOGOS[c];
  return '<span class="fchip"><img src="'+logoURI(has?c:'IATA')+'" alt=""> '+esc(fl)+'</span>'}
function bankChip(b){const M={BBL:['BANK_BBL','Bangkok Bank'],KBANK:['BANK_KBANK','Kasikorn'],SCB:['BANK_SCB','SCB']};
  if(!M[b])return '';return '<span class="fchip bankc"><img src="'+logoURI(M[b][0])+'" alt=""> '+M[b][1]+'</span>'}

/* ============================================================
   v59 — MASTER BUSINESS + SEND FLOW + NOTICE BOARD + RATE ENGINE
   (function-declaration overrides — hoisting se yehi chalenge)
   ============================================================ */
/* ---------- Book switcher: KACHCHA → PAKKA·BOTH → SE → AW → cycle ---------- */
function bookLabel(){
  if(BOOK.mode==='cash')return 'KACHCHA';
  if(BOOK.co==='both')return 'PAKKA \\u00B7 SE+AW';
  return (BOOK.co==='singh'?'SINGH':'AWADH')+' \\u00B7 PAKKA';
}
function coName(co){return co==='both'?'Singh + Awadh':(CO_NAMES[co]||'')}
function setBook(mode,co,silent){
  BOOK.mode=mode;BOOK.co=co||BOOK.co;DB.book=BOOK;saveDB();
  document.documentElement.dataset.book=(mode==='cash'?'k':'p');
  document.documentElement.dataset.co=(mode==='cash'?'':BOOK.co);
  const badge=$('#bookBadge');if(badge)badge.textContent=bookLabel();
  $$('.mode-wrap').forEach(function(w){
    w.dataset.mode=(mode==='cash'?'cash':'business');
    w.querySelectorAll('.mode-btn').forEach(function(x){x.classList.toggle('sel',x.dataset.mode===(mode==='cash'?'cash':'business'))});
  });
  $$('.co-btn').forEach(function(x){x.classList.toggle('sel',mode!=='cash'&&x.dataset.co===BOOK.co)});
  $$('.wmform').forEach(function(f){f.dataset.wm=(mode==='cash'?'KACHCHA':(BOOK.co==='both'?'PAKKA':CO_NAMES[BOOK.co].toUpperCase()))});
  const g=$('#invGst');if(g){g.style.display=(mode==='cash'?'none':'block');const gc=$('#invGstCo');if(gc)gc.textContent=coName(BOOK.co==='both'?'singh':BOOK.co)}
  const qt=$('#invTitle');if(qt)qt.textContent=(mode==='cash'?'New Kachcha Receipt':'New Pakka Invoice \\u2014 '+coName(BOOK.co));
  try{renderAll()}catch(e){}
  if(!silent){hap('toggle');
    toast(mode==='cash'?'KACHCHA book \\u2014 quick save, no GST':(BOOK.co==='both'?'Business master view \\u2014 Singh + Awadh saath':coName(BOOK.co)+' \\u2014 Pakka \\u00B7 GST'))}
}
(function(){
  const b=$('#bookBadge');if(!b)return;
  b.addEventListener('click',function(){
    if(BOOK.mode==='cash')setBook('business','both');
    else if(BOOK.co==='both')setBook('business','singh');
    else if(BOOK.co==='singh')setBook('business','awadh');
    else setBook('cash','both');
  });
})();
/* co filter helpers */
function coPass(x){
  if(bookKeyOf()==='k')return x.book==='k';
  if(x.book!=='p')return false;
  return BOOK.co==='both'||x.co===BOOK.co;
}
function coTag(x){
  if(x.book==='k')return '<span class="cotag k">K</span>';
  return x.co==='singh'?'<span class="cotag se">SE</span>':'<span class="cotag aw">AW</span>';
}
/* ---------- SEED v4 additions (hoisted override) ---------- */
function seedExtra(db){
  const R2=rng(77);const ri2=(a,b)=>a+Math.floor(R2()*(b-a+1));
  /* agents */
  db.parties.push({id:'AG1',n:'Freight Care Logistics',type:'agent',city:'Delhi',country:'India',lang:'Hindi',phone:'+91 98104 55210',ri:0,rt:0,books:{k:false,p:true},balK:{inr:0,thb:0},balP:{inr:0,thb:0},last:{}});
  db.parties.push({id:'AG2',n:'BlueDart Cargo Desk',type:'agent',city:'Delhi',country:'India',lang:'Hindi',phone:'+91 99110 20031',ri:0,rt:0,books:{k:false,p:true},balK:{inr:0,thb:0},balP:{inr:0,thb:0},last:{}});
  /* ships ko book/co do */
  db.ships.forEach((s,i)=>{if(!s.co){if(i%4===3){s.book='p';s.co=(i%8===3?'singh':'awadh');s.kind=(i%8===3?'aircargo':'seacargo');s.agent='Freight Care Logistics';s.awb=(s.kind==='aircargo'?'098-'+ri2(4000,9999)+' '+ri2(1000,9999):'MSCU '+ri2(100000,999999)+'-'+ri2(1,9))}else{s.book='k'}}});
  /* invoices already book/co; moves airline+book */
  db.moves.forEach(m=>{if(m.kind==='carrier'){m.book='k'}else{m.book='p';m.co=m.co||(m.kind==='seacargo'?'awadh':'singh');m.agent=m.agent||'Freight Care Logistics'}});
  /* notice board (custody v2) */
  db.board=[
    {id:'N1',kind:'SAMAAN',qty:640,unit:'gm',holder:'Mahesh ji',dir:'laya',d:'16 Aug',note:'Delhi aa gaya \\u2014 aapke bolne par dega',st:'with'},
    {id:'N2',kind:'SOMANY',qty:4200,unit:'$',holder:'Ramesh bhai',dir:'lekar gaya',d:'16 Aug',note:'flight mein \\u2014 Super Rich ke liye',st:'with'},
    {id:'N3',kind:'SOMANY',qty:2800,unit:'$',holder:'Vikas',dir:'lekar gaya',d:'16 Aug',note:'raat ki flight se jayega',st:'with'},
    {id:'N4',kind:'SAMAAN',qty:500,unit:'gm',holder:'Ramesh bhai',dir:'laya',d:'12 Aug',note:'Delhi WH1 mein rakha',st:'got',gotd:'12 Aug shaam'},
    {id:'N5',kind:'SOMANY',qty:3600,unit:'$',holder:'Ramesh bhai',dir:'lekar gaya',d:'07 Aug',note:'Super Rich exchange \\u2014 ho gaya',st:'got',gotd:'08 Aug'},
    {id:'N6',kind:'SAMAAN',qty:700,unit:'gm',holder:'Ramesh bhai',dir:'laya',d:'28 Jul',note:'Jaipur pahunchaya',st:'got',gotd:'28 Jul'}
  ];
  /* SOMANY lots */
  db.usdLots=[
    {id:'U1',d:'14 Aug',who:'Vikas laya',amt:5200,buy:87.4,at:'Delhi WH1'},
    {id:'U2',d:'09 Aug',who:'exchange bacha',amt:3800,buy:86.9,at:'Bangkok Store'},
    {id:'U3',d:'02 Aug',who:'Ramesh bhai laya',amt:6400,buy:88.6,at:'Delhi WH1'},
    {id:'U4',d:'22 Jul',who:'Suresh laya',amt:2200,buy:86.2,at:'Kolkata'},
    {id:'U5',d:'11 Jul',who:'purana stock',amt:1800,buy:85.5,at:'Bangkok Store'}
  ];
  /* banks on THB receipts */
  const banks=['BBL','KBANK','SCB'];let bi=0;
  db.ledger.forEach(l=>{if(l.txt.indexOf('THB mila')>-1){l.bank=banks[bi++%3]}});
  db.rateCfg={marginPct:2.8};
  db.v=4;
  return db;
}
/* USD rate constants */
const USD_INR=88.24,USD_THB=32.41;
function realRates(){
  /* gold cycle: BKK ฿ kharid → India ₹ bech; dollar cycle bhi — demo par asli structure */
  const goldBuy=+( (GOLD_IN/ (4176*0.972)) ).toFixed(3);      /* ~2.93 — THB milne ki asli value */
  const dollarSell=+((USD_INR/USD_THB)*1.085).toFixed(3);     /* ~2.955 — THB dene ki asli laagat */
  return {buyReal:goldBuy,sellReal:dollarSell};
}
function suggRates(){
  const m=(DB.rateCfg&&DB.rateCfg.marginPct||2.8)/100;
  const r=realRates();
  return {buy:+(r.buyReal*(1-m)).toFixed(3),sell:+(r.sellReal*(1+m)).toFixed(3),real:r,m:m*100};
}
/* ---------- DETAIL OVERLAY (invoice + shipment full form-view) ---------- */
function openDtl(html){$('#dtlOverlay').innerHTML='<div class="pd-top"><button class="back" id="dtlBack">\\u2190</button><div style="flex:1;min-width:0" id="dtlHead"></div></div><div id="dtlBody">'+html+'</div>';
  $('#dtlOverlay').classList.add('open');
  $('#dtlBack').addEventListener('click',()=>{$('#dtlOverlay').classList.remove('open');hap('nav')});
}
function openInvoice(id){
  const inv=DB.invoices.find(i=>i.id===id);if(!inv)return;
  const par=partyByName(inv.party)||{};
  let rows='';inv.lines.forEach((l,i)=>{rows+='<tr><td>'+(i+1)+'</td><td>'+esc(l.item)+'</td><td>'+l.qty+' '+esc(l.unit||'pc')+'</td><td>\\u20B9'+l.rate+'</td><td style="text-align:right">'+fINR(l.qty*l.rate)+'</td></tr>'});
  openDtl('<div class="card" style="margin-bottom:13px"><div class="card-head"><span class="card-eyebrow">'+(inv.book==='k'?'Kachcha Receipt':'Pakka Invoice')+'</span><span style="margin-left:auto">'+coTag(inv)+' <span class="pill '+inv.stl+'">'+inv.st+'</span></span></div>'+
    '<h2 style="font-family:var(--font-m);font-size:22px;margin:2px 0 4px">'+inv.id+'</h2>'+
    '<div style="font-size:12.5px;color:var(--muted)">'+esc(inv.d)+' \\u00B7 <b style="color:var(--ink)">'+esc(inv.party)+'</b> '+flag(par.country)+(inv.co?' \\u00B7 '+coName(inv.co):'')+'</div></div>'+
    '<div class="card" style="margin-bottom:13px"><table class="dtl-lines"><tr><th>#</th><th>ITEM</th><th>QTY</th><th>RATE</th><th style="text-align:right">TOTAL</th></tr>'+rows+'</table>'+
    '<div class="totbar"><span>Subtotal <b>'+fINR(inv.total-inv.fr-inv.gst)+'</b></span><span>Freight ('+inv.kg+' kg) <b>'+fINR(inv.fr)+'</b></span>'+(inv.gst?'<span>GST 5% <b>'+fINR(inv.gst)+'</b></span>':'')+'<span class="grand">'+fINR(inv.total)+'</span></div></div>'+
    '<div style="display:flex;gap:9px;flex-wrap:wrap">'+
    (inv.shp?'<span class="trk" style="padding:10px 14px">Shipment: '+inv.shp+'</span>':'<button class="btn primary" id="dtlShip">\\uD83D\\uDCE6 Ship \\u2192</button>')+
    '<button class="btn" data-toast="Invoice PDF \\u2014 demo">\\uD83D\\uDCC4 PDF</button>'+
    '<button class="btn" id="dtlLed">\\uD83D\\uDCD2 Party ledger</button></div>');
  const ds=$('#dtlShip');if(ds)ds.addEventListener('click',()=>{$('#dtlOverlay').classList.remove('open');shipFromInvoice(inv.id);hap('nav')});
  const dl=$('#dtlLed');if(dl)dl.addEventListener('click',()=>{$('#dtlOverlay').classList.remove('open');go('hisaab');openLedger(inv.party);hap('nav')});
}
function openShipment(id){
  const sh=DB.ships.find(s=>s.id===id);if(!sh)return;
  const bags=DB.bags.filter(b=>b.shp===id);
  let rows='';bags.forEach((b,i)=>{rows+='<tr><td>'+b.id+'</td><td>'+esc(b.parent||'DIRECT')+'</td><td>'+esc(b.end)+'</td><td>'+b.items.map(x=>esc(x.n.split(' (')[0])+' \\u00D7'+x.qty).join('<br>')+'</td><td style="text-align:right">'+b.kg+' kg</td></tr>'});
  openDtl('<div class="card" style="margin-bottom:13px"><div class="card-head"><span class="card-eyebrow">Shipment</span><span style="margin-left:auto">'+coTag(sh)+' <span class="pill '+sh.stl+'">'+sh.st+'</span></span></div>'+
    '<h2 style="font-family:var(--font-m);font-size:22px;margin:2px 0 4px">'+sh.id+' <span style="font-size:14px;color:var(--muted)">\\u00B7 '+sh.kg+' kg \\u00B7 '+bags.length+' bags</span></h2>'+
    '<div style="font-size:12.5px;color:var(--muted)">'+esc(sh.d)+' \\u00B7 '+esc(sh.dest)+(sh.who?' \\u00B7 \\u2708 '+esc(sh.who):'')+(sh.agent?' \\u00B7 agent: '+esc(sh.agent):'')+(sh.awb?' \\u00B7 ':'')+(sh.awb?flightChip(sh.awb):'')+(sh.inv?' \\u00B7 invoice '+sh.inv:'')+'</div></div>'+
    '<div class="card" style="margin-bottom:13px"><table class="dtl-lines"><tr><th>BAG</th><th>PARENT</th><th>DELIVER TO</th><th>ITEMS</th><th style="text-align:right">KG</th></tr>'+rows+'</table></div>'+
    '<div style="display:flex;gap:9px;flex-wrap:wrap">'+
    ((sh.st==='READY')?'<button class="btn primary" id="dtlSend">\\uD83D\\uDE80 Send \\u2192</button>':'')+
    '<button class="btn" id="dtlPL">\\uD83D\\uDCC4 Packing List</button><button class="btn" id="dtlCK">\\u2611 Checklist</button></div>');
  const s1=$('#dtlSend');if(s1)s1.addEventListener('click',()=>{openSendSheet(sh.id)});
  $('#dtlPL').addEventListener('click',()=>buildPackingList(sh.id));
  $('#dtlCK').addEventListener('click',()=>buildChecklist(sh.id));
}
/* ---------- SEND SHEET (carrier kachcha / pakka cargo) ---------- */
let SS={ship:null,mode:null,co:'singh',kind:'aircargo',trip:null};
function openSendSheet(shipId){
  SS={ship:shipId,mode:null,co:'singh',kind:'aircargo',trip:null};
  const sh=DB.ships.find(s=>s.id===shipId);
  const trips=DB.moves.filter(m=>m.kind==='carrier'&&(m.st==='PLANNED'||m.st==='BOARDING AAJ'));
  let t1='';
  trips.forEach(m=>{const gap=Math.max(0,(m.need||0)-(m.out.kg||0));
    t1+='<div class="send-opt tripopt" data-trip="'+m.id+'"><div class="ic" style="background:linear-gradient(135deg,#22d3ee33,#0e7490)">\\u2708</div>'+
    '<div><b>'+esc(m.who)+'</b><small>'+esc(m.d)+(m.fl?' \\u00B7 '+esc(m.fl):'')+' \\u00B7 '+esc(m.st)+'</small></div>'+
    '<div class="cap">'+(m.need?('<b style="color:'+(gap>0?'var(--green)':'#f0c46c')+'">'+gap+' kg space</b><br>'):'')+'<span style="color:var(--muted)">'+(m.out.kg||0)+'/'+(m.need||'\\u2014')+' kg</span></div></div>'});
  const agents=DB.parties.filter(p=>p.type==='agent');
  $('#ssInner').innerHTML='<div class="card-head" style="margin-bottom:12px"><span class="card-eyebrow">Send '+shipId+' \\u2014 '+sh.kg+' kg</span><button class="btn" id="ssClose" style="margin-left:auto;padding:8px 13px;font-size:12px">\\u2715</button></div>'+
    '<div class="send-opt" id="ssKach"><div class="ic" style="background:linear-gradient(135deg,#f472b633,#9d2463)">\\uD83E\\uDDF3</div><div><b>KACHCHA \\u2014 carrier ke saath</b><small>bags carrier flight se jayenge</small></div></div>'+
    '<div class="send-opt" id="ssPakka"><div class="ic" style="background:linear-gradient(135deg,#60a5fa33,#1e40af)">\\uD83C\\uDFE2</div><div><b>PAKKA \\u2014 company cargo</b><small>Singh / Awadh \\u00B7 air ya sea \\u00B7 agent handover</small></div></div>'+
    '<div class="sstep" id="ssStepK"><div style="font-size:10px;letter-spacing:1.5px;color:var(--muted);font-weight:800;margin:12px 0 8px">OPEN TRIPS \\u2014 choose one</div>'+(t1||'<div style="color:var(--muted);font-size:12.5px;padding:8px 2px">Koi open trip nahi \\u2014 pehle Movement mein trip plan karo</div>')+
    (t1?'':'<button class="btn primary" id="ssGoMove" style="width:100%;margin-top:6px">+ Plan trip in Movement</button>')+'</div>'+
    '<div class="sstep" id="ssStepP">'+
    '<div style="font-size:10px;letter-spacing:1.5px;color:var(--muted);font-weight:800;margin:12px 0 8px">COMPANY</div><div class="co-wrap" style="margin:0 0 10px"><button class="co-btn sel" data-ssco="singh">Singh Exports</button><button class="co-btn" data-ssco="awadh">Awadh Enterprise</button></div>'+
    '<div style="font-size:10px;letter-spacing:1.5px;color:var(--muted);font-weight:800;margin:8px 0 8px">MODE</div><div class="co-wrap" style="margin:0 0 10px"><button class="co-btn sel" data-sskind="aircargo">\\uD83D\\uDEEB Air Cargo</button><button class="co-btn" data-sskind="seacargo">\\uD83D\\uDEA2 Sea Cargo</button></div>'+
    '<div class="fgrid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px">'+
    '<div class="field" style="margin:0"><label>Agent (handover)</label><select id="ssAgent">'+agents.map(a=>'<option>'+esc(a.n)+'</option>').join('')+'</select></div>'+
    '<div class="field" style="margin:0"><label>AWB / Container / Flight</label><input id="ssAwb" placeholder="098-4471 8890 ya TG-315"></div></div>'+
    '<button class="btn primary" id="ssGo" style="width:100%;margin-top:13px;padding:13px">Handover karo \\u2713</button></div>';
  $('#sendSheet').classList.add('open');hap('nav');
  dressAll($('#ssInner'));
  $('#ssClose').addEventListener('click',()=>{$('#sendSheet').classList.remove('open');hap('tick')});
  $('#ssKach').addEventListener('click',()=>{SS.mode='k';$('#ssKach').classList.add('sel');$('#ssPakka').classList.remove('sel');$('#ssStepK').classList.add('on');$('#ssStepP').classList.remove('on');hap('tick')});
  $('#ssPakka').addEventListener('click',()=>{SS.mode='p';$('#ssPakka').classList.add('sel');$('#ssKach').classList.remove('sel');$('#ssStepP').classList.add('on');$('#ssStepK').classList.remove('on');hap('tick')});
  $$('#ssInner .tripopt').forEach(el=>el.addEventListener('click',()=>{doSendKachcha(shipId,el.dataset.trip)}));
  const gm=$('#ssGoMove');if(gm)gm.addEventListener('click',()=>{$('#sendSheet').classList.remove('open');go('trips');$('#tripForm').classList.add('show')});
  $$('#ssInner [data-ssco]').forEach(b=>b.addEventListener('click',()=>{SS.co=b.dataset.ssco;$$('#ssInner [data-ssco]').forEach(x=>x.classList.toggle('sel',x===b));hap('tick')}));
  $$('#ssInner [data-sskind]').forEach(b=>b.addEventListener('click',()=>{SS.kind=b.dataset.sskind;$$('#ssInner [data-sskind]').forEach(x=>x.classList.toggle('sel',x===b));hap('tick')}));
  $('#ssGo').addEventListener('click',()=>{doSendPakka(shipId)});
}
function doSendKachcha(shipId,tripId){
  const sh=DB.ships.find(s=>s.id===shipId),m=DB.moves.find(x=>x.id===tripId);
  if(!sh||!m)return;
  sh.book='k';sh.co='';sh.who=m.who;sh.st='LOADED';sh.stl='p-done';
  m.out.shp=shipId;m.out.kg=(m.out.kg||0)+sh.kg;m.out.bags=(m.out.bags||[]).concat(sh.bags);
  DB.bags.filter(b=>b.shp===shipId).forEach(b=>b.who=m.who);
  saveDB();$('#sendSheet').classList.remove('open');$('#dtlOverlay').classList.remove('open');
  renderShips();renderMoves();renderDash();hap('save');
  toast(shipId+' \\u2192 '+m.who+' ('+m.d+') \\u00B7 trip par ab '+m.out.kg+' kg');
}
function doSendPakka(shipId){
  const sh=DB.ships.find(s=>s.id===shipId);if(!sh)return;
  const awb=($('#ssAwb').value||'').trim();
  sh.book='p';sh.co=SS.co;sh.kind=SS.kind;sh.agent=$('#ssAgent').value;sh.awb=awb;sh.who='';
  sh.st='HANDED OVER';sh.stl='p-live';
  DB.moves.unshift({id:'MV-'+(DB.seq.mv++),kind:SS.kind,book:'p',co:SS.co,who:sh.agent,awb:awb,fl:(SS.kind==='aircargo'?awb:''),ds:todayISO(),d:todayShort(),prog:6,st:'HANDED OVER',stl:'p-wait',out:{kg:sh.kg,desc:sh.kg+' kg \\u00B7 '+sh.id+' \\u2014 '+coName(SS.co)},need:0,eta:'agent ke paas'});
  saveDB();$('#sendSheet').classList.remove('open');$('#dtlOverlay').classList.remove('open');
  renderShips();renderMoves();renderDash();hap('save');
  toast(shipId+' \\u2192 '+coName(SS.co)+' \\u00B7 '+(SS.kind==='aircargo'?'Air':'Sea')+' cargo \\u00B7 '+sh.agent+' ko handover \\u2713');
}

/* ---------- INVOICES override: co tags + tap-to-open + filter ---------- */
function renderInvoices(){
  const list=DB.invoices.filter(coPass).slice(0,30);
  $('#invRows').innerHTML=list.map(inv=>
    '<tr class="inv-open" data-inv="'+inv.id+'"><td class="mono">'+inv.id+'</td><td>'+esc(inv.party)+'</td>'+
    '<td>'+coTag(inv)+'</td>'+
    '<td style="font-size:11px;color:var(--muted)">'+inv.lines.map(l=>esc(l.item.split(' (')[0])+' \\u00D7'+l.qty).join(', ').slice(0,42)+'</td>'+
    '<td class="mono" style="text-align:right">'+fINR(inv.total)+'</td>'+
    '<td><span class="pill '+inv.stl+'">'+inv.st+'</span></td>'+
    '<td>'+(inv.shp?'<span class="trk">'+inv.shp+'</span>':'<button class="btn" style="padding:7px 11px;font-size:11px" data-ship="'+inv.id+'">Ship \\u2192</button>')+'</td></tr>').join('');
  $$('#invRows [data-ship]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();shipFromInvoice(b.dataset.ship);hap('nav')}));
  $$('#invRows .inv-open').forEach(r=>r.addEventListener('click',()=>{openInvoice(r.dataset.inv);hap('nav')}));
}
/* ---------- SHIPS override: co tags + tap-open + Send flow ---------- */
function renderShips(){
  $('#shBagCount').textContent=DB.bags.filter(b=>{const sh=DB.ships.find(x=>x.id===b.shp);return sh&&(sh.st==='READY'||sh.st==='PACKING')}).length;
  const list=DB.ships.filter(s=>bookKeyOf()==='k'?s.book!=='p':(s.book==='p'&&(BOOK.co==='both'||s.co===BOOK.co)||s.st==='READY'||s.st==='PACKING')).slice(0,14);
  $('#shipList').innerHTML=list.map(sh=>{
    const bags=DB.bags.filter(b=>b.shp===sh.id);
    const groups={};bags.forEach(b=>{const k=b.direct?'\\u2726 DIRECT \\u2014 my customers':(b.parent||'Other');(groups[k]=groups[k]||[]).push(b)});
    let gh='';let gi=0;
    Object.keys(groups).forEach(gk=>{const gb=groups[gk];gi++;
      gh+='<div class="pgroup"><div class="gh"><span class="car">\\u203A</span><div class="pa">'+paIcon(gk.replace('\\u2726 ',''),gi)+'</div><b>'+esc(gk)+'</b><small>'+gb.length+' bags \\u00B7 '+gb.reduce((a,b)=>a+b.kg,0)+' kg</small></div><div class="gb">'+
      gb.map(b=>'<div class="bagline"><span class="bid">'+b.id+'</span><div><div class="to">\\u2192 '+esc(b.end)+(b.direct?' <span class="dir-tag">DIRECT</span>':'')+'</div><div class="its">'+b.items.map(i2=>esc(i2.n.split(' (')[0])+' \\u00D7'+i2.qty).join(' \\u00B7 ')+'</div></div><span class="kg">'+b.kg+' kg</span></div>').join('')+
      '</div></div>'});
    return '<div class="shrow"><div class="top sh-open" data-sh="'+sh.id+'" style="cursor:pointer"><b>'+sh.id+'</b> '+coTag(sh)+'<span class="pill '+sh.stl+'">'+sh.st+'</span>'+
      (sh.who?'<span class="trk">\\u2708 '+esc(sh.who)+'</span>':'')+(sh.awb?flightChip(sh.awb):'')+
      '<span style="margin-left:auto;font-family:var(--font-m);font-weight:800">'+sh.kg+' kg</span></div>'+
      '<div class="meta">'+esc(sh.d)+' \\u00B7 '+esc(sh.dest)+' \\u00B7 '+bags.length+' bags'+(sh.agent?' \\u00B7 '+esc(sh.agent):'')+(sh.inv?' \\u00B7 invoice: '+sh.inv:'')+'</div>'+gh+
      '<div class="btns">'+
      (sh.st==='PACKING'?'<button class="btn primary" data-pack="'+sh.id+'">\\uD83D\\uDCE6 Continue packing</button>':'')+
      (sh.st==='READY'?'<button class="btn primary" data-send="'+sh.id+'">\\uD83D\\uDE80 Send \\u2192</button>':'')+
      '<button class="btn" data-plist="'+sh.id+'">\\uD83D\\uDCC4 Packing List</button>'+
      '<button class="btn" data-chk="'+sh.id+'">\\u2611 Checklist</button>'+
      '</div></div>'}).join('');
  $$('#shipList .gh').forEach(g=>g.addEventListener('click',e=>{e.stopPropagation();g.parentElement.classList.toggle('open');hap('tick')}));
  $$('#shipList .sh-open').forEach(el=>el.addEventListener('click',()=>{openShipment(el.dataset.sh);hap('nav')}));
  $$('#shipList [data-pack]').forEach(b=>b.addEventListener('click',()=>{const sh=DB.ships.find(s=>s.id===b.dataset.pack);openPackBoard(b.dataset.pack,sh&&sh.inv||null)}));
  $$('#shipList [data-send]').forEach(b=>b.addEventListener('click',()=>{openSendSheet(b.dataset.send)}));
  $$('#shipList [data-plist]').forEach(b=>b.addEventListener('click',()=>{buildPackingList(b.dataset.plist);hap('nav')}));
  $$('#shipList [data-chk]').forEach(b=>b.addEventListener('click',()=>{buildChecklist(b.dataset.chk);hap('nav')}));
}
/* ---------- NEW SHIP COMPOSER (single smart form + live receivable) ---------- */
let SC2={rows:[]};
function scAddRow(){SC2.rows.push({owner:'',kg:'',item:DB.catalog[0].n,qty:''});renderSC()}
function renderSC(){
  const host=$('#scRows');if(!host)return;
  host.innerHTML=SC2.rows.map((r,i)=>'<div class="bagrow">'+
    '<select data-scown="'+i+'">'+ownerSelect(r.owner)+'</select>'+
    '<input data-sckg="'+i+'" type="number" inputmode="decimal" placeholder="kg" value="'+(r.kg||'')+'">'+
    '<div style="display:flex;gap:7px"><select data-scit="'+i+'" style="flex:1;background:rgba(255,255,255,.05);border:1px solid var(--line);border-radius:11px;padding:10px;color:var(--ink);font-family:var(--font-m);font-size:12px;appearance:none">'+itemOpts(r.item)+'</select>'+
    '<input data-scq="'+i+'" type="number" inputmode="numeric" placeholder="qty" value="'+(r.qty||'')+'" style="width:74px"></div>'+
    '<button class="rm" data-scrm="'+i+'">\\u00D7</button></div>').join('');
  $$('#scRows [data-scown]').forEach(el=>el.addEventListener('change',()=>{SC2.rows[+el.dataset.scown].owner=el.value;calcSC()}));
  $$('#scRows [data-sckg]').forEach(el=>el.addEventListener('input',()=>{SC2.rows[+el.dataset.sckg].kg=el.value;calcSC()}));
  $$('#scRows [data-scit]').forEach(el=>el.addEventListener('change',()=>{SC2.rows[+el.dataset.scit].item=el.value}));
  $$('#scRows [data-scq]').forEach(el=>el.addEventListener('input',()=>{SC2.rows[+el.dataset.scq].qty=el.value}));
  $$('#scRows [data-scrm]').forEach(el=>el.addEventListener('click',()=>{SC2.rows.splice(+el.dataset.scrm,1);renderSC();hap('tick')}));
  dressAll(host);calcSC();
}
function calcSC(){
  const per={};let tkg=0;
  SC2.rows.forEach(r=>{const kg=+(r.kg)||0;if(!kg)return;tkg+=kg;
    const owner=(r.owner||'').split('|')[0]||(r.owner||'').split('|')[1]||'';
    const payer=owner||'\\u2014';
    const par=partyByName((r.owner||'').split('|')[0])||partyByName((r.owner||'').split('|')[1]);
    const ri=(par&&(par.last&&par.last.fr&&par.last.fr.v||par.ri))||210;
    const rt=(par&&par.rt)||92;
    per[payer]=per[payer]||{kg:0,inr:0,thb:0};
    per[payer].kg+=kg;per[payer].inr+=kg*ri;per[payer].thb+=kg*rt;
  });
  const el=$('#scRecv');if(!el)return;
  const keys=Object.keys(per);
  el.innerHTML='<div style="font-size:10px;letter-spacing:1.5px;font-weight:800;color:var(--green)">FREIGHT \\u2014 you will receive (live)</div>'+
    (keys.length?keys.map(k=>'<div class="r"><span>'+esc(k)+' \\u00B7 '+per[k].kg+' kg</span><b>'+fINR(per[k].inr)+' <span style="color:var(--muted);font-weight:600">/ '+fTHB(per[k].thb)+'</span></b></div>').join('')+
    '<div class="r tt"><span>Total \\u00B7 '+tkg+' kg</span><b style="color:var(--green)">'+fINR(keys.reduce((a,k)=>a+per[k].inr,0))+'</b></div>':'<div class="r"><span style="color:var(--muted)">Bags jodo \\u2014 hisaab yahin banta jayega</span></div>');
}
/* ---------- MOVEMENT override: notice board + planes + detailed cards ---------- */
function planeSVG(code){
  const lv=LIVERY[code]||['#8b5cf6','#22d3ee'];
  const uri=logoURI(LOGOS[code]?code:'IATA');
  return '<svg class="tripPlane" viewBox="0 0 48 48">'+
   '<g transform="rotate(45 24 24)">'+
   '<path d="M24 4 C26 4 27 6 27 9 L27 18 L44 27 L44 31 L27 25 L27 36 L32 40 L32 43 L24 40.5 L16 43 L16 40 L21 36 L21 25 L4 31 L4 27 L21 18 L21 9 C21 6 22 4 24 4 Z" fill="#e8eaf2" stroke="'+lv[0]+'" stroke-width="1.1"/>'+
   '<path d="M24 4 C26 4 27 6 27 9 L27 13 L21 13 L21 9 C21 6 22 4 24 4 Z" fill="'+lv[0]+'"/>'+
   '<rect x="20.6" y="35" width="6.8" height="6.5" rx="2" fill="'+lv[0]+'"/>'+
   '<image href="'+uri+'" x="20.8" y="35.4" width="6.4" height="5.6" preserveAspectRatio="xMidYMid meet"/>'+
   '</g></svg>';
}
function kindTag(k){return {carrier:'\\u2708 Carrier',courier:'\\uD83D\\uDCE8 Courier',aircargo:'\\uD83D\\uDEEB Air Cargo',seacargo:'\\uD83D\\uDEA2 Sea Cargo'}[k]||k}
function renderBoard(){
  const host=$('#custStrip');if(!host)return;
  const rows=DB.board.map(n=>'<div class="nbrow"><span class="em">'+(n.kind==='SAMAAN'?'\\uD83D\\uDFE1':'\\uD83D\\uDCB5')+'</span>'+
    '<div class="tx"><b>'+(n.kind==='SAMAAN'?n.qty+' gm SAMAAN':'$'+n.qty.toLocaleString('en-IN')+' SOMANY')+'</b> \\u00B7 <b style="color:#f0c46c">'+esc(n.holder)+'</b> '+esc(n.dir)+' \\u00B7 '+esc(n.d)+
    '<small>'+esc(n.note)+'</small></div>'+
    (n.st==='with'?'<span class="st-with">USKE PAAS</span><button class="bt-got" data-nb="'+n.id+'">Mil gaya \\u2713</button>'
      :'<span class="st-got">\\u2713 MIL GAYA \\u00B7 '+esc(n.gotd||'')+'</span><button class="bt-undo" data-nbu="'+n.id+'">undo</button>')+
    '</div>').join('');
  host.innerHTML='<div class="nb" style="width:100%"><div class="nb-h">\\uD83D\\uDCCC NOTICE BOARD \\u2014 SAMAAN / SOMANY custody</div>'+rows+'</div>';
  $$('[data-nb]').forEach(b=>b.addEventListener('click',()=>{
    const n=DB.board.find(x=>x.id===b.dataset.nb);if(!n)return;
    n.st='got';n.gotd=todayShort();
    if(n.dir==='laya'){
      if(n.kind==='SAMAAN')DB.lots.unshift({id:'G'+(DB.lots.length+1),d:todayShort(),who:n.holder,gm:n.qty,buy:Math.round(GOLD_IN*0.965),at:'Delhi WH1'});
      else DB.usdLots.unshift({id:'U'+(DB.usdLots.length+1),d:todayShort(),who:n.holder+' laya',amt:n.qty,buy:USD_INR-1.1,at:'Delhi WH1'});
    }
    saveDB();renderBoard();renderWarehouse();renderDash();hap('save');
    toast('\\u2713 Board update \\u2014 history bani rahegi');
  }));
  $$('[data-nbu]').forEach(b=>b.addEventListener('click',()=>{
    const n=DB.board.find(x=>x.id===b.dataset.nbu);if(!n)return;
    n.st='with';delete n.gotd;saveDB();renderBoard();hap('tick');toast('Undo \\u2014 wapas custody mein');
  }));
  const el2=$('#lgCustody');if(el2)el2.innerHTML=DB.board.filter(n=>n.st==='with').map(n=>'<div class="lgrow"><span class="d">'+esc(n.d)+'</span><span>'+(n.kind==='SAMAAN'?n.qty+' gm SAMAAN':'$'+n.qty.toLocaleString('en-IN'))+' \\u00B7 '+esc(n.holder)+' ke paas</span></div>').join('')||'<div style="color:var(--muted);font-size:12px;padding:8px">Sab kuch warehouse mein \\u2713</div>';
}
function renderMoves(){
  const bk=bookKeyOf();
  let list=DB.moves.filter(m=>bk==='k'?m.kind==='carrier':(m.kind!=='carrier'&&(BOOK.co==='both'||m.co===BOOK.co)));
  list=list.filter(m=>{
    const inbound=(m.st&&m.st.indexOf('WAPSI')>-1)||(m.back&&(m.back.gold>0||m.back.kg>0)&&m.prog>=100);
    return mvDir==='in'?inbound:!inbound});
  $('#mvList').innerHTML=list.map(m=>{
    const code=airlineOf(m.fl||m.awb);
    let h='<div class="mvcard"><div class="top" style="display:flex;align-items:center;gap:11px;flex-wrap:wrap">'+
      (m.kind==='carrier'||m.kind==='aircargo'?planeSVG(code||'IATA'):'<div class="tripPlane" style="display:grid;place-items:center;font-size:26px">'+(m.kind==='seacargo'?'\\uD83D\\uDEA2':'\\uD83D\\uDCE8')+'</div>')+
      '<div><b style="font-family:var(--font-m)">'+kindTag(m.kind)+' \\u00B7 '+esc(m.who)+'</b>'+(m.book==='p'?' '+coTag(m):'')+
      '<div style="font-size:11px;color:var(--muted);margin-top:2px">'+esc(m.d)+' \\u00B7 '+esc(m.eta||'')+'</div></div>'+
      '<span class="pill '+m.stl+'" style="margin-left:auto">'+esc(m.st)+'</span>'+
      (m.fl?flightChip(m.fl):'')+(m.awb&&!m.fl?'<span class="trk">'+esc(m.awb)+'</span>':'')+'</div>';
    if(m.prog>0&&m.prog<100)h+='<div class="meter" style="margin-top:10px"><i style="width:'+m.prog+'%"></i></div>';
    if(m.kind==='carrier'){
      h+='<div class="mv-duo"><div class="mv-box out"><div class="h">GOING \\u2192 BKK</div><div>'+
        '<b>'+((m.out.bags&&m.out.bags.length)||0)+'</b> bags \\u00B7 <b>'+m.out.kg+'</b> kg'+(m.out.shp?' \\u00B7 '+m.out.shp:'')+'<br>SOMANY carry: <b>$'+(m.out.usd||0).toLocaleString('en-IN')+'</b>'+(m.need?'<br><span style="color:var(--muted)">need '+m.need+' kg'+(m.out.kg<m.need?' \\u00B7 <b style="color:#f0c46c">'+(m.need-m.out.kg)+' kg space left</b>':' \\u00B7 full')+'</span>':'')+'</div></div>'+
        '<div class="mv-box inn"><div class="h">\\u2190 BRINGING BACK</div><div>SAMAAN: <b>'+(m.back.gold||0)+' gm</b><br>Thai goods: <b>'+(m.back.kg||0)+' kg</b>'+((m.back.gold||m.back.kg)?'':'<br><span style="color:var(--muted)">Bangkok se tay hoga</span>')+'</div></div></div>';
    }else{
      h+='<div class="mv-box out" style="margin-top:10px"><div class="h">CONSIGNMENT'+(m.agent?' \\u00B7 '+esc(m.agent):'')+'</div><div><b>'+(m.out.kg||0)+' kg</b> \\u00B7 '+esc(m.out.desc||'')+'</div></div>';
    }
    h+='</div>';return h}).join('')||'<div style="color:var(--muted);font-size:13px;padding:16px">Nothing here'+(bk==='p'?' \\u2014 courier/cargo pakka book mein dikhte hain':'')+'</div>';
  renderBoard();
}

/* ---------- WAREHOUSE override: pipeline + tabs + SAMAAN/SOMANY ---------- */
let whTab='items';
function usdTotal(){return DB.usdLots?DB.usdLots.reduce((a,u)=>a+u.amt,0):0}
function usdAvg(){const t=usdTotal();return t?DB.usdLots.reduce((a,u)=>a+u.amt*u.buy,0)/t:0}
function bagsAt(loc){
  /* pipeline logic: READY/PACKING = Delhi; LOADED = Kolkata halt; IN TRANSIT = air; DELIVERED = BKK */
  return DB.ships.filter(s=>({READY:'DEL',PACKING:'DEL',LOADED:'KOL','HANDED OVER':'KOL','IN TRANSIT':'AIR',DELIVERED:'BKK'}[s.st]===loc))
    .reduce((a,s)=>a+(s.bags?s.bags.length:0),0);
}
function kgAt(loc){
  return DB.ships.filter(s=>({READY:'DEL',PACKING:'DEL',LOADED:'KOL','HANDED OVER':'KOL','IN TRANSIT':'AIR',DELIVERED:'BKK'}[s.st]===loc)).reduce((a,s)=>a+s.kg,0);
}
function renderWarehouse(){
  const g=goldTotals();const avg=g.gm?Math.round(g.cost/g.gm):0;
  const uT=usdTotal(),uA=usdAvg(),uPL=(USD_INR-uA)*uT;
  $('#whSub').innerHTML=DB.wh.length+' locations \\u00B7 '+DB.catalog.reduce((a,c)=>a+c.qty,0).toLocaleString('en-IN')+' pcs \\u00B7 SAMAAN <b style="color:#f0c46c">'+g.gm+' gm</b> \\u00B7 SOMANY <b style="color:#34d399">$'+uT.toLocaleString('en-IN')+'</b>';
  /* pipeline */
  const recKg=DB.parcels.filter(p=>p.st==='received').reduce((a,p)=>a+p.kg,0);
  const clubKg=DB.parcels.filter(p=>p.st==='clubbed').reduce((a,p)=>a+p.kg,0);
  const pp=$('#whPipe');
  if(pp)pp.innerHTML=
    '<div class="pnode" data-pn="DEL"><b>\\uD83C\\uDFEC Delhi</b><small>shop + 3 WH \\u00B7 Jaipur</small><div class="cnt"><span><b>'+bagsAt('DEL')+'</b> bags ready</span><span><b>'+kgAt('DEL')+'</b> kg</span></div></div>'+
    '<div class="plink">\\u2192</div>'+
    '<div class="pnode" data-pn="KOL"><b>\\uD83D\\uDE9B Kolkata halt</b><small>road \\u2194 flight point</small><div class="cnt"><span><b>'+bagsAt('KOL')+'</b> bags</span><span><b>'+kgAt('KOL')+'</b> kg</span></div></div>'+
    '<div class="plink">\\u2708</div>'+
    '<div class="pnode" data-pn="AIR"><b>\\u2708 In the air</b><small>carrier + cargo live</small><div class="cnt"><span><b>'+bagsAt('AIR')+'</b> bags</span><span><b>'+kgAt('AIR')+'</b> kg</span></div></div>'+
    '<div class="plink">\\u2192</div>'+
    '<div class="pnode" data-pn="BKK"><b>\\uD83C\\uDF06 Bangkok</b><small>store \\u00B7 import pool</small><div class="cnt"><span><b>'+DB.parcels.filter(p=>p.st==='received').length+'</b> parcels</span><span><b>'+recKg+'</b> kg jama</span></div></div>'+
    '<div class="plink">\\u21A9</div>'+
    '<div class="pnode" data-pn="BACK"><b>\\uD83D\\uDFE1 Wapsi lane</b><small>SAMAAN \\u00B7 Thai goods \\u00B7 clubbed</small><div class="cnt"><span><b>'+DB.moves.filter(m=>m.kind==='carrier'&&m.back&&m.back.gold>0&&m.prog<100).length+'</b> trips</span><span><b>'+clubKg+'</b> kg clubbed</span></div></div>';
  if(pp)$$('#whPipe .pnode').forEach(n=>n.addEventListener('click',()=>{
    const t={DEL:'shipments',KOL:'shipments',AIR:'trips',BKK:'warehouse',BACK:'trips'}[n.dataset.pn];
    if(n.dataset.pn==='BKK'){document.querySelector('#parcelCard').scrollIntoView({behavior:'smooth'})}else{go(t)}
    hap('tick')}));
  /* wh cards */
  $('#whGrid').innerHTML=DB.wh.map(w=>{
    const its=DB.catalog.filter(c=>c.loc.indexOf(w.id)===0);
    const gml=DB.lots.filter(l=>l.at.indexOf(w.city.split(',')[0])>-1||l.at.indexOf(w.id)>-1).reduce((a,l)=>a+l.gm,0);
    const usd=DB.usdLots.filter(u=>u.at.indexOf(w.n)>-1||u.at.indexOf(w.city.split(',')[0])>-1||u.at.indexOf(w.id)>-1).reduce((a,u)=>a+u.amt,0);
    return '<div class="whc'+(w.id===whSel?' sel':'')+'" data-wh="'+w.id+'"><b>'+esc(w.n)+'</b><small>'+esc(w.city)+'</small>'+
    '<div class="meter"><i style="width:'+w.fill+'%"></i></div>'+
    '<div class="st"><span><b>'+its.length+'</b>items</span><span><b>'+w.fill+'%</b>full</span>'+
    (gml?'<span><b style="color:#f0c46c">'+gml+'g</b>SAMAAN</span>':'')+(usd?'<span><b style="color:#34d399">$'+(usd/1000).toFixed(1)+'k</b>SOMANY</span>':'')+'</div></div>'}).join('');
  $$('#whGrid .whc').forEach(c=>c.addEventListener('click',()=>{whSel=c.dataset.wh;renderWarehouse();hap('tick')}));
  /* tabs */
  const w=DB.wh.find(x=>x.id===whSel);
  $$('#whTabs .mv-tab').forEach(t=>t.classList.toggle('sel',t.dataset.wt===whTab));
  const body=$('#whBody');
  if(whTab==='items'){
    const its=DB.catalog.filter(c=>c.loc.indexOf(whSel)===0);
    const racks={};its.forEach(c=>{const pr=c.loc.split(' \\u00B7 ');const key=(pr[1]||'S?')+' \\u00B7 '+(pr[2]||'R?');(racks[key]=racks[key]||[]).push(c)});
    body.innerHTML='<div class="card"><div class="card-head"><span class="card-eyebrow">Items \\u2014 '+esc(w.n)+' (rack-wise)</span></div>'+
      (Object.keys(racks).sort().map(rk=>'<div style="font-size:10px;letter-spacing:1.5px;font-weight:800;color:var(--acc1);margin:12px 4px 4px">RACK '+esc(rk)+'</div>'+
        racks[rk].map(c=>'<div class="lgrow"><span style="font-size:16px">'+c.emoji+'</span><span>'+esc(c.n)+' <span class="bk '+(c.book==='k'?'on-k':'on-p')+'" style="margin-left:5px">'+c.book.toUpperCase()+'</span></span><span class="amt">'+c.qty.toLocaleString('en-IN')+' pcs</span></div>').join('')).join('')||'<div style="color:var(--muted);font-size:12.5px;padding:12px">Yahan abhi khaali</div>')+'</div>';
  }else if(whTab==='bags'){
    const locMap={WH1:'DEL',WH2:'DEL',WH3:'DEL',JAI:'DEL',KOL:'KOL',BKK:'BKK'};
    const stWant=locMap[whSel]||'DEL';
    const shs=DB.ships.filter(s=>({READY:'DEL',PACKING:'DEL',LOADED:'KOL','HANDED OVER':'KOL','IN TRANSIT':'AIR',DELIVERED:'BKK'}[s.st]===stWant));
    body.innerHTML='<div class="card"><div class="card-head"><span class="card-eyebrow">Packed bags \\u2014 is location par</span></div>'+
      (shs.map(sh=>DB.bags.filter(b=>b.shp===sh.id).map(b=>'<div class="bagline"><span class="bid">'+b.id+'</span><div><div class="to">'+sh.id+' \\u00B7 \\u2192 '+esc(b.end)+'</div><div class="its">'+esc(sh.st)+' \\u00B7 '+b.items.map(x=>esc(x.n.split(' (')[0])+' \\u00D7'+x.qty).join(' \\u00B7 ')+'</div></div><span class="kg">'+b.kg+' kg</span></div>').join('')).join('')||'<div style="color:var(--muted);font-size:12.5px;padding:12px">Is jagah koi packed bag nahi</div>')+'</div>';
  }else{
    const lotsHere=DB.lots.filter(l=>true);const usdHere=DB.usdLots;
    body.innerHTML='<div class="bento"><div class="card b6" style="margin:0"><div class="card-head"><span class="card-eyebrow">SAMAAN \\u2014 gold 999.9</span><span class="tre-pl '+(g.pl>=0?'up':'down')+'" style="margin-left:auto">'+(g.pl>=0?'+':'')+fINR(g.pl)+' ('+g.plp.toFixed(1)+'%)</span></div>'+
      '<div class="tre-top" style="margin-bottom:6px"><div><div class="tre-big">'+g.gm.toLocaleString('en-IN')+' gm</div><div style="font-size:11px;color:var(--muted)">avg buy \\u20B9'+avg.toLocaleString('en-IN')+'/gm \\u00B7 today \\u20B9'+GOLD_IN.toLocaleString('en-IN')+'</div></div>'+
      '<div style="margin-left:auto;text-align:right"><div class="tre-big" style="color:var(--green)">'+fINR(g.val)+'</div></div></div>'+
      '<svg id="whWorm" style="width:100%;height:110px"></svg><div id="whLots"></div></div>'+
      '<div class="card b6" style="margin:0"><div class="card-head"><span class="card-eyebrow">SOMANY \\u2014 currency</span><span class="tre-pl '+(uPL>=0?'up':'down')+'" style="margin-left:auto">'+(uPL>=0?'+':'')+fINR(uPL)+'</span></div>'+
      '<div class="tre-top" style="margin-bottom:6px"><div><div class="tre-big">$'+uT.toLocaleString('en-IN')+'</div><div style="font-size:11px;color:var(--muted)">avg buy \\u20B9'+uA.toFixed(2)+' \\u00B7 today \\u20B9'+USD_INR+'</div></div>'+
      '<div style="margin-left:auto;text-align:right"><div class="tre-big" style="color:var(--green)">'+fINR(uT*USD_INR)+'</div></div></div>'+
      '<svg id="usdWorm" style="width:100%;height:110px"></svg><div id="usdLotsEl"></div></div></div>';
    wormChart($('#whWorm'),avg);
    usdWorm($('#usdWorm'),uA);
    $('#whLots').innerHTML=DB.lots.map(l=>{const v=(GOLD_IN-l.buy)*l.gm;
      return '<div class="lot"><span class="dotc"></span><b>'+l.gm+' gm</b><span style="color:var(--muted);font-size:11px">'+esc(l.d)+' \\u00B7 '+esc(l.who)+' \\u00B7 @\\u20B9'+l.buy.toLocaleString('en-IN')+' \\u00B7 '+esc(l.at)+'</span><span class="pl" style="color:'+(v>=0?'var(--green)':'var(--red)')+'">'+(v>=0?'+':'')+fINR(v)+'</span></div>'}).join('');
    $('#usdLotsEl').innerHTML=DB.usdLots.map(u=>{const v=(USD_INR-u.buy)*u.amt;
      return '<div class="lot"><span class="dotc" style="background:linear-gradient(135deg,#6ee7b7,#059669);box-shadow:0 0 8px rgba(52,211,153,.6)"></span><b>$'+u.amt.toLocaleString('en-IN')+'</b><span style="color:var(--muted);font-size:11px">'+esc(u.d)+' \\u00B7 '+esc(u.who)+' \\u00B7 @\\u20B9'+u.buy+' \\u00B7 '+esc(u.at)+'</span><span class="pl" style="color:'+(v>=0?'var(--green)':'var(--red)')+'">'+(v>=0?'+':'')+fINR(v)+'</span></div>'}).join('');
  }
  /* parcels */
  const stMap={ordered:['p-wait','INCOMING'],received:['p-live','AT BKK STORE'],clubbed:['p-done','CLUBBED \\u2192 CARRIER']};
  $('#bkkKg').textContent=recKg+' kg jama';
  $('#parcelList').innerHTML=DB.parcels.slice(0,12).map(p=>{const st2=stMap[p.st]||['p-done',p.st];
    return '<div class="bagline"><span class="bid">'+p.id+'</span><div><div>'+esc(p.platform)+' '+esc(p.order)+' \\u00B7 <b>'+esc(p.item)+'</b></div><div class="its">'+esc(p.d)+' \\u00B7 Sharma Textiles \\u00B7 import pending</div></div><span class="pill '+st2[0]+'" style="margin-left:auto">'+st2[1]+'</span><span class="kg">'+p.kg+' kg</span></div>'}).join('')+
    (recKg>=100?'<button class="btn primary" id="clubBtn" style="margin-top:10px">\\uD83D\\uDCE6 '+recKg+' kg ho gaya \\u2014 club & handover to carrier</button>':'<div style="font-size:11px;color:var(--muted);margin-top:8px">100 kg par OPSI khud bolega \\u2014 club karke wapsi trip se Kolkata \\u2192 Delhi</div>');
  const cb=$('#clubBtn');if(cb)cb.addEventListener('click',()=>{DB.parcels.forEach(p=>{if(p.st==='received')p.st='clubbed'});saveDB();renderWarehouse();hap('magic');toast('Clubbed \\u2713 \\u2014 wapsi trip ke saath Kolkata hote hue Delhi')});
}
function usdWorm(el,buyAvg){if(!el)return;
  const W=el.clientWidth||320,H=el.clientHeight||110,pad=6;
  const seq=[85.6,86.1,85.9,86.6,87.2,87.0,87.6,88.0,87.8,88.1,88.0,USD_INR];
  const min=Math.min.apply(null,seq.concat([buyAvg]))-0.4,max=Math.max.apply(null,seq.concat([buyAvg]))+0.4;
  const X=i=>pad+i/(seq.length-1)*(W-pad*2),Y=v=>H-8-((v-min)/(max-min))*(H-16);
  let d='M '+X(0)+' '+Y(seq[0]);
  for(let i=1;i<seq.length;i++){const mx=(X(i-1)+X(i))/2;d+=' C '+mx+' '+Y(seq[i-1])+', '+mx+' '+Y(seq[i])+', '+X(i)+' '+Y(seq[i])}
  const by=Y(buyAvg);
  el.setAttribute('viewBox','0 0 '+W+' '+H);
  el.innerHTML='<path d="'+d+' L '+X(seq.length-1)+' '+by+' L '+X(0)+' '+by+' Z" fill="#34d399" opacity=".09"/>'+
    '<line x1="'+pad+'" y1="'+by+'" x2="'+(W-pad)+'" y2="'+by+'" stroke="#34d399" stroke-width="1" stroke-dasharray="4 4" opacity=".7"/>'+
    '<path d="'+d+'" fill="none" stroke="#34d399" stroke-width="2.4" stroke-linecap="round" style="filter:drop-shadow(0 0 7px rgba(52,211,153,.55))"/>'+
    '<circle cx="'+X(seq.length-1)+'" cy="'+Y(seq[seq.length-1])+'" r="3.4" fill="#34d399"/>';
}
/* ---------- RATE ENGINE (quote + ledger integration) ---------- */
function renderRateEngine(){
  const el=$('#reWrap');if(!el)return;
  const s=suggRates();
  const amt=+($('#reAmt')&&$('#reAmt').value)||100000;
  const mEl=$('#reMargin');if(mEl&&!mEl.value)mEl.value=DB.rateCfg.marginPct;
  $('#reBuyRate').textContent='\\u20B9'+s.buy.toFixed(3);
  $('#reSellRate').textContent='\\u20B9'+s.sell.toFixed(3);
  $('#reBuySub').innerHTML='real value \\u20B9'+s.real.buyReal.toFixed(3)+'/\\u0E3F \\u00B7 you pay INR now';
  $('#reSellSub').innerHTML='real cost \\u20B9'+s.real.sellReal.toFixed(3)+'/\\u0E3F \\u00B7 you give THB in BKK';
  $('#reBuyPr').innerHTML='\\u0E3F'+amt.toLocaleString('en-IN')+' par profit <b style="color:#6ee7b7">+'+fINR((s.real.buyReal-s.buy)*amt)+'</b>';
  $('#reSellPr').innerHTML='\\u0E3F'+amt.toLocaleString('en-IN')+' par profit <b style="color:#fde68a">+'+fINR((s.sell-s.real.sellReal)*amt)+'</b>';
}
/* calcConv override — OPSI engine rate default + guard */
function calcConv(){
  const amt=+($('#lgAmt').value)||0;
  const par=partyByName($('#ledParty').value);
  const s=suggRates();
  const last=(par&&par.last&&par.last.tr)?par.last.tr.v:null;
  const cv=$('#cvRate');if(!cv)return{amt:0,rate:0,inr:0};
  if(!cv.value)cv.value=s.buy;
  const rate=+cv.value||s.buy;
  $('#cvLast').innerHTML='OPSI: <b style="color:#22d3ee">\\u20B9'+s.buy.toFixed(3)+'</b>'+(last?' \\u00B7 last: '+last:'');
  $('#cvThb').innerHTML=fTHB(amt);
  $('#cvInr').innerHTML=fINR(amt*rate);
  const marg=(s.real.buyReal-rate)*amt;
  $('#cvProf').innerHTML=(marg>=0?'+':'')+fINR(marg);
  $('#cvProf').style.color=marg>=0?'var(--green)':'var(--red)';
  $('#cvGuard').style.display=rate>s.real.buyReal?'':'none';
  return {amt:amt,rate:rate,inr:Math.round(amt*rate),real:s.real.buyReal};
}
/* ---------- PACKING BOARD v2: back button + filtered pool dropdown ---------- */
function renderPB(){
  const tot=pbTotal(),done=pbPlaced();
  const poolLeft=PB.pool.filter(p=>p.left>0);
  let h='<div class="pd-top" style="margin-bottom:8px"><button class="back" id="pbClose">\\u2190</button><div><h2 style="font-family:var(--font-d);font-size:19px">Packing Board</h2><div style="font-size:11.5px;color:var(--muted)">'+PB.ship+'</div></div></div>';
  if(tot>0)h+='<div class="pb-prog"><span>Filled: <b>'+done+'</b> / '+tot+'</span><div class="bar"><i style="width:'+(tot?done/tot*100:0)+'%"></i></div>'+
    '<button class="btn" id="pbAuto" style="padding:7px 11px;font-size:11px">\\u26A1 Auto-split</button></div>';
  h+='<div class="pb-cols"><div>';
  h+='<div style="font-size:10.5px;letter-spacing:1.4px;color:var(--muted);font-weight:800;margin-bottom:8px">POOL'+(tot?'':' \\u2014 empty (add directly in bags)')+'</div>';
  h+=PB.pool.map(p=>'<div class="pool-it'+(p.left===0?' done':'')+'"><b>'+esc(p.n)+'</b><span class="left">'+(p.left===0?'\\u2713 done':p.left+' left')+'</span></div>').join('');
  h+='</div><div><div style="font-size:10.5px;letter-spacing:1.4px;color:var(--muted);font-weight:800;margin-bottom:8px">BAGS ('+PB.bags.length+')</div>';
  PB.bags.forEach((b,bi)=>{
    h+='<div class="pbag"><div class="h"><b>Bag '+(bi+1)+'</b>'+(b.owner&&b.owner[0]==='|'?'<span class="dir-tag">DIRECT</span>':'')+
      '<select data-own="'+bi+'">'+ownerSelect(b.owner)+'</select>'+
      '<input data-kg="'+bi+'" type="number" inputmode="numeric" placeholder="kg" value="'+(b.kg||'')+'" style="width:64px;background:rgba(255,255,255,.05);border:1px solid var(--line);border-radius:10px;padding:7px 8px;color:var(--ink);font-family:var(--font-m);font-size:11.5px"></div>';
    h+='<div class="chips">'+b.items.map((it,ii)=>'<span class="pbchip"><b>'+it.qty+'</b> '+esc(it.n.split(' (')[0])+'<button data-chip="'+bi+'_'+ii+'">\\u00D7</button></span>').join('')+'</div>';
    if(PB.pool.length&&!poolLeft.length){
      h+='<div style="font-size:11.5px;color:var(--green);font-weight:800;margin-top:9px">\\u2713 Sab pack ho gaya</div>';
    }else{
      h+='<div class="pb-add"><select data-bsel="'+bi+'">'+
        (PB.pool.length?poolLeft.map(p=>'<option value="'+esc(p.n)+'">'+esc(p.n)+' \\u00B7 '+p.left+' left</option>').join(''):DB.catalog.map(c=>'<option>'+esc(c.n)+'</option>').join(''))+
        '</select><input data-bq="'+bi+'" type="number" inputmode="numeric" placeholder="qty"><button class="btn" data-badd="'+bi+'" style="padding:8px 12px;font-size:11.5px">+ Add</button></div>';
    }
    h+='</div>';
  });
  h+='<button class="btn" id="pbNewBag" style="width:100%;padding:11px;border-style:dashed">+ New Bag</button>';
  h+='<button class="btn primary" id="pbFinish" style="width:100%;margin-top:11px;padding:13px">Packing Done \\u2713</button>';
  h+='</div></div>';
  $('#pbInner').innerHTML=h;
  $('#pbClose').addEventListener('click',()=>{$('#packBoard').classList.remove('open');renderShips();hap('nav')});
  $('#pbNewBag').addEventListener('click',()=>{pbAddBag();renderPB();hap('tick')});
  const au=$('#pbAuto');if(au)au.addEventListener('click',()=>{
    const n=PB.bags.length||1;
    PB.pool.forEach(p=>{if(p.left<=0)return;const per=Math.floor(p.left/n);let rem=p.left-per*n;
      PB.bags.forEach(b2=>{let q=per+(rem>0?1:0);if(rem>0)rem--;if(q>0){b2.items.push({n:p.n,qty:q})}});p.left=0});
    renderPB();hap('magic');toast('OPSI ne maal '+n+' bags mein baraabar baant diya \\u2713')});
  $$('#pbInner [data-own]').forEach(el=>el.addEventListener('change',()=>{PB.bags[+el.dataset.own].owner=el.value;renderPB()}));
  $$('#pbInner [data-kg]').forEach(el=>el.addEventListener('input',()=>{PB.bags[+el.dataset.kg].kg=el.value}));
  $$('#pbInner [data-badd]').forEach(el=>el.addEventListener('click',()=>{
    const bi=+el.dataset.badd;
    const sel=$('#pbInner [data-bsel="'+bi+'"]').value;
    const q=+($('#pbInner [data-bq="'+bi+'"]').value)||0;
    if(q<=0){toast('Qty likho');hap('reject');return}
    const pool=PB.pool.find(p=>p.n===sel);
    if(pool){if(q>pool.left){toast('Pool mein sirf '+pool.left+' left');hap('reject');return}pool.left-=q}
    PB.bags[bi].items.push({n:sel,qty:q});renderPB();hap('tick')}));
  $$('#pbInner [data-chip]').forEach(el=>el.addEventListener('click',()=>{
    const pr=el.dataset.chip.split('_');const it=PB.bags[+pr[0]].items.splice(+pr[1],1)[0];
    const pool=PB.pool.find(p=>p.n===it.n);if(pool)pool.left+=it.qty;
    renderPB();hap('tick')}));
  $('#pbFinish').addEventListener('click',()=>{
    const ship=DB.ships.find(s=>s.id===PB.ship);if(!ship)return;
    const good=PB.bags.filter(b2=>b2.items.length&&b2.owner);
    if(!good.length){toast('Har bag mein maal + owner chuno');hap('reject');return}
    let kg=0;
    good.forEach(b2=>{const pr=b2.owner.split('|');const bid='BAG-'+(DB.seq.bag++);const bkg=+(b2.kg)||0;kg+=bkg;
      DB.bags.push({id:bid,shp:ship.id,parent:pr[0],end:pr[1],direct:!pr[0],kg:bkg,items:b2.items,who:ship.who});
      ship.bags.push(bid)});
    ship.kg=kg;ship.st='READY';ship.stl='p-wait';
    saveDB();$('#packBoard').classList.remove('open');
    renderShips();renderDash();hap('save');
    toast(ship.id+' READY \\u2713 '+good.length+' bags \\u00B7 '+kg+' kg \\u2014 ab Send \\u2192 dabao');
  });
  dressAll($('#pbInner'));
}
/* ---------- LEDGER rows w/ bank logos ---------- */
function renderLedger(){
  renderPartySelects();
  const par=partyByName($('#ledParty').value)||curBookParties()[0];
  if(!par)return;
  if($('#ledParty').value!==par.n)$('#ledParty').value=par.n;
  const bk=bookKeyOf();const b=bk==='k'?par.balK:par.balP;
  $('#lgBalI').innerHTML=fINR(b.inr);$('#lgBalI').className='v '+(b.inr>=0?'pos':'neg');
  $('#lgBalT').innerHTML=fTHB(b.thb);$('#lgBalT').className='v '+(b.thb>=0?'pos':'neg');
  const rows=DB.ledger.filter(l=>l.party===par.n&&l.book===bk).slice(0,30);
  $('#ledgerRows').innerHTML=rows.map(l=>'<div class="lgrow"><span class="d">'+esc(l.d)+'</span><span>'+esc(l.txt)+(l.bank?' '+bankChip(l.bank):'')+'</span>'+
    '<span class="amt '+(l.neg?'neg':'pos')+'">'+(l.neg?'\\u2212':'+')+(l.inr?fINR(l.inr):fTHB(l.thb))+
    '<small>'+(l.inr?'INR':'THB')+'</small></span></div>').join('')||'<div style="color:var(--muted);font-size:12px;padding:10px">Is book mein '+esc(par.n)+' ki koi entry nahi</div>';
  $('#lgHero').innerHTML=fINR(Math.abs(b.inr))+(b.thb?' <span style="font-size:14px">+ '+fTHB(Math.abs(b.thb))+'</span>':'');
  $('#lgHeroName').textContent=par.n;
  $('#lgHeroDir').textContent=b.inr>=0?'Aapko lena hai':'Aapko dena hai';
  const nEl=$('#lgName');if(nEl)nEl.textContent=par.n;
  const mEl=$('#lgMeta');if(mEl)mEl.textContent=typeLabel(par.type)+' \\u00B7 '+(par.city||'')+', '+(par.country||'')+' \\u00B7 OPSI bhasha: '+(par.lang||'Hindi');
  calcConv();
}
/* ---------- DASHBOARD color pass overrides ---------- */
function renderActions(){
  const acts=[];
  DB.invoices.filter(i=>coPass(i)&&i.st==='DUE').slice(0,2).forEach(i=>acts.push({e:'\\u23F3',bg:'linear-gradient(135deg,#f0c46c44,#8a6a1a)',t:'<b>'+i.id+'</b> \\u2014 '+esc(i.party)+' owes '+fINR(i.total),s:i.d,go:'invoices'}));
  DB.board.filter(n=>n.st==='with').forEach(c=>acts.push({e:c.kind==='SAMAAN'?'\\uD83D\\uDFE1':'\\uD83D\\uDCB5',bg:'linear-gradient(135deg,#f0c46c33,#7a5c15)',t:'<b>'+(c.kind==='SAMAAN'?c.qty+' gm SAMAAN':'$'+c.qty.toLocaleString('en-IN')+' SOMANY')+'</b> with <b>'+esc(c.holder)+'</b>',s:c.note,go:'trips'}));
  const bkkKg=DB.parcels.filter(p=>p.st==='received').reduce((a,p)=>a+p.kg,0);
  if(bkkKg>0)acts.push({e:'\\uD83D\\uDCE6',bg:'linear-gradient(135deg,#22d3ee33,#0e5f70)',t:'Bangkok: <b>'+bkkKg+' kg</b> parcels jama \\u2014 '+(bkkKg>=100?'carrier ready!':'aur aane do'),s:DB.parcels.filter(p=>p.st==='received').length+' parcels received',go:'warehouse'});
  const pend=DB.parcels.filter(p=>p.st==='ordered');
  if(pend.length)acts.push({e:'\\uD83D\\uDD0D',bg:'linear-gradient(135deg,#fb5f6e33,#7a1f2b)',t:'<b>'+pend.length+' orders</b> abhi warehouse nahi pahunche',s:'check karo \\u2014 kuch gum na jaye',go:'warehouse'});
  const pl=DB.moves.find(m=>m.st==='PLANNED');
  if(pl)acts.push({e:'\\u2708\\uFE0F',bg:'linear-gradient(135deg,#8b5cf644,#3f2582)',t:'<b>'+esc(pl.who)+'</b> trip '+pl.d+' \\u2014 need '+pl.need+' kg, 0 assigned',s:'assign bags',go:'trips'});
  $('#actList').innerHTML=acts.slice(0,6).map(a=>'<div class="act"><i style="background:'+a.bg+'">'+a.e+'</i><div class="t">'+a.t+'<small>'+esc(a.s)+'</small></div>'+
    '<button class="iconbtn go" data-goto="'+a.go+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg></button></div>').join('');
  $$('#actList [data-goto]').forEach(b=>b.addEventListener('click',()=>{go(b.dataset.goto)}));
}
function renderFeed(){
  const f=[];
  DB.ledger.slice(0,7).forEach(l=>f.push({d:l.d,c:l.neg?'#fb5f6e':'#34d399',t:'<b>'+esc(l.party)+'</b> \\u2014 '+esc(l.txt)+' \\u00B7 '+(l.inr?fINR(l.inr):fTHB(l.thb))}));
  DB.ships.slice(0,3).forEach(s=>f.push({d:s.d,c:'#8b5cf6',t:'<b>'+s.id+'</b> \\u2014 '+s.bags.length+' bags \\u00B7 '+s.kg+' kg \\u00B7 '+s.st}));
  $('#feedList').innerHTML=f.slice(0,10).map(x=>'<div class="f"><span class="fd" style="background:'+x.c+'"></span><span class="d">'+esc(x.d)+'</span><span>'+x.t+'</span></div>').join('');
}
function renderCorridor(){
  const live=DB.moves.filter(m=>m.kind==='carrier'&&(m.st==='HAWA MEIN'||m.st==='BOARDING AAJ'||(m.st&&m.st.indexOf('WAPSI')>-1)));
  let dots='';
  live.forEach((m,i)=>{const wapsi=m.st.indexOf('WAPSI')>-1;
    const t=wapsi?1-(m.prog/100):(m.prog/100);const pt=corrPt(Math.max(.04,Math.min(.96,t)));
    const code=airlineOf(m.fl)||'IATA';const lv=LIVERY[code]||['#22d3ee','#fff'];
    dots+='<g transform="translate('+(pt[0]-3.4)+' '+(pt[1]-3.4)+')"><g transform="scale(0.148) '+(wapsi?'rotate(225 24 24)':'')+'">'+
      '<path d="M24 4 C26 4 27 6 27 9 L27 18 L44 27 L44 31 L27 25 L27 36 L32 40 L32 43 L24 40.5 L16 43 L16 40 L21 36 L21 25 L4 31 L4 27 L21 18 L21 9 C21 6 22 4 24 4 Z" fill="#eef0f8" stroke="'+lv[0]+'" stroke-width="2" transform="rotate(45 24 24)"/></g></g>';
    dots+='<text x="'+pt[0]+'" y="'+(pt[1]-4.6)+'" text-anchor="middle" style="font-size:3.3px;font-weight:800;fill:#dfe4ff;font-family:monospace">'+esc(m.who.split(' ')[0])+' \\u00B7 '+esc(m.fl||'')+'</text>';
  });
  $('#corrMap').innerHTML='<svg viewBox="0 0 100 100" preserveAspectRatio="none">'+
    '<defs><linearGradient id="corrG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient></defs>'+
    '<path class="land" d="M4 18 Q14 8 22 14 Q30 10 28 24 Q34 34 26 44 Q30 56 20 60 Q10 58 8 46 Q2 34 4 18 Z"/>'+
    '<path class="land" d="M78 52 Q88 46 92 56 Q96 68 90 78 Q86 90 80 84 Q74 88 74 76 Q70 62 78 52 Z"/>'+
    '<path class="arc" d="M14 34 Q50 6 86 66"/>'+dots+
    '<circle cx="14" cy="34" r="1.7" fill="#8b5cf6"/><circle cx="86" cy="66" r="1.7" fill="#f472b6"/>'+
    '<text class="city" x="14" y="42" text-anchor="middle" style="font-size:4px">DEL/CCU</text>'+
    '<text class="city" x="86" y="74" text-anchor="middle" style="font-size:4px">BKK</text></svg>';
  $('#corrLegend').innerHTML=live.map(m=>{const code=airlineOf(m.fl);
    return '<span>'+(code&&LOGOS[code]?'<img src="'+logoURI(code)+'" style="width:13px;height:13px;vertical-align:-2px;background:#fff;border-radius:3px;padding:1px"> ':'')+'<b>'+esc(m.who)+'</b> \\u00B7 '+(m.fl?esc(m.fl):'\\u2014')+' \\u00B7 '+esc(m.st)+' \\u00B7 '+esc(m.eta)+'</span>'}).join('')||'<span>Abhi koi hawa mein nahi</span>';
  const cl=$('#corrLive');if(cl)cl.textContent=live.length+' LIVE';
}

/* ---------- KPI override w/ color tiles ---------- */
function renderKPIs(){
  const bk=bookKeyOf();
  let lena=0,dena=0;
  DB.parties.forEach(p=>{const b=(bk==='k'?p.balK:p.balP);if(!b)return;
    if(b.inr>0)lena+=b.inr;else dena+=-b.inr;
    if(b.thb<0)dena+=-b.thb*2.85;else lena+=b.thb*2.85});
  const g=goldTotals();
  const ready=DB.bags.filter(b=>{const sh=DB.ships.find(x=>x.id===b.shp);return sh&&(sh.st==='PACKING'||sh.st==='READY')}).length;
  $('#kpiIn').innerHTML=fINR(lena);$('#kpiInSub').textContent=curBookParties().length+' parties';
  $('#kpiOut').innerHTML=fINR(dena);$('#kpiOutSub').textContent='payouts + THB owed';
  $('#kpiTre').innerHTML=fINR(g.val+usdTotal()*USD_INR);
  $('#kpiTreSub').textContent=g.gm+' gm SAMAAN + $'+usdTotal().toLocaleString('en-IN')+' SOMANY';
  $('#kpiBags').textContent=ready;$('#kpiBagsSub').textContent=DB.ships.filter(x=>x.st==='READY'||x.st==='PACKING').length+' shipments open';
  svgSpark($('#sp1'),[42,48,45,55,52,61,58,66],'#6ee7b7');
  svgSpark($('#sp2'),[30,36,33,41,38,35,42,39],'#fca5b0');
  svgSpark($('#sp3'),[50,52,51,55,58,57,61,64],'#fde68a');
  svgSpark($('#sp4'),[3,5,4,7,6,8,6,ready],'#93c5fd');
  const ds=$('#dsTrips');if(ds)ds.textContent=DB.moves.filter(m=>m.st==='HAWA MEIN'||m.st==='IN AIR'||m.st==='AT SEA').length;
  const db2=$('#dsBags');if(db2)db2.textContent=ready;
  const td=$('#todayStr');if(td)td.textContent=new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'short'});
}
/* ---------- New shipment save (single composer) ---------- */
function saveComposerShip(){
  const good=SC2.rows.filter(r=>(+(r.kg)||0)>0&&r.owner);
  if(!good.length){toast('Bag jodo \\u2014 owner + kg zaroori');hap('reject');return}
  const id='SHP-'+(DB.seq.shp++);
  let kg=0;const bagIds=[];
  good.forEach(r=>{const pr=r.owner.split('|');const bid='BAG-'+(DB.seq.bag++);const bkg=+(r.kg)||0;kg+=bkg;
    const items=(+(r.qty)||0)>0?[{n:r.item,qty:+r.qty,unit:'pc'}]:[];
    DB.bags.push({id:bid,shp:id,parent:pr[0],end:pr[1],direct:!pr[0],kg:bkg,items:items,who:''});
    bagIds.push(bid)});
  DB.ships.unshift({id:id,book:bookKeyOf(),co:bookKeyOf()==='p'?(BOOK.co==='both'?'singh':BOOK.co):'',d:($('#shDate').value||todayShort()),ds:todayISO(),dest:$('#shDest').value,who:'',bags:bagIds,kg:kg,stl:'p-wait',st:'READY'});
  SC2={rows:[]};
  saveDB();$('#shipForm').classList.remove('show');
  renderShips();renderDash();hap('save');
  toast(id+' READY \\u2713 '+bagIds.length+' bags \\u00B7 '+kg+' kg \\u2014 ab Send \\u2192 se bhejo');
}
/* ---------- MASTER RENDER override + init ---------- */
function renderAll(){
  renderDash();renderParties();renderInvoices();renderShips();renderMoves();
  renderLedger();renderLedgerList();renderWarehouse();renderCatalog();
  renderRateEngine();
  dressAll();
}
(function initV59(){
  /* wh tabs */
  $$('#whTabs .mv-tab').forEach(t=>t.addEventListener('click',()=>{whTab=t.dataset.wt;renderWarehouse();hap('tick')}));
  /* ship composer */
  const ab=$('#scAdd');if(ab)ab.addEventListener('click',()=>{scAddRow();hap('tick')});
  /* rate engine */
  const rm=$('#reMargin');if(rm)rm.addEventListener('input',()=>{DB.rateCfg.marginPct=+rm.value||2.8;saveDB();renderRateEngine();
    const cv=$('#cvRate');if(cv)cv.value='';});
  const ra=$('#reAmt');if(ra)ra.addEventListener('input',renderRateEngine);
  /* first paint with everything */
  setBook(BOOK.mode,BOOK.co,true);
})();




/* ---------- pakka confirm + stubs ---------- */
function confirmPakka(party,amtStr,cb){
  $('#cfCo').textContent=CO_NAMES[BOOK.co];
  $('#cfSum').innerHTML='Party: <b>'+esc(party)+'</b><br>Amount: <b>'+amtStr+'</b><br>Yeh <b>permanent pakka bill</b> banega \u2014 GST record mein jayega, delete nahi hoga (min. 5 saal).';
  const pop=$('#confirmPop');pop.classList.add('open');hap('warn');
  const yes=$('#cfYes'),no=$('#cfNo');
  const done=ok=>{pop.classList.remove('open');yes.onclick=no.onclick=null;if(ok)cb()};
  yes.onclick=()=>{hap('save');done(true)};
  no.onclick=()=>{hap('tick');done(false)};
}
function animateFlights(){}
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


/* Catalog stock — ab engine ke renderStock() se */

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
      hap('reject');
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
  if(b&&!b.dataset.toast)hap('tap');
});
document.addEventListener('input',e=>{
  if(e.target.matches('input,select,textarea'))hap('type');   // typing haptic
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

/* trip-plan handlers ab Engine v3 (Movement) mein hain */
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
orb.addEventListener('click',()=>{panel.classList.toggle('open');hap('drag')});
document.addEventListener('click',e=>{
  const dOrb=$('#dockOrb');
  if(!panel.contains(e.target)&&!orb.contains(e.target)&&!(dOrb&&dOrb.contains(e.target)))panel.classList.remove('open');
});

/* ---------- Toast ---------- */
let toastT;
function toast(msg){
  const t=$('#toast');t.textContent=msg;t.classList.add('show');
  clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),2600);
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-toast]');
  if(b){toast(b.dataset.toast);panel.classList.remove('open')}
});

/* ============================================================
   v52 ENGINE — dock nav · more sheet · OPSI trail (magic UI)
   ============================================================ */

/* ---------- Dock + sheet ---------- */
const dock=$('#dock'), sheet=$('#moreSheet'), veil=$('#sheetVeil');
function syncDock(view){
  if(!dock)return;
  $$('#dock .dock-item[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
}
const _goCore=go;
go=function(v){_goCore(v);syncDock(v);sheet.classList.remove('open');veil.classList.remove('on');};
dock.addEventListener('click',e=>{
  const b=e.target.closest('.dock-item[data-view]');
  if(b){go(b.dataset.view);}
});
function sheetToggle(open){
  sheet.classList.toggle('open',open);veil.classList.toggle('on',open);hap('toggle');
}
$('#dockMore').addEventListener('click',()=>sheetToggle(!sheet.classList.contains('open')));
veil.addEventListener('click',()=>sheetToggle(false));
$('#sheetTheme').addEventListener('click',()=>{$('#themeBtn').click();sheetToggle(false)});
$('#dockOrb').addEventListener('click',()=>{panel.classList.toggle('open');hap('drag')});

/* ---------- OPSI flying bot ---------- */
const fly=$('#opsiFly');
let flyX=0,flyY=0,sparkT=null;
function flyHome(){
  const src=(innerWidth<=700?$('#dockOrb'):orb);
  const r=src.getBoundingClientRect();
  return {x:r.left+r.width/2-23, y:r.top+r.height/2-23};
}
function setFly(x,y,scale){
  flyX=x;flyY=y;
  fly.style.transform='translate3d('+x+'px,'+y+'px,0) scale('+(scale||1)+')';
}
function sparksOn(){
  sparksOff();
  sparkT=setInterval(()=>{
    const r=fly.getBoundingClientRect();
    const s=document.createElement('i');
    const k=Math.random();
    s.className='spark'+(k<.33?' v':(k<.66?' m':''));
    s.style.left=(r.left+r.width/2-3+(Math.random()*14-7))+'px';
    s.style.top=(r.top+r.height/2-3+(Math.random()*14-7))+'px';
    document.body.appendChild(s);
    setTimeout(()=>s.remove(),720);
  },55);
}
function sparksOff(){if(sparkT){clearInterval(sparkT);sparkT=null}}
function flyShow(){
  const h=flyHome();setFly(h.x,h.y,.4);
  fly.getBoundingClientRect();
  fly.classList.add('on');
  hap('drag');
}
function flyHide(){
  const h=flyHome();
  return flyTo(h.x,h.y,.4).then(()=>{fly.classList.remove('on');sparksOff();hap('land')});
}
/* Udaan ke dauran haptic trail — hawa mein movement haath mein mehsoos ho,
   aur pahunchte hi ek thump */
let trailT=null;
function trailOn(){
  trailOff();
  let n=0;
  trailT=setInterval(()=>{ n++; hap(n%3===0?'nav':'tick'); },95);
}
function trailOff(){if(trailT){clearInterval(trailT);trailT=null}}
function flyTo(x,y,scale){
  return new Promise(res=>{
    setFly(x,y,scale||1);
    trailOn();
    setTimeout(()=>{trailOff();hap('land');res()},900);
  });
}
/* Element ke SIDE mein baitho (upar nahi) — kaam saaf dikhe.
   Position hamesha screen ke andar clamp hoti hai. */
function flyBeside(el){
  const r=el.getBoundingClientRect();
  const W=innerWidth, H=innerHeight;
  const SZ=46, PAD=8;
  const dockH=(W<=920?96:0);           // dock ke neeche kabhi na jaye
  let x;
  const wide=(r.width > W*0.62);       // poori-chaudai wala element (table row, card)
  if(wide){
    // andar ki taraf, right edge se thoda hatkar
    x=r.right-SZ-14;
  }else if(r.right+SZ+PAD+6 < W){
    x=r.right+10;                      // right side
  }else if(r.left-SZ-10 > PAD){
    x=r.left-SZ-10;                    // left side
  }else{
    x=W-SZ-PAD;                        // dono taraf jagah nahi
  }
  let y=r.top+r.height/2-SZ/2;
  x=Math.max(PAD,Math.min(x,W-SZ-PAD));
  y=Math.max(PAD,Math.min(y,H-SZ-PAD-dockH));
  return flyTo(x,y,1);
}
function scrollToEl(el){
  el.scrollIntoView({behavior:'smooth',block:'center'});
  return new Promise(res=>setTimeout(res,450));
}
function ghostType(input,text){
  return new Promise(res=>{
    if(input&&input.tagName==='SELECT'){
      input.classList.add('magic-target');
      input.value=text;hap('tap');
      setTimeout(()=>{input.classList.remove('magic-target');res()},650);
      return;
    }
    input.classList.add('magic-target');
    let i=0;
    const tick=()=>{
      i++;
      input.value=text.slice(0,i);
      hap('type');
      if(i<text.length)setTimeout(tick,42+Math.random()*36);
      else{setTimeout(()=>{input.classList.remove('magic-target');res()},240)}
    };
    tick();
  });
}
function pressBtn(btn){
  return new Promise(res=>{
    btn.classList.add('magic-target');
    btn.style.transform='scale(.94)';hap('tap');
    setTimeout(()=>{btn.style.transform='';btn.classList.remove('magic-target');res()},320);
  });
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let magicBusy=false;

/* ---------- MAGIC 1: Somchai ka kachcha receipt ---------- */
async function magicReceipt(){
  if(magicBusy)return;magicBusy=true;
  panel.classList.remove('open');
  toast('OPSI: Somchai ka kachcha receipt banata hoon \u2014 dekhte rahiye');
  go('invoices');
  if(BOOK.mode!=='cash')setBook('cash',BOOK.co,true);
  await sleep(500);
  invLines=[];addLine('',0,0);
  openInvForm();
  const qr=$('#invForm');
  await sleep(350);
  flyShow();sparksOn();
  await scrollToEl(qr);
  const steps=[
    ['#invParty','Somchai Fabrics','Party chuni \u2014 Somchai, Bangkok wale'],
    ['#l0item','Cotton bags (printed)','Item catalog se utha raha hoon'],
    ['#l0qty','120','Qty \u2014 120 pc'],
    ['#l0rate','160','Rate \u2014 \u20B9160 (Somchai ka last rate)'],
    ['#invKg','18.5','Freight weight \u2014 18.5 kg']
  ];
  for(const st of steps){
    const el=$(st[0]);
    if(!el)continue;
    await flyBeside(el);
    toast('OPSI: '+st[2]);
    await ghostType(el,st[1]);
    el.dispatchEvent(new Event('input'));el.dispatchEvent(new Event('change'));
  }
  calcInv();
  const save=$('#invSave');
  await flyBeside(save);
  toast('OPSI: totals mila ke save karta hoon\u2026');
  await sleep(350);
  await pressBtn(save);
  saveInvoice(true);
  const tb=$('#invRows');
  if(tb&&tb.firstElementChild){tb.firstElementChild.classList.add('row-new');await scrollToEl(tb.firstElementChild)}
  await sleep(900);
  await flyHide();
  magicBusy=false;
}

/* ---------- MAGIC 2: Lalit ka hisaab — narrated walkthrough ---------- */
async function magicHisaab(){
  if(magicBusy)return;magicBusy=true;
  panel.classList.remove('open');
  toast('OPSI: Lalit ka khata kholta hoon — ek-ek entry samjhata hoon');
  go('hisaab');
  await sleep(550);
  flyShow();sparksOn();
  const rows=$$('#ledgerRows .lgrow').slice(0,4);
  for(const tr of rows){
    await scrollToEl(tr);
    await flyBeside(tr);
    tr.classList.add('magic-target');
    const cells=tr.querySelectorAll('span');
    const what=cells[1]?cells[1].textContent.trim():'entry';
    const inr=cells[2]?cells[2].textContent.trim():'';
    toast('OPSI: '+what+(inr?' \u2014 '+inr:''));
    await sleep(1250);
    tr.classList.remove('magic-target');
  }
  const sumCard=$('#v-hisaab .stat');
  if(sumCard){
    await scrollToEl(sumCard);
    await flyBeside(sumCard);
    sumCard.classList.add('magic-target');
    toast('OPSI: Net \u2014 '+$('#lgHero').textContent+' ('+$('#lgHeroDir').textContent+'). Track bilkul clear \uD83D\uDC4D');
    hap('confirm');
    await sleep(1600);
    sumCard.classList.remove('magic-target');
  }
  await flyHide();
  magicBusy=false;
}

$('#sugReceipt').addEventListener('click',magicReceipt);
$('#sugHisaab').addEventListener('click',magicHisaab);
syncDock('dashboard');

/* ---------- Tables ko scroll-safe banao (page kabhi side mein na khiske) ---------- */
(function wrapTables(){
  $$('.tbl').forEach(t=>{
    const p=t.parentElement;
    if(p && !p.classList.contains('tblwrap')) p.classList.add('tblwrap');
  });
})();

/* ============================================================
   v60 — CINEMA BOOT + LIVE BOT + WORLD MAP + FIN BADGES
   ============================================================ */
/* hap/buzz — original consts patched upar */
/* ---------- pinch zoom lock ---------- */
(function(){
  ['gesturestart','gesturechange','gestureend'].forEach(ev=>document.addEventListener(ev,e=>e.preventDefault(),{passive:false}));
  let lastT=0;
  document.addEventListener('touchend',e=>{const n=Date.now();if(n-lastT<300){e.preventDefault()}lastT=n},{passive:false});
  document.addEventListener('touchmove',e=>{if(e.touches.length>1)e.preventDefault()},{passive:false});
})();
/* ---------- OPSI advanced bot SVG ---------- */
function botSVG(cls,wings){
  return '<svg class="opsibot '+(cls||'')+'" viewBox="0 0 100 100" width="100%" height="100%">'+
  '<defs><linearGradient id="obg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22d3ee"/><stop offset=".5" stop-color="#8b5cf6"/><stop offset="1" stop-color="#f472b6"/></linearGradient></defs>'+
  (wings?'<ellipse class="wingL" cx="24" cy="30" rx="16" ry="7" fill="rgba(165,243,252,.5)" transform="rotate(-28 24 30)"/>'+
         '<ellipse class="wingR" cx="76" cy="30" rx="16" ry="7" fill="rgba(165,243,252,.5)" transform="rotate(28 76 30)"/>':'')+
  '<path class="cirq" d="M8 26 H22 L30 18 H44" fill="none" stroke="#22d3ee" stroke-width="1.6"/>'+
  '<path class="cirq c2" d="M92 74 H78 L70 82 H56" fill="none" stroke="#8b5cf6" stroke-width="1.6"/>'+
  '<path class="cirq c3" d="M6 62 H16 L24 70" fill="none" stroke="#f472b6" stroke-width="1.4"/>'+
  '<circle cx="8" cy="26" r="2" fill="#22d3ee"/><circle cx="92" cy="74" r="2" fill="#8b5cf6"/>'+
  '<path class="ring" d="M 62.3 16.2 A 36 36 0 0 1 68 81.2" fill="none" stroke="url(#obg)" stroke-width="7" stroke-linecap="round"/>'+
  '<path class="ring" d="M 43.8 85.4 A 36 36 0 0 1 37.7 16.2" fill="none" stroke="url(#obg)" stroke-width="7" stroke-linecap="round"/>'+
  '<path d="M 47 84 L 51 99 L 63 79 Z" fill="url(#obg)"/>'+
  '<path d="M 11 50 A 39 39 0 0 1 89 50" fill="none" stroke="url(#obg)" stroke-width="6" stroke-linecap="round"/>'+
  '<rect x="5" y="42" width="10" height="18" rx="5" fill="url(#obg)"/><rect x="85" y="42" width="10" height="18" rx="5" fill="url(#obg)"/>'+
  '<circle class="core" cx="50" cy="66" r="3.2" fill="#22d3ee"/>'+
  '<circle class="eyeL" cx="39" cy="53" r="6.5" fill="#eaf0ff"/><circle class="eyeR" cx="61" cy="53" r="6.5" fill="#eaf0ff"/>'+
  '<circle cx="40.5" cy="52" r="2.3" fill="#0a0f22"/><circle cx="62.5" cy="52" r="2.3" fill="#0a0f22"/>'+
  '</svg>';
}
/* ---------- typing w/ haptic ---------- */
function typeBrief(){
  const el=$('#briefBody');if(!el)return;
  el.innerHTML='<span class="caret"></span>';
  const briefHTML=buildBrief();
  if(reduced){el.innerHTML=briefHTML;return}
  const tokens=briefHTML.split(/(<[^>]+>|&[#a-z0-9]+;)/gi).filter(Boolean);
  let out='',ti=0,ci=0,hc=0;
  (function tick(){
    if(ti>=tokens.length){el.innerHTML=out;window.__briefDone&&window.__briefDone();return}
    const tok=tokens[ti];
    if(tok.startsWith('<')||tok.startsWith('&')){out+=tok;ti++;tick();return}
    out+=tok[ci++];
    if(++hc%4===0)buzz(3);
    if(ci>=tok.length){ti++;ci=0}
    el.innerHTML=out+'<span class="caret"></span>';
    setTimeout(tick,13);
  })();
}
/* ---------- fly bot (bee flight dock ⇄ brief) ---------- */
function flyBotTo(rect,cb){
  let fb=$('#flyBot');
  if(!fb){fb=document.createElement('div');fb.id='flyBot';fb.innerHTML=botSVG('',true);document.body.appendChild(fb)}
  const orbEl=$('#opsiOrb');const o=orbEl?orbEl.getBoundingClientRect():{left:innerWidth-90,top:innerHeight-90,width:56,height:56};
  fb.classList.add('on');
  fb.style.transition='none';
  fb.style.transform='translate('+(o.left)+'px,'+(o.top)+'px)';
  requestAnimationFrame(()=>{requestAnimationFrame(()=>{
    fb.style.transition='';
    buzz([5,30,5,30,5]);
    fb.style.transform='translate('+(rect.left)+'px,'+(rect.top)+'px)';
    setTimeout(()=>{cb&&cb(fb)},1000);
  })});
}
function flyBotHome(fb,done){
  const orbEl=$('#opsiOrb');const o=orbEl?orbEl.getBoundingClientRect():{left:innerWidth-90,top:innerHeight-90};
  buzz([5,26,5]);
  fb.style.transform='translate('+(o.left)+'px,'+(o.top)+'px)';
  setTimeout(()=>{
    fb.classList.remove('on');
    if(orbEl){orbEl.style.transition='transform .18s';orbEl.style.transform='scale(1.28)';
      buzz([34]);setTimeout(()=>{orbEl.style.transform='';},190)}
    done&&done();
  },980);
}
function briefShow(){
  const card=$('#briefBody');if(!card){return}
  const r=card.getBoundingClientRect();
  const ava=$('#briefBot');if(ava&&!ava.innerHTML)ava.innerHTML=botSVG('beehover',false);
  flyBotTo({left:Math.max(12,r.left-8),top:Math.max(60,r.top-14)},function(fb){
    typeBrief();
    window.__briefDone=function(){flyBotHome(fb);window.__briefDone=null};
  });
}
/* ---------- CINEMATIC BOOT + LOGIN ---------- */
function runBootCinema(){
  const boot=$('#boot'),msg=$('#bootMsg');
  if(!boot){return}
  const msgs=['OPSI jaag raha hai\\u2026','Circuits garam ho rahe hain\\u2026','Rates la raha hoon\\u2026'];
  let i=0;const mi=setInterval(()=>{i++;if(i<msgs.length&&msg)msg.textContent=msgs[i%msgs.length]},600);
  const finishAuth=()=>{
    clearInterval(mi);
    const aw=$('#authWrap');aw.classList.add('ok');
    $('#authMsg').textContent='Pehchaan ho gayi \\u2014 swagat hai, K Singh';
    buzz([20,50,20]);
    setTimeout(()=>{
      boot.classList.remove('auth');           /* logo wapas center */
      setTimeout(()=>{
        /* DIVE — circuit ke andar */
        const fx=$('#diveFx');
        let st='';for(let k=0;k<26;k++){st+='<i style="--a:'+(k*13.8)+'deg;animation-delay:'+(k%7*40)+'ms"></i>'}
        fx.innerHTML=st;
        boot.classList.add('dive');
        buzz([8,40,12,40,18,40,26]);
        setTimeout(()=>{
          boot.classList.add('off');
          setTimeout(()=>{boot.style.display='none'},520);
          /* dashboard stagger-wake */
          $$('#v-dashboard .card').forEach((c,idx)=>{c.classList.add('wake');c.style.animationDelay=(idx*55)+'ms'});
          setTimeout(()=>{$$('#v-dashboard .card').forEach(c=>{c.classList.remove('wake');c.style.animationDelay=''})},1800);
          setTimeout(briefShow,700);
        },860);
      },560);
    },650);
  };
  /* phase 1: splash → auth */
  setTimeout(()=>{
    if(reduced){boot.style.display='none';typeBrief();return}
    boot.classList.add('auth');
    if(msg)msg.textContent='';
  },1500);
  const fp=$('#authFp');
  fp.addEventListener('click',()=>{
    if(fp.classList.contains('scan'))return;
    fp.classList.add('scan');buzz(8);
    $('#authMsg').textContent='Ungli padh raha hoon\\u2026';
    setTimeout(()=>{fp.classList.remove('scan');finishAuth()},1000);
  });
  $('#authGo').addEventListener('click',()=>{
    const u=$('#authUser').value.trim();
    if(!u){$('#authMsg').textContent='ID daaliye \\u2014 ya fingerprint dabaiye';buzz([26,40,26]);return}
    buzz(10);finishAuth();
  });
  $('#authPass').addEventListener('keydown',e=>{if(e.key==='Enter')$('#authGo').click()});
}
function showLock(){/* v60: purana lock band — cinema sambhalta hai */}
/* ---------- WORLD MAP (fixed artwork, kabhi stretch nahi) ---------- */
const WM_LAND=[
 /* stylized continents — 1000x520 canvas */
 'M60 96 Q95 60 150 66 Q205 52 236 78 Q285 70 300 104 Q322 130 300 160 Q310 190 282 204 Q270 244 234 240 Q214 268 186 256 Q160 276 140 254 Q108 250 100 222 Q70 210 74 178 Q48 150 60 118 Z',            /* North America */
 'M238 288 Q268 272 290 292 Q312 306 306 338 Q316 372 292 400 Q284 436 262 448 Q244 470 232 444 Q214 420 224 386 Q210 352 226 322 Q222 300 238 288 Z',                                                   /* South America */
 'M470 88 Q502 70 534 84 Q566 74 584 96 Q612 92 618 116 Q604 138 578 136 Q560 152 534 144 Q506 154 490 138 Q464 132 460 112 Q458 96 470 88 Z',                                                            /* Europe */
 'M478 168 Q520 152 556 170 Q590 182 596 216 Q612 252 592 292 Q588 332 560 356 Q548 392 520 384 Q498 404 482 376 Q458 352 466 316 Q446 280 462 244 Q452 200 478 168 Z',                                   /* Africa */
 'M620 96 Q676 66 740 80 Q812 68 866 96 Q930 108 942 148 Q930 182 894 186 Q884 216 848 210 Q838 244 806 236 Q788 262 762 246 Q744 268 720 252 Q690 258 676 232 Q640 226 634 196 Q612 168 622 136 Z',      /* Asia */
 'M700 268 Q724 258 742 274 Q760 288 750 312 Q736 330 714 322 Q694 314 692 292 Z',                                                                                                                        /* SE Asia / Indonesia */
 'M812 342 Q854 326 892 346 Q916 366 906 398 Q884 424 846 416 Q812 410 802 380 Q800 356 812 342 Z',                                                                                                       /* Australia */
 'M642 176 Q664 164 682 180 Q696 200 686 226 Q676 250 660 240 Q646 224 644 200 Z'                                                                                                                          /* India accent */
];
const WM_DEL=[672,196],WM_CCU=[708,214],WM_BKK=[742,258];
function wmArc(a,b){const mx=(a[0]+b[0])/2,my=Math.min(a[1],b[1])-42;return 'M '+a[0]+' '+a[1]+' Q '+mx+' '+my+' '+b[0]+' '+b[1]}
function wmPoint(a,b,t){const mx=(a[0]+b[0])/2,my=Math.min(a[1],b[1])-42;const u=1-t;
  return [u*u*a[0]+2*u*t*mx+t*t*b[0], u*u*a[1]+2*u*t*my+t*t*b[1]]}
function finSVG(code,size){
  const lv=LIVERY[code]||['#8b5cf6','#22d3ee'];const s=size||30;
  const uri=logoURI(LOGOS[code]?code:'IATA');
  return '<svg width="'+s+'" height="'+s+'" viewBox="0 0 40 40">'+
   '<path d="M6 38 L20 4 Q23 0 26 4 L34 22 L34 38 Z" fill="'+lv[0]+'" stroke="rgba(255,255,255,.25)" stroke-width="1"/>'+
   '<path d="M6 38 L13 21 L34 30 L34 38 Z" fill="'+lv[1]+'" opacity=".85"/>'+
   '<image href="'+uri+'" x="17" y="10" width="15" height="13" preserveAspectRatio="xMidYMid meet"/>'+
   '</svg>';
}
function finBadge(fl,size){
  if(!fl)return '';
  const code=airlineOf(fl);
  return '<span class="finb">'+finSVG(code,size||30)+'<span class="fno">'+esc(fl)+'</span></span>';
}
function wmPlane(x,y,angle,code,scale){
  const lv=LIVERY[code]||['#8b5cf6','#22d3ee'];
  return '<g transform="translate('+x+' '+y+') rotate('+angle+') scale('+(scale||0.75)+')">'+
   '<path d="M0 -16 C3 -16 4 -13 4 -9 L4 -2 L26 8 L26 13 L4 6 L4 14 L10 19 L10 23 L0 20 L-10 23 L-10 19 L-4 14 L-4 6 L-26 13 L-26 8 L-4 -2 L-4 -9 C-4 -13 -3 -16 0 -16 Z" fill="#f2f4ff" stroke="'+lv[0]+'" stroke-width="1.6"/>'+
   '<path d="M0 -16 C3 -16 4 -13 4 -9 L4 -6 L-4 -6 L-4 -9 C-4 -13 -3 -16 0 -16 Z" fill="'+lv[0]+'"/>'+
   '<path d="M-5 14 L0 24 L5 14 Z" fill="'+lv[0]+'"/>'+
   '</g>';
}
function renderCorridor(){
  const host=$('#corrMap');if(!host)return;
  const live=DB.moves.filter(m=>m.kind==='carrier'&&(m.st==='HAWA MEIN'||m.st==='BOARDING AAJ'||(m.st&&m.st.indexOf('WAPSI')>-1)));
  let planes='',fins='';
  live.forEach(m=>{
    const wapsi=m.st.indexOf('WAPSI')>-1;
    const t=Math.max(.06,Math.min(.94,wapsi?1-(m.prog/100):(m.prog/100)));
    const A=WM_DEL,B=WM_BKK;
    const p=wmPoint(A,B,t),p2=wmPoint(A,B,Math.min(.99,t+.02));
    let ang=Math.atan2(p2[1]-p[1],p2[0]-p[0])*180/Math.PI+90;
    if(wapsi)ang+=180;
    const code=airlineOf(m.fl)||'IATA';
    planes+=wmPlane(p[0],p[1],ang,code,0.78);
    planes+='<text x="'+p[0]+'" y="'+(p[1]-22)+'" text-anchor="middle" class="wm-lbl">'+esc(m.who.split(' ')[0])+'</text>';
  });
  host.innerHTML='<div class="worldwrap"><svg viewBox="0 0 1000 520" preserveAspectRatio="xMidYMid slice">'+
   '<defs><linearGradient id="wmRoute" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#f472b6"/></linearGradient></defs>'+
   (function(){let g='';for(let x=0;x<=1000;x+=100)g+='<line class="wm-grid" x1="'+x+'" y1="0" x2="'+x+'" y2="520"/>';
     for(let y=0;y<=520;y+=87)g+='<line class="wm-grid" x1="0" y1="'+y+'" x2="1000" y2="'+y+'"/>';return g})()+
   WM_LAND.map(d=>'<path class="wm-land" d="'+d+'"/>').join('')+
   '<path class="wm-route" d="'+wmArc(WM_DEL,WM_BKK)+'"/>'+
   '<circle class="wm-dot" cx="'+WM_DEL[0]+'" cy="'+WM_DEL[1]+'" r="4.5" fill="#8b5cf6" color="#8b5cf6"/>'+
   '<circle class="wm-dot" cx="'+WM_CCU[0]+'" cy="'+WM_CCU[1]+'" r="3" fill="#22d3ee" color="#22d3ee"/>'+
   '<circle class="wm-dot" cx="'+WM_BKK[0]+'" cy="'+WM_BKK[1]+'" r="4.5" fill="#f472b6" color="#f472b6"/>'+
   '<text class="wm-city" x="'+(WM_DEL[0]-8)+'" y="'+(WM_DEL[1]-12)+'" text-anchor="end">DEL</text>'+
   '<text class="wm-city" x="'+(WM_CCU[0]+10)+'" y="'+(WM_CCU[1]+14)+'">CCU</text>'+
   '<text class="wm-city" x="'+(WM_BKK[0]+10)+'" y="'+(WM_BKK[1]+16)+'">BKK</text>'+
   planes+'</svg></div>';
  $('#corrLegend').innerHTML=live.map(m=>{
    return '<span style="display:inline-flex;align-items:center;gap:7px">'+finBadge(m.fl,24)+'<b>'+esc(m.who)+'</b> \\u00B7 '+esc(m.st)+' \\u00B7 '+esc(m.eta||'')+'</span>'}).join('')||'<span>Abhi koi hawa mein nahi</span>';
  const cl=$('#corrLive');if(cl)cl.textContent=live.length+' LIVE';
}
/* ---------- SHIPS — flat bag-wise ---------- */
function renderShips(){
  $('#shBagCount').textContent=DB.bags.filter(b=>{const sh=DB.ships.find(x=>x.id===b.shp);return sh&&(sh.st==='READY'||sh.st==='PACKING')}).length;
  const list=DB.ships.filter(s=>bookKeyOf()==='k'?s.book!=='p':(s.book==='p'&&(BOOK.co==='both'||s.co===BOOK.co)||s.st==='READY'||s.st==='PACKING')).slice(0,14);
  $('#shipList').innerHTML=list.map(sh=>{
    const bags=DB.bags.filter(b=>b.shp===sh.id);
    const rows=bags.map(b=>'<div class="bagflat"><span class="bid2">'+b.id+'</span>'+
      '<div style="min-width:0"><div class="own"><b>'+(b.direct?'\\u2726 Direct':esc(b.parent||''))+'</b><span class="arrw">\\u2192</span><b>'+esc(b.end)+'</b>'+(b.direct?' <span class="dir-tag">DIRECT</span>':'')+'</div>'+
      '<div class="its2">'+(b.items.length?b.items.map(x=>esc(x.n.split(' (')[0])+' \\u00D7'+x.qty).join(' \\u00B7 '):'items packing par')+'</div></div>'+
      '<span class="kg2">'+b.kg+' kg</span></div>').join('');
    return '<div class="shrow"><div class="top sh-open" data-sh="'+sh.id+'" style="cursor:pointer"><b>'+sh.id+'</b> '+coTag(sh)+'<span class="pill '+sh.stl+'">'+sh.st+'</span>'+
      (sh.who?'<span class="trk">\\u2708 '+esc(sh.who)+'</span>':'')+(sh.awb?finBadge(sh.awb,26):'')+
      '<span style="margin-left:auto;font-family:var(--font-m);font-weight:800">'+sh.kg+' kg \\u00B7 '+bags.length+' bags</span></div>'+
      '<div class="meta">'+esc(sh.d)+' \\u00B7 '+esc(sh.dest)+(sh.agent?' \\u00B7 '+esc(sh.agent):'')+(sh.inv?' \\u00B7 invoice: '+sh.inv:'')+'</div>'+
      rows+
      '<div class="btns">'+
      (sh.st==='PACKING'?'<button class="btn primary" data-pack="'+sh.id+'">\\uD83D\\uDCE6 Continue packing</button>':'')+
      (sh.st==='READY'?'<button class="btn primary" data-send="'+sh.id+'">\\uD83D\\uDE80 Send \\u2192</button>':'')+
      '<button class="btn" data-plist="'+sh.id+'">\\uD83D\\uDCC4 Packing List</button>'+
      '<button class="btn" data-chk="'+sh.id+'">\\u2611 Checklist</button></div></div>'}).join('');
  $$('#shipList .sh-open').forEach(el=>el.addEventListener('click',()=>{openShipment(el.dataset.sh);hap('nav')}));
  $$('#shipList [data-pack]').forEach(b=>b.addEventListener('click',()=>{const sh=DB.ships.find(s=>s.id===b.dataset.pack);openPackBoard(b.dataset.pack,sh&&sh.inv||null)}));
  $$('#shipList [data-send]').forEach(b=>b.addEventListener('click',()=>{openSendSheet(b.dataset.send)}));
  $$('#shipList [data-plist]').forEach(b=>b.addEventListener('click',()=>{buildPackingList(b.dataset.plist);hap('nav')}));
  $$('#shipList [data-chk]').forEach(b=>b.addEventListener('click',()=>{buildChecklist(b.dataset.chk);hap('nav')}));
}
/* ---------- MOVES + form live preview ---------- */
function renderMoves(){
  const bk=bookKeyOf();
  let list=DB.moves.filter(m=>bk==='k'?m.kind==='carrier':(m.kind!=='carrier'&&(BOOK.co==='both'||m.co===BOOK.co)));
  list=list.filter(m=>{
    const inbound=(m.st&&m.st.indexOf('WAPSI')>-1)||(m.back&&(m.back.gold>0||m.back.kg>0)&&m.prog>=100);
    return mvDir==='in'?inbound:!inbound});
  $('#mvList').innerHTML=list.map(m=>{
    const code=airlineOf(m.fl||m.awb);
    let h='<div class="mvcard"><div class="top" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">'+
      ((m.kind==='carrier'||m.kind==='aircargo')&&(m.fl||m.awb)?finBadge(m.fl||m.awb,38):'<div class="tripPlane" style="display:grid;place-items:center;font-size:26px">'+(m.kind==='seacargo'?'\\uD83D\\uDEA2':m.kind==='courier'?'\\uD83D\\uDCE8':'\\u2708')+'</div>')+
      '<div><b style="font-family:var(--font-m)">'+kindTag(m.kind)+' \\u00B7 '+esc(m.who)+'</b>'+(m.book==='p'?' '+coTag(m):'')+
      '<div style="font-size:11px;color:var(--muted);margin-top:2px">'+esc(m.d)+' \\u00B7 '+esc(m.eta||'')+'</div></div>'+
      '<span class="pill '+m.stl+'" style="margin-left:auto">'+esc(m.st)+'</span>'+
      (m.awb&&!m.fl&&m.kind!=='aircargo'?'<span class="trk">'+esc(m.awb)+'</span>':'')+'</div>';
    if(m.prog>0&&m.prog<100)h+='<div class="meter" style="margin-top:10px"><i style="width:'+m.prog+'%"></i></div>';
    if(m.kind==='carrier'){
      h+='<div class="mv-duo"><div class="mv-box out"><div class="h">GOING \\u2192 BKK</div><div>'+
        '<b>'+((m.out.bags&&m.out.bags.length)||0)+'</b> bags \\u00B7 <b>'+m.out.kg+'</b> kg'+(m.out.shp?' \\u00B7 '+m.out.shp:'')+'<br>SOMANY carry: <b>$'+(m.out.usd||0).toLocaleString('en-IN')+'</b>'+(m.need?'<br><span style="color:var(--muted)">need '+m.need+' kg'+(m.out.kg<m.need?' \\u00B7 <b style="color:#f0c46c">'+(m.need-m.out.kg)+' kg space left</b>':' \\u00B7 full')+'</span>':'')+'</div></div>'+
        '<div class="mv-box inn"><div class="h">\\u2190 BRINGING BACK</div><div>SAMAAN: <b>'+(m.back.gold||0)+' gm</b><br>Thai goods: <b>'+(m.back.kg||0)+' kg</b>'+((m.back.gold||m.back.kg)?'':'<br><span style="color:var(--muted)">Bangkok se tay hoga</span>')+'</div></div></div>';
    }else{
      h+='<div class="mv-box out" style="margin-top:10px"><div class="h">CONSIGNMENT'+(m.agent?' \\u00B7 '+esc(m.agent):'')+'</div><div><b>'+(m.out.kg||0)+' kg</b> \\u00B7 '+esc(m.out.desc||'')+'</div></div>';
    }
    h+='</div>';return h}).join('')||'<div style="color:var(--muted);font-size:13px;padding:16px">'+(bk==='p'?'Pakka book mein courier/cargo dikhte hain \\u2014 carrier trips KACHCHA mein hain':'Koi trip nahi \\u2014 + New Trip dabao')+'</div>';
  renderBoard();
  const fl=$('#tpFl');
  if(fl&&!fl.__v60){fl.__v60=1;
    fl.addEventListener('input',()=>{const pv=$('#tpPrev');if(pv)pv.innerHTML=fl.value.trim()?finBadge(fl.value.trim().toUpperCase(),34):''});
    const w=$('#tpWho');if(w)w.addEventListener('change',()=>{
      const par=partyByName(w.value);const inf=$('#tpPartnerInfo');
      if(inf&&par)inf.textContent=par.n+' \\u00B7 carrying rate \\u20B9'+(par.rt||350)+'/kg \\u00B7 last: '+((par.last&&par.last.trip)||'\\u2014');
    });
  }
}
/* ---------- Android back (App.js bridge) ---------- */
window.__appBack=function(){
  const close=(sel,cls)=>{const el=$(sel);if(el&&el.classList.contains(cls)){el.classList.remove(cls);hap('nav');return true}return false};
  if(close('#calPop','open'))return;
  if(close('#printPop','open'))return;
  if(close('#sendSheet','open'))return;
  if($('#csPanel')&&$('#csPanel').classList.contains('open')){$('#csPanel').classList.remove('open');$('#csBackdrop').classList.remove('on');hap('nav');return}
  if(close('#dtlOverlay','open'))return;
  if(close('#pdOverlay','open'))return;
  if(close('#lgOverlay','open'))return;
  if(close('#packBoard','open'))return;
  if($('#moreSheet')&&$('#moreSheet').classList.contains('open')){sheetToggle(false);return}
  const openForm=$$('.formcard.show')[0];
  if(openForm){openForm.classList.remove('show');hap('nav');return}
  const av=document.querySelector('.view.active');
  if(av&&av.id!=='v-dashboard'){go('dashboard');return}
  try{window.ReactNativeWebView.postMessage(JSON.stringify({t:'exit'}))}catch(e){}
};
/* ---------- co-btn deselect → both handled in doc handler patch ---------- */


try{if(!localStorage.getItem('opsi_key'))localStorage.setItem('opsi_key','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')}catch(e){}
/* ============================================================
   v60b — OPSI BRAIN · GPT-4o-mini · asli AI, asli actions
   ============================================================ */
function aiKey(){return localStorage.getItem('opsi_key')||''}
function aiSetKey(k){localStorage.setItem('opsi_key',(k||'').trim())}
function bizSnapshot(){
  /* OPSI ke dimaag ke liye live business context — chhota par poora */
  const g=goldTotals();const uT=usdTotal();
  const bal=curBookParties().slice(0,18).map(p=>{const b=bookKeyOf()==='k'?p.balK:p.balP;
    return p.n+': INR '+b.inr+', THB '+b.thb}).join('; ');
  const trips=DB.moves.filter(m=>m.kind==='carrier').slice(0,6).map(m=>m.who+' '+(m.fl||'')+' '+m.st+' going:'+m.out.kg+'kg usd:$'+(m.out.usd||0)+' back:'+(m.back.gold||0)+'gm').join(' | ');
  const ships=DB.ships.slice(0,8).map(x=>x.id+' '+x.st+' '+x.kg+'kg '+x.dest).join(' | ');
  const board=DB.board.filter(n=>n.st==='with').map(n=>n.kind+' '+n.qty+(n.unit==='gm'?'gm':'$')+' with '+n.holder).join('; ');
  const sr=suggRates();
  return 'AAJ: '+new Date().toDateString()+
   '\\nBOOK: '+(bookKeyOf()==='k'?'KACHCHA':'PAKKA '+BOOK.co)+
   '\\nRATES: gold IN Rs'+GOLD_IN+'/gm; transfer engine buy Rs'+sr.buy+'/THB sell Rs'+sr.sell+'/THB (real '+sr.real.buyReal+'/'+sr.real.sellReal+'), margin '+sr.m.toFixed(1)+'%'+
   '\\nTREASURY: SAMAAN(gold) '+g.gm+'gm avg-buy, value Rs'+g.val+', P/L Rs'+g.pl+'; SOMANY(dollar) $'+uT+
   '\\nCUSTODY BOARD: '+(board||'sab warehouse mein')+
   '\\nPARTY BALANCES ('+(bookKeyOf()==='k'?'kachcha':'pakka')+', + = lena hai): '+bal+
   '\\nTRIPS: '+trips+
   '\\nSHIPMENTS: '+ships;
}
const OPSI_SYS='Tum OPSI ho — Kishan Singh ke LogiOp Pro app ka AI logistics assistant. Kaam: Delhi-Bangkok trade (fabrics export, carrier trips, SAMAAN=gold, SOMANY=dollar — hamesha yehi code-words use karo, kabhi gold/dollar mat likhna), THB<->INR transfer rate (usool: jo currency MILE uska rate asli se NEECHE quote, jo DENI ho uska UPAR — dono taraf profit; ulta rate loss deta hai, turant roko/warn karo). Har jawab HINGLISH mein (Hindi in Roman script, technical words English). Chhota, seedha, dostana-par-formal; user ko "aap"; kabhi Urdu shabd nahi; sambodhan ghumao (Kishan ji, boss, sir). Numbers Indian format.'+
'\\nTumhe app control karne ke actions milte hain. HAMESHA sirf is JSON format mein jawab do (aur kuch nahi): {"say":"<hinglish reply>","action":{"type":"none|go|ledger|rate|board","view":"dashboard|parties|invoices|shipments|trips|hisaab|warehouse|quote|catalog|rates|books|reports|settings","party":"<party name>","thb":<number>}}'+
'\\n- "go": kisi section par le jao (view do). "ledger": party ka khata kholo (party do). "rate": THB amount ka quote batao (thb do; quote view kholna ho to bhi yehi). Baaki sirf baat = "none".';
let AI_HIST=[];
async function opsiAsk(text){
  const key=aiKey();
  const log=$('#aiLog');
  const add=(cls,html)=>{const d=document.createElement('div');d.className='aimsg '+cls;d.innerHTML=html;log.appendChild(d);log.scrollTop=log.scrollHeight;return d};
  add('me',esc(text));
  if(!key){add('bot','Pehle Settings mein apni OpenAI key daal dijiye — phir main poori tarah jag jaunga. <button class="btn" style="padding:6px 10px;font-size:11px;margin-top:6px" onclick="go(\\'settings\\')">Settings kholo</button>');return}
  const think=add('bot','<span class="aithink">soch raha hoon<i>.</i><i>.</i><i>.</i></span>');
  hap('magic');
  AI_HIST.push({role:'user',content:text});
  if(AI_HIST.length>12)AI_HIST=AI_HIST.slice(-12);
  try{
    const res=await fetch('https://api.openai.com/v1/chat/completions',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
      body:JSON.stringify({
        model:'gpt-4o-mini',
        temperature:0.6,max_tokens:320,
        response_format:{type:'json_object'},
        messages:[{role:'system',content:OPSI_SYS},{role:'system',content:'LIVE APP DATA:\\n'+bizSnapshot()}].concat(AI_HIST)
      })
    });
    if(!res.ok){
      const t=await res.text();
      think.innerHTML=res.status===401?'Key galat lag rahi hai — Settings mein dobara check kariye.':
        res.status===429?'OpenAI bolta hai: limit/credit khatam (429). Billing check kariye.':
        'OpenAI error '+res.status+' — thodi der mein try kariye.';
      console.log('OPSI err',t.slice(0,200));hap('reject');return;
    }
    const data=await res.json();
    let out={say:'Samajh nahi paya, dobara boliye?',action:{type:'none'}};
    try{out=JSON.parse(data.choices[0].message.content)}catch(e){out.say=data.choices[0].message.content||out.say}
    AI_HIST.push({role:'assistant',content:JSON.stringify(out)});
    /* typed reply */
    think.innerHTML='';
    const words=String(out.say||'').split(' ');let wi=0;
    (function tw(){if(wi>=words.length){doAct(out.action);if(window.__opsiSay)window.__opsiSay(out.say);return}
      think.innerHTML+=(wi?' ':'')+esc(words[wi++]);log.scrollTop=log.scrollHeight;
      if(wi%3===0)buzz(3);setTimeout(tw,45)})();
  }catch(e){
    think.innerHTML='Net se baat nahi ho payi — connection check karke dobara try kariye.';hap('reject');
  }
  function doAct(a){
    if(!a||a.type==='none')return;
    setTimeout(()=>{
      if(a.type==='go'&&a.view){go(a.view);hap('nav')}
      else if(a.type==='ledger'&&a.party){
        const par=curBookParties().find(p=>p.n.toLowerCase().indexOf(String(a.party).toLowerCase())>-1);
        go('hisaab');if(par)openLedger(par.n);hap('nav');
      }else if(a.type==='rate'){
        go('quote');const ra=$('#reAmt');if(ra&&a.thb){ra.value=a.thb;renderRateEngine()}hap('nav');
      }else if(a.type==='board'){go('trips');hap('nav')}
    },420);
  }
}
/* ---------- OPSI panel v2: chat UI ---------- */
(function initOpsiChat(){
  const p=$('#opsiPanel');if(!p)return;
  const head=p.querySelector('h4');if(head)head.textContent='Main OPSI hoon \\u2014 boliye, kaam ho jayega';
  const para=p.querySelector('p');if(para)para.remove();
  const log=document.createElement('div');log.id='aiLog';
  const bar=document.createElement('div');bar.id='aiBar';
  bar.innerHTML='<input id="aiIn" placeholder="OPSI se poochiye\\u2026 (jaise: Lalit ka hisaab?)" autocomplete="off"><button id="aiGo">\\u27A4</button>';
  const sug=p.querySelector('.opsi-sug');
  p.insertBefore(log,sug);p.insertBefore(bar,sug);
  const send=()=>{const v=$('#aiIn').value.trim();if(!v)return;$('#aiIn').value='';opsiAsk(v);hap('tap')};
  $('#aiGo').addEventListener('click',send);
  $('#aiIn').addEventListener('keydown',e=>{if(e.key==='Enter')send()});
  /* suggestions ab brain se */
  const sh=$('#sugHisaab');if(sh){const n=sh.cloneNode(true);sh.parentNode.replaceChild(n,sh);n.addEventListener('click',()=>opsiAsk('Lalit ka hisaab kaisa hai?'))}
  const sr=$('#sugReceipt');if(sr){const n=sr.cloneNode(true);sr.parentNode.replaceChild(n,sr);n.addEventListener('click',()=>{magicReceipt();})}
  /* greeting */
  const hello=document.createElement('div');hello.className='aimsg bot';
  hello.innerHTML=aiKey()?'OPSI online \\u2713 \\u2014 poochiye kuch bhi: hisaab, rate, trips, SAMAAN\\u2026':'Namaste! Mera dimaag chalu karne ke liye <b>Settings \\u2192 OPSI Brain</b> mein OpenAI key daal dijiye.';
  log.appendChild(hello);
})();
/* ---------- Settings: OPSI Brain key ---------- */
(function initKeyUI(){
  const sec=$('#v-settings');if(!sec)return;
  const card=document.createElement('div');card.className='card';card.style.marginTop='14px';
  card.innerHTML='<div class="card-head"><span class="card-eyebrow">OPSI Brain \\u2014 OpenAI key</span><span class="pill '+(aiKey()?'p-live':'p-wait')+'" id="aiKeySt" style="margin-left:auto">'+(aiKey()?'CONNECTED':'KEY NAHI')+'</span></div>'+
   '<div style="display:flex;gap:9px;margin-top:10px;flex-wrap:wrap">'+
   '<input id="aiKeyIn" type="password" placeholder="sk-..." style="flex:1;min-width:220px;background:rgba(255,255,255,.05);border:1px solid var(--line);border-radius:12px;padding:12px 13px;color:var(--ink);font-family:var(--font-m)" value="'+esc(aiKey())+'">'+
   '<button class="btn primary" id="aiKeySave">Save</button><button class="btn" id="aiKeyTest">Test</button></div>'+
   '<div class="gsthint" style="margin-top:9px">Key sirf aapke device par save hoti hai (localStorage) \\u2014 model: gpt-4o-mini \\u00B7 voice mic agli APK ke saath</div>';
  sec.appendChild(card);
  $('#aiKeySave').addEventListener('click',()=>{aiSetKey($('#aiKeyIn').value);
    $('#aiKeySt').textContent=aiKey()?'CONNECTED':'KEY NAHI';$('#aiKeySt').className='pill '+(aiKey()?'p-live':'p-wait');
    hap('save');toast(aiKey()?'OPSI ka dimaag chalu \\u2713':'Key hata di')});
  $('#aiKeyTest').addEventListener('click',async()=>{
    const k=$('#aiKeyIn').value.trim();if(!k){toast('Pehle key daaliye');return}
    toast('Test kar raha hoon\\u2026');
    try{const r=await fetch('https://api.openai.com/v1/models/gpt-4o-mini',{headers:{'Authorization':'Bearer '+k}});
      toast(r.ok?'\\u2713 Key sahi hai \\u2014 OPSI taiyaar':'\\u2715 '+(r.status===401?'Key galat hai':'Error '+r.status));hap(r.ok?'save':'reject');
    }catch(e){toast('Net error \\u2014 connection dekh lijiye')}
  });
})();


/* ============================================================
   v60c — OPSI VOICE · bolta hai (TTS) · sunne ka loop taiyaar
   ============================================================ */
let VOICE={mode:false,rec:null,stream:null,ac:null,an:null,speaking:false,listening:false,stopT:null,audio:null};
function vState(t){const el=$('#vState');if(el)el.textContent=t}
function ttsSpeak(text,done){
  const key=aiKey();if(!key||!text){done&&done();return}
  const clean=String(text).replace(/<[^>]+>/g,'').replace(/[*_#\`]/g,'');
  VOICE.speaking=true;vState('bol raha hoon\\u2026');
  fetch('https://api.openai.com/v1/audio/speech',{
    method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
    body:JSON.stringify({model:'gpt-4o-mini-tts',voice:'nova',input:clean,response_format:'mp3',
      instructions:'Speak in warm Hinglish (Hindi-English mix), natural Indian assistant tone, medium pace.'})
  }).then(r=>{if(!r.ok)throw 0;return r.blob()}).then(b=>{
    const a=new Audio(URL.createObjectURL(b));VOICE.audio=a;
    a.onended=()=>{VOICE.speaking=false;done&&done()};
    a.onerror=()=>{VOICE.speaking=false;done&&done()};
    a.play().catch(()=>{VOICE.speaking=false;done&&done()});
  }).catch(()=>{VOICE.speaking=false;vState('');done&&done()});
}
function vStopAll(){
  VOICE.mode=false;VOICE.listening=false;
  try{if(VOICE.rec&&VOICE.rec.state!=='inactive')VOICE.rec.stop()}catch(e){}
  try{if(VOICE.stream)VOICE.stream.getTracks().forEach(t=>t.stop())}catch(e){}
  try{if(VOICE.audio)VOICE.audio.pause()}catch(e){}
  clearTimeout(VOICE.stopT);
  const mb=$('#aiMic');if(mb)mb.classList.remove('live');
  const vz=$('#vizWrap');if(vz)vz.classList.remove('on');
  vState('');
}
async function startListening(){
  const key=aiKey();if(!key){toast('Pehle Settings mein key daaliye');return}
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){
    voiceUnavailable();return}
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    VOICE.stream=stream;VOICE.listening=true;VOICE.mode=true;
    $('#aiMic').classList.add('live');$('#vizWrap').classList.add('on');
    vState('sun raha hoon\\u2026 boliye');buzz([8,26,8]);
    /* analyser — silence par auto-stop + waveform */
    const AC=window.AudioContext||window.webkitAudioContext;
    VOICE.ac=new AC();const src=VOICE.ac.createMediaStreamSource(stream);
    VOICE.an=VOICE.ac.createAnalyser();VOICE.an.fftSize=256;src.connect(VOICE.an);
    const buf=new Uint8Array(VOICE.an.frequencyBinCount);
    let spoke=false,quietSince=0;
    (function meter(){
      if(!VOICE.listening)return;
      VOICE.an.getByteTimeDomainData(buf);
      let rms=0;for(let i=0;i<buf.length;i++){const v=(buf[i]-128)/128;rms+=v*v}
      rms=Math.sqrt(rms/buf.length);
      const bars=$$('#vizWrap i');const lvl=Math.min(1,rms*7);
      bars.forEach((b,i2)=>{b.style.height=(4+lvl*26*Math.abs(Math.sin(Date.now()/90+i2)))+'px'});
      const now=Date.now();
      if(rms>0.045){spoke=true;quietSince=0}
      else if(spoke){if(!quietSince)quietSince=now;
        if(now-quietSince>1300){stopAndSend();return}}
      requestAnimationFrame(meter);
    })();
    const chunks=[];
    const mime=MediaRecorder.isTypeSupported('audio/webm')?'audio/webm':'';
    VOICE.rec=new MediaRecorder(stream,mime?{mimeType:mime}:{});
    VOICE.rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
    VOICE.rec.onstop=async()=>{
      try{VOICE.stream.getTracks().forEach(t=>t.stop())}catch(e){}
      if(!VOICE.mode)return;
      const blob=new Blob(chunks,{type:mime||'audio/webm'});
      if(blob.size<2200){vState('kuch sunayi nahi diya \\u2014 mic dabakar dobara boliye');VOICE.listening=false;$('#aiMic').classList.remove('live');return}
      vState('samajh raha hoon\\u2026');
      const fd=new FormData();
      fd.append('file',blob,'say.webm');
      fd.append('model','gpt-4o-mini-transcribe');
      fd.append('prompt','Hinglish business talk: hisaab, SAMAAN, SOMANY, baht, rate, Lalit, trips, Bangkok');
      try{
        const r=await fetch('https://api.openai.com/v1/audio/transcriptions',{method:'POST',headers:{'Authorization':'Bearer '+aiKey()},body:fd});
        const j=await r.json();
        VOICE.listening=false;$('#aiMic').classList.remove('live');$('#vizWrap').classList.remove('on');
        if(j.text&&j.text.trim()){opsiAsk(j.text.trim())}
        else vState('samajh nahi aaya \\u2014 dobara try kariye');
      }catch(e){vState('net error');VOICE.listening=false}
    };
    VOICE.rec.start();
    VOICE.stopT=setTimeout(()=>{stopAndSend()},14000);
    function stopAndSend(){
      clearTimeout(VOICE.stopT);
      if(VOICE.rec&&VOICE.rec.state!=='inactive'){vState('');VOICE.listening=false;VOICE.rec.stop()}
    }
    $('#aiMic').onclick=()=>{if(VOICE.listening){stopAndSend()}else{vStopAll();hap('tick')}};
  }catch(e){
    voiceUnavailable();
  }
}
function voiceUnavailable(){
  vStopAll();
  const log=$('#aiLog');
  if(log){const d=document.createElement('div');d.className='aimsg bot';
    d.innerHTML='\\uD83C\\uDF99 Mic is APK mein enabled nahi hai \\u2014 <b>ek nayi APK</b> banani hogi (RECORD_AUDIO permission manifest mein jaati hai, OTA se nahi). Tab tak: <b>type kariye, main BOL kar jawab dunga</b> \\uD83D\\uDD0A. Nayi APK ka command main de chuka hoon.';
    log.appendChild(d);log.scrollTop=log.scrollHeight}
  toast('Mic ke liye nayi APK chahiye \\u2014 par OPSI ab bolta hai \\uD83D\\uDD0A');
}
/* mic + speaker UI in aiBar */
(function initVoiceUI(){
  const bar=$('#aiBar');if(!bar)return;
  const mic=document.createElement('button');mic.id='aiMic';mic.title='Boliye';
  mic.innerHTML='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><path d="M12 19v3"/></svg>';
  bar.insertBefore(mic,$('#aiGo'));
  mic.addEventListener('click',()=>{if(!VOICE.listening){startListening()}});
  const viz=document.createElement('div');viz.id='vizWrap';
  viz.innerHTML='<i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><span id="vState"></span>';
  bar.parentNode.insertBefore(viz,bar);
  const spk=document.createElement('button');spk.id='aiSpk';
  spk.className=localStorage.getItem('opsi_mute')==='1'?'off':'';
  spk.title='OPSI ki awaaz on/off';
  spk.innerHTML='\\uD83D\\uDD0A';
  bar.appendChild(spk);
  spk.addEventListener('click',()=>{
    const m=localStorage.getItem('opsi_mute')==='1'?'0':'1';
    localStorage.setItem('opsi_mute',m);spk.classList.toggle('off',m==='1');
    if(m==='1'&&VOICE.audio)try{VOICE.audio.pause()}catch(e){}
    toast(m==='1'?'OPSI chup \\u2014 sirf text':'OPSI ab bolega \\uD83D\\uDD0A');hap('toggle');
  });
})();
/* opsiAsk hook: reply aane par bolo + handsfree loop */
(function(){
  const orig=opsiAsk;
  window.__opsiSay=function(text){
    if(localStorage.getItem('opsi_mute')==='1')return;
    ttsSpeak(text,()=>{vState('');if(VOICE.mode){setTimeout(()=>{if(!VOICE.speaking&&!VOICE.listening)startListening()},350)}});
  };
})();

/* ============================================================
   v61 — PHASE 1 · CORE UX FIXES (purely additive)
   ============================================================ */
(function v61(){
  var S=document.createElement('style');S.id='v61css';
  S.textContent=[
    /* --- 1. Mode + company chip ka asli gradient highlight --- */
    '.mode-btn.sel::before{display:none!important}',
    '.mode-btn{position:relative;z-index:1;border-radius:999px;overflow:hidden;transition:background .28s var(--ease),color .2s}',
    '.mode-btn.sel{color:#fff!important;background:linear-gradient(120deg,#8b5cf6,#22d3ee)!important;box-shadow:0 6px 22px rgba(139,92,246,.45)}',
    '.mode-wrap[data-mode="cash"] .mode-btn[data-mode="cash"].sel{background:linear-gradient(120deg,#f472b6,#8b5cf6)!important;box-shadow:0 6px 22px rgba(244,114,182,.42)}',
    '.co-btn.sel{color:#fff!important;background:linear-gradient(120deg,#22c55e,#22d3ee)!important;border-color:transparent!important;box-shadow:0 6px 20px rgba(34,197,94,.30)}',
    '.mv-tab.sel{color:#fff!important;background:linear-gradient(120deg,#8b5cf6,#22d3ee)!important;border-color:transparent!important}',
    /* --- 2. Tap glitch: focus/active ka square poori tarah gayab --- */
    '*{outline:none!important;-webkit-tap-highlight-color:transparent!important}',
    'button::-moz-focus-inner{border:0!important;padding:0!important}',
    '.nav-item,.dock-item,.sheet-item,.mode-btn,.co-btn,.mv-tab,.btn,.chip{-webkit-touch-callout:none;-webkit-user-select:none;user-select:none}',
    '.nav-item:focus,.nav-item:active,.dock-item:focus{background:transparent!important;box-shadow:none!important}',
    '.nav-glow{will-change:transform;backface-visibility:hidden}',
    /* --- 3. Sabse upar ki line hatao --- */
    '.topbar{border-bottom:none!important;box-shadow:none!important}',
    '#app,body,html{border-top:none!important;box-shadow:none!important}',
    '#app::before,body::before{display:none!important}',
    /* --- 4. Calendar screen ke beech, hamesha upar --- */
    '#calPop.v61c{top:50%!important;left:50%!important;transform:translate(-50%,-50%) scale(.96)!important;z-index:9999!important}',
    '#calPop.v61c.open{transform:translate(-50%,-50%) scale(1)!important}',
    '#calVeil{position:fixed;inset:0;z-index:9998;background:rgba(4,6,14,.55);backdrop-filter:blur(3px);opacity:0;pointer-events:none;transition:opacity .25s}',
    '#calVeil.on{opacity:1;pointer-events:auto}',
    /* --- 5. Naya trip flash --- */
    '.mvcard.v61new{animation:v61flash 2.4s var(--ease) 1}',
    '@keyframes v61flash{0%{box-shadow:0 0 0 0 rgba(34,211,238,.75)}60%{box-shadow:0 0 0 14px rgba(34,211,238,0)}100%{box-shadow:0 0 0 0 rgba(34,211,238,0)}}'
  ].join(' ');
  document.head.appendChild(S);

  /* ---------- Mode / company / tab highlight ko har render par sync rakho ---------- */
  function v61sync(){
    try{
      var m=(typeof BOOK!=='undefined'&&BOOK.mode==='cash')?'cash':'business';
      $$('.mode-wrap').forEach(function(w){
        w.setAttribute('data-mode',m);
        w.querySelectorAll('.mode-btn').forEach(function(b){b.classList.toggle('sel',b.dataset.mode===m)});
      });
      $$('.mv-tab').forEach(function(t){t.classList.toggle('sel',t.dataset.dir===(typeof mvDir!=='undefined'?mvDir:'out'))});
    }catch(e){}
  }
  document.addEventListener('click',function(){setTimeout(v61sync,30)},true);
  setTimeout(v61sync,400);
  window.__v61sync=v61sync;

  /* ---------- Bulletproof calendar (screen ke beech, veil ke saath) ---------- */
  var pop=$('#calPop'),grid=$('#calGrid'),ttl=$('#calTitle');
  if(pop&&grid&&ttl){
    pop.classList.add('v61c');
    var veil=document.createElement('div');veil.id='calVeil';document.body.appendChild(veil);
    var MO=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var DW=['S','M','T','W','T','F','S'];
    var cur=new Date(),tgt=null,sel=null;
    function draw(){
      var y=cur.getFullYear(),m=cur.getMonth(),td=new Date();
      ttl.textContent=MO[m]+' '+y;
      var first=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate(),h='';
      DW.forEach(function(d){h+='<span class="dow">'+d+'</span>'});
      for(var i=0;i<first;i++)h+='<span></span>';
      for(var d=1;d<=days;d++){
        var isT=(d===td.getDate()&&m===td.getMonth()&&y===td.getFullYear());
        var isS=(sel&&d===sel.getDate()&&m===sel.getMonth()&&y===sel.getFullYear());
        h+='<button class="cal-day'+(isT?' today':'')+(isS?' sel':'')+'" data-d="'+d+'">'+d+'</button>';
      }
      grid.innerHTML=h;
    }
    function open(inp){tgt=inp;sel=null;cur=new Date();draw();pop.classList.add('open');veil.classList.add('on');try{hap('tap')}catch(e){}}
    function shut(){pop.classList.remove('open');veil.classList.remove('on');tgt=null}
    window.__calOpen=open;window.__calShut=shut;
    /* capture phase — koi doosra handler rok na sake */
    document.addEventListener('pointerdown',function(e){
      var f=e.target.closest&&e.target.closest('.datefield');
      if(f){e.preventDefault();e.stopPropagation();open(f)}
    },true);
    veil.addEventListener('click',shut);
    grid.addEventListener('click',function(e){
      var d=e.target.closest('.cal-day');if(!d||!tgt)return;
      sel=new Date(cur.getFullYear(),cur.getMonth(),+d.dataset.d);
      tgt.value=d.dataset.d+' '+MO[cur.getMonth()]+' '+cur.getFullYear();
      tgt.dispatchEvent(new Event('input',{bubbles:true}));
      tgt.dispatchEvent(new Event('change',{bubbles:true}));
      draw();try{hap('save')}catch(e2){}
      setTimeout(shut,240);
    });
    var pv=$('#calPrev'),nx=$('#calNext');
    if(pv)pv.addEventListener('click',function(e){e.stopPropagation();cur.setMonth(cur.getMonth()-1);draw()});
    if(nx)nx.addEventListener('click',function(e){e.stopPropagation();cur.setMonth(cur.getMonth()+1);draw()});
  }

  /* ---------- Naya trip save hone ke baad wo turant dikhe ---------- */
  var tg=$('#tpGo');
  if(tg)tg.addEventListener('click',function(){
    setTimeout(function(){
      try{
        if(typeof mvDir!=='undefined')mvDir='out';
        $$('.mv-tab').forEach(function(t){t.classList.toggle('sel',t.dataset.dir==='out')});
        if(typeof renderMoves==='function')renderMoves();
        var v=$('#v-trips');if(v&&!v.classList.contains('on')&&typeof go==='function')go('trips');
        var c=document.querySelector('#mvList .mvcard');
        if(c){c.classList.add('v61new');c.scrollIntoView({behavior:'smooth',block:'center'})}
      }catch(e){}
    },90);
  });

  /* ---------- Pinch zoom poori tarah band ---------- */
  ['touchstart','touchmove'].forEach(function(ev){
    document.addEventListener(ev,function(e){if(e.touches&&e.touches.length>1)e.preventDefault()},{passive:false,capture:true});
  });
  document.addEventListener('wheel',function(e){if(e.ctrlKey)e.preventDefault()},{passive:false,capture:true});
  var vp=document.querySelector('meta[name=viewport]');
  if(vp)vp.setAttribute('content','width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover');
})();

/* ============================================================
   v62 — PHASE 1b · CUSTOM DROPDOWN + ASLI TAIL FIN (additive)
   ============================================================ */
(function v62css(){
  var S=document.createElement('style');S.id='v62css';
  S.textContent=[
    /* ---- native select chhupao, custom button dikhao ---- */
    'select.v62hid{position:absolute!important;opacity:0!important;width:1px!important;height:1px!important;pointer-events:none!important;z-index:-1!important}',
    '.selx{display:flex;align-items:center;gap:10px;width:100%;text-align:left;',
      'background:rgba(255,255,255,.05);border:1px solid var(--line);border-radius:14px;',
      'padding:13px 14px;color:var(--ink);font-family:var(--font-b);font-size:15px;font-weight:600;',
      'transition:border-color .2s,background .2s}',
    'html[data-theme="light"] .selx{background:rgba(255,255,255,.7)}',
    '.selx.open{border-color:var(--violet);background:rgba(139,92,246,.10)}',
    '.selx .sxt{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.selx .sxt.ph{color:var(--faint);font-weight:500}',
    '.selx .sxc{flex:none;width:9px;height:9px;border-right:2px solid var(--muted);border-bottom:2px solid var(--muted);',
      'transform:rotate(45deg) translate(-2px,-2px);transition:transform .25s var(--ease)}',
    '.selx.open .sxc{transform:rotate(-135deg) translate(-3px,-3px)}',
    /* ---- dropdown sheet ---- */
    '#sxVeil{position:fixed;inset:0;z-index:9990;background:rgba(4,6,14,.6);backdrop-filter:blur(4px);opacity:0;pointer-events:none;transition:opacity .22s}',
    '#sxVeil.on{opacity:1;pointer-events:auto}',
    '#sxPop{position:fixed;z-index:9991;left:50%;top:50%;transform:translate(-50%,-50%) scale(.95);',
      'width:min(420px,90vw);max-height:70vh;overflow-y:auto;border-radius:22px;padding:8px;',
      'background:var(--glass-2);backdrop-filter:blur(26px);border:1px solid rgba(139,92,246,.35);',
      'box-shadow:var(--shadow);opacity:0;pointer-events:none;transition:opacity .22s,transform .22s var(--ease)}',
    '#sxPop.on{opacity:1;pointer-events:auto;transform:translate(-50%,-50%) scale(1)}',
    '#sxPop .sxh{font-family:var(--font-m);font-size:10px;letter-spacing:2.5px;color:var(--faint);',
      'font-weight:700;padding:10px 14px 8px;text-transform:uppercase}',
    '#sxPop .sxo{display:flex;align-items:center;gap:10px;padding:13px 14px;border-radius:14px;',
      'font-size:15px;font-weight:600;color:var(--ink);cursor:pointer;transition:background .15s}',
    '#sxPop .sxo:active{background:rgba(139,92,246,.18)}',
    '#sxPop .sxo.sel{background:linear-gradient(120deg,rgba(139,92,246,.30),rgba(34,211,238,.20));',
      'box-shadow:inset 0 0 0 1px rgba(139,92,246,.45)}',
    '#sxPop .sxo .tick{margin-left:auto;color:var(--cyan);font-weight:800;opacity:0}',
    '#sxPop .sxo.sel .tick{opacity:1}',
    /* ---- asli tail fin (HTML — WebView mein pakka render hota hai) ---- */
    '.fin2{position:relative;display:inline-block;flex:none;',
      'height:var(--h,32px);width:calc(var(--h,32px) * .92);',
      'background:linear-gradient(155deg,var(--c1,#8b5cf6) 0%,var(--c1,#8b5cf6) 52%,var(--c2,#22d3ee) 52%,var(--c2,#22d3ee) 100%);',
      '-webkit-clip-path:polygon(58% 0,100% 0,100% 100%,0 100%);clip-path:polygon(58% 0,100% 0,100% 100%,0 100%);',
      'filter:drop-shadow(0 3px 8px rgba(0,0,0,.5))}',
    '.fin2 img{position:absolute;right:6%;top:26%;width:62%;height:44%;object-fit:contain;',
      'background:#fff;border-radius:3px;padding:2px}',
    '.finb{display:inline-flex;align-items:center;gap:8px;vertical-align:middle}',
    '.finb .fno{font-family:var(--font-m);font-weight:800;font-size:12px;letter-spacing:.5px}'
  ].join('');
  document.head.appendChild(S);
})();

/* ---------- Tail fin — HTML version (hoisted override) ---------- */
function finBadge(fl,size){
  if(!fl)return '';
  var code=airlineOf(fl)||'IATA';
  var lv=(typeof LIVERY!=='undefined'&&LIVERY[code])||['#8b5cf6','#22d3ee'];
  var s=size||32;
  var uri=logoURI(LOGOS[code]?code:'IATA');
  return '<span class="finb"><span class="fin2" style="--h:'+s+'px;--c1:'+lv[0]+';--c2:'+lv[1]+'">'+
    '<img src="'+uri+'" alt=""></span><span class="fno">'+esc(fl)+'</span></span>';
}

/* ---------- Custom dropdown engine ---------- */
(function v62select(){
  var veil=document.createElement('div');veil.id='sxVeil';
  var pop=document.createElement('div');pop.id='sxPop';
  document.body.appendChild(veil);document.body.appendChild(pop);
  var active=null;

  function labelOf(sel){
    var o=sel.options[sel.selectedIndex];
    if(!o)return {t:sel.getAttribute('data-ph')||'Chuniye',ph:true};
    var t=(o.text||'').trim();
    if(!t||o.value==='')return {t:t||sel.getAttribute('data-ph')||'Chuniye',ph:true};
    return {t:t,ph:false};
  }
  function paint(sel){
    var btn=sel.__sx;if(!btn)return;
    var L=labelOf(sel);
    var span=btn.querySelector('.sxt');
    span.textContent=L.t;span.classList.toggle('ph',L.ph);
  }
  function shut(){
    pop.classList.remove('on');veil.classList.remove('on');
    if(active&&active.__sx)active.__sx.classList.remove('open');
    active=null;
  }
  function open(sel){
    active=sel;sel.__sx.classList.add('open');
    var head=(sel.closest('.field')&&sel.closest('.field').querySelector('label'));
    var h=head?head.textContent.trim():'Chuniye';
    var html='<div class="sxh">'+esc(h)+'</div>';
    for(var i=0;i<sel.options.length;i++){
      var o=sel.options[i];
      html+='<div class="sxo'+(i===sel.selectedIndex?' sel':'')+'" data-i="'+i+'">'+
        '<span>'+esc(o.text)+'</span><span class="tick">&#10003;</span></div>';
    }
    pop.innerHTML=html;
    pop.classList.add('on');veil.classList.add('on');
    try{hap('tap')}catch(e){}
    var s=pop.querySelector('.sxo.sel');if(s)setTimeout(function(){s.scrollIntoView({block:'center'})},40);
  }
  pop.addEventListener('click',function(e){
    var o=e.target.closest('.sxo');if(!o||!active)return;
    var sel=active;
    sel.selectedIndex=+o.dataset.i;
    paint(sel);
    sel.dispatchEvent(new Event('input',{bubbles:true}));
    sel.dispatchEvent(new Event('change',{bubbles:true}));
    try{hap('save')}catch(e2){}
    shut();
  });
  veil.addEventListener('click',shut);

  function wrap(){
    var list=document.querySelectorAll('select:not(.v62hid)');
    for(var i=0;i<list.length;i++){
      var sel=list[i];
      sel.classList.add('v62hid');
      var btn=document.createElement('button');
      btn.type='button';btn.className='selx';
      btn.innerHTML='<span class="sxt"></span><span class="sxc"></span>';
      btn.addEventListener('click',function(s){return function(ev){
        ev.preventDefault();ev.stopPropagation();
        if(active===s){shut()}else{shut();open(s)}
      }}(sel));
      sel.__sx=btn;
      if(sel.parentNode)sel.parentNode.insertBefore(btn,sel.nextSibling);
      paint(sel);
    }
  }
  function repaintAll(){
    var list=document.querySelectorAll('select.v62hid');
    for(var i=0;i<list.length;i++)if(list[i].__sx)paint(list[i]);
  }
  wrap();
  /* naye select ya nayi options aane par khud sync */
  new MutationObserver(function(){wrap();repaintAll()}).observe(document.body,{childList:true,subtree:true});
  document.addEventListener('change',function(e){
    if(e.target&&e.target.tagName==='SELECT')paint(e.target);
  },true);
  setInterval(repaintAll,900);
  window.__sxShut=shut;
})();

/* ---------- back gesture: dropdown/calendar pehle band ho ---------- */
(function(){
  var prev=window.__appBack;
  window.__appBack=function(){
    var p=document.getElementById('sxPop');
    if(p&&p.classList.contains('on')){window.__sxShut&&window.__sxShut();return}
    var c=document.getElementById('calPop');
    if(c&&c.classList.contains('open')){window.__calShut&&window.__calShut();return}
    prev&&prev();
  };
})();

/* ---------- build label ---------- */
(function(){
  try{
    var els=document.querySelectorAll('.chip');
    for(var i=0;i<els.length;i++){
      if(/BUILD\s*v\d+/i.test(els[i].textContent))els[i].innerHTML=els[i].innerHTML.replace(/v\d+/i,'v62');
    }
  }catch(e){}
  setTimeout(function(){try{if(typeof renderMoves==='function')renderMoves();if(typeof renderCorridor==='function')renderCorridor()}catch(e){}},600);
})();

/* ============================================================
   v63 — ASLI WORLD MAP (vector outline se bani mask) + logo wale planes
   ============================================================ */
const WM_IMG='data:image/png;base64,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';
(function v63css(){
  var S=document.createElement('style');S.id='v63css';
  S.textContent=[
    '.wmap{position:relative;width:100%;aspect-ratio:1200/486;border-radius:18px;overflow:hidden;',
      'background:radial-gradient(130% 120% at 68% 42%,#0d1436 0%,#080b1f 55%,#05070f 100%)}',
    '.wmap .wland{position:absolute;inset:0;',
      'background:linear-gradient(112deg,#4356c9 0%,#4f7fdd 42%,#5cc6e8 78%,#63dcc9 100%);',
      '-webkit-mask-image:url('+WM_IMG+');mask-image:url('+WM_IMG+');',
      '-webkit-mask-size:100% 100%;mask-size:100% 100%;',
      '-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;opacity:.92}',
    'html[data-theme="light"] .wmap{background:radial-gradient(130% 120% at 68% 42%,#dbe4f7,#eef3fc)}',
    'html[data-theme="light"] .wmap .wland{background:linear-gradient(112deg,#7d8fe0,#5fb6dc);opacity:1}',
    '.wmap .wsvg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}',
    '.wmap .wroute{fill:none;stroke:url(#wgr);stroke-width:2.4;stroke-linecap:round;',
      'stroke-dasharray:6 8;animation:dashmove 1.5s linear infinite;filter:drop-shadow(0 0 6px rgba(139,92,246,.7))}',
    '.wmap .wnode{position:absolute;transform:translate(-50%,-50%);display:flex;align-items:center;gap:6px;pointer-events:none}',
    '.wmap .wnode i{width:9px;height:9px;border-radius:50%;display:block;box-shadow:0 0 12px currentColor;background:currentColor}',
    '.wmap .wnode b{font-family:var(--font-m);font-size:10.5px;letter-spacing:1.6px;color:#e7ebff;text-shadow:0 2px 6px #000}',
    '.wmap .wpl{position:absolute;transform:translate(-50%,-50%);pointer-events:none;z-index:3}',
    '.wmap .wpl .ac{display:block;filter:drop-shadow(0 4px 10px rgba(0,0,0,.6))}',
    '.wmap .wtag{position:absolute;left:50%;top:100%;transform:translate(-50%,6px);',
      'display:flex;align-items:center;gap:6px;padding:3px 8px 3px 4px;border-radius:999px;',
      'background:rgba(8,11,28,.82);border:1px solid rgba(255,255,255,.16);backdrop-filter:blur(8px);white-space:nowrap}',
    '.wmap .wtag img{width:15px;height:13px;object-fit:contain;background:#fff;border-radius:3px;padding:1.5px}',
    '.wmap .wtag span{font-family:var(--font-m);font-size:10px;font-weight:800;color:#eaf0ff}',
    '.wmap .wcred{position:absolute;right:8px;bottom:6px;font-size:8px;letter-spacing:.4px;color:rgba(190,205,240,.30)}'
  ].join('');
  document.head.appendChild(S);
})();

/* lat/lon -> % (Miller cylindrical, map ke frame par calibrated) */
function wmX(lon){var v=((lon+168.3)%360+360)%360;return v/360*100}
function wmY(lat){var y=2176-859*1.25*Math.log(Math.tan((45+0.4*lat)*Math.PI/180));return (y-849)/2186*100}
const WM_CITY={DEL:[28.61,77.21],CCU:[22.57,88.36],BKK:[13.76,100.50]};
function wmPt(c){var T={DEL:[28.61,77.21],CCU:[22.57,88.36],BKK:[13.76,100.50]};var a=T[c];if(!a)return [0,0];return [wmX(a[1]),wmY(a[0])]}
/* quadratic arc in % space */
function wmCurve(a,b){var mx=(a[0]+b[0])/2,my=Math.min(a[1],b[1])-9;return {mx:mx,my:my}}
function wmAt(a,b,t){var c=wmCurve(a,b),u=1-t;
  return [u*u*a[0]+2*u*t*c.mx+t*t*b[0], u*u*a[1]+2*u*t*c.my+t*t*b[1]]}

function renderCorridor(){
  var host=$('#corrMap');if(!host)return;
  var live=DB.moves.filter(function(m){return m.kind==='carrier'&&(m.st==='HAWA MEIN'||m.st==='BOARDING AAJ'||(m.st&&m.st.indexOf('WAPSI')>-1))});
  var A=wmPt('DEL'),B=wmPt('BKK'),C=wmPt('CCU'),cv=wmCurve(A,B);
  var planes='';
  live.forEach(function(m,i){
    var wapsi=m.st.indexOf('WAPSI')>-1;
    var t=Math.max(.08,Math.min(.92,wapsi?1-(m.prog/100):(m.prog/100)));
    t=Math.max(.06,Math.min(.94,t+(i-(live.length-1)/2)*0.055));
    var p=wmAt(A,B,t),p2=wmAt(A,B,Math.min(.99,t+.02));
    /* % space ko pixel aspect se seedha karo taaki angle sahi rahe */
    var ang=Math.atan2((p2[1]-p[1])*0.405,(p2[0]-p[0]))*180/Math.PI+90;
    if(wapsi)ang+=180;
    var code=airlineOf(m.fl)||'IATA';
    var lv=(typeof LIVERY!=='undefined'&&LIVERY[code])||['#8b5cf6','#22d3ee'];
    var uri=logoURI(LOGOS[code]?code:'IATA');
    planes+='<div class="wpl" style="left:'+p[0]+'%;top:'+p[1]+'%">'+
      '<svg class="ac" width="40" height="40" viewBox="-30 -22 60 52" style="transform:rotate('+ang+'deg)">'+
        '<path d="M0 -18 C3.4 -18 4.6 -14.6 4.6 -10 L4.6 -2.6 L27 8 L27 13.4 L4.6 6.4 L4.6 14.6 L11 20 L11 24 L0 20.6 L-11 24 L-11 20 L-4.6 14.6 L-4.6 6.4 L-27 13.4 L-27 8 L-4.6 -2.6 L-4.6 -10 C-4.6 -14.6 -3.4 -18 0 -18 Z" fill="#eef2ff" stroke="'+lv[0]+'" stroke-width="1.7"/>'+
        '<path d="M0 -18 C3.4 -18 4.6 -14.6 4.6 -10 L4.6 -7 L-4.6 -7 L-4.6 -10 C-4.6 -14.6 -3.4 -18 0 -18 Z" fill="'+lv[0]+'"/>'+
        '<path d="M-5.4 14.6 L0 25 L5.4 14.6 Z" fill="'+lv[0]+'"/>'+
      '</svg>'+
      '<div class="wtag"><img src="'+uri+'" alt=""><span>'+esc(m.fl||m.who)+'</span></div>'+
      '</div>';
  });
  host.innerHTML='<div class="wmap"><div class="wland"></div>'+
    '<svg class="wsvg" viewBox="0 0 100 100" preserveAspectRatio="none">'+
      '<defs><linearGradient id="wgr" x1="0" y1="0" x2="1" y2="0">'+
      '<stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#f472b6"/></linearGradient></defs>'+
      '<path class="wroute" vector-effect="non-scaling-stroke" d="M '+A[0]+' '+A[1]+' Q '+cv.mx+' '+cv.my+' '+B[0]+' '+B[1]+'"/>'+
    '</svg>'+
    '<div class="wnode" style="left:'+A[0]+'%;top:'+A[1]+'%;color:#a78bfa"><i></i><b>DEL</b></div>'+
    '<div class="wnode" style="left:'+C[0]+'%;top:'+C[1]+'%;color:#22d3ee"><i style="width:7px;height:7px"></i><b style="font-size:9px">CCU</b></div>'+
    '<div class="wnode" style="left:'+B[0]+'%;top:'+B[1]+'%;color:#f472b6"><i></i><b>BKK</b></div>'+
    planes+
    '<div class="wcred">Map © Free Vector Maps</div>'+
    '</div>';
  var lg=$('#corrLegend');
  if(lg)lg.innerHTML=live.map(function(m){
    return '<span style="display:inline-flex;align-items:center;gap:8px">'+finBadge(m.fl,26)+
      '<b>'+esc(m.who)+'</b> · '+esc(m.st)+' · '+esc(m.eta||'')+'</span>'}).join('')||'<span>Abhi koi hawa mein nahi</span>';
  var cl=$('#corrLive');if(cl)cl.textContent=live.length+' LIVE';
}
setTimeout(function(){try{renderCorridor()}catch(e){}},500);

/* ============================================================
   v64 — BOOT ORDER (splash → asli biometric → dive), brief patch,
          data-0 glitch, build label
   ============================================================ */
(function v64css(){
  var S=document.createElement('style');S.id='v64css';
  S.textContent=[
    /* brief card ka chaukor dhabba: gol glow overflow:hidden se kat raha tha */
    '.brief::before{display:none!important}',
    '.brief{overflow:visible!important}',
    '.brief-card-fix{position:relative;overflow:hidden}',
    '.brief-card-fix::after{content:"";position:absolute;inset:-40% -20% auto auto;width:70%;height:170%;',
      'background:radial-gradient(closest-side,rgba(139,92,246,.13),transparent 72%);pointer-events:none;filter:blur(6px)}',
    /* auth stage */
    '#authMsg{min-height:20px}',
    '.v64scan{animation:v64pulse 1.1s ease-in-out infinite}',
    '@keyframes v64pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.55;transform:scale(.94)}}'
  ].join('');
  document.head.appendChild(S);
})();

/* ---------- BOOT v64: splash → asli fingerprint → dive-in ---------- */
function runBootCinema(){
  var boot=$('#boot'),msg=$('#bootMsg');
  if(!boot){return}
  var msgs=['OPSI jaag raha hai\u2026','Circuits garam ho rahe hain\u2026','Rates la raha hoon\u2026'];
  var i=0;var mi=setInterval(function(){i++;if(msg)msg.textContent=msgs[i%msgs.length]},600);
  var done=false;

  function finishAuth(){
    if(done)return;done=true;
    clearInterval(mi);
    var aw=$('#authWrap');if(aw)aw.classList.add('ok');
    var am=$('#authMsg');if(am)am.textContent='Pehchaan ho gayi \u2014 swagat hai, K Singh';
    buzz([20,50,20]);
    setTimeout(function(){
      boot.classList.remove('auth');
      setTimeout(function(){
        var fx=$('#diveFx');
        if(fx){var st='';for(var k=0;k<26;k++){st+='<i style="--a:'+(k*13.8)+'deg;animation-delay:'+(k%7*40)+'ms"></i>'}fx.innerHTML=st}
        boot.classList.add('dive');
        buzz([8,40,12,40,18,40,26]);
        setTimeout(function(){
          boot.classList.add('off');
          setTimeout(function(){boot.style.display='none'},520);
          /* data 0 par atak jaata tha — boot ke baad poora dobara render */
          try{renderAll()}catch(e){}
          try{countUp()}catch(e){}
          $$('#v-dashboard .card').forEach(function(c,idx){c.classList.add('wake');c.style.animationDelay=(idx*55)+'ms'});
          setTimeout(function(){$$('#v-dashboard .card').forEach(function(c){c.classList.remove('wake');c.style.animationDelay=''})},1800);
          setTimeout(function(){try{renderAll();countUp()}catch(e){}},900);
          setTimeout(briefShow,700);
        },860);
      },560);
    },650);
  }
  window.__v64finish=finishAuth;
  setTimeout(finishAuth,2500);

  var fp=$('#authFp');
  function askNative(){
    var am=$('#authMsg');
    if(fp)fp.classList.add('v64scan');
    if(am)am.textContent='Ungli rakhiye\u2026';
    if(window.__NATIVE&&window.__askBiometric){window.__askBiometric()}
    else{setTimeout(function(){if(fp)fp.classList.remove('v64scan');finishAuth()},900)}
  }
  /* native ka jawab */
  window.__authResult=function(okAuth,why){
    if(fp)fp.classList.remove('v64scan');
    if(okAuth){finishAuth();return}
    var am=$('#authMsg');
    if(am)am.textContent=(why==='no-hardware')
      ? 'Fingerprint set nahi hai \u2014 ID/password se aaiye'
      : 'Pehchaan nahi hui \u2014 dobara fingerprint dabaiye ya ID/password daaliye';
    buzz([26,40,26]);
  };

  /* phase 1: splash (animation chalne do) → phase 2: auth + asli biometric */
  setTimeout(function(){
    if(typeof reduced!=='undefined'&&reduced){boot.style.display='none';try{renderAll();countUp()}catch(e){}typeBrief();return}
    boot.classList.add('auth');
    if(msg)msg.textContent='';
    setTimeout(askNative,520);            /* fields aa jaayein, phir OS ka prompt */
  },1800);

  if(fp)fp.addEventListener('click',function(){if(!done)askNative()});
  var go=$('#authGo');
  if(go)go.addEventListener('click',function(){
    var u=$('#authUser'),am=$('#authMsg');
    if(!u||!u.value.trim()){if(am)am.textContent='ID daaliye \u2014 ya fingerprint dabaiye';buzz([26,40,26]);return}
    buzz(10);finishAuth();
  });
  var pw=$('#authPass');
  if(pw)pw.addEventListener('keydown',function(e){if(e.key==='Enter'&&go)go.click()});
}

/* ---------- data 0 ka safety net: pehla tap/scroll par ek re-render ---------- */
(function(){
  var did=false;
  function once(){if(did)return;did=true;try{renderAll();countUp()}catch(e){}}
  ['pointerdown','scroll','visibilitychange'].forEach(function(ev){
    document.addEventListener(ev,function(){setTimeout(once,60)},{once:true,capture:true});
  });
  setTimeout(once,4200);
})();

/* ---------- build label ---------- */
(function(){
  try{
    var els=document.querySelectorAll('.chip');
    for(var i=0;i<els.length;i++){
      if(/BUILD\s*v\d+/i.test(els[i].textContent))els[i].innerHTML=els[i].innerHTML.replace(/v\d+/i,'v64');
    }
  }catch(e){}
})();


/* ---------- v64 airline logo ---------- */
(function(){try{var t=document.createElement("style");t.id="v64logo";t.textContent=".finb{display:inline-flex!important;align-items:center!important;gap:6px!important;vertical-align:middle!important}.fin2{all:unset!important;display:inline-block!important;height:var(--h,22px)!important}.fin2::before,.fin2::after{display:none!important;content:none!important}.fin2 img{width:auto!important;height:100%!important;max-width:44px!important;object-fit:contain!important;display:block!important}.fno{font-size:11px!important;font-weight:700!important;line-height:1!important;white-space:nowrap!important}.wpl .ac{width:34px!important;height:34px!important}.wpl .wtag img{width:auto!important;height:13px!important;max-width:26px!important;object-fit:contain!important}";document.head.appendChild(t)}catch(e){}})();

/* --------- v65 boot watchdog --------- */
(function v65wd(){return;setTimeout(function(){try{if(window.__v64finish)window.__v64finish()}catch(e){}},6000)})();

/* --- v67 splash kill --- */
(function(){function k(){try{var b=document.getElementById("bootMsg");var o=b&&b.closest?b.closest("div[class*=boot],#boot,.splash,.bootwrap"):null;if(o&&o!==document.body)o.remove();else if(b)b.remove();var l=document.querySelectorAll("[id*=boot],[class*=boot],[class*=splash]");for(var i=0;i<l.length;i++){var e=l[i];var c=getComputedStyle(e);if(c.position==="fixed"&&e.offsetHeight>300)e.remove()}document.body.style.overflow="";}catch(e){}}setTimeout(k,3500)})();

/* --- v69: boot poora band --- */
(function(){function go(){try{var b=document.getElementById("boot");if(b){b.style.display="none";b.remove()}var a=document.getElementById("authWrap");if(a)a.remove();document.body.style.overflow="";try{renderAll()}catch(e){}try{countUp()}catch(e){}}catch(e){}}if(document.readyState!=="loading")setTimeout(go,300);else document.addEventListener("DOMContentLoaded",function(){setTimeout(go,300)});setTimeout(go,1200);setTimeout(go,2500)})();

(function(){try{var t=document.createElement("style");t.id="v71map";t.textContent=".wmap img{max-width:26px!important;max-height:14px!important;width:auto!important;height:13px!important;object-fit:contain!important}.wmap svg.ac,.wpl svg.ac{width:34px!important;height:34px!important}.wmap .wpl{max-width:60px!important}";document.head.appendChild(t)}catch(e){}})();

/* ---------- v72 map logo runtime fix ---------- */
(function v72fix(){function shrink(){try{var host=document.querySelector(".wmap")||document.querySelector("#corrMap")||document.body;var el=host.querySelectorAll("img,svg,image");for(var i=0;i<el.length;i++){var e=el[i];var w=e.getBoundingClientRect().width;if(w>60){e.style.setProperty("width","auto","important");e.style.setProperty("height","14px","important");e.style.setProperty("max-width","28px","important");e.style.setProperty("max-height","14px","important");e.style.setProperty("object-fit","contain","important")}}var c=document.querySelectorAll(".chip");for(var k=0;k<c.length;k++){if(/BUILD/i.test(c[k].textContent))c[k].textContent="BUILD v72"}}catch(e){}}var n=0;var t=setInterval(function(){shrink();if(++n>20)clearInterval(t)},700);setTimeout(shrink,400);document.addEventListener("click",function(){setTimeout(shrink,300)},true)})();
</script>
</body>
</html>
`;
