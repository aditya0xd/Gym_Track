import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { verifyAccessToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("gym_access_token")?.value;
  const payload = await verifyAccessToken(accessToken);

  if (!payload) {
    redirect("/login");
  }

  const members = await prisma.member.findMany({
    take: 20,
    orderBy: { startDate: "desc" },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      planType: true,
      planPrice: true,
      startDate: true,
      endDate: true,
      whatsappEnabled: true,
    },
  });

  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-100">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-300">
          Signed in as <span className="font-medium">{payload.email}</span>
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/40">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-950/60 text-slate-200">
              <tr>
                <th className="px-4 py-3 text-left">Member</th>
                <th className="px-4 py-3 text-left">Plan</th>
                <th className="px-4 py-3 text-left">Price</th>
                <th className="px-4 py-3 text-left">Start</th>
                <th className="px-4 py-3 text-left">End</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 bg-slate-900/20 text-slate-100">
              {members.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{m.fullName}</div>
                    {m.email ? (
                      <div className="text-xs text-slate-300">{m.email}</div>
                    ) : (
                      <div className="text-xs text-slate-500">No email</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {m.planType}{" "}
                    <span className="text-xs text-slate-400">
                      ({m.whatsappEnabled ? "WhatsApp" : "SMS"})
                    </span>
                  </td>
                  <td className="px-4 py-3">{m.planPrice.toString()}</td>
                  <td className="px-4 py-3">
                    {m.startDate.toISOString().slice(0, 10)}
                  </td>
                  <td className="px-4 py-3">
                    {m.endDate.toISOString().slice(0, 10)}
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td className="px-4 py-10 text-center text-slate-400" colSpan={5}>
                    No members found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}