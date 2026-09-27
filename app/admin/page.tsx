import { cookies } from "next/headers";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-auth";
import AdminDashboard from "./dashboard";
import AdminLogin from "./login";

export default async function AdminPage() {
  const session = (await cookies()).get(adminCookieName)?.value;

  if (!isValidAdminSession(session)) {
    return <AdminLogin />;
  }

  return <AdminDashboard adminEmail={process.env.ADMIN_EMAIL || "chophub@aol.com"} />;
}
