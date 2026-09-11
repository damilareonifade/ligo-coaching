import { Platform } from 'react-native';

import { mmkvStorage } from '@/store/mmkvStorage';

const DEVICE_ID_KEY = 'ligo.device.id';

export interface DeviceIdentity {
  readonly deviceId: string;
  readonly deviceName: string;
}

/**
 * A stable id for this install.
 *
 * Not from a native UUID source on purpose: `expo-crypto` and friends are
 * native modules, and adding one costs every developer a rebuild for a value
 * that is neither a secret nor a security boundary. It only has to stay the
 * same on one device and differ from that person's other devices, so time
 * plus two random components is sufficient — and it is generated once, then
 * persisted in MMKV.
 */
function generateDeviceId(): string {
  const random = () => Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${random()}-${random()}`;
}

/**
 * A human label for the device list.
 *
 * `Platform.constants` is part of React Native itself — on Android it carries
 * the model and release, on iOS the system name and version — so this needs
 * no `expo-device` dependency.
 */
function readDeviceName(): string {
  const constants: Record<string, unknown> = Platform.constants ?? {};

  const pick = (key: string): string | null => {
    const value = constants[key];
    return typeof value === 'string' && value.length > 0 ? value : null;
  };

  if (Platform.OS === 'android') {
    const model = pick('Model') ?? pick('Brand') ?? 'Android device';
    const release = pick('Release');
    return release ? `${model} (Android ${release})` : model;
  }

  if (Platform.OS === 'ios') {
    const system = pick('systemName') ?? 'iOS';
    const version = pick('osVersion');
    const idiom = pick('interfaceIdiom');
    const base = idiom === 'pad' ? 'iPad' : 'iPhone';
    return version ? `${base} (${system} ${version})` : `${base} (${system})`;
  }

  return 'Web browser';
}

export async function deviceIdentity(): Promise<DeviceIdentity> {
  const stored = mmkvStorage.getItem(DEVICE_ID_KEY);
  const existing = stored instanceof Promise ? await stored : stored;

  if (typeof existing === 'string' && existing.length > 0) {
    return { deviceId: existing, deviceName: readDeviceName() };
  }

  const deviceId = generateDeviceId();
  await mmkvStorage.setItem(DEVICE_ID_KEY, deviceId);
  return { deviceId, deviceName: readDeviceName() };
}
