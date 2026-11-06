'use client';

import { useMemo, useState } from 'react';
import { Button, Card, Collapse, Form, Input, Space, Typography, message, Tag } from 'antd';
import { api } from '@/lib/api';

type Citation = {
  title?: string;
  source?: string;
  url?: string;
  quote?: string;
  evidence?: any;
  triple?: any;
};

function pickCitations(ai: any): Citation[] {
  const candidates = [
    ai?.citations,
    ai?.data?.citations,
    ai?.result?.citations,
    ai?.references,
    ai?.data?.references,
    ai?.result?.references,
  ];
  for (const c of candidates) {
    if (Array.isArray(c)) return c as Citation[];
  }
  return [];
}

function pickQuote(c: any) {
  return c?.quote ?? c?.text ?? c?.content ?? c?.chunk ?? c?.passage;
}

function pickEvidence(c: any) {
  return c?.evidence ?? c?.triple ?? c?.triples ?? c?.kg ?? c?.graph;
}

export default function QaPage() {
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<string>('');
  const [ai, setAi] = useState<any>(null);
  const [qaLogId, setQaLogId] = useState<string>('');
  const [fbLoading, setFbLoading] = useState(false);

  const citations = useMemo(() => pickCitations(ai), [ai]);

  const sendFeedback = async (satisfied: boolean, note?: string) => {
    if (!qaLogId) {
      message.warning('请先提问获取答案');
      return;
    }
    setFbLoading(true);
    try {
      await api.post('/qa/feedback', { qaLogId, satisfied, note });
      message.success('反馈已提交');
    } catch (e: any) {
      message.error(e?.message || '反馈提交失败');
    } finally {
      setFbLoading(false);
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card title="问答">
        <Form
          layout="vertical"
          onFinish={async (values) => {
            setAsking(true);
            setAnswer('');
            setAi(null);
            setQaLogId('');
            try {
              const res = await api.post('/qa/ask', {
                question: values.question,
                context: values.context ? safeJsonParse(values.context) : undefined,
              });
              setQaLogId(res.data?.qaLogId ?? '');
              setAi(res.data?.ai ?? null);
              setAnswer(res.data?.answer ?? res.data?.ai?.answer ?? '');
            } catch (e: any) {
              message.error(e?.message || '请求失败');
            } finally {
              setAsking(false);
            }
          }}
        >
          <Form.Item label="问题" name="question" rules={[{ required: true, message: '请输入问题' }]}>
            <Input.TextArea rows={3} placeholder="请输入你的问题" />
          </Form.Item>
          <Form.Item label="可选 context(JSON)" name="context">
            <Input.TextArea rows={3} placeholder="例如：{\"topK\": 5}" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={asking}>
            提问
          </Button>
        </Form>
      </Card>

      <Card title="答案">
        {qaLogId ? (
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            <div>
              <Tag>qaLogId</Tag> {qaLogId}
            </div>
            <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
              {answer || '（无答案）'}
            </Typography.Paragraph>

            <Space>
              <Button onClick={() => sendFeedback(true)} loading={fbLoading}>
                满意
              </Button>
              <Button danger onClick={() => sendFeedback(false)} loading={fbLoading}>
                不满意
              </Button>
            </Space>
          </Space>
        ) : (
          <div>请先提问</div>
        )}
      </Card>

      <Card title={`引用（citations） ${citations.length ? `(${citations.length})` : ''}`}
      >
        {citations.length ? (
          <Collapse
            items={citations.map((c, idx) => {
              const quote = pickQuote(c);
              const evidence = pickEvidence(c);
              return {
                key: String(idx),
                label: c?.title ?? c?.source ?? c?.url ?? `Citation ${idx + 1}`,
                children: (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {quote ? (
                      <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>{String(quote)}</Typography.Paragraph>
                    ) : (
                      <Typography.Text type="secondary">无 quote</Typography.Text>
                    )}
                    {evidence ? (
                      <pre style={{ margin: 0, background: '#fafafa', padding: 12, borderRadius: 6, overflow: 'auto' }}>
                        {JSON.stringify(evidence, null, 2)}
                      </pre>
                    ) : (
                      <Typography.Text type="secondary">无 evidence</Typography.Text>
                    )}
                  </Space>
                ),
              };
            })}
          />
        ) : (
          <div>暂无引用</div>
        )}
      </Card>
    </Space>
  );
}

function safeJsonParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}
