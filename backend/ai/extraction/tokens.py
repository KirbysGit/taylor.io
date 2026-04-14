"""static token and pattern lists for job-description keyword extraction (used by extractor)."""

from __future__ import annotations

# this file serves to tell us how to get rid of the bullshit in the job description.
# does this through helping us downrank the lines structurally and semantically.

# section title prefixes: still extract from these blocks but multiply scores by downweight factor.
# Suppress (below) is checked first in the extractor — no overlap needed.
sectionHeadersToDownweight = {
    "our values",
    "job type",
    "note",
    "value statement",
    "competencies",
    "required education & experience",
}

# section title prefixes: drop these blocks entirely from scoring (noise sections).
sectionHeadersToSuppress = {
    "about us",
    "additional benefits",
    "benefits",
    "benefits compensation",
    "by clicking apply today",
    "compensation",
    "compensation package",
    "compensation range",
    "dental insurance",
    "drug free work place",
    "equal employment opportunity",
    "equal opportunity employer",
    "full-time",
    "health insurance",
    "in person",
    "life at",
    "mileage reimbursement",
    "next steps",
    "on the road",
    "our benefits",
    "paid time off",
    "paid training",
    "pay",
    "perks",
    "referral program",
    "salary",
    "schedule",
    "the pay range",
    "this job is not eligible",
    "vision insurance",
    "we offer comprehensive benefits",
    "weekly pay",
    "what s in it for you",
    "what's in it for you",
    "work location",
}

# section title prefixes: treat as role-relevant body text (responsibilities, requirements, etc.).
roleSectionHeaders = {
    "job description",
    "about the role",
    "role overview",
    "why this role is remarkable",
    "what you will do",
    "responsibilities",
    "key responsibilities",
    "requirements",
    "key qualifications",
    "qualifications",
    "nice to have",
    "preferred qualifications",
    "ideal candidate",
    "you might be the right person for the job if you",
}

# section title prefixes: not core role content (benefits, apply, about company); used to classify lines.
nonRoleSectionHeaders = {
    "who are",
    "next steps",
    "our benefits",
    "benefits",
    "perks",
    "compensation",
    "compensation package",
    "compensation range",
    "equal opportunity",
    "equal employment opportunity",
    "by clicking apply",
    "apply today",
    "about us",
    "why join us",
    "what s in it for you",
    "what's in it for you",
}

# tokens that dominate benefit/comp lines; used to penalize phrases that look like perks not skills.
benefitNoiseTokens = {
    "company",
    "paid",
    "employee",
    "insurance",
    "benefits",
    "vacation",
    "holidays",
    "bonus",
    "compensation",
    "work",
    "sick",
    "off",
    "pto",
    "leave",
}

# tokens from recruiter/apply boilerplate; penalize phrases containing them.
recruiterNoiseTokens = {
    "recruiter",
    "network",
    "step",
    "steps",
    "talk",
    "spin",
    "free",
    "fake",
    "apply",
    "application",
    "dream",
    "job",
    "jobs",
    "recruiting",
    "employment",
    "eligible",
    "privacy",
    "opt",
    "supported",
}

# legal/equal-opportunity/screening vocabulary; penalize as non-skill noise.
legalNoiseTokens = {
    "eligible",
    "employment",
    "privacy",
    "citizenship",
    "resident",
    "background",
    "check",
    "checks",
    "disability",
    "veteran",
    "criminal",
    "drug",
    "felony",
    "misdemeanor",
    "conviction",
    "authorization",
    "authorized",
}

# stopwords at start/end of ngrams: phrases shouldn't start or end on these (weak boundaries).
connectorEdgeWords = {
    "a",
    "an",
    "and",
    "as",
    "at",
    "for",
    "from",
    "if",
    "in",
    "is",
    "not",
    "of",
    "on",
    "or",
    "the",
    "to",
    "we",
    "with",
    "such",
    "using",
    "whether",
    "into",
}

# if a phrase starts with these, treat as verb-led job-duty line (heuristic for filtering).
verbLeadTokens = {
    "build",
    "design",
    "assess",
    "use",
    "work",
    "develop",
    "create",
    "implement",
    "perform",
    "integrate",
    "ensure",
    "evaluate",
    "collaborate",
    "participate",
}

# weak tokens often at phrase end; used with connectors to score "gluey" phrases down.
connectorTrailTokens = {
    "and",
    "or",
    "such",
    "using",
    "whether",
    "into",
    "with",
    "for",
    "to",
    "of",
}

# generic tokens: never promote as stack/signal terms when building domain signals from boosts.
stackTokenBlocklist = {
    "to",
    "full",
    "engineering",
    "development",
    "work",
    "sales",
    "business",
    "performance",
    "account",
    "opportunities",
    "clients",
    "relationships",
    "leadership",
    "ownership",
    "company",
    "benefits",
    "experience",
    "technical",
    "customer",
    "using",
}

# short acronyms allowed as stack tokens despite length (sql, api, aws, etc.).
stackAllowShortTokens = {
    "ai",
    "ml",
    "sql",
    "api",
    "aws",
    "gcp",
    "gke",
    "llm",
    "rag",
    "cx",
    "ivr",
    "fcr",
    "csat",
    "wfo",
    "ccaas",
    "wxcc",
}

# concrete tech names for stack detection in jd "stack" style sections.
concreteStackTerms = {
    "react", "next.js", "nextjs", "react-native", "react native", "typescript", "javascript", "node", "node.js",
    "python", "java", "go", "rust", "php", "nestjs", "django", "flask", "fastapi", "graphql", "rest", "restful",
    "api", "apis", "sql", "postgres", "postgresql", "mysql", "mongodb", "redis", "databricks", "kafka", "nifi",
    "opensearch", "tableau", "power bi", "salesforce", "posthog", "aws", "gcp", "azure", "docker", "kubernetes",
    "gke", "rag", "llm", "mlops", "tensorflow", "pytorch", "scikit-learn", "transformers", "langchain", "langgraph",
    "webex", "calabrio", "dialogflow", "ci/cd", "linux", "vue", "vue.js", "angular",
}

# softer capability words: stack-adjacent but not a named product (workflow, compliance, etc.).
roleCapabilityStackTerms = {
    "workflow", "operations", "documentation", "implementation", "management", "execution", "delivery", "support",
    "billing", "efficiency", "security", "performance", "platform", "integration", "kpis", "compliance",
}

# tokens to skip when mining org/employer name chunks from titles (too generic).
orgTokenStopwords = {
    "the",
    "and",
    "for",
    "with",
    "inc",
    "llc",
    "corp",
    "company",
    "remote",
    "today",
    "apply",
    "job",
    "jobs",
    "manager",
    "engineer",
    "developer",
    "position",
    "opening",
    "career",
    "opportunity",
    "role",
}

# geography / jobsite tokens that are weak as standalone keywords.
locationNoiseTokens = {
    "york",
    "aventura",
    "county",
    "city",
    "state",
    "campus",
    "onsite",
    "on-site",
    "hybrid",
    "remote",
}

# school/place context: single-token hits need stronger sources or we drop as noise.
schoolLocationContextTokens = {
    "new",
    "york",
    "university",
    "campus",
    "county",
    "city",
    "state",
    "camp",
    "campers",
    "school",
}

# very common tokens: require stronger overlap / prefer longer phrases in merge logic.
genericOverlapTokens = {
    "experience",
    "systems",
    "technical",
    "customer",
    "lead",
    "platform",
    "support",
    "business",
    "using",
    "performance",
    "data",
    "ai",
    "ml",
}

# regexes: section header lines that should not contribute keywords (wrapper/apply/legal headers).
wrapperSuppressHeaderPatterns = (
    r"^who are .+$",
    r"^next steps?$",
    r"^about (us|the company)$",
    r"^apply( now| today)?$",
    r"^equal opportunity.*$",
    r"^(compensation|benefits|perks).*$",
    r"^equal employment.*$",
    r"^privacy notice.*$",
    r"^eligibility.*$",
    r"^background check.*$",
    r"^work authorization.*$",
    r"^security clearance.*$",
    r"^drug testing.*$",
    r"^background screening.*$",
)

# substrings: any line containing these is treated as non-skill boilerplate for suppression.
wrapperSuppressLineSubstrings = {
    "apply now",
    "apply today",
    "talk to",
    "for free",
    "message and data rates",
    "we never post fake jobs",
    "equal opportunity",
    "we are looking for",
    "ideal candidate",
    "join our team",
    "opportunity to",
    "hiring for",
    "submit your resume",
    "all qualified applicants",
    "women and minorities are encouraged",
    "equal employment opportunity",
    "background records check",
    "public trust clearance",
    "us citizenship",
    "perm resident alien",
    "privacy policy",
    "employment eligibility",
    "opt out",
    "message and data rates may apply",
    "must be able to pass",
    "drug screening",
    "drug test",
    "criminal background check",
    "work authorization required",
    "subject to background",
    "equal opportunity employer",
    "please include",
    "relevant title",
    "job title in subject",
    "if interested send",
    "paid time off",
    "holiday pay",
    "sick leave",
    "medical dental vision",
}

# culture/mission marketing lines: downrank or skip as keyword sources.
missionCultureLineSubstrings = {
    "our mission",
    "our values",
    "our culture",
    "why join us",
    "who we are",
    "about us",
    "value statement",
    "inclusive environment",
    "open-door policy",
    "we value your",
    "personally accountable",
    "build trusted relationships",
    "drive innovation",
    "work in partnership",
    "ready to work hard",
}

# when merging overlapping terms: if generic token overlaps a longer phrase, prefer these exact phrases.
phraseOverlapExactPrefer = {
    "api": {"restful apis", "api integration", "third-party apis"},
    "ai": {"generative ai", "ai agents", "llm-based solutions"},
    "management": {"project management", "account management", "hospitality management"},
    "customer": {"customer service", "customer outcomes"},
    "service": {"customer service", "professional services"},
}

# weak adjectives at phrase edges; signal fluff not substance.
lowSignalModifierTokens = {
    "strong",
    "clear",
    "comprehensive",
    "another",
    "top",
    "green",
    "new",
    "high",
    "great",
}

# tokens that suggest a tooling list (used to allow tool-heavy short phrases).
toolListFragmentTokens = {
    "python",
    "java",
    "javascript",
    "typescript",
    "node",
    "node.js",
    "django",
    "fastapi",
    "flask",
    "react",
    "next.js",
    "nestjs",
    "aws",
    "gcp",
    "azure",
    "docker",
    "kubernetes",
    "sql",
    "mysql",
    "postgresql",
    "graphql",
    "alteryx",
    "tableau",
    "power bi",
}

# resume-speak filler: drop single-token hits from weak sources.
fillerFunctionTokens = {
    "during",
    "functions",
    "environment",
    "degree",
    "must",
    "perform",
    "across",
    "analyses",
    "analysis",
    "eg",
    "e.g",
}

# domain phrase heads for non-tech roles (short domain phrases allowed when these lead).
rolePhraseHeadTokens = {
    "management",
    "engineering",
    "automation",
    "systems",
    "operations",
    "support",
    "compliance",
    "scheduling",
    "documentation",
    "testing",
}

# pronouns in ngrams: skip (not skill terms).
phrasePronounTokens = {
    "you",
    "your",
    "yours",
    "our",
    "ours",
    "their",
    "theirs",
    "we",
    "us",
}

# application-instruction vocabulary inside lines.
instructionNoiseTokens = {
    "not",
    "please",
    "relevant",
    "title",
    "description",
    "least",
    "more",
    "than",
    "then",
    "three",
}

# reject two-word title fragments ending in these unless phrase is in known list.
titleFragmentBlacklistTailTokens = {"associate", "assistant"}

# org/location nouns: bad tail on "x manager y" fragments.
orgLocationPhraseTokens = {
    "outlet",
    "outlets",
    "school",
    "university",
    "college",
    "hospital",
    "clinic",
    "center",
    "centre",
    "district",
    "campus",
    "county",
    "city",
    "state",
    "region",
    "branch",
    "location",
    "office",
}

# weak trailing tokens in extracted phrases (job-post narrative glue).
phraseGlueTrailTokens = {
    "will",
    "would",
    "could",
    "should",
    "ability",
    "teams",
    "team",
    "group",
    "groups",
}

# comparative filler tokens; penalize alone from weak sources.
comparativeGlueTokens = {
    "least",
    "more",
    "most",
    "than",
    "then",
    "only",
    "just",
}

# narrative/job-meta words at end of ing-phrase (weak skill signal).
narrativeTrailTokens = {
    "business",
    "vertical",
    "role",
    "position",
    "candidate",
    "opportunity",
    "title",
}

# allow dots inside these tokens (node.js) without treating as suspicious.
safeDottedTokens = {"node.js", "next.js", "vue.js", "u.s"}

# line looks like a url or document link; skip keyword extraction on that line.
urlLinePatterns = (
    r"https?://",
    r"\bwww\.",
    r"\.(gov|mil|pdf|docx?|pptx?|xlsx?)\b",
    r"\b[A-Za-z0-9.-]+\.(gov|mil|pdf|org|com)\b",
)

# compliance/disclaimer footer lines (dol, eeo, posters).
complianceFooterSubstrings = {
    "know your rights",
    "pay transparency",
    "ofccp",
    "equal employment opportunity",
    "eeo",
    "dol.gov",
    "department of labor",
    "poster",
    "supplement",
    "download",
    "pdf",
    "poster notice",
}

# multiplier applied when scoring text under downweighted section headers.
downweightFactor = 0.35
