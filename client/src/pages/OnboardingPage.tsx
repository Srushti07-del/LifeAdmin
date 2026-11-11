import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import OnboardingWizard from '../components/onboarding/OnboardingWizard';
import { Loader2 } from 'lucide-react';

export default function OnboardingPage() {
  const { user, token, loading } = useAuth();
  const navigate = useNavigate();
  const [onboardingStatus, setOnboardingStatus] = useState<{ completed: boolean; step: number } | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  useEffect(() => {
    if (!token || !user) return;
    fetchStatus();
  }, [token, user]);

  const fetchStatus = async () => {
    setStatusLoading(true);
    try {
      const res = await api.get('/api/onboarding/status');
      setOnboardingStatus(res.data);
      if (res.data.completed) {
        navigate('/dashboard', { replace: true });
      }
    } catch {
      // Ignore errors - user will see wizard and can save progress
    } finally {
      setStatusLoading(false);
    }
  };

  if (loading || statusLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface-50 dark:bg-[#101719]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  // If onboarding already completed, go to dashboard
  if (onboardingStatus?.completed) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-[#101719] flex items-center justify-center p-4 sm:p-6">
      <OnboardingWizard onComplete={() => {
        navigate('/dashboard', { replace: true });
      }} />
    </div>
  );
}
