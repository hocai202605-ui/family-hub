"use client";

import React, { useState, useEffect, useId, useRef, useMemo, ChangeEvent, DragEvent, FormEvent } from "react";

// ============================================================================
// 1. DATA STRUCTURE / TYPES (Tương thích với Supabase Database & Prisma)
// ============================================================================
export interface Goal {
  id: string; // uuid
  title: string;
  description?: string;
  category: string;
  timeline_type: string;
  target_year: number;
  target_amount: number;
  current_amount: number;
  images: string[]; // 1 đến 5 ảnh từ Supabase Storage / Uploads
  created_at?: string;
  sort_order?: number;
}

export interface CustomStatsOverride {
  isCustom: boolean;
  totalTarget: number;
  totalCurrent: number;
}

// Danh mục và Kỳ hạn mặc định
export const DEFAULT_CATEGORIES: string[] = [
  "Phát triển bản thân",
  "An cư",
  "Phương tiện",
  "Giáo dục",
  "Tài sản",
  "Khác",
];

export const DEFAULT_TIMELINES: string[] = [
  "Ngắn hạn",
  "Trung hạn",
  "Dài hạn",
];

// ============================================================================
// 2. MOCK DATA DỰ PHÒNG (Dùng khi DB chưa có dữ liệu hoặc offline)
// ============================================================================
export const INITIAL_MOCK_GOALS: Goal[] = [
  {
    id: "a1b2c3d4-0001-4000-8000-000000000001",
    title: "Thi chứng chỉ AWS SAA",
    description: "Hoàn thành chứng chỉ AWS Solutions Architect Associate để nâng chuẩn kiến thức Cloud và thăng tiến công việc.",
    category: "Phát triển bản thân",
    timeline_type: "Ngắn hạn",
    target_year: 2028,
    target_amount: 8000000,
    current_amount: 4500000,
    images: [
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80",
    ],
  },
  {
    id: "a1b2c3d4-0002-4000-8000-000000000002",
    title: "Cho bé Bông đi học mầm non",
    description: "Chuẩn bị học phí và quỹ đầu vào trường mầm non song ngữ chất lượng cao Montessori cho bé vào tháng 8/2028.",
    category: "Giáo dục",
    timeline_type: "Ngắn hạn",
    target_year: 2028,
    target_amount: 90000000,
    current_amount: 38000000,
    images: [
      "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=800&auto=format&fit=crop&q=80",
    ],
  },
  {
    id: "a1b2c3d4-0003-4000-8000-000000000003",
    title: "Mua nhà chung cư (Hà Nội)",
    description: "Sở hữu căn hộ 3 phòng ngủ tiện nghi tại khu đô thị xanh phía Tây Hà Nội làm tổ ấm an cư cho cả nhà.",
    category: "An cư",
    timeline_type: "Trung hạn",
    target_year: 2030,
    target_amount: 3800000000,
    current_amount: 1450000000,
    images: [
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&auto=format&fit=crop&q=80",
    ],
  },
  {
    id: "a1b2c3d4-0004-4000-8000-000000000004",
    title: "Mua xe ô tô gia đình",
    description: "Tậu xe SUV 7 chỗ gầm cao phục vụ những chuyến về thăm quê và đưa đại gia đình đi cắm trại, du lịch cuối tuần.",
    category: "Phương tiện",
    timeline_type: "Dài hạn",
    target_year: 2032,
    target_amount: 950000000,
    current_amount: 220000000,
    images: [
      "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&auto=format&fit=crop&q=80",
    ],
  },
];

// ============================================================================
// 3. TIỆN ÍCH ĐỊNH DẠNG & MÀU SẮC BADGE (HỖ TRỢ DANH MỤC ĐỘNG)
// ============================================================================
export function formatVND(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumberWithDots(val: string): string {
  const digits = val.replace(/\D/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("vi-VN").format(Number(digits));
}

export function parseNumberFromDots(val: string): number {
  const digits = val.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

const STATIC_CATEGORY_COLORS: Record<
  string,
  { bg: string; text: string; border: string; dot: string }
> = {
  "Phát triển bản thân": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", dot: "bg-blue-500" },
  "An cư": { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
  "Phương tiện": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500" },
  "Giáo dục": { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", dot: "bg-purple-500" },
  "Tài sản": { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", dot: "bg-rose-500" },
  "Khác": { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200", dot: "bg-slate-400" },
};

const DYNAMIC_PALETTES = [
  { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", dot: "bg-blue-500" },
  { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
  { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500" },
  { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", dot: "bg-purple-500" },
  { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", dot: "bg-rose-500" },
  { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200", dot: "bg-cyan-500" },
  { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200", dot: "bg-teal-500" },
  { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", dot: "bg-indigo-500" },
];

export function getCategoryTheme(category: string) {
  if (STATIC_CATEGORY_COLORS[category]) {
    return STATIC_CATEGORY_COLORS[category];
  }
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % DYNAMIC_PALETTES.length;
  return DYNAMIC_PALETTES[index];
}

const STATIC_TIMELINE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Ngắn hạn": { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
  "Trung hạn": { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200" },
  "Dài hạn": { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
};

export function getTimelineTheme(timeline: string) {
  if (STATIC_TIMELINE_COLORS[timeline]) {
    return STATIC_TIMELINE_COLORS[timeline];
  }
  return { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" };
}

// ============================================================================
// 4. SUB-COMPONENT: IMAGE CAROUSEL
// ============================================================================
export function GoalImageCarousel({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const validImages = images.length > 0 ? images : ["https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&auto=format&fit=crop&q=80"];
  const total = validImages.length;

  const nextSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % total);
  };

  const prevSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  };

  const goToSlide = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setCurrentIndex(index);
  };

  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-900 group select-none">
      <div
        className="flex h-full w-full transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {validImages.map((imgUrl, idx) => (
          <div key={idx} className="relative h-full w-full flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgUrl}
              alt={`${title} - ảnh ${idx + 1}`}
              className="h-full w-full object-cover object-center"
              loading="lazy"
            />
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/60 to-transparent" />

      {total > 1 && (
        <div className="absolute top-3 right-3 z-10 rounded-full bg-slate-900/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-md">
          {currentIndex + 1} / {total}
        </div>
      )}

      {total > 1 && (
        <>
          <button
            type="button"
            onClick={prevSlide}
            aria-label="Ảnh trước"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-slate-800 opacity-0 shadow-md backdrop-blur-sm transition-all duration-200 hover:bg-white hover:scale-105 group-hover:opacity-100"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={nextSlide}
            aria-label="Ảnh sau"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-slate-800 opacity-0 shadow-md backdrop-blur-sm transition-all duration-200 hover:bg-white hover:scale-105 group-hover:opacity-100"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div className="absolute bottom-2.5 inset-x-0 z-10 flex items-center justify-center gap-1.5">
            {validImages.map((_, dotIdx) => (
              <button
                key={dotIdx}
                type="button"
                onClick={(e) => goToSlide(e, dotIdx)}
                aria-label={`Chuyển đến ảnh ${dotIdx + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  currentIndex === dotIdx
                    ? "w-5 bg-white shadow-sm"
                    : "w-1.5 bg-white/50 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// 5. SUB-COMPONENT: GOAL CARD (TIÊU ĐỀ VÀ DANH MỤC NẰM CẠNH NHAU)
// ============================================================================
export function GoalCard({
  goal,
  onEdit,
  onDelete,
}: {
  goal: Goal;
  onEdit?: (goal: Goal) => void;
  onDelete?: (id: string) => void;
}) {
  const percent =
    goal.target_amount > 0
      ? Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 1000) / 10)
      : 0;

  const remaining = Math.max(0, goal.target_amount - goal.current_amount);
  const categoryTheme = getCategoryTheme(goal.category);
  const timelineTheme = getTimelineTheme(goal.timeline_type);

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200">
      <div className="relative w-full">
        <GoalImageCarousel images={goal.images} title={goal.title} />

        {/* Thanh công cụ thao tác nhanh: Sửa & Xóa */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(goal)}
              title="Chỉnh sửa mục tiêu"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/60 text-white shadow-sm backdrop-blur-md transition-all hover:bg-emerald-600 hover:scale-105"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}

          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(goal.id)}
              title="Xóa mục tiêu"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/60 text-white shadow-sm backdrop-blur-md transition-all hover:bg-rose-600 hover:scale-105"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        {/* YÊU CẦU 1: TÊN MỤC TIÊU VÀ DANH MỤC CHO LÊN CẠNH NHAU */}
        <div className="flex items-start justify-between gap-2.5">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-2 leading-snug">
            {goal.title}
          </h3>
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${categoryTheme.bg} ${categoryTheme.text} ${categoryTheme.border}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${categoryTheme.dot}`} />
            {goal.category}
          </span>
        </div>

        {/* Hàng Kỳ hạn & Năm hoàn thành */}
        <div className="mt-2 flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border ${timelineTheme.bg} ${timelineTheme.text} ${timelineTheme.border}`}
          >
            <svg className="h-3 w-3 text-current opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {goal.timeline_type} • {goal.target_year}
          </span>
        </div>

        {/* Mô tả ngắn */}
        {goal.description ? (
          <p className="mt-2 text-xs leading-5 text-slate-500 line-clamp-2">
            {goal.description}
          </p>
        ) : (
          <p className="mt-2 text-xs italic text-slate-400">Chưa có ghi chú chi tiết.</p>
        )}

        <div className="mt-auto pt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">Tiến độ tích lũy</span>
            <span className="font-bold text-emerald-600">{percent}%</span>
          </div>

          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                percent >= 100
                  ? "bg-emerald-500"
                  : percent >= 50
                  ? "bg-teal-500"
                  : "bg-emerald-600"
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-50/80 p-3 text-xs">
            <div>
              <p className="text-slate-400 font-medium">Đã có</p>
              <p className="mt-0.5 font-bold text-slate-900">
                {formatVND(goal.current_amount)}
              </p>
            </div>
            <div>
              <p className="text-slate-400 font-medium">Tổng mục tiêu</p>
              <p className="mt-0.5 font-bold text-slate-900">
                {formatVND(goal.target_amount)}
              </p>
            </div>
            <div className="col-span-2 pt-2 border-t border-slate-200/60 flex items-center justify-between">
              <span className="text-slate-500 font-medium">Còn thiếu:</span>
              <span className="font-bold text-rose-600">
                {remaining === 0 ? "Đã đạt mục tiêu 🎉" : formatVND(remaining)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

// ============================================================================
// 6. MODAL QUẢN LÝ DANH MỤC & KỲ HẠN (THÊM / SỬA / XÓA)
// ============================================================================
interface ManageTaxonomyModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  timelines: string[];
  onUpdateCategories: (newCats: string[]) => void;
  onUpdateTimelines: (newTls: string[]) => void;
  defaultTab?: "category" | "timeline";
}

export function ManageTaxonomyModal({
  isOpen,
  onClose,
  categories,
  timelines,
  onUpdateCategories,
  onUpdateTimelines,
  defaultTab = "category",
}: ManageTaxonomyModalProps) {
  const [activeTab, setActiveTab] = useState<"category" | "timeline">(defaultTab);

  // Thêm mới
  const [newCatInput, setNewCatInput] = useState("");
  const [newTlInput, setNewTlInput] = useState("");

  // Chỉnh sửa inline
  const [editingCatIndex, setEditingCatIndex] = useState<number | null>(null);
  const [editingCatValue, setEditingCatValue] = useState("");

  const [editingTlIndex, setEditingTlIndex] = useState<number | null>(null);
  const [editingTlValue, setEditingTlValue] = useState("");

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      setEditingCatIndex(null);
      setEditingTlIndex(null);
      setNewCatInput("");
      setNewTlInput("");
    }
  }, [isOpen, defaultTab]);

  if (!isOpen) return null;

  // Thêm danh mục
  const handleAddCategory = (e: FormEvent) => {
    e.preventDefault();
    const val = newCatInput.trim();
    if (!val) return;
    if (categories.includes(val)) {
      alert("Danh mục này đã tồn tại.");
      return;
    }
    onUpdateCategories([...categories, val]);
    setNewCatInput("");
  };

  // Lưu sửa danh mục
  const handleSaveEditCat = (idx: number) => {
    const val = editingCatValue.trim();
    if (!val) return;
    const updated = [...categories];
    updated[idx] = val;
    onUpdateCategories(updated);
    setEditingCatIndex(null);
  };

  // Xóa danh mục
  const handleDeleteCategory = (catName: string) => {
    if (categories.length <= 1) {
      alert("Phải giữ lại ít nhất 1 danh mục.");
      return;
    }
    if (!confirm(`Bạn có chắc muốn xóa danh mục "${catName}"?`)) return;
    onUpdateCategories(categories.filter((c) => c !== catName));
  };

  // Thêm kỳ hạn
  const handleAddTimeline = (e: FormEvent) => {
    e.preventDefault();
    const val = newTlInput.trim();
    if (!val) return;
    if (timelines.includes(val)) {
      alert("Kỳ hạn này đã tồn tại.");
      return;
    }
    onUpdateTimelines([...timelines, val]);
    setNewTlInput("");
  };

  // Lưu sửa kỳ hạn
  const handleSaveEditTl = (idx: number) => {
    const val = editingTlValue.trim();
    if (!val) return;
    const updated = [...timelines];
    updated[idx] = val;
    onUpdateTimelines(updated);
    setEditingTlIndex(null);
  };

  // Xóa kỳ hạn
  const handleDeleteTimeline = (tlName: string) => {
    if (timelines.length <= 1) {
      alert("Phải giữ lại ít nhất 1 kỳ hạn.");
      return;
    }
    if (!confirm(`Bạn có chắc muốn xóa kỳ hạn "${tlName}"?`)) return;
    onUpdateTimelines(timelines.filter((t) => t !== tlName));
  };

  const handleResetDefaults = () => {
    if (confirm("Khôi phục danh mục và kỳ hạn về mặc định ban đầu?")) {
      onUpdateCategories(DEFAULT_CATEGORIES);
      onUpdateTimelines(DEFAULT_TIMELINES);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-7">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Quản lý Danh mục & Kỳ hạn
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Thêm mới, đổi tên hoặc xóa các nhãn phân loại theo nhu cầu gia đình.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab chuyển đổi */}
        <div className="mt-4 flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("category")}
            className={`flex-1 rounded-lg py-2 transition ${
              activeTab === "category"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Danh mục ({categories.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("timeline")}
            className={`flex-1 rounded-lg py-2 transition ${
              activeTab === "timeline"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Kỳ hạn ({timelines.length})
          </button>
        </div>

        {/* TAB 1: QUẢN LÝ DANH MỤC */}
        {activeTab === "category" && (
          <div className="mt-4 space-y-4">
            <form onSubmit={handleAddCategory} className="flex gap-2">
              <input
                type="text"
                placeholder="Nhập tên danh mục mới..."
                value={newCatInput}
                onChange={(e) => setNewCatInput(e.target.value)}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
              <button
                type="submit"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition"
              >
                + Thêm
              </button>
            </form>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {categories.map((cat, idx) => {
                const theme = getCategoryTheme(cat);
                const isEditingThis = editingCatIndex === idx;

                return (
                  <div
                    key={cat}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs transition hover:bg-white"
                  >
                    {isEditingThis ? (
                      <div className="flex flex-1 items-center gap-2">
                        <input
                          type="text"
                          value={editingCatValue}
                          onChange={(e) => setEditingCatValue(e.target.value)}
                          className="flex-1 rounded-md border border-emerald-500 px-2 py-1 text-xs text-slate-900 focus:outline-none"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEditCat(idx)}
                          className="rounded bg-emerald-600 px-2.5 py-1 text-white hover:bg-emerald-700"
                        >
                          Lưu
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCatIndex(null)}
                          className="rounded bg-slate-200 px-2 py-1 text-slate-700 hover:bg-slate-300"
                        >
                          Hủy
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${theme.bg} ${theme.text} ${theme.border}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${theme.dot}`} />
                            {cat}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCatIndex(idx);
                              setEditingCatValue(cat);
                            }}
                            title="Sửa tên danh mục"
                            className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat)}
                            title="Xóa danh mục"
                            className="rounded p-1 text-slate-400 hover:bg-rose-100 hover:text-rose-600 transition"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: QUẢN LÝ KỲ HẠN */}
        {activeTab === "timeline" && (
          <div className="mt-4 space-y-4">
            <form onSubmit={handleAddTimeline} className="flex gap-2">
              <input
                type="text"
                placeholder="Nhập tên kỳ hạn mới (VD: Siêu dài hạn)..."
                value={newTlInput}
                onChange={(e) => setNewTlInput(e.target.value)}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
              <button
                type="submit"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition"
              >
                + Thêm
              </button>
            </form>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {timelines.map((tl, idx) => {
                const theme = getTimelineTheme(tl);
                const isEditingThis = editingTlIndex === idx;

                return (
                  <div
                    key={tl}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs transition hover:bg-white"
                  >
                    {isEditingThis ? (
                      <div className="flex flex-1 items-center gap-2">
                        <input
                          type="text"
                          value={editingTlValue}
                          onChange={(e) => setEditingTlValue(e.target.value)}
                          className="flex-1 rounded-md border border-emerald-500 px-2 py-1 text-xs text-slate-900 focus:outline-none"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEditTl(idx)}
                          className="rounded bg-emerald-600 px-2.5 py-1 text-white hover:bg-emerald-700"
                        >
                          Lưu
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTlIndex(null)}
                          className="rounded bg-slate-200 px-2 py-1 text-slate-700 hover:bg-slate-300"
                        >
                          Hủy
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border ${theme.bg} ${theme.text} ${theme.border}`}>
                          {tl}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTlIndex(idx);
                              setEditingTlValue(tl);
                            }}
                            title="Sửa tên kỳ hạn"
                            className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTimeline(tl)}
                            title="Xóa kỳ hạn"
                            className="rounded p-1 text-slate-400 hover:bg-rose-100 hover:text-rose-600 transition"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-xs font-semibold text-slate-500 hover:text-rose-600 transition"
          >
            Khôi phục mặc định
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 7. MODAL CHỈNH SỬA SỐ LIỆU TỔNG QUAN (KPI STATS OVERRIDE)
// ============================================================================
interface EditSummaryStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  autoTotalTarget: number;
  autoTotalCurrent: number;
  currentOverride: CustomStatsOverride | null;
  onSaveOverride: (override: CustomStatsOverride | null) => void;
  initialFocusField?: "target" | "current";
}

export function EditSummaryStatsModal({
  isOpen,
  onClose,
  autoTotalTarget,
  autoTotalCurrent,
  currentOverride,
  onSaveOverride,
  initialFocusField = "target",
}: EditSummaryStatsModalProps) {
  const targetId = useId();
  const currentId = useId();

  const [targetStr, setTargetStr] = useState("");
  const [currentStr, setCurrentStr] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const initialTarget = currentOverride?.isCustom
      ? currentOverride.totalTarget
      : autoTotalTarget;
    const initialCurrent = currentOverride?.isCustom
      ? currentOverride.totalCurrent
      : autoTotalCurrent;

    setTargetStr(formatNumberWithDots(String(initialTarget)));
    setCurrentStr(formatNumberWithDots(String(initialCurrent)));
  }, [isOpen, currentOverride, autoTotalTarget, autoTotalCurrent]);

  if (!isOpen) return null;

  const targetNum = parseNumberFromDots(targetStr);
  const currentNum = parseNumberFromDots(currentStr);
  const remainingNum = Math.max(0, targetNum - currentNum);
  const percentNum = targetNum > 0 ? Math.round((currentNum / targetNum) * 1000) / 10 : 0;

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    onSaveOverride({
      isCustom: true,
      totalTarget: targetNum,
      totalCurrent: currentNum,
    });
    onClose();
  };

  const handleResetToAuto = () => {
    onSaveOverride(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-7">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Chỉnh sửa số liệu tổng quan
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Tùy chỉnh trực tiếp số liệu hiển thị trên 4 thẻ thống kê ở đầu trang.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-5 space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor={targetId} className="block text-xs font-semibold text-slate-700">
                Tổng mục tiêu dự kiến (VNĐ) <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setTargetStr(formatNumberWithDots(String(autoTotalTarget)))}
                className="text-[11px] font-medium text-emerald-600 hover:underline"
              >
                Lấy từ các thẻ: {formatVND(autoTotalTarget)}
              </button>
            </div>
            <input
              id={targetId}
              type="text"
              required
              autoFocus={initialFocusField === "target"}
              placeholder="VD: 5.000.000.000"
              value={targetStr}
              onChange={(e) => setTargetStr(formatNumberWithDots(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor={currentId} className="block text-xs font-semibold text-slate-700">
                Đã tích lũy được (VNĐ)
              </label>
              <button
                type="button"
                onClick={() => setCurrentStr(formatNumberWithDots(String(autoTotalCurrent)))}
                className="text-[11px] font-medium text-emerald-600 hover:underline"
              >
                Lấy từ các thẻ: {formatVND(autoTotalCurrent)}
              </button>
            </div>
            <input
              id={currentId}
              type="text"
              autoFocus={initialFocusField === "current"}
              placeholder="VD: 1.800.000.000"
              value={currentStr}
              onChange={(e) => setCurrentStr(formatNumberWithDots(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm font-bold text-emerald-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5 text-xs">
            <p className="font-semibold text-slate-600">Xem trước kết quả tự động cập nhật:</p>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Số tiền còn thiếu:</span>
              <span className="font-bold text-rose-600">{formatVND(remainingNum)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Tiến độ chung:</span>
              <span className="font-bold text-emerald-600">{percentNum}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/70">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${percentNum}%` }}
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
            {currentOverride?.isCustom ? (
              <button
                type="button"
                onClick={handleResetToAuto}
                className="w-full sm:w-auto rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
              >
                Khôi phục tự động tính
              </button>
            ) : <div />}

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="rounded-lg bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
              >
                Lưu số liệu
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// 8. MODAL & FORM: DÙNG CHUNG CHO CẢ THÊM MỚI VÀ CHỈNH SỬA MỤC TIÊU
// ============================================================================
interface GoalFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  goalToEdit?: Goal | null;
  onSaveGoal: (goalData: Goal, imageFiles: File[]) => Promise<void>;
  isSubmitting?: boolean;
  categories: string[];
  timelines: string[];
  onOpenManageTaxonomy: (tab?: "category" | "timeline") => void;
}

export function GoalFormModal({
  isOpen,
  onClose,
  goalToEdit,
  onSaveGoal,
  isSubmitting = false,
  categories,
  timelines,
  onOpenManageTaxonomy,
}: GoalFormModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputId = useId();
  const descInputId = useId();
  const categoryInputId = useId();
  const timelineInputId = useId();
  const yearInputId = useId();
  const targetAmountInputId = useId();
  const currentAmountInputId = useId();
  const fileUploadInputId = useId();

  const [isDragging, setIsDragging] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(categories[0] || "Phát triển bản thân");
  const [timelineType, setTimelineType] = useState(timelines[0] || "Ngắn hạn");
  const [targetYear, setTargetYear] = useState(2028);
  const [targetAmountStr, setTargetAmountStr] = useState("");
  const [currentAmountStr, setCurrentAmountStr] = useState("");

  const isEditing = Boolean(goalToEdit);

  useEffect(() => {
    if (!isOpen) return;

    if (goalToEdit) {
      setTitle(goalToEdit.title);
      setDescription(goalToEdit.description || "");
      setCategory(goalToEdit.category);
      setTimelineType(goalToEdit.timeline_type);
      setTargetYear(goalToEdit.target_year);
      setTargetAmountStr(formatNumberWithDots(String(goalToEdit.target_amount)));
      setCurrentAmountStr(formatNumberWithDots(String(goalToEdit.current_amount)));
      setImages(goalToEdit.images || []);
      setSelectedFiles([]);
      setUploadError(null);
    } else {
      setTitle("");
      setDescription("");
      setCategory(categories[0] || "Phát triển bản thân");
      setTimelineType(timelines[0] || "Ngắn hạn");
      setTargetYear(2028);
      setTargetAmountStr("");
      setCurrentAmountStr("");
      setImages([]);
      setSelectedFiles([]);
      setUploadError(null);
    }
  }, [isOpen, goalToEdit, categories, timelines]);

  if (!isOpen) return null;

  const processFiles = (files: FileList | File[]) => {
    setUploadError(null);
    const newFiles = Array.from(files).filter((file) =>
      file.type.startsWith("image/")
    );

    if (newFiles.length === 0) {
      setUploadError("Vui lòng chỉ tải lên file định dạng hình ảnh (PNG, JPG, WEBP).");
      return;
    }

    if (images.length + newFiles.length > 5) {
      setUploadError("Bạn chỉ được tải lên tối đa 5 ảnh cho mỗi mục tiêu.");
      return;
    }

    const newUrls = newFiles.map((file) => URL.createObjectURL(file));
    setImages((prev) => [...prev, ...newUrls].slice(0, 5));
    setSelectedFiles((prev) => [...prev, ...newFiles].slice(0, 5));
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setUploadError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const targetAmt = parseNumberFromDots(targetAmountStr);
    const currentAmt = parseNumberFromDots(currentAmountStr);

    if (!title.trim()) {
      alert("Vui lòng nhập tên mục tiêu.");
      return;
    }
    if (targetAmt <= 0) {
      alert("Vui lòng nhập số tiền mục tiêu hợp lệ.");
      return;
    }

    const finalImages =
      images.length > 0
        ? images
        : [
            "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&auto=format&fit=crop&q=80",
          ];

    const targetGoal: Goal = {
      id: goalToEdit ? goalToEdit.id : crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      timeline_type: timelineType,
      target_year: Number(targetYear) || new Date().getFullYear(),
      target_amount: targetAmt,
      current_amount: currentAmt,
      images: finalImages,
      created_at: goalToEdit?.created_at || new Date().toISOString(),
    };

    await onSaveGoal(targetGoal, selectedFiles);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-7 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {isEditing ? "Chỉnh sửa mục tiêu" : "Thêm mục tiêu mới"}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {isEditing
                ? "Cập nhật các mốc tài chính, số tiền đã tích lũy và hình ảnh."
                : "Thiết lập các mốc tài chính và lưu trực tiếp vào cơ sở dữ liệu."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor={titleInputId} className="block text-xs font-semibold text-slate-700">
              Tên mục tiêu <span className="text-rose-500">*</span>
            </label>
            <input
              id={titleInputId}
              type="text"
              required
              disabled={isSubmitting}
              placeholder="VD: Mua nhà chung cư, Du học thạc sĩ, Đổi xe..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:opacity-60"
            />
          </div>

          <div>
            <label htmlFor={descInputId} className="block text-xs font-semibold text-slate-700">
              Mô tả / Ý nghĩa mục tiêu
            </label>
            <textarea
              id={descInputId}
              rows={2}
              disabled={isSubmitting}
              placeholder="Ghi chú chi tiết kế hoạch, mong muốn hoặc kỳ vọng..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:opacity-60"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor={categoryInputId} className="block text-xs font-semibold text-slate-700">
                  Danh mục <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => onOpenManageTaxonomy("category")}
                  className="text-[11px] font-semibold text-emerald-600 hover:underline"
                >
                  Sửa/Thêm
                </button>
              </div>
              <select
                id={categoryInputId}
                disabled={isSubmitting}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:opacity-60"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor={timelineInputId} className="block text-xs font-semibold text-slate-700">
                  Kỳ hạn <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => onOpenManageTaxonomy("timeline")}
                  className="text-[11px] font-semibold text-emerald-600 hover:underline"
                >
                  Sửa/Thêm
                </button>
              </div>
              <select
                id={timelineInputId}
                disabled={isSubmitting}
                value={timelineType}
                onChange={(e) => setTimelineType(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:opacity-60"
              >
                {timelines.map((tl) => (
                  <option key={tl} value={tl}>
                    {tl}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor={yearInputId} className="block text-xs font-semibold text-slate-700">
                Năm hoàn thành <span className="text-rose-500">*</span>
              </label>
              <input
                id={yearInputId}
                type="number"
                min={2024}
                max={2060}
                required
                disabled={isSubmitting}
                value={targetYear}
                onChange={(e) => setTargetYear(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:opacity-60"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={targetAmountInputId} className="block text-xs font-semibold text-slate-700">
                Tổng mục tiêu (VNĐ) <span className="text-rose-500">*</span>
              </label>
              <input
                id={targetAmountInputId}
                type="text"
                required
                disabled={isSubmitting}
                placeholder="VD: 500.000.000"
                value={targetAmountStr}
                onChange={(e) => setTargetAmountStr(formatNumberWithDots(e.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-900 font-semibold focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:opacity-60"
              />
            </div>

            <div>
              <label htmlFor={currentAmountInputId} className="block text-xs font-semibold text-slate-700">
                Số tiền hiện có (VNĐ)
              </label>
              <input
                id={currentAmountInputId}
                type="text"
                disabled={isSubmitting}
                placeholder="VD: 120.000.000"
                value={currentAmountStr}
                onChange={(e) => setCurrentAmountStr(formatNumberWithDots(e.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-900 font-semibold focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:opacity-60"
              />
            </div>
          </div>

          {/* KHU VỰC DRAG & DROP UPLOAD 1 ĐẾN 5 ẢNH */}
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor={fileUploadInputId} className="block text-xs font-semibold text-slate-700">
                Hình ảnh minh họa (1 đến 5 ảnh)
              </label>
              <span className="text-[11px] font-medium text-slate-400">
                Đã có: {images.length} / 5
              </span>
            </div>

            {images.length < 5 && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`mt-2 flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-5 text-center transition cursor-pointer ${
                  isDragging
                    ? "border-emerald-500 bg-emerald-50/60"
                    : "border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300"
                } ${isSubmitting ? "pointer-events-none opacity-60" : ""}`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm text-emerald-600 mb-2">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-xs font-medium text-slate-700">
                  <span className="text-emerald-600 font-semibold underline">Nhấn để chọn thêm ảnh</span> hoặc kéo thả vào đây
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  PNG, JPG, WEBP lên đến 5 ảnh (Tự động cập nhật lên server & DB)
                </p>
                <input
                  id={fileUploadInputId}
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={isSubmitting}
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            )}

            {uploadError && (
              <p className="mt-1.5 text-xs text-rose-500 font-medium">{uploadError}</p>
            )}

            {images.length > 0 && (
              <div className="mt-3 grid grid-cols-5 gap-2.5">
                {images.map((imgUrl, index) => (
                  <div
                    key={index}
                    className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imgUrl}
                      alt={`Preview ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                    {index === 0 && (
                      <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1 py-0.5 text-[9px] font-semibold text-white">
                        Cover
                      </span>
                    )}
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-white shadow-sm opacity-90 hover:opacity-100 hover:scale-110 transition"
                      title="Xóa ảnh này"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="rounded-lg px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition disabled:opacity-60 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <svg className="h-3.5 w-3.5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Đang lưu...</span>
                </>
              ) : (
                <span>{isEditing ? "Lưu thay đổi" : "Lưu mục tiêu"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// 9. COMPONENT CHÍNH: GOALS DASHBOARD (CARD GRID & QUẢN LÝ DANH MỤC / KỲ HẠN)
// ============================================================================
const CUSTOM_STATS_KEY = "family_goals_custom_stats_override";
const CATEGORIES_KEY = "family_goals_custom_categories";
const TIMELINES_KEY = "family_goals_custom_timelines";

export function GoalsDashboard() {
  const [goals, setGoals] = useState<Goal[]>(INITIAL_MOCK_GOALS);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [timelines, setTimelines] = useState<string[]>(DEFAULT_TIMELINES);
  const [selectedCategory, setSelectedCategory] = useState<string>("Tất cả");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dbNotice, setDbNotice] = useState<string | null>(null);

  // Modal quản lý Danh mục & Kỳ hạn
  const [isManageTaxonomyOpen, setIsManageTaxonomyOpen] = useState(false);
  const [taxonomyDefaultTab, setTaxonomyDefaultTab] = useState<"category" | "timeline">("category");

  // Modal chỉnh sửa số liệu tổng quan
  const [customStats, setCustomStats] = useState<CustomStatsOverride | null>(null);
  const [isEditStatsModalOpen, setIsEditStatsModalOpen] = useState(false);
  const [statsFocusField, setStatsFocusField] = useState<"target" | "current">("target");

  // Nạp danh mục, kỳ hạn và custom stats từ LocalStorage
  useEffect(() => {
    try {
      const savedCats = localStorage.getItem(CATEGORIES_KEY);
      if (savedCats) {
        const parsed = JSON.parse(savedCats);
        if (Array.isArray(parsed) && parsed.length > 0) setCategories(parsed);
      }
      const savedTls = localStorage.getItem(TIMELINES_KEY);
      if (savedTls) {
        const parsed = JSON.parse(savedTls);
        if (Array.isArray(parsed) && parsed.length > 0) setTimelines(parsed);
      }
      const savedStats = localStorage.getItem(CUSTOM_STATS_KEY);
      if (savedStats) {
        const parsed = JSON.parse(savedStats) as CustomStatsOverride;
        if (parsed?.isCustom) setCustomStats(parsed);
      }
    } catch {
      // Bỏ qua lỗi truy cập LocalStorage
    }
  }, []);

  // Cập nhật danh mục
  const handleUpdateCategories = (newCats: string[]) => {
    setCategories(newCats);
    try {
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(newCats));
      setDbNotice("Đã cập nhật danh mục thành công!");
    } catch {}
  };

  // Cập nhật kỳ hạn
  const handleUpdateTimelines = (newTls: string[]) => {
    setTimelines(newTls);
    try {
      localStorage.setItem(TIMELINES_KEY, JSON.stringify(newTls));
      setDbNotice("Đã cập nhật kỳ hạn thành công!");
    } catch {}
  };

  // 1. Tải danh sách mục tiêu từ REST API (/api/goals)
  useEffect(() => {
    let active = true;

    async function fetchGoalsFromDb() {
      try {
        const res = await fetch("/api/goals");
        if (!res.ok) {
          throw new Error("Không thể tải danh sách từ API.");
        }
        const data = await res.json();
        if (active && data.goals && Array.isArray(data.goals)) {
          if (data.goals.length > 0) {
            setGoals(data.goals);
          } else {
            setGoals(INITIAL_MOCK_GOALS);
          }
        }
      } catch {
        if (active) {
          setGoals(INITIAL_MOCK_GOALS);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void fetchGoalsFromDb();
    return () => {
      active = false;
    };
  }, []);

  // 2. Mở Modal Thêm mới
  const handleOpenAddModal = () => {
    setEditingGoal(null);
    setIsModalOpen(true);
  };

  // 3. Mở Modal Sửa mục tiêu
  const handleOpenEditModal = (goal: Goal) => {
    setEditingGoal(goal);
    setIsModalOpen(true);
  };

  // 4. Mở Modal Sửa số liệu tổng quan
  const handleOpenEditStats = (field: "target" | "current" = "target") => {
    setStatsFocusField(field);
    setIsEditStatsModalOpen(true);
  };

  // 5. Mở Modal Quản lý Danh mục & Kỳ hạn
  const handleOpenManageTaxonomy = (tab: "category" | "timeline" = "category") => {
    setTaxonomyDefaultTab(tab);
    setIsManageTaxonomyOpen(true);
  };

  // 6. Lưu số liệu tổng quan tùy chỉnh
  const handleSaveStatsOverride = (override: CustomStatsOverride | null) => {
    setCustomStats(override);
    try {
      if (override && override.isCustom) {
        localStorage.setItem(CUSTOM_STATS_KEY, JSON.stringify(override));
        setDbNotice("Đã cập nhật số liệu tổng quan tùy chỉnh!");
      } else {
        localStorage.removeItem(CUSTOM_STATS_KEY);
        setDbNotice("Đã khôi phục số liệu tính tự động từ danh sách mục tiêu!");
      }
    } catch {}
  };

  // 7. Lưu mục tiêu (Thêm mới hoặc Cập nhật)
  const handleSaveGoal = async (targetGoal: Goal, imageFiles: File[]) => {
    setIsSubmitting(true);
    setDbNotice(null);

    let finalImageUrls = targetGoal.images.filter((img) => !img.startsWith("blob:"));

    try {
      if (imageFiles.length > 0) {
        const formData = new FormData();
        imageFiles.forEach((f) => formData.append("files", f));
        const uploadRes = await fetch("/api/goals/upload", {
          method: "POST",
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          if (uploadData.imageUrls && Array.isArray(uploadData.imageUrls)) {
            finalImageUrls = [...finalImageUrls, ...uploadData.imageUrls].slice(0, 5);
          }
        }
      }

      if (finalImageUrls.length === 0) {
        finalImageUrls = targetGoal.images.length > 0 ? targetGoal.images : [
          "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&auto=format&fit=crop&q=80",
        ];
      }

      const payload = {
        title: targetGoal.title,
        description: targetGoal.description,
        category: targetGoal.category,
        timelineType: targetGoal.timeline_type,
        targetYear: targetGoal.target_year,
        targetAmount: targetGoal.target_amount,
        currentAmount: targetGoal.current_amount,
        images: finalImageUrls,
        sortOrder: targetGoal.sort_order ?? 0,
      };

      if (editingGoal) {
        const res = await fetch(`/api/goals/${editingGoal.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.goal) {
            setGoals((prev) =>
              prev.map((g) => (g.id === editingGoal.id ? data.goal : g))
            );
            setDbNotice("Đã cập nhật mục tiêu thành công!");
            return;
          }
        }

        setGoals((prev) =>
          prev.map((g) =>
            g.id === editingGoal.id
              ? { ...targetGoal, images: finalImageUrls }
              : g
          )
        );
        setDbNotice("Đã lưu thay đổi mục tiêu!");
      } else {
        const res = await fetch("/api/goals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.goal) {
            setGoals((prev) => [data.goal, ...prev]);
            setDbNotice("Đã thêm mục tiêu mới thành công!");
            return;
          }
        }

        const optimisticGoal = { ...targetGoal, images: finalImageUrls };
        setGoals((prev) => [optimisticGoal, ...prev]);
        setDbNotice("Đã thêm mục tiêu mới!");
      }
    } catch (err) {
      console.warn("Lỗi lưu DB, đã lưu mục tiêu vào bộ nhớ cục bộ:", err);
      if (editingGoal) {
        setGoals((prev) =>
          prev.map((g) => (g.id === editingGoal.id ? targetGoal : g))
        );
      } else {
        setGoals((prev) => [targetGoal, ...prev]);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 8. Xóa mục tiêu: DELETE /api/goals/[id]
  const handleDeleteGoal = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa mục tiêu này?")) return;

    try {
      await fetch(`/api/goals/${id}`, { method: "DELETE" });
    } catch (err) {
      console.warn("Lỗi gọi DELETE API:", err);
    }
    setGoals((prev) => prev.filter((g) => g.id !== id));
    setDbNotice("Đã xóa mục tiêu thành công!");
  };

  // Tính toán số liệu tự động từ danh sách mục tiêu
  const autoStats = useMemo(() => {
    const totalTarget = goals.reduce((acc, g) => acc + g.target_amount, 0);
    const totalCurrent = goals.reduce((acc, g) => acc + g.current_amount, 0);
    const totalRemaining = Math.max(0, totalTarget - totalCurrent);
    const overallPercent =
      totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 1000) / 10 : 0;

    return { totalTarget, totalCurrent, totalRemaining, overallPercent };
  }, [goals]);

  // Kết quả hiển thị: Ưu tiên số liệu custom nếu người dùng đã tùy chỉnh
  const displayStats = useMemo(() => {
    if (customStats?.isCustom) {
      const target = customStats.totalTarget;
      const current = customStats.totalCurrent;
      const remaining = Math.max(0, target - current);
      const percent = target > 0 ? Math.round((current / target) * 1000) / 10 : 0;
      return {
        totalTarget: target,
        totalCurrent: current,
        totalRemaining: remaining,
        overallPercent: percent,
        isCustom: true,
      };
    }
    return { ...autoStats, isCustom: false };
  }, [customStats, autoStats]);

  // Bộ lọc danh mục
  const filteredGoals = useMemo(() => {
    if (selectedCategory === "Tất cả") return goals;
    return goals.filter((g) => g.category === selectedCategory);
  }, [goals, selectedCategory]);

  const filterCategoriesList = useMemo(() => {
    return ["Tất cả", ...categories];
  }, [categories]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Thông báo thao tác */}
      {dbNotice && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800">
          <span>{dbNotice}</span>
          <button
            type="button"
            onClick={() => setDbNotice(null)}
            className="text-emerald-700 hover:text-emerald-900"
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. Tiêu đề trang & Nút thêm mục tiêu */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <span>🎯</span>
            <span>Family Smart Hub • Kế hoạch tương lai</span>
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Bản đồ mục tiêu gia đình
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Hình ảnh hóa các mốc đích lớn: An cư, Xe hơi, Giáo dục con và Phát triển bản thân.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenManageTaxonomy("category")}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
            title="Quản lý thêm/sửa/xóa danh mục & kỳ hạn"
          >
            <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Sửa Danh mục/Kỳ hạn</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition hover:shadow-md"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Thêm mục tiêu</span>
          </button>
        </div>
      </div>

      {/* 2. Thống kê tổng hợp (KPI Cards - CHO PHÉP NHẤP ĐỂ CHỈNH SỬA TRỰC TIẾP) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Chỉ số tài chính tổng quan</span>
            {displayStats.isCustom ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Đang dùng số liệu tùy chỉnh
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                Tự động tính từ {goals.length} mục tiêu
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => handleOpenEditStats("target")}
            className="inline-flex items-center gap-1 font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            <span>Sửa số liệu</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div
            onClick={() => handleOpenEditStats("target")}
            className="group relative cursor-pointer rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500">Tổng mục tiêu dự kiến</p>
              <span className="opacity-0 group-hover:opacity-100 transition rounded-full p-1 bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </span>
            </div>
            <p className="mt-2 text-xl sm:text-2xl font-bold text-slate-900 group-hover:text-emerald-700 transition">
              {formatVND(displayStats.totalTarget)}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {displayStats.isCustom ? "Đã sửa tùy chỉnh • Bấm để đổi" : `${goals.length} mục tiêu đang theo đuổi`}
            </p>
          </div>

          <div
            onClick={() => handleOpenEditStats("current")}
            className="group relative cursor-pointer rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500">Đã tích lũy được</p>
              <span className="opacity-0 group-hover:opacity-100 transition rounded-full p-1 bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </span>
            </div>
            <p className="mt-2 text-xl sm:text-2xl font-bold text-emerald-600">
              {formatVND(displayStats.totalCurrent)}
            </p>
            <p className="mt-1 text-xs text-emerald-600 font-medium">
              Đạt {displayStats.overallPercent}% toàn bộ chặng đường
            </p>
          </div>

          <div
            onClick={() => handleOpenEditStats("target")}
            className="group relative cursor-pointer rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:border-rose-300 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500">Số tiền còn thiếu</p>
              <span className="opacity-0 group-hover:opacity-100 transition rounded-full p-1 bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </span>
            </div>
            <p className="mt-2 text-xl sm:text-2xl font-bold text-rose-600">
              {formatVND(displayStats.totalRemaining)}
            </p>
            <p className="mt-1 text-xs text-slate-400">Tự động tính từ mục tiêu & đã tích lũy</p>
          </div>

          <div
            onClick={() => handleOpenEditStats("current")}
            className="group relative cursor-pointer rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm flex flex-col justify-between transition hover:border-emerald-300 hover:shadow-md"
          >
            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-500">Tiến độ chung</p>
                <span className="opacity-0 group-hover:opacity-100 transition rounded-full p-1 bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-bold text-slate-900">
                  {displayStats.overallPercent}%
                </span>
                <span className="text-xs font-medium text-slate-500">Mục tiêu tài chính</span>
              </div>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${displayStats.overallPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bộ lọc theo Danh mục (Chips filter) & Nút sửa danh mục */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none flex-1">
          {filterCategoriesList.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-semibold transition ${
                selectedCategory === cat
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => handleOpenManageTaxonomy("category")}
          className="shrink-0 flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
          title="Quản lý danh mục"
        >
          <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          <span className="hidden sm:inline">Tùy biến danh mục</span>
        </button>
      </div>

      {/* 4. CARD GRID LAYOUT */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center rounded-2xl border border-slate-100 bg-white text-xs text-slate-400">
          Đang tải dữ liệu mục tiêu...
        </div>
      ) : filteredGoals.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-slate-800">Không có mục tiêu nào</h3>
          <p className="mt-1 text-xs text-slate-500">
            Không tìm thấy mục tiêu trong danh mục &quot;{selectedCategory}&quot;.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={handleOpenEditModal}
              onDelete={handleDeleteGoal}
            />
          ))}
        </div>
      )}

      {/* 5. Modal Thêm Mới / Chỉnh Sửa Mục Tiêu */}
      <GoalFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingGoal(null);
        }}
        goalToEdit={editingGoal}
        onSaveGoal={handleSaveGoal}
        isSubmitting={isSubmitting}
        categories={categories}
        timelines={timelines}
        onOpenManageTaxonomy={handleOpenManageTaxonomy}
      />

      {/* 6. Modal Chỉnh Sửa Số Liệu Tổng Quan (4 Thẻ KPI) */}
      <EditSummaryStatsModal
        isOpen={isEditStatsModalOpen}
        onClose={() => setIsEditStatsModalOpen(false)}
        autoTotalTarget={autoStats.totalTarget}
        autoTotalCurrent={autoStats.totalCurrent}
        currentOverride={customStats}
        onSaveOverride={handleSaveStatsOverride}
        initialFocusField={statsFocusField}
      />

      {/* 7. Modal Quản Lý Danh Mục & Kỳ Hạn (Thêm / Sửa / Xóa) */}
      <ManageTaxonomyModal
        isOpen={isManageTaxonomyOpen}
        onClose={() => setIsManageTaxonomyOpen(false)}
        categories={categories}
        timelines={timelines}
        onUpdateCategories={handleUpdateCategories}
        onUpdateTimelines={handleUpdateTimelines}
        defaultTab={taxonomyDefaultTab}
      />
    </div>
  );
}

export default GoalsDashboard;
