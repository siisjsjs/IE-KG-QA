'use client';

import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth';

export function Providers({ children }: { children: React.ReactNode }) {
  const { token, bootstrap } = useAuthStore();

  useEffect(() => {
    if (token) {
      bootstrap();
    }
  }, [token, bootstrap]);

  return <ConfigProvider locale={zhCN}>{children}</ConfigProvider>;
}
