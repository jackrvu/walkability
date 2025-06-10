import React, { useEffect, useRef } from "react";
// Vite lets you import JSON directly; adjust the path if this file lives elsewhere
import articles from "../articles_clustered_normalized.json";

interface ArticlePoint {
    id: string;
    x: number;
    y: number;
    title: string;
    // extend with other fields as you flesh things out
}

/**
 * Maximum visible units in either direction from the center
 */
const MAX_VISIBLE_UNITS = 10;

/**
 * Camera movement speed (data‑space units per second).
 */
const SPEED = 1;

/**
 * A minimal 2‑D map that you can pan around with WASD.
 * It draws every article as a small blue dot on an <canvas> element.
 *
 * Skeleton‑style: no external rendering libs, ultra‑readable, ready for expansion.
 */
const ArticleMap: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    /**
     * Track the camera (world‑space position of the screen center).
     * Using useRef instead of state avoids forcing React re‑renders ~60×/s.
     */
    const camera = useRef({ x: 0, y: 0 });

    /**
     * Store which keys are currently pressed.
     */
    const keys = useRef<Set<string>>(new Set());

    /**
     * Calculate the appropriate scale based on screen dimensions
     * to maintain the desired FOV
     */
    const calculateScale = (width: number, height: number): number => {
        // Use the smaller dimension to determine scale
        const smallerDimension = Math.min(width, height);
        // Scale should be such that 2 * MAX_VISIBLE_UNITS units fit in the smaller dimension
        return smallerDimension / (2 * MAX_VISIBLE_UNITS);
    };

    // === Input handling ======================================================
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => keys.current.add(e.key.toLowerCase());
        const handleKeyUp = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, []);

    // === Handle window resize ===============================================
    useEffect(() => {
        const handleResize = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            // Set canvas size to match window size
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        // Initial size
        handleResize();

        // Add resize listener
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // === Main draw loop ======================================================
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let last = performance.now();

        const frame = (now: DOMHighResTimeStamp) => {
            const dt = (now - last) / 1000; // seconds since previous frame
            last = now;

            // --- Update camera ---------------------------------------------------
            const dir = { x: 0, y: 0 };
            if (keys.current.has("w")) dir.y -= 1;
            if (keys.current.has("s")) dir.y += 1;
            if (keys.current.has("a")) dir.x -= 1;
            if (keys.current.has("d")) dir.x += 1;

            const len = Math.hypot(dir.x, dir.y) || 1;
            camera.current.x += (dir.x / len) * SPEED * dt;
            camera.current.y += (dir.y / len) * SPEED * dt;

            // --- Render ----------------------------------------------------------
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Calculate current scale based on canvas dimensions
            const scale = calculateScale(canvas.width, canvas.height);

            // Place the world so that (camera.x, camera.y) appears at canvas center
            ctx.save();
            ctx.translate(
                canvas.width / 2 - camera.current.x * scale,
                canvas.height / 2 - camera.current.y * scale
            );

            // Draw each article as a circle
            (articles as ArticlePoint[]).forEach(({ x, y }) => {
                // Only draw points that are within the visible area
                const dx = x - camera.current.x;
                const dy = y - camera.current.y;
                if (Math.abs(dx) <= MAX_VISIBLE_UNITS && Math.abs(dy) <= MAX_VISIBLE_UNITS) {
                    ctx.beginPath();
                    ctx.arc(x * scale, y * scale, 4, 0, Math.PI * 2);
                    ctx.fillStyle = "#007aff";
                    ctx.fill();
                }
            });

            ctx.restore();
            requestAnimationFrame(frame);
        };

        requestAnimationFrame(frame);
    }, []);

    // === Canvas element ======================================================
    return (
        <canvas
            ref={canvasRef}
            style={{
                display: "block",
                background: "#f9f9f9",
                border: "1px solid #ccc",
                width: "100vw",
                height: "100vh"
            }}
        />
    );
};

export default ArticleMap;
