import { useState, useEffect } from 'react';
import './AlertToast.css';

const CATEGORY_ICONS = {
  fire: '🔥',
  rescue: '🚑',
  collapse: '🏚️',
  other: '⚠️',
};

export default function AlertToast({ alert, onOpen, onDismiss }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, 15000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgipGQdVxZb4+suspxQjI8aIiYkHFXUGmDnr+1hUw4OWCCl5t0WVFpgp68sYNMOTlghJicdlpRaIGeu7GCTD05');
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch (e) {}
  }, []);

  if (!visible) return null;

  const categoryIcon = CATEGORY_ICONS[alert.incident_category] || '🚨';

  return (
    <div className="alert-toast animate-in" onClick={() => onOpen?.(alert)}>
      <div className="alert-toast__pulse" />
      <div className="alert-toast__content">
        <div className="alert-toast__top">
          <span className="alert-toast__icon">{categoryIcon}</span>
          <span className="alert-toast__label">
            INCOMING {(alert.incident_category || 'EMERGENCY').toUpperCase()} ALERT
          </span>
          <button
            className="alert-toast__close"
            onClick={(e) => {
              e.stopPropagation();
              setVisible(false);
              onDismiss?.();
            }}
          >
            ✕
          </button>
        </div>
        <div className="alert-toast__body">
          <span className="alert-toast__building">
            {alert.building_name || alert.building_id}
          </span>
          {alert.is_high_hazard && (
            <span className="alert-toast__hazard">⚠ HIGH HAZARD</span>
          )}
        </div>
        <div className="alert-toast__footer">
          <span className="alert-toast__type">
            {alert.building_type}
            {alert.ward && ` · ${alert.ward}`}
            {alert.area_name && ` · ${alert.area_name}`}
          </span>
          <span className="alert-toast__action">Click to open incident packet →</span>
        </div>
        {alert.reporter_name && (
          <div className="alert-toast__reporter">
            Reported by {alert.reporter_name}
            {alert.floor && ` · ${alert.floor}`}
          </div>
        )}
      </div>
    </div>
  );
}