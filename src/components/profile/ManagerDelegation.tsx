'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Share2,
  Copy,
  Check,
  Trash2,
  Phone,
  Calendar,
  MessageCircle,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  createManagerInvite,
  fetchHuzurManagers,
  revokeManager,
} from '@/lib/queries/profiles';

interface ManagerRecord {
  id: string;
  name: string;
  phone: string;
  role: string;
  created_at?: string;
}

interface ManagerDelegationProps {
  huzurId: string;
  huzurName: string;
  locale?: string;
}

export default function ManagerDelegation({
  huzurId,
  huzurName,
  locale = 'bn',
}: ManagerDelegationProps) {
  const t = useTranslations('delegate');

  const [managers, setManagers] = useState<ManagerRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite creation state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [managerName, setManagerName] = useState('');
  const [managerPhone, setManagerPhone] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedInvite, setGeneratedInvite] = useState<{
    code: string;
    link: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Revoke state
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Load current managers
  const loadManagers = async () => {
    setLoading(true);
    try {
      const data = await fetchHuzurManagers(huzurId);
      setManagers((data as ManagerRecord[]) || []);
    } catch (e) {
      console.warn('Error loading managers:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadManagers();
  }, [huzurId]);

  const handleGenerateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);

    try {
      const { inviteCode } = await createManagerInvite(
        huzurId,
        managerName.trim() || undefined,
        managerPhone.trim() || undefined
      );

      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://huzurbooking.com';
      const link = `${origin}/${locale}/invite/accept?code=${inviteCode}`;

      setGeneratedInvite({
        code: inviteCode,
        link,
      });
    } catch (err) {
      console.error('Error generating invite:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedInvite) return;
    try {
      await navigator.clipboard.writeText(generatedInvite.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback if clipboard API not permitted
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm(t('revokeConfirm'))) return;

    setRevokingId(id);
    try {
      const success = await revokeManager(id);
      if (success) {
        setManagers((prev) => prev.filter((m) => m.id !== id));
      }
    } finally {
      setRevokingId(null);
    }
  };

  // WhatsApp share link with Bengali template
  const getWhatsAppShareUrl = () => {
    if (!generatedInvite) return '#';
    const message =
      locale === 'bn'
        ? `আসসালামু আলাইকুম। ${huzurName}-এর ওয়াজ মাহফিল ক্যালেন্ডার ও বুকিং পরিচালনার জন্য আপনাকে প্রতিনিধি হিসেবে আমন্ত্রণ জানানো হয়েছে।\n\nআমন্ত্রণ কোড: ${generatedInvite.code}\n\nদায়িত্ব গ্রহণ করতে এই লিংকে ক্লিক করুন:\n${generatedInvite.link}`
        : `Assalamu Alaikum. You have been invited to manage speaking invitations and calendar for ${huzurName}.\n\nInvite Code: ${generatedInvite.code}\nAccept Link:\n${generatedInvite.link}`;

    return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-md p-5 sm:p-7 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-5">
        <div>
          <h3 className="text-lg font-bold font-serif text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            <span>{t('sectionTitle')}</span>
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            {t('sectionSubtitle')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowInviteModal(true);
            setGeneratedInvite(null);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl transition-all shadow-sm shadow-emerald-700/20 self-start sm:self-auto min-h-[44px]"
        >
          <UserPlus className="w-4 h-4" />
          <span>{t('addManagerBtn')}</span>
        </button>
      </div>

      {/* Assigned Managers List */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">
          {t('activeManagers')}
        </h4>

        {loading ? (
          <div className="py-6 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>লোড হচ্ছে...</span>
          </div>
        ) : managers.length === 0 ? (
          <div className="p-6 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center bg-zinc-50/50 dark:bg-zinc-900/50">
            <Users className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t('noManagers')}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {managers.map((mgr) => (
              <div
                key={mgr.id}
                className="p-3.5 sm:p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-sm">
                    {mgr.name ? mgr.name.charAt(0) : 'ম'}
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {mgr.name || (locale === 'bn' ? 'ম্যানেজার' : 'Manager')}
                    </h5>
                    <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-emerald-600" />
                        <span>{mgr.phone || '—'}</span>
                      </span>
                      <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full font-medium">
                        {locale === 'bn' ? 'পূর্ণ ক্ষমতা প্রাপ্ত' : 'Full Delegate'}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRevoke(mgr.id)}
                  disabled={revokingId === mgr.id}
                  className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  title={t('revokeManager')}
                >
                  {revokingId === mgr.id ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Manager / Invite Generator Dialog */}
      {showInviteModal && (
        <div className="p-5 rounded-2xl border-2 border-emerald-600/30 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-emerald-950 dark:text-emerald-100 flex items-center gap-1.5">
              <Share2 className="w-4 h-4 text-emerald-600" />
              <span>{t('addManagerBtn')}</span>
            </h4>
            <button
              type="button"
              onClick={() => setShowInviteModal(false)}
              className="text-xs text-zinc-400 hover:text-zinc-600"
            >
              ✕
            </button>
          </div>

          {!generatedInvite ? (
            <form onSubmit={handleGenerateInvite} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  {t('managerNameLabel')}
                </label>
                <input
                  type="text"
                  placeholder={t('managerNamePlaceholder')}
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/10"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  {t('managerPhoneLabel')}
                </label>
                <input
                  type="tel"
                  placeholder="০১৭১১-০০০০০১"
                  value={managerPhone}
                  onChange={(e) => setManagerPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/10"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 min-h-[44px]"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{t('generating')}</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4" />
                      <span>{t('generateInviteBtn')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900 shadow-sm">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-xs font-bold">
                  {locale === 'bn' ? 'আমন্ত্রণ কোড সফলভাবে তৈরি হয়েছে!' : 'Invite generated successfully!'}
                </span>
              </div>

              {/* Unique Code Display */}
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl text-center">
                <span className="text-xs text-zinc-500 block mb-1">
                  {t('inviteCodeLabel')}
                </span>
                <span className="text-xl sm:text-2xl font-black font-mono tracking-widest text-emerald-800 dark:text-emerald-300 select-all">
                  {generatedInvite.code}
                </span>
              </div>

              {/* Shareable Link Box */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  {t('inviteLinkLabel')}
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={generatedInvite.link}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-3 py-2 text-xs font-semibold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors shrink-0 flex items-center gap-1 min-h-[36px]"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? t('copied') : t('copyLink')}</span>
                  </button>
                </div>
              </div>

              {/* Share Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <a
                  href={getWhatsAppShareUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2 px-3 bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors min-h-[40px]"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>{t('shareWhatsApp')}</span>
                </a>

                <a
                  href={`sms:?body=${encodeURIComponent(
                    locale === 'bn'
                      ? `${huzurName}-এর মাহফিল ক্যালেন্ডার সমন্বয়ের আমন্ত্রণ: ${generatedInvite.link}`
                      : `Invitation to manage schedule for ${huzurName}: ${generatedInvite.link}`
                  )}`}
                  className="py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors min-h-[40px]"
                >
                  <Share2 className="w-4 h-4" />
                  <span>{t('shareSms')}</span>
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
