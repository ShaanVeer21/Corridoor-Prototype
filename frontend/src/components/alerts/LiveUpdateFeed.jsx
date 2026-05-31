import { useState, useEffect, useRef } from 'react';
import { getUpdates, connectAlertWS, getPhotoUrl } from '../../utils/api';
import { formatDateTime, timeAgo } from '../../utils/helpers';
import './LiveUpdateFeed.css';

export default function LiveUpdateFeed({ alertId }) {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const feedRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    if (!alertId) return;
    setLoading(true);
    getUpdates(alertId)
      .then(setUpdates)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [alertId]);

  useEffect(() => {
    if (!alertId) return;
    const ws = connectAlertWS(alertId, (message) => {
      if (message.type === 'REAL_TIME_UPDATE') {
        setUpdates((prev) => [...prev, message.data]);
      }
    });
    wsRef.current = ws;
    return () => ws?.close();
  }, [alertId]);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [updates]);

  if (loading) {
    return <div className="live-feed__loading">Loading updates...</div>;
  }

  return (
    <div className="live-feed">
      <div className="live-feed__header">
        <span className="live-feed__title">Live Updates</span>
        <span className="live-feed__count">{updates.length} update{updates.length !== 1 ? 's' : ''}</span>
        <span className="live-feed__indicator" />
      </div>

      <div className="live-feed__list" ref={feedRef}>
        {updates.length === 0 ? (
          <div className="live-feed__empty">No updates yet — waiting for staff reports</div>
        ) : (
          updates.map((upd, i) => (
            <div key={upd.id || i} className="live-feed__item animate-slide">
              <div className="live-feed__item-header">
                <span className="live-feed__sender">{upd.sender_name || 'Staff'}</span>
                <span className="live-feed__time" title={formatDateTime(upd.sent_at)}>
                  {timeAgo(upd.sent_at)}
                </span>
              </div>

              {upd.message && (
                <p className="live-feed__message">{upd.message}</p>
              )}

              {/* Photo attachment */}
              {upd.photo_url && (
                <div className="live-feed__photo">
                  <img
                    src={getPhotoUrl(upd.photo_url)}
                    alt="Update photo"
                    className="live-feed__photo-img"
                    onClick={() => window.open(getPhotoUrl(upd.photo_url), '_blank')}
                  />
                </div>
              )}

              <div className="live-feed__details">
                {upd.floor_number != null && (
                  <span className="live-feed__tag">Floor {upd.floor_number}</span>
                )}
                {upd.affected_area && (
                  <span className="live-feed__tag">{upd.affected_area}</span>
                )}
                {upd.estimated_occupants != null && (
                  <span className="live-feed__tag">{upd.estimated_occupants} occupants</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}