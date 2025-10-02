import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

/**
 * ExelAuthUniqueV2 (Integrated)
 * - Calls backend auth endpoints
 * - Stores returned token in localStorage
 * - Redirects user to /user and admin to /admin
 *
 * Requirements:
 * - Tailwind CSS
 * - framer-motion
 * - react-router-dom (for useNavigate)
 *
 * Notes:
 * - Admin Code required client-side to be "69" (default)
 * - Adjust API base paths if needed (currently uses relative /api/*)
 */

export default function ExelAuthUniqueV2() {
  const [mode, setMode] = useState("user"); // 'user' | 'admin'
  const [view, setView] = useState("login"); // 'login' | 'signup'
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", adminCode: "69" }); // adminCode prefilled to 69
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [focused, setFocused] = useState("");

  const adminCodeRef = useRef(null);
  const navigate = useNavigate();

  function resetMessages() {
    setError("");
    setSuccess("");
  }
  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  // Enforce admin-only login flow
  function switchToAdmin() {
    resetMessages();
    setMode("admin");
    setView("login");
    setForm((f) => ({ ...f, name: "", password: "", adminCode: "69" })); // default admin code 69
  }
  function switchToUser() {
    resetMessages();
    setMode("user");
    setForm((f) => ({ ...f, adminCode: "" }));
  }

  // autofocus admin input when switched
  useEffect(() => {
    if (mode === "admin" && adminCodeRef.current) {
      setTimeout(() => adminCodeRef.current.focus(), 180);
    }
  }, [mode]);

  async function handleSubmit(e) {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      // Basic client-side validation
      if (view === "signup") {
        if (!form.name || !form.email || form.password.length < 6) {
          setError("Please provide name, valid email and a 6+ char password.");
          setLoading(false);
          return;
        }

        // Call user signup API
        const res = await fetch("/api/auth/user/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: form.name, email: form.email, password: form.password }),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Signup failed");
          setLoading(false);
          return;
        }

        // store token and navigate to /user (you may want them to login first; here we store token immediately)
        if (data.token) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("userEmail", form.email);
          localStorage.setItem("role", "user");
        }

        setSuccess("Sign-up successful — redirecting to user area...");
        setLoading(false);
        // redirect immediately to /user
        navigate("/userdashboard", { replace: true });
        return;
      }

      // LOGIN flow
      if (!form.email || !form.password) {
        setError("Enter email and password.");
        setLoading(false);
        return;
      }

      if (mode === "admin") {
        // client-side admin code gate (as requested): must be "69"
        if (String(form.adminCode).trim() !== "69") {
          setError("Invalid admin code.");
          setLoading(false);
          return;
        }

        // Call admin login endpoint
        const res = await fetch("/api/auth/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: form.email, password: form.password }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Admin login failed");
          setLoading(false);
          return;
        }

        if (data.token) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("userEmail", form.email);
          localStorage.setItem("role", "admin");
        }

        setSuccess("Welcome, Admin — redirecting...");
        setLoading(false);
        navigate("/admin", { replace: true });
        return;
      }

      // normal user login
      const res = await fetch("/api/auth/user/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }

      if (data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("userEmail", form.email);
        localStorage.setItem("role", "user");
      }

      setSuccess(`Welcome back — ${form.email}`);
      setLoading(false);
      navigate("/user", { replace: true });
    } catch (err) {
      console.error("Auth error:", err);
      setError("Server error — please try again later.");
      setLoading(false);
    }
  }

  // Animations / variants
  const cardAnim = {
    initial: { opacity: 0, y: 18, scale: 0.995 },
    enter: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45 } },
  };
  const tiltHover = { whileHover: { rotateX: -4.5, rotateY: 5.5, scale: 1.01 }, whileTap: { scale: 0.99 } };

  const fieldsContainer = { hidden: {}, visible: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } } };
  const field = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.34 } } };

  // Confetti mini-burst
  function Confetti({ show }) {
    if (!show) return null;
    const dots = new Array(14).fill(0);
    return (
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        {dots.map((_, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 1, scale: 1, y: 0 }}
            animate={{ y: [-8, -120 + Math.random() * 60], x: (i - 7) * 8, rotate: Math.random() * 360, opacity: 0 }}
            transition={{ duration: 1, delay: i * 0.02, ease: "easeOut" }}
            className="block w-2 h-2 rounded-full"
            style={{ background: i % 3 === 0 ? "#ffd86b" : i % 3 === 1 ? "#6ee7b7" : "#7c3aed" }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-gradient-to-b from-[#030317] via-[#0c0940] to-[#12032a] flex items-center justify-center p-6 overflow-hidden text-white">
      {/* subtle nebula */}
      <motion.div
        className="absolute -left-48 top-16 w-[36rem] h-[28rem] rounded-full mix-blend-screen opacity-16 blur-3xl"
        animate={{ x: [0, -40, 0], y: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 28, ease: "easeInOut" }}
        style={{ background: "linear-gradient(120deg,#1f1145 0%, #4f2d7f 40%, #1a2c4c 100%)" }}
      />

      {/* slow star overlay */}
      <svg className="absolute inset-0 -z-10 opacity-6" preserveAspectRatio="none">
        <rect width="100%" height="100%" fill="transparent" />
      </svg>

      <main className="relative w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center z-10">
        {/* Left Hero */}
        <section className="px-6 md:px-12 order-2 md:order-1">
          <motion.h1 initial={{ x: -18, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.45 }} className="text-4xl md:text-5xl font-extrabold leading-tight">
            Exel Analysis Platform
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }} className="mt-4 text-slate-300 text-lg max-w-lg">
            Turn spreadsheets into insights — upload, preview and extract insights faster. Built for analysts who need speed and clarity.
          </motion.p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.18 }} className="rounded-xl p-4 bg-white/4 border border-white/6">
              <div className="text-sm font-semibold">Smart Parsing</div>
              <div className="text-xs text-slate-300 mt-1">Auto-detect columns & types</div>
            </motion.div>
            <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.24 }} className="rounded-xl p-4 bg-white/4 border border-white/6">
              <div className="text-sm font-semibold">Visual Reports</div>
              <div className="text-xs text-slate-300 mt-1">Exportable charts</div>
            </motion.div>
          </div>
        </section>

        {/* Right Auth card */}
        <aside className="order-1 md:order-2 flex items-center justify-center">
          <motion.div layout initial="initial" animate="enter" variants={cardAnim} className="w-full max-w-md relative">
            {/* rotating accent ring behind card */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 44, ease: "linear" }}
              className="pointer-events-none absolute -inset-6 rounded-2xl opacity-8 blur-2xl mix-blend-screen"
              style={{ background: "linear-gradient(90deg,#0ea5a4, transparent 30%, #ffd86b 70%)" }}
            />

            <motion.div
              {...tiltHover}
              className="relative rounded-2xl p-8 bg-gradient-to-b from-[#07102a]/70 to-[#0b0920]/60 border border-white/8 backdrop-blur shadow-2xl overflow-hidden"
            >
              {/* subtle neon rim pulse */}
              <motion.div
                initial={{ opacity: 0.18 }}
                animate={{ opacity: [0.18, 0.55, 0.18] }}
                transition={{ repeat: Infinity, duration: 3.5 }}
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{ boxShadow: "0 0 32px rgba(14,165,164,0.08)" }}
              />

              <div className="relative z-10 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-semibold">{mode === "admin" ? "Admin Sign in" : view === "login" ? "Welcome back" : "Create account"}</div>
                    <div className="text-xs text-slate-300">Secure access to Exel Analysis Platform</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={switchToUser}
                      className={`px-3 py-1 rounded-md text-sm ${mode === "user" ? "bg-white/12" : "bg-transparent hover:bg-white/6"}`}
                    >
                      User
                    </button>

                    <button
                      type="button"
                      onClick={switchToAdmin}
                      className={`px-3 py-1 rounded-md text-sm font-semibold ${mode === "admin" ? "bg-gradient-to-r from-[#0ea5a4] to-[#ffd86b] text-black" : "bg-transparent hover:bg-white/6 text-slate-200"}`}
                    >
                      Admin
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {mode === "admin" && (
                    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="mb-2 p-2 rounded-md bg-[#fffbe8] text-[#463500] text-sm font-medium border border-[#f5e6bf]">
                      Admin-only login — provide Admin Code (default <strong>69</strong>).
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Login / Signup control */}
                <div className="w-full">
                  <div className="relative rounded-md p-1">
                    <div className="relative flex items-center rounded-md bg-white/3 p-1">
                      <motion.div
                        layout
                        transition={{ type: "spring", stiffness: 520, damping: 42 }}
                        className={`absolute inset-y-1 ${view === "login" ? "left-1 w-1/2" : "right-1 w-1/2"} bg-gradient-to-r from-[#0ea5a4]/25 to-[#ffd86b]/25 rounded-md`}
                      />
                      <div className="relative z-10 flex w-full justify-center gap-4">
                        <button
                          type="button"
                          onClick={() => {
                            setView("login");
                            resetMessages();
                          }}
                          className={`px-4 py-2 rounded-md text-sm ${view === "login" ? "text-white" : "text-slate-300"}`}
                        >
                          Login
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (mode !== "admin") {
                              setView("signup");
                              resetMessages();
                            }
                          }}
                          className={`px-4 py-2 rounded-md text-sm ${view === "signup" ? "text-white" : "text-slate-300"} ${mode === "admin" ? "opacity-50 pointer-events-none" : ""}`}
                        >
                          Sign up
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* form */}
                <AnimatePresence mode="wait">
                  <motion.form
                    key={view + mode}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.36 }}
                    onSubmit={handleSubmit}
                    className="space-y-4"
                  >
                    <motion.div variants={fieldsContainer} initial="hidden" animate="visible">
                      {/* full name on signup */}
                      {view === "signup" && (
                        <motion.div variants={field} className="relative">
                          <label className={`block text-sm text-slate-300 transition-all ${form.name || focused === "name" ? "text-xs -translate-y-3 text-teal-200" : ""}`}>
                            Full name
                          </label>
                          <input
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            onFocus={() => setFocused("name")}
                            onBlur={() => setFocused("")}
                            placeholder="Jane Doe"
                            className="w-full rounded-md bg-transparent px-3 py-3 border border-white/6 focus:outline-none"
                          />
                        </motion.div>
                      )}

                      {/* email */}
                      <motion.div variants={field} className="relative">
                        <label className={`block text-sm text-slate-300 transition-all ${form.email || focused === "email" ? "text-xs -translate-y-3 text-teal-200" : ""}`}>
                          Email
                        </label>
                        <input
                          name="email"
                          value={form.email}
                          onChange={handleChange}
                          onFocus={() => setFocused("email")}
                          onBlur={() => setFocused("")}
                          placeholder="you@company.com"
                          className="w-full rounded-md bg-transparent px-3 py-3 border border-white/6 focus:outline-none"
                        />
                      </motion.div>

                      {/* password */}
                      <motion.div variants={field} className="relative">
                        <label className={`block text-sm text-slate-300 transition-all ${form.password || focused === "password" ? "text-xs -translate-y-3 text-amber-200" : ""}`}>
                          Password
                        </label>
                        <input
                          name="password"
                          value={form.password}
                          onChange={handleChange}
                          onFocus={() => setFocused("password")}
                          onBlur={() => setFocused("")}
                          type="password"
                          placeholder="At least 6 characters"
                          className="w-full rounded-md bg-transparent px-3 py-3 border border-white/6 focus:outline-none"
                        />
                      </motion.div>

                      {/* adminCode */}
                      {mode === "admin" && (
                        <motion.div variants={field} className="relative">
                          <label className={`block text-sm text-slate-300 transition-all ${form.adminCode || focused === "adminCode" ? "text-xs -translate-y-3 text-teal-200" : ""}`}>
                            Admin Code
                          </label>
                          <input
                            ref={adminCodeRef}
                            name="adminCode"
                            value={form.adminCode}
                            onChange={handleChange}
                            onFocus={() => setFocused("adminCode")}
                            onBlur={() => setFocused("")}
                            placeholder="Enter Admin Code (default 69)"
                            autoComplete="one-time-code"
                            className="w-full rounded-md bg-transparent px-3 py-3 border border-white/6 focus:outline-none"
                          />
                        </motion.div>
                      )}
                    </motion.div>

                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-sm text-slate-300">
                        <input type="checkbox" className="accent-[#0ea5a4]" /> Remember me
                      </label>

                      <button
                        type="button"
                        onClick={() => {
                          if (mode !== "admin") {
                            setView(view === "login" ? "signup" : "login");
                            resetMessages();
                          }
                        }}
                        className={`text-sm ${mode === "admin" ? "text-slate-400 opacity-60 cursor-not-allowed" : "text-teal-200 hover:underline"}`}
                        disabled={mode === "admin"}
                      >
                        {view === "login" ? "Create account" : "Back to login"}
                      </button>
                    </div>

                    {error && <div className="text-sm text-rose-300 bg-rose-900/20 p-2 rounded">{error}</div>}
                    {success && <div className="text-sm text-emerald-200 bg-emerald-900/20 p-2 rounded">{success}</div>}

                    <div className="pt-2 relative">
                      <motion.button
                        whileHover={{ y: -3 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={loading}
                        className="relative overflow-hidden w-full py-3 rounded-md bg-gradient-to-r from-[#065f46] to-[#ffd86b] text-black font-semibold shadow-lg"
                      >
                        {/* shimmer bar */}
                        <motion.span
                          initial={{ left: "-40%" }}
                          animate={{ left: loading ? "50%" : ["-40%", "120%"] }}
                          transition={{ repeat: loading ? Infinity : 0, duration: 1.1, ease: "linear" }}
                          className="absolute top-0 left-[-40%] h-full w-2 bg-white/20 blur-sm"
                          style={{ mixBlendMode: "overlay" }}
                        />
                        {loading ? "Processing..." : view === "login" ? (mode === "admin" ? "Enter Admin Console" : "Sign in") : "Create account"}
                      </motion.button>

                      {/* confetti on success */}
                      <Confetti show={!!success} />
                    </div>
                  </motion.form>
                </AnimatePresence>

                <div className="mt-6 text-center text-xs text-slate-400">© {new Date().getFullYear()} Exel Analysis Platform</div>
              </div>
            </motion.div>
          </motion.div>
        </aside>
      </main>
    </div>
  );
}
