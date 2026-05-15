import React from "react";

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20, 30, "all"];

export default function ListPagination({ listKey, pageData, onSizeChange, onPrev, onNext, t }) {
  return (
    <div className="list-pagination">
      <span>{t("Items per page")}</span>
      <select value={String(pageData.configuredSize)} onChange={(e) => onSizeChange(listKey, e.target.value)}>
        {ITEMS_PER_PAGE_OPTIONS.map((option) => (
          <option key={`${listKey}-size-${option}`} value={String(option)}>
            {option === "all" ? "All" : option}
          </option>
        ))}
      </select>
      <button disabled={pageData.currentPage <= 1} onClick={onPrev}>{t("Prev")}</button>
      <span>Page {pageData.currentPage} of {pageData.totalPages} ({pageData.totalItems} items)</span>
      <button disabled={pageData.currentPage >= pageData.totalPages} onClick={onNext}>{t("Next")}</button>
    </div>
  );
}
