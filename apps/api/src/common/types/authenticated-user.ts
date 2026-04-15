export type AuthenticatedUser = {
  id: string;
  name: string;
  mobile?: string | null;
  email?: string | null;
  roleCode: string;
  roleName: string;
  wecomUserId?: string | null;
  wecomName?: string | null;
  wecomAvatar?: string | null;
};
