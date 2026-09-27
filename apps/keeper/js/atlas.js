// Author: Alex Picon <alexnpc@me.com>
// The isolation atlas: a glowing county dot-map of CDC's loneliness data plus a
// model card for the held-out backtest. Dots read like harbor lights — the
// hotter the light, the lonelier the county.

const BOUNDS = { lonMin: -125, lonMax: -66.5, latMin: 24, latMax: 49.5 };

function ramp(t) {
  // cool teal -> amber -> hot coral, ordered by luminance for accessibility
  const stops = [
    [0.0, [53, 182, 201]],
    [0.5, [255, 207, 92]],
    [1.0, [255, 77, 94]],
  ];
  t = Math.max(0, Math.min(1, t));
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [t0, c0] = stops[i - 1];
      const [t1, c1] = stops[i];
      const k = (t - t0) / (t1 - t0);
      return c0.map((v, j) => Math.round(v + (c1[j] - v) * k));
    }
  }
  return stops[2][1];
}

export function initAtlas(overlay) {
  let counties = [];
  let metrics = null;
  let mode = "loneliness";
  let hover = null;

  Promise.all([
    fetch("data/atlas.json").then((r) => r.json()).catch(() => ({ counties: [] })),
    fetch("data/metrics.json").then((r) => r.json()).catch(() => null),
  ]).then(([a, m]) => {
    counties = a.counties || [];
    metrics = m;
    build();
    draw();
  });

  const project = (c, w, h) => ({
    x: ((c.x - BOUNDS.lonMin) / (BOUNDS.lonMax - BOUNDS.lonMin)) * w,
    y: (1 - (c.y - BOUNDS.latMin) / (BOUNDS.latMax - BOUNDS.latMin)) * h,
  });

  let canvas, tip;

  function draw() {
    if (!canvas) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const g = canvas.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    g.globalCompositeOperation = "lighter";
    for (const c of counties) {
      if (c.x < BOUNDS.lonMin || c.x > BOUNDS.lonMax || c.y < BOUNDS.latMin || c.y > BOUNDS.latMax) continue;
      const t = mode === "loneliness" ? (c.l - 26) / 17 : c.r / 100;
      const [r, gr, b] = ramp(t);
      const p = project(c, w, h);
      const rad = 1.5 + t * 2.2;
      const grad = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad * 2.4);
      grad.addColorStop(0, `rgba(${r},${gr},${b},0.42)`);
      grad.addColorStop(0.5, `rgba(${r},${gr},${b},0.16)`);
      grad.addColorStop(1, `rgba(${r},${gr},${b},0)`);
      g.fillStyle = grad;
      g.beginPath();
      g.arc(p.x, p.y, rad * 2.4, 0, 7);
      g.fill();
    }
    g.globalCompositeOperation = "source-over";
  }

  function onMove(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    let best = null, bd = 12;
    for (const c of counties) {
      const p = project(c, rect.width, rect.height);
      const d = Math.hypot(p.x - mx, p.y - my);
      if (d < bd) { bd = d; best = c; }
    }
    hover = best;
    if (best) {
      tip.style.display = "block";
      tip.style.left = `${mx + 14}px`;
      tip.style.top = `${my + 12}px`;
      tip.innerHTML = `<b>${best.n} County, ${best.s}</b><span>${best.l}% report loneliness</span><span>${best.i}% no home internet · risk ${best.r.toFixed(0)}th pct</span>`;
    } else {
      tip.style.display = "none";
    }
  }

  function pct(v) { return `${Math.round(v * 100)}%`; }

  function card() {
    if (!metrics) return "";
    const r = metrics.results;
    const bars = metrics.importances.slice(0, 6)
      .map((f) => `<div class="imp"><span>${f.label}</span><i style="width:${Math.min(100, f.gain * 210)}%"></i><b>${pct(f.gain)}</b></div>`).join("");
    const lim = metrics.limitations.map((l) => `<li>${l}</li>`).join("");
    return `
      <div class="mcard">
        <h3>How well the map works <span class="chip">Held-out backtest</span></h3>
        <p class="lead">Trained only on structural Census data, with <b>every county's own state held out</b>, the model explains <b>${Math.round(r.model.r2 * 100)}%</b> of the variation in county loneliness (Spearman ${r.model.spearman}). The CDC's official Social Vulnerability Index explains ${Math.round(r.svi.r2 * 100)}%.</p>
        <table class="mtable"><thead><tr><th>Method</th><th>R²</th><th>Rank ρ</th><th>Flags loneliest 10%</th></tr></thead><tbody>
          <tr class="win"><td>Keeper model (LightGBM)</td><td>${r.model.r2}</td><td>${r.model.spearman}</td><td>${pct(r.model.decile_recall)}</td></tr>
          <tr><td>CDC Social Vulnerability Index</td><td>${r.svi.r2}</td><td>${r.svi.spearman}</td><td>${pct(r.svi.decile_recall)}</td></tr>
          <tr><td>No-internet heuristic</td><td>${r.no_internet.r2}</td><td>${r.no_internet.spearman}</td><td>${pct(r.no_internet.decile_recall)}</td></tr>
        </tbody></table>
        <div class="mgrid">
          <div><h4>What drives the prediction</h4>${bars}</div>
          <div><h4>Model card</h4>
            <p><b>Predicts:</b> county loneliness prevalence.<br><b>Data:</b> ${metrics.n_counties.toLocaleString()} counties, ${metrics.n_states} states + DC.<br><b>Validation:</b> ${metrics.validation}.<br><b>Target:</b> <a href="${metrics.target_url}" target="_blank" title="CDC PLACES county data">${metrics.target} ↗</a></p>
            <p class="lim-h">Limitations</p><ul class="lim">${lim}</ul>
          </div>
        </div>
      </div>`;
  }

  function build() {
    overlay.innerHTML = `
      <div class="panel atlas">
        <button class="x" data-close aria-label="Close">✕</button>
        <span class="chip">CDC PLACES 2025 · county loneliness</span>
        <h2>Where America is most <span>cut off</span></h2>
        <p class="atlas-sub">${counties.length.toLocaleString()} counties across the ${metrics ? metrics.n_states : 39} states + DC that field CDC's loneliness measure. Each light is a county; the hotter it burns, the lonelier it is.</p>
        <div class="toggle"><button data-mode="loneliness" class="on">Actual loneliness</button><button data-mode="risk">Model risk (held-out)</button></div>
        <div class="mapwrap"><canvas id="atlasCanvas"></canvas><div class="tip" id="atlasTip"></div>
          <div class="legend"><span>calmer</span><i class="grad"></i><span>lonelier</span></div>
        </div>
        ${card()}
      </div>`;
    canvas = overlay.querySelector("#atlasCanvas");
    tip = overlay.querySelector("#atlasTip");
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", () => { tip.style.display = "none"; });
    overlay.querySelectorAll("[data-mode]").forEach((b) =>
      (b.onclick = () => {
        mode = b.dataset.mode;
        overlay.querySelectorAll("[data-mode]").forEach((x) => x.classList.toggle("on", x === b));
        draw();
      }));
    overlay.querySelector("[data-close]").onclick = () => close();
    addEventListener("resize", draw);
  }

  function open() { overlay.style.display = "flex"; requestAnimationFrame(draw); }
  function close() { overlay.style.display = "none"; }
  return { open, close };
}
