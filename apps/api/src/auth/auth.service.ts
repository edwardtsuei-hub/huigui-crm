import { Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Prisma, UserStatus } from "@prisma/client";
import bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto } from "./dto/auth.dto";

type UserWithRole = Prisma.UserGetPayload<{
  include: {
    role: {
      include: {
        rolePermissions: {
          include: {
            permission: true;
          };
        };
      };
    };
  };
}>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { name: dto.username },
          { loginAccount: dto.username },
          { mobile: dto.username },
          { email: dto.username }
        ]
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    });

    if (!user || user.status !== UserStatus.ACTIVE || !user.passwordHash) {
      throw new UnauthorizedException("账号不存在或不可用");
    }

    const matched = await bcrypt.compare(dto.password, user.passwordHash);
    if (!matched) {
      throw new UnauthorizedException("用户名或密码错误");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date()
      }
    });

    return this.buildAuthPayload({
      ...user,
      lastLoginAt: new Date()
    } as UserWithRole);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      throw new NotFoundException("用户不存在");
    }

    return this.serializeUser(user);
  }

  private async buildAuthPayload(user: NonNullable<UserWithRole>) {
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      name: user.name,
      roleCode: user.role.code
    });

    return {
      token: accessToken,
      accessToken,
      user: this.serializeUser(user)
    };
  }

  private serializeUser(user: NonNullable<UserWithRole>) {
    const permissions = user.role.rolePermissions
      .map((item) => item.permission.code)
      .sort((left, right) => left.localeCompare(right));

    return {
      id: user.id,
      username: user.name,
      displayName: user.wecomName ?? user.name,
      name: user.name,
      loginAccount: user.loginAccount,
      mobile: user.mobile,
      email: user.email,
      department: user.department,
      title: user.title,
      managerUserId: user.managerUserId,
      dataScope: user.dataScope,
      roleCode: user.role.code,
      roleName: user.role.name,
      permissions,
      lastLoginAt: user.lastLoginAt,
      wecomUserId: user.wecomUserId,
      wecomName: user.wecomName,
      wecomAvatar: user.wecomAvatar
    };
  }
}
