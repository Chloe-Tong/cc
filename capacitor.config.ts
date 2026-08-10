import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: 'com.chloe.dukou',
  appName: '渡口',
  webDir: 'dist',
  server: {
    iosScheme: 'http',
    hostname: 'localhost'
  },
  plugins: {
    CapacitorHttp: { enabled: false },
    Keyboard: {
      resize: KeyboardResize.None
    },
    LocalNotifications: {
      presentationOptions: ['badge', 'sound', 'banner', 'list']
    }
  }
};

export default config;
