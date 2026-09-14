import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Register = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
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
      await signup(formData);
      navigate("/dashboard");
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F3EED8] px-5 py-6 md:px-10">

      <header className="border-b-2 border-[#171717] pb-4">
        <div className="flex flex-col gap-3 md:flex-row md:justify-between">

          <div className="classification">
            CODECOLLAB / USER REGISTRY
          </div>

          <div className="classification text-[#716F62]">
            RECORD INTAKE / NEW USER
          </div>

        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-130px)] max-w-7xl grid-cols-1 lg:grid-cols-[0.7fr_1.3fr]">

        {/* Information */}
        <div className="border-b-2 border-[#171717] py-12 lg:border-b-0 lg:border-r-2 lg:pr-14">

          <span className="status-stamp active">
            REGISTRATION
          </span>

          <h1 className="editorial-title mt-7 text-6xl leading-[0.9] tracking-[-0.04em] md:text-7xl">
            Create
            <br />
            your
            <br />
            record.
          </h1>

          <div className="my-8 border-t-2 border-[#171717]" />

          <p className="max-w-md text-sm leading-7 text-[#4f4d43]">
            Establish your CodeCollab identity to create
            coding rooms, collaborate with other users,
            and maintain your saved projects.
          </p>

          <div className="mt-10 border-2 border-[#171717]">

            <div className="border-b-2 border-[#171717] p-4">
              <div className="classification text-[#716F62]">
                REGISTRATION TYPE
              </div>

              <div className="mt-2 text-sm font-semibold">
                STANDARD USER
              </div>
            </div>

            <div className="p-4">
              <div className="classification text-[#716F62]">
                RECORD STATUS
              </div>

              <div className="mt-2 flex items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 bg-[#C9183E]" />
                ACCEPTING ENTRIES
              </div>
            </div>

          </div>

        </div>

        {/* Form */}
        <div className="flex items-center py-12 lg:pl-14">

          <div className="w-full max-w-lg">

            <div className="mb-8 border-b-2 border-[#171717] pb-5">
              <div className="classification mb-2 text-[#C9183E]">
                FORM / REG-01
              </div>

              <h2 className="editorial-heading text-4xl">
                New user
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
                  FULL NAME
                </label>

                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="ENTER FULL NAME"
                  className="archival-input"
                  required
                />
              </div>

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
                  placeholder="MINIMUM 6 CHARACTERS"
                  className="archival-input"
                  minLength={6}
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
                    ? "CREATING RECORD..."
                    : "CREATE RECORD →"}
                </button>

              </div>

            </form>

            <div className="mt-8 border-t border-[#171717] pt-5 text-sm">

              <span className="text-[#716F62]">
                ALREADY REGISTERED?{" "}
              </span>

              <Link
                to="/login"
                className="font-semibold underline decoration-2 underline-offset-4 hover:text-[#C9183E]"
              >
                ACCESS ACCOUNT
              </Link>

            </div>

          </div>

        </div>

      </section>

      <footer className="border-t-2 border-[#171717] pt-3">
        <div className="flex flex-col justify-between gap-2 text-[10px] uppercase tracking-[0.12em] md:flex-row">
          <span>CODECOLLAB / USER REGISTRY</span>
          <span>SECURE RECORD INTAKE</span>
          <span>EST. 2026</span>
        </div>
      </footer>

    </main>
  );
};

export default Register;