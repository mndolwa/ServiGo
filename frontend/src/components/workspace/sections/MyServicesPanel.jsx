export default function MyServicesPanel({
  t,
  user,
  providerServices,
  money,
  onAddService,
  onOpenMarketplace,
}) {
  const publishedCount = providerServices.filter((service) => service.is_published).length;
  const unpublishedCount = providerServices.length - publishedCount;

  return (
    <article className="panel full">
      <div className="dashboard-hub__header">
        <div>
          <h3>{t("My Services")}</h3>
          <p>Your own services are shown here. Use the add card to create a new one without leaving this flow.</p>
        </div>
        <div className="inline-actions">
          <button className="btn btn-ghost" type="button" onClick={onOpenMarketplace}>{t("Open Marketplace")}</button>
          <button className="btn btn-primary" type="button" onClick={onAddService}>{t("Add Service")}</button>
        </div>
      </div>
      <div className="finance-summary">
        <span className="status-chip status-chip--total">{providerServices.length} total</span>
        <span className="status-chip status-chip--published">{publishedCount} published</span>
        <span className="status-chip status-chip--pending">{unpublishedCount} pending</span>
      </div>
      <ul className="card-list">
        {providerServices.map((service) => (
          <li key={service.id} className="card-item">
            <div>
              <strong>{service.title}</strong>
              <p>{service.description}</p>
              <small className={service.is_published ? "status-text status-text--published" : "status-text status-text--pending"}>
                {service.is_published ? "Published" : "Draft / pending review"}
              </small>
              <small> | {service.category_name || service.category}</small>
            </div>
            <div className="inline-actions">
              <span>{money(service.price)}</span>
              <button className="action-btn action-btn--primary" type="button" onClick={onOpenMarketplace}>Marketplace</button>
            </div>
          </li>
        ))}
      </ul>
      {!providerServices.length && <p className="empty-state">You have not added any services yet. Use Add Service to create your first listing.</p>}
    </article>
  );
}
