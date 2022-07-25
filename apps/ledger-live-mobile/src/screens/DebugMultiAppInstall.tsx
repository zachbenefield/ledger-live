import React, { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { useFeature } from "@ledgerhq/live-common/lib/featureFlags";
import { useSelector } from "react-redux";
import { Text, VerticalTimeline } from "@ledgerhq/native-ui";
import { useTranslation } from "react-i18next";

import NavigationScrollView from "../components/NavigationScrollView";
import DashboardRequireApps from "../components/DeviceAction/DashboardRequireApps";
import SelectDevice from "../components/SelectDevice";

export default function DebugMultiAppInstall() {
  // const feature = useFeature("deviceInitialApps");
  const { colors } = useTheme();
  const { t } = useTranslation();

  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setOnCompleted] = useState(false);

  const [list, setList] = useState([
    // Make it use the feature flag config from above or last seen.
    { appName: "Bitcoin" },
    { appName: "Dogecoin" },
  ]);
  const [device, setDevice] = useState(null);

  const formatEstimatedTime = (estimatedTime: number) =>
    t("syncOnboarding.estimatedTimeFormat", {
      estimatedTime: estimatedTime / 60,
    });

  return (
    <NavigationScrollView>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        {device ? (
          <VerticalTimeline
            steps={[
              {
                key: "fakeStep0",
                title: "Step 0 - Introduction",
                status: "completed",
                renderBody: () => (
                  <Text variant="bodyLineHeight">{"Some initial step"}</Text>
                ),
              },
              {
                key: "fakeStep1",
                title: "Step 1 - Ask user to install",
                status: isRunning || isCompleted ? "completed" : "active",
                renderBody: () => (
                  <Text
                    variant="bodyLineHeight"
                    onPress={() => setIsRunning(true)}
                  >
                    {"Dummy CTA, click to start"}
                  </Text>
                ),
              },
              {
                key: "fakeStep1",
                title: "Step 3 - App dependencies",
                status: isCompleted
                  ? "completed"
                  : isRunning
                  ? "active"
                  : "inactive",
                estimatedTime: 120,
                renderBody: isDisplayed =>
                  isRunning && isDisplayed ? (
                    <DashboardRequireApps
                      device={device}
                      onResult={() => setOnCompleted(true)}
                      dependencies={list}
                    />
                  ) : !isDisplayed ? (
                    <Text variant="bodyLineHeight">{""}</Text>
                  ) : (
                    <Text variant="bodyLineHeight">{""}</Text>
                  ),
              },
              {
                key: "fakeStep3",
                title: "Step 4 - Finished",
                status: isCompleted ? "active" : "inactive",
                renderBody: () => (
                  <Text variant="bodyLineHeight">{"We're done!"}</Text>
                ),
              },
            ]}
            formatEstimatedTime={formatEstimatedTime}
          />
        ) : (
          <SelectDevice onSelect={setDevice} />
        )}
      </View>
    </NavigationScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flexGrow: 1,
    padding: 16,
  },
  box: {
    padding: 10,
  },
});
