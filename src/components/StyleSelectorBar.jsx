import React from "react";
import "./StyleSelectorBar.css";

export default function StyleSelectorBar({ currentStyle, onSelectStyle }) {
  const styles = [
    { id: "first", name: "First", tag: "Royal Crimson" },
    { id: "second", name: "Second", tag: "Midnight Garden" },
    { id: "thered", name: "Thered", tag: "Pure Ivory" },
  ];

  return (
    <div className="style-selector-container">
      <div className="style-selector-bar">
        <span className="style-selector-title">Styles:</span>
        <div className="style-buttons-group">
          {styles.map((s) => {
            const active = currentStyle === s.id;
            return (
              <button
                key={s.id}
                className={`style-btn ${active ? "active" : ""}`}
                onClick={() => onSelectStyle(s.id)}
              >
                <span className="style-btn-name">{s.name}</span>
                <span className="style-btn-tag">{s.tag}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
