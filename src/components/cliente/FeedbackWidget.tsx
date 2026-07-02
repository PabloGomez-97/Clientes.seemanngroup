import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import "./FeedbackWidget.css";

const FeedbackWidget: React.FC = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [comment, setComment] = useState("");

  const closeModal = () => {
    setOpen(false);
    window.setTimeout(() => {
      setSubmitted(false);
      setComment("");
    }, 250);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
  };

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="feedback-widget">
      <button
        type="button"
        className="feedback-tab"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="feedback-tab__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </span>
        <span className="feedback-tab__label">{t("feedbackWidget.tab")}</span>
      </button>

      {open &&
        createPortal(
          <div
            className="feedback-overlay"
            role="presentation"
            onClick={closeModal}
          >
            <div
              className="feedback-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="feedback-modal-title"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="feedback-modal__close"
                onClick={closeModal}
                aria-label={t("feedbackWidget.close")}
              >
                ×
              </button>

              {submitted ? (
                <div className="feedback-thanks">
                  <p>{t("feedbackWidget.thanks")}</p>
                  <button
                    type="button"
                    className="feedback-modal__submit"
                    onClick={closeModal}
                  >
                    {t("feedbackWidget.close")}
                  </button>
                </div>
              ) : (
                <>
                  <header className="feedback-modal__header">
                    <h2 id="feedback-modal-title">{t("feedbackWidget.title")}</h2>
                    <p>{t("feedbackWidget.description")}</p>
                  </header>

                  <form className="feedback-form" onSubmit={handleSubmit}>
                    <label htmlFor="feedback-comment" className="visually-hidden">
                      {t("feedbackWidget.placeholder")}
                    </label>
                    <textarea
                      id="feedback-comment"
                      className="feedback-form__textarea"
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                      placeholder={t("feedbackWidget.placeholder")}
                      rows={6}
                    />
                    <button type="submit" className="feedback-modal__submit">
                      {t("feedbackWidget.submit")}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default FeedbackWidget;
