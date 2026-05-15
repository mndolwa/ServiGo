import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api as apiClientImport } from "../api";

const emptyFiles = {
  profile_image: null,
  nin_document: null,
  service_certificate: null,
  birth_certificate: null,
  cv_document: null,
};

export default function Register({ t = (key) => key, api }) {
  const apiClient = api || apiClientImport;
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    // Basic Info
    email: "",
    password: "",
    password_confirm: "",
    first_name: "",
    last_name: "",
    role: "",
    // Common Profile Info
    phone: "",
    location: "",
    bio: "",
    // Identity
    national_id_number: "",
    // Provider Specific
    service_name: "",
    service_category: "",
    years_of_experience: "",
  });
  
  const [files, setFiles] = useState(emptyFiles);
  const [fileNames, setFileNames] = useState({
    profile_image: "No file selected",
    nin_document: "No file selected",
    service_certificate: "No file selected",
    birth_certificate: "No file selected",
    cv_document: "No file selected",
  });
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [previewMode, setPreviewMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isProvider = formData.role === "provider";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e) => {
    const { name, files: fileList } = e.target;
    const file = fileList?.[0] || null;
    if (file) {
      setFiles((prev) => ({
        ...prev,
        [name]: file,
      }));
      setFileNames((prev) => ({
        ...prev,
        [name]: file.name,
      }));
    }
  };

  const validateStep1 = () => {
    setError("");

    if (!formData.email.trim()) {
      setError(t("Email is required"));
      return false;
    }
    if (!formData.email.includes("@")) {
      setError(t("Please enter a valid email address"));
      return false;
    }
    if (!formData.password) {
      setError(t("Password is required"));
      return false;
    }
    if (formData.password.length < 8) {
      setError(t("Password must be at least 8 characters long"));
      return false;
    }
    if (formData.password !== formData.password_confirm) {
      setError(t("Passwords do not match"));
      return false;
    }
    if (!formData.first_name.trim()) {
      setError(t("First name is required"));
      return false;
    }
    if (!formData.last_name.trim()) {
      setError(t("Last name is required"));
      return false;
    }
    if (!formData.role) {
      setError(t("Please select a role"));
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    setError("");

    // Common fields validation
    if (!formData.phone.trim()) {
      setError(t("Phone number is required"));
      return false;
    }
    if (!formData.location.trim()) {
      setError(t("Location is required"));
      return false;
    }
    if (!formData.bio.trim()) {
      setError(t("Bio is required"));
      return false;
    }
    if (formData.bio.length < 20) {
      setError(t("Bio must be at least 20 characters"));
      return false;
    }
    if (!formData.national_id_number.trim()) {
      setError(t("National ID Number (NIN) is required"));
      return false;
    }
    if (formData.national_id_number.length < 10) {
      setError(t("Please enter a valid NIN (minimum 10 characters)"));
      return false;
    }
    if (!files.profile_image) {
      setError(t("Profile image is required"));
      return false;
    }
    if (!files.nin_document) {
      setError(t("NIN document is required"));
      return false;
    }

    // Provider-specific validation
    if (isProvider) {
      if (!formData.service_name.trim()) {
        setError(t("Service name is required"));
        return false;
      }
      if (!formData.service_category) {
        setError(t("Service category is required"));
        return false;
      }
      if (!formData.years_of_experience) {
        setError(t("Years of experience is required"));
        return false;
      }
      if (parseInt(formData.years_of_experience) < 0) {
        setError(t("Years of experience must be a positive number"));
        return false;
      }
      if (!files.service_certificate) {
        setError(t("Service certificate is required"));
        return false;
      }
      if (!files.birth_certificate) {
        setError(t("Birth certificate is required"));
        return false;
      }
      if (!files.cv_document) {
        setError(t("CV document is required"));
        return false;
      }
    }

    return true;
  };

  const handleStep1Submit = async (e) => {
    e.preventDefault();

    if (!validateStep1()) {
      return;
    }

    setLoading(true);

    try {
      await apiClient.register({
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        role: formData.role,
        username: formData.email.split('@')[0] + Date.now(),
      });

      const tokens = await apiClient.login(formData.email, formData.password);
      localStorage.setItem("servigo_access_token", tokens.access);
      localStorage.setItem("servigo_refresh_token", tokens.refresh);
      localStorage.setItem("servigo_pending_role", formData.role);
      localStorage.setItem("servigo_pending_email", formData.email);
      
      setStep(2);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.response?.data?.error ||
          t("Registration failed. Please try again.")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleStep2Submit = async (e) => {
    e.preventDefault();

    if (!validateStep2()) {
      return;
    }

    setLoading(true);

    try {
      const payload = new FormData();
      
      // Common fields
      payload.append("bio", formData.bio);
      payload.append("location", formData.location);
      payload.append("phone", formData.phone);
      payload.append("national_id_number", formData.national_id_number);
      payload.append("profile_image", files.profile_image);
      payload.append("nin_document", files.nin_document);

      // Provider-specific fields
      if (isProvider) {
        payload.append("service_name", formData.service_name);
        payload.append("service_category", formData.service_category);
        payload.append("years_of_experience", formData.years_of_experience);
        payload.append("service_certificate", files.service_certificate);
        payload.append("birth_certificate", files.birth_certificate);
        payload.append("cv_document", files.cv_document);
      }

      await apiClient.profileUpload(payload);

      // Clear temp data
      localStorage.removeItem("servigo_pending_role");
      localStorage.removeItem("servigo_pending_email");
      
      // Redirect to dashboard
      navigate("/workspace?section=Dashboard");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.response?.data?.error ||
          t("Profile completion failed. Please try again.")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="register-page">
      <div className="register-container">
        <div className="register-box">
          {/* Progress Steps */}
          <div className="registration-progress">
            <div className={`progress-step ${step === 1 ? "active" : "completed"}`}>
              <div className="step-number">1</div>
              <div className="step-label">{t("Basic Account")}</div>
            </div>
            <div className="progress-line"></div>
            <div className={`progress-step ${step === 2 ? "active" : ""}`}>
              <div className="step-number">2</div>
              <div className="step-label">
                {isProvider ? t("Provider Documents") : t("Identity Verification")}
              </div>
            </div>
          </div>

          <div className="register-hero-card">
            <div className="logo-icon">S</div>
            <h1>{t("Create Your ServiGo Account")}</h1>
            <p className="register-subtitle">
              {step === 1
                ? t("Join thousands of users connecting for trusted local services")
                : isProvider
                  ? t("Complete your provider profile with certificates and verification documents")
                  : t("Complete your profile with identity verification")}
            </p>
            {step === 2 && (
              <div className="role-badge">
                {isProvider ? "📋 Provider Registration" : "👤 Seeker Registration"}
              </div>
            )}
          </div>

          {error && (
            <div className="alert-message error">
              <span className="material-symbols-outlined">error</span>
              {error}
            </div>
          )}

          {step === 1 ? (
            // Step 1: Basic Registration Form
            <form onSubmit={handleStep1Submit} className="register-form">
              <fieldset className="form-section">
                <legend>{t("Select Your Role")}</legend>
                <div className="role-radio-grid">
                  <label className={`radio-option ${formData.role === "seeker" ? "active" : ""}`}>
                    <input
                      type="radio"
                      name="role"
                      value="seeker"
                      checked={formData.role === "seeker"}
                      onChange={handleChange}
                    />
                    <div className="role-option-content">
                      <span className="role-emoji">👤</span>
                      <div>
                        <strong>{t("Service Seeker")}</strong>
                        <small>{t("I need services from trusted professionals")}</small>
                      </div>
                    </div>
                  </label>
                  <label className={`radio-option ${formData.role === "provider" ? "active" : ""}`}>
                    <input
                      type="radio"
                      name="role"
                      value="provider"
                      checked={formData.role === "provider"}
                      onChange={handleChange}
                    />
                    <div className="role-option-content">
                      <span className="role-emoji">⚙️</span>
                      <div>
                        <strong>{t("Service Provider")}</strong>
                        <small>{t("I offer services and want to get verified")}</small>
                      </div>
                    </div>
                  </label>
                </div>
              </fieldset>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="first_name">{t("First Name")} *</label>
                  <input
                    id="first_name"
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    placeholder={t("Enter your first name")}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="last_name">{t("Last Name")} *</label>
                  <input
                    id="last_name"
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    placeholder={t("Enter your last name")}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="email">{t("Email Address")} *</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder={t("you@example.com")}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="password">{t("Password")} *</label>
                  <div className="password-input-wrapper">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder={t("Minimum 8 characters")}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? "👁️" : "👁️‍🗨️"}
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="password_confirm">{t("Confirm Password")} *</label>
                  <div className="password-input-wrapper">
                    <input
                      id="password_confirm"
                      type={showConfirmPassword ? "text" : "password"}
                      name="password_confirm"
                      value={formData.password_confirm}
                      onChange={handleChange}
                      placeholder={t("Confirm your password")}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-large"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm"></span>
                    {t("Creating Account...")}
                  </>
                ) : (
                  t("Continue to Profile Details →")
                )}
              </button>

              <p className="auth-link">
                {t("Already have an account?")}{" "}
                <a href="/login" className="link-button">{t("Log in")}</a>
              </p>

              <p className="terms-text">
                {t("By registering, you agree to our Terms of Service and Privacy Policy")}
              </p>
            </form>
          ) : (
            // Step 2: Profile Details & Documents Form
            <form onSubmit={handleStep2Submit} className="register-form">
              {/* Contact Information */}
              <fieldset className="form-section">
                <legend>{t("📞 Contact Information")}</legend>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="phone">{t("Phone Number")} *</label>
                    <input
                      id="phone"
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder={t("e.g., +255 123 456 789")}
                      required
                    />
                    <small className="field-hint">{t("Include country code for international numbers")}</small>
                  </div>
                  <div className="form-group">
                    <label htmlFor="location">{t("Location / City")} *</label>
                    <input
                      id="location"
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      placeholder={t("e.g., Dar es Salaam, Nairobi, Lagos")}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="bio">{t("Bio / About Yourself")} *</label>
                  <textarea
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    rows="4"
                    placeholder={
                      isProvider
                        ? t("Describe your skills, experience, qualifications, and what makes you a trusted professional...")
                        : t("Tell providers what kind of services you're looking for and your preferences...")
                    }
                    required
                  />
                  <small className="field-hint">{t("Minimum 20 characters. This helps others know you better.")}</small>
                </div>
              </fieldset>

              {/* Identity Verification - Common for both roles */}
              <fieldset className="form-section">
                <legend>{t("🪪 Identity Verification")}</legend>
                <p className="section-caption">
                  {t("These details are securely stored and only visible to administrators for verification purposes.")}
                </p>
                
                <div className="form-group">
                  <label htmlFor="national_id_number">{t("National ID Number (NIN)")} *</label>
                  <input
                    id="national_id_number"
                    type="text"
                    name="national_id_number"
                    value={formData.national_id_number}
                    onChange={handleChange}
                    placeholder={t("e.g., 19851234-56789 or 123456789012")}
                    required
                  />
                  <small className="field-hint">{t("Enter your government-issued National Identification Number")}</small>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="profile_image">{t("Profile Picture / Photo")} *</label>
                    <div className="file-input-wrapper">
                      {files.profile_image && (
                        <div className="file-preview">
                          <img
                            src={URL.createObjectURL(files.profile_image)}
                            alt="Profile preview"
                          />
                          <p className="file-name">✓ {fileNames.profile_image}</p>
                        </div>
                      )}
                      <input
                        id="profile_image"
                        type="file"
                        name="profile_image"
                        accept="image/png,image/jpeg,image/jpg"
                        onChange={handleFileChange}
                        required
                      />
                      <small className="file-hint">{t("JPG, PNG only. Max 5MB. Clear, recent photo for identity verification.")}</small>
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="nin_document">{t("NIN Document / ID Scan")} *</label>
                    <div className="file-input-wrapper">
                      {files.nin_document && (
                        <p className="file-name success">✓ {fileNames.nin_document}</p>
                      )}
                      <input
                        id="nin_document"
                        type="file"
                        name="nin_document"
                        accept="application/pdf,image/png,image/jpeg,image/jpg"
                        onChange={handleFileChange}
                        required
                      />
                      <small className="file-hint">{t("Upload a scanned copy or photo of your National ID card. PDF or image accepted.")}</small>
                    </div>
                  </div>
                </div>
              </fieldset>

              {/* Provider-Specific Fields */}
              {isProvider && (
                <>
                  <fieldset className="form-section">
                    <legend>{t("🔧 Professional Information")}</legend>
                    <p className="section-caption">
                      {t("Tell customers about the services you offer and your professional background.")}
                    </p>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="service_name">{t("Service / Profession Name")} *</label>
                        <input
                          id="service_name"
                          type="text"
                          name="service_name"
                          value={formData.service_name}
                          onChange={handleChange}
                          placeholder={t("e.g., Professional Plumbing, Web Development, Electrical Installation")}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="service_category">{t("Service Category")} *</label>
                        <select
                          id="service_category"
                          name="service_category"
                          value={formData.service_category}
                          onChange={handleChange}
                          required
                        >
                          <option value="">{t("-- Select a category --")}</option>
                          <option value="plumbing">{t("🚰 Plumbing & Water Systems")}</option>
                          <option value="electrical">{t("⚡ Electrical & Wiring")}</option>
                          <option value="cleaning">{t("🧹 Cleaning & Janitorial")}</option>
                          <option value="construction">{t("🏗️ Construction & Renovation")}</option>
                          <option value="IT">{t("💻 IT & Tech Support")}</option>
                          <option value="tutoring">{t("📚 Tutoring & Education")}</option>
                          <option value="design">{t("🎨 Design & Multimedia")}</option>
                          <option value="other">{t("📦 Other Services")}</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="years_of_experience">{t("Years of Professional Experience")} *</label>
                      <input
                        id="years_of_experience"
                        type="number"
                        min="0"
                        max="50"
                        name="years_of_experience"
                        value={formData.years_of_experience}
                        onChange={handleChange}
                        placeholder={t("e.g., 5")}
                        required
                      />
                      <small className="field-hint">{t("Number of years you've been providing this service professionally")}</small>
                    </div>
                  </fieldset>

                  <fieldset className="form-section">
                    <legend>{t("📄 Professional Documents (For Admin Verification Only)")}</legend>
                    <p className="section-caption">
                      {t("These documents are required for provider verification. They are only visible to administrators.")}
                    </p>
                    
                    <div className="form-group">
                      <label htmlFor="service_certificate">{t("Professional Certificate / Trade License")} *</label>
                      <div className="file-input-wrapper">
                        {files.service_certificate && (
                          <p className="file-name success">✓ {fileNames.service_certificate}</p>
                        )}
                        <input
                          id="service_certificate"
                          type="file"
                          name="service_certificate"
                          accept="application/pdf,image/png,image/jpeg,image/jpg"
                          onChange={handleFileChange}
                          required
                        />
                        <small className="file-hint">{t("PDF or image of your professional certification, trade license, or diploma")}</small>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="birth_certificate">{t("Birth Certificate")} *</label>
                        <div className="file-input-wrapper">
                          {files.birth_certificate && (
                            <p className="file-name success">✓ {fileNames.birth_certificate}</p>
                          )}
                          <input
                            id="birth_certificate"
                            type="file"
                            name="birth_certificate"
                            accept="application/pdf,image/png,image/jpeg,image/jpg"
                            onChange={handleFileChange}
                            required
                          />
                          <small className="file-hint">{t("Scanned copy or photo of your official birth certificate")}</small>
                        </div>
                      </div>
                      <div className="form-group">
                        <label htmlFor="cv_document">{t("CV / Professional Resume (PDF)")} *</label>
                        <div className="file-input-wrapper">
                          {files.cv_document && (
                            <p className="file-name success">✓ {fileNames.cv_document}</p>
                          )}
                          <input
                            id="cv_document"
                            type="file"
                            name="cv_document"
                            accept="application/pdf"
                            onChange={handleFileChange}
                            required
                          />
                          <small className="file-hint">{t("Upload your CV/Resume in PDF format. Include your work history and qualifications.")}</small>
                        </div>
                      </div>
                    </div>
                  </fieldset>
                </>
              )}

              {/* Preview Section */}
              <div className="preview-toggle-section">
                <button
                  type="button"
                  className="preview-toggle-btn"
                  onClick={() => setPreviewMode(!previewMode)}
                >
                  <span className="material-symbols-outlined">
                    {previewMode ? "visibility_off" : "visibility"}
                  </span>
                  {previewMode ? t("Hide Profile Preview") : t("Preview Profile Visibility")}
                </button>
                
                {previewMode && (
                  <div className="profile-preview-grid">
                    <div className="preview-card admin-card">
                      <div className="preview-card-header">
                        <span className="material-symbols-outlined">admin_panel_settings</span>
                        <h3>{t("Administrator View")}</h3>
                      </div>
                      <div className="preview-card-body">
                        <p className="preview-badge">{t("Full verification access")}</p>
                        <ul className="preview-list">
                          <li>✓ {t("Profile image & contact information")}</li>
                          <li>✓ {t("Full name, phone, email, location")}</li>
                          <li>✓ {t("NIN number & scanned document")}</li>
                          {isProvider && (
                            <>
                              <li>✓ {t("Service professional certificate")}</li>
                              <li>✓ {t("Birth certificate document")}</li>
                              <li>✓ {t("CV / Resume file")}</li>
                              <li>✓ {t("Years of experience & service category")}</li>
                            </>
                          )}
                        </ul>
                      </div>
                    </div>
                    
                    <div className="preview-card public-card">
                      <div className="preview-card-header">
                        <span className="material-symbols-outlined">public</span>
                        <h3>{t("Public User View")}</h3>
                      </div>
                      <div className="preview-card-body">
                        <p className="preview-badge">{t("What other users see")}</p>
                        <ul className="preview-list">
                          <li>✓ {t("Profile image")}</li>
                          <li>✓ {t("Full name")}</li>
                          <li>✓ {t("Phone number (for booking)")}</li>
                          <li>✓ {t("Location & bio")}</li>
                          {isProvider && (
                            <>
                              <li>✓ {t("Service name & category")}</li>
                              <li>✓ {t("Years of experience")}</li>
                            </>
                          )}
                        </ul>
                        <div className="preview-hidden-notice">
                          🔒 {t("NIN, certificates, birth certificate, and CV are NOT visible to other users")}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="form-buttons">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn btn-secondary"
                >
                  ← {t("Back")}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm"></span>
                      {t("Uploading Documents...")}
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">check_circle</span>
                      {t("Complete Registration")}
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Side Info Panel */}
        <div className="register-info">
          <h2>{t("Why Choose ServiGo?")}</h2>
          <ul className="info-list">
            <li>
              <span className="info-icon">✓</span>
              <div>
                <strong>{t("Verified Professionals")}</strong>
                <p>{t("All providers are thoroughly vetted and verified")}</p>
              </div>
            </li>
            <li>
              <span className="info-icon">✓</span>
              <div>
                <strong>{t("Secure Payments")}</strong>
                <p>{t("Your money is protected until work is complete")}</p>
              </div>
            </li>
            <li>
              <span className="info-icon">✓</span>
              <div>
                <strong>{t("Document Privacy")}</strong>
                <p>{t("Sensitive documents only visible to administrators")}</p>
              </div>
            </li>
            <li>
              <span className="info-icon">✓</span>
              <div>
                <strong>{t("Trust & Safety")}</strong>
                <p>{t("Ratings, reviews, and verified credentials build trust")}</p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}