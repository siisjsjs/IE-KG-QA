'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Drawer, Form, Input, InputNumber, Popconfirm, Select, Space, Table, Tag, message } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { api } from '@/lib/api';

type MenuItem = {
  id: string;
  title: string;
  path?: string;
  icon?: string;
  sort: number;
  parentId?: string;
  createdAt?: string;
  updatedAt?: string;
};

export default function AdminMenusPage() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<MenuItem[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/menus');
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

  const parentOptions = useMemo(() => {
    const opts = rows
      .slice()
      .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
      .map((m) => ({ label: `${m.title}${m.path ? ` (${m.path})` : ''}`, value: m.id }));
    return [{ label: '（无）', value: '' }, ...opts];
  }, [rows]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ sort: 0, parentId: '' });
    setOpen(true);
  };

  const openEdit = (r: MenuItem) => {
    setEditing(r);
    form.resetFields();
    form.setFieldsValue({
      title: r.title,
      path: r.path,
      icon: r.icon,
      sort: r.sort,
      parentId: r.parentId ?? '',
    });
    setOpen(true);
  };

  const submit = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const payload = {
        title: values.title,
        path: values.path || undefined,
        icon: values.icon || undefined,
        sort: values.sort ?? 0,
        parentId: values.parentId || undefined,
      };

      if (editing) {
        await api.put(`/admin/menus/${editing.id}`, payload);
        message.success('已更新');
      } else {
        await api.post('/admin/menus', payload);
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
      await api.delete(`/admin/menus/${id}`);
      message.success('已删除');
      fetchList();
    } catch (e: any) {
      message.error(e?.message || '删除失败');
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card
        title="菜单管理"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchList} loading={loading}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新建菜单
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
            { title: '标题', dataIndex: 'title', width: 220, ellipsis: true },
            { title: '路径', dataIndex: 'path', width: 220, ellipsis: true, render: (v) => (v ? <Tag>{v}</Tag> : '-') },
            { title: 'icon', dataIndex: 'icon', width: 160, ellipsis: true, render: (v) => (v ? <Tag>{v}</Tag> : '-') },
            { title: 'sort', dataIndex: 'sort', width: 100 },
            {
              title: 'parentId',
              dataIndex: 'parentId',
              width: 220,
              ellipsis: true,
              render: (v) => (v ? v : '-'),
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
        title={editing ? '编辑菜单' : '新建菜单'}
        open={open}
        onClose={() => setOpen(false)}
        width={520}
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
          <Form.Item label="标题" name="title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="路径" name="path">
            <Input placeholder="例如：/docs /qa /kg /monitor /admin/users" />
          </Form.Item>
          <Form.Item label="Icon（可填 BookOutlined 等）" name="icon">
            <Input />
          </Form.Item>
          <Form.Item label="排序" name="sort">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="父菜单" name="parentId">
            <Select options={parentOptions} />
          </Form.Item>
        </Form>
      </Drawer>
    </Space>
  );
}
