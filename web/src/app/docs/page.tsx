'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Form, Input, Progress, Space, Table, Tag, Upload, message } from 'antd';
import type { UploadProps } from 'antd';
import { UploadOutlined, ReloadOutlined } from '@ant-design/icons';
import { api } from '@/lib/api';

type DocItem = {
  id: string;
  title?: string;
  filename?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  lastTaskId?: string;
};

type TaskItem = {
  id?: string;
  taskId?: string;
  status?: string;
  progress?: number;
  message?: string;
  done?: boolean;
};

export default function DocsPage() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<DocItem[]>([]);
  const [taskLoading, setTaskLoading] = useState(false);
  const [task, setTask] = useState<TaskItem | null>(null);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await api.get('/docs');
      setRows(Array.isArray(res.data) ? res.data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const uploadProps: UploadProps = useMemo(
    () => ({
      name: 'file',
      multiple: false,
      showUploadList: false,
      customRequest: async (options) => {
        const { file, onSuccess, onError } = options;
        try {
          const formData = new FormData();
          formData.append('file', file as any);
          const res = await api.post('/docs/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          onSuccess?.(res.data);
          message.success('上传成功');
          fetchList();
        } catch (e: any) {
          onError?.(e);
          message.error(e?.message || '上传失败');
        }
      },
    }),
    [],
  );

  const ingest = async (docId: string) => {
    setTask(null);
    setTaskLoading(true);
    try {
      const res = await api.post(`/docs/${docId}/ingest`);
      const taskId = res.data?.taskId ?? res.data?.id ?? res.data?.task?.id;
      if (!taskId) {
        message.success('已触发入库任务');
        return;
      }
      message.success('已触发入库任务');
      await pollTask(taskId);
    } catch (e: any) {
      message.error(e?.message || '触发失败');
    } finally {
      setTaskLoading(false);
    }
  };

  const pollTask = async (taskId: string) => {
    const startedAt = Date.now();
    const maxMs = 10 * 60 * 1000;

    while (Date.now() - startedAt < maxMs) {
      const res = await api.get(`/tasks/${taskId}`);
      const data = res.data ?? {};
      const normalized: TaskItem = {
        taskId,
        status: data.status ?? data.state ?? data.phase,
        progress: data.progress ?? data.percent,
        message: data.message ?? data.detail,
        done:
          Boolean(data.done) ||
          ['done', 'success', 'completed', 'finished', 'failed', 'error'].includes(String(data.status ?? '').toLowerCase()),
      };
      setTask(normalized);

      if (normalized.done) return;
      await new Promise((r) => setTimeout(r, 1200));
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card title="文档管理" extra={<Button icon={<ReloadOutlined />} onClick={fetchList} loading={loading}>刷新</Button>}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Upload {...uploadProps}>
            <Button icon={<UploadOutlined />}>上传文档</Button>
          </Upload>
          <Table
            rowKey="id"
            loading={loading}
            dataSource={rows}
            pagination={{ pageSize: 10 }}
            columns={[
              { title: 'ID', dataIndex: 'id', width: 220, ellipsis: true },
              { title: '标题', dataIndex: 'title', width: 240, ellipsis: true },
              { title: '文件名', dataIndex: 'filename', width: 240, ellipsis: true },
              {
                title: '状态',
                dataIndex: 'status',
                width: 120,
                render: (v) => {
                  const s = String(v ?? 'unknown');
                  const color = s.includes('done') || s.includes('success') ? 'green' : s.includes('fail') ? 'red' : 'blue';
                  return <Tag color={color}>{s}</Tag>;
                },
              },
              {
                title: '操作',
                key: 'actions',
                width: 180,
                render: (_, r) => (
                  <Button onClick={() => ingest(r.id)} loading={taskLoading}>
                    触发入库
                  </Button>
                ),
              },
            ]}
          />
        </Space>
      </Card>

      <Card title="任务进度">
        {task ? (
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>任务ID：{task.taskId}</div>
            <div>状态：{task.status ?? '-'}</div>
            <Progress percent={typeof task.progress === 'number' ? task.progress : undefined} />
            <div>{task.message ?? ''}</div>
          </Space>
        ) : (
          <div>暂无任务</div>
        )}
      </Card>
    </Space>
  );
}
