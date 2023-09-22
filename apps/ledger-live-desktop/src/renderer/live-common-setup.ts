import "~/live-common-setup-base";
import "~/live-common-set-supported-currencies";
import "./families"; // families may set up their own things

import VaultTransport from "@ledgerhq/hw-transport-vault";
import { registerTransportModule } from "@ledgerhq/live-common/hw/index";
import { retry } from "@ledgerhq/live-common/promise";
import { TraceContext, listen as listenLogs } from "@ledgerhq/logs";
import { getUserId } from "~/helpers/user";
import { setEnvOnAllThreads } from "./../helpers/env";
import { IPCTransport } from "./IPCTransport";
import logger from "./logger";
import { currentMode, setDeviceMode } from "@ledgerhq/live-common/hw/actions/app";

setEnvOnAllThreads("USER_ID", getUserId());

const originalDeviceMode = currentMode;
const vaultTransportPrefixID = "vault-transport:";

// Listens to logs from `@ledgerhq/logs` (happening on the renderer thread) and transfers them to the LLD logger system
listenLogs(({ id, date, ...log }) => {
  if (log.type === "hid-frame") return;

  logger.debug(log);
});

// This defines our IPC Transport that will proxy to an internal process (we shouldn't use node-hid on renderer)
registerTransportModule({
  id: "ipc",
  open: (id: string, timeoutMs?: number, context?: TraceContext) => {
    // id could be another type of transport such as vault-transport
    if (id.startsWith(vaultTransportPrefixID)) return;

    if (originalDeviceMode !== currentMode) {
      setDeviceMode(originalDeviceMode);
    }
    return retry(() => IPCTransport.open(id, timeoutMs, context));
  },
  disconnect: () => Promise.resolve(),
});

registerTransportModule({
  id: "vault-transport",
  open: (id: string) => {
    if (!id.startsWith(vaultTransportPrefixID)) return;
    setDeviceMode("polling");
    const params = new URLSearchParams(id.split(vaultTransportPrefixID)[1]);
    return retry(() =>
      VaultTransport.open(params.get("host") as string).then(transport => {
        transport.setData({
          token: params.get("token") as string,
          workspace: params.get("workspace") as string,
        });
        return Promise.resolve(transport);
      }),
    );
  },
  disconnect: () => {
    return Promise.resolve();
  },
});
