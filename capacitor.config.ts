import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wingycoo.cue',
  appName: 'Cue Notes',
  webDir: 'dist',
  server: {
    url: 'https://wingycoo.github.io/cue/',
    cleartext: false,
    allowNavigation: [
      'accounts.google.com',
      '*.google.com',
      '*.googleapis.com',
      '*.gstatic.com',
    ],
  },
  android: {
    backgroundColor: '#0b0f19',
    allowMixedContent: true,
  },
};

export default config;
