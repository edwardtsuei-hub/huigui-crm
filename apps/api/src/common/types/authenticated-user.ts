import { DataScope, RecordDataScope } from "@prisma/client";

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
  recordDataScope: RecordDataScope;
  testBatchId?: string | null;
  roleCode: string;
  roleName: string;
  permissions: string[];
  wecomUserId?: string | null;
  wecomName?: string | null;
  wecomAvatar?: string | null;
};
