import React, { useEffect, useRef } from "react";
import articles from "../articles_clustered_normalized.json";

interface ArticlePoint {
    id: string;
    x: number;
    y: number;
    title: string;
}

interface Vec2 { x: number; y: number; }

/** ------------------------ Tunables ------------------------------------ */
const MAX_VISIBLE_UNITS = 2;         // half-width of the view in world units
const PLAYER_SPEED = 0.5;        // units / s
const FIXED_DT = 1 / 120;    // logic step (s) -- 120 Hz
const MAX_CATCHUP_STEPS = 5;          // safety against long tab-pause
/** ---------------------------------------------------------------------- */

const ArticleMap: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // *mutable* refs so the main loop doesn't re-subscribe on every tick
    const player = useRef<Vec2>({ x: 0, y: 0 });
    const keys = useRef<Set<string>>(new Set());
    const cursorWorldPos = useRef<Vec2>({ x: 0, y: 0 });
    const fpsRef = useRef<number>(0);

    /** Convert canvas size → world-unit scale so that 2·MAX_VISIBLE_UNITS fits */
    const scaleFor = (width: number, height: number) =>
        Math.min(width, height) / (2 * MAX_VISIBLE_UNITS);

    /* ---------------------------- Input ---------------------------------- */
    useEffect(() => {
        const dn = (e: KeyboardEvent) => keys.current.add(e.key.toLowerCase());
        const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
        window.addEventListener("keydown", dn);
        window.addEventListener("keyup", up);
        return () => { window.removeEventListener("keydown", dn); window.removeEventListener("keyup", up); };
    }, []);

    /* ------------------------ Resize canvas ------------------------------ */
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const fit = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
        fit();
        window.addEventListener("resize", fit);
        return () => window.removeEventListener("resize", fit);
    }, []);

    /* ------------------------- Mouse world-coords ------------------------ */
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const move = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            const scale = scaleFor(canvas.width, canvas.height);
            cursorWorldPos.current = {
                x: (e.clientX - rect.left - canvas.width / 2) / scale + player.current.x,
                y: (e.clientY - rect.top - canvas.height / 2) / scale + player.current.y,
            };
        };
        canvas.addEventListener("mousemove", move);
        return () => canvas.removeEventListener("mousemove", move);
    }, []);

    /* --------------------------- Game loop ------------------------------- */
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d")!;
        let lastTime = performance.now();
        let accumulator = 0;
        let frames = 0, fpsTime = 0;

        const update = (dt: number) => {
            /* ---- player movement (fixed dt) ---- */
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
            const { width: w, height: h } = canvas;
            const scale = scaleFor(w, h);
            ctx.clearRect(0, 0, w, h);

            /* ---- world transform so player is centered ---- */
            ctx.save();
            ctx.translate(w / 2 - player.current.x * scale,
                h / 2 - player.current.y * scale);

            /* ---- grid ---- */
            ctx.strokeStyle = "#e0e0e0";
            ctx.lineWidth = 0.5;
            const startX = Math.floor(player.current.x - MAX_VISIBLE_UNITS);
            const startY = Math.floor(player.current.y - MAX_VISIBLE_UNITS);
            const endX = Math.ceil(player.current.x + MAX_VISIBLE_UNITS);
            const endY = Math.ceil(player.current.y + MAX_VISIBLE_UNITS);

            for (let x = startX; x <= endX; x++) {
                ctx.beginPath();
                ctx.moveTo(x * scale, startY * scale);
                ctx.lineTo(x * scale, endY * scale);
                ctx.stroke();
            }
            for (let y = startY; y <= endY; y++) {
                ctx.beginPath();
                ctx.moveTo(startX * scale, y * scale);
                ctx.lineTo(endX * scale, y * scale);
                ctx.stroke();
            }

            /* ---- articles ---- */
            (articles as ArticlePoint[]).forEach(({ x, y }) => {
                const dx = x - player.current.x, dy = y - player.current.y;
                if (Math.abs(dx) <= MAX_VISIBLE_UNITS && Math.abs(dy) <= MAX_VISIBLE_UNITS) {
                    ctx.beginPath();
                    ctx.arc(x * scale, y * scale, 4, 0, Math.PI * 2);
                    ctx.fillStyle = "#007aff";
                    ctx.fill();
                }
            });

            /* ---- player ---- */
            ctx.beginPath();
            ctx.arc(player.current.x * scale, player.current.y * scale, 8, 0, Math.PI * 2);
            ctx.fillStyle = "#ff0000";
            ctx.fill();
            ctx.restore();

            /* ---- overlays (screen space) ---- */
            ctx.fillStyle = "rgba(0,0,0,.7)";
            ctx.fillRect(10, 10, 160, 32);
            ctx.font = "14px monospace";
            ctx.fillStyle = "white";
            const c = cursorWorldPos.current;
            ctx.fillText(`(${c.x.toFixed(2)}, ${c.y.toFixed(2)})`, 18, 32);

            ctx.fillStyle = "rgba(0,0,0,.7)";
            ctx.fillRect(w - 90, 10, 80, 32);
            ctx.fillStyle = "white";
            ctx.fillText(`${fpsRef.current} FPS`, w - 78, 32);
        };

        const loop = (now: number) => {
            const delta = (now - lastTime) / 1000;
            lastTime = now;
            accumulator += Math.min(delta, MAX_CATCHUP_STEPS * FIXED_DT); // clamp

            while (accumulator >= FIXED_DT) {
                update(FIXED_DT);
                accumulator -= FIXED_DT;
            }

            render();

            /* --- FPS counter --- */
            frames++; fpsTime += delta;
            if (fpsTime >= 1) { fpsRef.current = frames; frames = 0; fpsTime = 0; }

            requestAnimationFrame(loop);
        };

        requestAnimationFrame(loop);
    }, []);

    /* ----------------------------- JSX ----------------------------------- */
    return (
        <canvas
            ref={canvasRef}
            style={{
                display: "block",
                background: "#f9f9f9",
                border: "1px solid #ccc",
                width: "100vw",
                height: "100vh",
            }}
        />
    );
};

export default ArticleMap;