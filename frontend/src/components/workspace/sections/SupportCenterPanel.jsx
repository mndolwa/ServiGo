export default function SupportCenterPanel({ t, openSupport }) {
  return (
    <article className="panel full">
      <h3>{t("Support Center")}</h3>
      <p>{t("Need help? Reach us directly and admin will stay informed for all critical issues.")}</p>
      <p>Email: mndolwa26@gmail.com</p>
      <p>Phone: +255 786 225 687</p>
      <button className="btn btn-ghost" onClick={openSupport}>{t("Open Support")}</button>
    </article>
  );
}
