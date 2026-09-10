import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getProductContent } from "@/lib/product-content";

const orderInput = z.object({
  productId: z.string().min(1),
  productTitle: z.string().min(1).max(120),
});

export const createTransferOrder = createServerFn({ method: "POST" })
  .validator(orderInput)
  .handler(({ data }) => {
    const paymentSettings = {
      bankName: process.env.PAYMENT_BANK_NAME ?? "",
      bankCode: process.env.PAYMENT_BANK_CODE ?? "",
      accountNumber: process.env.PAYMENT_ACCOUNT_NUMBER ?? "",
      accountName: process.env.PAYMENT_ACCOUNT_NAME ?? "",
    };

    if (!getProductContent(data.productId)) {
      throw new Error("Không tìm thấy Skill cần thanh toán.");
    }

    const orderCode = `SC${Date.now().toString().slice(-8)}`;
    const configured = Object.values(paymentSettings).every(Boolean);
    const amount = 51000;
    const transferNote = `${orderCode} ${data.productId}`.toUpperCase();
    const qrUrl = configured
      ? `https://img.vietqr.io/image/${paymentSettings.bankCode}-${paymentSettings.accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(transferNote)}&accountName=${encodeURIComponent(paymentSettings.accountName)}`
      : null;

    return {
      orderCode,
      amount,
      currency: "VND",
      transferNote,
      configured,
      payment: { ...paymentSettings, qrUrl },
    };
  });
