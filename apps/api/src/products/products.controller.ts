import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { Roles } from "../common/decorators/roles.decorator";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { CreateProductDto, ProductQueryDto, UpdateProductDto } from "./dto/product.dto";
import { ProductsService } from "./products.service";

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async list(@Query() query: ProductQueryDto, @Req() req: RequestWithUser) {
    return this.productsService.list(query, req.user);
  }

  @Get(":id")
  async getById(@Param("id") id: string, @Req() req: RequestWithUser) {
    return this.productsService.getById(id, req.user);
  }

  @Roles("SUPER_ADMIN", "SENIOR_MANAGER")
  @Post()
  async create(@Body() dto: CreateProductDto, @Req() req: RequestWithUser) {
    return this.productsService.create(dto, req.user);
  }

  @Roles("SUPER_ADMIN", "SENIOR_MANAGER")
  @Patch(":id")
  async update(@Param("id") id: string, @Body() dto: UpdateProductDto, @Req() req: RequestWithUser) {
    return this.productsService.update(id, dto, req.user);
  }

  @Roles("SUPER_ADMIN", "SENIOR_MANAGER")
  @Delete(":id")
  async remove(@Param("id") id: string, @Req() req: RequestWithUser) {
    return this.productsService.remove(id, req.user);
  }
}
