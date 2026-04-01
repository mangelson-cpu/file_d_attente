import React, { useState, useEffect } from "react";
import { useTheme } from "../../shared/context/ThemeContext";
import {
  FiDroplet,
  FiSave,
  FiRotateCcw,
  FiCheck,
  FiAlertCircle,
} from "react-icons/fi";
import "./SettingsPage.css";

const DEFAULT_PRIMARY = "#8b5cf6";
const DEFAULT_SECONDARY = "#d4145a";

export const SettingsPage: React.FC = () => {
  const { colors, updateColors, applyColorsLocally } = useTheme();
  const [primaryColor, setPrimaryColor] = useState(colors.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(colors.secondaryColor);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    setPrimaryColor(colors.primaryColor);
    setSecondaryColor(colors.secondaryColor);
  }, [colors]);

  const handlePrimaryChange = (value: string) => {
    setPrimaryColor(value);
    applyColorsLocally({ primaryColor: value, secondaryColor });
  };

  const handleSecondaryChange = (value: string) => {
    setSecondaryColor(value);
    applyColorsLocally({ primaryColor, secondaryColor: value });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    const result = await updateColors({ primaryColor, secondaryColor });
    if (result.success) {
      setMessage("Couleurs mises à jour avec succès !");
      setIsSuccess(true);
    } else {
      setMessage(result.error || "Erreur lors de la sauvegarde");
      setIsSuccess(false);
    }
    setSaving(false);
    setTimeout(() => setMessage(""), 4000);
  };

  const handleReset = () => {
    setPrimaryColor(DEFAULT_PRIMARY);
    setSecondaryColor(DEFAULT_SECONDARY);
    applyColorsLocally({
      primaryColor: DEFAULT_PRIMARY,
      secondaryColor: DEFAULT_SECONDARY,
    });
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <div className="header-text">
          <h1>
            <FiDroplet size={28} style={{ verticalAlign: "middle", marginRight: "0.5rem" }} />
            Thème & Couleurs
          </h1>
          <p>Choisissez les couleurs principales de votre application</p>
        </div>
      </div>

      <div className="content-card settings-card">
        <div className="settings-section-panel">
          <div className="settings-colors-grid">
            <div className="color-picker-card">
              <label className="color-picker-label">Couleur primaire</label>
              <p className="color-picker-description">
                Boutons, sidebar active, icônes et accents principaux
              </p>
              <div className="color-picker-row">
                <div className="color-swatch-wrapper">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => handlePrimaryChange(e.target.value)}
                    className="color-input-native"
                    id="primary-color-picker"
                  />
                  <div
                    className="color-swatch"
                    style={{ backgroundColor: primaryColor }}
                    onClick={() => document.getElementById("primary-color-picker")?.click()}
                  />
                </div>
                <input
                  type="text"
                  className="auth-input color-hex-input"
                  value={primaryColor}
                  onChange={(e) => handlePrimaryChange(e.target.value)}
                  maxLength={7}
                  placeholder="#8b5cf6"
                />
              </div>
            </div>

            <div className="color-picker-card">
              <label className="color-picker-label">Couleur secondaire</label>
              <p className="color-picker-description">
                Dégradés, accents secondaires et détails
              </p>
              <div className="color-picker-row">
                <div className="color-swatch-wrapper">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => handleSecondaryChange(e.target.value)}
                    className="color-input-native"
                    id="secondary-color-picker"
                  />
                  <div
                    className="color-swatch"
                    style={{ backgroundColor: secondaryColor }}
                    onClick={() => document.getElementById("secondary-color-picker")?.click()}
                  />
                </div>
                <input
                  type="text"
                  className="auth-input color-hex-input"
                  value={secondaryColor}
                  onChange={(e) => handleSecondaryChange(e.target.value)}
                  maxLength={7}
                  placeholder="#d4145a"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="settings-preview">
            <h3 className="settings-preview-title">Aperçu</h3>
            <div className="settings-preview-items">
              <div
                className="preview-gradient-bar"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                }}
              />
              <div className="preview-elements">
                <button
                  className="preview-btn"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                  }}
                >
                  Bouton exemple
                </button>
                <div
                  className="preview-badge"
                  style={{ backgroundColor: primaryColor }}
                >
                  Badge
                </div>
                <div
                  className="preview-sidebar-item"
                  style={{
                    background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`,
                  }}
                >
                  <FiCheck size={16} /> Menu actif
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="settings-actions">
            <button
              className="primary-gradient-btn settings-save-btn"
              onClick={handleSave}
              disabled={saving}
              style={{
                background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
              }}
            >
              <FiSave size={18} />
              {saving ? "Enregistrement..." : "Appliquer les couleurs"}
            </button>
            <button
              className="settings-reset-btn"
              onClick={handleReset}
              type="button"
            >
              <FiRotateCcw size={16} />
              Réinitialiser par défaut
            </button>
          </div>

          {message && (
            <div
              className={`auth-message ${isSuccess ? "auth-message--success" : "auth-message--error"}`}
              style={{ marginTop: "1rem", display: "flex", alignItems: "center", gap: "0.5rem", justifyContent: "center" }}
            >
              {isSuccess ? <FiCheck size={16} /> : <FiAlertCircle size={16} />}
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
