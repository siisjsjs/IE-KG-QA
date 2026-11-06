'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Form, Input, Segmented, Space, Table, Tag, message } from 'antd';
import { api } from '@/lib/api';

type NodeSearchItem = {
  name: string;
  labels?: string[];
};

type GraphNode = {
  id: string;
  name: string;
  labels?: string[];
};

type GraphEdge = {
  id: string;
  source: string;
  target: string;
  name?: string;
  type?: string;
};

export default function KgPage() {
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<NodeSearchItem[]>([]);

  const [depth, setDepth] = useState<1 | 2 | 3>(1);
  const [center, setCenter] = useState<string>('');
  const [loadingGraph, setLoadingGraph] = useState(false);
  const [graph, setGraph] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] }>({ nodes: [], edges: [] });

  const nodeById = useMemo(() => {
    const m = new Map<string, GraphNode>();
    for (const n of graph.nodes) m.set(n.id, n);
    return m;
  }, [graph.nodes]);

  const loadGraph = async (name: string, d: 1 | 2 | 3) => {
    if (!name) return;
    setLoadingGraph(true);
    try {
      const res = await api.get('/kg/subgraph', { params: { center: name, depth: d } });
      const nodes = Array.isArray(res.data?.nodes) ? res.data.nodes : [];
      const edges = Array.isArray(res.data?.edges) ? res.data.edges : [];
      setGraph({ nodes, edges });
      setCenter(name);
    } catch (e: any) {
      message.error(e?.message || '加载子图失败');
    } finally {
      setLoadingGraph(false);
    }
  };

  useEffect(() => {
    if (center) loadGraph(center, depth);
  }, [depth]);

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card title="图谱" extra={<Segmented value={depth} options={[1, 2, 3]} onChange={(v) => setDepth(v as any)} />}>
        <Form
          layout="inline"
          onFinish={async () => {
            setSearching(true);
            try {
              const res = await api.get('/kg/search', { params: { q } });
              setHits(Array.isArray(res.data) ? res.data : []);
            } catch (e: any) {
              message.error(e?.message || '搜索失败');
            } finally {
              setSearching(false);
            }
          }}
        >
          <Form.Item>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索节点（按名称模糊匹配）" style={{ width: 360, maxWidth: '60vw' }} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={searching}>
            搜索
          </Button>
        </Form>
      </Card>

      <Card title="搜索结果" extra={center ? <Tag>中心：{center}</Tag> : null}>
        <Table
          rowKey={(r) => r.name}
          size="small"
          loading={searching}
          dataSource={hits}
          pagination={{ pageSize: 10 }}
          columns={[
            { title: '名称', dataIndex: 'name', ellipsis: true },
            {
              title: 'Labels',
              dataIndex: 'labels',
              render: (v) => (Array.isArray(v) ? v.map((x: string) => <Tag key={x}>{x}</Tag>) : '-'),
            },
            {
              title: '操作',
              key: 'act',
              width: 120,
              render: (_, r) => (
                <Button onClick={() => loadGraph(r.name, depth)} loading={loadingGraph}>
                  查看子图
                </Button>
              ),
            },
          ]}
        />
      </Card>

      <Card title={`子图（depth=${depth}）`} loading={loadingGraph}>
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <div>节点数：{graph.nodes.length}，边数：{graph.edges.length}</div>
          <Table
            rowKey="id"
            size="small"
            dataSource={graph.nodes}
            pagination={{ pageSize: 8 }}
            columns={[
              { title: 'ID', dataIndex: 'id', width: 220, ellipsis: true },
              { title: '名称', dataIndex: 'name', ellipsis: true },
              {
                title: 'Labels',
                dataIndex: 'labels',
                render: (v) => (Array.isArray(v) ? v.map((x: string) => <Tag key={x}>{x}</Tag>) : '-'),
              },
              {
                title: '点击',
                key: 'click',
                width: 120,
                render: (_, r) => (
                  <Button onClick={() => loadGraph(r.name, depth)}>
                    设为中心
                  </Button>
                ),
              },
            ]}
          />
          <Table
            rowKey="id"
            size="small"
            dataSource={graph.edges.map((e) => ({
              ...e,
              sourceName: nodeById.get(e.source)?.name,
              targetName: nodeById.get(e.target)?.name,
            }))}
            pagination={{ pageSize: 8 }}
            columns={[
              { title: '关系名', dataIndex: 'name', width: 180, ellipsis: true },
              { title: '类型', dataIndex: 'type', width: 120, ellipsis: true },
              { title: '源', dataIndex: 'sourceName', ellipsis: true },
              { title: '目标', dataIndex: 'targetName', ellipsis: true },
            ]}
          />
        </Space>
      </Card>
    </Space>
  );
}
