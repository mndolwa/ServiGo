import { useState } from "react";

function buildBarcodeSegments(value) {
  const source = String(value || "");
  let seed = 0;
  for (const character of source) {
    seed = (seed * 31 + character.charCodeAt(0)) >>> 0;
  }

  const bars = [];
  let position = 0;
  for (let index = 0; index < 54; index += 1) {
    const bit = (seed >> (index % 16)) & 1;
    const width = bit ? 2 : 1;
    const height = bit ? 38 : 32;
    bars.push({ x: position, width, height });
    position += width + 1;
  }

  return { bars, width: position };
}

export default function ReceiptsPanel({ t, money, receiptsPageData, renderListPagination, setSection, api, setWorkspaceNotice }) {
  const [activeReceipt, setActiveReceipt] = useState(null);

  const closeReceipt = () => setActiveReceipt(null);

  const getReceiptPdfBlob = async (receipt) => {
    if (!receipt?.payment_id) {
      throw new Error("Receipt payment id is missing.");
    }
    return api.receiptPdf(receipt.payment_id);
  };

  const downloadReceiptPdf = async () => {
    if (!activeReceipt) return;
    try {
      const blob = await getReceiptPdfBlob(activeReceipt);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${activeReceipt.receipt_number || `receipt-${activeReceipt.id}`}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      setWorkspaceNotice?.(`Receipt downloaded: ${activeReceipt.receipt_number}`);
    } catch {
      setWorkspaceNotice?.("Failed to download receipt PDF.");
    }
  };

  const printReceiptPdf = async () => {
    if (!activeReceipt) return;
    try {
      const blob = await getReceiptPdfBlob(activeReceipt);
      const url = window.URL.createObjectURL(blob);
      const pdfWindow = window.open(url, "_blank", "noopener,noreferrer");
      if (pdfWindow) {
        pdfWindow.focus();
        window.setTimeout(() => {
          try {
            pdfWindow.focus();
            pdfWindow.print();
          } catch {
            // Some browsers block automated print on PDF viewers.
          }
        }, 1200);
      }
      window.setTimeout(() => window.URL.revokeObjectURL(url), 15000);
      setWorkspaceNotice?.(`Receipt opened for printing: ${activeReceipt.receipt_number}`);
    } catch {
      setWorkspaceNotice?.("Failed to open receipt for printing.");
    }
  };

  const barcode = activeReceipt ? buildBarcodeSegments(activeReceipt.receipt_number || activeReceipt.id) : null;

  return (
    <>
      <article className="panel full">
        <div className="dashboard-hub__header">
          <div>
            <h3>{t("Receipts")}</h3>
            <p>Generated receipts stay here and can be opened by the user who generated or received them.</p>
          </div>
          <button className="btn btn-ghost" type="button" onClick={() => setSection("PaymentsList")}>{t("Back to Payments")}</button>
        </div>
        <ul className="card-list">
          {receiptsPageData.items.map((receipt) => (
            <li key={receipt.id} className="card-item">
              <div>
                <strong>{receipt.receipt_number}</strong>
                <p>{receipt.service_title}</p>
                <small>Booking #{receipt.booking_id} | {receipt.payment_method} | <span className={`status-text status-text--${String(receipt.payment_status).replace(" ", "-")}`}>{receipt.payment_status}</span></small>
              </div>
              <div className="inline-actions">
                <span>{money(receipt.payment_amount)}</span>
                <button type="button" className="icon-view-btn" title="View EFD receipt" onClick={() => setActiveReceipt(receipt)}>
                  <span className="material-symbols-outlined">visibility</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
        {!receiptsPageData.items.length && <p className="empty-state">No receipts yet. Generate a receipt from a released payment to see it here.</p>}
        {renderListPagination("receipts", receiptsPageData)}
      </article>

      {activeReceipt && (
        <div className="modal-backdrop" onClick={closeReceipt}>
          <div className="modal-card efd-receipt" onClick={(event) => event.stopPropagation()}>
            <div className="efd-header">
              <strong>SERVIGO EFD RECEIPT</strong>
              <span>{activeReceipt.receipt_number}</span>
            </div>
            <div className="efd-line"><span>Booking</span><span>#{activeReceipt.booking_id}</span></div>
            <div className="efd-line"><span>Service</span><span>{activeReceipt.service_title}</span></div>
            <div className="efd-line"><span>Method</span><span>{String(activeReceipt.payment_method || "").toUpperCase()}</span></div>
            <div className="efd-line"><span>Status</span><span>{activeReceipt.payment_status}</span></div>
            <div className="efd-total"><span>Total</span><span>{money(activeReceipt.payment_amount)}</span></div>
            <div className="receipt-barcode-block">
              <div className="receipt-barcode">
                <svg viewBox={`0 0 ${barcode?.width || 1} 44`} role="img" aria-label={`Barcode for ${activeReceipt.receipt_number}`}>
                  {(barcode?.bars || []).map((bar, index) => (
                    <rect key={`${bar.x}-${index}`} x={bar.x} y={44 - bar.height} width={bar.width} height={bar.height} rx="0.5" />
                  ))}
                </svg>
              </div>
              <small className="receipt-barcode-label">{activeReceipt.receipt_number}</small>
            </div>
            <p className="efd-footnote">Official fiscal-style receipt view for ServiGo transaction history.</p>
            <div className="receipt-actions">
              <button type="button" className="btn btn-ghost" onClick={printReceiptPdf}>{t("Print")}</button>
              <button type="button" className="btn btn-primary" onClick={downloadReceiptPdf}>{t("Download PDF")}</button>
              <button type="button" className="btn btn-ghost" onClick={closeReceipt}>{t("Close")}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
