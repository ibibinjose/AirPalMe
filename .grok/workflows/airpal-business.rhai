let meta = #{
    name: "airpal-business",
    description: "Implement the highest AirPal Business checklist gap on the shared marketplace engine",
    when_to_use: "AirPal Business dashboard, venue onboarding, listings, campaigns, business bookings. /airpal-business",
    phases: [
        #{ title: "Pick", detail: "Choose the first biz-* todo, else the first biz-* partial" },
        #{ title: "Build", detail: "Smallest change on the shared engine" },
        #{ title: "Check", detail: "Tests plus checklist update" },
    ],
};

fn trimmed(s) {
    if type_of(s) == "string" {
        s.trim();
        s
    } else {
        ""
    }
}

let pick_schema = #{
    "type": "object",
    "required": ["id", "status", "why", "done_when"],
    "properties": #{
        "id": #{ "type": "string" },
        "status": #{ "type": "string" },
        "why": #{ "type": "string" },
        "done_when": #{ "type": "string" },
        "reuse": #{ "type": "array", "maxItems": 8, "items": #{ "type": "string" } },
    },
};

phase("Pick");

let pick_prompt = "Pick the next AirPal Business item. Read with read_file: AGENTS.md, ";
pick_prompt += ".grok/skills/airpal-build/SKILL.md, ";
pick_prompt += ".grok/skills/airpal-build/references/build-checklist.md (AirPal Business section), ";
pick_prompt += ".grok/skills/airpal-build/references/surfaces.md. ";
pick_prompt += "Rule: first biz-* row whose status is todo, else first biz-* row whose status is partial. ";
pick_prompt += "id must start with biz- and exist in the checklist. reuse is existing file paths to extend. ";
pick_prompt += "Business rides the same identity, listings, bookings, payments, and reviews. Never a second user system or a parallel booking collection.";

let pick = agent(pick_prompt, #{
    label: "pick-biz",
    capability_mode: "read-only",
    output_schema: pick_schema,
});

let item_id = "biz-bookings";
let item_why = "Owners cannot see or complete bookings for their listings.";
let item_done = "Owner sees, confirms, and completes bookings for their listings/experiences.";
if pick != () && pick.success && pick.output != () && pick.output.id != () {
    let picked_id = trimmed(pick.output.id);
    if picked_id != "" && picked_id.sub_string(0, 4) == "biz-" {
        item_id = picked_id;
        item_why = trimmed(pick.output.why);
        item_done = trimmed(pick.output.done_when);
    } else {
        log("picker id was not biz-*; using " + item_id);
    }
}
log("next business item: " + item_id);

phase("Build");

let build_prompt = "Implement AirPal Business checklist item " + item_id + ". ";
build_prompt += "Why: " + item_why + " ";
build_prompt += "Done when: " + item_done + " ";
build_prompt += "Read AGENTS.md section 18, .grok/skills/airpal-build/SKILL.md, ";
build_prompt += ".grok/skills/airpal-build/references/surfaces.md, and the current Business pages before editing. ";
build_prompt += "Extend src/pages/BusinessPage.tsx, BusinessOnboardPage.tsx, BusinessCampaignsPage.tsx, shared/business.ts, shared/campaign.ts, shared/booking.ts, functions/src/listings.ts, functions/src/deals.ts as needed. ";
build_prompt += "Campaign guests must eventually use the shared bookings collection, not a one-off RSVP-only path. ";
build_prompt += "Fees must not be newly hard-coded. Vite SPA stays. Do not weaken firestore.rules. ";
build_prompt += "If the full Done-when cannot land in one pass, ship a coherent slice and leave the id as partial. Do not start a different id.";

let built = agent(build_prompt, #{
    label: "build-" + item_id,
    capability_mode: "all",
});

if built == () || built.success != true {
    log("build agent for " + item_id + " did not succeed; check step will still run");
}

phase("Check");

let check_prompt = "You just implemented AirPal Business item " + item_id + ". ";
check_prompt += "1) Run relevant vitest files under shared/ and any UI tests you touched. ";
check_prompt += "2) Update only that row (and Next 3 if needed) in .grok/skills/airpal-build/references/build-checklist.md. ";
check_prompt += "[x] only if Done-when is truly met. Evidence must be a path you changed. ";
check_prompt += "3) Confirm you did not add a second bookings or users collection. ";
check_prompt += "Return a short summary of files changed, tests run, and the new status for " + item_id + ".";

let checked = agent(check_prompt, #{
    label: "check-" + item_id,
    capability_mode: "all",
});

let summary = "Implemented " + item_id;
if checked != () && checked.success && checked.output != () {
    summary = trimmed(checked.output);
    if summary == "" {
        summary = "Implemented " + item_id;
    }
}

complete(#{ id: item_id, summary: summary });
