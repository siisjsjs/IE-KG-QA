'use client';

import { Button, Card, Form, Input, Typography, message } from 'antd';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

export default function LoginPage() {
  const router = useRouter();
  const { login, loading } = useAuthStore();

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5',
        padding: 16,
      }}
    >
      <Card style={{ width: 420, maxWidth: '100%' }}>
        <Typography.Title level={3} style={{ marginBottom: 24 }}>
          登录
        </Typography.Title>
        <Form
          layout="vertical"
          onFinish={async (values) => {
            try {
              await login(values);
              message.success('登录成功');
              router.replace('/docs');
            } catch (e: any) {
              message.error(e?.message || '登录失败');
            }
          }}
          initialValues={{
            username: 'admin@example.com',
            password: 'admin123456',
          }}
        >
          <Form.Item label="用户名" name="username" rules={[{ required: true }]}>
            <Input autoComplete="username" />
          </Form.Item>
          <Form.Item label="密码" name="password" rules={[{ required: true }]}>
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            登录
          </Button>
        </Form>
      </Card>
    </div>
  );
}
