import { NextResponse } from "next/server";

import {
  buildCartItemKey,
  getProductOptionGroups
} from "@/entities/product/model/options";
import type {
  CheckoutDeliveryMethod,
  CheckoutOrder,
  CheckoutOrderItem
} from "@/features/checkout/model/types";
import { sendOrderEmail } from "@/features/checkout/server/send-order-email";
import {
  booleanValue,
  fetchFromStrapi,
  numberValue,
  stringValue,
  StrapiRequestError,
  type StrapiRecord,
  unwrapCollection,
  unwrapData,
  unwrapRecord
} from "@/shared/api/strapi";
import type {
  Product,
  ProductOptionGroup,
  SelectedProductOption
} from "@/shared/model/restaurant";

export const dynamic = "force-dynamic";

const CURRENCY = "RUB";
const SOURCE = "web";
const MAX_ITEMS = 50;
const MAX_QUANTITY = 99;

type FieldErrors = Record<string, string>;

type OrderProduct = Product & {
  strapiId: string;
  documentId: string;
  sectionTitle: string;
};

type DraftItem = {
  productId: string;
  quantity: number;
  selectedOptions: SelectedProductOption[];
};

type NormalizedDraft = {
  customer: {
    name: string;
    phone: string;
  };
  delivery: {
    methodCode: CheckoutDeliveryMethod;
    methodLabel: string;
    street: string;
    house: string;
    entrance: string;
    apartment: string;
    floor: string;
    comment: string;
  };
  deliveryTime: string;
  items: DraftItem[];
  privacyAgreement: boolean;
  frontendTotalAmount: number;
};

function jsonError(message: string, status = 400, fieldErrors: FieldErrors = {}) {
  return NextResponse.json({ message, fieldErrors }, { status });
}

function readObject(value: unknown): StrapiRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as StrapiRecord)
    : null;
}

function trimString(value: unknown, maxLength = 300) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function readSelectedOptions(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.flatMap((option): SelectedProductOption[] => {
    const record = readObject(option);

    if (!record) return [];

    const groupId = trimString(record.groupId, 80);
    const optionId = trimString(record.optionId, 80);

    if (!groupId || !optionId) return [];

    return [
      {
        groupId,
        groupLabel: trimString(record.groupLabel, 120),
        optionId,
        optionLabel: trimString(record.optionLabel, 120)
      }
    ];
  });
}

function normalizeDeliveryMethod(value: unknown, label: string): CheckoutDeliveryMethod {
  if (value === "pickup" || label.toLowerCase().includes("самовывоз")) return "pickup";

  return "delivery";
}

function normalizeDraft(value: unknown) {
  const errors: FieldErrors = {};
  const record = readObject(value);

  if (!record) {
    return { errors: { order: "Некорректные данные заказа." } };
  }

  const customer = readObject(record.customer);
  const delivery = readObject(record.delivery);
  const items = Array.isArray(record.items) ? record.items : [];
  const name = trimString(customer?.name, 80);
  const phone = trimString(customer?.phone, 40);
  const phoneDigits = phone.replace(/\D/g, "");
  const deliveryLabel = trimString(delivery?.methodLabel, 160) || trimString(delivery?.method, 160);
  const methodCode = normalizeDeliveryMethod(delivery?.methodCode, deliveryLabel);
  const deliveryTime = trimString(record.deliveryTime, 120);
  const privacyAgreement = record.privacyAgreement === true;
  const normalizedItems = items.flatMap((item, index): DraftItem[] => {
    const itemRecord = readObject(item);
    const productId = trimString(itemRecord?.productId, 120);
    const quantity = numberValue(itemRecord?.quantity);

    if (!productId) {
      errors[`items.${index}.productId`] = "Не удалось определить позицию заказа.";
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      errors[`items.${index}.quantity`] = "Некорректное количество позиции.";
    }

    if (!productId || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      return [];
    }

    return [
      {
        productId,
        quantity,
        selectedOptions: readSelectedOptions(itemRecord?.selectedOptions)
      }
    ];
  });

  if (!name) errors["customer.name"] = "Укажите имя.";
  if (phoneDigits.length !== 11 || !phoneDigits.startsWith("7")) {
    errors["customer.phone"] = "Введите телефон в формате +7 (000) 000-00-00.";
  }
  if (methodCode === "delivery") {
    if (!trimString(delivery?.street, 160)) errors["delivery.street"] = "Укажите улицу.";
    if (!trimString(delivery?.house, 40)) errors["delivery.house"] = "Укажите дом.";
  }
  if (!deliveryTime) errors.deliveryTime = "Укажите время доставки.";
  if (!privacyAgreement) {
    errors.privacyAgreement = "Подтвердите согласие с политикой конфиденциальности.";
  }
  if (!normalizedItems.length) errors.items = "Добавьте блюда в корзину.";
  if (normalizedItems.length > MAX_ITEMS) errors.items = "Слишком много позиций в заказе.";

  if (Object.keys(errors).length) return { errors };

  const normalized: NormalizedDraft = {
    customer: {
      name,
      phone
    },
    delivery: {
      methodCode,
      methodLabel: deliveryLabel || (methodCode === "pickup" ? "Самовывоз" : "Доставка"),
      street: methodCode === "pickup" ? "" : trimString(delivery?.street, 160),
      house: methodCode === "pickup" ? "" : trimString(delivery?.house, 40),
      entrance: methodCode === "pickup" ? "" : trimString(delivery?.entrance, 40),
      apartment: methodCode === "pickup" ? "" : trimString(delivery?.apartment, 40),
      floor: methodCode === "pickup" ? "" : trimString(delivery?.floor, 40),
      comment: trimString(delivery?.comment, 500)
    },
    deliveryTime,
    items: normalizedItems,
    privacyAgreement,
    frontendTotalAmount: numberValue(record.totalAmount)
  };

  return { normalized };
}

function productOptionGroupsValue(value: unknown): ProductOptionGroup[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const groups = value.flatMap((group): ProductOptionGroup[] => {
    const groupRecord = readObject(group);

    if (!groupRecord) return [];

    const options = Array.isArray(groupRecord.options)
      ? groupRecord.options.flatMap((option): ProductOptionGroup["options"] => {
          const optionRecord = readObject(option);

          if (!optionRecord) return [];

          const id = trimString(optionRecord.id, 80);
          const label = trimString(optionRecord.label, 120);

          return id && label ? [{ id, label }] : [];
        })
      : [];
    const id = trimString(groupRecord.id, 80);
    const label = trimString(groupRecord.label, 120);

    if (!id || !label || !options.length) return [];

    return [
      {
        id,
        label,
        required: booleanValue(groupRecord.required),
        options
      }
    ];
  });

  return groups.length ? groups : undefined;
}

function mapOrderProduct(record: StrapiRecord): OrderProduct {
  const menuSection = unwrapRecord(unwrapData(record.menuSection));

  return {
    id: stringValue(record.externalId, stringValue(record.documentId, String(record.id))),
    strapiId: String(record.id || ""),
    documentId: stringValue(record.documentId),
    name: stringValue(record.name),
    weight: stringValue(record.weight),
    price: numberValue(record.price),
    description: stringValue(record.description),
    isAvailable: booleanValue(record.isAvailable, true),
    optionGroups: productOptionGroupsValue(record.optionGroups),
    sectionTitle: stringValue(menuSection.title)
  };
}

function normalizeOptions(
  product: OrderProduct,
  selectedOptions: SelectedProductOption[],
  field: string,
  errors: FieldErrors
) {
  const optionGroups = getProductOptionGroups(product);

  if (!optionGroups.length) return [];

  const normalizedOptions: SelectedProductOption[] = [];

  for (const selectedOption of selectedOptions) {
    const group = optionGroups.find((item) => item.id === selectedOption.groupId);

    if (!group) {
      errors[field] = "Выбранные параметры позиции устарели.";
      continue;
    }

    const option = group.options.find((item) => item.id === selectedOption.optionId);

    if (!option) {
      errors[field] = "Выбранные параметры позиции устарели.";
      continue;
    }

    normalizedOptions.push({
      groupId: group.id,
      groupLabel: group.label,
      optionId: option.id,
      optionLabel: option.label
    });
  }

  for (const group of optionGroups) {
    if (
      group.required &&
      !normalizedOptions.some((selectedOption) => selectedOption.groupId === group.id)
    ) {
      errors[field] = `Выберите ${group.label.toLowerCase()}.`;
    }
  }

  return normalizedOptions;
}

async function getCatalogSnapshot() {
  const productParams = new URLSearchParams({
    "sort[0]": "sortOrder:asc",
    "pagination[pageSize]": "200",
    populate: "*"
  });

  const [productsResponse, settingsResponse] = await Promise.all([
    fetchFromStrapi(`/api/products?${productParams.toString()}`),
    fetchFromStrapi("/api/site-setting")
  ]);
  const products = unwrapCollection(productsResponse).map(mapOrderProduct);
  const settings = unwrapRecord(unwrapData(settingsResponse));

  return {
    productsById: new Map(products.map((product) => [product.id, product])),
    minOrder: numberValue(settings.minOrder, 4000)
  };
}

function createOrderNumber() {
  const date = new Date();
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = crypto.randomUUID().slice(0, 8).toUpperCase();

  return `CC-${datePart}-${suffix}`;
}

function buildValidatedItems(
  draftItems: DraftItem[],
  productsById: Map<string, OrderProduct>
) {
  const errors: FieldErrors = {};
  const itemsByKey = new Map<string, CheckoutOrderItem & { productDocumentId: string }>();

  draftItems.forEach((item, index) => {
    const product = productsById.get(item.productId);
    const field = `items.${index}`;

    if (!product) {
      errors[`${field}.productId`] = "Позиция больше не доступна в меню.";
      return;
    }

    if (!product.isAvailable) {
      errors[`${field}.productId`] = "Позиция временно недоступна.";
      return;
    }

    const selectedOptions = normalizeOptions(
      product,
      item.selectedOptions,
      `${field}.selectedOptions`,
      errors
    );
    const cartKey = buildCartItemKey(product.id, selectedOptions);
    const existingItem = itemsByKey.get(cartKey);

    if (existingItem) {
      existingItem.quantity += item.quantity;
      existingItem.totalPrice = existingItem.quantity * existingItem.price;
      return;
    }

    itemsByKey.set(cartKey, {
      cartKey,
      productId: product.id,
      productDocumentId: product.documentId,
      name: product.name,
      sectionTitle: product.sectionTitle,
      quantity: item.quantity,
      price: product.price,
      totalPrice: product.price * item.quantity,
      selectedOptions
    });
  });

  return {
    errors,
    items: Array.from(itemsByKey.values())
  };
}

function buildOrderResponse(
  savedRecord: StrapiRecord,
  fallback: CheckoutOrder
): CheckoutOrder {
  const orderNumber = stringValue(savedRecord.orderNumber, fallback.orderNumber || fallback.id);

  return {
    ...fallback,
    id: orderNumber,
    orderNumber,
    strapiDocumentId: stringValue(
      savedRecord.documentId,
      savedRecord.id ? String(savedRecord.id) : fallback.strapiDocumentId
    ),
    status: "created",
    paymentStatus: "unpaid",
    currency: CURRENCY,
    payment: {
      provider: "none",
      status: "unpaid",
      redirectUrl: null,
      externalPaymentId: null
    },
    createdAt: stringValue(savedRecord.createdAt, fallback.createdAt)
  };
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("Некорректный JSON заказа.");
  }

  const draftResult = normalizeDraft(body);

  if (draftResult.errors || !draftResult.normalized) {
    return jsonError("Проверьте данные заказа.", 400, draftResult.errors);
  }

  try {
    const { productsById, minOrder } = await getCatalogSnapshot();
    const { items, errors } = buildValidatedItems(
      draftResult.normalized.items,
      productsById
    );
    const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);

    if (Object.keys(errors).length) {
      return jsonError("Некоторые позиции заказа изменились.", 409, errors);
    }

    if (totalAmount < minOrder) {
      return jsonError("Сумма заказа меньше минимальной.", 409, {
        totalAmount: `Минимальная сумма заказа ${minOrder} ₽.`
      });
    }

    if (
      draftResult.normalized.frontendTotalAmount > 0 &&
      draftResult.normalized.frontendTotalAmount !== totalAmount
    ) {
      return jsonError("Стоимость заказа изменилась. Обновите корзину.", 409, {
        totalAmount: "Стоимость заказа была пересчитана по актуальному меню."
      });
    }

    const orderNumber = createOrderNumber();
    const createdAt = new Date().toISOString();
    const order: CheckoutOrder = {
      id: orderNumber,
      orderNumber,
      customer: draftResult.normalized.customer,
      delivery: {
        method: draftResult.normalized.delivery.methodLabel,
        methodCode: draftResult.normalized.delivery.methodCode,
        methodLabel: draftResult.normalized.delivery.methodLabel,
        street: draftResult.normalized.delivery.street,
        house: draftResult.normalized.delivery.house,
        entrance: draftResult.normalized.delivery.entrance,
        apartment: draftResult.normalized.delivery.apartment,
        floor: draftResult.normalized.delivery.floor,
        comment: draftResult.normalized.delivery.comment
      },
      deliveryTime: draftResult.normalized.deliveryTime,
      items,
      totalAmount,
      currency: CURRENCY,
      status: "created",
      paymentStatus: "unpaid",
      payment: {
        provider: "none",
        status: "unpaid",
        redirectUrl: null,
        externalPaymentId: null
      },
      privacyAgreement: draftResult.normalized.privacyAgreement,
      createdAt
    };
    const createResponse = await fetchFromStrapi("/api/orders", undefined, {
      method: "POST",
      body: JSON.stringify({
        data: {
          orderNumber,
          orderStatus: "created",
          paymentStatus: "unpaid",
          paymentProvider: "none",
          currency: CURRENCY,
          totalAmount,
          customer: order.customer,
          delivery: order.delivery,
          deliveryTime: order.deliveryTime,
          items,
          pricingSnapshot: {
            itemSubtotal: totalAmount,
            deliveryFee: 0,
            discountTotal: 0,
            minOrder,
            frontendTotalAmount: draftResult.normalized.frontendTotalAmount,
            validatedAt: createdAt
          },
          privacyAgreement: order.privacyAgreement,
          source: SOURCE,
          payment: order.payment
        }
      })
    });
    const savedRecord = unwrapRecord(unwrapData(createResponse));

    const savedOrder = buildOrderResponse(savedRecord, order);

    try {
      await sendOrderEmail(savedOrder);
      savedOrder.notification = { email: "sent" };
    } catch (emailError) {
      savedOrder.notification = { email: "failed" };
      console.error("Unable to send order notification email", emailError);
    }

    return NextResponse.json(
      {
        order: savedOrder
      },
      { status: 201 }
    );
  } catch (error) {
    if (
      error instanceof StrapiRequestError &&
      error.status === 404 &&
      error.path === "/api/orders"
    ) {
      return jsonError(
        "В глобальном Strapi еще не создана коллекция orders. Разверните схему Order перед приемом заказов.",
        502
      );
    }

    console.error("Unable to create Chef's Choice order", error);

    return jsonError("Не удалось создать заказ. Попробуйте еще раз.", 502);
  }
}
