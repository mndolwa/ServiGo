export default function InsightsPanel({
  topCategoriesPageData,
  jumpToServiceList,
  handleItemsPerPageChange,
  setListPages,
  renderListPagination,
  recentServicesPageData,
  mostBookedServicesPageData,
  interestingServicesPageData,
  openServiceDetails,
  itemsPerPageOptions,
}) {
  return (
    <article className="panel full">
      <h3>Discover Services</h3>
      <div className="insight-grid">
        <div className="insight-block">
          <h4>Top Categories</h4>
          {topCategoriesPageData.items.map((entry) => <button key={entry.id} className="chip chip-button" onClick={() => jumpToServiceList({ category: entry.id })}>{entry.name} ({entry.count})</button>)}
          <div className="list-pagination">
            <span>Items per page</span>
            <select value={String(topCategoriesPageData.configuredSize)} onChange={(e) => handleItemsPerPageChange("topCategories", e.target.value)}>
              {itemsPerPageOptions.map((option) => (
                <option key={`top-categories-size-${option}`} value={String(option)}>
                  {option === "all" ? "All" : option}
                </option>
              ))}
            </select>
            <button
              disabled={topCategoriesPageData.currentPage <= 1}
              onClick={() => setListPages((prev) => ({ ...prev, topCategories: Math.max(1, topCategoriesPageData.currentPage - 1) }))}
            >
              Prev
            </button>
            <span>Page {topCategoriesPageData.currentPage} of {topCategoriesPageData.totalPages} ({topCategoriesPageData.totalItems} items)</span>
            <button
              disabled={topCategoriesPageData.currentPage >= topCategoriesPageData.totalPages}
              onClick={() => setListPages((prev) => ({ ...prev, topCategories: Math.min(topCategoriesPageData.totalPages, topCategoriesPageData.currentPage + 1) }))}
            >
              Next
            </button>
          </div>
        </div>
        <div className="insight-block">
          <h4>Recent Services</h4>
          <ul>{recentServicesPageData.items.map((s) => <li key={`recent-${s.id}`}><button className="text-link" onClick={() => openServiceDetails(s)}>{s.title}</button></li>)}</ul>
          {renderListPagination("recentServices", recentServicesPageData)}
        </div>
        <div className="insight-block">
          <h4>Most Booked</h4>
          <ul>{mostBookedServicesPageData.items.map((s) => <li key={`booked-${s.id}`}><button className="text-link" onClick={() => openServiceDetails(s)}>{s.title}</button></li>)}</ul>
          {renderListPagination("mostBookedServices", mostBookedServicesPageData)}
        </div>
        <div className="insight-block">
          <h4>Interesting Picks</h4>
          <ul>{interestingServicesPageData.items.map((s) => <li key={`pick-${s.id}`}><button className="text-link" onClick={() => openServiceDetails(s)}>{s.title}</button></li>)}</ul>
          {renderListPagination("interestingServices", interestingServicesPageData)}
        </div>
      </div>
    </article>
  );
}
