import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import AdminNav from "@/components/AdminNav";
import MobileNav from "@/components/MobileNav";

export default async function AdminLayout({ children }) {
  const admin = await requireAdmin();
  if (!admin) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <AdminNav email={admin.email} />
      <div className="flex-1 flex flex-col">
        <MobileNav />
        <main className="flex-1 px-4 py-6 md:px-10 md:py-10 max-w-6xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
