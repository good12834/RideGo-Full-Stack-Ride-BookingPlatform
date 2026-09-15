import PromoCode from "../models/PromoCode.js";

// POST /api/promos/validate  { code, subtotal }
export async function validatePromo(req, res) {
  try {
    const { code, subtotal } = req.body;
    if (!code) return res.status(400).json({ message: "code is required" });

    const promo = await PromoCode.findOne({ code: String(code).toUpperCase() });
    if (!promo || !promo.isValid()) {
      return res.status(404).json({ message: "Promo code is invalid or expired" });
    }

    const sub = Number(subtotal) || 0;
    const discount =
      promo.discountType === "percentage"
        ? Math.round(sub * (promo.discountValue / 100) * 100) / 100
        : Math.min(promo.discountValue, sub);

    res.json({
      code: promo.code,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      discount,
      total: Math.round((sub - discount) * 100) / 100,
    });
  } catch (err) {
    res.status(500).json({ message: "Validation failed", error: err.message });
  }
}
