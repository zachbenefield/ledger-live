import { useCallback, useEffect } from "react";
import { getCryptoCurrencyIds, isCurrencyInCatalog } from "./helpers";
import { useRampCatalogContext } from "./index";
import type { CryptoCurrency } from "@ledgerhq/wallet-api-core/lib/currencies/types";

type UseRampCatalog = {
  isCurrencyAvailable: (
    currencyId: CryptoCurrency["id"] | string,
    mode: "onRamp" | "offRamp",
  ) => boolean | null;
  getSupportedCryptoCurrencyIds: (mode: "onRamp" | "offRamp") => CryptoCurrency["id"][] | null;
};

export function useRampCatalog(): UseRampCatalog {
  const state = useRampCatalogContext();

  useEffect(() => {}, [state.value]);

  /** @param mode "onRamp" for can buy, "offRamp" for can sell. */
  const getSupportedCryptoCurrencyIds = useCallback(
    (mode: "onRamp" | "offRamp") => {
      if (!state.value) {
        return null;
      }
      return getCryptoCurrencyIds(state.value[mode]);
    },
    [state.value],
  );

  /** @param mode "onRamp" for can buy, "offRamp" for can sell.
   * @returns true if the currency is supported, false if not, null if the catalog is not loaded yet.
   */
  const isCurrencyAvailable = useCallback(
    (currencyId: CryptoCurrency["id"] | string, mode: "onRamp" | "offRamp") => {
      if (!state.value) {
        return null;
      }
      return isCurrencyInCatalog(currencyId, state.value, mode);
    },
    [state.value],
  );

  return {
    getSupportedCryptoCurrencyIds,
    isCurrencyAvailable,
  };
}
