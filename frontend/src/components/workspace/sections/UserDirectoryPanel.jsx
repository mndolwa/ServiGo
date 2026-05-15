import { useState } from "react";
import IconActionButton from "../../common/IconActionButton";
import ConfirmActionModal from "../../common/ConfirmActionModal";

export default function UserDirectoryPanel({
  t,
  setAdminRoleFilter,
  usersPageData,
  api,
  fetchCore,
  runTrackedAction,
  actionLoading,
  actionDone,
  updateUserProfile,
  deleteUser,
  renderListPagination,
}) {
  const [editingUser, setEditingUser] = useState(null);
  const [pendingDeleteUser, setPendingDeleteUser] = useState(null);

  const openEditModal = (entry) => {
    setEditingUser({
      id: entry.id,
      first_name: entry.first_name || "",
      last_name: entry.last_name || "",
      phone: entry.phone || "",
      location: entry.location || "",
      latitude: entry.latitude ?? "",
      longitude: entry.longitude ?? "",
      role: entry.role || "seeker",
      is_online: entry.provider_profile?.is_online || false,
      is_available: entry.provider_profile?.is_available ?? true,
    });
  };

  const saveUserChanges = async () => {
    if (!editingUser) return;
    const ok = await runTrackedAction(`user-edit-${editingUser.id}`, async () => {
      await updateUserProfile(editingUser.id, {
        first_name: editingUser.first_name,
        last_name: editingUser.last_name,
        phone: editingUser.phone,
        location: editingUser.location,
        latitude: editingUser.latitude === "" ? null : Number(editingUser.latitude),
        longitude: editingUser.longitude === "" ? null : Number(editingUser.longitude),
        role: editingUser.role,
        provider_profile: editingUser.role === "provider"
          ? {
            is_online: Boolean(editingUser.is_online),
            is_available: Boolean(editingUser.is_available),
          }
          : undefined,
      });
    });
    if (ok) {
      setEditingUser(null);
    }
  };

  return (
    <article className="panel full">
      <h3>{t("User Directory")}</h3>
      <div className="inline-actions">
        <button onClick={() => setAdminRoleFilter("all")}>All</button>
        <button onClick={() => setAdminRoleFilter("seeker")}>Seekers</button>
        <button onClick={() => setAdminRoleFilter("provider")}>Providers</button>
        <button onClick={() => setAdminRoleFilter("admin")}>Admins</button>
        <button onClick={() => setAdminRoleFilter("it_support")}>IT Support</button>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Phone</th>
              <th>Location</th>
              <th>Coordinates</th>
              <th>Availability</th>
              <th>Provider Approved</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {usersPageData.items.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.id}</td>
                <td>{`${entry.first_name || ""} ${entry.last_name || ""}`.trim() || "N/A"}</td>
                <td>{entry.email}</td>
                <td>{entry.role}</td>
                <td>{entry.phone || "-"}</td>
                <td>{entry.location || "-"}</td>
                <td>{Number.isFinite(Number(entry.latitude)) && Number.isFinite(Number(entry.longitude)) ? `${entry.latitude}, ${entry.longitude}` : "-"}</td>
                <td>
                  {entry.role === "provider"
                    ? `${entry.provider_profile?.is_available ? "available" : "unavailable"} / ${entry.provider_profile?.is_online ? "online" : "offline"}`
                    : "-"}
                </td>
                <td>{String(entry.is_provider_approved)}</td>
                <td>{entry.is_active ? "Active" : "Inactive"}</td>
                <td>{entry.date_joined ? new Date(entry.date_joined).toLocaleDateString() : "-"}</td>
                <td>
                  <div className="inline-actions admin-actions-cell">
                    {entry.role === "provider" && !entry.is_provider_approved && (
                      <IconActionButton
                        icon="verified_user"
                        label={actionDone[`user-approve-${entry.id}`] ? t("Approved") : t("Approve provider")}
                        disabled={actionLoading[`user-approve-${entry.id}`]}
                        variant="success"
                        onClick={() => runTrackedAction(`user-approve-${entry.id}`, async () => {
                          await api.verifyProvider(entry.id, true);
                          await fetchCore();
                        })}
                      />
                    )}
                    <IconActionButton
                      icon={actionDone[`user-edit-${entry.id}`] ? "check_circle" : "edit"}
                      label={actionDone[`user-edit-${entry.id}`] ? t("Saved") : t("Edit user")}
                      variant="primary"
                      onClick={() => openEditModal(entry)}
                    />
                    <IconActionButton
                      icon="delete"
                      label={t("Delete user")}
                      variant="danger"
                      className="admin-delete-action"
                      disabled={actionLoading[`user-delete-${entry.id}`]}
                      onClick={() => setPendingDeleteUser(entry)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {renderListPagination("users", usersPageData)}

      {editingUser && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Edit user">
          <div className="modal-card">
            <h4>{t("Edit User")}</h4>
            <div className="search-grid">
              <input
                value={editingUser.first_name}
                onChange={(e) => setEditingUser((prev) => ({ ...prev, first_name: e.target.value }))}
                placeholder={t("First name")}
              />
              <input
                value={editingUser.last_name}
                onChange={(e) => setEditingUser((prev) => ({ ...prev, last_name: e.target.value }))}
                placeholder={t("Last name")}
              />
              <input
                value={editingUser.phone}
                onChange={(e) => setEditingUser((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder={t("Phone")}
              />
              <input
                value={editingUser.location}
                onChange={(e) => setEditingUser((prev) => ({ ...prev, location: e.target.value }))}
                placeholder={t("Location")}
              />
              <input
                type="number"
                step="any"
                value={editingUser.latitude}
                onChange={(e) => setEditingUser((prev) => ({ ...prev, latitude: e.target.value }))}
                placeholder={t("Latitude")}
              />
              <input
                type="number"
                step="any"
                value={editingUser.longitude}
                onChange={(e) => setEditingUser((prev) => ({ ...prev, longitude: e.target.value }))}
                placeholder={t("Longitude")}
              />
              <select
                value={editingUser.role}
                onChange={(e) => setEditingUser((prev) => ({ ...prev, role: e.target.value }))}
              >
                <option value="seeker">Seeker</option>
                <option value="provider">Provider</option>
                <option value="admin">Admin</option>
                <option value="it_support">IT Support</option>
              </select>
              {editingUser.role === "provider" && (
                <>
                  <label className="setting-row">
                    <span>{t("Online")}</span>
                    <select
                      value={editingUser.is_online ? "true" : "false"}
                      onChange={(e) => setEditingUser((prev) => ({ ...prev, is_online: e.target.value === "true" }))}
                    >
                      <option value="true">{t("Yes")}</option>
                      <option value="false">{t("No")}</option>
                    </select>
                  </label>
                  <label className="setting-row">
                    <span>{t("Available")}</span>
                    <select
                      value={editingUser.is_available ? "true" : "false"}
                      onChange={(e) => setEditingUser((prev) => ({ ...prev, is_available: e.target.value === "true" }))}
                    >
                      <option value="true">{t("Yes")}</option>
                      <option value="false">{t("No")}</option>
                    </select>
                  </label>
                </>
              )}
            </div>
            <div className="inline-actions">
              <button type="button" onClick={() => setEditingUser(null)}>{t("Cancel")}</button>
              <button
                type="button"
                className="action-btn action-btn--primary"
                onClick={saveUserChanges}
                disabled={actionLoading[`user-edit-${editingUser.id}`]}
              >
                {actionLoading[`user-edit-${editingUser.id}`] ? t("Saving...") : t("Save")}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmActionModal
        open={Boolean(pendingDeleteUser)}
        title={t("Delete User")}
        message={pendingDeleteUser ? `${t("Delete")} ${pendingDeleteUser.email}? ${t("This action cannot be undone.")}` : ""}
        confirmLabel={t("Delete")}
        cancelLabel={t("Cancel")}
        confirmClassName="action-btn action-btn--danger"
        loading={pendingDeleteUser ? actionLoading[`user-delete-${pendingDeleteUser.id}`] : false}
        onCancel={() => setPendingDeleteUser(null)}
        onConfirm={async () => {
          if (!pendingDeleteUser) return;
          const ok = await runTrackedAction(`user-delete-${pendingDeleteUser.id}`, () => deleteUser(pendingDeleteUser.id));
          if (ok) {
            setPendingDeleteUser(null);
          }
        }}
      />
    </article>
  );
}
