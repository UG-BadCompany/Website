window.TAPhotoEstimate = (() => {
  const MAX_FILES = 10;
  const MAX_FILE_BYTES = 8 * 1024 * 1024;
  const TARGET_FILE_BYTES = 2.5 * 1024 * 1024;
  const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
  const STATUSES = ['draft','photo_uploaded','ai_analyzing','needs_more_info','ready_for_review','quote_created','sent_to_client','accepted','declined','cancelled'];
  const money = (cents = 0) => (window.TAUi?.money ? window.TAUi.money(Number(cents || 0) / 100) : `$${(Number(cents || 0) / 100).toFixed(2)}`);
  const cents = (value) => Math.round(Math.max(0, Number(value || 0)) * 100);
  const escapeHtml = (value = '') => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  const asArray = (value) => Array.isArray(value) ? value : value ? [value] : [];
  const clampScore = (value) => Math.max(0, Math.min(100, Math.round(Number(value || 0) <= 1 ? Number(value || 0) * 100 : Number(value || 0))));
  const normalizeLine = (line = {}, type = 'labor') => {
    const quantity = Number(line.quantity ?? line.hours ?? 1) || 1;
    const unitCostCents = Number(line.unitCostCents ?? line.unit_cost_cents ?? line.rateCents ?? line.rate_cents ?? cents(line.unitCost ?? line.unit_cost ?? line.rate ?? 0)) || 0;
    const markupPct = Number(line.markupPct ?? line.markup_percent ?? 0) || 0;
    const totalCents = Math.round(quantity * unitCostCents * (1 + markupPct / 100));
    return {
      type,
      name: String(line.name || line.material || line.description || `${type === 'labor' ? 'Labor' : 'Material'} line`).slice(0, 180),
      description: String(line.description || line.name || '').slice(0, 500),
      quantity,
      unit: String(line.unit || (type === 'labor' ? 'hours' : 'each')).slice(0, 40),
      unitCostCents,
      markupPct,
      totalCents,
      confidence: String(line.confidence || 'medium').slice(0, 40),
      source: String(line.source || line.pricing_source || '').slice(0, 220),
      optional: Boolean(line.optional),
    };
  };
  const pricingSummary = ({ laborLineItems = [], materialLineItems = [], otherPricing = {}, settings = {} } = {}) => {
    const labor = laborLineItems.map((line) => normalizeLine(line, 'labor'));
    const materials = materialLineItems.map((line) => normalizeLine(line, 'material'));
    const laborTotalCents = labor.reduce((sum, line) => sum + line.totalCents, 0);
    const materialTotalCents = materials.reduce((sum, line) => sum + line.totalCents, 0);
    const tripChargeCents = Number(otherPricing.tripChargeCents ?? otherPricing.trip_charge_cents ?? settings.tripChargeCents ?? 0) || 0;
    const otherTotalCents = tripChargeCents + (Number(otherPricing.permitCents ?? otherPricing.permit_cents ?? 0) || 0) + (Number(otherPricing.disposalCents ?? otherPricing.disposal_cents ?? 0) || 0) + (Number(otherPricing.rentalCents ?? otherPricing.rental_cents ?? 0) || 0) + (Number(otherPricing.markupCents ?? otherPricing.markup_cents ?? 0) || 0);
    const subtotalCents = laborTotalCents + materialTotalCents + otherTotalCents;
    const taxRatePct = Number(otherPricing.taxRatePct ?? settings.taxRatePct ?? 0) || 0;
    const taxCents = Number(otherPricing.taxCents ?? otherPricing.tax_cents ?? Math.round(materialTotalCents * taxRatePct / 100)) || 0;
    const discountCents = Number(otherPricing.discountCents ?? otherPricing.discount_cents ?? 0) || 0;
    const minimumJobCents = Number(settings.minimumJobCents ?? otherPricing.minimumJobCents ?? 0) || 0;
    const preMinimumCents = Math.max(0, subtotalCents + taxCents - discountCents);
    const grandTotalCents = Math.max(minimumJobCents, preMinimumCents);
    return { labor, materials, pricingSummary: { labor_total_cents: laborTotalCents, material_total_cents: materialTotalCents, other_total_cents: otherTotalCents, subtotal_cents: subtotalCents, tax_cents: taxCents, discount_cents: discountCents, minimum_job_cents: minimumJobCents, grand_total_cents: grandTotalCents, pricing_note: 'Estimated — verification recommended.' } };
  };
  const blobToDataUrl = (blob) => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('Could not read compressed image.')); reader.readAsDataURL(blob); });
  const compressImage = async (file) => {
    if (file.size <= TARGET_FILE_BYTES || !/^image\/(jpeg|png|webp)$/i.test(file.type)) return file;
    const bitmap = await createImageBitmap(file);
    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.78));
    bitmap.close?.();
    return blob && blob.size < file.size ? new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }) : file;
  };
  const fileToPhoto = async (file) => {
    if (!ACCEPTED_TYPES.has(file.type)) throw new Error(`${file.name} is not a supported image type.`);
    if (file.size > 18 * 1024 * 1024) throw new Error(`${file.name} is too large. Use an image under 18 MB.`);
    const prepared = await compressImage(file);
    if (prepared.size > MAX_FILE_BYTES) throw new Error(`${file.name} could not be compressed under the 8 MB analysis limit.`);
    return { id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, name: prepared.name || file.name, type: prepared.type || file.type, size: prepared.size, originalSize: file.size, compressed: prepared.size < file.size, dataUrl: await blobToDataUrl(prepared) };
  };
  const filesToPhotos = async (files) => {
    const selected = [...files].slice(0, MAX_FILES);
    return Promise.all(selected.map(fileToPhoto));
  };
  const clientSafe = (record = {}) => ({ id: record.id, status: record.status, serviceCategory: record.serviceCategory, description: record.description, propertyAddress: record.propertyAddress, photoCount: asArray(record.photoUrls || record.photo_urls).length, customerSummary: record.customerSummary || record.customer_summary || 'Request received. Your estimate is being reviewed.', recommendedQuestions: asArray(record.aiAnalysis?.recommended_questions || record.ai_analysis?.recommended_questions).slice(0, 8), pricingSummary: record.pricingSummary || record.pricing_summary || {} });
  return { MAX_FILES, MAX_FILE_BYTES, TARGET_FILE_BYTES, ACCEPTED_TYPES, STATUSES, money, cents, escapeHtml, asArray, clampScore, normalizeLine, pricingSummary, filesToPhotos, clientSafe };
})();
