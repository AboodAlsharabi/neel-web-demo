export function logoMarkup({ href = "./index.html", tagline = true, compact = false } = {}) {
  const text = compact
    ? '<span class="brand-word"><strong>نيل</strong></span>'
    : `<span class="brand-word"><strong>نيل</strong>${tagline ? "<span>شراكات مشاريع الشباب</span>" : ""}</span>`;
  return `
    <a class="brand-mark" href="${href}" aria-label="نيل — الصفحة الرئيسية">
      <svg class="brand-symbol" viewBox="0 0 40 40" aria-hidden="true">
        <rect x="1" y="1" width="38" height="38" rx="12" fill="#F7EAF0" stroke="#842D49" stroke-width="1.2"/>
        <path d="M11 28c4.4-10.4 11.4-15.6 18-16.4" fill="none" stroke="#842D49" stroke-width="2.2" stroke-linecap="round"/>
        <path d="m11 28 5.1-1.1M11 28l1-5" fill="none" stroke="#842D49" stroke-width="2.2" stroke-linecap="round"/>
        <circle cx="29" cy="11.6" r="2.2" fill="#9B3654"/>
      </svg>
      ${text}
    </a>`;
}
