// src/pages/admin/Pharmacies.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
  getUsers, 
  getSuppliers, 
  updateUserStatusAndSuppliers, 
  updateUserSubscription,
  deleteUser,
  getSystemSettings,
  updateSystemSettings
} from '../../services/dataStorage';
import { UserProfile, Supplier } from '../../types';
import { useToastStore } from '../../store/useToastStore';
import { useAuthStore } from '../../store/useAuthStore';
import { 
  Building2, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  Settings2, 
  Search, 
  Mail, 
  Phone, 
  MapPin,
  Megaphone,
  BellRing,
  Sparkles,
  AlertTriangle,
  Calendar,
  UserCheck,
  UserX,
  Save,
  Sliders,
  Plus
} from 'lucide-react';
import { Table, Column } from '../../components/Table';
import { Modal } from '../../components/Modal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Spinner } from '../../components/Loader';
import { SendAnnouncementModal } from '../../components/SendAnnouncementModal';

export const Pharmacies: React.FC = () => {
  const { success, error } = useToastStore();
  const { defaultTrialDays, setDefaultTrialDays } = useAuthStore();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingUid, setActionLoadingUid] = useState<string | null>(null);

  // إعدادات أيام التجربة العامة
  const [editingDefaultTrialDays, setEditingDefaultTrialDays] = useState<number>(defaultTrialDays || 7);
  const [savingGlobalSettings, setSavingGlobalSettings] = useState(false);

  // Filters
  const [subscriptionFilter, setSubscriptionFilter] = useState<'all' | 'active' | 'trial' | 'expired'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Detailed Manage Modal
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [managedStatus, setManagedStatus] = useState<'pending' | 'active' | 'suspended'>('active');
  const [managedSubscriptionStatus, setManagedSubscriptionStatus] = useState<'trial' | 'active' | 'expired'>('active');
  const [managedTrialType, setManagedTrialType] = useState<'set_total' | 'add_days'>('set_total');
  const [managedDays, setManagedDays] = useState<number>(30);
  const [managedAllowedSuppliers, setManagedAllowedSuppliers] = useState<string[]>([]);
  const [adminCustomNote, setAdminCustomNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // نافذة مخصصة وسريعة لتحديد أو تمديد أيام التجربة لصيدلية محددة
  const [isTrialModalOpen, setIsTrialModalOpen] = useState(false);
  const [trialTargetUser, setTrialTargetUser] = useState<UserProfile | null>(null);
  const [trialMode, setTrialMode] = useState<'set_total' | 'add_days'>('set_total');
  const [trialDaysInput, setTrialDaysInput] = useState<number>(7);
  const [trialCustomNote, setTrialCustomNote] = useState('');

  // Announcement Modal
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [announcementRecipientId, setAnnouncementRecipientId] = useState('all');

  // Delete Confirm Dialog
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [targetDeleteUid, setTargetDeleteUid] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [u, s, settings] = await Promise.all([
        getUsers(), 
        getSuppliers(),
        getSystemSettings()
      ]);
      setUsers(u.filter((user) => user.role === 'pharmacy'));
      setSuppliers(s);
      if (settings?.defaultTrialDays) {
        setEditingDefaultTrialDays(settings.defaultTrialDays);
        setDefaultTrialDays(settings.defaultTrialDays);
      }
    } catch (e: any) {
      console.error(e);
      error('تعذر تحميل بيانات المشتركين والإعدادات: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // حفظ أيام التجربة الافتراضية العامة
  const handleSaveDefaultTrialDays = async () => {
    if (!editingDefaultTrialDays || editingDefaultTrialDays < 1 || editingDefaultTrialDays > 365) {
      error('يرجى تحديد عدد أيام تجربة صالح بين 1 و 365 يوماً.');
      return;
    }
    setSavingGlobalSettings(true);
    try {
      await updateSystemSettings({ defaultTrialDays: editingDefaultTrialDays });
      setDefaultTrialDays(editingDefaultTrialDays);
      success(`تم تحديث أيام التجربة الافتراضية بنجاح إلى (${editingDefaultTrialDays}) يوماً.`);
    } catch (e: any) {
      error('تعذر حفظ إعدادات التجربة: ' + e.message);
    } finally {
      setSavingGlobalSettings(false);
    }
  };

  // إحصائيات سريعة للمشتركين
  const stats = useMemo(() => {
    const total = users.length;
    const now = Date.now();
    let active = 0;
    let trial = 0;
    let expired = 0;

    users.forEach((u) => {
      const expMillis = u.subscriptionExpiresAtMillis || (u.subscriptionExpiresAt ? new Date(u.subscriptionExpiresAt).getTime() : 0);
      const isPast = expMillis > 0 && now > expMillis;

      if (u.subscriptionStatus === 'expired' || isPast || u.status === 'suspended') {
        expired++;
      } else if (u.subscriptionStatus === 'trial') {
        trial++;
      } else {
        active++;
      }
    });

    return { total, active, trial, expired };
  }, [users]);

  // فلترة الصيدليات حسب البحث ونوع الاشتراك
  const filteredUsers = useMemo(() => {
    const now = Date.now();
    return users.filter((u) => {
      const expMillis = u.subscriptionExpiresAtMillis || (u.subscriptionExpiresAt ? new Date(u.subscriptionExpiresAt).getTime() : 0);
      const isExpiredState = u.subscriptionStatus === 'expired' || (expMillis > 0 && now > expMillis);

      if (subscriptionFilter === 'active') {
        if (isExpiredState || u.subscriptionStatus === 'trial') return false;
      } else if (subscriptionFilter === 'trial') {
        if (isExpiredState || u.subscriptionStatus !== 'trial') return false;
      } else if (subscriptionFilter === 'expired') {
        if (!isExpiredState) return false;
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = u.name?.toLowerCase().includes(q);
        const matchesPharma = u.pharmacyName?.toLowerCase().includes(q);
        const matchesEmail = u.email?.toLowerCase().includes(q);
        const matchesPhone = u.phone?.includes(q);
        if (!matchesName && !matchesPharma && !matchesEmail && !matchesPhone) {
          return false;
        }
      }
      return true;
    });
  }, [users, subscriptionFilter, searchTerm]);

  // تفعيل شهر كامل بزر واحد
  const handleQuickActivateMonth = async (user: UserProfile) => {
    setActionLoadingUid(user.uid);
    try {
      await updateUserSubscription(user.uid, {
        subscriptionStatus: 'active',
        daysToAdd: 30,
        customNote: 'تم تفعيل / تمديد اشتراك صيدليتكم لمدة 30 يوماً من قبل الإدارة.'
      });
      success(`تم تفعيل/تمديد اشتراك (${user.pharmacyName || user.name}) لمدة 30 يوماً بنجاح.`);
      await loadData();
    } catch (err: any) {
      error('تعذر التفعيل: ' + err.message);
    } finally {
      setActionLoadingUid(null);
    }
  };

  // فتح نافذة تخصيص أيام التجربة لصيدلية محددة
  const handleOpenTrialModal = (user: UserProfile) => {
    setTrialTargetUser(user);
    setTrialMode('set_total');
    setTrialDaysInput(user.trialDays || editingDefaultTrialDays || 7);
    setTrialCustomNote('');
    setIsTrialModalOpen(true);
  };

  // حفظ أيام التجربة المخصصة للصيدلية
  const handleSaveCustomTrial = async () => {
    if (!trialTargetUser) return;
    if (!trialDaysInput || trialDaysInput < 1 || trialDaysInput > 365) {
      error('يرجى إدخال عدد أيام صالح بين 1 و 365 يوماً.');
      return;
    }
    setActionLoadingUid(trialTargetUser.uid);
    try {
      if (trialMode === 'set_total') {
        await updateUserSubscription(trialTargetUser.uid, {
          subscriptionStatus: 'trial',
          trialDays: trialDaysInput,
          customNote: trialCustomNote || `تم تحديد مدة فترتكم التجريبية إلى ${trialDaysInput} يوماً من قبل الإدارة.`
        });
        success(`تم تحديد فترة التجربة لـ (${trialTargetUser.pharmacyName || trialTargetUser.name}) إلى ${trialDaysInput} يوماً.`);
      } else {
        await updateUserSubscription(trialTargetUser.uid, {
          subscriptionStatus: 'trial',
          daysToAdd: trialDaysInput,
          customNote: trialCustomNote || `تم تمديد فترتكم التجريبية بمقدار ${trialDaysInput} يوماً إضافية.`
        });
        success(`تمت إضافة ${trialDaysInput} يوماً للتجربة لـ (${trialTargetUser.pharmacyName || trialTargetUser.name}).`);
      }
      setIsTrialModalOpen(false);
      await loadData();
    } catch (err: any) {
      error('تعذر تحديث أيام التجربة: ' + err.message);
    } finally {
      setActionLoadingUid(null);
    }
  };

  // إيقاف الاشتراك بزر واحد
  const handleQuickStopSubscription = async (user: UserProfile) => {
    setActionLoadingUid(user.uid);
    try {
      await updateUserSubscription(user.uid, {
        subscriptionStatus: 'expired',
        customNote: 'تم إيقاف اشتراك الصيدلية من قبل الإدارة.'
      });
      success(`تم إيقاف اشتراك (${user.pharmacyName || user.name}).`);
      await loadData();
    } catch (err: any) {
      error('تعذر الإيقاف: ' + err.message);
    } finally {
      setActionLoadingUid(null);
    }
  };

  // فتح نافذة التخصيص الكامل
  const handleOpenManage = (u: UserProfile) => {
    setSelectedUser(u);
    setManagedStatus(u.status);
    setManagedSubscriptionStatus(u.subscriptionStatus || 'trial');
    setManagedTrialType('set_total');
    setManagedDays(u.subscriptionStatus === 'trial' ? (u.trialDays || editingDefaultTrialDays || 7) : 30);
    setManagedAllowedSuppliers(u.allowedSuppliers || []);
    setAdminCustomNote('');
    setIsManageModalOpen(true);
  };

  const handleSaveManage = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      // تحديث الحالة والموردين
      await updateUserStatusAndSuppliers(
        selectedUser.uid,
        managedStatus,
        managedAllowedSuppliers,
        adminCustomNote
      );

      // تحديث الاشتراك بناءً على نوع الاشتراك وأيام التجربة المحددة
      if (managedSubscriptionStatus === 'trial') {
        if (managedTrialType === 'set_total') {
          await updateUserSubscription(selectedUser.uid, {
            subscriptionStatus: 'trial',
            trialDays: managedDays,
            customNote: adminCustomNote || `تم تحديد مدة التجربة إلى ${managedDays} يوماً.`
          });
        } else {
          await updateUserSubscription(selectedUser.uid, {
            subscriptionStatus: 'trial',
            daysToAdd: managedDays,
            customNote: adminCustomNote || `تم تمديد التجربة بمقدار ${managedDays} يوماً.`
          });
        }
      } else {
        await updateUserSubscription(selectedUser.uid, {
          subscriptionStatus: managedSubscriptionStatus,
          daysToAdd: managedDays > 0 ? managedDays : undefined,
          customNote: adminCustomNote
        });
      }

      success(`تم حفظ إعدادات صيدلية (${selectedUser.pharmacyName || selectedUser.name}) بنجاح.`);
      setIsManageModalOpen(false);
      await loadData();
    } catch (err: any) {
      error('حدث خطأ أثناء التحديث: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = (uid: string) => {
    setTargetDeleteUid(uid);
    setIsConfirmOpen(true);
  };

  const executeDelete = async () => {
    if (!targetDeleteUid) return;
    try {
      await deleteUser(targetDeleteUid);
      success('تم حذف حساب الصيدلية بنجاح.');
      setIsConfirmOpen(false);
      await loadData();
    } catch (err: any) {
      error('تعذر الحذف: ' + err.message);
    }
  };

  const toggleAllowedSupplier = (supplierId: string) => {
    if (managedAllowedSuppliers.includes(supplierId)) {
      setManagedAllowedSuppliers(managedAllowedSuppliers.filter((id) => id !== supplierId));
    } else {
      setManagedAllowedSuppliers([...managedAllowedSuppliers, supplierId]);
    }
  };

  // أعمدة جدول الصيدليات
  const columns: Column<UserProfile>[] = [
    {
      key: 'pharmacyName',
      header: 'الصيدلية والمسؤول',
      render: (item) => (
        <div className="space-y-1">
          <div className="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-[#0f9d7a]" />
            <span>{item.pharmacyName || 'لم يُحدد اسم الصيدلية'}</span>
          </div>
          <div className="text-slate-500 text-xs font-semibold">{item.name}</div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <Mail className="w-3 h-3" />
            <span dir="ltr">{item.email}</span>
          </div>
          {item.phone && (
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <Phone className="w-3 h-3" />
              <span dir="ltr">{item.phone}</span>
            </div>
          )}
          {item.address && (
            <div className="text-[10px] text-slate-400 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-slate-300" />
              <span>{item.address}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'subscriptionStatus',
      header: 'حالة الاشتراك ومدة التجربة',
      render: (item) => {
        const now = Date.now();
        const expMillis = item.subscriptionExpiresAtMillis || (item.subscriptionExpiresAt ? new Date(item.subscriptionExpiresAt).getTime() : 0);
        const isPast = expMillis > 0 && now > expMillis;
        const diffDays = expMillis > now ? Math.ceil((expMillis - now) / (1000 * 60 * 60 * 24)) : 0;

        if (item.subscriptionStatus === 'expired' || isPast) {
          return (
            <div className="space-y-1">
              <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold rounded-lg inline-flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>اشتراك منتهي</span>
              </span>
              <div className="text-[10px] text-slate-400">
                {item.subscriptionExpiresAt ? `انتهى في: ${new Date(item.subscriptionExpiresAt).toLocaleDateString('ar-SA')}` : 'غير مفعّل'}
              </div>
            </div>
          );
        }

        if (item.subscriptionStatus === 'trial') {
          return (
            <div className="space-y-1">
              <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold rounded-lg inline-flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                <span>فترة تجريبية ({item.trialDays || 7} أيام)</span>
              </span>
              <div className="text-[11px] font-bold text-slate-600">
                المتبقي: <strong className="text-blue-700">{diffDays > 0 ? `${diffDays} يوماً` : 'اليوم الأخير'}</strong>
              </div>
              <div className="text-[10px] text-slate-400">
                ينتهي في: {item.subscriptionExpiresAt ? new Date(item.subscriptionExpiresAt).toLocaleDateString('ar-SA') : '—'}
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-1">
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-lg inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>مشترك نشط</span>
            </span>
            <div className="text-[11px] text-slate-500">
              ينتهي في: <strong className="text-slate-700">{item.subscriptionExpiresAt ? new Date(item.subscriptionExpiresAt).toLocaleDateString('ar-SA') : 'مفتوح'}</strong>
              {diffDays > 0 && <span className="text-[10px] text-emerald-600 font-bold mr-1">({diffDays} يوم)</span>}
            </div>
          </div>
        );
      },
    },
    {
      key: 'allowedSuppliers',
      header: 'المستودعات المصرحة',
      render: (item) => {
        const count = item.allowedSuppliers?.length || 0;
        return (
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
            {count === 0 ? 'كافة المستودعات (عام)' : `${count} مستودع فقط`}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'تحكم مباشر بالاشتراك والتجربة',
      render: (item) => {
        const isLoadingThis = actionLoadingUid === item.uid;

        return (
          <div className="flex flex-wrap items-center gap-1.5">
            {/* زر تفعيل شهر */}
            <button
              onClick={() => handleQuickActivateMonth(item)}
              disabled={isLoadingThis}
              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition flex items-center gap-1 active:scale-95 disabled:opacity-50"
              title="تفعيل أو تمديد الاشتراك لشهر كامل (30 يوماً)"
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>+ شهر (30 يوم)</span>
            </button>

            {/* زر تحديد / تمديد أيام التجربة بمقدار مخصص */}
            <button
              onClick={() => handleOpenTrialModal(item)}
              disabled={isLoadingThis}
              className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 rounded-lg text-xs font-bold transition flex items-center gap-1 active:scale-95 disabled:opacity-50"
              title="تحديد أو تمديد أيام التجربة لهذه الصيدلية"
            >
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>تحديد أيام التجربة</span>
            </button>

            {/* زر إيقاف الاشتراك */}
            <button
              onClick={() => handleQuickStopSubscription(item)}
              disabled={isLoadingThis}
              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-xs font-bold transition flex items-center gap-1 active:scale-95 disabled:opacity-50"
              title="إيقاف الاشتراك فوراً وتحويله لمنتهي"
            >
              <UserX className="w-3.5 h-3.5 text-rose-600" />
              <span>إيقاف</span>
            </button>

            {/* زر تخصيص كامل */}
            <button
              onClick={() => handleOpenManage(item)}
              className="p-1.5 text-slate-600 hover:text-[#0f9d7a] hover:bg-slate-100 rounded-lg transition"
              title="تخصيص كامل والمستودعات المسموحة"
            >
              <Settings2 className="w-4 h-4" />
            </button>

            {/* زر إرسال تنبيه */}
            <button
              onClick={() => {
                setAnnouncementRecipientId(item.uid);
                setIsAnnouncementModalOpen(true);
              }}
              className="p-1.5 text-slate-600 hover:text-[#0f9d7a] hover:bg-slate-100 rounded-lg transition"
              title="إرسال تنبيه مباشر"
            >
              <BellRing className="w-4 h-4 text-[#0f9d7a]" />
            </button>

            {/* زر الحذف */}
            <button
              onClick={() => confirmDelete(item.uid)}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
              title="حذف الحساب"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* رأس الصفحة مع عنوان الشاشة وزر التعميم */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>إدارة الصيدليات والاشتراكات</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            التحكم بفترة التجربة، تفعيل الاشتراكات، تحديد المستودعات، وإدارة الصلاحيات
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setAnnouncementRecipientId('all');
            setIsAnnouncementModalOpen(true);
          }}
          className="px-4 py-2.5 bg-[#0f9d7a] hover:bg-[#0b7a5e] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-2 shrink-0 self-start sm:self-auto"
        >
          <Megaphone className="w-4 h-4" />
          <span>إرسال تعميم للصيدليات</span>
        </button>
      </div>

      {/* بطاقة التحكم بأيام الفترة التجريبية العامة للمسجلين الجدد */}
      <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-white p-5 rounded-3xl border border-blue-200/90 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-black text-slate-900 text-sm sm:text-base">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <Clock className="w-4 h-4" />
              </div>
              <span>تحديد أيام الفترة التجريبية الافتراضية (للمسجلين الجدد)</span>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">
                الحالي: {defaultTrialDays || 7} أيام
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
              حدد عدد الأيام التي سيحصل عليها كل صيدلي تلقائياً عند تسجيل الدخول لأول مرة بحساب Google.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* اختيارات سريعة للأيام */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
              {[3, 7, 14, 21, 30, 60].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setEditingDefaultTrialDays(days)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                    editingDefaultTrialDays === days
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {days} يوم
                </button>
              ))}
            </div>

            {/* إدخال رقمي يدوي */}
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="1"
                max="365"
                value={editingDefaultTrialDays}
                onChange={(e) => setEditingDefaultTrialDays(Math.max(1, Number(e.target.value)))}
                className="w-20 px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-black text-center focus:outline-hidden focus:border-blue-500"
              />
              <span className="text-xs font-bold text-slate-600">يوماً</span>
            </div>

            {/* زر الحفظ */}
            <button
              type="button"
              onClick={handleSaveDefaultTrialDays}
              disabled={savingGlobalSettings || editingDefaultTrialDays === defaultTrialDays}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingGlobalSettings ? 'جاري الحفظ...' : 'حفظ أيام التجربة'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* بطاقات المؤشرات السريعة */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-400">إجمالي المشتركين</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{stats.total}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-emerald-600">اشتراكات نشطة</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{stats.active}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-blue-600">في الفترة التجريبية</div>
          <div className="text-2xl font-black text-blue-700 mt-1">{stats.trial}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-rose-500">اشتراكات منتهية</div>
          <div className="text-2xl font-black text-rose-700 mt-1">{stats.expired}</div>
        </div>
      </div>

      {/* شريط البحث وفلترة نوع الاشتراك */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث بالصيدلية أو المسؤول أو البريد..."
            className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#0f9d7a]"
          />
        </div>

        {/* أزرار الفلترة السريعة */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSubscriptionFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              subscriptionFilter === 'all'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            الكل ({stats.total})
          </button>
          <button
            onClick={() => setSubscriptionFilter('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              subscriptionFilter === 'active'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            النشطون ({stats.active})
          </button>
          <button
            onClick={() => setSubscriptionFilter('trial')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              subscriptionFilter === 'trial'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
            }`}
          >
            التجريبي ({stats.trial})
          </button>
          <button
            onClick={() => setSubscriptionFilter('expired')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              subscriptionFilter === 'expired'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
            }`}
          >
            المنتهية ({stats.expired})
          </button>
        </div>
      </div>

      {/* جدول المشتركين */}
      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 flex justify-center">
          <Spinner text="جاري تحميل قائمة المشتركين..." />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-xs text-slate-500 font-semibold">
          لا يوجد مشتركون مطابقون لشروط البحث والفلترة
        </div>
      ) : (
        <Table
          columns={columns}
          data={filteredUsers}
          keyExtractor={(item) => item.uid}
        />
      )}

      {/* نافذة سريعة لتحديد أو تمديد أيام التجربة لصيدلية محددة */}
      <Modal
        isOpen={isTrialModalOpen}
        onClose={() => setIsTrialModalOpen(false)}
        title={`تحديد أيام التجربة - ${trialTargetUser?.pharmacyName || trialTargetUser?.name}`}
        maxWidth="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsTrialModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSaveCustomTrial}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
            >
              تأكيد وتطبيق مدة التجربة
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 leading-relaxed flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span>يمكنك تحديد إجمالي أيام التجربة بالكامل ابتداءً من الآن أو إضافة أيام إلى رصيد التجربة الحالي.</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">طريقة احتساب الأيام</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTrialMode('set_total')}
                className={`p-3 rounded-xl border text-xs font-bold transition text-right ${
                  trialMode === 'set_total'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="font-extrabold mb-0.5">تحديد إجمالي المدة</div>
                <div className="text-[10px] text-slate-500 font-normal">تبدأ من الآن وتستمر لعدد الأيام المحدد</div>
              </button>
              <button
                type="button"
                onClick={() => setTrialMode('add_days')}
                className={`p-3 rounded-xl border text-xs font-bold transition text-right ${
                  trialMode === 'add_days'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="font-extrabold mb-0.5">إضافة أيام إضافية</div>
                <div className="text-[10px] text-slate-500 font-normal">تضاف فوق مدة التجربة المتبقية حالياً</div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {trialMode === 'set_total' ? 'إجمالي عدد أيام التجربة المطلوبة' : 'عدد الأيام المُراد إضافتها'}
            </label>
            
            {/* خيارات شائعة */}
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {[3, 7, 10, 14, 21, 30, 45, 60].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setTrialDaysInput(d)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg border transition ${
                    trialDaysInput === d
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {d} يوماً
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="365"
                value={trialDaysInput}
                onChange={(e) => setTrialDaysInput(Math.max(1, Number(e.target.value)))}
                className="w-32 px-3 py-2 text-xs rounded-xl border border-slate-300 font-bold"
              />
              <span className="text-xs text-slate-500 font-semibold">يوماً</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              ملاحظة الإدارة (تصل للصيدلية في إشعار مباشر - اختياري)
            </label>
            <input
              type="text"
              value={trialCustomNote}
              onChange={(e) => setTrialCustomNote(e.target.value)}
              placeholder="مثال: تم تمديد فترتكم التجريبية بناءً على طلبكم الخاص..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
            />
          </div>
        </div>
      </Modal>

      {/* نافذة التخصيص الكامل للمشترك */}
      <Modal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        title={`تخصيص اشتراك (${selectedUser?.pharmacyName || selectedUser?.name})`}
        maxWidth="lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsManageModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSaveManage}
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold text-white bg-[#0f9d7a] hover:bg-[#0b7a5e] rounded-xl shadow-xs"
            >
              {submitting ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          {/* خيارات نوع الاشتراك */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">نوع الاشتراك</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setManagedSubscriptionStatus('active')}
                className={`p-3 rounded-xl border text-center text-xs font-bold transition ${
                  managedSubscriptionStatus === 'active'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                مشترك نشط
              </button>
              <button
                type="button"
                onClick={() => setManagedSubscriptionStatus('trial')}
                className={`p-3 rounded-xl border text-center text-xs font-bold transition ${
                  managedSubscriptionStatus === 'trial'
                    ? 'border-blue-500 bg-blue-50 text-blue-800 ring-2 ring-blue-500/20'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                فترة تجريبية
              </button>
              <button
                type="button"
                onClick={() => setManagedSubscriptionStatus('expired')}
                className={`p-3 rounded-xl border text-center text-xs font-bold transition ${
                  managedSubscriptionStatus === 'expired'
                    ? 'border-rose-500 bg-rose-50 text-rose-800 ring-2 ring-rose-500/20'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                منتهي الصلاحية
              </button>
            </div>
          </div>

          {/* تحديد أيام الفترة التجريبية */}
          {managedSubscriptionStatus === 'trial' ? (
            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>تحديد أيام الفترة التجريبية للصيدلية:</span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setManagedTrialType('set_total')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                    managedTrialType === 'set_total'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  تحديد إجمالي الأيام من اليوم
                </button>
                <button
                  type="button"
                  onClick={() => setManagedTrialType('add_days')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                    managedTrialType === 'add_days'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  إضافة أيام فوق الرصيد الحالي
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[3, 7, 14, 21, 30, 60].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setManagedDays(d)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg border transition ${
                      managedDays === d
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    {d} يوم
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={managedDays}
                  onChange={(e) => setManagedDays(Math.max(1, Number(e.target.value)))}
                  className="w-32 px-3 py-2 text-xs rounded-xl border border-slate-300 font-bold bg-white"
                />
                <span className="text-xs text-slate-600">يوماً تجربة</span>
              </div>
            </div>
          ) : managedSubscriptionStatus === 'active' ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                إضافة أيام إلى مدة الاشتراك الحالي
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={managedDays}
                  onChange={(e) => setManagedDays(Math.max(1, Number(e.target.value)))}
                  className="w-32 px-3 py-2 text-xs rounded-xl border border-slate-300 font-bold"
                />
                <span className="text-xs text-slate-500">يوماً (مثلاً 30 لشهر، 90 لـ 3 أشهر، 365 لسنة)</span>
              </div>
            </div>
          ) : null}

          {/* المستودعات المتاحة */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              المستودعات المصرح للصيدلية بمقارنة أسعارها
            </label>
            <p className="text-[11px] text-slate-400 mb-2">
              (إذا لم يتم تحديد أي مستودع، سيتم السماح للصيدلية بالوصول لكافة المستودعات افتراضياً)
            </p>
            <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-3 bg-slate-50/50">
              {suppliers.map((sup) => {
                const isChecked = managedAllowedSuppliers.includes(sup.id);
                return (
                  <label
                    key={sup.id}
                    className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-slate-100/60 p-1.5 rounded-lg transition"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleAllowedSupplier(sup.id)}
                      className="rounded text-[#0f9d7a] focus:ring-[#0f9d7a]"
                    />
                    <span className="font-semibold">{sup.name}</span>
                    <span className="text-[10px] text-slate-400">({sup.address})</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* ملاحظة الإدارة */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              ملاحظة الإدارة (تصل للصيدلية في إشعار فوري)
            </label>
            <textarea
              rows={2}
              value={adminCustomNote}
              onChange={(e) => setAdminCustomNote(e.target.value)}
              placeholder="مثال: تم تفعيل/تعديل مدة التجربة بنجاح..."
              className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#0f9d7a]"
            />
          </div>
        </div>
      </Modal>

      {/* نافذة التعميم */}
      <SendAnnouncementModal
        isOpen={isAnnouncementModalOpen}
        onClose={() => setIsAnnouncementModalOpen(false)}
        defaultRecipientId={announcementRecipientId}
      />

      {/* حوار تأكيد الحذف */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={executeDelete}
        title="تأكيد حذف حساب الصيدلية"
        message="هل أنت متأكد من رغبتك في حذف هذا الحساب؟ سيتم إلغاء وصول الصيدلية للنظام بالكامل."
        isDestructive={true}
      />
    </div>
  );
};
