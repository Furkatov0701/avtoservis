import { createEdgeHandler } from '../_shared/telegram-edge.js';

// Telegram does not send a Supabase JWT. The handler enforces its own secrets.
Deno.serve(createEdgeHandler({ env: name => Deno.env.get(name) }));
