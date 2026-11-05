import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getProductContent } from "@/lib/product-content";

const orderInput = z.object({
  productIds: z.array(z.string().min(1)).min(1),
});

type PaymentSettings = {
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
};

export type ComboSize = 5 | 10;

export const comboPricesUsd: Record<ComboSize, number> = {
  5: 8,
  10: 35,
};

export const comboPaymentAmountsVnd: Record<ComboSize, number> = {
  5: 208000,
  10: 899000,
};

export const combo10BonusLabel = "4 buổi HDSD";

export type TransferOrder = {
  orderCode: string;
  amount: number;
  currency: "VND";
  transferNote: string;
  productCount: number;
  configured: boolean;
  payment: PaymentSettings & { qrUrl: string | null };
};

type CustomTransferOrderInput = {
  amount: number;
  transferLabel: string;
  productCount?: number;
};

const defaultPaymentSettings: PaymentSettings = {
  bankName: "Techcombank",
  bankCode: "TCB",
  accountNumber: "8663769668",
  accountName: "HO KINH DOANH SUMOI",
};

function buildTransferOrder(
  productIds: string[],
  paymentSettings: PaymentSettings,
  comboSize?: ComboSize | null,
): TransferOrder {
  const uniqueProductIds = [...new Set(productIds)];
  const orderCode = `SC${Date.now().toString().slice(-8)}`;
  const configured = Object.values(paymentSettings).every(Boolean);
  const amount = comboSize
    ? comboPaymentAmountsVnd[comboSize]
    : getCartPriceVnd(uniqueProductIds.length);
  const pricing = getCartPrice(uniqueProductIds.length);
  const pricingNote = [
    pricing.combo10Count ? `C10X${pricing.combo10Count}` : "",
    pricing.combo5Count ? "C5" : "",
    pricing.singleCount ? `LE${pricing.singleCount}` : "",
  ].filter(Boolean).join(" ");
  const transferNote = (
    comboSize
      ? `${orderCode} COMBO${comboSize} ${comboSize}SKILL`
      : `${orderCode} ${uniqueProductIds.length}SKILL ${pricingNote}`
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
  comboSize?: ComboSize | null,
): TransferOrder {
  return buildTransferOrder(productIds, defaultPaymentSettings, comboSize);
}

export function createFallbackCustomTransferOrder({
  amount,
  transferLabel,
  productCount = 1,
}: CustomTransferOrderInput): TransferOrder {
  const orderCode = `SC${Date.now().toString().slice(-8)}`;
  const transferNote = `${orderCode} ${transferLabel}`.toUpperCase();
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

export function getComboSizeForProductCount(
  productCount: number,
  preferredComboSize?: ComboSize | null,
): ComboSize | null {
  if (preferredComboSize && productCount === preferredComboSize) return preferredComboSize;
  if (productCount === 10) return 10;
  if (productCount === 5) return 5;
  return null;
}

export function getCartPrice(productCount: number): { totalUsd: number; combo5Count: number; combo10Count: number; singleCount: number } {
  const combo10Count = Math.floor(productCount / 10);
  const remainder = productCount % 10;
  const combo5Count = remainder >= 5 ? 1 : 0;
  const singleCount = remainder - combo5Count * 5;
  return {
    totalUsd: combo10Count * comboPricesUsd[10] + combo5Count * comboPricesUsd[5] + singleCount * 1.99,
    combo5Count,
    combo10Count,
    singleCount,
  };
}

export function getCartPriceVnd(productCount: number): number {
  const { combo5Count, combo10Count, singleCount } = getCartPrice(productCount);
  return combo10Count * comboPaymentAmountsVnd[10] + combo5Count * comboPaymentAmountsVnd[5] + singleCount * 51000;
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
