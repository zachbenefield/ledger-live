import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { getAccountBridge } from "@ledgerhq/live-common/bridge/index";
import Input from "~/renderer/components/Input";
import invariant from "invariant";
import {
  CosmosAccount,
  Transaction,
  TransactionStatus,
} from "@ledgerhq/live-common/families/cosmos/types";
const MemoValueField = ({
  onChange,
  account,
  transaction,
  status,
}: {
  onChange: (transaction: Transaction) => void;
  account: CosmosAccount;
  transaction: Transaction;
  status: TransactionStatus;
}) => {
  const { t } = useTranslation();
  invariant(transaction.family === "cosmos", "MemoTypeField: cosmos family expected");
  const bridge = getAccountBridge(account);
  const onMemoValueChange = useCallback(
    (memo: string) => {
      onChange(
        bridge.updateTransaction(transaction, {
          memo,
        }),
      );
    },
    [onChange, transaction, bridge],
  );

  // We use transaction as an error here.
  // It will be usefull to block a memo wrong format
  // on the ledger-live mobile
  return (
    <Input
      warning={status.warnings.transaction}
      error={status.errors.transaction}
      value={transaction.memo as string | undefined} // FIXME: why is it null ?
      onChange={onMemoValueChange}
      placeholder={t("families.cosmos.memoPlaceholder")}
    />
  );
};
export default MemoValueField;
