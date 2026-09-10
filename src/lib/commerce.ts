import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getProductContent } from "@/lib/product-content";

const orderInput = z.object({
  productIds: z.array(z.string().min(1)).min(1).max(20),
});

export const createTransferOrder = createServerFn({ method: "POST" })
  .validator(orderInput)
  .handler(({ data }) => {
    const paymentSettings = {
      bankName: process.env.PAYMENT_BANK_NAME ?? "Techcombank",
      bankCode: process.env.PAYMENT_BANK_CODE ?? "TCB",
      accountNumber: process.env.PAYMENT_ACCOUNT_NUMBER ?? "8663769668",
      accountName: process.env.PAYMENT_ACCOUNT_NAME ?? "HỘ KINH DOANH SUMOI",
    };

    const productIds = [...new Set(data.productIds)];
    if (productIds.some((productId) => !getProductContent(productId))) {
      throw new Error("Không tìm thấy Skill cần thanh toán.");
    }

    const orderCode = `SC${Date.now().toString().slice(-8)}`;
    const configured = Object.values(paymentSettings).every(Boolean);
    const amount = 51000 * productIds.length;
    const transferNote = `${orderCode} ${productIds.length}SKILL`.toUpperCase();
    const qrUrl = configured
      ? `https://img.vietqr.io/image/${paymentSettings.bankCode}-${paymentSettings.accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(transferNote)}&accountName=${encodeURIComponent(paymentSettings.accountName)}`
      : null;

    return {
      orderCode,
      amount,
      currency: "VND",
      transferNote,
      productCount: productIds.length,
      configured,
      payment: { ...paymentSettings, qrUrl },
    };
  });
