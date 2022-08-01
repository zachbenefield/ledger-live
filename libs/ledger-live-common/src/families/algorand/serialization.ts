import { BigNumber } from "bignumber.js";
import type { AlgorandResourcesRaw, AlgorandResources } from "./types";
export function toAlgorandResourcesRaw(
  r: any
): any {
  const { rewards, nbAssets } = r;
  return {
    rewards: rewards.toString(),
    nbAssets,
  };
}
export function fromAlgorandResourcesRaw(
  r: any
): any {
  const { rewards, nbAssets } = r;
  return {
    rewards: new BigNumber(rewards),
    nbAssets,
  };
}
