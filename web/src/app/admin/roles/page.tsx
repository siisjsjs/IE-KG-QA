'use client';

import { useEffect, useState } from 'react';
import { Button, Card, Drawer, Form, Input, Popconfirm, Space, Table, message } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { api } from '@/lib/api';

type RoleItem = {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
};

export default function AdminRolesPage() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<RoleItem[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RoleItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/roles');
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
    setOpen(true);
  };

  const openEdit = (r: RoleItem) => {
    setEditing(r);
    form.resetFields();
    form.setFieldsValue({ name: r.name, description: r.description });
    setOpen(true);
  };

  const submit = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/admin/roles/${editing.id}`, values);
        message.success('已更新');
      } else {
        await api.post('/admin/roles', values);
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
      await api.delete(`/admin/roles/${id}`);
      message.success('已删除');
      fetchList();
    } catch (e: any) {
      message.error(e?.message || '删除失败');
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card
        title="角色管理"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchList} loading={loading}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新建角色
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
            { title: '名称', dataIndex: 'name', width: 200, ellipsis: true },
            { title: '描述', dataIndex: 'description', ellipsis: true },
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
        title={editing ? '编辑角色' : '新建角色'}
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
          <Form.Item label="名称" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input />
          </Form.Item>
        </Form>
      </Drawer>
    </Space>
  );
}
