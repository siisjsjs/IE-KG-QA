'use client';

import { Layout, Menu, Spin, Button, Typography } from 'antd';
import {
  BookOutlined,
  QuestionCircleOutlined,
  ShareAltOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  AppstoreOutlined,
  DashboardOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { MenuProps } from 'antd';
import type { MenuNode } from '@/lib/types';
import { useAuthStore } from '@/store/auth';

const { Header, Sider, Content } = Layout;

function iconByName(name?: string) {
  switch ((name ?? '').toLowerCase()) {
    case 'book':
    case 'docs':
    case 'document':
    case 'bookoutlined':
      return <BookOutlined />;
    case 'qa':
    case 'question':
    case 'questioncircleoutlined':
      return <QuestionCircleOutlined />;
    case 'kg':
    case 'graph':
    case 'sharealtoutlined':
      return <ShareAltOutlined />;
    case 'monitor':
    case 'dashboard':
    case 'dashboardoutlined':
      return <DashboardOutlined />;
    case 'users':
    case 'team':
    case 'teamoutlined':
      return <TeamOutlined />;
    case 'roles':
    case 'safety':
    case 'safetycertificateoutlined':
      return <SafetyCertificateOutlined />;
    case 'menus':
    case 'appstore':
    case 'appstoreoutlined':
      return <AppstoreOutlined />;
    default:
      return undefined;
  }
}

function toMenuItems(nodes: MenuNode[]): MenuProps['items'] {
  return nodes
    .slice()
    .sort((a, b) => a.sort - b.sort)
    .map((n) => {
      const children = n.children?.length ? toMenuItems(n.children) : undefined;
      const key = n.path || n.id;
      return {
        key,
        icon: iconByName(n.icon),
        label: n.path ? <Link href={n.path}>{n.title}</Link> : n.title,
        children,
      };
    });
}

function flattenPaths(nodes: MenuNode[], acc: string[] = []) {
  for (const n of nodes) {
    if (n.path) acc.push(n.path);
    if (n.children?.length) flattenPaths(n.children, acc);
  }
  return acc;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const { user, menus, loading, logout } = useAuthStore();

  const items = useMemo(() => toMenuItems(menus), [menus]);
  const allPaths = useMemo(() => flattenPaths(menus), [menus]);

  const selectedKeys = useMemo(() => {
    if (!pathname) return [];
    const hit = allPaths.find((p) => pathname === p || pathname.startsWith(p + '/'));
    return hit ? [hit] : [];
  }, [allPaths, pathname]);

  const isAdmin = Boolean((user as any)?.isAdmin);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} theme="light">
        <div style={{ height: 48, display: 'flex', alignItems: 'center', padding: '0 16px' }}>
          <Typography.Text strong>IE-KG-QA</Typography.Text>
        </div>
        <Menu mode="inline" items={items} selectedKeys={selectedKeys} />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <div />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Typography.Text>{(user as any)?.nickname || (user as any)?.username || '用户'}</Typography.Text>
            <Button
              icon={<LogoutOutlined />}
              onClick={() => {
                logout();
                router.replace('/login');
              }}
            >
              退出
            </Button>
          </div>
        </Header>
        <Content style={{ padding: 16 }}>
          <Spin spinning={loading}>
            {children}
            {isAdmin ? null : null}
          </Spin>
        </Content>
      </Layout>
    </Layout>
  );
}
