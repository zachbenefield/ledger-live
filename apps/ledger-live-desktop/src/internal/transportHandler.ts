import { Subject, Observable } from "rxjs";
import TransportNodeHidSingleton from "@ledgerhq/hw-transport-node-hid-singleton";
import { withDevice } from "@ledgerhq/live-common/hw/deviceAccess";
import { DisconnectedDeviceDuringOperation, serializeError } from "@ledgerhq/errors";
import {
  transportCloseChannel,
  transportExchangeChannel,
  transportExchangeBulkChannel,
  transportOpenChannel,
  transportExchangeBulkUnsubscribeChannel,
  transportListenChannel,
} from "~/config/transportChannels";
import { MessagesMap } from "./types";
import { LocalTracer, trace } from "@ledgerhq/logs";

const LOG_TYPE = "internal-transport-handler";

type APDUMessage =
  | { type: "exchange"; apduHex: string; requestId: string; abortTimeoutMs?: number }
  | { type: "exchangeBulk"; apdusHex: string[]; requestId: string }
  | { type: "exchangeBulkUnsubscribe"; requestId: string };

const transports = new Map<string, Subject<APDUMessage>>();
const transportsBulkSubscriptions = new Map<string, { unsubscribe: () => void }>();

export const transportOpen = ({ data, requestId }: MessagesMap["transport:open"]) => {
  const { descriptor, timeoutMs, context } = data;
  const tracer = new LocalTracer(LOG_TYPE, { ...context, function: "transportOpen" });
  tracer.trace("Received open transport request", { descriptor, timeoutMs });

  const subjectExist = transports.get(descriptor);

  const onEnd = () => {
    process.send?.({
      type: transportOpenChannel,
      data,
      requestId,
    });
  };

  // If already exists simply return success
  if (subjectExist) {
    tracer.trace("Transport subject instance already exists");
    return onEnd();
  }

  // TODO: HERE
  // Note: this is forcing the usage of `withDevice`, and `withTransport`
  // from `libs/ledger-live-common/src/deviceSDK/transports/core.ts` is not handled and will be "mapped" to this `withDevice`
  // WAIT: from a transport from `withTransport`, `refreshTransport` only closes, then re-open and setup a transport.
  // This could be handled correctly even if through IPC, as long as the close action is triggered correctly on the transport living
  // in the internal thread.
  withDevice(data.descriptor, { openTimeoutMs: timeoutMs })(transport => {
    const subject = new Subject<APDUMessage>();
    subject.subscribe({
      next: e => {
        tracer.trace(`Handling an action on the internal transport instance`, { e });

        if (e.type === "exchange") {
          transport
            .exchange(Buffer.from(e.apduHex, "hex"), { abortTimeoutMs: e.abortTimeoutMs })
            .then(response => {
              tracer.trace(`Exchange response`, { response });

              process.send?.({
                type: transportExchangeChannel,
                data: response.toString("hex"),
                requestId: e.requestId,
              });
            })
            .catch(error => {
              tracer.trace(`Exchange error`, { error });

              process.send?.({
                type: transportExchangeChannel,
                error: serializeError(error),
                requestId: e.requestId,
              });
            });
        } else if (e.type === "exchangeBulk") {
          const apdus = e.apdusHex.map(apduHex => Buffer.from(apduHex, "hex"));
          const subscription = transport.exchangeBulk(apdus, {
            next: response => {
              process.send?.({
                type: transportExchangeBulkChannel,
                data: response.toString("hex"),
                requestId: e.requestId,
              });
            },
            error: error => {
              process.send?.({
                type: transportExchangeBulkChannel,
                error: serializeError(error as Parameters<typeof serializeError>[0]),
                requestId: e.requestId,
              });
            },
            complete: () => {
              process.send?.({
                type: transportExchangeBulkChannel,
                requestId: e.requestId,
              });
            },
          });
          transportsBulkSubscriptions.set(e.requestId, subscription);
        } else if (e.type === "exchangeBulkUnsubscribe") {
          const subscription = transportsBulkSubscriptions.get(e.requestId);
          if (subscription) {
            subscription.unsubscribe();
            transportsBulkSubscriptions.delete(e.requestId);
          }
        }
      },
      // TODO: async or not async ?
      complete: async () => {
        tracer.trace("Cleaning transport subject");
        await transport.close();
        transports.delete(data.descriptor);
      },
    });

    transports.set(data.descriptor, subject);

    onEnd();

    return subject;
  }).subscribe({
    error: error => {
      process.send?.({
        type: transportOpenChannel,
        error: serializeError(error),
        requestId,
      });
    },
  });
};

export const transportExchange = ({ data, requestId }: MessagesMap["transport:exchange"]) => {
  const { descriptor, apduHex, abortTimeoutMs } = data;
  const subject = transports.get(descriptor);

  if (!subject) {
    process.send?.({
      type: transportExchangeChannel,
      error: serializeError(
        new DisconnectedDeviceDuringOperation("No open transport for the given descriptor"),
      ),
      requestId,
    });
    return;
  }

  subject.next({ type: "exchange", apduHex, requestId, abortTimeoutMs });
};

export const transportExchangeBulk = ({
  data,
  requestId,
}: MessagesMap["transport:exchangeBulk"]) => {
  const subject = transports.get(data.descriptor);
  if (!subject) {
    process.send?.({
      type: transportExchangeBulkChannel,
      error: serializeError(
        new DisconnectedDeviceDuringOperation("No open transport for the given descriptor"),
      ),
      requestId,
    });
    return;
  }
  // apduHex isn't used for bulk case
  subject.next({ type: "exchangeBulk", apdusHex: data.apdusHex, requestId });
};

export const transportExchangeBulkUnsubscribe = ({
  data,
  requestId,
}: MessagesMap["transport:exchangeBulk:unsubscribe"]) => {
  const subject = transports.get(data.descriptor);
  if (!subject) {
    process.send?.({
      type: transportExchangeBulkUnsubscribeChannel,
      error: serializeError(
        new DisconnectedDeviceDuringOperation("No open transport for the given descriptor"),
      ),
      requestId,
    });
    return;
  }
  subject.next({ type: "exchangeBulkUnsubscribe", requestId });
};

const transportListenListeners = new Map<string, { unsubscribe: () => void }>();

export const transportListen = ({ requestId }: MessagesMap["transport:listen"]) => {
  const observable = new Observable(TransportNodeHidSingleton.listen);
  const subscription = observable.subscribe({
    next: e => {
      process.send?.({
        type: transportListenChannel,
        data: e,
        requestId,
      });
    },
    error: error => {
      process.send?.({
        type: transportListenChannel,
        error: serializeError(error),
        requestId,
      });
    },
  });
  transportListenListeners.set(requestId, subscription);
};

export const transportListenUnsubscribe = ({
  requestId,
}: MessagesMap["transport:listen:unsubscribe"]) => {
  const listener = transportListenListeners.get(requestId);
  if (listener) {
    listener.unsubscribe();
    transportListenListeners.delete(requestId);
  }
};

export const transportClose = ({ data, requestId }: MessagesMap["transport:close"]) => {
  trace({
    type: LOG_TYPE,
    message: "Received open transport request",
    context: { data, requestId },
  });

  const subject = transports.get(data.descriptor);
  if (!subject) {
    process.send?.({
      type: transportCloseChannel,
      error: serializeError(
        new DisconnectedDeviceDuringOperation("No open transport for the given descriptor"),
      ),
      requestId,
    });
    return;
  }
  subject.subscribe({
    complete: () => {
      trace({ type: LOG_TYPE, message: "Close complete", context: { data, requestId } });
      process.send?.({
        type: transportCloseChannel,
        data,
        requestId,
      });
    },
  });
  subject.complete();
};
