// พื้นหลังอนุภาคเบา ๆ (ปิดอัตโนมัติถ้าผู้ใช้ตั้ง "ลดการเคลื่อนไหว" และหยุดเมื่อแท็บถูกซ่อน)
(function () {
  const canvas = document.getElementById('particles');
  if (!canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const ctx = canvas.getContext('2d');
  let w, h, dots = [], raf;

  function resize() {
    w = canvas.width = innerWidth;
    h = canvas.height = innerHeight;
    const n = Math.min(60, Math.floor((w * h) / 28000));
    dots = Array.from({ length: n }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      r: Math.random() * 1.6 + 0.4,
      vx: (Math.random() - 0.5) * 0.25, vy: -Math.random() * 0.3 - 0.05,
      hue: Math.random() < 0.5 ? 265 : 345,
    }));
  }

  function tick() {
    ctx.clearRect(0, 0, w, h);
    for (const d of dots) {
      d.x += d.vx; d.y += d.vy;
      if (d.y < -5) { d.y = h + 5; d.x = Math.random() * w; }
      if (d.x < -5) d.x = w + 5; else if (d.x > w + 5) d.x = -5;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${d.hue},90%,70%,.55)`;
      ctx.shadowColor = `hsla(${d.hue},90%,65%,.9)`;
      ctx.shadowBlur = 8;
      ctx.fill();
    }
    raf = requestAnimationFrame(tick);
  }

  addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf); else tick();
  });
  resize(); tick();
})();
