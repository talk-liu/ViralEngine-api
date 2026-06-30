import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { assertUserCanAccess } from '../../modules/user/utils/user-access.util';
import { UserService } from '../../modules/user/user.service';
import { AuthUser } from '../decorators/current-user.decorator';

export interface JwtPayload {
  sub: string;
  phone: string;
  tv?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwt.secret'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.userService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('用户不存在或登录已失效');
    }

    const tokenVersion = payload.tv ?? 0;
    if (tokenVersion !== user.tokenVersion) {
      throw new UnauthorizedException('账号已在其他设备登录');
    }

    assertUserCanAccess(user);

    return { id: user.id, phone: user.phone, isAdmin: user.isAdmin };
  }
}
