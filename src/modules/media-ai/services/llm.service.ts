import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GenerateVideoDetailsDto,
  GenerateVideoDetailsResponseDto,
  VideoDetailPlatform,
} from '../dto/generate-video-details.dto';

interface LlmChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

interface RawVideoDetailsPayload {
  title?: unknown;
  description?: unknown;
  topics?: unknown;
  tags?: unknown;
  salesScript?: unknown;
}

const PLATFORM_LABELS: Record<VideoDetailPlatform, string> = {
  douyin: '抖音短视频',
  kuaishou: '快手短视频',
  bilibili: 'B站',
  xiaohongshu: '小红书',
  general: '通用短视频平台',
};

@Injectable()
export class LlmService {
  constructor(private readonly configService: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.getApiKey());
  }

  async generateVideoDetails(
    dto: GenerateVideoDetailsDto,
  ): Promise<GenerateVideoDetailsResponseDto> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new ServiceUnavailableException(
        '未配置 LLM_API_KEY，请在 .env 中设置通义 API Key',
      );
    }

    const platform = dto.platform ?? 'douyin';
    const systemPrompt = [
      '你是短视频电商文案策划，擅长写吸引点击的标题、详情描述、话题、标签和口播卖货话术。',
      `目标平台：${PLATFORM_LABELS[platform]}。`,
      '根据用户提供的话题（及可选商品信息）生成可直接用于发布的视频详情。',
      '要求：',
      '- title：不超过 80 字，有吸引力，避免标题党违禁表述',
      '- description：200-800 字，结构清晰，含痛点、卖点、使用场景、行动号召',
      '- topics：3-8 个，不含 # 号，每个不超过 64 字，与输入话题相关',
      '- tags：5-9 个，适合平台推荐，每个不超过 64 字',
      '- salesScript：80-200 字口播卖货话术，口语化、有节奏感',
      '只输出 JSON，格式：',
      '{"title":"...","description":"...","topics":["..."],"tags":["..."],"salesScript":"..."}',
    ].join('\n');

    const userPayload = {
      topics: dto.topics,
      productName: dto.productName?.trim() || undefined,
      platform,
      extraPrompt: dto.extraPrompt?.trim() || undefined,
    };

    const apiBase = (
      this.configService.get<string>('llm.apiBase') ??
      'https://dashscope.aliyuncs.com/compatible-mode/v1'
    ).replace(/\/$/, '');
    const model =
      this.configService.get<string>('llm.model') ?? 'qwen-plus';
    const timeoutMs =
      this.configService.get<number>('llm.timeoutMs') ?? 120_000;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(`${apiBase}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: JSON.stringify(userPayload, null, 0),
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
        }),
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new BadGatewayException('LLM 请求超时，请稍后重试');
      }
      throw new BadGatewayException('无法连接 LLM 服务');
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      throw new BadGatewayException(
        `LLM 请求失败 (${response.status}): ${detail}`,
      );
    }

    const data = (await response.json()) as LlmChatCompletionResponse;
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new BadGatewayException('LLM 返回内容为空');
    }

    let parsed: RawVideoDetailsPayload;
    try {
      parsed = JSON.parse(content) as RawVideoDetailsPayload;
    } catch {
      throw new BadGatewayException(
        `LLM 返回非 JSON: ${content.slice(0, 200)}`,
      );
    }

    return this.normalizeVideoDetails(parsed);
  }

  private getApiKey(): string {
    return this.configService.get<string>('llm.apiKey')?.trim() ?? '';
  }

  private normalizeVideoDetails(
    payload: RawVideoDetailsPayload,
  ): GenerateVideoDetailsResponseDto {
    const title = this.readString(payload.title, '视频标题').slice(0, 80);
    const description = this.readString(
      payload.description,
      '精彩内容，欢迎观看。',
    ).slice(0, 5000);
    const topics = this.readStringArray(payload.topics, 10, 64);
    const tags = this.readStringArray(payload.tags, 9, 64);
    const salesScript = this.readString(
      payload.salesScript,
      description.slice(0, 200),
    ).slice(0, 500);

    if (topics.length === 0) {
      topics.push('好物分享');
    }
    if (tags.length === 0) {
      tags.push('推荐');
    }

    return { title, description, topics, tags, salesScript };
  }

  private readString(value: unknown, fallback: string): string {
    if (typeof value !== 'string') {
      return fallback;
    }
    const trimmed = value.trim();
    return trimmed || fallback;
  }

  private readStringArray(
    value: unknown,
    maxItems: number,
    maxLength: number,
  ): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    const items: string[] = [];
    for (const item of value) {
      if (typeof item !== 'string') {
        continue;
      }
      const trimmed = item.trim().replace(/^#+/, '');
      if (!trimmed) {
        continue;
      }
      items.push(trimmed.slice(0, maxLength));
      if (items.length >= maxItems) {
        break;
      }
    }
    return items;
  }
}
