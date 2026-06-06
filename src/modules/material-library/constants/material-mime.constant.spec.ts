import { MaterialType } from '../enums/material-type.enum';
import { detectMaterialType } from './material-mime.constant';

describe('detectMaterialType', () => {
  it('应通过 MIME 识别图片', () => {
    expect(detectMaterialType('image/png')).toBe(MaterialType.IMAGE);
    expect(detectMaterialType('image/jpeg')).toBe(MaterialType.IMAGE);
  });

  it('应通过 MIME 识别音频', () => {
    expect(detectMaterialType('audio/mpeg')).toBe(MaterialType.AUDIO);
    expect(detectMaterialType('audio/wav')).toBe(MaterialType.AUDIO);
  });

  it('应通过 MIME 识别视频', () => {
    expect(detectMaterialType('video/mp4')).toBe(MaterialType.VIDEO);
    expect(detectMaterialType('video/webm')).toBe(MaterialType.VIDEO);
  });

  it('MIME 未知时应通过扩展名识别', () => {
    expect(detectMaterialType('application/octet-stream', 'clip.mp4')).toBe(
      MaterialType.VIDEO,
    );
    expect(detectMaterialType('application/octet-stream', 'voice.mp3')).toBe(
      MaterialType.AUDIO,
    );
    expect(detectMaterialType('application/octet-stream', 'photo.jpg')).toBe(
      MaterialType.IMAGE,
    );
  });

  it('不支持的格式应返回 null', () => {
    expect(detectMaterialType('text/plain', 'readme.txt')).toBeNull();
    expect(detectMaterialType('application/pdf')).toBeNull();
  });
});
