import { useState } from 'react';
import { getFloorplanUrl } from '../../utils/api';
import './FloorplanViewer.css';

export default function FloorplanViewer({ path }) {
  const [zoom, setZoom] = useState(1);
  const url = getFloorplanUrl(path);

  if (!url) {
    return (
      <div className="floorplan-viewer floorplan-viewer--empty">
        <p>No floorplan available for this building</p>
      </div>
    );
  }

  return (
    <div className="floorplan-viewer">
      <div className="floorplan-viewer__controls">
        <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}>−</button>
        <span className="floorplan-viewer__zoom">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((z) => Math.min(3, z + 0.25))}>+</button>
        <button onClick={() => setZoom(1)}>Reset</button>
      </div>
      <div className="floorplan-viewer__container">
        <img
          src={url}
          alt="Building floorplan"
          className="floorplan-viewer__image"
          style={{ transform: `scale(${zoom})` }}
          draggable={false}
        />
      </div>
      <p className="floorplan-viewer__caption">
        Prototype: shared dummy floorplan — production uses per-building plans from NOC file
      </p>
    </div>
  );
}
