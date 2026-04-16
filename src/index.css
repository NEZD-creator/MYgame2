@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;700;800&family=Oswald:wght@700&display=swap');
@import "tailwindcss";

@theme {
  --font-sans: "Space Grotesk", ui-sans-serif, system-ui, sans-serif;
  --font-display: "Oswald", sans-serif;
}

body {
  margin: 0;
  padding: 0;
  background-color: #050505;
  color: #e4e4e7;
  font-family: var(--font-sans);
  overflow: hidden;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

/* Custom Scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.8);
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #ef4444;
  border-radius: 0;
  border: 1px solid #7f1d1d;
}

/* Sharp Anime UI Glass */
.aaa-glass {
  background: rgba(12, 12, 14, 0.95);
  backdrop-filter: blur(12px);
  border: 2px solid rgba(239, 68, 68, 0.4);
  clip-path: polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%);
  box-shadow: 10px 10px 0px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(239, 68, 68, 0.05);
}

.aaa-glass-dark {
  background: rgba(5, 5, 7, 1);
  border: 2px solid rgba(239, 68, 68, 0.6);
  clip-path: polygon(15px 0, 100% 0, 100% 100%, 0 100%, 0 15px);
}

.aaa-btn {
  position: relative;
  overflow: hidden;
  transition: all 0.2s cubic-bezier(0.19, 1, 0.22, 1);
  border: 2px solid rgba(239, 68, 68, 0.5);
  background: #0a0a0c;
  color: #fca5a5;
  clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
  font-family: var(--font-display);
  letter-spacing: 0.05em;
}

.aaa-btn:hover:not(:disabled) {
  transform: translate(-2px, -2px);
  box-shadow: 4px 4px 0px #ef4444;
  background: #ef4444;
  color: #fff;
  border-color: #fff;
}

.aaa-btn:active:not(:disabled) {
  transform: translate(0px, 0px);
  box-shadow: 0px 0px 0px transparent;
}

.aaa-hp-bar {
  clip-path: polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%);
  border-radius: 0;
  border: 2px solid #7f1d1d;
}

.anime-header {
  font-family: var(--font-display);
  text-transform: uppercase;
  font-style: italic;
  transform: skewX(-5deg);
  letter-spacing: -0.02em;
}

@keyframes bg-slide {
  0% { background-position: 0% 0%; }
  100% { background-position: 100% 100%; }
}

@keyframes float-grid {
  0% { transform: perspective(500px) rotateX(60deg) translateY(0); }
  100% { transform: perspective(500px) rotateX(60deg) translateY(50px); }
}

.anime-bg {
  background: radial-gradient(circle at 50% 50%, #1e1b4b 0%, #050505 100%);
  position: relative;
  overflow: hidden;
}

.anime-bg::before {
  content: "";
  position: absolute;
  inset: -100%;
  background-image: 
    linear-gradient(rgba(239, 68, 68, 0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(239, 68, 68, 0.1) 1px, transparent 1px);
  background-size: 50px 50px;
  animation: float-grid 4s linear infinite;
  z-index: 0;
  opacity: 0.3;
}

.anime-bg::after {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 80% 20%, rgba(239, 68, 68, 0.15) 0%, transparent 40%),
              radial-gradient(circle at 20% 80%, rgba(147, 51, 234, 0.15) 0%, transparent 40%);
  z-index: 1;
}

@keyframes scanline {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100vh); }
}
.scanlines::after {
  content: "";
  position: absolute;
  top: 0; left: 0; width: 100%; height: 2px;
  background: rgba(239, 68, 68, 0.1);
  animation: scanline 4s linear infinite;
  pointer-events: none;
}

.magic-circle {
  animation: spin-slow 30s linear infinite;
  opacity: 0.3;
  color: #ef4444;
}
@keyframes spin-slow {
  100% { transform: rotate(360deg); }
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-12px); }
}
@keyframes float-delayed {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-12px); }
}
.animate-float { animation: float 4s ease-in-out infinite; }
.animate-float-delayed { animation: float-delayed 4s ease-in-out infinite; animation-delay: 2s; }

@keyframes pulse-glow {
  0%, 100% { filter: drop-shadow(0 0 15px rgba(239, 68, 68, 0.4)); }
  50% { filter: drop-shadow(0 0 35px rgba(239, 68, 68, 0.8)); }
}
.animate-pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
