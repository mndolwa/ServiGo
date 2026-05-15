import { useState } from "react";
import ConfirmActionModal from "../../common/ConfirmActionModal";

export default function NotificationsPanel({ t, api, fetchCore, clearNotifications, notifications, notificationsPageData, renderListPagination, runTrackedAction, actionLoading }) {
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <article className="panel full">
      <h3>{t("Notifications")}</h3>
      <div className="inline-actions">
        <button onClick={() => api.markAllNotificationsRead().then(fetchCore)}>{t("Mark all as read")}</button>
        <button onClick={() => setConfirmClear(true)}>{t("Clear all")}</button>
      </div>
      {notifications.length ? (
        <ul className="card-list">
          {notificationsPageData.items.map((n) => (
            <li key={n.id} className="card-item">
              <div>
                <strong>{n.title}</strong>
                <p>{n.message}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty-state">{t("No notifications yet. New updates will appear here.")}</p>
      )}
      {renderListPagination("notifications", notificationsPageData)}

      <ConfirmActionModal
        open={confirmClear}
        title={t("Clear Notifications")}
        message={t("Clear all notifications from your workspace?")}
        confirmLabel={t("Clear all")}
        cancelLabel={t("Cancel")}
        confirmClassName="action-btn action-btn--danger"
        loading={actionLoading?.["notifications-clear-all"]}
        onCancel={() => setConfirmClear(false)}
        onConfirm={async () => {
          const ok = await runTrackedAction("notifications-clear-all", clearNotifications);
          if (ok) {
            setConfirmClear(false);
          }
        }}
      />
    </article>
  );
}
