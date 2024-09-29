export function request(ctx) {
  console.log('Request args:', ctx.args);
  return ctx.args;
}

export function response(ctx) {
  console.log('Response result:', ctx.result);
  return `Echo: ${ctx.arguments.message}`;
}
