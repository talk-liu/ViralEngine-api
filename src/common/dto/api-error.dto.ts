import { ApiProperty } from '@nestjs/swagger';

export class ApiErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ example: '2026-05-23T08:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/api/example' })
  path: string;

  @ApiProperty({
    oneOf: [
      { type: 'string', example: 'Bad Request' },
      {
        type: 'object',
        example: {
          message: ['email must be an email'],
          error: 'Bad Request',
          statusCode: 400,
        },
      },
    ],
  })
  message: string | Record<string, unknown>;
}
