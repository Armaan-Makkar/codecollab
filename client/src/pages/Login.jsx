import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const { signin } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      await signin(formData);
      navigate("/dashboard");
    } catch (error) {
      setError(
        error.response?.data?.message || "Login failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F3EED8] px-5 py-6 md:px-10">

      {/* Top archival header */}
      <header className="border-b-2 border-[#171717] pb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

          <div className="classification">
            CODECOLLAB / AUTHENTICATION SYSTEM
          </div>

          <div className="classification text-[#716F62]">
            SYSTEM 01 · SECURE ACCESS
          </div>

        </div>
      </header>

      {/* Main grid */}
      <section className="mx-auto grid min-h-[calc(100vh-130px)] max-w-7xl grid-cols-1 lg:grid-cols-[1.3fr_0.7fr]">

        {/* Editorial side */}
        <div className="flex flex-col justify-between border-b-2 border-[#171717] py-12 lg:border-b-0 lg:border-r-2 lg:pr-14">

          <div>

            <div className="mb-6 flex items-center gap-3">
              <span className="status-stamp active">
                ACCESS PORTAL
              </span>

              <span className="classification text-[#716F62]">
                RECORD 0001
              </span>
            </div>

            <h1 className="editorial-title max-w-3xl text-6xl leading-[0.9] tracking-[-0.04em] md:text-8xl">
              Welcome
              <br />
              back.
            </h1>

            <div className="my-8 max-w-xl border-t-2 border-[#171717]" />

            <p className="max-w-xl text-sm leading-7 text-[#4f4d43]">
              Access the collaborative coding workspace.
              Authenticate your identity to continue to
              shared rooms, projects, and execution tools.
            </p>

          </div>

          <div className="mt-16 grid max-w-xl grid-cols-2 border-2 border-[#171717]">

            <div className="border-r-2 border-[#171717] p-4">
              <div className="classification text-[#716F62]">
                PLATFORM
              </div>

              <div className="editorial-heading mt-2 text-2xl">
                COLLAB
              </div>
            </div>

            <div className="p-4">
              <div className="classification text-[#716F62]">
                STATUS
              </div>

              <div className="mt-2 flex items-center gap-2 text-sm font-semibold">
                <span className="h-2.5 w-2.5 bg-[#C9183E]" />
                OPERATIONAL
              </div>
            </div>

          </div>

        </div>

        {/* Login form */}
        <div className="flex items-center py-12 lg:pl-14">

          <div className="w-full max-w-lg">

            <div className="mb-8 border-b-2 border-[#171717] pb-5">
              <div className="classification mb-2 text-[#C9183E]">
                FORM / AUTH-01
              </div>

              <h2 className="editorial-heading text-4xl">
                Sign in
              </h2>
            </div>

            {error && (
              <div className="mb-6 border-2 border-[#C9183E] p-4 text-sm">
                <div className="classification mb-1 text-[#C9183E]">
                  ERROR
                </div>
                {error}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="space-y-6"
            >

              <div>
                <label className="classification mb-2 block">
                  EMAIL ADDRESS
                </label>

                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="USER@CODECOLLAB.LOCAL"
                  className="archival-input"
                  required
                />
              </div>

              <div>
                <label className="classification mb-2 block">
                  PASSWORD
                </label>

                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="archival-input"
                  required
                />
              </div>

              <div className="border-t-2 border-[#171717] pt-6">

                <button
                  type="submit"
                  disabled={loading}
                  className="brutalist-button w-full"
                >
                  {loading
                    ? "AUTHENTICATING..."
                    : "ENTER SYSTEM →"}
                </button>

              </div>

            </form>

            <div className="mt-8 border-t border-[#171717] pt-5 text-sm">

              <span className="text-[#716F62]">
                NO EXISTING RECORD?{" "}
              </span>

              <Link
                to="/register"
                className="font-semibold underline decoration-2 underline-offset-4 hover:text-[#C9183E]"
              >
                CREATE ACCOUNT
              </Link>

            </div>

          </div>

        </div>

      </section>

      {/* Footer */}
      <footer className="border-t-2 border-[#171717] pt-3">
        <div className="flex flex-col justify-between gap-2 text-[10px] uppercase tracking-[0.12em] md:flex-row">
          <span>CODECOLLAB / DIGITAL WORKSPACE</span>
          <span>AUTHORIZATION REQUIRED</span>
          <span>EST. 2026</span>
        </div>
      </footer>

    </main>
  );
};

export default Login;