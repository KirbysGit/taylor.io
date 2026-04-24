# --- tiny helpers shared by merge/diff and reporting. --- #


def asDict(v):
    return v if isinstance(v, dict) else {}


def listById(items):
    by = {}
    if not isinstance(items, list):
        return by
    for it in items:
        if isinstance(it, dict):
            k = it.get("id")
            if k is not None:
                by[k] = it
    return by


def summaryInner(resume):
    s = asDict(resume.get("summary"))
    t = s.get("summary")
    if t is None:
        return ""
    return str(t).strip() if t is not None else ""
