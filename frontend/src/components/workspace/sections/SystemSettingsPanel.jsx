import { useEffect, useState } from "react";

export default function SystemSettingsPanel({
  t,
  theme,
  setTheme,
  language,
  setLanguage,
  user,
  commissionConfig,
  saveCommissionRate,
  smsGateway,
  saveSmsGateway,
}) {
  const [commissionRateInput, setCommissionRateInput] = useState(() => String(commissionConfig?.commission_rate ?? "0.1"));

  useEffect(() => {
    setCommissionRateInput(String(commissionConfig?.commission_rate ?? "0.1"));
  }, [commissionConfig]);

  const handleSaveCommission = async () => {
    const numericRate = Number(commissionRateInput);
    if (Number.isNaN(numericRate) || numericRate <= 0 || numericRate >= 1) {
      return;
    }
    await saveCommissionRate(Number(numericRate.toFixed(4)));
  };

  const [smsForm, setSmsForm] = useState(() => ({
    sender_number: "",
    backup_sender_number: "",
    backend: "console",
    webhook_url: "",
    webhook_token: "",
    is_active: true,
  }));

  useEffect(() => {
    if (!smsGateway) return;
    setSmsForm({
      sender_number: smsGateway.sender_number || "",
      backup_sender_number: smsGateway.backup_sender_number || "",
      backend: smsGateway.backend || "console",
      webhook_url: smsGateway.webhook_url || "",
      webhook_token: smsGateway.webhook_token || "",
      is_active: smsGateway.is_active ?? true,
    });
  }, [smsGateway]);

  const handleSaveSmsGateway = async () => {
    await saveSmsGateway(smsForm);
  };

  return (
    <article className="panel full">
      <h3>{t("System Settings")}</h3>
      <p>{t("Change language and theme from here. Preferences are saved in your session storage.")}</p>
      <label className="setting-row">
        <span>{t("Theme")}</span>
        <select value={theme} onChange={(e) => setTheme(e.target.value)}>
          <option value="light">{t("Light")}</option>
          <option value="dark">{t("Dark")}</option>
          <option value="system">{t("System")}</option>
        </select>
      </label>
      <label className="setting-row">
        <span>{t("Language")}</span>
        <select value={language} onChange={(e) => setLanguage(e.target.value)}>
          <option value="en">English</option>
          <option value="sw">Kiswahili</option>
        </select>
      </label>
      {user?.role === "admin" && (
        <>
          <label className="setting-row">
            <span>{t("Commission rate")}</span>
            <input
              type="number"
              step="0.0001"
              min="0.0001"
              max="0.9999"
              value={commissionRateInput}
              onChange={(e) => setCommissionRateInput(e.target.value)}
            />
          </label>
          <button className="btn btn-primary" type="button" onClick={handleSaveCommission}>
            {t("Save commission")}
          </button>

          <hr className="section-divider" />

          <h4>{t("SMS Gateway")}</h4>
          <p className="small-copy">{t("Manage the sender number, backup number, and delivery backend here.")}</p>
          <label className="setting-row">
            <span>{t("Sender number")}</span>
            <input
              value={smsForm.sender_number || ""}
              onChange={(e) => setSmsForm((prev) => ({ ...prev, sender_number: e.target.value }))}
              placeholder="+255 786 225 687"
            />
          </label>
          <label className="setting-row">
            <span>{t("Backup sender number")}</span>
            <input
              value={smsForm.backup_sender_number || ""}
              onChange={(e) => setSmsForm((prev) => ({ ...prev, backup_sender_number: e.target.value }))}
              placeholder="+255 ..."
            />
          </label>
          <label className="setting-row">
            <span>{t("Backend")}</span>
            <select value={smsForm.backend} onChange={(e) => setSmsForm((prev) => ({ ...prev, backend: e.target.value }))}>
              <option value="console">Console</option>
              <option value="webhook">Webhook</option>
            </select>
          </label>
          <label className="setting-row">
            <span>{t("Webhook URL")}</span>
            <input
              value={smsForm.webhook_url || ""}
              onChange={(e) => setSmsForm((prev) => ({ ...prev, webhook_url: e.target.value }))}
              placeholder="https://provider.example.com/sms"
            />
          </label>
          <label className="setting-row">
            <span>{t("Webhook token")}</span>
            <input
              value={smsForm.webhook_token || ""}
              onChange={(e) => setSmsForm((prev) => ({ ...prev, webhook_token: e.target.value }))}
              placeholder="Optional token"
            />
          </label>
          <label className="setting-row">
            <span>{t("Active")}</span>
            <select
              value={smsForm.is_active ? "true" : "false"}
              onChange={(e) => setSmsForm((prev) => ({ ...prev, is_active: e.target.value === "true" }))}
            >
              <option value="true">{t("Yes")}</option>
              <option value="false">{t("No")}</option>
            </select>
          </label>
          <button className="btn btn-primary" type="button" onClick={handleSaveSmsGateway}>
            {t("Save SMS settings")}
          </button>
        </>
      )}
    </article>
  );
}
