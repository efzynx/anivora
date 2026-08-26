import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserProfileDto } from '@anivora/types';

export const CurrentUser = createParamDecorator(
  (data: keyof UserProfileDto | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
