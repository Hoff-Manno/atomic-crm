import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { corsHeaders, OptionsMiddleware } from "../_shared/cors.ts";
import { createErrorResponse } from "../_shared/utils.ts";

/**
 * Payment Reminders Edge Function
 *
 * Processes payment schedule reminders:
 * - Marks overdue installments
 * - Creates reminder tasks for upcoming payments
 * - Creates overdue notice tasks
 * - Escalates severely overdue contracts
 * - Auto-defaults contracts with prolonged non-payment
 *
 * Can be triggered by:
 * - pg_cron (daily schedule)
 * - Manual HTTP POST call
 *
 * Query parameters (all optional):
 * - days_before_due: days before due date to create reminder (default: 3)
 * - overdue_grace_days: days after due before escalation (default: 14)
 * - default_after_days: days after due before auto-default (default: 30)
 */
Deno.serve(async (req: Request) =>
  OptionsMiddleware(req, async () => {
    if (req.method !== "POST") {
      return createErrorResponse(405, "Method Not Allowed");
    }

    try {
      // Read settings from request body or use defaults
      let daysBeforeDue = 3;
      let overdueGraceDays = 14;
      let defaultAfterDays = 30;

      try {
        const body = await req.json();
        daysBeforeDue = body.days_before_due ?? daysBeforeDue;
        overdueGraceDays = body.overdue_grace_days ?? overdueGraceDays;
        defaultAfterDays = body.default_after_days ?? defaultAfterDays;
      } catch {
        // No body or invalid JSON — use defaults
      }

      const { data, error } = await supabaseAdmin.rpc(
        "process_payment_reminders",
        {
          days_before_due: daysBeforeDue,
          overdue_grace_days: overdueGraceDays,
          default_after_days: defaultAfterDays,
        },
      );

      if (error) {
        console.error("Error processing reminders:", error);
        return createErrorResponse(500, error.message);
      }

      return new Response(JSON.stringify({ data }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    } catch (e) {
      console.error("Unexpected error:", e);
      return createErrorResponse(500, "Internal Server Error");
    }
  }),
);
