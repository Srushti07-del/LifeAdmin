import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';

export default function TermsOfService() {
  const navigate = useNavigate();

  return (
    <div className="space-y-8 animate-fade-in pb-16 max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-3 border-b border-surface-100 dark:border-[#304247]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              onClick={() => navigate('/settings', { replace: true })}
              className="p-1.5 rounded-lg text-surface-500 hover:text-surface-600 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800"
              title="Back to Settings"
              aria-label="Back to Settings"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="w-8 h-8 rounded-xl bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 flex items-center justify-center">
              <FileText size={18} />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold font-editorial text-surface-900 dark:text-surface-100 tracking-tight">
            Terms of Service
          </h1>
          <p className="text-xs text-surface-500 dark:text-surface-400 mt-1 max-w-xl leading-relaxed">
            Last updated: November 2026
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <section className="bg-white dark:bg-surface-0 rounded-3xl p-6 sm:p-8 border border-surface-200 dark:border-surface-700 shadow-card space-y-6">
          <h2 className="text-xl font-bold font-editorial text-surface-900 dark:text-surface-100">
            1. Acceptance of Terms
          </h2>
          <p className="text-sm text-surface-600 dark:text-surface-300 leading-relaxed">
            By accessing or using LifeAdmin (&ldquo;the Service&rdquo;), you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you may not use the Service.
          </p>
          <p className="text-sm text-surface-600 dark:text-surface-300 leading-relaxed">
            LifeAdmin is a completely free personal life management service. There are no subscription tiers, paywalls, or paid features.
          </p>
        </section>

        <section className="bg-white dark:bg-surface-0 rounded-3xl p-6 sm:p-8 border border-surface-200 dark:border-surface-700 shadow-card space-y-6">
          <h2 className="text-xl font-bold font-editorial text-surface-900 dark:text-surface-100">
            2. Use of Service
          </h2>
          <p className="text-sm text-surface-600 dark:text-surface-300 leading-relaxed">
            You may use LifeAdmin to manage tasks, bills, appointments, reminders, documents, and calendar events. You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account.
          </p>
          <p className="text-sm text-surface-600 dark:text-surface-300 leading-relaxed">
            You agree not to use the Service for any unlawful purpose, or in any manner that could damage, disable, overburden, or impair the Service.
          </p>
        </section>

        <section className="bg-white dark:bg-surface-0 rounded-3xl p-6 sm:p-8 border border-surface-200 dark:border-surface-700 shadow-card space-y-6">
          <h2 className="text-xl font-bold font-editorial text-surface-900 dark:text-surface-100">
            3. User Accounts
          </h2>
          <p className="text-sm text-surface-600 dark:text-surface-300 leading-relaxed">
            Certain features require you to create an account. You agree to provide accurate, current, and complete information during registration and to update such information as needed.
          </p>
          <p className="text-sm text-surface-600 dark:text-surface-300 leading-relaxed">
            You may delete your account at any time from the Settings page. Account deletion permanently removes all your data and cannot be undone.
          </p>
        </section>

        <section className="bg-white dark:bg-surface-0 rounded-3xl p-6 sm:p-8 border border-surface-200 dark:border-surface-700 shadow-card space-y-6">
          <h2 className="text-xl font-bold font-editorial text-surface-900 dark:text-surface-100">
            4. Intellectual Property
          </h2>
          <p className="text-sm text-surface-600 dark:text-surface-300 leading-relaxed">
            LifeAdmin and its original content, features, and functionality (including the LifeBuddy companions) are owned by LifeAdmin and are protected by copyright, trademark, and other laws.
          </p>
          <p className="text-sm text-surface-600 dark:text-surface-300 leading-relaxed">
            You retain ownership of any data you enter into the Service. We do not claim ownership of your personal information.
          </p>
        </section>

        <section className="bg-white dark:bg-surface-0 rounded-3xl p-6 sm:p-8 border border-surface-200 dark:border-surface-700 shadow-card space-y-6">
          <h2 className="text-xl font-bold font-editorial text-surface-900 dark:text-surface-100">
            5. Limitation of Liability
          </h2>
          <p className="text-sm text-surface-600 dark:text-surface-300 leading-relaxed">
            The Service is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis without warranties of any kind. To the fullest extent permitted by law, LifeAdmin disclaims all warranties, express or implied.
          </p>
          <p className="text-sm text-surface-600 dark:text-surface-300 leading-relaxed">
            LifeAdmin shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of the Service.
          </p>
        </section>

        <section className="bg-white dark:bg-surface-0 rounded-3xl p-6 sm:p-8 border border-surface-200 dark:border-surface-700 shadow-card space-y-6">
          <h2 className="text-xl font-bold font-editorial text-surface-900 dark:text-surface-100">
            6. Termination
          </h2>
          <p className="text-sm text-surface-600 dark:text-surface-300 leading-relaxed">
            We may terminate or suspend your account and access to the Service, without notice, for any reason, including breach of these Terms.
          </p>
          <p className="text-sm text-surface-600 dark:text-surface-300 leading-relaxed">
            Upon termination, your right to use the Service will immediately cease.
          </p>
        </section>

        <section className="bg-white dark:bg-surface-0 rounded-3xl p-6 sm:p-8 border border-surface-200 dark:border-surface-700 shadow-card space-y-6">
          <h2 className="text-xl font-bold font-editorial text-surface-900 dark:text-surface-100">
            7. Changes to Terms
          </h2>
          <p className="text-sm text-surface-600 dark:text-surface-300 leading-relaxed">
            We reserve the right to modify these Terms at any time. We will notify you of material changes by posting the updated terms on this page with a revised &ldquo;Last updated&rdquo; date.
          </p>
          <p className="text-sm text-surface-600 dark:text-surface-300 leading-relaxed">
            Your continued use of the Service after changes are posted constitutes acceptance of the new terms.
          </p>
        </section>

        <section className="bg-white dark:bg-surface-0 rounded-3xl p-6 sm:p-8 border border-surface-200 dark:border-surface-700 shadow-card space-y-6">
          <h2 className="text-xl font-bold font-editorial text-surface-900 dark:text-surface-100">
            8. Governing Law
          </h2>
          <p className="text-sm text-surface-600 dark:text-surface-300 leading-relaxed">
            These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which LifeAdmin operates, without regard to conflict of law principles.
          </p>
        </section>

        <section className="bg-white dark:bg-surface-0 rounded-3xl p-6 sm:p-8 border border-surface-200 dark:border-surface-700 shadow-card space-y-6">
          <h2 className="text-xl font-bold font-editorial text-surface-900 dark:text-surface-100">
            9. Contact Us
          </h2>
          <p className="text-sm text-surface-600 dark:text-surface-300 leading-relaxed">
            If you have any questions about these Terms of Service, please contact us through the Settings page or email support.
          </p>
        </section>
      </div>
    </div>
  );
}
