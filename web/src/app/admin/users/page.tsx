'use client';

import { useEffect, useState } from 'react';
import { Button, Card, Drawer, Form, Input, Popconfirm, Space, Switch, Table, Tag, message } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { api } from '@/lib/api';

type UserItem = {
  id: string;
  username: string;
  isActive: boolean;
  isAdmin: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<UserItem[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/users');
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      message.error(e?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ isActive: true, isAdmin: false });
    setOpen(true);
  };

  const openEdit = (r: UserItem) => {
    setEditing(r);
    form.resetFields();
    form.setFieldsValue({
      username: r.username,
      isActive: r.isActive,
      isAdmin: r.isAdmin,
    });
    setOpen(true);
  };

  const submit = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      if (editing) {
        const payload: any = {
          username: values.username,
          isActive: values.isActive,
          isAdmin: values.isAdmin,
        };
        if (values.password) payload.password = values.password;
        await api.put(`/admin/users/${editing.id}`, payload);
        message.success('已更新');
      } else {
        await api.post('/admin/users', {
          username: values.username,
          password: values.password,
          isActive: values.isActive,
          isAdmin: values.isAdmin,
        });
        message.success('已创建');
      }
      setOpen(false);
      await fetchList();
    } catch (e: any) {
      message.error(e?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await api.delete(`/admin/users/${id}`);
      message.success('已删除');
      fetchList();
    } catch (e: any) {
      message.error(e?.message || '删除失败');
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card
        title="用户管理"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchList} loading={loading}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新建用户
            </Button>
          </Space>
        }
      >
        <Table
          rowKey="id"
          loading={loading}
          dataSource={rows}
          pagination={{ pageSize: 10 }}
          columns={[
            { title: 'ID', dataIndex: 'id', width: 220, ellipsis: true },
            { title: '用户名', dataIndex: 'username', width: 220, ellipsis: true },
            {
              title: '状态',
              dataIndex: 'isActive',
              width: 120,
              render: (v) => (v ? <Tag color="green">启用</Tag> : <Tag color="red">禁用</Tag>),
            },
            {
              title: '管理员',
              dataIndex: 'isAdmin',
              width: 120,
              render: (v) => (v ? <Tag color="blue">是</Tag> : '-'),
            },
            {
              title: '操作',
              key: 'act',
              width: 220,
              render: (_, r) => (
                <Space>
                  <Button onClick={() => openEdit(r)}>编辑</Button>
                  <Popconfirm title="确认删除？" onConfirm={() => remove(r.id)}>
                    <Button danger>删除</Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Drawer
        title={editing ? '编辑用户' : '新建用户'}
        open={open}
        onClose={() => setOpen(false)}
        width={420}
        destroyOnClose
        footer={
          <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => setOpen(false)}>取消</Button>
            <Button type="primary" onClick={submit} loading={saving}>
              保存
            </Button>
          </Space>
        }
      >
        <Form layout="vertical" form={form}>
          <Form.Item label="用户名" name="username" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            label={editing ? '密码（不填则不修改）' : '密码'}
            name="password"
            rules={editing ? [] : [{ required: true }, { min: 6 }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item label="启用" name="isActive" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item label="管理员" name="isAdmin" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Drawer>
    </Space>
  );
}
