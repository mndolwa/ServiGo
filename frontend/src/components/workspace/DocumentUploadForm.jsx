import React, { useState } from "react";

export default function DocumentUploadForm({ user, t, onSuccess }) {
  const [uploadingField, setUploadingField] = useState(null);
  const [documents, setDocuments] = useState({
    profileImage: null,
    nationalId: null,
    ninDocument: null,
    serviceCertificate: null,
    birthCertificate: null,
    cv: null,
  });
  const [uploadStatus, setUploadStatus] = useState("");

  const handleFileSelect = (e, fieldName) => {
    const file = e.target.files[0];
    if (file) {
      setDocuments((prev) => ({
        ...prev,
        [fieldName]: file,
      }));
    }
  };

  const uploadDocument = async (fieldName, file, fieldKey) => {
    if (!file) return;

    setUploadingField(fieldName);
    const formData = new FormData();
    formData.append(fieldKey, file);

    try {
      const response = await fetch("/api/accounts/profile-upload/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: formData,
      });

      if (response.ok) {
        setUploadStatus(`${fieldName} uploaded successfully!`);
        if (onSuccess) onSuccess();
      } else {
        setUploadStatus(`Failed to upload ${fieldName}`);
      }
    } catch (error) {
      setUploadStatus(`Error uploading ${fieldName}: ${error.message}`);
    } finally {
      setUploadingField(null);
    }
  };

  const documentFields = [
    {
      name: "profileImage",
      label: t("Profile Image"),
      accept: "image/*",
      key: "profile_image",
      show: true,
    },
    {
      name: "nationalId",
      label: t("National ID Number"),
      accept: "text/*",
      key: "national_id_number",
      show: true,
    },
    {
      name: "ninDocument",
      label: t("NIN Document"),
      accept: ".pdf,.jpg,.jpeg,.png",
      key: "nin_document",
      show: true,
    },
  ];

  const providerFields = [
    {
      name: "serviceCertificate",
      label: t("Service Certificate"),
      accept: ".pdf",
      key: "service_certificate",
      show: user.role === "provider",
    },
    {
      name: "birthCertificate",
      label: t("Birth Certificate"),
      accept: ".pdf",
      key: "birth_certificate",
      show: user.role === "provider",
    },
    {
      name: "cv",
      label: t("Curriculum Vitae (CV)"),
      accept: ".pdf",
      key: "cv_document",
      show: user.role === "provider",
    },
  ];

  const allFields = [...documentFields, ...providerFields].filter((f) => f.show);

  return (
    <div className="document-upload-panel">
      <div style={{ marginBottom: 14 }}>
        <h4>{t("Upload Documents & Profile")}</h4>
        <p style={{ color: "var(--muted)", margin: 0 }}>
          {user.role === "provider"
            ? t("Upload your profile image, NIN, and professional documents for admin verification.")
            : t("Upload your profile image and national ID for platform verification.")}
        </p>
      </div>

      <div className="document-grid">
        {allFields.map((field) => (
          <div key={field.name} className="document-field">
            <label>{field.label}</label>
            <input
              type={field.name === "nationalId" ? "text" : "file"}
              accept={field.accept}
              onChange={(e) => handleFileSelect(e, field.name)}
              disabled={uploadingField === field.name}
              placeholder={field.name === "nationalId" ? t("Enter your national ID number") : ""}
            />
            {documents[field.name] && (
              <button
                onClick={() => uploadDocument(field.label, documents[field.name], field.key)}
                disabled={uploadingField === field.name}
                className="btn btn-success"
                style={{ marginTop: 8 }}
              >
                {uploadingField === field.name ? t("Uploading...") : t("Upload")}
              </button>
            )}
          </div>
        ))}
      </div>

      {uploadStatus && (
        <div style={{ marginTop: 12, padding: 10, background: "var(--soft-bg)", borderRadius: 8 }}>
          <p style={{ margin: 0, color: uploadStatus.includes("successfully") ? "#1f7a53" : "#a23838" }}>
            {uploadStatus}
          </p>
        </div>
      )}
    </div>
  );
}
