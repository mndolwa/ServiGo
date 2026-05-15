import { useMemo, useState } from "react";
import IconActionButton from "../../common/IconActionButton";
import ConfirmActionModal from "../../common/ConfirmActionModal";

export default function ServicesPanel({
  t,
  filters,
  setFilters,
  categories,
  services,
  servicesPageData,
  user,
  money,
  actionClassName,
  actionDone,
  actionLoading,
  runTrackedAction,
  publishService,
  updateService,
  deleteService,
  openServiceDetails,
  findNearbyProviders,
  clearNearbyProvidersFilter,
  nearbySearchMeta,
  nearbyFilterActive,
  renderListPagination,
}) {
  const [editingService, setEditingService] = useState(null);
  const [pendingDeleteService, setPendingDeleteService] = useState(null);

  const categoryCards = useMemo(() => {
    return categories.map((category) => {
      const categoryServices = services.filter((service) => String(service.category) === String(category.id));
      const onlineProviders = categoryServices.filter((service) => service.provider_is_online).length;
      const minPrice = categoryServices.length ? Math.min(...categoryServices.map((service) => Number(service.price || 0))) : 0;
      const topTitles = categoryServices.slice(0, 3).map((service) => service.title).join(" | ");
      return {
        id: category.id,
        name: category.name,
        count: categoryServices.length,
        onlineProviders,
        minPrice,
        details: topTitles || "No matching services",
      };
    });
  }, [categories, services]);

  const openServiceEditor = (service) => {
    setEditingService({
      id: service.id,
      title: service.title || "",
      description: service.description || "",
      price: String(service.price ?? ""),
      duration_minutes: String(service.duration_minutes ?? 60),
      category: String(service.category ?? ""),
    });
  };

  const saveServiceChanges = async () => {
    if (!editingService) return;
    const ok = await runTrackedAction(`service-edit-${editingService.id}`, async () => {
      await updateService(editingService.id, {
        title: editingService.title,
        description: editingService.description,
        price: Number(editingService.price || 0),
        duration_minutes: Number(editingService.duration_minutes || 60),
        category: editingService.category ? Number(editingService.category) : null,
      });
    });
    if (ok) {
      setEditingService(null);
    }
  };

  const focusServiceCard = (serviceId) => {
    if (!serviceId) return;
    const elementId = `service-card-${serviceId}`;
    const target = document.getElementById(elementId);
    if (!target) return;
    window.location.hash = `service-${serviceId}`;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const onCategoryCardClick = (cardId, active) => {
    const nextCategory = active ? "" : String(cardId);
    setFilters({ ...filters, category: nextCategory });

    const nextTarget = nextCategory
      ? services.find((service) => String(service.category) === nextCategory)
      : services[0];

    if (nextTarget) {
      window.setTimeout(() => focusServiceCard(nextTarget.id), 50);
    }
  };

  return (
    <article className="panel full">
      <h3>{t("Service Marketplace")}</h3>
      <div className="search-grid">
        <input placeholder="Search service" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
        <input placeholder="Location" value={filters.location} onChange={(e) => setFilters({ ...filters, location: e.target.value })} />
        <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
          <option value="">{t("All categories")}</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      </div>
      <div className="inline-actions" style={{ marginTop: 10 }}>
        <button className="btn btn-ghost" onClick={() => findNearbyProviders(10)} type="button">
          {t("Suggest nearby providers")}
        </button>
        {nearbyFilterActive && (
          <button className="btn btn-ghost" onClick={clearNearbyProvidersFilter} type="button">
            {t("Clear nearby filter")}
          </button>
        )}
        {nearbySearchMeta && (
          <span className="chip">
            {nearbySearchMeta.count} providers within {nearbySearchMeta.radiusKm} km
          </span>
        )}
      </div>
      <div className="category-card-row" aria-label="Service categories quick cards">
        {categoryCards.map((card) => {
          const active = String(filters.category) === String(card.id);
          return (
            <button
              type="button"
              key={card.id}
              className={`category-small-card ${active ? "active" : ""}`}
              title={card.details}
              onClick={() => onCategoryCardClick(card.id, active)}
            >
              <strong>{card.name}</strong>
              <small>{card.count} services</small>
              <small>{card.onlineProviders} online</small>
              <small>From {money(card.minPrice)}</small>
            </button>
          );
        })}
      </div>
      <ul className="card-list">
        {servicesPageData.items.map((s, index) => (
          <li key={s.id} id={`service-card-${s.id}`} className={`card-item ${index === 0 ? "card-item--featured" : ""}`}>
            <div className="service-card-main" onClick={() => {
              focusServiceCard(s.id);
              if (user.role === "seeker") {
                openServiceDetails(s);
              }
            }}>
              {index === 0 && <span className="chip chip--featured">Top match</span>}
              <strong>{s.title}</strong>
              <p>{s.description}</p>
              <small>
                {s.provider_name} | {s.provider_location} | Rating {s.provider_rating || 0} | Booked {s.booking_count || 0}
              </small>
              <small>
                {s.provider_is_available ? "Available" : "Unavailable"} • {s.provider_is_online ? "Online" : "Offline"}
              </small>
            </div>
            <div className="inline-actions">
              <span className="chip">{money(s.price)}</span>
              {user.role === "admin" && (
                <>
                  <IconActionButton
                    icon={s.is_published ? "visibility_off" : "publish"}
                    label={s.is_published ? t("Unpublish service") : t("Publish service")}
                    variant="success"
                    disabled={actionLoading[`publish-${s.id}`]}
                    onClick={() => runTrackedAction(`publish-${s.id}`, () => publishService(s.id, !s.is_published))}
                  />
                  <IconActionButton
                    icon={actionDone[`service-edit-${s.id}`] ? "check_circle" : "edit"}
                    label={actionDone[`service-edit-${s.id}`] ? t("Saved") : t("Edit service")}
                    variant="primary"
                    onClick={() => openServiceEditor(s)}
                  />
                  <IconActionButton
                    icon="delete"
                    label={t("Delete service")}
                    variant="danger"
                    className="admin-delete-action"
                    revealOnRowHover
                    disabled={actionLoading[`service-delete-${s.id}`]}
                    onClick={() => setPendingDeleteService(s)}
                  />
                </>
              )}
              {user.role === "seeker" && (
                <button className={actionClassName("primary")} onClick={() => openServiceDetails(s)}>Open</button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {renderListPagination("services", servicesPageData)}

      {editingService && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Edit service">
          <div className="modal-card">
            <h4>{t("Edit Service")}</h4>
            <div className="grid-form">
              <input
                value={editingService.title}
                onChange={(e) => setEditingService((prev) => ({ ...prev, title: e.target.value }))}
                placeholder={t("Service title")}
              />
              <textarea
                value={editingService.description}
                onChange={(e) => setEditingService((prev) => ({ ...prev, description: e.target.value }))}
                placeholder={t("Description")}
              />
              <div className="search-grid">
                <select
                  value={editingService.category}
                  onChange={(e) => setEditingService((prev) => ({ ...prev, category: e.target.value }))}
                >
                  <option value="">{t("Choose category")}</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min="0"
                  value={editingService.price}
                  onChange={(e) => setEditingService((prev) => ({ ...prev, price: e.target.value }))}
                  placeholder={t("Price")}
                />
                <input
                  type="number"
                  min="10"
                  step="5"
                  value={editingService.duration_minutes}
                  onChange={(e) => setEditingService((prev) => ({ ...prev, duration_minutes: e.target.value }))}
                  placeholder={t("Duration (mins)")}
                />
              </div>
            </div>
            <div className="inline-actions">
              <button type="button" onClick={() => setEditingService(null)}>{t("Cancel")}</button>
              <button
                type="button"
                className="action-btn action-btn--primary"
                onClick={saveServiceChanges}
                disabled={actionLoading[`service-edit-${editingService.id}`]}
              >
                {actionLoading[`service-edit-${editingService.id}`] ? t("Saving...") : t("Save")}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmActionModal
        open={Boolean(pendingDeleteService)}
        title={t("Delete Service")}
        message={pendingDeleteService ? `${t("Delete")} ${pendingDeleteService.title}? ${t("This action cannot be undone.")}` : ""}
        confirmLabel={t("Delete")}
        cancelLabel={t("Cancel")}
        confirmClassName="action-btn action-btn--danger"
        loading={pendingDeleteService ? actionLoading[`service-delete-${pendingDeleteService.id}`] : false}
        onCancel={() => setPendingDeleteService(null)}
        onConfirm={async () => {
          if (!pendingDeleteService) return;
          const ok = await runTrackedAction(`service-delete-${pendingDeleteService.id}`, () => deleteService(pendingDeleteService.id));
          if (ok) {
            setPendingDeleteService(null);
          }
        }}
      />
    </article>
  );
}
