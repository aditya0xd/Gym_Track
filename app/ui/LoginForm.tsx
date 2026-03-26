'use client';

import { useActionState } from "react";

import { login, logout, refreshTokens } from "@/app/actions/auth";

export default function LoginForm() {
  const [loginState, loginAction, loginPending] = useActionState(login);
  const [refreshState, refreshAction, refreshPending] = useActionState(refreshTokens);
  const [logoutState, logoutAction, logoutPending] = useActionState(logout);

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/30 backdrop-blur">
      <h1 className="text-3xl font-semibold text-slate-100">Gym access portal</h1>
      <p className="mt-2 text-sm text-slate-300">
        This demo issues an access token (15 minute lifespan) plus a refresh token
        (7 day lifespan) via HTTP-only cookies.
      </p>

      <form action={loginAction} className="mt-8 space-y-6">
        <div>
          <label htmlFor="email" className="text-sm font-medium text-slate-100">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-slate-50 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/60"
            placeholder="admin@gym.local"
          />
        </div>

        <div>
          <label htmlFor="password" className="text-sm font-medium text-slate-100">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-slate-50 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/60"
            placeholder="GymPass123!"
          />
        </div>

        <button
          type="submit"
          disabled={loginPending}
          className="w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-wait disabled:opacity-70"
        >
          {loginPending ? "Minting tokens..." : "Sign in and mint tokens"}
        </button>

        {loginState && (
          <p
            className={`text-sm ${
              loginState.success ? "text-emerald-400" : "text-rose-400"
            }`}
            role="status"
          >
            {loginState.message}
          </p>
        )}
      </form>

      <div className="mt-8 space-y-3 rounded-2xl border border-white/10 bg-slate-900/70 p-5 text-sm text-slate-300">
        <p className="text-slate-400">Demo credentials</p>
        <p>Email: admin@gym.local</p>
        <p>Password: GymPass123!</p>
        <p className="text-slate-400">
          Swap the values via <code className="rounded-full bg-white/10 px-2 py-0.5">DEMO_AUTH_EMAIL</code>{" "}
          and <code className="rounded-full bg-white/10 px-2 py-0.5">DEMO_AUTH_PASSWORD</code>{" "}
          in <code className="rounded-full bg-white/10 px-2 py-0.5">.env</code>.
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <form action={refreshAction}>
          <button
            type="submit"
            disabled={refreshPending}
            className="w-full rounded-2xl border border-cyan-400/70 px-4 py-3 text-sm font-semibold text-cyan-200 transition hover:border-cyan-400/90 hover:bg-cyan-500/5 disabled:cursor-wait disabled:opacity-60"
          >
            {refreshPending ? "Refreshing tokens…" : "Refresh tokens"}
          </button>
        </form>

        <form action={logoutAction}>
          <button
            type="submit"
            disabled={logoutPending}
            className="w-full rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-white/30 disabled:cursor-wait disabled:opacity-60"
          >
            {logoutPending ? "Clearing cookies…" : "Logout (clear tokens)"}
          </button>
        </form>

        {(refreshState || logoutState) && (
          <p role="status" className="text-xs text-slate-300">
            {refreshState?.message ?? logoutState?.message}
          </p>
        )}
      </div>
    </div>
  );
}
