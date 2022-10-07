// @flow
import { Subject } from "rxjs";
import { withDevice } from "@ledgerhq/live-common/hw/deviceAccess";
import type { ConnectAppEvent } from "@ledgerhq/live-common/hw/connectApp";

export type BidirectionalEvent =
  | ConnectAppEvent
  | {
      type: "device-request",
      data: string,
    }
  | {
      type: "device-response",
      data: string,
    };

const cmd = (): Observable<Result> => {
  const subject = new Subject();

  withDevice("")(transport => {
    // The input part of the bidirectional communication
    subject.subscribe({
      next: e => {
        /**
         * Receiving an event from the ipc bridge allows us to pass a msg
         * into an ongoing withDevice job. Allowing to exchange messages with the
         * transport exposed from the job.
         */
        if (e?.type === "input-frame") {
          subject.next({ type: "device-request", data: e.apduHex });
          // TODO important avoiding collisions, also types will be broken
          transport
            .exchange(Buffer.from(e.apduHex, "hex"))
            .then(response => subject.next({ type: "device-response", data: response.toString() }))
            .catch(error => subject.next({ type: "error", error }));
        }
      },
      /**
       * Completing the subject completes the observable for the withDevice job
       * meaning we have a way to complete this long-running job from outside itself.
       */
      complete: subject.complete,
    });

    return subject;
  }).toPromise();

  return subject;
};

export default cmd;
