import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import loginHero from "../../assets/login-hero.jpg";
import "./AdminLogin.css";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [adminUser, setAdminUser] = useState(null);

  useEffect(() => {
    checkAdminSession();
  }, []);

  const checkAdminSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: admin, error: adminError } = await supabase
          .from("admins")
          .select("*")
          .eq("id", session.user.id)
          .eq("role", "admin")
          .eq("is_active", true)
          .single();

        if (admin && !adminError) {
          setAdminUser(admin);
        } else {
          await supabase.auth.signOut();
        }
      }
    } catch (err) {
      console.error("Session check error:", err);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);

    try {
      // 1. Sign in with Supabase Auth
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        throw new Error(authError.message || "Invalid login credentials.");
      }

      if (!data?.user) {
        throw new Error("User data not returned upon login.");
      }

      // 2. Query admins table to check role and active status
      const { data: admin, error: adminError } = await supabase
        .from("admins")
        .select("*")
        .eq("id", data.user.id)
        .eq("role", "admin")
        .eq("is_active", true)
        .single();

      if (adminError || !admin) {
        // Sign out unauthorized user session
        await supabase.auth.signOut();
        throw new Error("Unauthorized access. Active admin privileges required.");
      }

      // Admin account verified successfully
      setAdminUser(admin);
      setSuccess(`Welcome back, ${admin.name || admin.email}! Redirecting...`);
      setTimeout(() => {
        navigate("/admin/dashboard");
      }, 900);
    } catch (err) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setAdminUser(null);
    setSuccess(null);
    setError(null);
    setEmail("");
    setPassword("");
    setLoading(false);
  };

  return (
    <div className="login-split-page">
      {/* ── Left Side: Wedding Hero Visual ── */}
      <div className="login-hero-side">
        <img
          src={loginHero}
          alt="Royal Celebration"
          className="login-hero-img"
        />
        <div className="login-hero-overlay" />

        {/* Top Tag */}


        {/* Bottom Content Banner */}
        <div className="login-hero-bottom-content">
          <div className="hero-accent-line" />
          <h2 className="hero-quote-heading">
            The beginning of something beautiful.
          </h2>

        </div>
      </div>

      {/* ── Right Side: Admin Login Portal ── */}
      <div className="login-form-side">
        <div className="login-form-wrapper">
          {/* Top Shield Icon Badge */}
          <div className="login-shield-badge">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shield-icon"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </div>

          <div className="login-header-group">
            <span className="login-portal-label">ADMIN ACCESS PORTAL</span>
          </div>

          {error && (
            <div className="login-alert login-alert-error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="login-alert login-alert-success">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{success}</span>
            </div>
          )}

          {adminUser ? (
            <div className="logged-in-container">
              <div className="logged-in-card">
                <div className="logged-in-row">
                  <span className="logged-in-label">Admin Name</span>
                  <span className="logged-in-value">{adminUser.name || "Administrator"}</span>
                </div>
                <div className="logged-in-row">
                  <span className="logged-in-label">Email</span>
                  <span className="logged-in-value">{adminUser.email}</span>
                </div>
                <div className="logged-in-row">
                  <span className="logged-in-label">Status</span>
                  <span className="logged-in-badge-active">Active</span>
                </div>
              </div>

              <button
                type="button"
                className="login-submit-btn"
                onClick={() => navigate("/admin/dashboard")}
              >
                <span>Go to Admin Dashboard</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>

              <button
                type="button"
                className="login-signout-btn"
                onClick={handleLogout}
                disabled={loading}
              >
                {loading ? "Signing out..." : "Sign Out"}
              </button>
            </div>
          ) : (
            <form className="login-form-element" onSubmit={handleLogin}>
              {/* Email Address */}
              <div className="login-field-group">
                <label htmlFor="login-email" className="login-label">
                  Email Address
                </label>
                <div className="login-input-box">
                  <svg
                    className="login-field-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                  <input
                    id="login-email"
                    type="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="login-input"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="login-field-group">
                <label htmlFor="login-password" className="login-label">
                  Password
                </label>
                <div className="login-input-box">
                  <svg
                    className="login-field-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="login-input"
                  />
                  <button
                    type="button"
                    className="login-eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Remember me & Forgot password */}
              <div className="login-row-options">
                <label className="login-checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="login-checkbox"
                  />
                  <span>Remember me</span>
                </label>
                <a
                  href="#forgot-password"
                  onClick={(e) => {
                    e.preventDefault();
                    alert("Please contact the system administrator to reset your login password.");
                  }}
                  className="login-forgot-link"
                >
                  Forgot password?
                </a>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="login-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="login-spinner" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In as Admin</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>

              {/* Administrator Access Note */}
              <div className="login-access-note">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>Administrator access only</span>
              </div>

              {/* Divider & Footer Text */}

            </form>
          )}
        </div>
      </div>
    </div>
  );
}
