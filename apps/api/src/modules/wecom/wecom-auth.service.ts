import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Prisma, UserStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { WecomService } from "./wecom.service";

type UserWithRole = Prisma.UserGetPayload<{
  include: {
    role: true;
  };
}>;

type WecomIdentityResponse = {
  UserId?: string;
  OpenId?: string;
  DeviceId?: string;
};

type WecomUserProfileResponse = {
  userid: string;
  name?: string;
  avatar?: string;
  mobile?: string;
  email?: string;
};

@Injectable()
export class WecomAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly wecomService: WecomService
  ) {}

  getClientConfig() {
    return this.wecomService.getClientConfig();
  }

  async loginWithCode(code: string) {
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      throw new BadRequestException("缺少企业微信授权 code");
    }

    const identity = await this.wecomService.get<WecomIdentityResponse & { errcode: number; errmsg: string }>(
      "/cgi-bin/auth/getuserinfo",
      { code: trimmedCode }
    );

    if (!identity.UserId) {
      throw new ForbiddenException("未识别到企业微信内部成员身份，请确认应用可见范围和授权方式");
    }

    const profile = await this.wecomService.get<WecomUserProfileResponse & { errcode: number; errmsg: string }>(
      "/cgi-bin/user/get",
      { userid: identity.UserId }
    );

    const user = await this.resolveSystemUser(profile);
    if (!user) {
      throw new ForbiddenException("当前企业微信账号未绑定系统用户，请联系管理员");
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException("账号不存在或不可用");
    }

    return this.buildAuthPayload(user);
  }

  private async resolveSystemUser(profile: WecomUserProfileResponse) {
    const boundUser = await this.prisma.user.findUnique({
      where: { wecomUserId: profile.userid },
      include: { role: true }
    });

    if (boundUser) {
      if (
        boundUser.wecomName !== profile.name ||
        boundUser.wecomAvatar !== profile.avatar
      ) {
        return this.prisma.user.update({
          where: { id: boundUser.id },
          data: {
            wecomName: profile.name,
            wecomAvatar: profile.avatar
          },
          include: { role: true }
        });
      }

      return boundUser;
    }

    const matchConditions: Prisma.UserWhereInput[] = [];
    if (profile.mobile?.trim()) {
      matchConditions.push({ mobile: profile.mobile.trim() });
    }
    if (profile.email?.trim()) {
      matchConditions.push({ email: profile.email.trim() });
    }

    if (!matchConditions.length) {
      return null;
    }

    const candidates = await this.prisma.user.findMany({
      where: {
        status: UserStatus.ACTIVE,
        OR: matchConditions
      },
      include: { role: true }
    });

    const uniqueCandidates = Array.from(
      new Map(candidates.map((item) => [item.id, item])).values()
    );

    if (uniqueCandidates.length !== 1) {
      return null;
    }

    const candidate = uniqueCandidates[0];
    if (candidate.wecomUserId && candidate.wecomUserId !== profile.userid) {
      return null;
    }

    return this.prisma.user.update({
      where: { id: candidate.id },
      data: {
        wecomUserId: profile.userid,
        wecomName: profile.name,
        wecomAvatar: profile.avatar
      },
      include: { role: true }
    });
  }

  private async buildAuthPayload(user: UserWithRole) {
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      name: user.name,
      roleCode: user.role.code
    });

    return {
      token: accessToken,
      accessToken,
      user: {
        id: user.id,
        username: user.name,
        displayName: user.wecomName ?? user.name,
        name: user.name,
        mobile: user.mobile,
        email: user.email,
        roleCode: user.role.code,
        roleName: user.role.name,
        wecomUserId: user.wecomUserId,
        wecomName: user.wecomName,
        wecomAvatar: user.wecomAvatar
      }
    };
  }
}
