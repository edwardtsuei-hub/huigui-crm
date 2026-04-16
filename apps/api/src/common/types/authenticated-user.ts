import { DataScope } from "@prisma/client";

export type AuthenticatedUser = {
  id: string;
  name: string;
  loginAccount?: string | null;
  mobile?: string | null;
  email?: string | null;
  department?: string | null;
  title?: string | null;
  managerUserId?: string | null;
  dataScope: DataScope;
  roleCode: string;
  roleName: string;
  permissions: string[];
  wecomUserId?: string | null;
  wecomName?: string | null;
  wecomAvatar?: string | null;
};
