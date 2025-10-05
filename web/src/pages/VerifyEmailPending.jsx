// web/src/pages/VerifyEmailPending.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Axios from "axios";

const COOLDOWN = 60;

const CSS = `
:root { --indigo:#6366f1; --violet:#7c3aed; --pink:#ec4899; }
*{box-sizing:border-box}
.page{min-height:100vh;display:flex;align-items:center;justify-content:center;
  background:linear-gradient(135deg,rgba(99,102,241,.12),rgba(124,58,237,.12));padding:24px}
.shell{max-width:1100px;width:100%;display:grid;gap:32px;grid-template-columns:1fr;align-items:center}
@media (min-width:960px){ .shell{grid-template-columns:1fr 1fr} }
.brand{display:flex;align-items:center;gap:8px;margin-bottom:16px}
.brand-badge{height:40px;width:40px;display:grid;place-items:center;border-radius:12px;background:var(--indigo);color:#fff;box-shadow:0 6px 20px rgba(99,102,241,.35)}
.card{background:#ffffffee;backdrop-filter:blur(10px);border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.08);border:1px solid rgba(0,0,0,.06);overflow:hidden}
.card .bar{height:4px;background:linear-gradient(90deg,var(--indigo),#8b5cf6,var(--pink))}
.card-body{padding:24px 28px}
.h1{margin:0;font-size:28px;line-height:1.2;font-weight:800;color:#111827}
.p{margin-top:8px;color:#4b5563}
.msg{margin-top:12px;background:#eef2ff;color:#3730a3;padding:10px 12px;border-radius:8px;font-size:14px}
.actions{margin-top:20px;display:flex;flex-wrap:wrap;gap:12px;align-items:center}
.btn{padding:10px 16px;border-radius:10px;border:0;cursor:pointer;font-weight:600;transition:transform .05s ease,filter .15s ease}
.btn:active{transform:translateY(1px)}
.btn-primary{background:var(--indigo);color:#fff;box-shadow:0 8px 18px rgba(99,102,241,.35)}
.btn-primary:hover{filter:brightness(1.05)}
.btn-primary[disabled]{background:#a5b4fc;color:#fff;cursor:not-allowed;box-shadow:none}
.btn-link{background:transparent;color:#374151}
.btn-link:hover{color:#111827;text-decoration:underline}
.cooldown{margin-left:auto;display:flex;align-items:center;gap:10px}
.ring{position:relative;height:44px;width:44px}
.ring svg{transform:rotate(-90deg);filter:drop-shadow(0 1px 1px rgba(0,0,0,.1))}
.ring .center{position:absolute;inset:0;display:grid;place-items:center;font-size:12px;font-weight:700;color:#374151}
.hint{margin-top:10px;font-size:12px;color:#6b7280}
.links{margin-top:16px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;color:#6b7280}
.links a{padding:4px 8px;border-radius:6px;text-decoration:none;color:#374151}
.links a:hover{background:#f3f4f6}
.art{position:relative;height:260px;border-radius:16px;background:linear-gradient(135deg,#6366f1,#7c3aed,#ec4899);
  box-shadow:0 18px 40px rgba(99,102,241,.35);overflow:hidden}
@media (min-width:960px){ .art{height:520px} }
.glow1,.glow2{position:absolute;border-radius:50%;background:rgba(255,255,255,.13);filter:blur(40px)}
.glow1{height:200px;width:200px;top:-60px;left:-60px}
.glow2{height:240px;width:240px;right:-70px;bottom:-70px}
.art-illus{position:absolute;inset:0;display:grid;place-items:center}
.art-caption{position:absolute;bottom:0;padding:18px;color:#fff}
`;

export default function VerifyEmailPending() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const email = params.get("email") || "";
  const justRegistered = params.get("jr") === "1";

  const [seconds, setSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const timerRef = useRef(null);

  const axios = useMemo(
    () =>
      Axios.create({
        baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
        withCredentials: true,
      }),
    []
  );

  const disabled = seconds > 0 || loading;
  const label = seconds > 0 ? `Resend in ${seconds}s` : "Resend verification email";

  useEffect(() => {
    if (justRegistered) startCooldown();
    return () => timerRef.current && clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startCooldown(s = COOLDOWN) {
    setSeconds(s);
    timerRef.current && clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleResend() {
    if (!email) return;
    setMsg("");
    try {
      setLoading(true);
      const res = await axios.post("/api/auth/resend-verification", { email });
      const serverMsg = res?.data?.message;
      const m = typeof serverMsg === "string" && serverMsg.match(/wait (\\d+)s/i);
      startCooldown(m ? parseInt(m[1], 10) : COOLDOWN);
      setMsg("We’ve re-sent the verification email. Please check your inbox.");
    } catch (e) {
      const serverMsg = e?.response?.data?.message || "Unable to resend right now.";
      const m = serverMsg.match(/wait (\\d+)s/i);
      if (m) startCooldown(parseInt(m[1], 10));
      setMsg(serverMsg);
    } finally {
      setLoading(false);
    }
  }

  // circular progress
  const pct = seconds > 0 ? Math.round(((COOLDOWN - seconds) / COOLDOWN) * 100) : 100;
  const R = 18, C = 2 * Math.PI * R, dash = (pct / 100) * C;

  return (
    <main className="page">
      <style>{CSS}</style>

      <div className="shell">
        {/* Art panel */}
        <aside className="art">
          <div className="glow1" />
          <div className="glow2" />
          <div className="art-illus">
            <svg width="260" height="170" viewBox="0 0 240 160" style={{filter:"drop-shadow(0 10px 24px rgba(0,0,0,.2))"}}>
              <defs>
                <linearGradient id="cardGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#F5F3FF" />
                  <stop offset="100%" stopColor="#EDE9FE" />
                </linearGradient>
              </defs>
              <rect x="30" y="28" rx="12" ry="12" width="180" height="120" fill="url(#cardGrad)" opacity="0.95" />
              <path d="M40 40 L120 92 L200 40" fill="none" stroke="#A78BFA" strokeWidth="5" strokeLinecap="round" />
              <circle cx="120" cy="92" r="5" fill="#818CF8" />
            </svg>
          </div>
          <div className="art-caption">
            <div style={{fontWeight:700}}>Almost there</div>
            <div style={{opacity:.9,fontSize:14}}>Click the link we sent to activate your account.</div>
          </div>
        </aside>

        {/* Content card */}
        <section>
          <div className="brand">
            <div className="brand-badge">
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M12 3 1 8l11 5 9-4.09V17h2V8z" />
                <path fill="currentColor" d="M11 13.98 3 10v4l8 4 8-4v-4l-8 3.98z" opacity=".55" />
              </svg>
            </div>
            <span style={{fontWeight:600,color:"#1f2937"}}>Tutiful</span>
          </div>

          <div className="card">
            <div className="bar" />
            <div className="card-body">
              <h1 className="h1">Verify your email</h1>
              <p className="p">
                We’ve sent a verification link to{" "}
                <b style={{color:"#111827", wordBreak:"break-all"}}>{email}</b>. Click the link in the email to
                activate your account.
              </p>

              {msg && <div className="msg">{msg}</div>}

              <div className="actions">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={disabled}
                  className="btn btn-primary"
                >
                  {loading ? "Sending…" : label}
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="btn btn-link"
                >
                  Back to login
                </button>

                <div className="cooldown">
                  <div className="ring">
                    <svg viewBox="0 0 48 48">
                      <circle cx="24" cy="24" r={R} stroke="#e5e7eb" strokeWidth="6" fill="none" />
                      <circle cx="24" cy="24" r={R}
                        stroke="url(#g1)" strokeWidth="6" strokeLinecap="round"
                        strokeDasharray={`${dash} ${C-dash}`} fill="none" />
                      <defs>
                        <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#6366F1" />
                          <stop offset="100%" stopColor="#EC4899" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <span className="center">{Math.max(seconds,0)}s</span>
                  </div>
                </div>
              </div>

              <div className="hint">
                Didn’t get it? Check your spam folder, or click <b>Resend verification email</b>.
                You’ll need to wait 60 seconds between requests.
              </div>

              <div className="links">
                <span>Open your inbox:</span>
                <a href="https://mail.google.com/" target="_blank" rel="noreferrer">Gmail</a>
                <a href="https://outlook.live.com/mail/" target="_blank" rel="noreferrer">Outlook</a>
                <a href="https://mail.yahoo.com/" target="_blank" rel="noreferrer">Yahoo</a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
