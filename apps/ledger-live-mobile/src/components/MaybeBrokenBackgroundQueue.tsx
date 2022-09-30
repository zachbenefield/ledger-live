import React, { useCallback, useState, useEffect } from "react";
import BleTransport from "@ledgerhq/hw-transport-react-native-ble";
import { useNavigation } from "@react-navigation/native";

import { Box, IconBox, Icons, Text, Button } from "@ledgerhq/native-ui";
import { ScreenName, NavigatorName } from "../const";

import BottomModal from "./BottomModal";

const MaybeBrokenBackgroundQueue = () => {
  const [pendingActions, setPendingActions] = useState([]);
  const [dismissed, setDismissed] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    let consumed = false;
    async function fetchMaybePendingQueue() {
      const actions = await BleTransport.getPendingQueue();
      if (actions && !consumed) {
        setPendingActions(actions);
      }
    }
    fetchMaybePendingQueue();

    return () => {
      consumed = true;
    };
  });

  const onDismissPendingQueue = useCallback(() => {
    let consumed = false;
    async function dismissPendingQueue() {
      await BleTransport.dismissPendingQueue();
      if (consumed) return;
      setPendingActions([]);
    }
    dismissPendingQueue();

    return () => {
      consumed = true;
    };
  }, []);

  const onResumePendingQueue = useCallback(() => {
    const appsToRestore = [];
    const appsToRemove = [];

    pendingActions.forEach(({ operation, appName }) => {
      operation === "uninstall"
        ? appsToRemove.push(appName)
        : appsToRestore.push(appName);
    });

    console.log("wadus", { appsToRemove, appsToRestore });

    navigation.navigate(NavigatorName.Manager, {
      screen: ScreenName.Manager,
      params: { appsToRestore, appsToRemove },
    });
  }, [navigation, pendingActions]);

  return (
    <BottomModal
      id="PendingActionsAndWhatnot"
      isOpened={pendingActions.length && !dismissed}
      onClose={() => setDismissed(true)}
    >
      <Box mb={7} alignItems={"center"}>
        <IconBox Icon={Icons.NanoXMedium} iconSize={24} boxSize={64} />
      </Box>
      <Text variant={"h2"} textAlign={"center"} numberOfLines={3} mb={8}>
        {`${pendingActions.length} pending operations`}
      </Text>
      <Text textAlign={"center"} mb={8}>
        {
          "We couldn't complete all app installs on your Nano X. You can resume this where we left of or cancel it"
        }
      </Text>
      <Button
        mb={5}
        onPress={onDismissPendingQueue}
        event="ignoretasks"
        outline
        type={"shade"}
      >
        {"Cancel"}
      </Button>
      <Button onPress={onResumePendingQueue} event="continue" type={"main"}>
        {"Resume"}
      </Button>
    </BottomModal>
  );
};

export default MaybeBrokenBackgroundQueue;
