// src/pages/admin/Admins.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, UserPlus, Trash2, Crown, Mail } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import {
  AdminEmailRecord,
  getAdminEmails,
  addAdminEmail,
  removeAdminEmail,
  normalizeEmail,
} from '../../services/dataStorage';
import { OWNER_EMAIL } from '../../config/brand';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Spinner } from '../../components/Loader';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const AdminAdmins: React.FC = () => {
  const { user } = useAuthStore();
  const { success, error } = useToastStore();
  const [list, setList] = useState<AdminEmailRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [toRemove, setToRemove] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setList(await getAdminEmails());
    } catch (e: any) {
      error('تعذر تحميل قائمة المدراء: ' + (e?.message || ''));
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async () => {
    const e = normalizeEmail(email);
    if (!EMAIL_RE.test(e)) {
      error('أدخل بريداً إلكترونياً صحيحاً.');
      return;
    }
    if (e === normalizeEmail(OWNER_EMAIL) || list.some((r) => r.email === e)) {
      error('هذا البريد مدير بالفعل.');
      return;
    }
    setSaving(true);
    try {
      await addAdminEmail(e, user?.email);
      setEmail('');
      success('تمت إضافة المدير. سيدخل للوحة الإدارة عند تسجيل دخوله بحساب Google بهذا البريد.');
      await load();
    } catch (err: any) {
      error('تعذر إضافة المدير: ' + (err?.message || ''));
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!toRemove) return;
    try {
      await removeAdminEmail(toRemove);
      success('تمت إزالة صلاحية المدير.');
      setToRemove(null);
      await load();
    } catch (err: any) {
      error('تعذر الإزالة: ' + (err?.message || ''));
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-[#0f9d7a]" />
          <span>إدارة المدراء</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          أي بريد تضيفه هنا يصبح مديراً عند تسجيل دخوله بحساب Google. الباقي يدخلون كمستخدمين عاديين.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-3">
        <label className="text-xs font-bold text-slate-700 block">بريد المدير الجديد (Gmail)</label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            dir="ltr"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            onKeyDown={(ev) => ev.key === 'Enter' && handleAdd()}
            placeholder="name@gmail.com"
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f9d7a]/30 focus:border-[#0f9d7a]"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-[#0f9d7a] text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 disabled:opacity-60 transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>{saving ? 'جاري الإضافة...' : 'إضافة مدير'}</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
        <div className="flex items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Crown className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-800 truncate" dir="ltr">{OWNER_EMAIL}</div>
              <div className="text-[11px] text-slate-500">المالك — دائم ولا يمكن إزالته</div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-6 flex justify-center"><Spinner text="جاري التحميل..." /></div>
        ) : list.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">لا يوجد مدراء إضافيون بعد.</div>
        ) : (
          list.map((r) => (
            <div key={r.email} className="flex items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#0f9d7a] flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-800 truncate" dir="ltr">{r.email}</div>
                  <div className="text-[11px] text-slate-500">
                    أضيف في {r.addedAt ? new Date(r.addedAt).toLocaleDateString('ar') : '-'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setToRemove(r.email)}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                title="إزالة"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        isOpen={!!toRemove}
        onClose={() => setToRemove(null)}
        onConfirm={handleRemove}
        title="إزالة مدير"
        message={`سيتحول ${toRemove || ''} إلى مستخدم عادي. هل أنت متأكد؟`}
        confirmText="نعم، إزالة"
        isDestructive
      />
    </div>
  );
};
