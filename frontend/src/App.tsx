import React from "react";
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LanguageToggle } from "./components/LanguageToggle";
import { I18nextProvider, useTranslation } from "react-i18next";
import i18n from "./i18n/i18n";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { CreateEvent } from "./pages/CreateEvent";
import { EventDetail } from "./pages/EventDetail";
import MyPlaces from "./pages/MyPlaces";

function TopBar() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="row" style={{ gap: 20 }}>
          <Link to="/" className="navbar-brand">
            Kizuna
          </Link>
          {user && (
            <>
              <Link
                to="/create"
                className="btn btn-primary hide-mobile"
                style={{ padding: "6px 14px", fontSize: 13 }}
              >
                + {t("app.createEvent")}
              </Link>
              <Link
                to="/my-places"
                className="btn btn-ghost hide-mobile"
                style={{ padding: "6px 14px", fontSize: 13 }}
              >
                {t("app.myPlaces")}
              </Link>
            </>
          )}
        </div>

        <div className="navbar-links">
          <LanguageToggle />
          {user ? (
            <div className="row" style={{ gap: 8 }}>
              <span
                className="hide-mobile"
                style={{ fontSize: 13, color: "var(--text-secondary)" }}
              >
                {user.displayName}
              </span>
              <button className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: 13 }} onClick={logout}>
                {t("auth.logout")}
              </button>
            </div>
          ) : (
            <div className="row" style={{ gap: 6 }}>
              <Link to="/login" className="btn btn-ghost" style={{ fontSize: 13 }}>
                {t("auth.login")}
              </Link>
              <Link to="/register" className="btn btn-primary" style={{ padding: "6px 14px", fontSize: 13 }}>
                {t("auth.register")}
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div style={{ paddingTop: 60, textAlign: "center", color: "var(--text-secondary)" }}>Loading…</div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <AuthProvider>
      <I18nextProvider i18n={i18n}>
        <BrowserRouter>
          <TopBar />
          <div className="container">
            <Routes>
              {/* Public: auth pages only */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Everything else requires login */}
              <Route
                path="/"
                element={
                  <RequireAuth>
                    <Home />
                  </RequireAuth>
                }
              />
              <Route
                path="/create"
                element={
                  <RequireAuth>
                    <CreateEvent />
                  </RequireAuth>
                }
              />
              <Route
                path="/events/:id"
                element={
                  <RequireAuth>
                    <EventDetail />
                  </RequireAuth>
                }
              />
              <Route
                path="/my-places"
                element={
                  <RequireAuth>
                    <MyPlaces />
                  </RequireAuth>
                }
              />
            </Routes>
          </div>
        </BrowserRouter>
      </I18nextProvider>
    </AuthProvider>
  );
}
