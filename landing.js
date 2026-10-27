/* Rising embers behind the landing page. Skipped when the visitor prefers reduced motion. */
'use strict';

(function embers() {
    const canvas = document.getElementById('embers');
    if (!canvas || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    const ctx = canvas.getContext('2d');
    let width = 0, height = 0, particles = [];

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        const count = Math.min(70, Math.round(width / 22));
        particles = Array.from({ length: count }, () => spawn(true));
    }

    function spawn(anywhere) {
        return {
            x: Math.random() * width,
            y: anywhere ? Math.random() * height : height + 10,
            size: Math.random() * 2.2 + 0.6,
            speed: Math.random() * 0.5 + 0.2,
            drift: (Math.random() - 0.5) * 0.4,
            life: Math.random() * 0.6 + 0.3,
            phase: Math.random() * Math.PI * 2
        };
    }

    function frame(t) {
        ctx.clearRect(0, 0, width, height);
        particles.forEach((p, i) => {
            p.y -= p.speed;
            p.x += p.drift + Math.sin(t / 1500 + p.phase) * 0.25;
            if (p.y < -10) particles[i] = spawn(false);
            const alpha = p.life * (0.4 + 0.6 * Math.abs(Math.sin(t / 900 + p.phase)));
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(240, 180, 80, ${alpha})`;
            ctx.shadowColor = 'rgba(240, 150, 40, 0.8)';
            ctx.shadowBlur = 8;
            ctx.fill();
        });
        requestAnimationFrame(frame);
    }

    window.addEventListener('resize', resize);
    resize();
    requestAnimationFrame(frame);
}());
