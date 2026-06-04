import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as path from 'path';
import { Repository } from 'typeorm';
import { buildUniqueFileName } from '../../publish-draft/utils/upload-filename.util';
import { CreateLiveSliceJobDto } from '../dto/create-live-slice-job.dto';
import { CreateSubtitleJobDto } from '../dto/create-subtitle-job.dto';
import { CreateTtsJobDto } from '../dto/create-tts-job.dto';
import { CreateWatermarkJobDto } from '../dto/create-watermark-job.dto';
import type { LiveSliceManifestDto } from '../dto/live-slice-manifest.dto';
import type { MediaJobResponseDto } from '../dto/media-job-response.dto';
import { MediaJob } from '../entities/media-job.entity';
import { MediaJobStatus } from '../enums/media-job-status.enum';
import { MediaJobType } from '../enums/media-job-type.enum';
import { toMediaJobResponse } from '../utils/media-job.mapper';
import { MediaAiStorageService } from './media-ai-storage.service';
import { MediaJobQueueService } from './media-job-queue.service';

const VIDEO_MIME_TYPES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-msvideo',
  'video/mp2t',
  'video/vnd.dlna.mpeg-tts',
]);

const VIDEO_FILE_EXTENSIONS = new Set(['.mp4', '.mov', '.webm', '.avi', '.ts']);

const AUDIO_MIME_TYPES = new Set([
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/mpeg',
  'audio/mp3',
  'audio/flac',
  'audio/ogg',
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac',
]);

const AUDIO_FILE_EXTENSIONS = new Set([
  '.wav',
  '.mp3',
  '.flac',
  '.ogg',
  '.m4a',
  '.aac',
]);

interface LiveSliceCartItemParam {
  id?: string;
  title: string;
  link?: string;
}

interface RawLiveSliceManifest {
  version: number;
  sourceDurationSec: number;
  asrEngine: string;
  clips: Array<{
    id: string;
    startSec: number;
    endSec: number;
    durationSec: number;
    score: number;
    reason: string;
    productName?: string;
    productId?: string;
    title: string;
    description?: string;
    topics?: string[];
    tags?: string[];
    videoKey?: string;
    coverKey?: string;
    subtitleKey?: string;
  }>;
}

@Injectable()
export class MediaAiService {
  constructor(
    @InjectRepository(MediaJob)
    private readonly jobRepository: Repository<MediaJob>,
    private readonly storageService: MediaAiStorageService,
    private readonly queueService: MediaJobQueueService,
  ) {}

  async getJob(userId: string, jobId: string): Promise<MediaJobResponseDto> {
    const job = await this.findOwnedJob(userId, jobId);
    const signedUrl = (key: string) => this.storageService.getSignedUrl(key);
    const manifest =
      job.type === MediaJobType.LIVE_SLICE &&
      job.status === MediaJobStatus.COMPLETED &&
      job.outputKey
        ? await this.loadLiveSliceManifest(job.outputKey, signedUrl)
        : undefined;

    return toMediaJobResponse(job, signedUrl, manifest);
  }

  async createWatermarkJob(
    userId: string,
    file: Express.Multer.File,
    dto: CreateWatermarkJobDto,
  ): Promise<MediaJobResponseDto> {
    const inputFileName = buildUniqueFileName(
      'video',
      file.mimetype,
      file.originalname,
    );
    const ext = path.extname(inputFileName) || '.mp4';

    return this.createVideoJob({
      userId,
      file,
      type: MediaJobType.WATERMARK,
      params: {
        text: dto.text,
        position: dto.position ?? 'bottom-right',
        fontSize: dto.fontSize ?? 24,
      },
      outputFileName: `watermarked${ext}`,
    });
  }

  async createSubtitleJob(
    userId: string,
    file: Express.Multer.File,
    dto: CreateSubtitleJobDto,
  ): Promise<MediaJobResponseDto> {
    const format = dto.format ?? 'srt';

    return this.createVideoJob({
      userId,
      file,
      type: MediaJobType.SUBTITLE,
      params: {
        language: dto.language,
        format,
      },
      outputFileName: `subtitles.${format}`,
    });
  }

  async createLiveSliceJob(
    userId: string,
    file: Express.Multer.File,
    dto: CreateLiveSliceJobDto,
  ): Promise<MediaJobResponseDto> {
    const minDuration = dto.minDuration ?? 15;
    const maxDuration = dto.maxDuration ?? 60;
    if (minDuration > maxDuration) {
      throw new BadRequestException('minDuration 不能大于 maxDuration');
    }

    const cartItems = this.parseLiveSliceCartItems(dto.cartItems);

    return this.createVideoJob({
      userId,
      file,
      type: MediaJobType.LIVE_SLICE,
      params: {
        minDuration,
        maxDuration,
        maxClips: dto.maxClips ?? 20,
        aspectRatio: dto.aspectRatio ?? '9:16',
        language: dto.language,
        cartItems,
        highlightPrompt: dto.highlightPrompt,
      },
      outputFileName: 'manifest.json',
    });
  }

  async createTtsJob(
    userId: string,
    spkFile: Express.Multer.File,
    emoFile: Express.Multer.File | undefined,
    dto: CreateTtsJobDto,
  ): Promise<MediaJobResponseDto> {
    this.assertAudioFile(spkFile);

    const emoControlMethod = dto.emoControlMethod ?? 0;
    if (emoControlMethod === 1) {
      if (!emoFile) {
        throw new BadRequestException(
          'emoControlMethod=1 时请上传情感参考音频 emoFile',
        );
      }
      this.assertAudioFile(emoFile);
    }

    const emoVector = this.parseEmoVector(dto.emoVector);
    if (emoControlMethod === 2 && !emoVector) {
      throw new BadRequestException(
        'emoControlMethod=2 时请提供 emoVector（8 维 JSON 数组）',
      );
    }

    const params: Record<string, unknown> = {
      text: dto.text.trim(),
      emoControlMethod,
      emoWeight: dto.emoWeight,
      emoVector,
      emoText: dto.emoText?.trim() || undefined,
      emoRandom: dto.emoRandom,
      maxTextTokensPerSegment: dto.maxTextTokensPerSegment,
      intervalSilence: dto.intervalSilence,
      verbose: dto.verbose,
      doSample: dto.doSample,
      topP: dto.topP,
      topK: dto.topK,
      temperature: dto.temperature,
      lengthPenalty: dto.lengthPenalty,
      numBeams: dto.numBeams,
      repetitionPenalty: dto.repetitionPenalty,
      maxMelTokens: dto.maxMelTokens,
    };

    const job = await this.jobRepository.save(
      this.jobRepository.create({
        userId,
        type: MediaJobType.TTS,
        status: MediaJobStatus.PENDING,
        params,
      }),
    );

    const spkFileName = buildUniqueFileName(
      'spk',
      spkFile.mimetype,
      spkFile.originalname,
    );
    const inputKey = this.storageService.buildInputKey(
      userId,
      job.id,
      spkFileName,
    );
    const outputKey = this.storageService.buildOutputKey(
      userId,
      job.id,
      'speech.wav',
    );

    await this.storageService.saveFile(inputKey, spkFile.buffer);
    job.inputKey = inputKey;
    job.outputKey = outputKey;

    if (emoFile) {
      const emoFileName = buildUniqueFileName(
        'emo',
        emoFile.mimetype,
        emoFile.originalname,
      );
      const emoInputKey = this.storageService.buildInputKey(
        userId,
        job.id,
        emoFileName,
      );
      await this.storageService.saveFile(emoInputKey, emoFile.buffer);
      params.emoInputKey = emoInputKey;
      job.params = params;
    }

    await this.jobRepository.save(job);

    await this.queueService.enqueue({
      jobId: job.id,
      userId,
      type: MediaJobType.TTS,
      inputKey,
      outputKey,
      params: job.params as Record<string, unknown>,
    });

    return toMediaJobResponse(job, (key) => this.storageService.getSignedUrl(key));
  }

  async updateProgress(jobId: string, progress: number): Promise<void> {
    const job = await this.jobRepository.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException('任务不存在');
    }
    if (
      job.status === MediaJobStatus.COMPLETED ||
      job.status === MediaJobStatus.FAILED
    ) {
      return;
    }
    await this.jobRepository.update(jobId, { progress });
  }

  async markProcessing(jobId: string): Promise<void> {
    await this.jobRepository.update(jobId, {
      status: MediaJobStatus.PROCESSING,
      progress: 10,
      startedAt: new Date(),
    });
  }

  async completeJob(
    jobId: string,
    payload: {
      status: 'completed' | 'failed';
      outputKey?: string;
      errorMessage?: string;
      progress?: number;
    },
  ): Promise<void> {
    const job = await this.jobRepository.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException('任务不存在');
    }

    if (payload.status === 'completed') {
      await this.jobRepository.update(jobId, {
        status: MediaJobStatus.COMPLETED,
        progress: payload.progress ?? 100,
        outputKey: payload.outputKey ?? job.outputKey,
        errorMessage: null,
        completedAt: new Date(),
      });
    } else {
      await this.jobRepository.update(jobId, {
        status: MediaJobStatus.FAILED,
        progress: payload.progress ?? job.progress,
        errorMessage: payload.errorMessage ?? '处理失败',
        completedAt: new Date(),
      });
    }

    await this.deleteInputArtifact(job);
  }

  async removeJob(userId: string, jobId: string): Promise<void> {
    const job = await this.findOwnedJob(userId, jobId);
    await this.storageService.removeJobDirectory(job.userId, job.id);
    await this.jobRepository.remove(job);
  }

  private async createVideoJob(options: {
    userId: string;
    file: Express.Multer.File;
    type: MediaJobType.WATERMARK | MediaJobType.SUBTITLE | MediaJobType.LIVE_SLICE;
    params: Record<string, unknown>;
    outputFileName: string;
  }): Promise<MediaJobResponseDto> {
    this.assertVideoFile(options.file);

    const job = await this.jobRepository.save(
      this.jobRepository.create({
        userId: options.userId,
        type: options.type,
        status: MediaJobStatus.PENDING,
        params: options.params,
      }),
    );

    const inputFileName = buildUniqueFileName(
      'video',
      options.file.mimetype,
      options.file.originalname,
    );
    const inputKey = this.storageService.buildInputKey(
      options.userId,
      job.id,
      inputFileName,
    );
    const outputKey = this.storageService.buildOutputKey(
      options.userId,
      job.id,
      options.outputFileName,
    );

    await this.storageService.saveFile(inputKey, options.file.buffer);
    job.inputKey = inputKey;
    job.outputKey = outputKey;
    await this.jobRepository.save(job);

    await this.queueService.enqueue({
      jobId: job.id,
      userId: options.userId,
      type: options.type,
      inputKey,
      outputKey,
      params: job.params as Record<string, unknown>,
    });

    return toMediaJobResponse(job, (key) => this.storageService.getSignedUrl(key));
  }

  private async findOwnedJob(userId: string, jobId: string): Promise<MediaJob> {
    const job = await this.jobRepository.findOne({
      where: { id: jobId, userId },
    });
    if (!job) {
      throw new NotFoundException('任务不存在');
    }
    return job;
  }

  private assertVideoFile(file: Express.Multer.File): void {
    if (!file?.buffer?.length) {
      throw new BadRequestException('请上传视频文件');
    }
    if (!VIDEO_MIME_TYPES.has(file.mimetype)) {
      const ext = path.extname(file.originalname ?? '').toLowerCase();
      if (!VIDEO_FILE_EXTENSIONS.has(ext)) {
        throw new BadRequestException('不支持的视频格式');
      }
    }
  }

  private async deleteInputArtifact(job: MediaJob): Promise<void> {
    const keys = new Set<string>();
    if (job.inputKey) {
      keys.add(job.inputKey);
    }
    const emoInputKey = job.params?.emoInputKey;
    if (typeof emoInputKey === 'string' && emoInputKey) {
      keys.add(emoInputKey);
    }
    for (const key of keys) {
      await this.storageService.deleteFile(key);
    }
    if (job.inputKey) {
      await this.jobRepository.update(job.id, { inputKey: null });
    }
  }

  private assertAudioFile(file: Express.Multer.File): void {
    if (!file?.buffer?.length) {
      throw new BadRequestException('请上传音频文件');
    }
    if (!AUDIO_MIME_TYPES.has(file.mimetype)) {
      const ext = path.extname(file.originalname ?? '').toLowerCase();
      if (!AUDIO_FILE_EXTENSIONS.has(ext)) {
        throw new BadRequestException('不支持的音频格式');
      }
    }
  }

  private parseEmoVector(raw?: string): number[] | undefined {
    if (!raw?.trim()) {
      return undefined;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new BadRequestException('emoVector 必须是合法 JSON 数组');
    }
    if (!Array.isArray(parsed) || parsed.length !== 8) {
      throw new BadRequestException('emoVector 必须是长度为 8 的 JSON 数组');
    }
    const values = parsed.map((item, index) => {
      const num = Number(item);
      if (!Number.isFinite(num) || num < 0 || num > 1) {
        throw new BadRequestException(
          `emoVector[${index}] 必须是 0~1 之间的数字`,
        );
      }
      return num;
    });
    return values;
  }

  private parseLiveSliceCartItems(
    raw?: string,
  ): LiveSliceCartItemParam[] {
    if (!raw?.trim()) {
      return [];
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new BadRequestException('cartItems 必须是合法 JSON 数组');
    }
    if (!Array.isArray(parsed)) {
      throw new BadRequestException('cartItems 必须是 JSON 数组');
    }
    return parsed.map((item, index) => {
      if (!item || typeof item !== 'object') {
        throw new BadRequestException(`cartItems[${index}] 格式无效`);
      }
      const record = item as Record<string, unknown>;
      const title = record.title;
      if (typeof title !== 'string' || !title.trim()) {
        throw new BadRequestException(`cartItems[${index}].title 必填`);
      }
      return {
        id: typeof record.id === 'string' ? record.id : undefined,
        title: title.trim(),
        link: typeof record.link === 'string' ? record.link : undefined,
      };
    });
  }

  private async loadLiveSliceManifest(
    outputKey: string,
    signedUrl: (key: string) => string,
  ): Promise<LiveSliceManifestDto> {
    const raw = await this.storageService.readJsonFile<RawLiveSliceManifest>(
      outputKey,
    );
    return {
      version: raw.version,
      sourceDurationSec: raw.sourceDurationSec,
      asrEngine: raw.asrEngine,
      clips: (raw.clips ?? []).map((clip) => ({
        id: clip.id,
        startSec: clip.startSec,
        endSec: clip.endSec,
        durationSec: clip.durationSec,
        score: clip.score,
        reason: clip.reason,
        productName: clip.productName,
        productId: clip.productId,
        title: clip.title,
        description: clip.description,
        topics: clip.topics ?? [],
        tags: clip.tags ?? [],
        videoUrl: clip.videoKey ? signedUrl(clip.videoKey) : undefined,
        coverUrl: clip.coverKey ? signedUrl(clip.coverKey) : undefined,
        subtitleUrl: clip.subtitleKey ? signedUrl(clip.subtitleKey) : undefined,
      })),
    };
  }
}
