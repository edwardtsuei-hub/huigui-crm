import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { Permissions } from "../common/decorators/permissions.decorator";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { CreateProductDto, ProductQueryDto, UpdateProductDto } from "./dto/product.dto";
import { ProductsService } from "./products.service";

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Permissions("page.products.list")
  @Get()
  async list(@Query() query: ProductQueryDto, @Req() req: RequestWithUser) {
    return this.productsService.list(query, req.user);
  }

  @Permissions("page.products.detail")
  @Get(":id")
  async getById(@Param("id") id: string, @Req() req: RequestWithUser) {
    return this.productsService.getById(id, req.user);
  }

  @Permissions("action.product.create")
  @Post()
  async create(@Body() dto: CreateProductDto, @Req() req: RequestWithUser) {
    return this.productsService.create(dto, req.user);
  }

  @Permissions("action.product.update")
  @Patch(":id")
  async update(@Param("id") id: string, @Body() dto: UpdateProductDto, @Req() req: RequestWithUser) {
    return this.productsService.update(id, dto, req.user);
  }

  @Permissions("action.product.delete")
  @Delete(":id")
  async remove(@Param("id") id: string, @Req() req: RequestWithUser) {
    return this.productsService.remove(id, req.user);
  }
}
