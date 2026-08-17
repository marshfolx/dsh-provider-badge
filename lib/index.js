/**
 * dsh-provider-badge host entry: client-only.
 *
 * The browser half (client/client.js) renders the provider badge beside the
 * composer model selector; this node half intentionally does nothing.
 */
export const name = 'provider-badge';

/** No host services are needed — the client half does all the work. */
export function apply() {}
