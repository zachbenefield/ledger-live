import { getAccountBridge } from "@ledgerhq/live-common/bridge/index";
// TODO: should import from coin-evm
import { useFeesStrategy } from "@ledgerhq/live-common/families/ethereum/react";
import { EIP1559ShouldBeUsed } from "@ledgerhq/live-common/families/ethereum/transaction";
import { AccountBridge } from "@ledgerhq/types-live";
import React, { useCallback, useState } from "react";
import SendFeeMode from "~/renderer/components/SendFeeMode";
import { ContextValue, context } from "~/renderer/drawers/Provider";
import GasLimitField from "./GasLimitField";
import GasPriceField from "./GasPriceField";
import MaxFeeField from "./MaxFeeField";
import PriorityFeeField from "./PriorityFeeField";
import SelectFeeStrategy from "./SelectFeeStrategy";
import { EvmFamily } from "./types";
import { Transaction } from "@ledgerhq/coin-evm/lib/types";

const Root: NonNullable<EvmFamily["sendAmountFields"]>["component"] = props => {
  const { account, updateTransaction, transaction } = props;
  const bridge: AccountBridge<Transaction> = getAccountBridge(account);
  const { state: drawerState, setDrawer } = React.useContext<ContextValue>(context);

  const defaultStrategies = useFeesStrategy(transaction);
  const [isAdvanceMode, setAdvanceMode] = useState(!transaction.feesStrategy);
  const strategies = defaultStrategies;

  const onFeeStrategyClick = useCallback(
    ({ amount, feesStrategy, extra }) => {
      updateTransaction((tx: Transaction) =>
        bridge.updateTransaction(tx, {
          gasPrice: amount,
          maxFeePerGas: extra?.maxFeePerGas,
          maxPriorityFeePerGas: extra?.maxPriorityFeePerGas,
          feesStrategy,
        }),
      );
      if (drawerState.open) setDrawer(undefined);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [updateTransaction, bridge],
  );

  return (
    <>
      <SendFeeMode isAdvanceMode={isAdvanceMode} setAdvanceMode={setAdvanceMode} />
      {isAdvanceMode ? (
        EIP1559ShouldBeUsed(account.currency) ? (
          <>
            <PriorityFeeField {...props} />
            <MaxFeeField {...props} />
            <GasLimitField {...props} />
          </>
        ) : (
          <>
            <GasPriceField {...props} />
            <GasLimitField {...props} />
          </>
        )
      ) : (
        <>
          <SelectFeeStrategy strategies={strategies} onClick={onFeeStrategyClick} {...props} />
        </>
      )}
    </>
  );
};

export default {
  component: Root,
  fields: ["feeStrategy", "gasLimit", "gasPrice"],
};
