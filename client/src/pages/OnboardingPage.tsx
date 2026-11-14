import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import OnboardingWizard from '../components/onboarding/OnboardingWizard';
import { Loader2 } from 'lucide-react';

export default function OnboardingPage() {
  const { user, token, loading } = useAuth();
  const navigate = useNavigate();
  const [initialStep, setInitialStep] = useState<number>(() => user?.onboardingStep || 1);
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    if (!token || !user) {
      setStatusLoading(false);
      return;
    }

    let isMounted = true;
    const fetchStatus = async () => {
      try {
        const res = await api.get('/onboarding/status');
        if (!isMounted) return;
        if (res.data.status === 'completed' || (res.data.completed && res.data.status !== 'skipped')) {
          navigate('/dashboard', { replace: true });
          return;
        }
        if (typeof res.data.step === 'number' && res.data.step >= 1 && res.data.step <= 5) {
          setInitialStep(res.data.step);
        }
      } catch {
        // Fallback to user.onboardingStep from AuthContext
      } finally {
        if (isMounted) {
          setStatusLoading(false);
        }
      }
    };

    fetchStatus();

    return () => {
      isMounted = false;
    };
  }, [token]);

  if (loading || statusLoading || !user) {
    return (
      <div className="login-force-light min-h-screen flex items-center justify-center p-4 sm:p-6">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  // If onboarding already completed, go to dashboard
  if (user?.onboardingStatus === 'completed' || (user?.onboardingCompleted && user?.onboardingStatus !== 'skipped')) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  return (
    <div className="login-force-light min-h-screen flex items-center justify-center p-4 sm:p-6">
      <OnboardingWizard
        initialStep={initialStep}
        onComplete={() => {
          navigate('/dashboard', { replace: true });
        }}
        onSkip={() => {
          navigate('/dashboard', { replace: true });
        }}
      />
    </div>
  );
}
