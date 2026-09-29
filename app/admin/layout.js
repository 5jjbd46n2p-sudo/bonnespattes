import { adminPageGuard } from "@/lib/auth";
import AdminNav from "@/components/AdminNav";
import MobileNav from "@/components/MobileNav";

export default async function AdminLayout({ children }) {
  const admin = await adminPageGuard();

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <AdminNav email={admin.email} />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileNav />
        {/* Marge basse sur mobile pour ne pas passer sous la barre d'onglets */}
        <main className="flex-1 px-4 pt-5 pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-10 md:py-10 max-w-6xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
