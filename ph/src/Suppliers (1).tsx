// src/pages/pharmacy/Suppliers.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Truck, Search, MapPin, Phone, MessageCircle, ChevronLeft, Info } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { getSuppliers } from '../../services/dataStorage';
import { Supplier } from '../../types';
import { createWhatsAppLink, cleanPhone } from '../../utils/phone';
import { normalizeArabic } from '../../utils/arabicNormalize';
import { Modal } from '../../components/Modal';
import { EmptyState } from '../../components/EmptyState';
import { CardSkeleton } from '../../components/Loader';

export const PharmacySuppliers: React.FC = () => {
  const { user } = useAuthStore();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [term, setTerm] = useState('');
  const [selected, setSelected] = useState<Supplier | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const all = await getSuppliers();
        if (alive) setSuppliers(all);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const visible = useMemo(() => {
    const allowed = user?.allowedSuppliers || [];
    const q = normalizeArabic(term.trim());
    return suppliers
      .filter((s) => s.status === 'active')
      .filter((s) => allowed.length === 0 || allowed.includes(s.id))
      .filter((s) => !q || normalizeArabic(s.name).includes(q) || normalizeArabic(s.address || '').includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [suppliers, user, term]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 space-y-5" dir="rtl">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
          <Truck className="w-6 h-6 text-[#0f9d7a]" />
          <span>الموردون والمستودعات</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">اضغط على أي مورد لعرض بياناته والتواصل معه عبر واتساب.</p>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="ابحث باسم المورد أو العنوان..."
          className="w-full pr-10 pl-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0f9d7a]/30 focus:border-[#0f9d7a]"
        />
      </div>

      {loading ? (
        <CardSkeleton count={4} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<Truck className="w-8 h-8" />}
          title="لا يوجد موردون"
          description="لم يتم العثور على موردين مطابقين حالياً."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {visible.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelected(s)}
              className="text-right bg-white rounded-2xl border border-slate-200 p-4 hover:border-[#0f9d7a] hover:shadow-md active:scale-[0.99] transition flex items-center gap-3"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#0f9d7a] flex items-center justify-center font-black text-lg shrink-0">
                {s.name.trim().charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-extrabold text-slate-900 truncate">{s.name}</div>
                <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">{s.address || 'العنوان غير محدد'}</span>
                </div>
              </div>
              <ChevronLeft className="w-5 h-5 text-slate-300 shrink-0" />
            </button>
          ))}
        </div>
      )}

      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name || ''}
        maxWidth="md"
        footer={
          selected && cleanPhone(selected.whatsapp) ? (
            <a
              href={createWhatsAppLink(selected.whatsapp, `السلام عليكم، أود الاستفسار عن عروضكم.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-xl bg-[#25D366] text-white text-sm font-bold flex items-center gap-2 hover:opacity-90 transition"
            >
              <MessageCircle className="w-4 h-4" />
              <span>تواصل عبر واتساب</span>
            </a>
          ) : undefined
        }
      >
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-[#0f9d7a] shrink-0 mt-0.5" />
              <div>
                <div className="text-[11px] text-slate-500 font-bold">العنوان</div>
                <div className="text-slate-800">{selected.address || 'غير محدد'}</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-[#0f9d7a] shrink-0 mt-0.5" />
              <div>
                <div className="text-[11px] text-slate-500 font-bold">رقم واتساب</div>
                <div className="text-slate-800 font-bold" dir="ltr">
                  {cleanPhone(selected.whatsapp) ? '+' + cleanPhone(selected.whatsapp) : 'غير متوفر'}
                </div>
              </div>
            </div>
            {cleanPhone(selected.whatsapp) && (
              <div className="flex items-start gap-3">
                <MessageCircle className="w-5 h-5 text-[#25D366] shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-[11px] text-slate-500 font-bold">رابط واتساب</div>
                  <a
                    href={createWhatsAppLink(selected.whatsapp)}
                    target="_blank"
                    rel="noopener noreferrer"
                    dir="ltr"
                    className="text-blue-600 hover:underline break-all"
                  >
                    {createWhatsAppLink(selected.whatsapp)}
                  </a>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-[#0f9d7a] shrink-0 mt-0.5" />
              <div>
                <div className="text-[11px] text-slate-500 font-bold">نبذة عن المورد</div>
                <div className="text-slate-700 leading-relaxed whitespace-pre-line">
                  {selected.notes?.trim() || 'لا توجد نبذة مضافة لهذا المورد بعد.'}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
