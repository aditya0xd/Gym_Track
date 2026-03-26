import LoginForm from "./ui/LoginForm";

export const metadata = {
  title: "Gym Admin Login",
  description: "Login to mint JWT access and refresh tokens for the gym dashboard.",
};

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto grid w-full max-w-6xl gap-10 rounded-3xl border border-white/10 bg-slate-900/60 p-10 shadow-[0_20px_120px_rgba(15,23,42,0.75)] backdrop-blur">
        <section className="flex flex-col gap-4 rounded-3xl bg-gradient-to-br from-slate-900/90 via-slate-900/40 to-slate-950/90 p-8 text-left shadow-inner shadow-black/50 md:p-10 md:text-lg">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Secure portal</p>
          <h1 className="text-3xl font-semibold text-white md:text-4xl">
            JWT based login with access & refresh cookie flows
          </h1>
          <p className="max-w-3xl text-base text-slate-300">
            The client sends credentials to a server action that validates them against demo values,
            then sets an HTTP-only access token (15 min) plus a refresh token (7 days). This keeps the UI
            lightweight while the server controls the token lifecycle.
          </p>
          <ul className="list-inside list-disc space-y-2 text-sm text-slate-300">
            <li>Access tokens live in sweet spot between security and UX—rotate often, short-lived.</li>
            <li>Refresh tokens stay secure behind HTTP-only cookies and can be renewed on demand.</li>
            <li>Env vars you can override: <code className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold">ACCESS_TOKEN_SECRET</code>, <code className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold">REFRESH_TOKEN_SECRET</code>, <code className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold">DEMO_AUTH_EMAIL</code>, and <code className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold">DEMO_AUTH_PASSWORD</code>.</li>
          </ul>
        </section>

        <LoginForm />
      </div>
    </main>
  );
}
