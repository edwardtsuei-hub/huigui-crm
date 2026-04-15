import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { Public } from "../common/decorators/public.decorator";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/auth.dto";

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("login")
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get("me")
  async me(@Req() req: RequestWithUser) {
    return this.authService.me(req.user.id);
  }

  @Post("logout")
  async logout() {
    return { success: true };
  }
}
