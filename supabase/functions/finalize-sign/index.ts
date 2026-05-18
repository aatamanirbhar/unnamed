import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

type VoteChoice = "yes" | "no";

interface Question {
  id: string;
  owner_id: string;
  slug: string;
  question_text: string;
  response_limit: number;
  status: "open" | "sealed";
  visit_count: number;
  created_at: string;
  sealed_at: string | null;
  results_email_sent_at: string | null;
}

interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
}

interface VoteRow {
  choice: VoteChoice;
}

interface MessageRow {
  body: string;
  created_at: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-finalize-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const slug = typeof body.slug === "string" ? body.slug : null;
    const runAll = body.all === true;
    const secret = Deno.env.get("FINALIZE_SIGN_SECRET");

    if (runAll && (!secret || req.headers.get("x-finalize-secret") !== secret)) {
      return json({ status: "unauthorized", message: "Batch finalize requires the cron secret." }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ status: "not_configured", message: "Supabase service credentials are missing." }, 500);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    let questions: Question[] = [];

    if (runAll) {
      const { data, error } = await admin
        .from("questions")
        .select("*")
        .eq("status", "sealed")
        .is("results_email_sent_at", null)
        .limit(25);

      if (error) throw error;
      questions = (data || []) as Question[];
    } else if (slug) {
      const { data, error } = await admin.from("questions").select("*").eq("slug", slug).single();
      if (error) throw error;
      questions = [data as Question];
    } else {
      return json({ status: "invalid", message: "Pass a slug or all=true." }, 400);
    }

    const results = [];
    for (const question of questions) {
      results.push(await finalizeOne(admin, question));
    }

    const first = results[0];
    if (!runAll && first) {
      return json(first, first.status === "sent" || first.status === "already_sent" ? 200 : 409);
    }

    return json({ status: "ok", results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ status: "error", message }, 500);
  }
});

async function finalizeOne(admin: ReturnType<typeof createClient>, question: Question) {
  if (question.status !== "sealed") {
    return { slug: question.slug, status: "not_ready", message: "This sign is still collecting responses." };
  }

  if (question.results_email_sent_at) {
    return { slug: question.slug, status: "already_sent", message: "The final sign was already emailed." };
  }

  const [{ data: profile }, { data: votes }, { data: messages }] = await Promise.all([
    admin.from("profiles").select("id, email, display_name").eq("id", question.owner_id).single(),
    admin.from("votes").select("choice").eq("question_id", question.id),
    admin
      .from("messages")
      .select("body, created_at")
      .eq("question_id", question.id)
      .order("created_at", { ascending: true })
  ]);

  const owner = profile as Profile | null;
  let email = owner?.email || null;

  if (!email) {
    const { data } = await admin.auth.admin.getUserById(question.owner_id);
    email = data.user?.email || null;
  }

  if (!email) {
    return { slug: question.slug, status: "missing_email", message: "No owner email was found." };
  }

  const voteRows = (votes || []) as VoteRow[];
  const messageRows = (messages || []) as MessageRow[];
  const yes = voteRows.filter((vote) => vote.choice === "yes").length;
  const no = voteRows.filter((vote) => vote.choice === "no").length;
  const total = yes + no;
  const name = owner?.display_name || email.split("@")[0] || "Seeker";
  const summary = buildSummary(question.question_text, yes, no, messageRows.length);
  const html = buildEmailHtml({
    name,
    question: question.question_text,
    yes,
    no,
    total,
    limit: question.response_limit,
    messages: messageRows.map((row) => row.body),
    summary,
    slug: question.slug
  });

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RESULTS_FROM_EMAIL") || "Omenly <onboarding@resend.dev>";

  if (!resendKey) {
    return { slug: question.slug, status: "email_not_configured", message: "RESEND_API_KEY is missing." };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: "Your sign from the universe is here",
      html,
      text: buildEmailText({
        name,
        question: question.question_text,
        yes,
        no,
        total,
        limit: question.response_limit,
        messages: messageRows.map((row) => row.body),
        summary,
        slug: question.slug
      })
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    return { slug: question.slug, status: "email_failed", message: errorText };
  }

  await admin
    .from("questions")
    .update({ results_email_sent_at: new Date().toISOString() })
    .eq("id", question.id)
    .is("results_email_sent_at", null);

  return { slug: question.slug, status: "sent", message: "Your sign has been emailed." };
}

function buildSummary(question: string, yes: number, no: number, messageCount: number) {
  if (yes > no) {
    return `The sign leans yes. For "${question}", the room is opening a door rather than closing one. Move with care, but do not pretend the invitation is not there.`;
  }

  if (no > yes) {
    return `The sign leans no. For "${question}", the wiser path may be restraint, rest, or a cleaner boundary. A delayed yes is still allowed later.`;
  }

  if (messageCount > 0) {
    return `The sign is balanced. For "${question}", the messages matter more than the count. Read them slowly and notice which one stays with you.`;
  }

  return `The sign is quiet. For "${question}", silence can mean the choice belongs back in your hands. Pick the path that lets you respect yourself tomorrow.`;
}

function signalStrength(yes: number, no: number) {
  const total = yes + no;
  if (total === 0) return "Quiet";
  const margin = Math.round((Math.abs(yes - no) / total) * 100);
  if (margin >= 70) return "Thunderous";
  if (margin >= 35) return "Clear";
  if (margin > 0) return "Soft";
  return "Balanced";
}

function buildEmailHtml(input: {
  name: string;
  question: string;
  yes: number;
  no: number;
  total: number;
  limit: number;
  messages: string[];
  summary: string;
  slug: string;
}) {
  const messages = input.messages.length
    ? input.messages.map((body) => `<li>${escapeHtml(body)}</li>`).join("")
    : "<li>No anonymous messages were left.</li>";

  return `
    <div style="font-family:Inter,Arial,sans-serif;background:#111313;color:#fff9ec;padding:32px">
      <div style="max-width:640px;margin:0 auto;border:1px solid rgba(255,255,255,.22);border-radius:8px;padding:28px;background:#1c2020">
        <p style="color:#f4c95d;font-weight:800;letter-spacing:.12em;text-transform:uppercase">Omenly</p>
        <h1 style="font-size:36px;line-height:1;margin:0 0 18px">Your sign is here, ${escapeHtml(input.name)}.</h1>
        <p style="font-size:18px;line-height:1.55;color:#efe6d2">${escapeHtml(input.summary)}</p>
        <div style="margin:24px 0;padding:18px;border-radius:8px;background:#fff9ec;color:#111313">
          <strong>Question</strong>
          <p style="font-size:22px;line-height:1.25;margin:8px 0 0">${escapeHtml(input.question)}</p>
        </div>
        <table style="width:100%;border-collapse:collapse;margin:20px 0;color:#fff9ec">
          <tr>
            <td style="padding:12px;border:1px solid rgba(255,255,255,.18)">Yes</td>
            <td style="padding:12px;border:1px solid rgba(255,255,255,.18);font-size:24px;font-weight:800">${input.yes}</td>
          </tr>
          <tr>
            <td style="padding:12px;border:1px solid rgba(255,255,255,.18)">No</td>
            <td style="padding:12px;border:1px solid rgba(255,255,255,.18);font-size:24px;font-weight:800">${input.no}</td>
          </tr>
          <tr>
            <td style="padding:12px;border:1px solid rgba(255,255,255,.18)">Signal strength</td>
            <td style="padding:12px;border:1px solid rgba(255,255,255,.18);font-weight:800">${signalStrength(input.yes, input.no)}</td>
          </tr>
        </table>
        <h2 style="font-size:20px;margin-top:28px">Anonymous messages</h2>
        <ul style="line-height:1.6;color:#efe6d2">${messages}</ul>
        <p style="color:#a9b3af;margin-top:26px">Omen code: ${escapeHtml(input.slug)}. ${input.total}/${input.limit} response slots voted.</p>
      </div>
    </div>
  `;
}

function buildEmailText(input: {
  name: string;
  question: string;
  yes: number;
  no: number;
  total: number;
  limit: number;
  messages: string[];
  summary: string;
  slug: string;
}) {
  const messages = input.messages.length
    ? input.messages.map((body) => `- ${body}`).join("\n")
    : "- No anonymous messages were left.";

  return `Your sign is here, ${input.name}.

${input.summary}

Question: ${input.question}
Yes: ${input.yes}
No: ${input.no}
Signal strength: ${signalStrength(input.yes, input.no)}

Anonymous messages:
${messages}

Omen code: ${input.slug}. ${input.total}/${input.limit} response slots voted.`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}
