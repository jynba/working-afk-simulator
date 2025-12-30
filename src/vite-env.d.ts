/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface Window {
  electronApi: {
    openFileDialog: () => Promise<string | null>;
    showNotification: (args: { title: string; body: string }) => void;
  };
  secureStoreApi: {
    setTapdConfig: (config: any) => void;
    getTapdConfig: () => Promise<any>;
  };
  shellApi: {
    openUrl: (url: string) => void;
  };
}
