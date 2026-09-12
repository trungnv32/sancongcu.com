import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getProductContent } from "@/lib/product-content";

const orderInput = z.object({
  productIds: z.array(z.string().min(1)).min(1).max(20),
});

type PaymentSettings = {
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
};

export type TransferOrder = {
  orderCode: string;
  amount: number;
  currency: "VND";
  transferNote: string;
  productCount: number;
  configured: boolean;
  payment: PaymentSettings & { qrUrl: string | null };
};

const defaultPaymentSettings: PaymentSettings = {
  bankName: "Techcombank",
  bankCode: "TCB",
  accountNumber: "8663769668",
  accountName: "HỘ KINH DOANH SUMOI",
};

function buildTransferOrder(
  productIds: string[],
  paymentSettings: PaymentSettings,
  comboSize?: 5 | 10 | null,
): TransferOrder {
  const uniqueProductIds = [...new Set(productIds)];
  const orderCode = `SC${Date.now().toString().slice(-8)}`;
  const configured = Object.values(paymentSettings).every(Boolean);
  const amount =
    comboSize === 5 ? 208000 : comboSize === 10 ? 650000 : 51000 * uniqueProductIds.length;
  const transferNote = (
    comboSize
      ? `${orderCode} COMBO${comboSize} ${comboSize}SKILL`
      : `${orderCode} ${uniqueProductIds.length}SKILL`
  ).toUpperCase();
  const qrUrl = configured
    ? `https://img.vietqr.io/image/${paymentSettings.bankCode}-${paymentSettings.accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(transferNote)}&accountName=${encodeURIComponent(paymentSettings.accountName)}`
    : null;

  return {
    orderCode,
    amount,
    currency: "VND",
    transferNote,
    productCount: uniqueProductIds.length,
    configured,
    payment: { ...paymentSettings, qrUrl },
  };
}

export function createFallbackTransferOrder(
  productIds: string[],
  comboSize?: 5 | 10 | null,
): TransferOrder {
  return buildTransferOrder(productIds, defaultPaymentSettings, comboSize);
}

export function createSavedTransferOrder({
  orderCode,
  amount,
  transferNote,
  productCount,
}: {
  orderCode: string;
  amount: number;
  transferNote: string;
  productCount: number;
}): TransferOrder {
  const qrUrl = `https://img.vietqr.io/image/${defaultPaymentSettings.bankCode}-${defaultPaymentSettings.accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(transferNote)}&accountName=${encodeURIComponent(defaultPaymentSettings.accountName)}`;
  return {
    orderCode,
    amount,
    currency: "VND",
    transferNote,
    productCount,
    configured: true,
    payment: { ...defaultPaymentSettings, qrUrl },
  };
}

export const createTransferOrder = createServerFn({ method: "POST" })
  .validator(orderInput)
  .handler(({ data }) => {
    const paymentSettings = {
      bankName: process.env.PAYMENT_BANK_NAME ?? defaultPaymentSettings.bankName,
      bankCode: process.env.PAYMENT_BANK_CODE ?? defaultPaymentSettings.bankCode,
      accountNumber: process.env.PAYMENT_ACCOUNT_NUMBER ?? defaultPaymentSettings.accountNumber,
      accountName: process.env.PAYMENT_ACCOUNT_NAME ?? defaultPaymentSettings.accountName,
    };

    const productIds = [...new Set(data.productIds)];
    if (productIds.some((productId) => !getProductContent(productId))) {
      throw new Error("Không tìm thấy Skill cần thanh toán.");
    }

    return buildTransferOrder(productIds, paymentSettings);
  });
