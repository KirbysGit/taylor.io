# Display formatting for resume dates (HTML/PDF and Word).

from __future__ import annotations

from datetime import datetime

# In : Date String
# Out : Month Year String
def format_date_month_year(date: str) -> str:
    # If Date String is empty, return empty string.
    if not date:
        return ""

    # Try to parse the date string into a datetime object.
    try:
        date_str = date[:10] if len(date) >= 10 else date

        # If the date string is 7 characters long, it's a YYYY-MM format.
        if len(date_str) == 7:
            dt = datetime.strptime(date_str, "%Y-%m")
        # If the date string is 10 characters long, it's a YYYY-MM-DD format.
        elif len(date_str) == 10:
            dt = datetime.strptime(date_str, "%Y-%m-%d")
        else:
            # If the date string is not a valid date, return the input date string.
            return date

        # Return the date string in the format "Month YYYY".
        return dt.strftime("%B %Y")
    # If the date string is not a valid date, return the input date string.
    except Exception:
        return date

# In : Start Raw, End Raw, Current
# Out : Date Range String
def format_date_range(start_raw, end_raw, current: bool) -> str:
    start_val = str(start_raw) if start_raw else ""
    end_val = str(end_raw) if end_raw else ""
    start_date = format_date_month_year(start_val) if start_val else ""
    end_date = format_date_month_year(end_val) if end_val else ""

    if current and start_date:
        return f"{start_date} - Present"
    if current and not start_date:
        return "Present"
    if start_date and end_date:
        return f"{start_date} - {end_date}"
    if start_date:
        return start_date
    if end_date:
        return end_date
    return ""
