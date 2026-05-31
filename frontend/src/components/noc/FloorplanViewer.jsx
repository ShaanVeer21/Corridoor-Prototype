import { useState, useEffect, useRef, useCallback } from 'react';
import { getFloorplanUrl } from '../../utils/api';
import './FloorplanViewer.css';

export default function FloorplanViewer({ floorPlans, activeFloor, path }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  const parsedPlans = (floorPlans || []).map((fp) => ({
    ...fp,
    parsedNumbers: typeof fp.floor_numbers === 'string'
      ? (() => { try { return JSON.parse(fp.floor_numbers); } catch { return []; } })()
      : fp.floor_numbers || [],
  }));

  const allPlans = parsedPlans.length > 0 ? parsedPlans : [];

  useEffect(() => {
    if (activeFloor != null && allPlans.length > 0) {
      const idx = allPlans.findIndex((p) => p.parsedNumbers.includes(activeFloor));
      if (idx >= 0) {
        setCurrentIndex(idx);
        setZoom(1);
        setPan({ x: 0, y: 0 });
      }
    }
  }, [activeFloor, allPlans.length]);

  // Drag handlers
  const handleMouseDown = useCallback((e) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [zoom, pan]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch handlers for mobile
  const handleTouchStart = useCallback((e) => {
    if (zoom <= 1 || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
  }, [zoom, pan]);

  const handleTouchMove = useCallback((e) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPan({ x: touch.clientX - dragStart.x, y: touch.clientY - dragStart.y });
  }, [isDragging, dragStart]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Scroll to zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setZoom((z) => Math.max(0.5, Math.min(5, z + delta)));
  }, []);

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const switchPage = (idx) => {
    setCurrentIndex(idx);
    resetView();
  };

  // No floor plans at all
  if (!allPlans.length) {
    const url = path ? getFloorplanUrl(path) : null;
    if (!url) {
      return (
        <div className="floorplan-viewer floorplan-viewer--empty">
          <p>No floorplan available for this building</p>
          <p className="floorplan-viewer__hint">Upload a floorplan PDF via the Upload NOC page</p>
        </div>
      );
    }
    return (
      <div className="floorplan-viewer">
        <div className="floorplan-viewer__container">
          <img src={url} alt="Building floorplan" className="floorplan-viewer__image" draggable={false} />
        </div>
      </div>
    );
  }

  const currentPlan = allPlans[currentIndex];
  const imageUrl = currentPlan ? getFloorplanUrl(currentPlan.image_path) : null;

  const getFloorLabel = (plan) => {
    if (!plan) return '?';
    const nums = plan.parsedNumbers;
    
    // No floor numbers — show sheet number
    if (nums.length === 0) return `Sheet ${(plan.page_number || 0) + 1}`;
    
    // Filter out terrace (999) for range display
    const regular = nums.filter(n => n !== 999 && n !== -1);
    const hasBasement = nums.includes(-1);
    const hasTerrace = nums.includes(999);
    
    // Single special floor
    if (nums.length === 1) {
      if (hasBasement) return 'B';
      if (hasTerrace) return 'T';
      if (nums[0] === 0) return 'G';
      return `${nums[0]}`;
    }
    
    // Build label parts
    const parts = [];
    if (hasBasement) parts.push('B');
    if (nums.includes(0)) parts.push('G');
    
    // Find ranges in regular floors (excluding 0)
    const floors = regular.filter(n => n > 0).sort((a, b) => a - b);
    if (floors.length === 1) {
      parts.push(`${floors[0]}`);
    } else if (floors.length > 1) {
      // Check if consecutive
      const isConsecutive = floors.every((v, i) => i === 0 || v === floors[i-1] + 1);
      if (isConsecutive) {
        parts.push(`${floors[0]}-${floors[floors.length - 1]}`);
      } else {
        // Group into consecutive ranges
        let ranges = [];
        let start = floors[0], end = floors[0];
        for (let i = 1; i < floors.length; i++) {
          if (floors[i] === end + 1) {
            end = floors[i];
          } else {
            ranges.push(start === end ? `${start}` : `${start}-${end}`);
            start = end = floors[i];
          }
        }
        ranges.push(start === end ? `${start}` : `${start}-${end}`);
        parts.push(ranges.join(','));
      }
    }
    
    if (hasTerrace) parts.push('T');
    
    return parts.join(',');
  };

  return (
    <div className="floorplan-viewer">
      {/* Floor selector buttons */}
      <div className="floorplan-viewer__floor-selector">
        {allPlans.map((plan, idx) => (
          <button
            key={plan.id || idx}
            className={`floorplan-viewer__floor-btn ${idx === currentIndex ? 'floorplan-viewer__floor-btn--active' : ''}`}
            onClick={() => switchPage(idx)}
            title={plan.floor_label}
          >
            {getFloorLabel(plan)}
          </button>
        ))}
      </div>

      {/* Current floor label */}
      <div className="floorplan-viewer__label">
        {currentPlan?.floor_label}
        {activeFloor != null && currentPlan?.parsedNumbers.includes(activeFloor) && (
          <span className="floorplan-viewer__active-indicator">
            ● Fire reported on this floor
          </span>
        )}
      </div>

      {/* Controls */}
      <div className="floorplan-viewer__controls">
        <button disabled={currentIndex === 0} onClick={() => switchPage(currentIndex - 1)}>← Prev</button>
        <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}>−</button>
        <span className="floorplan-viewer__zoom">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((z) => Math.min(5, z + 0.25))}>+</button>
        <button onClick={resetView}>Reset</button>
        <button disabled={currentIndex === allPlans.length - 1} onClick={() => switchPage(currentIndex + 1)}>Next →</button>
        {zoom > 1 && <span className="floorplan-viewer__drag-hint">Click & drag to pan</span>}
      </div>

      {/* Image with drag-to-pan */}
      <div
        ref={containerRef}
        className={`floorplan-viewer__container ${isDragging ? 'floorplan-viewer__container--grabbing' : ''} ${zoom > 1 ? 'floorplan-viewer__container--zoomable' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={currentPlan?.floor_label || 'Floor plan'}
            className="floorplan-viewer__image"
            style={{
              transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
              cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
            }}
            draggable={false}
          />
        ) : (
          <p className="floorplan-viewer__no-image">Image not available</p>
        )}
      </div>

      <p className="floorplan-viewer__caption">
        {currentIndex + 1} of {allPlans.length} sheets · Scroll to zoom, drag to pan
      </p>
    </div>
  );
}