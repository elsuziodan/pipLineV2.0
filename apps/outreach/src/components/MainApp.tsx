"use client";

import { useState, useRef, useEffect } from "react";
import ViewTabs from "./ViewTabs";
import ContactQueue from "./ContactQueue";
import EditorialKanban from "./EditorialKanban";
import ArchiveQueue from "./ArchiveQueue";

export type ViewState = 'cola' | 'kanban' | 'archivados';

const VIEWS: ViewState[] = ['cola', 'kanban', 'archivados'];

export default function MainApp() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

  const gestureRef = useRef({
    startX: 0,
    startY: 0,
    startTime: 0,
    direction: null as 'h' | 'v' | null,
    lastX: 0,
    lastTime: 0,
  });

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 480);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return;
    const touch = e.touches[0];
    gestureRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
      direction: null,
      lastX: touch.clientX,
      lastTime: Date.now(),
    };
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMobile || !isDragging) return;
    const touch = e.touches[0];
    const dx = touch.clientX - gestureRef.current.startX;
    const dy = touch.clientY - gestureRef.current.startY;

    if (gestureRef.current.direction === null) {
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        gestureRef.current.direction = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
      }
    }

    if (gestureRef.current.direction === 'h') {
      if (e.cancelable) e.preventDefault(); // Prevent vertical scroll

      let offset = dx;
      // Resistance at the edges
      if ((activeIndex === 0 && dx > 0) || (activeIndex === VIEWS.length - 1 && dx < 0)) {
        offset = dx * 0.3;
      }

      setDragOffset(offset);
      gestureRef.current.lastX = touch.clientX;
      gestureRef.current.lastTime = Date.now();
    }
  };

  const handleTouchEnd = () => {
    if (!isMobile || !isDragging) return;
    setIsDragging(false);

    if (gestureRef.current.direction === 'h') {
      const timeDiff = Date.now() - gestureRef.current.startTime;
      const velocity = Math.abs(gestureRef.current.lastX - gestureRef.current.startX) / timeDiff;
      const containerWidth = mainRef.current?.offsetWidth || window.innerWidth;
      const threshold = containerWidth * 0.25;

      let newIndex = activeIndex;

      if (Math.abs(dragOffset) > threshold || velocity > 0.3) {
        if (dragOffset < 0 && activeIndex < VIEWS.length - 1) {
          newIndex = activeIndex + 1;
        } else if (dragOffset > 0 && activeIndex > 0) {
          newIndex = activeIndex - 1;
        }
      }

      setActiveIndex(newIndex);
    }
    
    setDragOffset(0);
    gestureRef.current.direction = null;
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        maxWidth: '460px',
        margin: '0 auto',
        backgroundColor: 'var(--surface)',
      }}
    >
      <header style={{
        padding: '28px 14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        flexShrink: 0,
      }}>
        <h1 className="font-display" style={{
          fontSize: 'var(--t-hero)',
          fontWeight: 900,
          letterSpacing: '-0.03em',
          lineHeight: 0.95,
          color: 'var(--ink)',
        }}>
          Pulso
        </h1>
        <ViewTabs 
          activeIndex={activeIndex} 
          dragOffset={dragOffset}
          isDragging={isDragging}
          onTabClick={(i) => setActiveIndex(i)} 
        />
      </header>

      <main
        ref={mainRef}
        style={{
          flex: 1,
          overflow: 'hidden', // Track moves inside
          position: 'relative',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div 
          className={isDragging ? 'swipe-track swiping' : 'swipe-track'}
          style={{
            display: 'flex',
            width: '300%',
            height: '100%',
            transform: `translateX(calc(-${activeIndex * 33.333}% + ${dragOffset}px))`,
            transition: isDragging ? 'none' : 'transform 0.35s cubic-bezier(0.25, 1, 0.5, 1)',
          }}
        >
          <div className="swipe-panel"><ContactQueue /></div>
          <div className="swipe-panel"><EditorialKanban /></div>
          <div className="swipe-panel"><ArchiveQueue /></div>
        </div>
      </main>
    </div>
  );
}
