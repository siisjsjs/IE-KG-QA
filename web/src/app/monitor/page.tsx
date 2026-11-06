'use client';

import { useEffect, useState } from 'react';
import { Button, Card, Descriptions, Space, Tag, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { api } from '@/lib/api';

type Health = {
  ok?: boolean;
  message?: string;
  mysql?: any;
  redis?: any;
  ai?: any;
  neo4j?: any;
  chroma?: any;
};

function StatusTag({ v }: { v: any }) {
  const ok = v?.ok;
  if (ok === true) return <Tag color="green">OK</Tag>;
  if (ok === false) return <Tag color="red">FAIL</Tag>;
  return <Tag>UNKNOWN</Tag>;
}

export default function MonitorPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Health | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await api.get('/health');
      setData(res.data ?? null);
    } catch (e: any) {
      message.error(e?.message || '获取健康状态失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card
        title="状态监控"
        extra={
          <Button icon={<ReloadOutlined />} onClick={fetchHealth} loading={loading}>
            刷新
          </Button>
        }
      >
        <Descriptions bordered column={1} size="middle">
          <Descriptions.Item label="API">{data?.ok ? <Tag color="green">OK</Tag> : <Tag color="red">FAIL</Tag>}</Descriptions.Item>
          <Descriptions.Item label="MySQL">
            <Space>
              <StatusTag v={data?.mysql} />
              {data?.mysql?.error ? <Tag color="red">{String(data.mysql.error)}</Tag> : null}
              {data?.mysql?.note ? <Tag>{String(data.mysql.note)}</Tag> : null}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="Redis">
            <Space>
              <StatusTag v={data?.redis} />
              {data?.redis?.note ? <Tag>{String(data.redis.note)}</Tag> : null}
              {data?.redis?.pong ? <Tag color="blue">pong={String(data.redis.pong)}</Tag> : null}
              {data?.redis?.error ? <Tag color="red">{String(data.redis.error)}</Tag> : null}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="AI">
            <Space>
              <StatusTag v={data?.ai} />
              {data?.ai?.error ? <Tag color="red">{String(data.ai.error)}</Tag> : null}
              {data?.ai?.model ? <Tag>{String(data.ai.model)}</Tag> : null}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="Neo4j">
            <Space>
              <StatusTag v={data?.neo4j} />
              {data?.neo4j?.error ? <Tag color="red">{String(data.neo4j.error)}</Tag> : null}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="Chroma">
            <Space>
              <StatusTag v={data?.chroma} />
              {data?.chroma?.status ? <Tag color="red">status={String(data.chroma.status)}</Tag> : null}
              {data?.chroma?.url ? <Tag>{String(data.chroma.url)}</Tag> : null}
              {data?.chroma?.error ? <Tag color="red">{String(data.chroma.error)}</Tag> : null}
            </Space>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="原始数据">
        <pre style={{ margin: 0, background: '#fafafa', padding: 12, borderRadius: 6, overflow: 'auto' }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      </Card>
    </Space>
  );
}
