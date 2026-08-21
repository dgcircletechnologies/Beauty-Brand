type UnauthorizedHandler = () => Promise<string | null>;

let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;
}

export function notifyUnauthorized() {
  return unauthorizedHandler?.() ?? Promise.resolve(null);
}
