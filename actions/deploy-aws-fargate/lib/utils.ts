import {
  KnownFargateAppTypes,
  KnownFargateTaskTypes,
  allAppTypes,
  knownFargateAppTypes,
  knownFargateTaskTypes,
} from './types';

export function isFargateAppType(appType: string): appType is KnownFargateAppTypes {
  return !!appType && knownFargateAppTypes.includes(appType as KnownFargateAppTypes);
}

export function isFargateTaskType(appType: string): appType is KnownFargateTaskTypes {
  return !!appType && knownFargateTaskTypes.includes(appType as KnownFargateTaskTypes);
}

export function isValidAppType(
  appType: string,
): appType is KnownFargateAppTypes | KnownFargateTaskTypes {
  return !!appType && allAppTypes.includes(appType);
}
