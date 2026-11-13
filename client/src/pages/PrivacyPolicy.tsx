import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export default function PrivacyPolicy() {
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
              <ShieldCheck size={18} />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold font-editorial text-surface-900 dark:text-surface-100 tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-xs text-surface-500 dark:text-surface-400 mt-1 max-w-xl leading-relaxed">
            Last updated: November 2026
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <section className="bg-white dark:bg-surface-0 rounded-3xl p-6 sm:p-8 border border-surface-200 dark:border-surface-700 shadow-card space-y-6">
          <h2 className="text-xl font-bold font-editorial text-surface-900 dark:text-surface-100">
            1. Introduction
          </h2>
          <p className="text-sm text-surface-600 dark:text-surface-300 leading-relaxed">
            LifeAdmin respects your privacy. This Privacy Policy explains what information we collect, how we use it, and your choices regarding your personal data.
          </p>
          <p className="text-sm text-surface-600 dark:text-surface-300 leading-relaxed">
            LifeAdmin is designed as a personal workspace. Your data belongs to you, and we do not sell your personal information to third parties.
          </p>
        </section>

        <section className="bg-white dark:bg-surface-0 rounded-3xl p-6 sm:p-8 border border-surface-200 dark:border-surface-700 shadow-card space-y-6">
          <h2 className="text-xl font-bold font-editorial text-surface-900 dark:text-surface-100">
            2. Information We Collect
          </h2>
          <p className="text-sm text-surface-600 dark:text-surface-300 leading-relaxed">
            We collect information you provide directly, such as your name, email address, and preferences. We also collect data you create within the Service, including tasks, bills, appointments, reminders, documents, and calendar events.
          </p>
          <p className="text-sm text-surface-600 dark:text-surface-300 leading-relaxed">
            Usage data (such as feature interactions) may be collected to improve the Service. No personal data is sold or shared with advertisers.
          </p>
        </section>

        <section className="bg-white dark:bg-surface-0 rounded-3xl p-6 sm:p-8 border border-surface-200 dark:border-surface-700 shadow-card space-y-6">
          <h2 className="text-xl font-bold font-editorial text-surface-900 dark:text-surface-100">
            3. How We Use Your Information
          </h2>
          <p className="text-sm text-surface-600 dark:text-surface-300 leading-relaxed">
            We use your information to operate, maintain, and improve the Service; to send reminders and notifications (when enabled); to authenticate your account; and to personalize your experience.
          </p>
          <p className="text-sm text-surface-600 dark:text-surface-300 leading-relaxed">
            Email notifications are only sent for your deadlines, bills, appointments, and tasks. We never send spam.
          </p>
        </section>

        <section className="bg-white dark:bg-surface-0 rounded-3xl p-6 sm:p-8 border border-surface-200 dark:border-surface-700 shadow-card space-y-6">
          <h2 className="text-xl font-bold font-editorial text-surface-900 dark:text-surface-100">
            4. Data Sharing &amp; Disclosure
          </h2>
          <p className="text-sm text-surface-600 dark:text-surface-300 leading-relaxed">
            We do not share your personal data with third parties except as required by law, to protect safety, or with service providers who process data on our behalf under strict confidentiality obligations.
          </p>
        </section>

        <section className="bg-white dark:bg-surface-0 rounded-3xl p-6 sm:p-8 border border-surface-200 dark:border-surface-700 shadow-card space-y-6">
          <h2 className="text-xl font-bold font-editorial text-surface-900 dark:text-surface-100">
            5. Data Security
          </h2>
          <p className="text-sm text-surface-600 dark:text-surface-300 leading-relaxed">
            We implement reasonable technical and organizational measures to protect your data from unauthorized access, alteration, disclosure, or destruction. Your account is protected by authentication, and data is stored securely.
          </p>
        </section>

        <section className="bg-white dark:bg-surface-0 rounded-3xl p-6 sm:p-8 border border-surface-200 dark:border-surface-700 shadow-card space-y-6">
          <h2 className="text-xl font-bold font-editorial text-surface-900 dark:text-surface-100">
            6. Data Retention
          </h2>
          <p className="text-sm text-surface-600 dark:text-surface-300 leading-relaxed">
            We retain your data for as long as your account is active. When you delete your account, all associated data is permanently removed from our systems.
          </p>
          <p className="text-sm text-surface-600 dark:text-surface-300 leading-relaxed">
            You may export a backup of your data at any time from the Settings page.
          </p>
        </section>

        <section className="bg-white dark:bg-surface-0 rounded-3xl p-6 sm:p-8 border border-surface-200 dark:border-surface-700 shadow-card space-y-6">
          <h2 className="text-xl font-bold font-editorial text-surface-900 dark:text-surface-100">
            7. Your Rights
          </h2>
          <p className="text-sm text-surface-600 dark:text-surface-300 leading-relaxed">
            You have the right to access, correct, or delete your personal data. You may export your data or delete your account from the Settings page at any time.
          </p>
          <p className="text-sm text-surface-600 dark:text-surface-300 leading-relaxed">
            You may also manage your email notification preferences and quiet hours in Settings.
          </p>
        </section>

        <section className="bg-white dark:bg-surface-0 rounded-3xl p-6 sm:p-8 border border-surface-200 dark:border-surface-700 shadow-card space-y-6">
          <h2 className="text-xl font-bold font-editorial text-surface-900 dark:text-surface-100">
            8. Cookies &amp; Tracking
          </h2>
          <p className="text-sm text-surface-600 dark:text-surface-300 leading-relaxed">
            We may use cookies and similar technologies to maintain your session, remember preferences, and improve usability. You can control cookies through your browser settings.
          </p>
        </section>

        <section className="bg-white dark:bg-surface-0 rounded-3xl p-6 sm:p-8 border border-surface-200 dark:border-surface-700 shadow-card space-y-6">
          <h2 className="text-xl font-bold font-editorial text-surface-900 dark:text-surface-100">
            9. Changes to This Policy
          </h2>
          <p className="text-sm text-surface-600 dark:text-surface-300 leading-relaxed">
            We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy here with a revised &ldquo;Last updated&rdquo; date.
          </p>
        </section>

        <section className="bg-white dark:bg-surface-0 rounded-3xl p-6 sm:p-8 border border-surface-200 dark:border-surface-700 shadow-card space-y-6">
          <h2 className="text-xl font-bold font-editorial text-surface-900 dark:text-surface-100">
            10. Contact Us
          </h2>
          <p className="text-sm text-surface-600 dark:text-surface-300 leading-relaxed">
            If you have questions about this Privacy Policy or your data, please contact us through the Settings page or email support.
          </p>
        </section>
      </div>
    </div>
  );
}
