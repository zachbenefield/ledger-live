// @flow
import type { TFunction } from "react-i18next";
import type { Device } from "@ledgerhq/live-common/hw/actions/types";
import type { Step } from "~/renderer/components/Stepper";

import type { Account, TransactionStatus, Operation } from "@ledgerhq/live-common/types/index";

//import type { Transaction } from "@ledgerhq/live-common/families/algorand/types";

export type StepId = "assets" | "connectDevice" | "confirmation";

export type TransactionCommon = {
  amount: BigNumber;
  recipient: string;
  useAllAmount?: boolean;
  subAccountId?: string | null | undefined;
  feesStrategy?: "slow" | "medium" | "fast" | "custom" | null;
};

export type AlgorandOperationMode = "send" | "optIn" | "claimReward";

export type AlgorandTransaction = TransactionCommon & {
  family: "algorand";
  mode: AlgorandOperationMode;
  fees: BigNumber | null | undefined;
  assetId: string | null | undefined;
  memo: string | null | undefined;
};

export type StepProps = {
  t: TFunction,
  transitionTo: string => void,
  device: ?Device,
  account: ?Account,
  parentAccount: ?Account,
  onRetry: void => void,
  onClose: () => void,
  openModal: (key: string, config?: any) => void,
  optimisticOperation: *,
  error: *,
  warning: *,
  signed: boolean,
  transaction: ?AlgorandTransaction,
  status: TransactionStatus,
  onChangeTransaction: AlgorandTransaction => void,
  onUpdateTransaction: ((AlgorandTransaction) => AlgorandTransaction) => void,
  onTransactionError: Error => void,
  onOperationBroadcasted: Operation => void,
  setSigned: boolean => void,
  bridgePending: boolean,
};

export type St = Step<StepId, StepProps>;
