export type MenuNode = {
  id: string;
  title: string;
  path?: string;
  icon?: string;
  sort: number;
  parentId?: string;
  children: MenuNode[];
};

export type UserMe = {
  id: string;
  username?: string;
  nickname?: string;
  isAdmin?: boolean;
  roles?: any[];
};
