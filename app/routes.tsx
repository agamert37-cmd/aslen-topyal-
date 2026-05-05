import { createBrowserRouter, createHashRouter, Navigate, Outlet } from "react-router";
import { Suspense, lazy } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { MainLayout } from "./components/MainLayout";
import { ErrorPage } from "./pages/ErrorPage";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { EmployeeProvider } from "./contexts/EmployeeContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { SyncProvider } from "./contexts/SyncContext";
import { LanguageProvider } from "./contexts/LanguageContext";

import { PublicSitePage } from "./pages/PublicSitePage";

// NOT: AuthProvider artık App.tsx'te (AppLockScreen erişimi için) tanımlanıyor.
// RootProviders içindeki AuthProvider kaldırıldı — App.tsx'teki Provider tüm ağacı kapsar.

// Eagerly loaded — her zaman hızlı açılmalı
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/site/DashboardPage";

// Lazy loaded — ilk yüklemede indirilmez, sayfaya girilince yüklenir
const SalesPage        = lazy(() => import("./pages/SalesPage").then(m => ({ default: m.SalesPage })));
const TahsilatPage     = lazy(() => import("./pages/TahsilatPage").then(m => ({ default: m.TahsilatPage })));
const AracTakipPage    = lazy(() => import("./pages/AracTakipPage").then(m => ({ default: m.AracTakipPage })));
const ChatPage         = lazy(() => import("./pages/ChatPage").then(m => ({ default: m.ChatPage })));
const StokPage         = lazy(() => import("./pages/StokPage").then(m => ({ default: m.StokPage })));
const IcebergPage      = lazy(() => import("./pages/IcebergPage").then(m => ({ default: m.IcebergPage })));
const StokHareketPage  = lazy(() => import("./pages/StokHareketPage").then(m => ({ default: m.StokHareketPage })));
const UretimPage       = lazy(() => import("./pages/UretimPage").then(m => ({ default: m.UretimPage })));
const PazarlamaPage    = lazy(() => import("./pages/PazarlamaPage").then(m => ({ default: m.PazarlamaPage })));
const CeklerPage       = lazy(() => import("./pages/CeklerPage").then(m => ({ default: m.CeklerPage })));
const CariPage         = lazy(() => import("./pages/CariPage").then(m => ({ default: m.CariPage })));
const CariDetailPage   = lazy(() => import("./pages/CariDetailPage").then(m => ({ default: m.CariDetailPage })));
const KasaPage         = lazy(() => import("./pages/KasaPage").then(m => ({ default: m.KasaPage })));
const AracPage         = lazy(() => import("./pages/AracPage").then(m => ({ default: m.AracPage })));
const PersonelPage     = lazy(() => import("./pages/PersonelPage").then(m => ({ default: m.PersonelPage })));
const RaporlarPage     = lazy(() => import("./pages/RaporlarPage").then(m => ({ default: m.RaporlarPage })));
const FilesPage        = lazy(() => import("./pages/FilesPage").then(m => ({ default: m.FilesPage })));
const FisHistoryPage   = lazy(() => import("./pages/FisHistoryPage").then(m => ({ default: m.FisHistoryPage })));
const SettingsPage     = lazy(() => import("./pages/SettingsPage").then(m => ({ default: m.SettingsPage })));
const YedeklerPage     = lazy(() => import("./pages/YedeklerPage").then(m => ({ default: m.YedeklerPage })));
const SecurityPage     = lazy(() => import("./pages/SecurityPage").then(m => ({ default: m.SecurityPage })));

const FaturaPage       = lazy(() => import("./pages/FaturaPage").then(m => ({ default: m.FaturaPage })));
const OpsCenterPage  = lazy(() => import("./pages/ops/OpsCenterPage").then(m => ({ default: m.OpsCenterPage })));
const DataAuditPage  = lazy(() => import("./pages/DataAuditPage").then(m => ({ default: m.DataAuditPage })));
const UpdateNotesPage  = lazy(() => import("./pages/UpdateNotesPage").then(m => ({ default: m.UpdateNotesPage })));

// Sayfa yüklenirken gösterilecek spinner
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
    </div>
  );
}

function Lazy({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </ErrorBoundary>
  );
}

function ProtectedRoute({ element }: { element: React.ReactElement }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return element;
}

function RootErrorBoundary() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <EmployeeProvider>
          <NotificationProvider>
            <SyncProvider>
              <ErrorPage />
            </SyncProvider>
          </NotificationProvider>
        </EmployeeProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

function RootProviders() {
  return (
    <LanguageProvider>
      <EmployeeProvider>
        <NotificationProvider>
          <SyncProvider>
            <Outlet />
          </SyncProvider>
        </NotificationProvider>
      </EmployeeProvider>
    </LanguageProvider>
  );
}

const P = (el: React.ReactElement) => <ProtectedRoute element={el} />;

const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI?.isElectron;
const AppRouter = isElectron ? createHashRouter : createBrowserRouter;
// Eğer Electron içindeysek (Masaüstü uygulaması/Karargah) varsayılan olarak Ops Center'a git.
const defaultRoute = isElectron ? "/ops-center" : "/dashboard";

export const router = AppRouter([
  {
    element: <RootProviders />,
    errorElement: <RootErrorBoundary />,
    children: [
      {
        path: "/login",
        element: <LoginPage />,
      },
      {
        path: "/site",
        element: <PublicSitePage />,
      },
      {
        path: "/",
        Component: MainLayout,
        children: [
          { index: true, element: P(<Navigate to={defaultRoute} replace />) },
          { path: "dashboard",         element: P(<DashboardPage />) },
          { path: "sales",             element: P(<Lazy><SalesPage /></Lazy>) },
          { path: "tahsilat",          element: P(<Lazy><TahsilatPage /></Lazy>) },
          { path: "arac-takip",        element: P(<Lazy><AracTakipPage /></Lazy>) },
          { path: "chat",              element: P(<Lazy><ChatPage /></Lazy>) },
          { path: "stok",              element: P(<Lazy><StokPage /></Lazy>) },
          { path: "iceberg",           element: P(<Lazy><IcebergPage /></Lazy>) },
          { path: "stok-hareket",      element: P(<Lazy><StokHareketPage /></Lazy>) },
          { path: "uretim",            element: P(<Lazy><UretimPage /></Lazy>) },
          { path: "pazarlama",         element: P(<Lazy><PazarlamaPage /></Lazy>) },
          { path: "cekler",            element: P(<Lazy><CeklerPage /></Lazy>) },
          { path: "cari",              element: P(<Lazy><CariPage /></Lazy>) },
          { path: "cari/:id",          element: P(<Lazy><CariDetailPage /></Lazy>) },
          { path: "kasa",              element: P(<Lazy><KasaPage /></Lazy>) },
          { path: "arac",              element: P(<Lazy><AracPage /></Lazy>) },
          { path: "personel",          element: P(<Lazy><PersonelPage /></Lazy>) },
          { path: "raporlar",          element: P(<Lazy><RaporlarPage /></Lazy>) },
          { path: "dosyalar",          element: P(<Lazy><FilesPage /></Lazy>) },
          { path: "fis-gecmisi",       element: P(<Lazy><FisHistoryPage /></Lazy>) },
          { path: "settings",          element: P(<Lazy><SettingsPage /></Lazy>) },
          { path: "yedekler",          element: P(<Lazy><YedeklerPage /></Lazy>) },
          { path: "guvenlik",          element: P(<Lazy><SecurityPage /></Lazy>) },
          { path: "faturalar",         element: P(<Lazy><FaturaPage /></Lazy>) },
          { path: "guncelleme-notlari",element: P(<Lazy><UpdateNotesPage /></Lazy>) },
          { path: "data-audit",        element: P(<Lazy><DataAuditPage /></Lazy>) },
        ],
      },
      {
        path: "/ops-center",
        element: P(<Lazy><OpsCenterPage /></Lazy>),
      },
      {
        path: "*",
        element: <Navigate to={defaultRoute} replace />,
      },
    ],
  },
]);
