let meta = #{
    name: "airpal-next",
    description: "Implement the highest AirPal P0 checklist gap, then update the living checklist",
    when_to_use: "Build the next Mate-loop item, continue AirPal MVP, /airpal-next",
    phases: [
        #{ title: "Pick", detail: "Choose the first P0 todo, else the first P0 partial" },
        #{ title: "Build", detail: "Smallest change that moves that id toward done" },
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
        "files": #{ "type": "array", "maxItems": 8, "items": #{ "type": "string" } },
    },
};

phase("Pick");

let pick_prompt = "Pick the next AirPal build item. Read these files with read_file before answering: ";
pick_prompt += "AGENTS.md, .grok/skills/airpal-build/SKILL.md, ";
pick_prompt += ".grok/skills/airpal-build/references/build-checklist.md, ";
pick_prompt += ".grok/skills/airpal-build/references/surfaces.md. ";
pick_prompt += "Rule: first P0 row whose status is todo, else first P0 row whose status is partial. ";
pick_prompt += "Ignore later/P3/P4. id must exist in the checklist. why is one sentence. ";
pick_prompt += "files are existing paths to reuse from surfaces.md. Do not invent a second booking or user system.";

let pick = agent(pick_prompt, #{
    label: "pick-p0",
    capability_mode: "read-only",
    output_schema: pick_schema,
});

let item_id = "p0-pay";
let item_why = "Mate bookings still have paymentStatus deferred; MVP cannot close.";
let item_done = "Mate booking charges through the platform; fees from admin config.";
if pick != () && pick.success && pick.output != () && pick.output.id != () {
    let picked_id = trimmed(pick.output.id);
    if picked_id != "" {
        item_id = picked_id;
        item_why = trimmed(pick.output.why);
        item_done = trimmed(pick.output.done_when);
    }
}
log("next item: " + item_id);

phase("Build");

let build_prompt = "Implement AirPal checklist item " + item_id + ". ";
build_prompt += "Why this item: " + item_why + " ";
build_prompt += "Done when: " + item_done + " ";
build_prompt += "Read AGENTS.md, .grok/skills/airpal-build/SKILL.md, ";
build_prompt += ".grok/skills/airpal-build/references/surfaces.md, and the existing files for this id before editing. ";
build_prompt += "Smallest change that moves the item toward done. Reuse shared/ types and existing collections. ";
build_prompt += "Vite SPA — do not migrate to Next.js. Privileged mutations via Cloud Functions. Do not weaken firestore.rules. ";
build_prompt += "Sydney dates via toZonedDateStr / useLocalNow. No secrets. No compatibility scores. ";
build_prompt += "If the full Done-when cannot land in one pass, ship a coherent slice and leave the id as partial with updated evidence. ";
build_prompt += "Do not start a different checklist id.";

let built = agent(build_prompt, #{
    label: "build-" + item_id,
    capability_mode: "all",
});

if built == () || built.success != true {
    log("build agent for " + item_id + " did not succeed; check step will still run");
}

phase("Check");

let check_prompt = "You just implemented AirPal item " + item_id + ". ";
check_prompt += "1) Run the relevant unit tests (vitest on shared/ and any src tests you touched). ";
check_prompt += "2) Update .grok/skills/airpal-build/references/build-checklist.md for this id only: status, checkbox ([x] only if Done-when is truly met), evidence path, gap, Last audited date, and Next 3. ";
check_prompt += "3) If an MVP acceptance row is now fully met, mark it too. ";
check_prompt += "Read the checklist first. Do not mark done without a path a user can exercise. ";
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
