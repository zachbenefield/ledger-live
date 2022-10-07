import { useEffect, useRef, useState } from "react";
import { Observable, of } from "rxjs";
import { catchError, scan } from "rxjs/operators";

import { createAction as createAppAction } from "@ledgerhq/live-common/hw/actions/app";
import { Device } from "@ledgerhq/live-common/hw/actions/types";

const mapResult = state => state; // TODO don't know if we'd need result as a final value
const initialState = {
  isLoading: true,
  error: undefined,
  loading: true,
  freezeReduxDevice: false,
};

const reducer = (state: State, e: any) => {
  switch (e.type) {
    case "device-request":
      return { ...state, lastRequest: e.data };

    case "device-response":
      return {
        ...state,
        lastResponse: e.data,
      };

    case "error":
      return {
        ...state,
        error: e.error,
      };
      return state;
  }
};

function useFrozenValue<T>(value: T, frozen: boolean): T {
  const [state, setState] = useState(value);
  useEffect(() => {
    if (!frozen) {
      setState(value);
    }
  }, [value, frozen]);
  return state;
}

export const createAction = (
  connectAppExec: (arg0: ConnectAppInput) => Observable<ConnectAppEvent>,
  bidirectionalTestExec: (arg0: InitSwapInput) => Subject<any>,
): InitSwapAction => {
  const useHook = (reduxDevice: Device | null | undefined): InitSwapState => {
    const [state, setState] = useState(initialState);
    const reduxDeviceFrozen = useFrozenValue(reduxDevice, state?.freezeReduxDevice);
    const appState = createAppAction(connectAppExec).useHook(reduxDeviceFrozen, {
      appName: "BOLOS",
    });
    const { device, opened, error } = appState;
    const hasError = error || state.error;
    const subject = useRef();

    useEffect(() => {
      // Once this is true, we've completed the connectApp part, losing the device would
      // throw an error after this point, it would be handled before.
      if (!opened || !device) {
        setState({ ...initialState, isLoading: !!device });
        return;
      }
      subject.current = bidirectionalTestExec({ deviceId: "" }); // TODO, for LLM we need actual id
      subject.current
        .pipe(
          catchError((error: Error) =>
            of({
              type: "error",
              error,
            }),
          ),
          scan(reducer, { ...initialState, isLoading: !hasError }),
        )
        .subscribe(newState => {
          if (!newState) return; // FIXME tere's an undefined event breaking this
          setState(newState);
        });

      setTimeout(() => {
        // Test sending something to the subject, since initially there's nothing
        subject.current.next({ type: "input-frame", apduHex: "e001000000" });
      }, 2000);

      return () => {
        // subject.current?.complete(); // Not sure if we need to do this
      };
      // Be careful about re renders, since the command remains open.
    }, [device, opened, hasError]);

    return {
      ...appState,
      ...state,
      subject: subject.current,
    };
  };

  return {
    useHook,
    mapResult,
  };
};
