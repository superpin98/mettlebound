"""
Genera wolf_animation.html con los frames del lobo incrustados en base64.
Ejecutar una vez: python tools/generate_wolf_widget.py
"""
import urllib.request
import base64
import json
from pathlib import Path

BASE = "https://backblaze.pixellab.ai/file/pixellab-characters/e6e95327-f518-497f-b571-d583e433bd7b/d3eb29ea-e4c9-4caf-871d-a9e1da00a883/animations/"
IDLE_ID  = "073afba8-b341-4da1-ac27-4ce77457c143"
GROWL_ID = "83b3272f-c6c6-4ab4-b026-d0f8d31f4690"

def fetch_b64(anim_id, idx):
    url = f"{BASE}{anim_id}/east/{idx}.png"
    with urllib.request.urlopen(url) as r:
        return "data:image/png;base64," + base64.b64encode(r.read()).decode()

print("Descargando frames...")
idle_b64  = [fetch_b64(IDLE_ID,  i) for i in range(8)]
growl_b64 = [fetch_b64(GROWL_ID, i) for i in range(6)]
print(f"  idle: {len(idle_b64)} frames, growl: {len(growl_b64)} frames")

idle_js  = json.dumps(idle_b64)
growl_js = json.dumps(growl_b64)

# Coordenadas fijas de recorte (calculadas sobre todos los frames)
CROP_X, CROP_Y, CROP_W, CROP_H, PAD, SCALE = 1, 15, 75, 52, 6, 4

html = f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Wolf Animation — Mettlebound</title>
<style>
  body {{ background:#1a1a2e; display:flex; flex-direction:column; align-items:center;
          justify-content:center; min-height:100vh; margin:0; font-family:monospace; color:#ccc; gap:16px; }}
  canvas {{ image-rendering:pixelated; border:1px solid #333; }}
  .controls {{ display:flex; gap:8px; }}
  button {{ padding:6px 20px; border-radius:6px; border:1px solid #444; background:#222;
             color:#ccc; cursor:pointer; font-family:monospace; font-size:13px; }}
  button.active {{ background:#1d3a5f; color:#7ab3ef; border-color:#3a6ea8; }}
  label {{ font-size:12px; color:#888; }}
  input[type=range] {{ width:120px; }}
</style>
</head>
<body>
<canvas id="c"></canvas>
<div class="controls">
  <button id="b-idle" class="active" onclick="setAnim('idle')">Idle</button>
  <button id="b-growl" onclick="setAnim('growl')">Growl</button>
</div>
<div style="display:flex;align-items:center;gap:10px">
  <label>Velocidad</label>
  <input type="range" min="2" max="20" value="8" id="fps" oninput="fps=+this.value;document.getElementById('fpsv').textContent=fps+' fps'">
  <label id="fpsv">8 fps</label>
</div>
<label id="info" style="font-size:11px;color:#555"></label>
<script>
const IDLE  = {idle_js};
const GROWL = {growl_js};
const CX={CROP_X},CY={CROP_Y},CW={CROP_W},CH={CROP_H},PAD={PAD},SC={SCALE};

const canvas = document.getElementById("c");
canvas.width  = (CW+PAD*2)*SC;
canvas.height = (CH+PAD*2)*SC;
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

let imgs = {{}};
async function preload(key, arr) {{
  imgs[key] = await Promise.all(arr.map(src=>{{ const i=new Image(); i.src=src; return new Promise(r=>i.onload=()=>r(i)); }}));
}}
await Promise.all([preload("idle",IDLE), preload("growl",GROWL)]);

let current="idle", frame=0, fps=8, last=0;
document.getElementById("info").textContent = "idle: frames 0-7 | growl: frames 8-13 | canvas " + canvas.width + "x" + canvas.height + "px";

function setAnim(a) {{
  current=a; frame=0;
  document.getElementById("b-idle").className  = a==="idle"  ? "active":"";
  document.getElementById("b-growl").className = a==="growl" ? "active":"";
}}

function tick(t) {{
  requestAnimationFrame(tick);
  if (t - last < 1000/fps) return;
  last = t;
  const frames = imgs[current];
  frame = (frame+1) % frames.length;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(frames[frame], CX, CY, CW, CH, PAD*SC, PAD*SC, CW*SC, CH*SC);
}}
requestAnimationFrame(tick);
</script>
</body>
</html>"""

out = Path(__file__).parent.parent / "wolf_animation.html"
out.write_text(html, encoding="utf-8")
print(f"✅ Guardado: {out.resolve()}")
print("   Abre wolf_animation.html en tu navegador para ver la animacion.")
