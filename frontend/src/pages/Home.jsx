import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

function Icon({ name }) {
  return <span className="material-symbols-outlined landing-icon">{name}</span>;
}

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadSummary = async () => {
      try {
        const data = await api.platformSummary();
        if (!cancelled) setSummary(data);
      } catch {
        if (!cancelled) setSummary(null);
      }
    };

    loadSummary();

    return () => {
      cancelled = true;
    };
  }, []);

  const links = {
    services: "/workspace?section=ServicesList",
    seekers: "/workspace?section=ServicesList",
    providers: "/workspace?section=MyServices",
    admin: "/workspace?section=UsersList",
    support: "/workspace?section=ChatSupport",
    bookings: "/workspace?section=BookingsList",
    payments: "/workspace?section=PaymentsList",
    completedJobs: "/workspace?section=CompletedJobs",
  };

  const liveValue = (value) => (Number.isFinite(Number(value)) ? value : "Live");

  return (
    <div className="landing-wrap">
      <nav style={{
        position: "sticky",
        top: "16px",
        zIndex: 100,
        marginBottom: "32px",
        background: scrolled ? "var(--paper)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        border: scrolled ? "1px solid var(--line)" : "none",
        borderRadius: "60px",
        padding: "8px 20px",
        transition: "all 0.3s ease"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: "1200px", margin: "0 auto" }}>
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: "12px", color: "inherit" }}>
            <div style={{ width: "40px", height: "40px", background: "linear-gradient(135deg, var(--navy), var(--navy-soft))", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="support_agent" />
            </div>
            <h2 style={{ margin: 0, fontSize: "24px" }}>ServiGo</h2>
          </Link>
          <div style={{ display: "flex", gap: "32px", alignItems: "center" }}>
            <a href="#features" style={{ color: "var(--ink)", textDecoration: "none", fontWeight: 500 }}>Features</a>
            <a href="#how-it-works" style={{ color: "var(--ink)", textDecoration: "none", fontWeight: 500 }}>How It Works</a>
            <a href="#coverage" style={{ color: "var(--ink)", textDecoration: "none", fontWeight: 500 }}>Coverage</a>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <Link to="/auth" className="btn btn-ghost">Login</Link>
            <Link to={links.services} className="btn btn-primary">Browse services</Link>
          </div>
        </div>
      </nav>

      <section className="landing-hero" id="how-it-works">
        <div className="hero-copy">
          <span className="eyebrow"><Icon name="sparkles" /> TRUSTED LOCAL SERVICES PLATFORM</span>
          <h1>
            ServiGo connects you to verified professionals with secure payments.
          </h1>
          <p className="hero-lead">
            Live marketplace data, secure checkout, and direct links into the right workspace section when you need it.
          </p>
          <div className="hero-cta">
            <Link to={links.services} className="btn btn-primary" style={{ padding: "12px 28px" }}>
              Browse services
            </Link>
            <Link to={links.support} className="btn btn-ghost" style={{ padding: "12px 28px" }}>
              Open support
            </Link>
          </div>

          <div className="hero-pills" style={{ marginTop: "32px" }}>
            {[
              ["verified", "Safe payments"],
              ["support_agent", "24/7 support"],
              ["handshake", "Vetted pros"],
              ["route", "Real-time tracking"],
            ].map(([icon, text]) => (
              <span key={text} className="chip chip--featured hero-pill">
                <Icon name={icon} />
                <span>{text}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="status-card hero-panel">
          <div className="hero-panel__top">
            <span className="hero-panel__badge"><Icon name="bolt" /> HOW IT WORKS</span>
            <strong>Get help in 4 simple steps</strong>
          </div>
          <div className="hero-flow">
            {[
              { icon: "person_add", title: "Sign up", desc: "Create a seeker or provider account" },
              { icon: "search", title: "Book services", desc: "Search by location and availability" },
              { icon: "payments", title: "Pay securely", desc: "M-Pesa, Airtel Money, or card" },
              { icon: "chat", title: "Chat live", desc: "Start chatting after booking acceptance" },
              { icon: "task_alt", title: "Complete work", desc: "Release payment and leave feedback" },
            ].map((step) => (
              <div key={step.title}>
                <span className="material-symbols-outlined">{step.icon}</span>
                <strong>{step.title}</strong>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="stats-strip" style={{ marginTop: "24px" }}>
        {[
          { label: "Active users", value: summary?.active_users, icon: "group", link: links.admin },
          { label: "Verified providers", value: summary?.verified_providers, icon: "verified", link: links.admin },
          { label: "Completed jobs", value: summary?.completed_jobs, icon: "task_alt", link: links.completedJobs },
        ].map((stat) => (
          <Link key={stat.label} to={stat.link} className="stat-card stat-card--link">
            <div className="stat-card__icon">
              <Icon name={stat.icon} />
            </div>
            <strong>{liveValue(stat.value)}</strong>
            <p>{stat.label}</p>
          </Link>
        ))}
      </div>

      <section id="features" style={{ marginTop: "48px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <span className="eyebrow"><Icon name="rocket_launch" /> ONE PLATFORM, THREE ROLES</span>
          <h2 style={{ fontSize: "36px", marginTop: "8px" }}>
            Everything you need to connect and transact
          </h2>
          <p style={{ color: "var(--muted)", maxWidth: "600px", margin: "12px auto 0" }}>
            ServiGo is built for everyone in the service ecosystem.
          </p>
        </div>

        <div className="feature-grid modern-grid">
          {[
            {
              icon: "search",
              title: "For Service Seekers",
              description: "Search quickly, book confidently, and keep payment protected until work is complete.",
              to: links.seekers,
              action: "Find a pro",
            },
            {
              icon: "badge",
              title: "For Providers",
              description: "Showcase services, receive bookings, chat with customers, and track payouts transparently.",
              to: links.providers,
              action: "Manage services",
            },
            {
              icon: "admin_panel_settings",
              title: "For Admin Teams",
              description: "Review users, bookings, and platform activity from one workspace.",
              to: links.admin,
              action: "Open dashboard",
            },
          ].map((card) => (
            <Link key={card.title} to={card.to} className="feature-card modern-feature feature-link">
              <div className="feature-icon">
                <Icon name={card.icon} />
              </div>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
              <div className="feature-link__action">
                <span>{card.action}</span>
                <Icon name="arrow_forward" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="trust-band" style={{ marginTop: "48px" }}>
        <div>
          <h3 style={{ margin: "0 0 8px 0" }}>Why choose ServiGo?</h3>
          <p>
            Live marketplace counts are pulled from the backend so the landing page reflects real activity.
          </p>
        </div>
        <div className="trust-band__metrics">
          <div>
            <div className="trust-band__metric-value">{liveValue(summary?.active_services)}</div>
            <div className="trust-band__metric-label">Active services</div>
          </div>
          <div>
            <div className="trust-band__metric-value">{liveValue(summary?.verified_providers)}</div>
            <div className="trust-band__metric-label">Verified providers</div>
          </div>
        </div>
      </div>

      <section id="coverage" style={{ marginTop: "48px", textAlign: "center" }}>
        <span className="eyebrow"><Icon name="public" /> COVERAGE AREAS</span>
        <h2 style={{ fontSize: "32px", marginTop: "8px" }}>Available in major cities</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginTop: "32px" }}>
          {[
            "Nairobi",
            "Toronto",
            "Lagos",
            "Dar es Salaam",
            "Accra",
            "Johannesburg",
          ].map((city) => (
            <Link key={city} to={links.services} className="stat-card stat-card--link">
              <strong>{city}</strong>
              <p style={{ margin: "8px 0 0" }}>Browse available work</p>
            </Link>
          ))}
        </div>
      </section>

      <section style={{ marginTop: "48px", textAlign: "center" }}>
        <span className="eyebrow"><Icon name="payments" /> SECURE PAYMENTS</span>
        <h2 style={{ fontSize: "32px", marginTop: "8px" }}>Multiple payment options</h2>
        <div className="hero-pills" style={{ justifyContent: "center", marginTop: "24px" }}>
          {[
            "M-Pesa",
            "Airtel Money",
            "Tigo Pesa",
            "Visa",
            "Mastercard",
            "Bank Transfer",
          ].map((method) => (
            <Link key={method} to={links.payments} className="chip chip--featured hero-pill">
              {method}
            </Link>
          ))}
        </div>
      </section>

      <section className="trust-band landing-cta" style={{ marginTop: "64px" }}>
        <div>
          <h3 style={{ margin: "0 0 8px 0" }}>Ready to transform local services?</h3>
          <p>
            Open the workspace, review live counts, and move directly into the section you need.
          </p>
        </div>
        <div className="landing-cta__actions">
          <Link to={links.services} className="btn btn-primary">Open workspace</Link>
          <Link to="/auth" className="btn btn-ghost">Sign in</Link>
        </div>
      </section>

      <footer style={{
        marginTop: "64px",
        paddingTop: "48px",
        borderTop: "1px solid var(--line)",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "32px"
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <div style={{ width: "40px", height: "40px", background: "linear-gradient(135deg, var(--navy), var(--navy-soft))", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="support_agent" />
            </div>
            <h3 style={{ margin: 0 }}>ServiGo</h3>
          </div>
          <p style={{ color: "var(--muted)" }}>
            Live marketplace activity, real counts, and direct links into the workspace.
          </p>
        </div>
        <div>
          <h4>Product</h4>
          <ul style={{ listStyle: "none", padding: 0 }}>
            <li><Link to={links.services}>Services</Link></li>
            <li><Link to={links.bookings}>Bookings</Link></li>
            <li><Link to={links.payments}>Payments</Link></li>
          </ul>
        </div>
        <div>
          <h4>Company</h4>
          <ul style={{ listStyle: "none", padding: 0 }}>
            <li><Link to={links.admin}>Dashboard</Link></li>
            <li><Link to={links.support}>Support</Link></li>
            <li><Link to="/auth">Login</Link></li>
          </ul>
        </div>
        <div>
          <h4>Legal</h4>
          <ul style={{ listStyle: "none", padding: 0 }}>
            <li><Link to="/auth">Privacy</Link></li>
            <li><Link to="/auth">Terms</Link></li>
          </ul>
        </div>
      </footer>
    </div>
  );
}