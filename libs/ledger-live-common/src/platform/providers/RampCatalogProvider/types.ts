import { CryptoCurrency } from "@ledgerhq/wallet-api-core/lib/currencies/types";

export type PaymentServiceProvider =
  | "visa"
  | "mastercard"
  | "maestro"
  | "paypal"
  | "sepa"
  | "ach"
  | "applepay"
  | "googlepay";

export type CurrenciesPerProvider = Record<
  BuyServiceProvider | string,
  Array<CryptoCurrency["id"]>
>;

export type RampCatalog = {
  onRamp: CurrenciesPerProvider;
  offRamp: CurrenciesPerProvider;
};

export type BuyServiceProvider =
  | "transak"
  | "coinify"
  | "moonpay"
  | "btcdirect"
  | "mercuryo"
  | "paypal"
  | "banxa"
  | "sardine"
  | "juno"
  | "simplex"
  | "loopipay"
  | "ramp";
