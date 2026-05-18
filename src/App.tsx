import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute, PublicRoute } from '@/components/auth/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { SignInPage } from '@/pages/auth/SignInPage';
import { SignUpPage } from '@/pages/auth/SignUpPage';
import { VerifyEmailPage } from '@/pages/auth/VerifyEmailPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { OnboardingPage } from '@/pages/auth/OnboardingPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { PropertyCreatePage } from '@/pages/property/PropertyCreatePage';
import { PropertyDetailPage } from '@/pages/property/PropertyDetailPage';
import { TurnoverCreatePage } from '@/pages/turnover/TurnoverCreatePage';
import { TurnoverDetailPage } from '@/pages/turnover/TurnoverDetailPage';
import { VendorsPage } from '@/pages/vendor/VendorsPage';
import { SettingsPage } from '@/pages/settings/SettingsPage';
import { InspectionPage } from '@/pages/turnover/InspectionPage';
import { DeductionsPage } from '@/pages/turnover/DeductionsPage';
import { TenantPortalPage } from '@/pages/portal/TenantPortalPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public auth routes */}
          <Route
            path="/signin"
            element={
              <PublicRoute>
                <SignInPage />
              </PublicRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicRoute>
                <SignUpPage />
              </PublicRoute>
            }
          />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />

          {/* Protected app routes */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/properties/new" element={<PropertyCreatePage />} />
            <Route path="/properties/:id" element={<PropertyDetailPage />} />
            <Route path="/turnovers/new" element={<TurnoverCreatePage />} />
            <Route path="/turnovers/:id" element={<TurnoverDetailPage />} />
            <Route path="/turnovers/:id/inspect" element={<InspectionPage />} />
            <Route path="/turnovers/:id/deductions" element={<DeductionsPage />} />
            <Route path="/vendors" element={<VendorsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Portal route (no auth required - magic link) */}
          <Route path="/portal/:token" element={<TenantPortalPage />} />

          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        <Toaster position="bottom-center" />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
