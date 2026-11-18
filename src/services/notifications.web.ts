export async function registerPushToken(_userId: string): Promise<never> {
  throw new Error('Push notifications are only available in the iOS and Android apps.');
}
