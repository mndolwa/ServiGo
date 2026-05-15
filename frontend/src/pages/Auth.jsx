import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { roles } from "../constants/navigation";

export default function Auth({ onLoggedIn, initialRegister = false }) {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(initialRegister);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    phone: "",
    location: "",
    role: "seeker",
  });
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setIsSubmitting(true);
    try {
      if (isRegister) {
        await api.register(form);
        const tokens = await api.login(form.email, form.password);
        localStorage.setItem("servigo_access_token", tokens.access);
        localStorage.setItem("servigo_refresh_token", tokens.refresh);
        localStorage.setItem("servigo_pending_role", form.role);
        localStorage.setItem("servigo_pending_email", form.email);
        setNotice("Account created successfully. Continue to complete your profile.");
        navigate("/auth");
        return;
      }
      const tokens = await api.login(form.email, form.password);
      localStorage.setItem("servigo_access_token", tokens.access);
      localStorage.setItem("servigo_refresh_token", tokens.refresh);
      await new Promise((resolve) => setTimeout(resolve, 500));
      await onLoggedIn();
    } catch (err) {
      if (!err?.response) {
        setError("Cannot reach backend server. Check API host, backend runserver binding, and LAN access.");
      } else {
        setError(err?.response?.data?.detail || "Authentication failed");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="auth-wrap">
      <div className="auth-top">
        <h2>{isRegister ? "Create your ServiGo account" : "Welcome back"}</h2>
        <p>Secure local services and payment tracking in one place.</p>
      </div>
      <form onSubmit={submit} className="panel grid-form">
        {notice && <p className="notice">{notice}</p>}
        {isRegister && (
          <>
            <input placeholder="First name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
            <input placeholder="Last name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required />
            <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            <input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required />
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </>
        )}
        <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <div className="password-field">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            <span className="material-symbols-outlined">{showPassword ? "visibility_off" : "visibility"}</span>
          </button>
        </div>
        {error && <p className="error">{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={isSubmitting}>{isSubmitting ? "Continuing..." : (isRegister ? "Register" : "Login")}</button>
        <button className="btn btn-ghost" type="button" onClick={() => setIsRegister((v) => !v)} disabled={isSubmitting}>
          {isRegister ? "Already have an account? Login" : "Need account? Register"}
        </button>
      </form>
    </section>
  );
}
