export default function PublishServicePanel({ t, createService, serviceForm, setServiceForm, categories, submittedForms, onViewMyServices, onOpenMarketplace }) {
  return (
    <article className="panel">
      <div className="dashboard-hub__header">
        <div>
          <h3>{t("Publish Service")}</h3>
          <p>Use this form to add a new service. Your existing services stay in the My Services card.</p>
        </div>
        <div className="inline-actions">
          <button className="btn btn-ghost" type="button" onClick={onViewMyServices}>{t("My Services")}</button>
          <button className="btn btn-ghost" type="button" onClick={onOpenMarketplace}>{t("Open Marketplace")}</button>
        </div>
      </div>
      <p className="empty-state">Submitted services are reviewed by admin before being visible to seekers.</p>
      <form className="grid-form" onSubmit={createService}>
        <input placeholder="Title" value={serviceForm.title} onChange={(e) => setServiceForm({ ...serviceForm, title: e.target.value })} required />
        <select value={serviceForm.category} onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })} required>
          <option value="">Select category</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <textarea placeholder="Description" value={serviceForm.description} onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })} required />
        <input type="number" step="0.01" placeholder="Price" value={serviceForm.price} onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })} required />
        <input type="number" min="15" placeholder="Duration minutes" value={serviceForm.duration_minutes} onChange={(e) => setServiceForm({ ...serviceForm, duration_minutes: e.target.value })} required />
        <button className={`btn btn-primary ${submittedForms.service ? "btn-success" : ""}`} type="submit">{submittedForms.service ? t("Submitted") : t("Publish Service")}</button>
      </form>
    </article>
  );
}
