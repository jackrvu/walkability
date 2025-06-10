import { useEffect, useRef, useState, useCallback } from "react";
import { usePanZoom } from "./usePanZoom";
import { loadArticles } from "../dataLoader";

/* ---------- TYPES ---------- */
interface ArticlePoint { id: number; x: number; y: number; cluster: number; }

/* ---------- CONFIG ---------- */
const SCALE = 57;        // ≈8 m spacing
const DOT_RADIUS = 4;         // px at zoom = 1
const BG_COLOR = "#121212";
const BORDER_CLR = "rgba(255,255,255,0.08)";

/* ---------- COMPONENT ---------- */
export default function WorldCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [articles, setArticles] = useState<ArticlePoint[]>([]);
    const { zoom, offset, handlers } = usePanZoom({ min: 0.2, max: 10 });

    /* load once */
    useEffect(() => { loadArticles().then(setArticles); }, []);

    /* draw */
    const draw = useCallback(() => {
        const cvs = canvasRef.current;
        if (!cvs) return;
        const ctx = cvs.getContext("2d")!;
        const { clientWidth: w, clientHeight: h } = cvs;
        const dpr = window.devicePixelRatio || 1;

        cvs.width = w * dpr;
        cvs.height = h * dpr;
        ctx.scale(dpr, dpr);

        ctx.fillStyle = BG_COLOR;
        ctx.fillRect(0, 0, w, h);

        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.scale(zoom, zoom);
        ctx.translate(-offset.x, -offset.y);

        /* optional map border */
        const mapW = 13.825 * SCALE, mapH = 11.457 * SCALE;
        ctx.strokeStyle = BORDER_CLR;
        ctx.lineWidth = 1 / zoom;
        ctx.strokeRect(-mapW / 2, -mapH / 2, mapW, mapH);

        /* points */
        articles.forEach(({ x, y, cluster }) => {
            ctx.fillStyle = pastel(cluster);
            ctx.beginPath();
            ctx.arc(x * SCALE, y * SCALE, DOT_RADIUS / zoom, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
    }, [articles, zoom, offset]);

    useEffect(draw, [draw]);
    useEffect(() => { window.addEventListener("resize", draw); return () => window.removeEventListener("resize", draw); }, [draw]);

    return (
        <canvas
            ref={canvasRef}
            style={{
                width: "100vw",
                height: "100vh",
                display: "block",
                cursor: handlers.dragging ? "grabbing" : "grab"
            }}
            {...handlers}
            tabIndex={0}
        />
    );
}

/* palette helper */
function pastel(id: number) {
    const h = (id * 4.4) % 360;
    return `hsl(${h} 55% 80%)`;
}
