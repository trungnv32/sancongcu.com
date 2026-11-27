import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handler } from "./handler.ts";

// Toàn bộ xử lý nằm trong handler.ts để chạy thử được bằng test (fetch giả).
Deno.serve(handler);
