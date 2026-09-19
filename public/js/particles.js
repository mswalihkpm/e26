/**
 * Deep-Sea Bioluminescent Particles & Light Rays Simulation
 * Theme: "Discover the Unseen" - Oceanic Abyss Aesthetics
 * Optimized: 0 shadowBlur overhead, cached gradients & auto-pause on tab hidden
 */

(function initOceanParticles() {
  const canvas = document.getElementById('ambient-ocean-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);
  let isPaused = document.hidden || false;
  let animFrameId = null;

  const particles = [];
  const PARTICLE_COUNT = Math.min(50, Math.floor(width / 26));

  class Particle {
    constructor() {
      this.reset(true);
    }

    reset(initial = false) {
      this.x = Math.random() * width;
      this.y = initial ? Math.random() * height : height + 15;
      this.radius = Math.random() * 2.2 + 0.6;
      this.baseAlpha = Math.random() * 0.40 + 0.15;
      this.alpha = this.baseAlpha;
      this.vx = (Math.random() - 0.5) * 0.35;
      this.vy = -(Math.random() * 0.45 + 0.18);
      this.pulseSpeed = Math.random() * 0.02 + 0.01;
      this.pulse = Math.random() * Math.PI;

      // Color variations: Cyan, Azure, Ice Blue, Bioluminescent Green/Violet
      const colors = [
        '0, 240, 255',
        '0, 153, 255',
        '165, 243, 252',
        '56, 189, 248',
        '139, 92, 246'
      ];
      this.rgb = colors[Math.floor(Math.random() * colors.length)];
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.pulse += this.pulseSpeed;
      this.alpha = this.baseAlpha + Math.sin(this.pulse) * 0.12;

      // Wrap around edges
      if (this.y < -15 || this.x < -20 || this.x > width + 20) {
        this.reset();
      }
    }

    draw() {
      const a = Math.max(0, this.alpha);
      
      // Fast dual-layer halo glow without costly Gaussian shadowBlur
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 2.2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.rgb}, ${a * 0.28})`;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.rgb}, ${a})`;
      ctx.fill();
    }
  }

  // Initialize Particles
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(new Particle());
  }

  // Light Rays from the Surface (Cached linear gradient for maximum FPS)
  let rayOffset = 0;
  let cachedRayGradient = null;

  function buildRayGradient() {
    cachedRayGradient = ctx.createLinearGradient(0, 0, 140, height * 0.75);
    cachedRayGradient.addColorStop(0, 'rgba(0, 240, 255, 0.035)');
    cachedRayGradient.addColorStop(0.5, 'rgba(0, 114, 255, 0.015)');
    cachedRayGradient.addColorStop(1, 'transparent');
  }
  buildRayGradient();

  function drawLightRays() {
    rayOffset += 0.0025;
    const rayCount = 4;
    ctx.fillStyle = cachedRayGradient;

    for (let i = 0; i < rayCount; i++) {
      const startX = (width / (rayCount + 1)) * (i + 1) + Math.sin(rayOffset + i) * 55;

      ctx.beginPath();
      ctx.moveTo(startX - 20, 0);
      ctx.lineTo(startX + 140, 0);
      ctx.lineTo(startX + 280, height * 0.85);
      ctx.lineTo(startX - 60, height * 0.85);
      ctx.closePath();
      ctx.fill();
    }
  }

  function animate() {
    if (isPaused) return;

    ctx.clearRect(0, 0, width, height);
    drawLightRays();

    for (let i = 0; i < particles.length; i++) {
      particles[i].update();
      particles[i].draw();
    }

    animFrameId = requestAnimationFrame(animate);
  }

  // Auto-pause when tab is hidden to save CPU/battery
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      isPaused = true;
      if (animFrameId) cancelAnimationFrame(animFrameId);
    } else {
      if (isPaused) {
        isPaused = false;
        animFrameId = requestAnimationFrame(animate);
      }
    }
  });

  animate();

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      buildRayGradient();
    }, 150);
  }, { passive: true });
})();
