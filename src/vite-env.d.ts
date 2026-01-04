/*
 * @Author: xujiayu xujiayu@motern.com
 * @Date: 2025-12-17 17:25:06
 * @LastEditors: xujiayu xujiayu@motern.com
 * @LastEditTime: 2026-01-04 18:20:49
 * @FilePath: \working-afk-simulator\src\vite-env.d.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
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
  windowApi: {
    resizeWindow: (width: number, height: number, horizontalAlign?: 'left' | 'right') => void;
  };
}
