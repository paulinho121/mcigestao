'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';

// Types for the component
interface DockApp {
  id: string;
  name: string;
  icon: React.ReactNode | string;
  subItems?: DockApp[];
}

interface MacOSDockProps {
  apps: DockApp[];
  onAppClick: (appId: string) => void;
  openApps?: string[];
  className?: string;
}

const MacOSDock: React.FC<MacOSDockProps> = ({ 
  apps, 
  onAppClick, 
  openApps = [],
  className = ''
}) => {
  const [mouseX, setMouseX] = useState<number | null>(null);
  const [currentScales, setCurrentScales] = useState<number[]>(apps.map(() => 1));
  const [currentPositions, setCurrentPositions] = useState<number[]>([]);
  const [activeAppId, setActiveAppId] = useState<string | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const iconRefs = useRef<(HTMLDivElement | null)[]>([]);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastMouseMoveTime = useRef<number>(0);

  // Responsive size calculations based on viewport
  const getResponsiveConfig = useCallback(() => {
    if (typeof window === 'undefined') {
      return { baseIconSize: 64, maxScale: 1.6, effectWidth: 240 };
    }

    // Base calculations on smaller dimension for better mobile experience
    const smallerDimension = Math.min(window.innerWidth, window.innerHeight);
    
    // Scale icon size based on screen size
    if (smallerDimension < 480) {
      // Mobile phones
      return {
        baseIconSize: Math.max(40, smallerDimension * 0.08),
        maxScale: 1.4,
        effectWidth: smallerDimension * 0.4
      };
    } else if (smallerDimension < 768) {
      // Tablets
      return {
        baseIconSize: Math.max(48, smallerDimension * 0.07),
        maxScale: 1.5,
        effectWidth: smallerDimension * 0.35
      };
    } else if (smallerDimension < 1024) {
      // Small laptops
      return {
        baseIconSize: Math.max(56, smallerDimension * 0.06),
        maxScale: 1.6,
        effectWidth: smallerDimension * 0.3
      };
    } else {
      // Desktop and large screens
      return {
        baseIconSize: Math.max(64, Math.min(80, smallerDimension * 0.05)),
        maxScale: 1.8,
        effectWidth: 300
      };
    }
  }, []);

  const [config, setConfig] = useState(getResponsiveConfig);
  const { baseIconSize, maxScale, effectWidth } = config;
  const minScale = 1.0;
  // Espaçamento pensado pro RÓTULO (não só o ícone) — nomes como "Ecommerce SC" ou
  // "Rastreamento" passam de 80px e coladavam no vizinho com o espaçamento antigo
  // (baseIconSize * 0.3 ≈ 19px, insuficiente). Validado sem overlap ao vivo.
  const baseSpacing = Math.max(28, baseIconSize * 0.5);

  // Update config on window resize
  useEffect(() => {
    const handleResize = () => {
      setConfig(getResponsiveConfig());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [getResponsiveConfig]);

  // Authentic macOS cosine-based magnification algorithm
  const calculateTargetMagnification = useCallback((mousePosition: number | null) => {
    if (mousePosition === null) {
      return apps.map(() => minScale);
    }

    return apps.map((_, index) => {
      const normalIconCenter = (index * (baseIconSize + baseSpacing)) + (baseIconSize / 2);
      const minX = mousePosition - (effectWidth / 2);
      const maxX = mousePosition + (effectWidth / 2);
      
      if (normalIconCenter < minX || normalIconCenter > maxX) {
        return minScale;
      }
      
      const theta = ((normalIconCenter - minX) / effectWidth) * 2 * Math.PI;
      const cappedTheta = Math.min(Math.max(theta, 0), 2 * Math.PI);
      const scaleFactor = (1 - Math.cos(cappedTheta)) / 2;
      
      return minScale + (scaleFactor * (maxScale - minScale));
    });
  }, [apps, baseIconSize, baseSpacing, effectWidth, maxScale, minScale]);

  // Calculate positions based on current scales
  const calculatePositions = useCallback((scales: number[]) => {
    let currentX = 0;
    
    return scales.map((scale) => {
      const scaledWidth = baseIconSize * scale;
      const centerX = currentX + (scaledWidth / 2);
      currentX += scaledWidth + baseSpacing;
      return centerX;
    });
  }, [baseIconSize, baseSpacing]);

  // Initialize positions
  useEffect(() => {
    const initialScales = apps.map(() => minScale);
    const initialPositions = calculatePositions(initialScales);
    setCurrentScales(initialScales);
    setCurrentPositions(initialPositions);
  }, [apps, calculatePositions, minScale, config]);

  // Animation loop
  const animateToTarget = useCallback(() => {
    const targetScales = calculateTargetMagnification(mouseX);
    const targetPositions = calculatePositions(targetScales);
    const lerpFactor = mouseX !== null ? 0.2 : 0.12;

    setCurrentScales(prevScales => {
      return prevScales.map((currentScale, index) => {
        const diff = targetScales[index] - currentScale;
        return currentScale + (diff * lerpFactor);
      });
    });

    setCurrentPositions(prevPositions => {
      return prevPositions.map((currentPos, index) => {
        const diff = targetPositions[index] - currentPos;
        return currentPos + (diff * lerpFactor);
      });
    });

    const scalesNeedUpdate = currentScales.some((scale, index) => 
      Math.abs(scale - targetScales[index]) > 0.002
    );
    const positionsNeedUpdate = currentPositions.some((pos, index) => 
      Math.abs(pos - targetPositions[index]) > 0.1
    );
    
    if (scalesNeedUpdate || positionsNeedUpdate || mouseX !== null) {
      animationFrameRef.current = requestAnimationFrame(animateToTarget);
    }
  }, [mouseX, calculateTargetMagnification, calculatePositions, currentScales, currentPositions]);

  // Start/stop animation loop
  useEffect(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(animateToTarget);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [animateToTarget]);

  // Throttled mouse movement handler
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const now = performance.now();
    
    if (now - lastMouseMoveTime.current < 16) {
      return;
    }
    
    lastMouseMoveTime.current = now;
    
    if (dockRef.current) {
      const rect = dockRef.current.getBoundingClientRect();
      const padding = Math.max(8, baseIconSize * 0.12);
      setMouseX(e.clientX - rect.left - padding);
    }
  }, [baseIconSize]);

  const handleMouseLeave = useCallback(() => {
    setMouseX(null);
  }, []);

  const createBounceAnimation = (element: HTMLElement) => {
    const bounceHeight = Math.max(-8, -baseIconSize * 0.15);
    element.style.transition = 'transform 0.2s ease-out';
    element.style.transform = `translateY(${bounceHeight}px)`;
    
    setTimeout(() => {
      element.style.transform = 'translateY(0px)';
    }, 200);
  };

  const handleAppClick = (appId: string, index: number) => {
    const app = apps.find(a => a.id === appId);
    
    // Animação de clique
    if (iconRefs.current[index]) {
      if (typeof window !== 'undefined' && (window as any).gsap) {
        const gsap = (window as any).gsap;
        const bounceHeight = currentScales[index] > 1.3 ? -baseIconSize * 0.2 : -baseIconSize * 0.15;
        
        gsap.to(iconRefs.current[index], {
          y: bounceHeight,
          duration: 0.2,
          ease: 'power2.out',
          yoyo: true,
          repeat: 1,
          transformOrigin: 'bottom center'
        });
      } else {
        createBounceAnimation(iconRefs.current[index]!);
      }
    }
    
    if (app?.subItems && app.subItems.length > 0) {
      setActiveAppId(prev => prev === appId ? null : appId);
    } else {
      setActiveAppId(null);
      onAppClick(appId);
    }
  };

  // Calculate content width
  const contentWidth = currentPositions.length > 0 
    ? Math.max(...currentPositions.map((pos, index) => 
        pos + (baseIconSize * currentScales[index]) / 2
      ))
    : (apps.length * (baseIconSize + baseSpacing)) - baseSpacing;

  const padding = Math.max(12, baseIconSize * 0.15);

    return (
    <div 
      ref={dockRef}
      className={`backdrop-blur-xl ${className} mx-auto`}
      style={{
        width: `${contentWidth + padding * 2}px`,
        background: 'rgba(20, 25, 35, 0.75)',
        borderRadius: `${Math.max(16, baseIconSize * 0.4)}px`,
        border: '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: `
          0 ${Math.max(4, baseIconSize * 0.1)}px ${Math.max(16, baseIconSize * 0.4)}px rgba(0, 0, 0, 0.4),
          0 ${Math.max(2, baseIconSize * 0.05)}px ${Math.max(8, baseIconSize * 0.2)}px rgba(0, 0, 0, 0.3),
          inset 0 1px 0 rgba(255, 255, 255, 0.15),
          inset 0 -1px 0 rgba(0, 0, 0, 0.2)
        `,
        padding: `${padding}px ${padding}px ${padding + 20}px ${padding}px`,
        position: 'relative'
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div 
        className="relative flex items-end"
        style={{
          height: `${baseIconSize}px`,
          width: '100%'
        }}
      >
        {apps.map((app, index) => {
          const scale = currentScales[index];
          const position = currentPositions[index] || 0;
          const scaledSize = baseIconSize * scale;
          
          return (
            <div
              key={app.id}
              ref={(el) => { iconRefs.current[index] = el; }}
              className="absolute cursor-pointer flex flex-col items-center justify-end group"
              onClick={(e) => {
                e.stopPropagation(); // Evita que o click feche o overlay se clicar no icone
                handleAppClick(app.id, index);
              }}
              style={{
                left: `${position - scaledSize / 2}px`,
                bottom: '0px',
                width: `${scaledSize}px`,
                height: `${scaledSize}px`,
                transformOrigin: 'bottom center',
                zIndex: Math.round(scale * 10)
              }}
            >
              {/* Tooltip Apple Style (Aparece no hover em Desktop) */}
              <div 
                className="absolute hidden sm:block opacity-0 group-hover:opacity-100 transition-opacity duration-200 px-3 py-1.5 bg-slate-800/90 backdrop-blur-xl text-white text-xs font-semibold rounded-lg whitespace-nowrap pointer-events-none border border-white/20 shadow-xl"
                style={{
                  top: `-${baseIconSize * 0.8 + 20}px`,
                  zIndex: 50
                }}
              >
                {app.name}
              </div>
              {typeof app.icon === 'string' ? (
                <img
                  src={app.icon}
                  alt={app.name}
                  width={scaledSize}
                  height={scaledSize}
                  className="object-contain"
                  style={{
                    filter: `drop-shadow(0 ${scale > 1.2 ? Math.max(2, baseIconSize * 0.05) : Math.max(1, baseIconSize * 0.03)}px ${scale > 1.2 ? Math.max(4, baseIconSize * 0.1) : Math.max(2, baseIconSize * 0.06)}px rgba(0,0,0,${0.2 + (scale - 1) * 0.15}))`
                  }}
                />
              ) : (
                <div 
                  className="flex items-center justify-center text-white bg-slate-800 rounded-2xl" 
                  style={{
                    width: scaledSize,
                    height: scaledSize,
                    filter: `drop-shadow(0 ${scale > 1.2 ? Math.max(2, baseIconSize * 0.05) : Math.max(1, baseIconSize * 0.03)}px ${scale > 1.2 ? Math.max(4, baseIconSize * 0.1) : Math.max(2, baseIconSize * 0.06)}px rgba(0,0,0,${0.2 + (scale - 1) * 0.15}))`
                  }}
                >
                  {React.isValidElement(app.icon) 
                    ? React.cloneElement(app.icon as React.ReactElement, { size: scaledSize * 0.5 }) 
                    : app.icon}
                </div>
              )}
              
              {/* Nome Sempre Visível Embaixo do Ícone */}
              <span 
                className="absolute -bottom-6 text-[10px] md:text-xs font-medium text-white/90 text-center whitespace-nowrap drop-shadow-md"
                style={{ 
                  opacity: scale > 1.1 ? 1 : 0.7,
                  transform: `scale(${1 / scale})`, // Mantém o texto legível sem esticar muito
                  transformOrigin: 'top center'
                }}
              >
                {app.name}
              </span>

              {/* App Indicator Dot */}
              {openApps.includes(app.id) && (
                <div 
                  className="absolute"
                  style={{
                    bottom: `${Math.max(-2, -baseIconSize * 0.05)}px`,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: `${Math.max(3, baseIconSize * 0.06)}px`,
                    height: `${Math.max(3, baseIconSize * 0.06)}px`,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    boxShadow: '0 0 4px rgba(0, 0, 0, 0.3)',
                  }}
                />
              )}
            </div>
          );
        })}

        {/* Popups de Submenus (Exibidos acima do ícone clicado) */}
        {apps.map((app, index) => {
          if (activeAppId !== app.id || !app.subItems || app.subItems.length === 0) return null;
          
          const position = currentPositions[index] || 0;
          return (
            <div 
              key={`popup-${app.id}`}
              className="absolute bottom-full mb-8 flex flex-col gap-1 bg-slate-800/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-2 min-w-[180px] z-[60] pointer-events-auto origin-bottom animate-in fade-in zoom-in-95 duration-200"
              style={{
                left: `${position}px`,
                transform: 'translateX(-50%)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-[10px] font-bold text-slate-400 px-3 pt-1 pb-2 border-b border-white/10 mb-1 uppercase tracking-wider text-center">
                {app.name}
              </div>
              <div className="max-h-[60vh] overflow-y-auto no-scrollbar flex flex-col gap-1">
                {app.subItems.map((subItem) => (
                  <button
                    key={subItem.id}
                    className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-200 hover:text-white hover:bg-brand-600 rounded-xl transition-all text-left group/sub"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveAppId(null);
                      onAppClick(subItem.id);
                    }}
                  >
                    <div className="w-5 h-5 flex items-center justify-center shrink-0">
                      {typeof subItem.icon === 'string' ? (
                        <img src={subItem.icon} className="w-full h-full object-contain" />
                      ) : (
                        React.isValidElement(subItem.icon) ? React.cloneElement(subItem.icon as React.ReactElement, { size: 18 }) : subItem.icon
                      )}
                    </div>
                    <span className="truncate">{subItem.name}</span>
                  </button>
                ))}
              </div>
              
              {/* Seta indicadora (triângulo apontando para baixo) */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 bg-slate-800/95 border-b border-r border-white/10"></div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MacOSDock;
