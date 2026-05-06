import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const ActiveUser = createParamDecorator(
  (field: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return field ? user?.[field] : user;
  },
);
