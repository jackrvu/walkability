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

interface Player {
    x: number;
    y: number;
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
 * Player movement speed (data‑space units per second).
 */
const PLAYER_SPEED = 2;

/**
 * A minimal 2‑D map that you can pan around with WASD.
 * It draws every article as a small blue dot on an <canvas> element.
 *
 * Skeleton‑style: no external rendering libs, ultra‑readable, ready for expansion.
 */
const ArticleMap: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    /**
     * Track the player's position in world space
     */
    const player = useRef<Player>({ x: 0, y: 0 });

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

            // --- Update player position ---------------------------------------------------
            const dir = { x: 0, y: 0 };
            if (keys.current.has("w")) dir.y -= 1;
            if (keys.current.has("s")) dir.y += 1;
            if (keys.current.has("a")) dir.x -= 1;
            if (keys.current.has("d")) dir.x += 1;

            const len = Math.hypot(dir.x, dir.y) || 1;
            player.current.x += (dir.x / len) * PLAYER_SPEED * dt;
            player.current.y += (dir.y / len) * PLAYER_SPEED * dt;

            // --- Render ----------------------------------------------------------
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Calculate current scale based on canvas dimensions
            const scale = calculateScale(canvas.width, canvas.height);

            // Place the world so that the player appears at canvas center
            ctx.save();
            ctx.translate(
                canvas.width / 2 - player.current.x * scale,
                canvas.height / 2 - player.current.y * scale
            );

            // Draw the grid
            const gridSize = 1; // 1 unit = 1 grid cell
            const startX = Math.floor(player.current.x - MAX_VISIBLE_UNITS);
            const startY = Math.floor(player.current.y - MAX_VISIBLE_UNITS);
            const endX = Math.ceil(player.current.x + MAX_VISIBLE_UNITS);
            const endY = Math.ceil(player.current.y + MAX_VISIBLE_UNITS);

            ctx.strokeStyle = "#e0e0e0";
            ctx.lineWidth = 0.5;

            // Draw vertical lines
            for (let x = startX; x <= endX; x += gridSize) {
                ctx.beginPath();
                ctx.moveTo(x * scale, startY * scale);
                ctx.lineTo(x * scale, endY * scale);
                ctx.stroke();
            }

            // Draw horizontal lines
            for (let y = startY; y <= endY; y += gridSize) {
                ctx.beginPath();
                ctx.moveTo(startX * scale, y * scale);
                ctx.lineTo(endX * scale, y * scale);
                ctx.stroke();
            }

            // Draw each article as a circle
            (articles as ArticlePoint[]).forEach(({ x, y }) => {
                // Only draw points that are within the visible area
                const dx = x - player.current.x;
                const dy = y - player.current.y;
                if (Math.abs(dx) <= MAX_VISIBLE_UNITS && Math.abs(dy) <= MAX_VISIBLE_UNITS) {
                    ctx.beginPath();
                    ctx.arc(x * scale, y * scale, 4, 0, Math.PI * 2);
                    ctx.fillStyle = "#007aff";
                    ctx.fill();
                }
            });

            // Draw the player
            ctx.beginPath();
            ctx.arc(player.current.x * scale, player.current.y * scale, 8, 0, Math.PI * 2);
            ctx.fillStyle = "#ff0000";
            ctx.fill();

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
