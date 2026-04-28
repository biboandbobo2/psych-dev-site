export type TaskItem = {
  id: string;
  text: string;
};

export type ArchivedTask = {
  id: string;
  text: string;
  roleId: string;
  roleTitle: string;
  doneAt: string;
};

export type TaskRole = {
  id: string;
  title: string;
  tasks: TaskItem[];
  order: number;
};
