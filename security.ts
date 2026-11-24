import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

const PIN_KEY = 'mon_budget_pin';

export async function setPin(pin:string) {
  if (!/^\d{4,6}$/.test(pin)) throw new Error('Le PIN doit contenir 4 à 6 chiffres.');
  await SecureStore.setItemAsync(PIN_KEY,pin);
}
export async function verifyPin(pin:string) {
  const saved = await SecureStore.getItemAsync(PIN_KEY);
  return !!saved && saved === pin;
}
export async function hasPin() {
  return !!(await SecureStore.getItemAsync(PIN_KEY));
}
export async function authenticateBiometric() {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  if (!compatible || !enrolled) return false;
  const result = await LocalAuthentication.authenticateAsync({promptMessage:'Déverrouiller MON BUDGET',fallbackLabel:'Utiliser le PIN'});
  return result.success;
}
