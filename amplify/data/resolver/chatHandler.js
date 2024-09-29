export function request(ctx) {
  console.log('Request args:', ctx.args);
  const { message } = ctx.args;
  return { message };
}

export function response(ctx) {
  console.log('Response result:', ctx.result);
  // Ensure we're returning a string
  return typeof ctx.result === 'string' ? ctx.result : JSON.stringify(ctx.result);
}
