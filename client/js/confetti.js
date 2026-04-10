/**
 * Lightweight canvas-based confetti for GetFrisch
 * Confetti.burst() triggers a celebration from the game container
 */

var Confetti = (function () {
  var canvas, ctx, particles, animFrame;
  var PARTICLE_COUNT = 100;
  var COLORS = ['#A31F34', '#C49A2A', '#FFFFFF', '#edc22e', '#8A1829', '#4CAF50', '#f9f6f2'];
  var GRAVITY = 0.12;
  var DURATION = 3000;

  function createCanvas() {
    canvas = document.createElement('canvas');
    canvas.id = 'confetti-canvas';
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:15000;';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
  }

  function removeCanvas() {
    if (canvas && canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
    canvas = null;
    ctx = null;
  }

  function randomRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  function createParticles(originX, originY) {
    particles = [];
    for (var i = 0; i < PARTICLE_COUNT; i++) {
      var angle = randomRange(0, Math.PI * 2);
      var speed = randomRange(4, 12);
      particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - randomRange(2, 6),
        size: randomRange(4, 10),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: randomRange(0, 360),
        rotSpeed: randomRange(-8, 8),
        opacity: 1,
        shape: Math.random() > 0.5 ? 'rect' : 'circle'
      });
    }
  }

  function animate() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    var alive = false;
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += GRAVITY;
      p.vx *= 0.99;
      p.rotation += p.rotSpeed;
      p.opacity -= 0.008;

      if (p.opacity <= 0) continue;
      alive = true;

      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;

      if (p.shape === 'rect') {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (alive) {
      animFrame = requestAnimationFrame(animate);
    } else {
      removeCanvas();
    }
  }

  function burst() {
    if (animFrame) cancelAnimationFrame(animFrame);
    removeCanvas();
    createCanvas();

    // Burst from center of viewport
    var cx = window.innerWidth / 2;
    var cy = window.innerHeight / 3;
    createParticles(cx, cy);

    // Gold flash overlay
    var flash = document.createElement('div');
    flash.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(196,154,42,0.3);z-index:14999;pointer-events:none;transition:opacity 0.4s;';
    document.body.appendChild(flash);
    setTimeout(function () {
      flash.style.opacity = '0';
      setTimeout(function () {
        if (flash.parentNode) flash.parentNode.removeChild(flash);
      }, 400);
    }, 200);

    animate();

    // Auto-cleanup after duration
    setTimeout(function () {
      if (animFrame) cancelAnimationFrame(animFrame);
      removeCanvas();
    }, DURATION);
  }

  return { burst: burst };
})();
