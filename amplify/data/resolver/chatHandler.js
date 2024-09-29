export function request(ctx) {
  const { message } = ctx.args;
  return { message };
}

export function response(ctx) {
  const { message } = ctx.prev.result;
  return `Echo: ${message}`;
}
