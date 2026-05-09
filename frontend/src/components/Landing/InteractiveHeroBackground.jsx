import React, { useRef, useEffect } from 'react';
import { useApp } from '../../hooks/useApp';

export default function InteractiveHeroBackground() {
  const canvasRef = useRef(null);
  const { state } = useApp();
  const isDark = state.theme === 'dark';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let particles = [];
    const mouse = { x: -1000, y: -1000 };
    const lerpMouse = { x: -1000, y: -1000 };

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      init();
    };

    class Particle {
      constructor() {
        this.reset();
      }

      reset() {
        this.anchorX = Math.random() * canvas.width;
        this.anchorY = Math.random() * canvas.height;
        this.x = this.anchorX;
        this.y = this.anchorY;
        this.size = Math.random() * 2 + 0.5;
        this.vx = 0;
        this.vy = 0;
        this.baseAlpha = Math.random() * 0.4 + 0.2;
        this.alpha = this.baseAlpha;
        // Slower recovery for dream-like feel
        this.returnSpeed = 0.002 + Math.random() * 0.003;
        this.friction = 0.97; // More viscous
        this.flickerSpeed = Math.random() * 0.02 + 0.01;
        this.flickerPhase = Math.random() * Math.PI * 2;
      }

      update() {
        const dxHome = this.anchorX - this.x;
        const dyHome = this.anchorY - this.y;
        this.vx += dxHome * this.returnSpeed;
        this.vy += dyHome * this.returnSpeed;

        const dxMouse = this.x - lerpMouse.x;
        const dyMouse = this.y - lerpMouse.y;
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
        
        const interactionRadius = 200;
        if (distMouse < interactionRadius) {
          const force = (interactionRadius - distMouse) / interactionRadius;
          const strength = 1.2; // Gentler repulsion
          this.vx += (dxMouse / distMouse) * force * strength;
          this.vy += (dyMouse / distMouse) * force * strength;
          this.alpha = Math.min(this.baseAlpha + force * 0.4, 0.8);
        } else {
          this.alpha += (this.baseAlpha - this.alpha) * 0.03;
        }

        this.vx += (Math.random() - 0.5) * 0.05;
        this.vy += (Math.random() - 0.5) * 0.05;
        this.vx *= this.friction;
        this.vy *= this.friction;
        this.x += this.vx;
        this.y += this.vy;

        const flicker = Math.sin(Date.now() * this.flickerSpeed + this.flickerPhase) * 0.1;
        this.alpha = Math.max(0.1, Math.min(1, this.alpha + flicker * 0.01));
      }

      draw() {
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const particleColor = isDark ? '255, 140, 0' : '99, 102, 241';
        
        ctx.beginPath();
        if (speed > 1.5) {
            const angle = Math.atan2(this.vy, this.vx);
            const streakLen = speed * 1.8;
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x - Math.cos(angle) * streakLen, this.y - Math.sin(angle) * streakLen);
            ctx.strokeStyle = `rgba(${particleColor}, ${this.alpha})`;
            ctx.lineWidth = this.size;
            ctx.stroke();
        } else {
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${particleColor}, ${this.alpha})`;
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * 2.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${particleColor}, ${this.alpha * 0.15})`;
            ctx.fill();
        }
      }
    }

    const init = () => {
      particles = [];
      const count = 1000;
      for (let i = 0; i < count; i++) {
        particles.push(new Particle());
      }
    };

    const animate = () => {
      ctx.fillStyle = isDark ? '#050505' : '#fdfcfb';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // More balanced mouse smoothing
      lerpMouse.x += (mouse.x - lerpMouse.x) * 0.08;
      lerpMouse.y += (mouse.y - lerpMouse.y) * 0.08;

      particles.forEach(p => {
        p.update();
        p.draw();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', handleMouseMove);

    resizeCanvas();
    init();
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isDark]);

  return (
    <div className={`fixed inset-0 w-full h-full pointer-events-none z-0 transition-colors duration-700 ${isDark ? 'bg-[#050505]' : 'bg-[#fdfcfb]'}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
      />
    </div>
  );
}
