import React, { useCallback } from "react";
import { BigNumber } from "bignumber.js";
import invariant from "invariant";
import { Account, TransactionCommonRaw } from "@ledgerhq/types-live";
import { getAccountBridge } from "@ledgerhq/live-common/bridge/index";
import FeeSliderField from "~/renderer/components/FeeSliderField";
import { getEnv } from "@ledgerhq/live-env";
import { Range, inferDynamicRange } from "@ledgerhq/live-common/range";
import { Transaction, TransactionRaw, TransactionStatus } from "@ledgerhq/coin-evm/lib/types";

type Props = {
  account: Account;
  transaction: Transaction;
  status: TransactionStatus;
  transactionRaw?: TransactionCommonRaw;
  updateTransaction: (updater: (_: Transaction) => Transaction) => void;
};

const fallbackGasPrice = inferDynamicRange(BigNumber(10e9));
let lastNetworkGasPrice: Range | undefined; // local cache of last value to prevent extra blinks

const FeesField = ({ account, transaction, status, updateTransaction, transactionRaw }: Props) => {
  invariant(transaction.family === "evm", "FeeField: evm family expected");
  const bridge = getAccountBridge(account);
  const onGasPriceChange = useCallback(
    gasPrice => {
      updateTransaction(transaction =>
        bridge.updateTransaction(transaction, {
          gasPrice,
          feesStrategy: "advanced",
        }),
      );
    },
    [updateTransaction, bridge],
  );
  const networkGasPrice = transaction.gasPrice;
  if (!lastNetworkGasPrice && networkGasPrice) {
    lastNetworkGasPrice = inferDynamicRange(networkGasPrice);
  }
  let range = lastNetworkGasPrice || fallbackGasPrice;
  const gasPrice = transaction.gasPrice || range.initial;
  // update gas price range according to previous pending transaction if necessary
  const ethTransactionRaw = transactionRaw as TransactionRaw | undefined;
  if (ethTransactionRaw && ethTransactionRaw.gasPrice) {
    const gaspriceGap: number = getEnv("EDIT_TX_LEGACY_GASPRICE_GAP_SPEEDUP_FACTOR");
    const minNewGasPrice = new BigNumber(ethTransactionRaw.gasPrice).times(1 + gaspriceGap);
    const minValue = BigNumber.max(range.min, minNewGasPrice);
    let maxValue = BigNumber.max(range.max, minNewGasPrice);
    // avoid lower bound = upper bound, which will cause an error in inferDynamicRange
    if (minValue.isEqualTo(maxValue)) {
      maxValue = minValue.times(2);
    }
    range = inferDynamicRange(minValue, {
      minValue,
      maxValue,
    });
  }

  const { units } = account.currency;

  return (
    <FeeSliderField
      range={range}
      defaultValue={range.initial}
      value={gasPrice}
      onChange={onGasPriceChange}
      unit={units.length > 1 ? units[1] : units[0]}
      error={status.errors.gasPrice}
    />
  );
};

export default FeesField;
