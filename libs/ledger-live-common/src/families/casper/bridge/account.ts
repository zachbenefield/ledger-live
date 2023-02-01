import type {
  Account,
  AccountBridge,
  Operation,
  SignOperationEvent,
  BroadcastFnSignature,
  SignOperationFnSignature,
  AccountLike,
} from "@ledgerhq/types-live";
import type { Transaction, TransactionStatus } from "../types";
import { makeAccountBridgeReceive, makeSync } from "../../../bridge/jsHelpers";

import {
  deployHashToString,
  getAccountShape,
  getEstimatedFees,
  getPath,
  isError,
  validateTransferId,
} from "../utils";
import { CLPublicKey, DeployUtil } from "casper-js-sdk";
import BigNumber from "bignumber.js";
import { MINIMUM_VALID_AMOUNT } from "../consts";
import {
  getAddress,
  getPubKeySignature,
  getPublicKeyFromCasperAddress,
  validateAddress,
} from "./utils/addresses";
import { log } from "@ledgerhq/logs";
import { Observable } from "rxjs";
import { withDevice } from "../../../hw/deviceAccess";
import { close } from "../../../hw";
import { encodeOperationId } from "../../../operation";
import CasperApp from "@zondax/ledger-casper";
import {
  AmountRequired,
  CasperInvalidTransferId,
  InvalidAddress,
  InvalidAddressBecauseDestinationIsAlsoSource,
  InvalidMinimumAmount,
  NotEnoughBalance,
  RecipientRequired,
  MayBlockAccount,
} from "@ledgerhq/errors";
import { broadcastTx } from "./utils/network";
import { getMainAccount } from "../../../account/helpers";
import { createNewDeploy } from "./utils/txn";

const receive = makeAccountBridgeReceive();

const createTransaction = (): Transaction => {
  // log("debug", "[createTransaction] creating base tx");

  return {
    family: "casper",
    amount: new BigNumber(0),
    fees: getEstimatedFees(),
    recipient: "",
    useAllAmount: false,
  };
};

const updateTransaction = (t: Transaction, patch: Transaction): Transaction => {
  // log("debug", "[updateTransaction] patching tx");

  return { ...t, ...patch };
};

const prepareTransaction = async (
  a: Account,
  t: Transaction
): Promise<Transaction> => {
  // log("debug", "[prepareTransaction] start fn");

  const { address } = getAddress(a);
  const { recipient, transferId } = t;

  if (recipient && address) {
    // log("debug", "[prepareTransaction] fetching estimated fees");

    if (
      validateAddress(recipient).isValid &&
      validateAddress(address).isValid &&
      validateTransferId(transferId).isValid
    ) {
      if (t.useAllAmount) {
        t.amount = a.spendableBalance.minus(t.fees);
      }

      // t.deploy =
    }
  }

  // log("debug", "[prepareTransaction] finish fn");

  return t;
};

const getTransactionStatus = async (
  a: Account,
  t: Transaction
): Promise<TransactionStatus> => {
  const errors: TransactionStatus["errors"] = {};
  const warnings: TransactionStatus["warnings"] = {};

  const { balance, spendableBalance } = a;
  const { address } = getAddress(a);
  const { recipient, useAllAmount } = t;
  let { amount } = t;

  if (!recipient) errors.recipient = new RecipientRequired();
  else if (!validateAddress(recipient).isValid)
    errors.recipient = new InvalidAddress();
  else if (recipient.toLowerCase() === address.toLowerCase())
    errors.recipient = new InvalidAddressBecauseDestinationIsAlsoSource();

  if (!validateAddress(address).isValid) errors.sender = new InvalidAddress();
  else if (!validateTransferId(t.transferId).isValid) {
    errors.sender = new CasperInvalidTransferId();
  }

  // This is the worst case scenario (the tx won't cost more than this value)
  const estimatedFees = t.fees;

  let totalSpent = BigNumber(0);

  if (useAllAmount) {
    totalSpent = a.spendableBalance;
    amount = totalSpent.minus(estimatedFees);
    if (amount.lte(0) || totalSpent.gt(balance)) {
      errors.amount = new NotEnoughBalance();
    }
  }

  if (!useAllAmount) {
    totalSpent = amount.plus(estimatedFees);
    if (amount.eq(0)) {
      errors.amount = new AmountRequired();
    }

    if (totalSpent.gt(a.spendableBalance)) {
      errors.amount = new NotEnoughBalance();
    }
  }

  if (amount.lt(MINIMUM_VALID_AMOUNT) && !errors.amount)
    errors.amount = new InvalidMinimumAmount();

  if (
    spendableBalance
      .minus(totalSpent)
      .minus(estimatedFees)
      .lt(MINIMUM_VALID_AMOUNT)
  )
    warnings.amount = new MayBlockAccount();

  // log("debug", "[getTransactionStatus] finish fn");

  return {
    errors,
    warnings,
    estimatedFees,
    amount,
    totalSpent,
  };
};

const estimateMaxSpendable = async ({
  account,
  parentAccount,
  transaction,
}: {
  account: AccountLike;
  parentAccount?: Account | null | undefined;
  transaction?: Transaction | null | undefined;
}): Promise<BigNumber> => {
  const a = getMainAccount(account, parentAccount);
  let balance = a.spendableBalance;

  if (balance.eq(0)) return balance;

  const estimatedFees = transaction?.fees ?? getEstimatedFees();

  if (balance.lte(estimatedFees)) return new BigNumber(0);

  balance = balance.minus(estimatedFees);

  // log("debug", "[estimateMaxSpendable] finish fn");

  return balance;
};

const signOperation: SignOperationFnSignature<Transaction> = ({
  account,
  deviceId,
  transaction,
}): Observable<SignOperationEvent> =>
  withDevice(deviceId)(
    (transport) =>
      new Observable((o) => {
        async function main() {
          // log("debug", "[signOperation] start fn");

          const { recipient, useAllAmount } = transaction;
          let { amount } = transaction;
          const { id: accountId, balance } = account;
          const { address, derivationPath } = getAddress(account);

          const casper = new CasperApp(transport);

          try {
            const fee = transaction.fees;
            if (useAllAmount) amount = balance.minus(fee);

            transaction = { ...transaction, amount };

            const deploy = createNewDeploy(
              address,
              recipient,
              transaction.amount,
              transaction.fees,
              transaction.transferId
            );
            // Serialize tx
            const deployBytes = DeployUtil.deployToBytes(deploy);

            log(
              "debug",
              `[signOperation] serialized deploy: [${deployBytes.toString()}]`
            );

            o.next({
              type: "device-signature-requested",
            });

            // Sign by device
            const result = await casper.sign(
              getPath(derivationPath),
              Buffer.from(deployBytes)
            );
            isError(result);

            o.next({
              type: "device-signature-granted",
            });

            // signature verification
            const deployHash = deployHashToString(deploy.hash, true);
            const signature = result.signatureRS;

            const pkBuffer = Buffer.from(
              getPublicKeyFromCasperAddress(address),
              "hex"
            );
            // sign deploy object
            const signedDeploy = DeployUtil.setSignature(
              deploy,
              signature,
              new CLPublicKey(pkBuffer, getPubKeySignature(address))
            );

            const operation: Operation = {
              id: encodeOperationId(accountId, deployHash, "OUT"),
              hash: deployHash,
              type: "OUT",
              senders: [address],
              recipients: [recipient],
              accountId,
              value: amount.plus(fee),
              fee,
              blockHash: null,
              blockHeight: null,
              date: new Date(),
              extra: {
                transferId: transaction.transferId,
              },
            };

            o.next({
              type: "signed",
              signedOperation: {
                operation,
                signature: JSON.stringify(
                  DeployUtil.deployToJson(signedDeploy)
                ),
                expirationDate: null,
              },
            });
          } finally {
            close(transport, deviceId);

            // log("debug", "[signOperation] finish fn");
          }
        }

        main().then(
          () => o.complete(),
          (e) => o.error(e)
        );
      })
  );

const broadcast: BroadcastFnSignature = async ({
  signedOperation: { signature, operation },
}) => {
  // log("debug", "[broadcast] start fn");

  const tx = DeployUtil.deployFromJson(JSON.parse(signature)).unwrap();

  // log("debug", `[broadcast] isDeployOk ${DeployUtil.validateDeploy(tx).ok}`);
  const resp = await broadcastTx(tx);
  const { deploy_hash } = resp;

  // const result = patchOperationWithHash(operation, deploy_hash);
  const result = { ...operation, hash: deploy_hash };

  // log("debug", "[broadcast] finish fn");

  return result;
};

const sync = makeSync({ getAccountShape });

const accountBridge: AccountBridge<Transaction> = {
  estimateMaxSpendable,
  createTransaction,
  updateTransaction,
  getTransactionStatus,
  prepareTransaction,
  sync,
  receive,
  signOperation,
  broadcast,
};

export { accountBridge };
