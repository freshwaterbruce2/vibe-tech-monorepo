"""Immutable manifest for candidate screening only, never legal conclusions."""
import hashlib,json
MANIFEST={"ruleset_id":"sc-rlt-bounded-2025-v2","version":"2","status":"approved_for_candidate_screening","purpose":"candidate_only_no_conclusion","engine_id":"vibe-justice-offline-elements-v2","required_locators":["SECTION 27-40-440","SECTION 27-40-530(c)","SECTION 27-40-610","SECTION 27-40-630"],"allowed_labels":["possible","conflicting","missing_facts","not_supported"]}
BYTES=(json.dumps(MANIFEST,sort_keys=True,separators=(",",":"))+"\n").encode()
SHA256=hashlib.sha256(BYTES).hexdigest()
