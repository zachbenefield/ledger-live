import React, { useMemo } from "react";
import { createAction } from "@ledgerhq/live-common/lib/hw/actions/app";
import connectApp from "@ledgerhq/live-common/lib/hw/connectApp";
import { Text } from "@ledgerhq/native-ui";
import TranslatedError from "../TranslatedError";

type Props = {
  dependencies?: string[];
  device: Device;
  onResult: () => void;
};

const action = createAction(connectApp);

export default function DashboardRequireApps({
  dependencies = [],
  device,
  onResult,
}: Props) {
  const commandRequest = useMemo(
    () => ({
      dependencies: [{ appName: "Bitcoin" }, { appName: "Dogecoin" }],
      appName: "BOLOS",
      withInlineInstallProgress: true,
    }),
    [],
  );
  const formatProgress = raw => Math.round((raw || 0) * 100);
  const status: any = action.useHook(device, commandRequest);

  const {
    allowManagerRequestedWording,
    listingApps,
    unresponsive,
    error,
    isLoading,
    currentAppOp,
    itemProgress,
    opened,
  } = status;

  if (opened) {
    onResult(); // Maybe introduce a result like we do on device action
    return <Text>{"All done!"}</Text>;
  }

  if (allowManagerRequestedWording) {
    return <Text>{"Allow on device"}</Text>;
  }

  if (error) {
    return (
      <Text>
        <TranslatedError error={error} field="description" />
      </Text>
    );
  }

  if (listingApps) {
    return <Text>{"Resolving dependencies"}</Text>;
  }

  if (isLoading || (!isLoading && !device) || unresponsive || !currentAppOp) {
    return <Text>{"Loading ..."}</Text>;
  }

  return (
    <Text variant="bodyLineHeight">{`Installing ${
      currentAppOp?.name
    } ${formatProgress(itemProgress)}%`}</Text>
  );
}
