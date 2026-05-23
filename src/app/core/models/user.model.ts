/** Usuario alineado con el modelo Prisma `User`. */
export interface User {
  id: number;
  name: string;
  email: string;
  championPick?: string | null;
  topScorerPick?: string | null;
}

export interface CreateUserDto {
  name: string;
  email: string;
  championPick?: string;
  topScorerPick?: string;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  championPick?: string | null;
  topScorerPick?: string | null;
}
