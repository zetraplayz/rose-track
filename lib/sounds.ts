// MOCK: expo-av is missing its native modules in this Expo Go environment.
// To allow the app to run, we mock the sound functions.

export const playCheerSound = async () => {
  console.log('Mocked: playCheerSound');
};

export const playAlarmSound = async () => {
  console.log('Mocked: playAlarmSound');
};

export const unloadSounds = async () => {
  console.log('Mocked: unloadSounds');
};
