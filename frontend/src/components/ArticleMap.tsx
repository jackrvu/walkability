// src/components/ArticleMap.tsx
import React, { useEffect, useRef, useState } from "react";
import { inflate, inflateRaw } from "pako";
import articles from "../articles_clustered_normalized.json";

interface ArticlePoint { id: string; x: number; y: number; title: string; }
interface Vec2 { x: number; y: number; }

/* ------------------------ Tunables ------------------------ */
const MAX_VISIBLE_UNITS = 20;   // half-width of the viewport in world units
const PLAYER_SPEED = 20;   // units · s⁻¹
const FIXED_DT = 1 / 120; // logic-step (s) – 120 Hz
const MAX_CATCHUP_STEPS = 5;    // safety after long tab-pause
/* ---------------------------------------------------------- */

// tab20 palette for quick visual parity
const TAB20 = [
    "#1f77b4", "#aec7e8", "#ff7f0e", "#ffbb78", "#2ca02c", "#98df8a",
    "#d62728", "#ff9896", "#9467bd", "#c5b0d5", "#8c564b", "#c49c94",
    "#e377c2", "#f7b6d2", "#7f7f7f", "#c7c7c7", "#bcbd22", "#dbdb8d",
    "#17becf", "#9edae5"
];

/* ---------- Fetch + decode biome_grid.bin ----------------- */
async function loadBiomeGrid() {
    const res = await fetch(new URL("../biome_grid.bin", import.meta.url));
    if (!res.ok) throw new Error(`fetch biome_grid.bin → ${res.status}`);
    const buf = await res.arrayBuffer();
    if (buf.byteLength < 8) throw new Error("biome_grid.bin too small");

    const view = new DataView(buf);
    const W = view.getUint32(0, true);   // little-endian
    const H = view.getUint32(4, true);
    if (W === 0 || H === 0) throw new Error("Bad grid header");

    const compressed = new Uint8Array(buf, 8);

    // try zlib first, fall back to raw deflate
    let gridBytes: Uint8Array;
    try { gridBytes = inflate(compressed); }
    catch { gridBytes = inflateRaw(compressed); }

    if (gridBytes.byteLength !== W * H * 2)
        throw new Error(
            `Size mismatch: expected ${W * H * 2} bytes, got ${gridBytes.byteLength}`);

    const grid = new Uint16Array(
        gridBytes.buffer, gridBytes.byteOffset, gridBytes.byteLength / 2);
    console.log("Biome grid decoded:", { W, H, first10: Array.from(grid.slice(0, 10)) });
    return { W, H, grid } as const;
}

/* =================== React component ====================== */
const ArticleMap: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const keys = useRef(new Set<string>());
    const player = useRef<Vec2>({ x: 0, y: 0 });
    const fpsRef = useRef(0);

    /* ---- biome-grid state ---------------------------------- */
    const gridRef = useRef<Uint16Array | null>(null);
    const metaRef = useRef({ W: 0, H: 0, cellW: 1, cellH: 1 });
    const [ready, setReady] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    /* ---- compute world bounds from article scatter --------- */
    const [bounds] = useState(() => {
        const pts = articles as ArticlePoint[];
        return {
            minX: Math.min(...pts.map(p => p.x)),
            minY: Math.min(...pts.map(p => p.y)),
            maxX: Math.max(...pts.map(p => p.x)),
            maxY: Math.max(...pts.map(p => p.y)),
        };
    });

    // start player in the middle of the scatter
    useEffect(() => {
        player.current = {
            x: (bounds.minX + bounds.maxX) / 2,
            y: (bounds.minY + bounds.maxY) / 2,
        };
    }, [bounds]);

    /* ---- kick-off biome-grid fetch after bounds known ------ */
    useEffect(() => {
        loadBiomeGrid()
            .then(({ W, H, grid }) => {
                gridRef.current = grid;
                metaRef.current = {
                    W, H,
                    cellW: (bounds.maxX - bounds.minX) / W,
                    cellH: (bounds.maxY - bounds.minY) / H,
                };
                setReady(true);
            })
            .catch(e => setErr(e.message));
    }, [bounds]);

    /* ---- keyboard handling --------------------------------- */
    useEffect(() => {
        const dn = (e: KeyboardEvent) => keys.current.add(e.key.toLowerCase());
        const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
        window.addEventListener("keydown", dn);
        window.addEventListener("keyup", up);
        return () => {
            window.removeEventListener("keydown", dn);
            window.removeEventListener("keyup", up);
        };
    }, []);

    /* ---- resize canvas to viewport ------------------------- */
    useEffect(() => {
        const cvs = canvasRef.current!;
        const fit = () => {
            cvs.width = window.innerWidth;
            cvs.height = window.innerHeight;
        };
        fit();
        window.addEventListener("resize", fit);
        return () => window.removeEventListener("resize", fit);
    }, []);

    /* ------------ main game / render loop ------------------- */
    useEffect(() => {
        if (!ready) return;               // wait until grid decoded

        const cvs = canvasRef.current!;
        const ctx = cvs.getContext("2d")!;
        const scaleFor = (w: number, h: number) =>
            Math.min(w, h) / (2 * MAX_VISIBLE_UNITS);

        let last = performance.now(), acc = 0, frames = 0, fpsTime = 0;

        const step = (dt: number) => {
            const dir = { x: 0, y: 0 };
            if (keys.current.has("w")) dir.y -= 1;
            if (keys.current.has("s")) dir.y += 1;
            if (keys.current.has("a")) dir.x -= 1;
            if (keys.current.has("d")) dir.x += 1;
            const len = Math.hypot(dir.x, dir.y) || 1;
            player.current.x += (dir.x / len) * PLAYER_SPEED * dt;
            player.current.y += (dir.y / len) * PLAYER_SPEED * dt;
        };

        const render = () => {
            const { width: w, height: h } = cvs;
            const scale = scaleFor(w, h);
            ctx.clearRect(0, 0, w, h);

            /* center world so player sits in the middle of screen */
            ctx.save();
            ctx.translate(w / 2 - player.current.x * scale,
                h / 2 - player.current.y * scale);

            /* ---- visible grid-index window --------------------- */
            const { W, H, cellW, cellH } = metaRef.current;
            const gx0 = Math.max(0, Math.floor((player.current.x - MAX_VISIBLE_UNITS - bounds.minX) / cellW));
            const gy0 = Math.max(0, Math.floor((player.current.y - MAX_VISIBLE_UNITS - bounds.minY) / cellH));
            const gx1 = Math.min(W - 1, Math.ceil((player.current.x + MAX_VISIBLE_UNITS - bounds.minX) / cellW));
            const gy1 = Math.min(H - 1, Math.ceil((player.current.y + MAX_VISIBLE_UNITS - bounds.minY) / cellH));

            const grid = gridRef.current!;

            /* draw biome cells */
            for (let gy = gy0; gy <= gy1; ++gy) {
                for (let gx = gx0; gx <= gx1; ++gx) {
                    const id = grid[gy * W + gx];
                    const worldX = bounds.minX + gx * cellW;
                    const worldY = bounds.minY + gy * cellH;

                    ctx.fillStyle = TAB20[id % TAB20.length];
                    ctx.fillRect(worldX * scale, worldY * scale, cellW * scale, cellH * scale);

                    ctx.font = `${Math.max(0.35 * scale, 10)}px monospace`;
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillStyle = "#000";
                    ctx.fillText(String(id),
                        (worldX + cellW / 2) * scale,
                        (worldY + cellH / 2) * scale);
                }
            }

            /* draw article dots */
            (articles as ArticlePoint[]).forEach(({ x, y }) => {
                if (Math.abs(x - player.current.x) <= MAX_VISIBLE_UNITS &&
                    Math.abs(y - player.current.y) <= MAX_VISIBLE_UNITS) {
                    ctx.beginPath();
                    ctx.arc(x * scale, y * scale, 4, 0, Math.PI * 2);
                    ctx.fillStyle = "#007aff";
                    ctx.fill();
                }
            });

            /* draw player */
            ctx.beginPath();
            ctx.arc(player.current.x * scale, player.current.y * scale, 8, 0, Math.PI * 2);
            ctx.fillStyle = "#ff0000";
            ctx.fill();
            ctx.restore();

            /* FPS overlay */
            ctx.fillStyle = "rgba(0,0,0,.6)";
            ctx.fillRect(w - 90, 10, 80, 32);
            ctx.fillStyle = "#fff";
            ctx.font = "14px monospace";
            ctx.fillText(`${fpsRef.current} FPS`, w - 78, 32);
        };

        const loop = (now: number) => {
            const dt = (now - last) / 1000;
            last = now;
            acc += Math.min(dt, MAX_CATCHUP_STEPS * FIXED_DT);

            while (acc >= FIXED_DT) { step(FIXED_DT); acc -= FIXED_DT; }

            render();

            /* fps counter */
            frames++; fpsTime += dt;
            if (fpsTime >= 1) { fpsRef.current = frames; frames = 0; fpsTime = 0; }

            requestAnimationFrame(loop);
        };

        requestAnimationFrame(loop);
    }, [ready]);

    /* ----------------------- JSX ---------------------------- */
    return (
        <>
            <canvas ref={canvasRef}
                style={{
                    display: "block", width: "100vw", height: "100vh",
                    background: "#f9f9f9", border: "1px solid #ccc"
                }} />
            {err && (
                <div style={{
                    position: "fixed", top: "50%", left: "50%",
                    transform: "translate(-50%,-50%)",
                    background: "rgba(255,0,0,.1)",
                    padding: 20, borderRadius: 8, border: "1px solid red",
                    color: "red", zIndex: 1000
                }}>
                    Error loading biome grid: {err}
                </div>
            )}
            {!ready && !err && (
                <div style={{
                    position: "fixed", top: "50%", left: "50%",
                    transform: "translate(-50%,-50%)",
                    background: "rgba(0,0,0,.6)",
                    padding: 20, borderRadius: 8, color: "#fff"
                }}>
                    Loading biome grid…
                </div>
            )}
        </>
    );
};

export default ArticleMap;
