import { IgrejaVoluntarioRoleEnum } from '../../enums/Igreja/voluntario-role.enum';

export interface CreateIgrejaConviteDto {
  descricao?: string;
  autoApprove?: boolean;
  roleSugerida?: IgrejaVoluntarioRoleEnum;
  maxUses?: number;
  expiresAt?: string;
  ministerioIds?: string[];
}
